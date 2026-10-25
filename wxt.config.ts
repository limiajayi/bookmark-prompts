import { defineConfig } from "wxt";

export default defineConfig({
    manifest: {
        name: "Bookmark Prompts",
        description:
            "Bookmark prompts and responses on claude.ai. All prompts and responses are saved locally, to your own device.",
        // "storage" lets us use chrome.storage.local. That's the only permission.
        permissions: ["storage"],
        version: "1.0.0",
    },
});
