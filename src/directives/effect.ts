import type { Directive } from ".";

export const xEffect:Directive = ({ get, exp, effect }) => {
    // Evaluating the function like this works because of with($store) 
    // might need to get this to work instead using with($context) to
    // make pull from the reactive element instead
    effect(get(exp));
}