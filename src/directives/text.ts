import type { Directive } from ".";

export const text = <T extends HTMLElement>({ arg, exp, get, $el, effect }:Directive<T>) => {
    console.log({ arg, exp, name: $el.localName });
    effect(() => $el.textContent = toDisplayString(get()));
}

export const toDisplayString = (str:unknown) => 
    str == null ? ''
        : str !== null && typeof str === 'object' ?
            JSON.stringify(str)
        : String(str);
