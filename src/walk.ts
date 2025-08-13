import { effect } from '@vue/reactivity';
import type { ReactiveElement } from './types';
import { evaluate, toFunction } from './utils';

export const KOVAA_SYMBOL = Symbol()

const walkChildren = (children: HTMLCollection, $store: Record<string, any>, context:ReactiveElement) => {
    for (let i = 0;i< children.length;i+=1) {
        walk(children[i] as HTMLElement, $store, context);
    }
}

const bind = (el: HTMLElement, attrName: string, value: string, $store: Record<string, any>) => {
    effect(() => el.setAttribute(attrName, $store[value]));
}

const on = (el: HTMLElement, eventName: string, methodOrFunction: string, $store: Record<string, any>, context:ReactiveElement) => {
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

const model = (el: HTMLElement, _fullName: string, value:string, $store:Record<string, any>, context:ReactiveElement) => {
    const assign = evaluate(`(val) => $store.${value} = val`, $store, el, context);
    if (el.localName === 'select') {
        const sel = el as HTMLSelectElement;
        sel.addEventListener('change', () => {
            const selectedVal = Array.prototype.filter
                .call(sel.options, (o: HTMLOptionElement) => o.selected)
                .map((opt: HTMLOptionElement) => opt.value);
            
            assign(sel.multiple ? selectedVal : selectedVal[0]);
        });

        effect(() => {
            const val = $store[value];
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
                if (Array.isArray($store[value])) {
                    const initial = [...$store[value]];
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
                const val = $store[value];
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
                const val = $store[value];
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
                input.value = $store[value];
            })
        }
    }
}

const processDirective = (el:HTMLElement, fullName:string, value: string, $store: Record<string, any>, context:ReactiveElement) => {
    if (fullName[0] === ':' || fullName.match(/^x-bind:/)) {
        bind(el, fullName.split(':')[1], value, $store);
    }
    if (fullName[0] === '@' || fullName.match(/^x-on:/)) {
        on(el, fullName.split(/@|:/)[1], value, $store, context);
    }
    if (fullName.match(/^x-if$/)) {

    }
    if (fullName.match(/^x-model$/)) {
        model(el, fullName, value, $store, context);
    }
}

const isReactiveElement = (el:unknown): el is ReactiveElement => el instanceof HTMLElement && KOVAA_SYMBOL in el;

const walk = (el:HTMLElement, $store: Record<string, any>, context?: ReactiveElement) => {
    if (el.nodeType !== 1) return;
    
    // if you walk into another kovaa element, update the context
    if (!Object.is(el, context) && isReactiveElement(el)) {
        context = el;
    }
    
    if (!context && isReactiveElement(el)) {
        context = el;
    }
    // @TODO: this code appeases typescript, need to remove it eventually
    context = context as ReactiveElement;
    for (const attr of el.attributes) {
        const { name, value } = attr;
        processDirective(el, name, value, $store, context);
    }
    walkChildren(el.children, $store, context);
}

export { walk }