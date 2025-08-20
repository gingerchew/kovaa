import type { Directive } from ".";
// el: HTMLElement, attrName: string, value: string, $store: Record<string, any>
export const bind = ({ arg, exp, get, $el, effect }: Directive<HTMLElement>) => {
    effect(() => {
        $el.setAttribute(arg!, get(exp))
    });
}
