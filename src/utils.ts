import { hasOwn, isFunction } from "@vue/shared";
import type { $Store, ReactiveElement } from "./types";

export const KOVAA_SYMBOL = Symbol()

const fnCache = Object.create(null);
const toFunction = (exp:string) => {
    try {
        return new Function("$store", "$context", "$el", `with($store) { ${exp} }`);
    } catch(error) {
        console.error(`${(error as Error).message} in expression: ${exp}`)
        return () => {}
    }
}

const evaluate = (exp: string, $store: Record<string, any>, $el?: Node, $context?: ReactiveElement<typeof $store>) => execute(`return(${exp.trim()})`, $store, $el, $context);

const execute = (exp: string, $store: Record<string, any>, $el?: Node, $context?: ReactiveElement<typeof $store>) => {
    const fn = fnCache[exp] ||= toFunction(exp);
    try {
        return fn($store, $context, $el);
    } catch(error) {
        import.meta.env.DEV && console.warn(`Failed to execute expression: ${exp}`);
        console.error(error);
    }
}

const isComponent = (key: string, value:string) => isFunction(value) && key[0].toUpperCase() === key[0];

const isReactiveElement = (el:unknown): el is ReactiveElement<$Store> => el instanceof HTMLElement && hasOwn(el, KOVAA_SYMBOL);

const createFromTemplate = (str: string, tmp = document.createElement('template')) => (tmp.innerHTML = str, tmp);

const defineProp = (instance: object, key: string, config: any) => Object.defineProperty(instance, key, typeof config !== 'object' ? { value: config } : config);

export { evaluate, toFunction, isComponent, isReactiveElement, createFromTemplate, defineProp }