# Prompts Bookmarks Extension

Chrome extension (Manifest V3, built with WXT) that bookmarks a Claude prompt and its response from claude.ai. Everything is stored locally with `chrome.storage.local`.

<img src="./demos/demo.gif" alt="Demo of the extension in action" width="700" />

[![Architecture diagram of limiajayi/prompts-bookmark-extension](https://gitdiagram.com/limiajayi/prompts-bookmark-extension/diagram.png)](https://gitdiagram.com/limiajayi/prompts-bookmark-extension?utm_source=readme&utm_medium=picture)

## Privacy Policy

The privacy policy can be found here: [privacy policy](https://limiajayi.github.io/prompts-bookmark-extension/privacy-policy)

## Run it

```bash
pnpm install
pnpm build
```

- Open [chrome://extensions](chrome://extensions)
- Switch on **Developer mode**
- Click **Load unpacked** and choose `.output/chrome-mv3`.

## Firefox Build

```bash
pnpm install
pnpm build:firefox
```

- Open [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox)
- Click on **Load Temporary Add-on**
- Open `.output/firefox-mv2/manifest.json`

For hot reload while developing, run `pnpm dev` (WXT opens a Chrome window with the extension loaded; you'll need to sign in to claude.ai there).

Other scripts: `pnpm test`, `pnpm compile` (type-check).

## Where things live

| File | Job |
|---|---|
| `utils/selectors.ts` | Every claude.ai selector. If the extension breaks after a Claude update, fix it here. |
| `utils/diagnose.ts` | Works out how many user and assistant messages they are and reports in console if the extension breaks |
| `utils/extract.ts` | Finds the prompt above a response and cleans the text |
| `utils/settle.ts` | Detects when a response has finished streaming |
| `entrypoints/content.ts` | Adds the Bookmark button to each response |
| `entrypoints/popup/` | The popup: search, copy, open chat, delete |
| `utils/storage.ts` | Reads and writes bookmarks |
| `tests/extract.test.ts` | Fixture-based tests. Update the fixture when Claude's markup changes. |

## Some caveats

- All prompt-response pairs are stored **in plain text** in `chrome.storage.local` so be wary of bookmarking sensitive information.
- This works based on prompt-response pairings within the DOM, if the extension doesn't find the "prompt" or "response" selectors, it won't work.
- This is based on how `claude.ai` **currently** arranges their DOM and how it currently streams tokens, which is subject to change in the future.
