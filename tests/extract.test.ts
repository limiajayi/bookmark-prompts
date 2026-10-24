import { beforeEach, describe, expect, it } from "vitest";
import { getChatId, getMessages, getPairForResponse } from "../utils/extract";
import { hashPair } from "../utils/hash";
import { filterBookmarks } from "../utils/search";
import { whenFinished } from "../utils/settle";
import { readText } from "../utils/text";
import type { Bookmark } from "../utils/types";

// Trimmed, anonymised stand-in for claude.ai's markup.
// If Claude's HTML changes, update this fixture and utils/selectors.ts together.
const chat = (age: string) => `
  <div data-cds="AssistantMessage" id="orphan"><p>An answer whose prompt has been unloaded.</p></div>
  <div data-cds="UserMessage" id="p1">
    <div class="group/message-row">
      <div class="cds-user-message-body"><div><p class="whitespace-pre-wrap">So they'd be used
for repeatable processes?</p></div></div>
      <div class="flex">
        <time>${age}</time>
        <button><span>⊡</span></button>
        <span class="sr-only">Edit</span>
      </div>
    </div>
  </div>
  <div data-cds="AssistantMessage" id="r1" data-is-streaming="false">
    <h2 class="sr-only">Claude responded: Yes, exactly.</h2>
    <div data-cds="TurnStatus" data-state="done">
      <span>Fetched: GitHub - some-repo</span>
      <a href="https://github.com/some/repo"><bdi>https://github.com/some/repo</bdi></a>
    </div>
    <div>
      <p>Yes, exactly.</p>
      <p>A good test:</p>
      <ul>
        <li>Can you write it as a checklist?</li>
        <li>Is it <code>repeatable</code>?</li>
      </ul>
      <ol><li>First</li><li>Second</li></ol>
    </div>
    <div class="flex"><time>${age}</time><button>Copy</button></div>
  </div>
  <div data-cds="AssistantMessage" id="empty"></div>
  <div data-cds="UserMessage" id="p2"><div class="cds-user-message-body"><p>Look at my repo</p></div></div>
  <div data-cds="AssistantMessage" id="thinking" data-is-streaming="true">
    <div data-cds="TurnStatus" data-state="busy"><span>Reading a page</span></div>
  </div>
`;

beforeEach(() => {
    document.body.innerHTML = chat("just now");
});

describe("getPairForResponse", () => {
    it("ignores the 'Reading a page' status, so a thinking message has no pair yet", () => {
        expect(
            getPairForResponse(document.getElementById("thinking")!),
        ).toBeNull();
    });

    it("returns clean text without timestamps, buttons or hidden labels", () => {
        const pair = getPairForResponse(document.getElementById("r1")!);
        expect(pair).toEqual({
            prompt: "So they'd be used\nfor repeatable processes?",
            response: [
                "Yes, exactly.",
                "",
                "A good test:",
                "",
                "- Can you write it as a checklist?",
                "- Is it repeatable?",
                "",
                "1. First",
                "2. Second",
            ].join("\n"),
        });
    });

    it("gives the same text however old the message is", () => {
        const before = getPairForResponse(document.getElementById("r1")!);
        document.body.innerHTML = chat("50 minutes ago");
        const after = getPairForResponse(document.getElementById("r1")!);
        expect(after).toEqual(before);
    });

    it("returns null when no prompt is rendered above the response", () => {
        expect(
            getPairForResponse(document.getElementById("orphan")!),
        ).toBeNull();
    });

    it("returns null while the response is still empty", () => {
        expect(
            getPairForResponse(document.getElementById("empty")!),
        ).toBeNull();
    });
});

describe("readText", () => {
    it("keeps a list marker on the same line as a paragraph inside the item", () => {
        document.body.innerHTML =
            "<div id='x'><ul><li><p>One</p></li><li><p>Two</p></li></ul></div>";
        expect(readText(document.getElementById("x")!)).toBe("- One\n\n- Two");
    });

    it("keeps line breaks inside code blocks", () => {
        document.body.innerHTML =
            "<div id='x'><p>Run:</p><pre><code>a\n  b</code></pre></div>";
        expect(readText(document.getElementById("x")!)).toBe("Run:\n\na\n  b");
    });
});

