import type { ReactiveElement } from "./types";

interface Component {
    disconnected: () => void;
}

const define = (localName:string, def: () => Component, $store: Record<string, any>) => {
    customElements.define(localName, class extends HTMLElement implements ReactiveElement {
        $store = $store;
        disconnected?: (() => void);
        connectedCallback() {
            const { disconnected } = def.apply(this) ?? { };
            this.disconnected = disconnected;
        }
        disconnectedCallback() {
            this.disconnected?.();
        }
    });
}

export { define };