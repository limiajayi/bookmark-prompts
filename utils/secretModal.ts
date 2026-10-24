import type { SecretMatch } from "./secrets";

export type SecretChoice = "save" | "redact" | "cancel";

// The popup's style.css variables aren't available on claude.ai, so the palette is
// copied here. :host sets the variables inside the shadow root.
const STYLES = `
  :host {
    --paper: #f5f7fa;
    --surface: #ffffff;
    --ink: #18202b;
    --muted: #566274;
    --rule: #d8dee7;
    --accent: #0f766e;
    --danger: #b42318;
    color-scheme: light dark;
  }

  @media (prefers-color-scheme: dark) {
    :host {
      --paper: #12171e;
      --surface: #1a212b;
      --ink: #e6eaf0;
      --muted: #9aa6b6;
      --rule: #2b3441;
      --accent: #4fd1c5;
      --danger: #f97066;
    }
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
  }

  .card {
    background: var(--surface);
    color: var(--ink);
    font: 13px/1.45 system-ui, sans-serif;
    border: 1px solid var(--rule);
    border-radius: 10px;
    padding: 16px;
    width: min(400px, 90vw);
  }

  h2 { margin: 0 0 8px; font-size: 15px; font-weight: 600; }
  p { margin: 0 0 8px; color: var(--muted); }

  ul {
    list-style: none;
    margin: 8px 0 14px;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  li { color: var(--muted); font-size: 12px; }
  code { font: 12px ui-monospace, monospace; color: var(--ink); }

  .actions { display: flex; gap: 6px; justify-content: flex-end; }

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
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  button:disabled { opacity: 0.5; cursor: default; }

  button.danger { border-color: var(--danger); color: var(--danger); }
  button.danger:hover:not(:disabled) { background: rgba(180, 35, 24, 0.12); }
`;

export function askAboutSecrets(matches: SecretMatch[]): Promise<SecretChoice> {
    return new Promise((resolve) => {
        const host = document.createElement("div");
        host.id = "pb-secret-host";
        const shadow = host.attachShadow({ mode: "open" });

        const style = document.createElement("style");
        style.textContent = STYLES;

        const backdrop = document.createElement("div");
        backdrop.className = "backdrop";
        const card = document.createElement("div");
        card.className = "card";

        const title = document.createElement("h2");
        title.textContent = "This may contain a secret";

        const intro = document.createElement("p");
        intro.textContent =
            "We found text that looks like a key or credential. Saved bookmarks stay on this device, but you may not want them there.";

        const list = document.createElement("ul");
        for (const m of matches) {
            const li = document.createElement("li");
            li.textContent = `${m.kind}: `;
            const code = document.createElement("code");
            code.textContent = m.preview; // textContent, never innerHTML
            li.appendChild(code);
            list.appendChild(li);
        }

        const actions = document.createElement("div");
        actions.className = "actions";

        const makeButton = (
            label: string,
            choice: SecretChoice,
            danger = false,
        ) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = label;
            if (danger) btn.className = "danger";
            btn.addEventListener("click", () => {
                host.remove();
                resolve(choice);
            });
            return btn;
        };

        actions.append(
            makeButton("Cancel", "cancel"),
            makeButton("Save redacted", "redact"),
            makeButton("Save anyway", "save", true),
        );

        card.append(title, intro, list, actions);
        backdrop.appendChild(card);
        shadow.append(style, backdrop);
        document.body.appendChild(host);
    });
}
