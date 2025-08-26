import type { $Store, ReactiveElement } from './types';
import { evaluate, isReactiveElement } from './utils';
import { bind } from './directives/bind';
import { on } from './directives/on';
import { builtInDirectives } from './directives';
import { hasChanged } from '@vue/shared';

/*
const xif = (el: HTMLElement, fullName:string, value:string, $store:Record<string, any>, context: ReactiveElement) => {
    effect(() => {
        // Do I want to mess with comments or do I want to just toggle display none
    })
}
*/
const openingBracket = "{{";
const textReplaceRegex = /\{\{([^]+?)\}\}/g;

const parseNode = <T extends $Store>(node: Node, $store: T, context: ReactiveElement<T>) => {
    if (node.nodeType === 1) {
        for (const attr of (node as HTMLElement).attributes) {
            // Don't bother processing attributes that aren't directives
            if (attr.name.match(/^(x-)|:|@/)) {
                processDirective(node as HTMLElement, attr.name, attr.value, $store, context);
                (node as HTMLElement).removeAttribute(attr.name)
            }
        }
    } else {
        const data = (node as Text).data;
        if (data.indexOf(openingBracket) < 0) return node;
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
    return node;
}

export const createWalker = <T extends $Store>(context: ReactiveElement<T>, $store: T) => {
    const walker = document.createTreeWalker(context, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => [1,3].includes(node.nodeType) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });

    let node: Node | null = parseNode(walker.currentNode, $store, context);

    do {
        if (isReactiveElement(node) && hasChanged(node, context)) {
            node = walker.nextSibling() ?? walker.parentNode();
        }

        parseNode(node!, $store, context);
    } while (node = walker.nextNode())
}

const processDirective = ($el: HTMLElement | Node, arg: string, exp: string, $store: Record<string, any>, context: ReactiveElement<typeof $store>) => {
    const get = (e = exp) => evaluate(e, $store, $el, context), 
        effect = context.effect.bind(context), 
        [token] = arg,
        dir = (token === ':' || arg.match(/^x-bind:/)) ? bind :
            (token === '@' || arg.match(/^x-on:/)) ? on :
                builtInDirectives[arg.split('x-')[1]],
        cleanup = dir?.({ $el: $el as unknown as HTMLElement, arg, exp, $store, context, effect, get });

    if (cleanup) {
        context._cleanups.push(cleanup);
    }
}