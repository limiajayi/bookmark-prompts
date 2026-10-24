import type { Pair } from "./extract";
import { hashPair } from "./hash";
import { askAboutSecrets } from "./secretModal";
import { findSecrets, redactSecrets } from "./secrets";
import { hasBookmark } from "./storage";

function redactPair(pair: Pair): Pair {
    return {
        prompt: redactSecrets(pair.prompt),
        response: redactSecrets(pair.response),
    };
}

/**
 * @param pair The original prompt-response pair
 * @returns pair or null depending on if the user saved, redacted or cancelled saving secrets
 * Checks a pair for secrets before it is saved
 * Returns the pair to store or null if the user cancelled
 */
export async function confirmSecrets(pair: Pair): Promise<Pair | null> {
    const matches = findSecrets(`${pair.prompt}\n${pair.response}`);
    if (matches.length === 0) return pair; // nothing found, so no modal

    const choice = await askAboutSecrets(matches);
    if (choice === "cancel") return null;
    if (choice === "redact") return redactPair(pair);
    return pair; // "save": keep the original text
}

/**
 *
 * @param pair The original prompt response pair
 * @returns The original id, a redactedId or null
 */
export async function findExistingId(pair: Pair): Promise<string | null> {
    const originalId = await hashPair(pair.prompt, pair.response);
    if (await hasBookmark(originalId)) return originalId;

    const redacted = redactPair(pair);
    const redactedId = await hashPair(redacted.prompt, redacted.response);

    if (redactedId !== originalId && (await hasBookmark(redactedId)))
        return redactedId;

    return null;
}
