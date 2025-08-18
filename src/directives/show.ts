import type { Directive } from ".";

export const show = ({ $el, exp, context, effect }: Directive<HTMLElement>) => {
    let initial = $el.style.display;
    effect(() => {
        $el.style.display = context[exp] ? initial : 'none';
    })
}