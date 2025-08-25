import { isObject } from "@vue/shared";
import type { Directive } from "../types";

export const text:Directive<HTMLElement> = ({ arg, exp, get, $el, effect }) => {
    console.log({ arg, exp, name: $el.localName });
    effect(() => $el.textContent = toDisplayString(get()));
}

export const toDisplayString = (str:unknown) => 
    str == null ? ''
        : isObject(str) ?
            JSON.stringify(str)
        : String(str);
