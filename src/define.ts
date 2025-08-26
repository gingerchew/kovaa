import { extend, isFunction, isObject, isString } from "@vue/shared";
import type { $Store, ReactiveElement, Component, ComponentDefinition, ComponentDefArgs } from "./types";
import { evaluate, isComponent, KOVAA_SYMBOL, createFromTemplate, defineProp, allDefinedEventName } from "./utils";
import { createWalker } from "./walk";
import { effect } from '@vue/reactivity';
import type { ReactiveEffectRunner } from "@vue/reactivity";
import { css } from "./styles";

export const notifier = new EventTarget();

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

const definePropOrMethod = <T extends $Store>(instance: ReactiveElement<T>, $store: T, isReactive = true) => {
    for (let [key,prop] of Object.entries($store)) {
        // Don't add components to other component classes
        if (isComponent(key, prop)) continue;
        if (isFunction(prop) || !isReactive) {
            defineProp(instance, key, prop)
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

const define = (localName:string, def: ComponentDefinition & (() => Component), $store: Record<string, any>) => {
    if (!customElements.get(localName)) {
        let $connected: () => void, $disconnected: () => void, $attributeChanged: (key:string, o:any, n: any) => void, ac = new AbortController();
        // @ts-ignore
        customElements.define(localName, class extends HTMLElement implements ReactiveElement<typeof $store> {
            static get observedAttributes() { return def.$attrs; }
            localName = localName;
            _parentContext?:ReactiveElement<$Store>;
            $store = $store;
            _ac = ac;
            [KOVAA_SYMBOL] = true;
            _effects:ReactiveEffectRunner[] = [];
            _cleanups:(() => void)[] = [];
            effect(fn: () => any) {
                const e = effect(fn);
                this._effects.push(e);
                return e;
            }

            constructor() {
                super();

                definePropOrMethod(this, $store);

                // @TODO: Get $listen to support specifying an element to target and options
                const $listen = (eventName:keyof HTMLElementEventMap, handler:EventListenerOrEventListenerObject, options?: AddEventListenerOptions) => this.addEventListener(eventName, handler, extend({ capture: true, signal: ac.signal }, typeof options === 'boolean' ? { capture: options } : isObject(options) ? options : {}));
                const $emit = (event:string, el?:HTMLElement) => (el ?? this).dispatchEvent(new CustomEvent(event));
                const definitionConfig = { 
                    ...evaluate(this.getAttribute('x-scope') ?? '{}', $store), 
                    css: css(this),
                    $: (selector:string) => this.querySelector(selector),
                    $$: (selector:string) => [...this.querySelectorAll(selector)],
                    $emit, 
                    $listen
                }
                
                const processedDefinition = processDefinition<typeof $store>(def.bind(this), definitionConfig, this);
                const { connected, disconnected, attributeChanged, ...methodsAndProps } = processedDefinition

                $connected = connected?.bind(this);
                $disconnected = disconnected?.bind(this);
                $attributeChanged = attributeChanged?.bind(this);

                definePropOrMethod(this, methodsAndProps, false);
                // Saves a few bytes to append an empty string by default
                this.append(processedDefinition.$tpl ?? '');

                notifier.addEventListener(allDefinedEventName, () => createWalker(this, $store), { signal: ac.signal });
            }
            
            connectedCallback() {
                $connected?.();
            }

            attributeChangedCallback(key:string, oldValue: any, newValue: any) {
                $attributeChanged?.(key, oldValue, newValue);
            }

            disconnectedCallback() {
                // if you use directive to apply event listeners
                // they will all have this signal attached to them
                // and when the element is removed from the dom,
                // they will be cleaned up
                ac.abort();
                $disconnected?.();
                this._cleanups.forEach(c => c());
            }
        });
    } else if (import.meta.env.DEV) {
        throw new Error(`Custom Element with name ${localName} has already been defined.`);
    }

    return customElements.whenDefined(localName);
}

export { define };