import { effect } from '@vue/reactivity';
import type { $Store, ReactiveElement } from './types';
import { evaluate } from './utils';
import { bind } from './directives/bind';
import { html } from './directives/html';
import { show } from './directives/show';
import { text } from './directives/text';
import { model } from './directives/model';
import { xEffect } from './directives/effect';
import { on } from './directives/on';

/*
const xif = (el: HTMLElement, fullName:string, value:string, $store:Record<string, any>, context: ReactiveElement) => {
    effect(() => {
        // Do I want to mess with comments or do I want to just toggle display none
    })
}
*/

const textReplaceRegex = /\{\{([^]+?)\}\}/g;

export const createWalker = (context:ReactiveElement<typeof $store>, $store: $Store) => {
    const walker = document.createTreeWalker(context, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => [1,3,11].includes(node.nodeType) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
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
            let segments:string[] = [];
            let lastIndex = 0;
            for (const match of data.matchAll(textReplaceRegex)) {
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
    if (arg[0] === ':' || arg.match(/^x-bind:/)) {
        bind({ get, $el: $el as unknown as HTMLElement, arg, exp, effect, context, $store });
    }
    if (arg[0] === '@' || arg.match(/^x-on:/)) {
        on({ $el: $el as unknown as HTMLElement, arg, exp, $store, context, get, effect });
    }
    if (arg.match(/^x-if$/)) {

    }
    if (arg.match(/^x-model$/)) {
        model({ $el: $el as unknown as HTMLElement, arg, exp, $store, context, get, effect });
    }
    if (arg.match(/^x-show$/)) {
        show({ $el: $el as unknown as HTMLElement, arg, exp, context, get, $store, effect });
    }
    if (arg.match(/^x-text$/)) {
        text({ $el: $el as unknown as HTMLElement, get, arg, exp, $store, context, effect });
    }
    if (arg.match(/^x-effect$/)) {
        xEffect({ arg, exp, $store, effect, get, context, $el: $el as unknown as HTMLElement });
        // xEffect($el as HTMLElement, arg, exp, $store, context);
    }
    if (arg.match(/^x-html$/)) {
        html({ get, $el: $el as unknown as HTMLElement, arg, exp, effect, $store, context });
    }
}