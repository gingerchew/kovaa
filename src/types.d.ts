import type { ReactiveEffectRunner } from "@vue/reactivity";

type Cleanup = () => void;

type ReactiveElement<T> = {
    $store:T;
    _parentContext?: ReactiveElement<$Store>
    #connected?: () => void;
    #disconnected?: () => void;
    #attributeChanged?: (key:string, oldValue: any, newValue: any) => void;
    _ac: AbortController;
    _effects: ReactiveEffectRunner[];
    _cleanups: Cleanup[];
} & HTMLElement & {
    [Property in keyof T]: T[Property]
}

type ComponentDefinition = {
    $attrs: string[]
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


export type Directive<T = HTMLElement> = (arg: DirectiveConfig<T>) => void|Cleanup;

export interface DirectiveConfig<T> {
    get: (exp?: string) => any;
    exp: string;
    $store: $Store;
    arg?: string;
    $el:T;
    effect: typeof effect;
    context: ReactiveElement<$Store>
}


export { ReactiveElement, $Store, Component, ComponentDefinition, ComponentDefArgs }