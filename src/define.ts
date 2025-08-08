import type { ReactiveElement } from "./types";
import { evaluate } from "./utils";
import { walk, KOVAA_SYMBOL } from "./walk";

type ComponentDefinition = {
    props: string[]
}

interface Component {
    disconnected: () => void;
    attributeChanged: (key: string, oldValue: any, newValue: any) => void;
    [index: string]: Record<string, any>
}

const define = (localName:string, def: ComponentDefinition & (() => Component), $store: Record<string, any>) => {
    if (!customElements.get(localName)) {
        customElements.define(localName, class extends HTMLElement implements ReactiveElement {
            static get observedAttributes() { return def.props }
            $store = $store;
            #disconnected?: (() => void);
            #attributeChanged?: ((key:string, oldValue: any, newValue: any) => void);
            ac = new AbortController();
            [KOVAA_SYMBOL] = true;

            connectedCallback() {
                const scope = evaluate(this.getAttribute('x-scope') ?? '{}', $store);
                const { disconnected, attributeChanged, ...methods } = def.apply<typeof this, (typeof scope)[], Component>(this, [scope]) ?? { };
                
                
                this.#disconnected = disconnected?.bind(this);
                this.#attributeChanged = attributeChanged?.bind(this);
                
                for (const [key, method] of Object.entries(methods)) {
                    Object.defineProperty(this, key, {
                        value: method
                    })
                }

                walk(this, $store, this);
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