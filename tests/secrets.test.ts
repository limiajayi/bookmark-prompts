import { describe, expect, it } from "vitest";
import { findSecrets, redactSecrets } from "../utils/secrets";

// Fake keys, built at runtime so GitHub's secret scanning doesn't flag this file.
const anthropicKey = `sk-ant-api03-${"x".repeat(24)}`;
const openAiKey = `sk-proj-${"y".repeat(30)}`;
const githubToken = `ghp_${"a".repeat(36)}`;

describe("findSecrets", () => {
    describe("detects each kind of secret", () => {
        it("finds an Anthropic API key", () => {
            // Given a message containing an Anthropic key
            const text = `My key is ${anthropicKey}`;

            // When we scan it
            const matches = findSecrets(text);

            // Then one match is reported, labelled as an Anthropic key
            expect(matches).toHaveLength(1);
            expect(matches[0].kind).toBe("Anthropic API key");
        });

        it("finds an OpenAI API key", () => {
            // Given a message containing an OpenAI project key
            const text = `export OPENAI_API_KEY=${openAiKey}`;

            // When we scan it
            const matches = findSecrets(text);

            // Then one match is reported, labelled as an OpenAI key
            expect(matches).toHaveLength(1);
            expect(matches[0].kind).toBe("OpenAI API key");
        });

        it("finds an AWS access key", () => {
            // Given a message containing an AWS access key ID (AWS's documented example)
            const text = "aws key: AKIAIOSFODNN7EXAMPLE";

            // When we scan it
            const matches = findSecrets(text);

            // Then one match is reported, labelled as an AWS key
            expect(matches.map((m) => m.kind)).toContain("AWS access key");
        });

        it("finds a GitHub token", () => {
            // Given a message containing a GitHub personal access token
            const text = `use ${githubToken} to push`;

            // When we scan it
            const matches = findSecrets(text);

            // Then one match is reported, labelled as a GitHub token
            expect(matches).toHaveLength(1);
            expect(matches[0].kind).toBe("GitHub token");
        });

        it("finds a private key header", () => {
            // Given a message containing the start of a PEM private key
            const text = "-----BEGIN RSA PRIVATE KEY-----\nMIIEow...";

            // When we scan it
            const matches = findSecrets(text);

            // Then one match is reported, labelled as a private key
            expect(matches).toHaveLength(1);
            expect(matches[0].kind).toBe("Private key");
        });

        it("finds a JWT", () => {
            // Given a message containing a three-part JSON Web Token
            const jwt =
                "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fw";
            const text = `Authorization: ${jwt}`;

            // When we scan it
            const matches = findSecrets(text);

            // Then one match is reported, labelled as a JWT
            expect(matches.map((m) => m.kind)).toContain("JWT");
        });

        it("finds a credential assignment like password = value", () => {
            // Given a message assigning a long value to a password-like name
            const text = 'password = "hunter2hunter2"';

            // When we scan it
            const matches = findSecrets(text);

            // Then one match is reported, labelled as a credential assignment
            expect(matches).toHaveLength(1);
            expect(matches[0].kind).toBe("Credential assignment");
        });

        it("matches credential names regardless of case", () => {
            // Given a message using an upper-case API_KEY name
            const text = "API_KEY=abcdefgh12345678";

            // When we scan it
            const matches = findSecrets(text);

            // Then the assignment is still detected
            expect(matches.map((m) => m.kind)).toContain(
                "Credential assignment",
            );
        });
    });

    describe("avoids false positives", () => {
        it("returns nothing for ordinary chat text", () => {
            // Given a normal programming question with no secrets
            const text = "How do I reverse a string in TypeScript?";

            // When we scan it
            const matches = findSecrets(text);

            // Then no matches are returned
            expect(matches).toEqual([]);
        });

        it("does not flag a sentence that mentions a key without assigning one", () => {
            // Given a sentence that talks about API keys but doesn't contain a value
            const text = "Store your API key in an environment variable.";

            // When we scan it
            const matches = findSecrets(text);

            // Then no matches are returned
            expect(matches).toEqual([]);
        });

        it("does not flag a credential name followed by a short value", () => {
            // Given an assignment whose value is shorter than 8 characters
            const text = "password: abc";

            // When we scan it
            const matches = findSecrets(text);

            // Then no matches are returned
            expect(matches).toEqual([]);
        });
    });

    describe("match details", () => {
        it("reports the position of the secret so it can be sliced out", () => {
            // Given a secret in the middle of a sentence
            const text = `Here: ${anthropicKey} end`;

            // When we scan it
            const [match] = findSecrets(text);

            // Then slicing the text at start and end gives back exactly the secret
            expect(text.slice(match.start, match.end)).toBe(anthropicKey);
        });

        it("never includes the full secret in the preview", () => {
            // Given a secret
            const text = `key: ${anthropicKey}`;

            // When we scan it
            const [match] = findSecrets(text);

            // Then the preview is masked and does not contain the full value
            expect(match.preview).not.toBe(anthropicKey);
            expect(match.preview).not.toContain(anthropicKey);
            expect(match.preview.startsWith("sk-a")).toBe(true);
        });

        it("fully masks a value shorter than 12 characters", () => {
            // Given a credential assignment whose value is exactly 8 characters
            const text = "token: abcdefgh";

            // When we scan it
            const [match] = findSecrets(text);

            // Then the preview is only dots, with no characters shown
            expect(match!.preview).toBe("••••");
        });

        it("returns matches sorted by position in the text", () => {
            // Given two secrets, with the GitHub token appearing first
            const text = `${githubToken} and then ${anthropicKey}`;

            // When we scan it
            const matches = findSecrets(text);

            // Then the matches come back in the order they appear
            expect(matches.map((m) => m.kind)).toEqual([
                "GitHub token",
                "Anthropic API key",
            ]);
        });

        it("reports an Anthropic key once, not again as an OpenAI key", () => {
            // Given an Anthropic key, which also matches the broader OpenAI pattern
            const text = anthropicKey;

            // When we scan it
            const matches = findSecrets(text);

            // Then it is counted once, under the more specific label
            expect(matches).toHaveLength(1);
            expect(matches[0].kind).toBe("Anthropic API key");
        });
    });
});