describe("getChatId", () => {
    it("reads the UUID from a chat URL", () => {
        expect(getChatId("/chat/123e4567-e89b-12d3-a456-426614174000")).toBe(
            "123e4567-e89b-12d3-a456-426614174000",
        );
    });

    it("returns null outside a chat", () => {
        expect(getChatId("/new")).toBeNull();
    });
});

describe("hashPair", () => {
    it("is stable for the same pair and differs for different pairs", async () => {
        const a = await hashPair("q", "a");
        expect(a).toBe(await hashPair("q", "a"));
        expect(a).not.toBe(await hashPair("q", "b"));
        expect(a).toHaveLength(64);
    });

    it("doesn't confuse where the prompt ends and the response begins", async () => {
        expect(await hashPair("ab", "c")).not.toBe(await hashPair("a", "bc"));
    });
});

describe("filterBookmarks", () => {
    const make = (
        id: string,
        prompt: string,
        response: string,
        savedAt: number,
    ): Bookmark => ({
        id,
        chatId: "c",
        chatUrl: "https://claude.ai/chat/c",
        prompt,
        response,
        savedAt,
    });
    const items = [
        make("1", "Explain closures", "A closure captures variables.", 1),
        make("2", "Centre a div", "Use flexbox.", 2),
    ];

    it("matches the prompt or the response, ignoring case", () => {
        expect(filterBookmarks(items, "CLOSURES").map((b) => b.id)).toEqual([
            "1",
        ]);
        expect(filterBookmarks(items, "flexbox").map((b) => b.id)).toEqual([
            "2",
        ]);
    });

    it("returns everything, newest first, for an empty query", () => {
        expect(filterBookmarks(items, "  ").map((b) => b.id)).toEqual([
            "2",
            "1",
        ]);
    });
});

describe("whenFinished", () => {
    it("waits for data-is-streaming to become false", async () => {
        const el = document.getElementById("thinking")!;
        let finished = false;
        const done = whenFinished(el).then(() => (finished = true));

        await new Promise((r) => setTimeout(r, 20));
        expect(finished).toBe(false);

        el.setAttribute("data-is-streaming", "false");
        await done;
        expect(finished).toBe(true);
    });

    it("resolves straight away for a message that has already finished", async () => {
        await whenFinished(document.getElementById("r1")!);
    });
});

describe("nested matches of the same message", () => {
    const assistant =
        '<div data-cds="AssistantMessage" data-testid="assistant-message" id="r"><p>Hello</p></div>';
    const plain = `<div data-cds="UserMessage"><div class="cds-user-message-body"><p>Hi</p></div></div>${assistant}`;
    const testidInside = `<div data-cds="UserMessage"><div data-testid="user-message"><div class="cds-user-message-body"><p>Hi</p></div></div></div>${assistant}`;
    const testidOutside = `<div data-testid="user-message"><div data-cds="UserMessage"><div class="cds-user-message-body"><p>Hi</p></div></div></div>${assistant}`;

    it.each([
        ["no testid wrapper", plain],
        ["testid element inside the cds row", testidInside],
        ["testid element around the cds row", testidOutside],
    ])("counts one message per message (%s)", (_name, html) => {
        document.body.innerHTML = html;
        expect(getMessages()).toHaveLength(2);
    });

    it("reads the same pair whichever way the attributes are nested", () => {
        const read = (html: string) => {
            document.body.innerHTML = html;
            return getPairForResponse(document.getElementById("r")!);
        };
        const expected = { prompt: "Hi", response: "Hello" };
        expect(read(plain)).toEqual(expected);
        expect(read(testidInside)).toEqual(expected);
        expect(read(testidOutside)).toEqual(expected);
    });
});
