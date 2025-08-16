import type { $Store, ReactiveElement, Component, ComponentDefinition, ComponentDefArgs } from "./types";
import { $t, evaluate, isComponent, KOVAA_SYMBOL, $, $$, createFromTemplate } from "./utils";
import { createWalker, toDisplayString } from "./walk";

const processDefinition = (def: Component, el: ReactiveElement<$Store>) => {
    // If there is a tpl, 
    if ('$tpl' in def) {
        if ($t(def.$tpl) === 'String') {
            let tmp:HTMLTemplateElement;
            try {
                tmp = (el.querySelector<HTMLTemplateElement>(def.$tpl as string)! ?? document.querySelector<HTMLTemplateElement>(def.$tpl as string)!);
            } catch(e) {
                // if querySelector fails, assume def.$tpl is an html string
                tmp = createFromTemplate(def.$tpl as string);
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
    } else {
        Object.defineProperty(def, '$tpl', {
            value: null
        });
    }

    return def;
}

const definePropOrMethod = <T extends $Store>(instance: ReactiveElement<T>, $store: T, isReactive = true) => {
    for (const key of Object.keys($store)) {
        // Don't add components to other component classes
        if (isComponent(key, $store[key])) continue;
        if (typeof $store[key] === 'function' || !isReactive) {
            Object.defineProperty(instance, key, {
                value: $store[key]
            });
        } else {
            Object.defineProperty(instance, key, {
                get() {
                    return $store[key]
                },
                set(v: typeof $store[typeof key]) {
                    // @ts-ignore
                    $store[key] = v;
                }
            })
        }
    }
}


const define = (localName:string, def: ComponentDefinition & (() => Component), $store: Record<string, any>) => {
    if (!customElements.get(localName)) {
        // @ts-ignore
        customElements.define(localName, class extends HTMLElement implements ReactiveElement<$store> {
            static get observedAttributes() { return def.props }
            $store = $store;
            #connected?: () => void;
            #disconnected?: () => void;
            #attributeChanged?: (key:string, oldValue: any, newValue: any) => void;
            ac = new AbortController();
            $s = toDisplayString;
            [KOVAA_SYMBOL] = true;
            
            constructor() {
                super();

                definePropOrMethod(this, $store);
                const scope = evaluate(this.getAttribute('x-scope') ?? '{}', $store);

                // @TODO: Get $listen to support specifying an element to target and options
                const $listen = this.addEventListener.bind(this);
                const $emit = (event:string, el?:HTMLElement) => (el ?? this).dispatchEvent(new CustomEvent(event));
                
                const { $tpl, connected, disconnected, attributeChanged, ...methodsAndProps } = processDefinition(def.apply<typeof this, ComponentDefArgs<typeof scope>[], Component>(this, [{ ...scope, $: $(this), $$: $$(this), $emit, $listen }]) ?? { }, this);
                
                this.#connected = connected?.bind(this);
                this.#disconnected = disconnected?.bind(this);
                this.#attributeChanged = attributeChanged?.bind(this);

                definePropOrMethod(this, methodsAndProps, false);
    
                if ($tpl) {
                    this.append($tpl);
                }

                createWalker(this, $store);
            }

            connectedCallback() {
                this.#connected?.();
            }

            attributeChangedCallback(key:string, oldValue: any, newValue: any) {
                this.#attributeChanged?.(key, oldValue, newValue);
            }

            disconnectedCallback() {
                // if you use directive to apply event listeners
                // they will all have this signal attached to them
                // and when the element is removed from the dom,
                // they will be cleaned up
                this.ac.abort();
                this.#disconnected?.();
            }
        });
    } else {
        throw new Error(`Custom Element with name ${localName} has already been defined.`);
    }
}

export { define };