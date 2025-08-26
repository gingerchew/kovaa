import { extend, isFunction, isObject, isString } from "@vue/shared";
import type { $Store, ReactiveElement, Component, ComponentDefinition, ComponentDefArgs } from "./types";
import { evaluate, isComponent, KOVAA_SYMBOL, createFromTemplate, defineProp } from "./utils";
import { createWalker } from "./walk";
import { effect } from '@vue/reactivity';
import type { ReactiveEffectRunner } from "@vue/reactivity";
import { css } from "./styles";
import { notifier } from ".";

const processDefinition = <$s extends $Store>(defn: (config: ComponentDefArgs<$s>) => Component, config: ComponentDefArgs<$s>, el: ReactiveElement<$Store>) => {
    const result = defn(config);
    const def = extend<{ $tpl: null|DocumentFragment }, (typeof result)>({ $tpl: null }, defn(config));
    // If there is a tpl, 
    if (isString(def.$tpl)) {
        let tmp:HTMLTemplateElement;
        try {
            tmp = el.querySelector(def.$tpl)! ?? document.querySelector<HTMLTemplateElement>(def.$tpl)!;
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
    for (const key of Object.keys($store)) {
        // Don't add components to other component classes
        if (isComponent(key, $store[key])) continue;
        if (isFunction($store[key]) || !isReactive) {
            defineProp(instance, key, $store[key])
        } else {
            defineProp(instance, key, {
                get() { return $store[key] },
                set(v: typeof $store[keyof typeof $store]) {
                    // @ts-ignore
                    $store[key] = v;
                }
            })
        }
    }
}

const define = (localName:string, def: ComponentDefinition & (() => Component), $store: Record<string, any>) => {
    if (!customElements.get(localName)) {
        let tpl: DocumentFragment|null, $connected: () => void, $disconnected: () => void, $attributeChanged: (key:string, o:any, n: any) => void, ac = new AbortController();
        // @ts-ignore
        customElements.define(localName, class extends HTMLElement implements ReactiveElement<typeof $store> {
            static get observedAttributes() { return def.$attrs; }
            localName = localName;
            parentContext?:ReactiveElement<$Store>;
            $store = $store;
            ac = ac;
            [KOVAA_SYMBOL] = true;
            effects:ReactiveEffectRunner[] = [];
            cleanups:(() => void)[] = [];
            effect(fn: () => any) {
                const e = effect(fn);
                this.effects.push(e);
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
                const { $tpl, connected, disconnected, attributeChanged, ...methodsAndProps } = processedDefinition
                tpl = $tpl;
                $connected = connected?.bind(this);
                $disconnected = disconnected?.bind(this);
                $attributeChanged = attributeChanged?.bind(this);
                
                if (tpl) {
                    this.append(tpl);
                }

                notifier.addEventListener('kovaa:alldefined', () => createWalker(this, $store));

                definePropOrMethod(this, methodsAndProps, false);
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
                this.cleanups.forEach(c => c());
            }
        });
    } else if (import.meta.env.DEV) {
        throw new Error(`Custom Element with name ${localName} has already been defined.`);
    }
}

export { define };