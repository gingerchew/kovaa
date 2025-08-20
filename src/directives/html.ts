import type { Directive } from ".";

// el:HTMLElement, _fullName:string, value:string, $store:Record<string, any>, context:ReactiveElement<typeof $store>)
export const html = ({ get, $el, effect }: Directive<HTMLElement>) =>  {
    effect(() => {
        $el.innerHTML = get();
    })
}