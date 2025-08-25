import type { $Store, ReactiveElement } from './types';
import { evaluate, isReactiveElement } from './utils';
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

const parseNode = (node: Node, $store: $Store, context: ReactiveElement<typeof $store>) => {
    if (node.nodeType === 1) {
        // it seems reactive elements are sometimes read as 
        // plain HTMLElements thus not updating the context
        // particularly this is for cases like two reactive elements
        // next to each other
        // console.log(node, node === context, isReactiveElement(node), (node as HTMLElement).localName);
        // console.log(node, node === context);
        const el = node as HTMLElement;
        for (const attr of el.attributes) {
            const { name, value } = attr;
            console.log({ name, value })
            // Don't bother processing attributes that aren't directives
            if (attr.name.match(/(x-)|:|@/)) {
                processDirective(el, attr.name, attr.value, $store, context);
                el.removeAttribute(attr.name)
            }
        }
    } else if (node.nodeType === 3 && (node as Text).data.indexOf(openingBracket) > -1) {
        const data = (node as Text).data;
        let segments: string[] = [], lastIndex = 0;
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
}

export const createWalker = (context: ReactiveElement<typeof $store>, $store: $Store) => {
    const walker = document.createTreeWalker(context, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => [1, 3].includes(node.nodeType) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });
    let node:Node|null = walker.currentNode;
    while (node) {
        try {
            if (!Object.is(node, context) && isReactiveElement(node)) continue;
    
            parseNode(node, $store, context);
        } finally {
            node = walker.nextNode();
        }
    }

    return walker;
}

export const processDirective = ($el: HTMLElement | Node, arg: string, exp: string, $store: Record<string, any>, context: ReactiveElement<typeof $store>) => {
    const get = (e = exp) => evaluate(e, $store, $el, context);
    let dir;
    const token = arg[0];
    if (token === ':') dir = bind;
    if (token === '@') dir = on;
    if (arg.match(/^x-bind:/)) dir = bind;
    if (arg.match(/^x-on:/)) dir = on;
    if (arg === 'x-model') dir = model;
    if (arg === 'x-show') dir = show;
    if (arg === 'x-text') dir = text;
    if (arg === 'x-effect') dir = xEffect;
    if (arg === 'x-html') dir = html;
    if (!dir && (arg = arg.split('x-')[1]) in builtInDirectives) {
        dir = builtInDirectives[arg];
    }

    const cleanup = dir?.({ $el: $el as unknown as HTMLElement, arg, exp, $store, context, effect: context.effect.bind(context), get });

    if (cleanup) {
        context.cleanups.push(cleanup);
    }
}