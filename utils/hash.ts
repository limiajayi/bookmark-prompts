/**
 * Returns a hash based on a prompt response pair
 * Used in making a special ID for each Bookmark object
 * @param prompt The user's prompt
 * @param response The assistant's response
 * @returns A hash
 */
export async function hashPair(
    prompt: string,
    response: string,
): Promise<string> {
    // The separator stops two different pairs joining into the same string.
    const bytes = new TextEncoder().encode(`${prompt}\n---\n${response}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
