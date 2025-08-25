import { extend, isFunction, isString } from "@vue/shared";
import type { $Store, ReactiveElement, Component, ComponentDefinition, ComponentDefArgs } from "./types";
import { evaluate, isComponent, KOVAA_SYMBOL, createFromTemplate, defineProp } from "./utils";
import { createWalker } from "./walk";
import { effect } from '@vue/reactivity';
import type { ReactiveEffectRunner } from "@vue/reactivity";

const processDefinition = (def: Component, el: ReactiveElement<$Store>) => {
    def = extend({ $tpl: null }, def);
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
    let $connected: () => void, $disconnected: () => void, $attributeChanged: (key:string, o:any, n: any) => void;
    if (!customElements.get(localName)) {
        // @ts-ignore
        customElements.define(localName, class extends HTMLElement implements ReactiveElement<$store> {
            static get observedAttributes() { return def.$attrs; }
            localName = localName;
            $store = $store;
            ac = new AbortController();
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
                const scope = evaluate(this.getAttribute('x-scope') ?? '{}', $store);

                // @TODO: Get $listen to support specifying an element to target and options
                const $listen = this.addEventListener.bind(this);
                const $emit = (event:string, el?:HTMLElement) => (el ?? this).dispatchEvent(new CustomEvent(event));
                
                const { $tpl, connected, disconnected, attributeChanged, ...methodsAndProps } = processDefinition(def.apply<typeof this, ComponentDefArgs<typeof scope>[], Component>(this, [{ ...scope, $: (selector:string) => this.querySelector(selector), $$: (selector:string) => [...this.querySelectorAll(selector)], $emit, $listen }]), this);
                
                $connected = connected?.bind(this);
                $disconnected = disconnected?.bind(this);
                $attributeChanged = attributeChanged?.bind(this);

                definePropOrMethod(this, methodsAndProps, false);
    
                if ($tpl) {
                    this.append($tpl);
                }

                createWalker(this, $store);
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
                this.ac.abort();
                $disconnected?.();
                this.cleanups.forEach(c => c());
            }
        });
    } else if (import.meta.env.DEV) {
        throw new Error(`Custom Element with name ${localName} has already been defined.`);
    }
}

export { define };