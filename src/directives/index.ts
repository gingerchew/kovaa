import { effect } from "@vue/reactivity";
import type { $Store, ReactiveElement } from "../types";

import { html } from "./html";
import { bind } from "./bind";
import { text } from "./text";
import { show } from "./show";
import { model } from "./model";
import { on } from "./on";
import { xEffect } from "./effect";

export type Directive<T = HTMLElement> = (arg: DirectiveConfig<T>) => void|(() => void);

export interface DirectiveConfig<T> {
    get: (exp?: string) => any;
    exp: string;
    $store: $Store;
    arg?: string;
    $el:T;
    effect: typeof effect;
    context: ReactiveElement<$Store>
}


export const builtInDirectives:Record<string, Directive> = {
    html,
    bind,
    text,
    show,
    model,
    on,
    effect: xEffect,
}