import { SELECTORS } from "./selectors";
import { readText } from "./text";

export type Pair = { prompt: string; response: string };

// Screen-reader-only text that claude.ai puts at the start of each response.
const stripLabel = (text: string) =>
    text.replace(/^Claude responded:\s*/, "").trim();

/** Reads the chat UUID from the URL. Call at click time: the page is an SPA. */
export function getChatId(pathname: string = location.pathname): string | null {
    const match = pathname.match(/\/chat\/([0-9a-f-]{36})/i);
    return match?.[1] ?? null;
}

/**
 * Given an assistant message element, returns it together with the user
 * message directly above it. Returns null if we can't find a valid pair
 * (for example, the prompt isn't rendered because the page unloaded it).
 */
export function getPairForResponse(responseEl: Element): Pair | null {
    const messages = [...document.querySelectorAll(SELECTORS.anyMessage)];
    const index = messages.indexOf(responseEl);
    if (index < 1) return null;

    const promptEl = messages[index - 1];
    // Sanity check: the message before a response should be a user message.
    if (!promptEl?.matches(SELECTORS.userMessage)) return null;

    // Read only what the user typed, not the timestamp and buttons around it.
    const promptBody =
        promptEl.querySelector(SELECTORS.userMessageBody) ?? promptEl;
    const prompt = readText(promptBody, { preserveWhitespace: true });
    const response = stripLabel(readText(responseEl));
    if (!prompt || !response) return null;

    return { prompt, response };
}

/** Quick check that our selectors still match something on the page. */
export function selectorsLookHealthy(): boolean {
    return document.querySelector(SELECTORS.anyMessage) !== null;
}

/**
 * Describes what's wrong if our selectors look broken or if they return null
 * It checks both types of messages: checking "either kind" lets user
 * messages hide the fact that there is no assistant message attached
 */
export function describeSelectorProblem(): string | null {
    const users = document.querySelectorAll(SELECTORS.userMessage).length;
    const assistants = document.querySelectorAll(
        SELECTORS.assistantMessage,
    ).length;

    if (users === 0 && assistants === 0) return "Found no messages at all";
    if (assistants === 0)
        return `Found ${users} user message(s) but no assistant messages`;
    if (users === 0)
        return `Found ${assistants} assistant message(s) but no user messages`;
    return null;
}
