import { reactive } from '@vue/reactivity';
import { define } from './define';
import { builtInDirectives } from './directives';
import { isFunction, isObject } from '@vue/shared';
import { toDisplayString } from './directives/text';
import type { Directive } from './types';
import { allDefinedEventName } from './utils';

export { reactive, effect } from '@vue/reactivity';

export const notifier = new EventTarget();

export const createApp = (appObj: Record<string, any>) => {
    if (!isObject(appObj)) throw new Error('App definition must be an object');
    const $p = appObj.$prefix;
    appObj.$s = toDisplayString

    return {
        mount: async () => {
            const allDefined = Object.entries(appObj).map(([key, def]) => {
                if (key[0] !== '$' && isFunction(def) && key[0].toUpperCase() === key[0]) {
                    let localName = `${$p ? $p + '-' : ''}${key.replace(/(.)([A-Z])/g, '$1-$2')}`.toLowerCase();
                    localName = localName.indexOf('-') < 0 ? `x-${localName}` : localName;
                    return define(localName, def, reactive(appObj))
                }
            });
            await Promise.allSettled(allDefined);
            notifier.dispatchEvent(new CustomEvent(allDefinedEventName));
        },
        directive: (key: string, dir:Directive) => key in builtInDirectives ? builtInDirectives[key] : (builtInDirectives[key] = dir)
    }
}