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
    parseNode(walker.currentNode, $store, context);
    let node:Node|null = walker.currentNode;
    while (node = walker.nextNode()) {
        if (isReactiveElement(node) && !hasChanged(node, context)) {
            if (!walker.currentNode.nextSibling) {
                walker.parentNode();
            }
        } else {
            parseNode(node, $store, context);
        }
    }

    return walker;
}

export const processDirective = ($el: HTMLElement | Node, arg: string, exp: string, $store: Record<string, any>, context: ReactiveElement<typeof $store>) => {
    const get = (e = exp) => evaluate(e, $store, $el, context);
    const token = arg[0];
    let dir = (token === ':' || arg.match(/^x-bind:/)) ? bind :
        (token === '@' || arg.match(/^x-on:/)) ? on :
        builtInDirectives[arg.split('x-')[1]];
    
    const cleanup = dir?.({ $el: $el as unknown as HTMLElement, arg, exp, $store, context, effect: context.effect.bind(context), get });

    if (cleanup) {
        context.cleanups.push(cleanup);
    }
}