import { reactive } from '@vue/reactivity';
import { define } from './define';
import { builtInDirectives } from './directives';
import { isFunction, isObject } from '@vue/shared';
import { toDisplayString } from './directives/text';
import type { Directive } from './types';
import { allDefinedEventName } from './utils';
import { notifier } from './define';
export { reactive, effect } from '@vue/reactivity';

export const createApp = (appObj: Record<string, any>) => {
    if (!isObject(appObj)) throw new Error('App definition must be an object');
    const $p = appObj.$prefix;
    appObj.$s = toDisplayString

    return {
        mount: async () => {
            const allDefined = Object.entries(appObj).map(([key, def]) => {
                key = `${$p ? $p + '-' : ''}${key.replace(/(.)([A-Z])/g, '$1-$2')}`.toLowerCase();
                if (key[0] !== '$' && isFunction(def) && key[0].toUpperCase() === key[0]) {
                    key = key.indexOf('-') < 0 ? `x-${key}` : key;
                    return define(key, def, reactive(appObj))
                }
            });
            await Promise.allSettled(allDefined);
            notifier.dispatchEvent(new CustomEvent(allDefinedEventName));
        },
        directive: (key: string, dir:Directive) => key in builtInDirectives ? builtInDirectives[key] : (builtInDirectives[key] = dir)
    }
}