describe("redactSecrets", () => {
    it("replaces a secret with a labelled placeholder and keeps the surrounding text", () => {
        // Given a sentence containing an Anthropic key
        const text = `My key is ${anthropicKey}, please help.`;

        // When we redact it
        const result = redactSecrets(text);

        // Then the key is replaced and the rest of the sentence is unchanged
        expect(result).toBe(
            "My key is [REDACTED: Anthropic API key], please help.",
        );
    });

    it("redacts every occurrence of every secret", () => {
        // Given a text with two different secrets
        const text = `${anthropicKey} and ${githubToken}`;

        // When we redact it
        const result = redactSecrets(text);

        // Then neither secret remains
        expect(result).not.toContain(anthropicKey);
        expect(result).not.toContain(githubToken);
        expect(result).toBe(
            "[REDACTED: Anthropic API key] and [REDACTED: GitHub token]",
        );
    });

    it("leaves text without secrets unchanged", () => {
        // Given text with no secrets
        const text = "Explain closures in JavaScript.";

        // When we redact it
        const result = redactSecrets(text);

        // Then the text is returned exactly as it was
        expect(result).toBe(text);
    });

    it("produces text that no longer contains any detectable secrets", () => {
        // Given text containing several secrets
        const text = `${anthropicKey}\n${githubToken}\npassword = "hunter2hunter2"`;

        // When we redact it and scan the result
        const redacted = redactSecrets(text);

        console.log(redacted);

        // Then scanning the redacted text finds nothing
        expect(findSecrets(redacted)).toEqual([]);
    });
});
