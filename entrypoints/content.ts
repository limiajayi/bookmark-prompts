import { diagnose, logDiagnosis } from "@/utils/diagnose";
import { confirmSecrets, findExistingId } from "@/utils/secretGuard";
import { getChatId, getPairForResponse } from "../utils/extract";
import { hashPair } from "../utils/hash";
import { HOST_ATTR, SELECTORS } from "../utils/selectors";
import { whenFinished } from "../utils/settle";
import { removeBookmark, saveBookmark } from "../utils/storage";

type State = "waiting" | "ready" | "saved" | "error";

const LABELS: Record<State, string> = {
    waiting: "Finishing…",
    ready: "Bookmark",
    saved: "Bookmarked",
    error: "Can't read message",
};

const TITLES: Record<State, string> = {
    waiting: "Waiting for Claude to finish this response",
    ready: "Save this prompt and response",
    saved: "Click to remove this bookmark",
    error: "Couldn't find the prompt above this response",
};

const STYLES = `
  button {
    font: 500 12px/1 system-ui, sans-serif;
    padding: 6px 10px;
    margin-top: 8px;
    border-radius: 6px;
    border: 1px solid #8a94a6;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  button:hover:not(:disabled) { background: rgba(127, 127, 127, 0.15); }
  button:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }
  button:disabled { opacity: 0.5; cursor: default; }
  button[data-state="saved"] { border-color: #0f766e; color: #0f766e; }
`;

/**
 * Builds the bookmark button inside a shadow root. Two reasons:
 * 1. innerText doesn't read shadow DOM, so our label never leaks into the
 *    saved response text.
 * 2. claude.ai's CSS can't restyle our button, and ours can't leak out.
 */
function createButton(messageEl: HTMLElement): HTMLElement {
    const host = document.createElement("div");
    host.setAttribute(HOST_ATTR, "");

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLES;
    const button = document.createElement("button");
    button.type = "button";
    shadow.append(style, button);

    let state: State = "waiting";
    // The id of the bookmark this button saved or found. It can differ from the
    // hash of the page text when the user chose "Save redacted".
    let savedId: string | null = null;
    // True while the secret modal is open, so a second click can't open another.
    let busy = false;

    function setState(next: State) {
        state = next;
        button.textContent = LABELS[next];
        button.title = TITLES[next];
        button.dataset.state = next;
        button.disabled = next === "waiting" || next === "error";
    }

    setState("waiting");

    button.addEventListener("click", async () => {
        if (busy) return;

        // Removing doesn't need the secret check, so handle it first.
        if (state === "saved" && savedId) {
            await removeBookmark(savedId);
            savedId = null;
            setState("ready");
            return;
        }

        // Read everything at click time: the page is an SPA, so the URL and
        // DOM can change underneath us.
        const pair = getPairForResponse(messageEl);
        const chatId = getChatId();
        if (!pair || !chatId) return setState("error");

        busy = true;
        try {
            const toSave = await confirmSecrets(pair);
            if (!toSave) return; // user cancelled, so the button stays "Bookmark"

            // Hash what we're actually saving, so the id matches the stored text.
            const id = await hashPair(toSave.prompt, toSave.response);
            await saveBookmark({
                id,
                chatId,
                chatUrl: `${location.origin}/chat/${chatId}`,
                ...toSave,
                savedAt: Date.now(),
            });
            savedId = id;
            setState("saved");
        } finally {
            busy = false;
        }
    });

    // Enable the button once the response has stopped changing.
    whenFinished(messageEl).then(async () => {
        const pair = getPairForResponse(messageEl);
        if (!pair) return setState("error");
        savedId = await findExistingId(pair);
        setState(savedId ? "saved" : "ready");
    });

    return host;
}

// Safe to run repeatedly: the page unloads and reloads messages as you
// scroll, which wipes our buttons, so we re-add any that are missing.
function injectButtons() {
    document
        .querySelectorAll<HTMLElement>(SELECTORS.assistantMessage)
        .forEach((el) => {
            // Check for the button itself, not a flag on the message.
            if (el.querySelector(`[${HOST_ATTR}]`)) return;
            // Skip empty responses (still starting to stream) and responses whose
            // prompt isn't rendered. We'll pick them up on a later pass.
            if (!getPairForResponse(el)) return;

            el.appendChild(createButton(el));
        });
}

export default defineContentScript({
    matches: ["https://claude.ai/*"],

    main() {
        // The page changes on every streamed token, so run at most every 250ms.
        let scheduled = false;
        const schedule = () => {
            if (scheduled) return;
            scheduled = true;
            setTimeout(() => {
                scheduled = false;
                injectButtons();
            }, 250);
        };

        new MutationObserver(schedule).observe(document.body, {
            childList: true,
            subtree: true,
        });
        schedule();

        // Fail loudly if Claude's markup has changed and our selectors match nothing.
        // or if Claude's markup changes and no buttons could be injected
        setTimeout(() => {
            if (!location.pathname.startsWith("/chat/")) {
                logDiagnosis(diagnose());
            }
        }, 5000);
    },
});
