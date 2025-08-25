import { isObject } from "@vue/shared";
import type { Directive } from "../types";

export const text:Directive<HTMLElement> = ({ get, $el, effect }) => {
    effect(() => $el.textContent = toDisplayString(get()));
}

export const toDisplayString = (str:unknown) => 
    str == null ? ''
        : isObject(str) ?
            JSON.stringify(str)
        : String(str);
