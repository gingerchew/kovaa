import type { Directive } from ".";
// el: HTMLElement, attrName: string, value: string, $store: Record<string, any>
export const bind = ({ exp, arg, get, $el, effect }: Directive<HTMLElement>) => {
    effect(() => {
        const value = get();
        console.log({ arg, exp, value });
        $el.setAttribute(arg!, get(exp))
    });
}
