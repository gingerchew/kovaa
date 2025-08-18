import type { $Store, ReactiveElement } from "./types";

export const KOVAA_SYMBOL = Symbol()

const $ = (el:ReactiveElement<$Store>) => (selector:string) => el.querySelector(selector);
const $$ = (el:ReactiveElement<$Store>) => (selector:string) => Array.from(el.querySelectorAll(selector));

const $t = (obj:unknown) => Object.prototype.toString.call(obj).slice(8, -1);

const makeLocalName = (s:string, prefix?: string) => {
    let localName = s.replace(/(.)([A-Z])/g, '$1-$2').toLowerCase();
    
    if (prefix) return `${prefix}-${localName}`;

    return localName.indexOf('-') < 0 ? `x-${localName}` : localName;
}

const fnCache = Object.create(null);
const toFunction = (exp:string) => {
    try {
        return new Function("$store", "$context", "$el", `with($store) { ${exp} }`);
    } catch(error) {
        console.error(`${(error as Error).message} in expression: ${exp}`)
        return () => {}
    }
}

const evaluate = (exp: string, $store: Record<string, any>, $el?: Node, $context?: ReactiveElement<typeof $store>) => execute(`return(${exp})`, $store, $el, $context);

const execute = (exp: string, $store: Record<string, any>, $el?: Node, $context?: ReactiveElement<typeof $store>) => {
    const fn = fnCache[exp] ||= toFunction(exp);
    try {
        return fn($store, $context, $el);
    } catch(error) {
        console.error(error);
    }
}

const isComponent = (key: string, value:string) => typeof value === 'function' && key[0].toUpperCase() === key[0];

const isReactiveElement = (el:unknown): el is ReactiveElement<$Store> => el instanceof HTMLElement && KOVAA_SYMBOL in el;

const createFromTemplate = (str: string) => {
    const tmp = document.createElement('template');
    tmp.innerHTML = str;
    return tmp;
}

const perf = (start = performance.now()) => () => console.log(performance.now() - start);

export { $t, makeLocalName, evaluate, toFunction, isComponent, isReactiveElement, $, $$, createFromTemplate, perf }