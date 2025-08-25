import type { Directive } from ".";
// el: HTMLElement, attrName: string, value: string, $store: Record<string, any>
export const bind = ({ arg, get, $el, effect }: Directive<HTMLElement>) => {
    const attrName = arg!.split(':')[1];
    console.log({ attrName });
    console.log(arg, $el.localName, get());
    effect(() => $el.setAttribute(attrName, get()));
}
