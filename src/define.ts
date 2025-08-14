import type { $Store, ReactiveElement } from "./types";
import { $t, evaluate } from "./utils";
import { walk, KOVAA_SYMBOL } from "./walk";

type ComponentDefinition = {
    props: string[]
}

interface Component {
    $tpl: null|string|HTMLTemplateElement|DocumentFragment;
    connected: () => void;
    disconnected: () => void;
    attributeChanged: (key: string, oldValue: any, newValue: any) => void;
}

const $ = (el:ReactiveElement<$Store>) => document.querySelector.bind(el);
const $$ = (el:ReactiveElement<$Store>) => (selector:string) => Array.from(document.querySelectorAll.apply(el, [selector]));

const createFromTemplate = (str: string) => {
    const tmp = document.createElement('template');
    tmp.innerHTML = str;
    return tmp;
}

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
            [KOVAA_SYMBOL] = true;
            
            constructor() {
                super();

                for (const key of Object.keys($store)) {
                    Object.defineProperty(this, key, {
                        get() {
                            console.log(key);
                            return $store[key]
                        },
                        set(v) {
                            $store[key] = v;
                        }
                    })
                }
                const scope = evaluate(this.getAttribute('x-scope') ?? '{}', $store);
                const { $tpl, connected, disconnected, attributeChanged, ...methodsAndProps } = processDefinition(def.apply<typeof this, (typeof scope)[], Component>(this, [scope, $, $$]) ?? { }, this);
                
                
                this.#connected = connected?.bind(this);
                this.#disconnected = disconnected?.bind(this);
                this.#attributeChanged = attributeChanged?.bind(this);

                for (const [key, methodOrProp] of Object.entries(methodsAndProps)) {
                    if (typeof methodOrProp === 'function') {
                        Object.defineProperty(this, key, {
                            value: methodOrProp,
                        });
                    }
                }
                console.log(Object.keys($store));

    
                if ($tpl) {
                    this.append($tpl);
                }
    
                // parse before running connected
                walk(this, $store, this);
    
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