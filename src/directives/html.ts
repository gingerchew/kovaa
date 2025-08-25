import type { Directive } from ".";

// el:HTMLElement, _fullName:string, value:string, $store:Record<string, any>, context:ReactiveElement<typeof $store>)
export const html:Directive = ({ get, $el, effect }) =>  {
    console.log({ $el, get: get() });
    effect(() => $el.innerHTML = get())
}