import type { Directive } from ".";

export const text = <T extends HTMLElement>({ get, $el, effect }:Directive<T>) => {
    effect(() => {
        $el.textContent = get();
    });
}

export const toDisplayString = (str:unknown) => 
    str == null ? ''
        : str !== null && typeof str === 'object' ?
            JSON.stringify(str)
        : String(str);
