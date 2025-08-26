import type { Directive } from "../types";

export const show:Directive = ({ $el, exp, context, effect }) => {
    let initial = $el.style.display;
    effect(() => $el.style.display = context[exp] ? initial : 'none')
}