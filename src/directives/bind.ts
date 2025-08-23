import type { Directive } from ".";
// el: HTMLElement, attrName: string, value: string, $store: Record<string, any>
export const bind = ({ arg, exp, get, $el, effect }: Directive<HTMLElement>) => {
    const attrName = arg?.split(':')[1];
    effect(() => $el.setAttribute(attrName, get(exp)));
}
