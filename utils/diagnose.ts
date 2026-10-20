import { describeSelectorProblem } from "./extract";
import { HOST_ATTR, SELECTOR_VARIANTS, SELECTORS } from "./selectors";

export type Diagnosis = {
    variants: { kind: string; selector: string; matches: number }[];
    assistantMessages: number;
    buttons: number;
    withStreamingAttr: number;
    problems: string[];
};

export function diagnose(): Diagnosis {
    const variants = Object.entries(SELECTOR_VARIANTS).flatMap(
        ([kind, selectors]) =>
            selectors.map((selector) => ({
                kind,
                selector,
                matches: document.querySelectorAll(selector).length,
            })),
    );

    const assistantEls = [
        ...document.querySelectorAll(SELECTORS.assistantMessage),
    ];
    const buttons = document.querySelectorAll(`[${HOST_ATTR}]`).length;
    const withStreamingAttr = assistantEls.filter((el) =>
        el.hasAttribute(SELECTORS.streamingAttr),
    ).length;
    const problems: string[] = [];
    const selectorProblem = describeSelectorProblem();
    if (selectorProblem) {
        problems.push(selectorProblem);
    } else if (buttons === 0) {
        // fewer buttons than messages is normal
        // no buttons at all means button injection isnt working
        problems.push(
            `Found ${assistantEls.length} assistant messages(s) but injected no bookmark buttons`,
        );
    }

    if (assistantEls.length > 0 && withStreamingAttr === 0) {
        problems.push(
            `Degraded: no assistant message has ${SELECTORS.streamingAttr}, so "finished" falls back to a timer`,
        );
    }

    return {
        variants,
        assistantMessages: assistantEls.length,
        buttons,
        withStreamingAttr,
        problems,
    };
}

export function logDiagnosis(d: Diagnosis): void {
    const EXT_NAME = "[prompt-bookmarks]";
    if (d.problems.length === 0) {
        console.debug(`${EXT_NAME} Selectors look fine`, d);
        return;
    }

    console.group(
        `${EXT_NAME} Possible problem. claude.ai's markup may have changed: check utils/selectors.ts`,
    );
    for (const p of d.problems) {
        console.warn(p);
    }

    console.table(d.variants);
    console.log({
        assistantMessages: d.assistantMessages,
        buttons: d.buttons,
        withStreamingAttr: d.withStreamingAttr,
    });
    console.groupEnd();
}
