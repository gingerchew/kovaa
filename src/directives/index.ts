import type { Directive } from "../types";
import { html } from "./html";
import { bind } from "./bind";
import { text } from "./text";
import { show } from "./show";
import { model } from "./model";
import { on } from "./on";
import { xEffect } from "./effect";

export const builtInDirectives:Record<string, Directive> = {
    html,
    bind,
    text,
    show,
    model,
    on,
    effect: xEffect,
}