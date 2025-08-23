import type { Directive } from ".";
import { isArray } from "@vue/shared";

export const model = ({ $el, get, exp, context, effect }: Directive<HTMLElement>) => {// (el: HTMLElement, _fullName: string, value:string, $store:Record<string, any>, context:ReactiveElement<typeof $store>) => {
    const assign = get(`(v) => { ${exp} = v }`);
    if ($el.tagName === 'SELECT') {
        const sel = $el as unknown as HTMLSelectElement;
        sel.addEventListener('change', () => {
            const selectedVal = Array.prototype.filter
                .call(sel.options, (o: HTMLOptionElement) => o.selected)
                .map((opt: HTMLOptionElement) => opt.value);
            
            assign(sel.multiple ? selectedVal : selectedVal[0]);
        });

        effect(() => {
            const val = context[exp];
            for (let i = 0;i < sel.options.length;i+=1) {
                if (import.meta.env.DEV && sel.multiple) {
                    console.warn('[multiple] attribute is not supported');
                    break;
                } else {
                    sel.options[i].selected = val === sel.options[i].value;
                }
            }
        })
    }
    if ($el.tagName === 'INPUT') {
        const input = $el as unknown as HTMLInputElement;
        if (input.type === 'checkbox') {
            input.addEventListener('change', () => {
                const checked = input.checked;
                if (isArray(context[exp])) {
                    const initial = [...context[exp]];
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
                const val = context[exp];
                if (isArray(val)) {
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
                const val = context[exp];
                if (oldValue !== val) {
                    input.checked = val === input.value;
                }
                oldValue = input.value;
            });
        } else {
            input.addEventListener('input', () => {
                assign(input.value);
            });

            effect(() => input.value = context[exp])
        }
    }
}
