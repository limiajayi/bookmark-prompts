import { beforeEach, describe, expect, it } from "vitest";
import { diagnose } from "../utils/diagnose";

const homeMarkup = `
  <div data-cds="UserMessage"><p>Hi</p></div>
  <div data-testid="assistant-message" data-is-streaming="false"><p>Hello</p></div>
`;

beforeEach(() => {
    document.body.innerHTML = homeMarkup;
});

describe("diagnose", () => {
    it("reports which selector variant matched", () => {
        const { variants } = diagnose();
        const matches = (selector: string) =>
            variants.find((v) => v.selector === selector)?.matches;

        expect(matches('[data-cds="UserMessage"]')).toBe(1);
        expect(matches('[data-testid="user-message"]')).toBe(0);
        expect(matches('[data-testid="assistant-message"]')).toBe(1);
        expect(matches('[data-cds="AssistantMessage"]')).toBe(0);
    });

    it("flags that no buttons were injected", () => {
        const { buttons, problems } = diagnose();
        expect(buttons).toBe(0);
        expect(problems.join(" ")).toMatch(/no bookmark buttons/);
    });

    it("has no problems once a button exists", () => {
        document.body.insertAdjacentHTML(
            "beforeend",
            "<div data-pb-host></div>",
        );
        const d = diagnose();
        expect(d.buttons).toBe(1);
        expect(d.problems).toEqual([]);
    });

    it("flags that the streaming attribute is missing", () => {
        document.body.innerHTML = `
      <div data-cds="UserMessage"><p>Hi</p></div>
      <div data-cds="AssistantMessage"><p>Hello</p><div data-pb-host></div></div>`;
        expect(diagnose().problems.join(" ")).toMatch(
            /Degraded: no assistant message has data-is-streaming/,
        );
    });

    it("reports a selector problem when one kind of message is missing", () => {
        document.body.innerHTML =
            '<div data-cds="UserMessage">hi</div><div class="renamed">hello</div>';
        expect(diagnose().problems[0]).toMatch(/no assistant messages/);
    });
});
