import { effect } from '@vue/reactivity';
import type { $Store, ReactiveElement } from './types';
import { evaluate, isReactiveElement, toFunction } from './utils';

const bind = (el: HTMLElement, attrName: string, value: string, $store: Record<string, any>) => {
    effect(() => el.setAttribute(attrName, $store[value]));
}

const on = (el: HTMLElement, eventName: string, methodOrFunction: string, $store: Record<string, any>, context:ReactiveElement<typeof $store>) => {
    // @ts-ignore
    const handler = methodOrFunction in context && typeof context[methodOrFunction] === 'function' ? 
        // @ts-ignore
        context[methodOrFunction].bind(context) : 
        methodOrFunction in $store ?
        $store[methodOrFunction].bind(context) :
        () => toFunction(methodOrFunction)($store, context, el);

    // Use the abort controller from the context to clear it when the context element is removed
    el.addEventListener(eventName, handler, { signal: context.ac.signal })
}
/*
const xif = (el: HTMLElement, fullName:string, value:string, $store:Record<string, any>, context: ReactiveElement) => {
    effect(() => {
        // Do I want to mess with comments or do I want to just toggle display none
    })
}
*/

const xEffect = (el: HTMLElement, _fullName: string, func: string, $store:Record<string, any>, context:ReactiveElement<typeof $store>) => {
    // Evaluating the function like this works because of with($store) 
    // might need to get this to work instead using with($context) to
    // make pull from the reactive element instead
    effect(evaluate(`() => ${func}()`, $store, el, context));
}

const model = (el: HTMLElement, _fullName: string, value:string, $store:Record<string, any>, context:ReactiveElement<typeof $store>) => {
    const assign = evaluate(`(val) => ${value} = val`, $store, el, context);
    if (el.localName === 'select') {
        const sel = el as HTMLSelectElement;
        sel.addEventListener('change', () => {
            const selectedVal = Array.prototype.filter
                .call(sel.options, (o: HTMLOptionElement) => o.selected)
                .map((opt: HTMLOptionElement) => opt.value);
            
            assign(sel.multiple ? selectedVal : selectedVal[0]);
        });

        effect(() => {
            const val = context[value];
            for (let i = 0;i < sel.options.length;i+=1) {
                if (sel.multiple) {
                    console.warn('[multiple] attribute is not supported');
                    break;
                } else {
                    sel.options[i].selected = val === sel.options[i].value;
                }
            }
        })
    }
    if (el.localName === 'input') {
        const input = el as HTMLInputElement;
        if (input.type === 'checkbox') {
            input.addEventListener('change', () => {
                const checked = input.checked;
                if (Array.isArray(context[value])) {
                    const initial = [...context[value]];
                    const index = initial.indexOf(input.value);
                    const found = index > -1;
                    if (!checked && found) {
                        assign(initial.slice(index, 1))
                    } else if (checked && !found) {
                        assign(initial.concat(input.value));
                    }
                } else {
                    checked && assign(input.value);
                }
            });

            let oldValue:any;
            effect(() => {
                const val = context[value];
                if (Array.isArray(val)) {
                    input.checked = val.indexOf(input.value) > -1
                } else if (val !== oldValue) {
                    input.checked = val === input.value;
                }
                oldValue = input.value
            });
        } else if (input.type === 'radio') {
            input.addEventListener('change', () => {
                assign(input.value);
            });

            let oldValue:any;
            effect(() => {
                const val = context[value];
                if (oldValue !== val) {
                    input.checked = val === input.value;
                }
                oldValue = input.value;
            });
        } else {
            input.addEventListener('input', () => {
                assign(input.value);
            });

            effect(() => {
                input.value = context[value];
            })
        }
    }
}

const show = (el:HTMLElement, _fullName:string, value:string, $store:Record<string, any>, context: ReactiveElement<typeof $store>) => {
    let initial = el.style.display;
    effect(() => {
        el.style.display = context[value] ? initial : 'none';
    })
}

const text = (el:HTMLElement|Node, _fullName:string, value:string, $store:Record<string, any>, context:ReactiveElement<typeof $store>) => {
    effect(() => {
        el.textContent = evaluate(value, $store, el as HTMLElement, context);
    });
}

export const toDisplayString = (str:unknown) => 
    str == null ? ''
        : str !== null && typeof str === 'object' ?
            JSON.stringify(str)
        : String(str);

const html = (el:HTMLElement, _fullName:string, value:string, $store:Record<string, any>, context:ReactiveElement<typeof $store>) => {
    effect(() => {
        el.innerHTML = evaluate(value, $store, el, context);
    })
}


const textReplaceRegex = /\{\{([^]+?)\}\}/g;

export const createWalker = (el:ReactiveElement<typeof $store>, $store: $Store) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            switch(node.nodeType) {
                case 1:
                case 3:
                case 11:
                    return NodeFilter.FILTER_ACCEPT
                default:
                    return NodeFilter.FILTER_SKIP
            }
        },
    });
    let context = el;
    let node = walker.currentNode!;
    do {
        if (node.nodeType === 1) {
            if (isReactiveElement(node)) context = node as ReactiveElement<typeof $store>;
            const el = node as HTMLElement;
            for(const attr of el.attributes) {
                const { name, value } = attr;
                
                processDirective(el, name, value, $store, context);
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

export const processDirective = (el:HTMLElement|Node, fullName:string, value: string, $store: Record<string, any>, context:ReactiveElement<typeof $store>) => {
    if (fullName[0] === ':' || fullName.match(/^x-bind:/)) {
        bind(el as HTMLElement, fullName.split(':')[1], value, $store);
    }
    if (fullName[0] === '@' || fullName.match(/^x-on:/)) {
        on(el as HTMLElement, fullName.split(/@|:/)[1], value, $store, context);
    }
    if (fullName.match(/^x-if$/)) {

    }
    if (fullName.match(/^x-model$/)) {
        model(el as HTMLElement, fullName, value, $store, context);
    }
    if (fullName.match(/^x-show$/)) {
        show(el as HTMLElement, fullName, value, $store, context);
    }
    if (fullName.match(/^x-text$/)) {
        text(el, fullName, value, $store, context);
    }
    if (fullName.match(/^x-effect$/)) {
        xEffect(el as HTMLElement, fullName, value, $store, context);
    }
    if (fullName.match(/^x-html$/)) {
        html(el as HTMLElement, fullName, value, $store, context);
    }
}