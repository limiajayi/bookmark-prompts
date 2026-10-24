import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPair } from "../utils/hash";
import { confirmSecrets, findExistingId } from "../utils/secretGuard";
import { askAboutSecrets } from "../utils/secretModal";
import { redactSecrets } from "../utils/secrets";
import { hasBookmark } from "../utils/storage";

// Replace the modal and storage with fakes. vi.mock is hoisted above the imports.
vi.mock("../utils/secretModal", () => ({ askAboutSecrets: vi.fn() }));
vi.mock("../utils/storage", () => ({ hasBookmark: vi.fn() }));

const key = `sk-ant-api03-${"x".repeat(24)}`;

const cleanPair = {
    prompt: "How do I reverse a string?",
    response: "Use split, reverse and join,",
};

const dirtyPair = {
    prompt: `My key is ${key}`,
    response: `Config: ${key}`,
};
const redactedPair = {
    prompt: redactSecrets(dirtyPair.prompt),
    response: redactSecrets(dirtyPair.response),
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasBookmark).mockResolvedValue(false);
});

describe("confirmSecrets", () => {
    it("returns the pair unchanged and skips the modal when there are no secrets", async () => {
        // Given a pair with no secrets
        // When we run the check
        const result = await confirmSecrets(cleanPair);

        // Then the same pair comes back and the modal is never shown
        expect(result).toEqual(cleanPair);
        expect(askAboutSecrets).not.toHaveBeenCalled();
    });

    it("shows the modal when the prompt contains a secret", async () => {
        // Given a pair where only the prompt has a secret
        console.log(vi.isMockFunction(askAboutSecrets));
        vi.mocked(askAboutSecrets).mockResolvedValue("save");

        // When we run the check
        await confirmSecrets({
            prompt: dirtyPair.prompt,
            response: cleanPair.response,
        });

        // Then the modal is shown with the Anthropic key match
        expect(askAboutSecrets).toHaveBeenCalledTimes(1);
        const matches = vi.mocked(askAboutSecrets).mock.calls[0][0];
        expect(matches.map((m) => m.kind)).toContain("Anthropic API key");
    });

    it("shows the modal when only the response contains a secret", async () => {
        // Given a pair where only the response has a secret
        vi.mocked(askAboutSecrets).mockResolvedValue("save");

        // When we run the check
        await confirmSecrets({
            prompt: cleanPair.prompt,
            response: dirtyPair.response,
        });

        // Then the modal is still shown, so both fields are checked
        expect(askAboutSecrets).toHaveBeenCalledTimes(1);
    });

    it("returns null when the user cancels", async () => {
        // Given a pair with a secret and a user who cancels
        vi.mocked(askAboutSecrets).mockResolvedValue("cancel");

        // When we run the check
        const result = await confirmSecrets(dirtyPair);

        // Then nothing is returned, so nothing gets saved
        expect(result).toBeNull();
    });

    it("returns the original text when the user chooses to save anyway", async () => {
        // Given a pair with a secret and a user who saves anyway
        vi.mocked(askAboutSecrets).mockResolvedValue("save");

        // When we run the check
        const result = await confirmSecrets(dirtyPair);

        // Then the original text is returned unchanged
        expect(result).toEqual(dirtyPair);
    });

    it("returns redacted prompt and response when the user chooses to redact", async () => {
        // Given a pair with secrets in both fields and a user who redacts
        vi.mocked(askAboutSecrets).mockResolvedValue("redact");

        // When we run the check
        const result = await confirmSecrets(dirtyPair);

        // Then both fields are redacted and the key is gone
        expect(result).toEqual(redactedPair);
        expect(result!.prompt).not.toContain(key);
        expect(result!.response).not.toContain(key);
    });
});

describe("hashing the redacted pair", () => {
    it("gives a different id from the original, so each is saved as its own bookmark", async () => {
        // Given the original pair and its redacted version
        // When we hash both
        const originalId = await hashPair(dirtyPair.prompt, dirtyPair.response);
        const redactedId = await hashPair(
            redactedPair.prompt,
            redactedPair.response,
        );

        // Then the two ids are different
        expect(redactedId).not.toBe(originalId);
    });
});

describe("findExistingId", () => {
    it("returns the original id when the original pair is saved", () => {});
});
