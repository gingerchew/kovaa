import { extend, hasOwn, isFunction, isString } from "@vue/shared";
import type { $Store, Component, ComponentDefArgs, ReactiveElement } from "./types";

export const KOVAA_SYMBOL = Symbol()

export const allDefinedEventName = 'kovaa:alldefined' as const;

const fnCache = Object.create(null);
const toFunction = (exp:string) => {
    try {
        return new Function("$store", "$context", "$el", `with($store) { ${exp} }`);
    } catch(error) {
        import.meta.env.DEV && console.error(`${(error as Error).message} in expression: ${exp}`)
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

const defineProp = (instance: object, key: string, config: any) => Object.defineProperty(instance, key, config);

const definePropOrMethod = <T extends $Store>(instance: ReactiveElement<T>, $store: T, isReactive = true) => {
    for (let [key,prop] of Object.entries($store)) {
        // Don't add components to other component classes
        if (isComponent(key, prop)) continue;
        if (isFunction(prop) || !isReactive) {
            defineProp(instance, key, { value: prop })
        } else {
            defineProp(instance, key, {
                get() { return $store[key] },
                set(v: typeof prop) {
                    // @ts-ignore
                    $store[key] = v
                }
            })
        }
    }
}

const processDefinition = <T extends $Store>(defn: (config: ComponentDefArgs<T>) => Component, config: ComponentDefArgs<T>, el: ReactiveElement<$Store>) => {
    const def = extend<{ $tpl: null|DocumentFragment }, ReturnType<typeof defn>>({ $tpl: null }, defn(config));
    // If there is a tpl, 
    if (isString(def.$tpl)) {
        let tmp:HTMLTemplateElement;
        try {
            tmp = el.querySelector(def.$tpl)! ?? document.querySelector(def.$tpl)!;
        } catch(e) {
            // if querySelector fails, assume def.$tpl is an html string
            tmp = createFromTemplate(def.$tpl);
        }

        // if tmp is still null, assume it is a text string
        if (tmp === null) {
            import.meta.env.DEV && console.warn(`Could not find element with selector ${def.$tpl} falling back to using as template`);
            tmp = createFromTemplate(def.$tpl as string);
        }
        
        def.$tpl = tmp.content.cloneNode(true) as DocumentFragment;
    } 
    if (def.$tpl instanceof HTMLTemplateElement) {
        def.$tpl = def.$tpl.content.cloneNode(true) as DocumentFragment;
    }
    return def;
}

export { evaluate, isReactiveElement, definePropOrMethod, processDefinition, defineProp, isComponent }