import { effect } from '@vue/reactivity';
import type { ReactiveElement } from './types';
import { toFunction } from './utils';

export const KOVAA_SYMBOL = Symbol()

const walkChildren = (children: HTMLCollection, $store: Record<string, any>, context:ReactiveElement) => {
    for (let i = 0;i< children.length;i+=1) {
        walk(children[i] as HTMLElement, $store, context);
    }
}

const bind = (el: HTMLElement, attrName: string, value: string, $store: Record<string, any>) => {
    effect(() => el.setAttribute(attrName, $store[value]));
}

const on = (el: HTMLElement, eventName: string, methodOrFunction: string, $store: Record<string, any>, context:ReactiveElement) => {
    // @ts-ignore
    const handler = methodOrFunction in context && typeof context[methodOrFunction] === 'function' ? 
        // @ts-ignore
        context[methodOrFunction].bind(context) : 
        methodOrFunction in $store ?
        $store[methodOrFunction].bind(context) :
        () => toFunction(methodOrFunction)($store, context, el);

    // Use the abort controller from the context to clear it when the context element is removed
    el.addEventListener(eventName, handler, { signal: context.ac.signal })
}

const processDirective = (el:HTMLElement, fullName:string, value: string, $store: Record<string, any>, context:ReactiveElement) => {
    if (fullName[0] === ':' || fullName.match(/^x-bind:/)) {
        bind(el, fullName.split(':')[1], value, $store);
    }
    if (fullName[0] === '@' || fullName.match(/^x-on:/)) {
        on(el, fullName.split(/@|:/)[1], value, $store, context);
    }
}

const walk = (el:HTMLElement, $store: Record<string, any>, context: ReactiveElement) => {
    if (el.nodeType !== 1) return;
    // don't walk into another kovaa element
    if (!Object.is(el, context) && KOVAA_SYMBOL in el) return;

    for (const attr of el.attributes) {
        const { name, value } = attr;
        processDirective(el, name, value, $store, context);
    }
    walkChildren(el.children, $store, context);
}

export { walk }