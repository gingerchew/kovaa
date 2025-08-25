import type { Directive } from "../types";

// el:HTMLElement, _fullName:string, value:string, $store:Record<string, any>, context:ReactiveElement<typeof $store>)
export const html:Directive = ({ get, $el, effect }) =>  {
    effect(() => $el.innerHTML = get())
}