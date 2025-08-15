import { effect } from '@vue/reactivity';
import type { ReactiveElement } from './types';
import { evaluate, toFunction, isReactiveElement } from './utils';

const walkChildren = (children: HTMLCollection, $store: Record<string, any>, context:ReactiveElement<typeof $store>) => {
    for (let i = 0;i< children.length;i+=1) {
        walk(children[i] as HTMLElement, $store, context);
    }
}

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

const text = (el:HTMLElement, _fullName:string, value:string, $store:Record<string, any>, context:ReactiveElement<typeof $store>) => {
    effect(() => {
        el.textContent = evaluate(`${value}`, $store, el, context);
    });
}

const html = (el:HTMLElement, _fullName:string, value:string, $store:Record<string, any>, context:ReactiveElement<typeof $store>) => {
    effect(() => {
        el.innerHTML = evaluate(`${value}`, $store, el, context);
    })
}

const processDirective = (el:HTMLElement, fullName:string, value: string, $store: Record<string, any>, context:ReactiveElement<typeof $store>) => {
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
    if (fullName.match(/^x-show$/)) {
        show(el, fullName, value, $store, context);
    }
    if (fullName.match(/^x-text$/)) {
        text(el, fullName, value, $store, context);
    }
    if (fullName.match(/^x-effect$/)) {
        xEffect(el, fullName, value, $store, context);
    }
    if (fullName.match(/^x-html$/)) {
        html(el, fullName, value, $store, context);
    }
}
const delimiters = ['{{', '}}'];
const delimitersRE = new RegExp((delimiters[0]+'([^]+?)'+delimiters[1]).replaceAll(/[\{\}]/g, '\\$&'), 'g');
const walk = (el:HTMLElement, $store: Record<string, any>, context?: ReactiveElement<typeof $store>) => {
    if (el.nodeType === 1) {
        // if you walk into another kovaa element, update the context
        if (!Object.is(el, context) && isReactiveElement(el)) {
            context = el as ReactiveElement<typeof $store>;
        }
        
        if (!context && isReactiveElement(el)) {
            context = el as ReactiveElement<typeof $store>;
        }
        // @TODO: this code appeases typescript, need to remove it eventually
        context = context as ReactiveElement<typeof $store>;
        for (const attr of el.attributes) {
            const { name, value } = attr;
            processDirective(el, name, value, $store, context);
        }
        walkChildren(el.children, $store, context);
    } else if (el.nodeType === 3) {
        // is text node
        const data = (el as unknown as Text).data;
        let segments = [];
        let lastIndex = 0;
        let match;
        while(match = delimitersRE.exec(data)) {
            const leading = data.slice(lastIndex, match.index);
            if (leading) segments.push(JSON.stringify(leading));
            segments.push(`$s(${match[1]})`)
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < data.length) {
            segments.push(data.slice(lastIndex));
        }
        processDirective(el, 'text', segments.join('+'), $store, context!);
    }


}

export { walk }