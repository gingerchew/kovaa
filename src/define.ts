import type { ReactiveElement } from "./types";

interface Component {
    disconnected: () => void;
    attributeChanged: (key: string, oldValue: any, newValue: any) => void;
}

const define = (localName:string, def: () => Component, $store: Record<string, any>) => {
    if (!customElements.get(localName)) {
        customElements.define(localName, class extends HTMLElement implements ReactiveElement {
            $store = $store;
            #disconnected?: (() => void);
            #attributeChanged?: ((key:string, oldValue: any, newValue: any) => void);
            
            connectedCallback() {
                const { disconnected, attributeChanged } = def.apply(this) ?? { };
                this.#disconnected = disconnected.bind(this);
                this.#attributeChanged = attributeChanged.bind(this);
            }

            attributeChangedCallback(key:string, oldValue: any, newValue: any) {
                this.#attributeChanged?.(key, oldValue, newValue);
            }

            disconnectedCallback() {
                this.#disconnected?.();
            }
        });
    } else {
        throw new Error(`Custom Element with name ${localName} has already been defined.`);
    }
}

export { define };