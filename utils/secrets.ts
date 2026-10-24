export type SecretMatch = {
    kind: string;
    start: number;
    end: number;
    preview: string; // masked and never the full value
};

const SECRET_PATTERNS: { kind: string; regex: RegExp }[] = [
    { kind: "Anthropic API key", regex: /sk-ant-[A-Za-z0-9_-]{20,}/g },
    { kind: "OpenAI API key", regex: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
    { kind: "AWS access key", regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
    { kind: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
    { kind: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
    {
        kind: "Stripe secret key",
        regex: /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/g,
    },
    { kind: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
    { kind: "Private key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
    {
        kind: "JWT",
        regex: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    },
    {
        kind: "Credential assignment",
        regex: /(?<=\b(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*["']?)(?!\[REDACTED)[^\s"']{8,}/gi,
    },
];

export function redactSecrets(text: string): string {
    let result = text;

    for (const { kind, regex } of SECRET_PATTERNS) {
        result = result.replace(regex, `[REDACTED: ${kind}]`);
    }
    return result;
}

export function maskValue(value: string): string {
    if (value.length < 12) return "••••";
    return `${value.slice(0, 4)}••••${value.slice(-2)}`;
}

export function findSecrets(text: string): SecretMatch[] {
    const found: SecretMatch[] = [];

    for (const { kind, regex } of SECRET_PATTERNS) {
        // matchALL gives every match and handles the regex's internal state for us
        for (const m of text.matchAll(regex)) {
            const start = m.index ?? 0;
            const end = start + m[0].length;

            // skip matches already covered by an earlier pattern (eg sk-ant- also hits OpenAI pattern)
            const overlaps = found.some((f) => start < f.end && end > f.start);
            if (overlaps) continue;

            found.push({ kind, start, end, preview: maskValue(m[0]) });
        }
    }

    return found.sort((a, b) => a.start - b.start);
}
