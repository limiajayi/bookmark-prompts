// Every claude.ai-specific selector lives in this file.
// If Claude's markup changes and the extension stops working, fix it here.

// attribute on the bookmark button
export const HOST_ATTR = "data-pb-host";

export const SELECTOR_VARIANTS = {
    userMessage: ['[data-testid="user-message"]', '[data-cds="UserMessage"]'],
    assistantMessage: [
        '[data-testid="assistant-message"]',
        '[data-cds="AssistantMessage"]',
    ],
} as const;

const USER = SELECTOR_VARIANTS.userMessage.join(", ");
const ASSISTANT = SELECTOR_VARIANTS.assistantMessage.join(", ");

export const SELECTORS = {
    userMessage: USER,
    assistantMessage: ASSISTANT,
    // Matches either kind. querySelectorAll returns them in page order.
    anyMessage: `${USER}, ${ASSISTANT}`,
    // Inside a user message, the element that holds just what the user typed.
    userMessageBody: ".cds-user-message-body",
    // Page furniture inside a message that must never end up in saved text:
    // the "50 minutes ago" timestamp (<time>), copy/edit/retry buttons,
    // screen-reader-only labels, icons, our own bookmark button, and the
    // status row ("Reading a page", "Fetched: ...") shown above the answer.
    ignoredInText: `time, button, svg, style, script, .sr-only, [${HOST_ATTR}], [data-cds="TurnStatus"], [data-testid="message-actions"]`,
    // claude.ai sets this attribute on an assistant message: "true" while it is
    // working or writing, "false" once it has finished.
    streamingAttr: "data-is-streaming",
} as const;
