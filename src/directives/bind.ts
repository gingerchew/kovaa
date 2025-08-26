import type { Directive } from "../types";

export const bind:Directive = ({ arg, get, $el, effect }) => {
    effect(() => $el.setAttribute(arg!.split(':')[1], get()));
}
