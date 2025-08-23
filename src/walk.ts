import type { $Store, ReactiveElement } from './types';
import { evaluate } from './utils';
import { bind } from './directives/bind';
import { html } from './directives/html';
import { show } from './directives/show';
import { text } from './directives/text';
import { model } from './directives/model';
import { xEffect } from './directives/effect';
import { on } from './directives/on';
import { builtInDirectives } from './directives';

/*
const xif = (el: HTMLElement, fullName:string, value:string, $store:Record<string, any>, context: ReactiveElement) => {
    effect(() => {
        // Do I want to mess with comments or do I want to just toggle display none
    })
}
*/
const openingBracket = "{{";
const textReplaceRegex = /\{\{([^]+?)\}\}/g;

export const createWalker = (context:ReactiveElement<typeof $store>, $store: $Store) => {
    const walker = document.createTreeWalker(context, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => [1,3].includes(node.nodeType) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });
    let node = walker.currentNode!;
    do {
        if (node.nodeType === 1) {
            // if (isReactiveElement(node)) context = node as ReactiveElement<typeof $store>;
            for(const attr of (node as HTMLElement).attributes) {
                processDirective((node as HTMLElement), attr.name, attr.value, $store, context);
            }
        } else if (node.nodeType === 3) {
            const data = (node as Text).data;
            let segments:string[] = [], lastIndex = 0;
            // @TODO: There must be a way to not need this
            if (data.indexOf(openingBracket) < 0) continue;
            for (let match of data.matchAll(textReplaceRegex)) {
                const leading = data.slice(lastIndex, match.index);
                if (leading) segments.push(JSON.stringify(leading));
                segments.push(`$s(${match[1]})`);
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < data.length) {
                segments.push(data.slice(lastIndex));
            }
            processDirective(node, 'x-text', segments.join('+'), $store, context);
        }
    } while (node = walker.nextNode()!)

    return walker;
}

export const processDirective = ($el:HTMLElement|Node, arg:string, exp: string, $store: Record<string, any>, context:ReactiveElement<typeof $store>) => {
    const get = (e = exp) => evaluate(e, $store, $el, context);
    let dir;
    if (arg[0] === ':' || arg.match(/^x-bind:/)) dir = bind;
    if (arg[0] === '@' || arg.match(/^x-on:/)) dir = on;
    if (arg === 'x-model') dir = model;
    if (arg === 'x-show') dir = show;
    if (arg === 'x-text') dir = text;
    if (arg === 'x-effect') dir = xEffect;
    if (arg === 'x-html') dir = html;
    if (!dir && (arg = arg.split('x-')[1]) in builtInDirectives)  {
        dir = builtInDirectives[arg];
    }
    const cleanup = dir?.({ $el: $el as unknown as HTMLElement, arg, exp, $store, context, effect: context.effect.bind(context), get });
    if (cleanup) {
        context.cleanups.push(cleanup);
    }
}