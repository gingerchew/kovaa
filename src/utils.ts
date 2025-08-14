import type { ReactiveElement } from "./types";

const $t = (obj:unknown) => Object.prototype.toString.call(obj).slice(8, -1);

const makeLocalName = (s:string, prefix?: string) => {
    let localName = s.replace(/(.)([A-Z])/g, '$1-$2').toLowerCase();
    
    if (prefix) return `${prefix}-${localName}`;

    return localName.indexOf('-') < 0 ? `x-${localName}` : localName;
}


const fnCache = Object.create(null);
const toFunction = (exp:string) => {
    try {
        return new Function("$store", "$context", "$el", `${exp}`);
    } catch(error) {
        console.error(`${(error as Error).message} in expression: ${exp}`)
        return () => {}
    }
}

const evaluate = (exp: string, $store: Record<string, any>, $el?: HTMLElement, $context?: ReactiveElement<typeof $store>) => execute(`return(${exp})`, $store, $el, $context);

const execute = (exp: string, $store: Record<string, any>, $el?: HTMLElement, $context?: ReactiveElement<typeof $store>) => {
    const fn = fnCache[exp] ||= toFunction(exp);
    try {
        return fn($store, $context, $el);
    } catch(error) {
        console.error(error);
    }
}

export { $t, makeLocalName, evaluate, toFunction }