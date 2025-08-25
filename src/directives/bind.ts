import type { Directive } from "../types";
// el: HTMLElement, attrName: string, value: string, $store: Record<string, any>
export const bind:Directive = ({ arg, get, $el, effect }) => {
    const attrName = arg!.split(':')[1];
    console.log({ attrName });
    console.log(arg, $el.localName, get());
    effect(() => $el.setAttribute(attrName, get()));
}
