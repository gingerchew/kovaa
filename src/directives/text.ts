import type { Directive } from "../types";

export const text:Directive<HTMLElement> = ({ arg, exp, get, $el, effect }) => {
    console.log({ arg, exp, name: $el.localName });
    effect(() => $el.textContent = toDisplayString(get()));
}

export const toDisplayString = (str:unknown) => 
    str == null ? ''
        : str !== null && typeof str === 'object' ?
            JSON.stringify(str)
        : String(str);
