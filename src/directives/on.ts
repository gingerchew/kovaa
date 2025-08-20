import type { Directive } from ".";

export const on = ({ $el, arg, exp, $store, context, get }:Directive<HTMLElement> ) => {//, eventName: string, methodOrFunction: string, $store: Record<string, any>, context:ReactiveElement<typeof $store>) => {
    const eventName = arg!.split(/@|:/)[1] as keyof HTMLElementEventMap
    // @ts-ignore
    const handler = exp in context && typeof context[exp] === 'function' ? 
        // @ts-ignore
        context[exp].bind(context) : 
        exp in $store ?
        $store[exp].bind(context) :
        get(`(e) => ${exp}`);

    // Use the abort controller from the context to clear it when the context element is removed
    $el.addEventListener(eventName , handler, { signal: context.ac.signal })
}