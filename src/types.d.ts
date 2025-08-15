type ReactiveElement<T> = {
    $store:T;
    #connected?: () => void;
    #disconnected?: () => void;
    #attributeChanged?: (key:string, oldValue: any, newValue: any) => void;
    ac: AbortController;
} & HTMLElement & {
    [Property in keyof T]: T[Property]
}

type ComponentDefinition = {
    props: string[]
}

interface Component {
    $tpl: null|string|HTMLTemplateElement|DocumentFragment;
    connected: () => void;
    disconnected: () => void;
    attributeChanged: (key: string, oldValue: any, newValue: any) => void;
}

type $Store = Record<string, any>;

type $listen = {
    <K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

type ComponentDefArgs<T extends Record<string, any>> = {
    $: ReturnType<typeof $>;
    $$: ReturnType<typeof $$>;
    $listen: $listen;
    $emit: (event: string, el?: HTMLElement) => boolean
} & {
    [Property in keyof T]: T[Property]
}

export { ReactiveElement, $Store, Component, ComponentDefinition, ComponentDefArgs }