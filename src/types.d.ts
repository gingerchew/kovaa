
import { effect } from "@preact/signals-core";

export type Cleanup = ReturnType<EffectFn>

export type EffectResult = {
    cleanup: Cleanup;
    computed: Signal.Computed
}

export type ReactiveElement<T> = {
    $store:T;
    _parentContext?: ReactiveElement<$Store>
    #connected?: () => void;
    #disconnected?: () => void;
    #attributeChanged?: (key:string, oldValue: any, newValue: any) => void;
    _ac: AbortController;
    _cleanups: Cleanup[];
    effect: (fn: EffectFn) => Cleanup;
} & HTMLElement & {
    [Property in keyof T]: T[Property]
}

export type ComponentDefinition = ((componentDefArgs:ComponentDefArgs) => Component) & {
    $attrs: string[]
}

export interface Component {
    $tpl: null|string|HTMLTemplateElement|DocumentFragment;
    connected: () => void;
    disconnected: () => void;
    attributeChanged: (key: string, oldValue: any, newValue: any) => void;
}

export type $Store = Record<string, any>;

export type $listen = {
    <K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export type ComponentDefArgs<T extends Record<string, any>> = {
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
    effect: ReactiveElement<$Store>['effect'];
    exp: string;
    $store: $Store;
    arg?: string;
    $el:T;
    context: ReactiveElement<$Store>
}


export type EffectFn = Parameters<typeof effect>[0];