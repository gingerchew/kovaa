import type { Directive } from "../types";

export const ref: Directive = ({ exp, $el, context }) => {
    context.$refs[exp] = $el;
}