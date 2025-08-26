import { isFunction } from "@vue/shared";
import type { Directive } from "../types";

export const on:Directive = ({ $el, arg, exp, $store, context, get }) => {//, eventName: string, methodOrFunction: string, $store: Record<string, any>, context:ReactiveElement<typeof $store>) => {
    const eventName = arg!.split(/@|:/)[1] as keyof HTMLElementEventMap
    // @ts-ignore
    const handler = exp in context && isFunction(context[exp]) ? 
        // @ts-ignore
        context[exp].bind(context) : 
        exp in $store ?
        $store[exp].bind(context) :
        get(`(e) => ${exp}`);

    // Use the abort controller from the context to clear it when the context element is removed
    $el.addEventListener(eventName , handler, { signal: context._ac.signal })
}