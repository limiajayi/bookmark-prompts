import type { SecretMatch } from "./secrets";

export type SecretChoice = "save" | "redact" | "cancel";

export function askAboutSecrets(matches: SecretMatch[]): Promise<SecretChoice> {
    return new Promise((resolve) => {
        const host = document.createElement("div");
        host.id = "pb-secret-host";
        const shadow = host.attachShadow({ mode: "open" }); // isolates our styles from Claude's page

        const style = document.createElement("style");
        style.textContent = `
            .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5);
                display: flex; align-items: center; justify-content: center; z-index: 2147483647; }
            .card { background: #fff; color: #111; font: 14px system-ui, sans-serif;
                border-radius: 12px; padding: 20px; width: min(420px, 90vw); }
            h2 { margin: 0 0 8px; font-size: 16px; }
            ul { padding-left: 18px; margin: 8px 0 16px; }
            code { font-family: ui-monospace, monospace; }
            .actions { display: flex; gap: 8px; justify-content: flex-end; }
            button { padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc;
                background: #f5f5f5; cursor: pointer; }
            button.primary { background: #b91c1c; color: #fff; border-color: #b91c1c; }
    `;

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
            primary = false,
        ) => {
            const btn = document.createElement("button");
            btn.textContent = label;
            if (primary) btn.className = "primary";
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
