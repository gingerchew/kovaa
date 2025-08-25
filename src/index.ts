import { reactive, effect } from '@vue/reactivity';
import { define } from './define';
import { builtInDirectives } from './directives';
import { isFunction, isObject } from '@vue/shared';
import { toDisplayString } from './directives/text';
import type { Directive } from './types';
const createApp = (appObj: Record<string, any>) => {
    if (!isObject(appObj)) throw new Error('App definition must be an object');

    appObj.$s = toDisplayString
    return {
        mount() {


            Object.keys(appObj).forEach(key => {
                let localName = `${appObj.$prefix ? appObj.$prefix + '-' : ''}${key.replace(/(.)([A-Z])/g, '$1-$2')}`.toLowerCase();
                key[0] !== '$' &&
                    isFunction(appObj[key]) &&
                    key[0].toUpperCase() === key[0] &&
                    define(localName.indexOf('-') < 0 ? `x-${localName}` : localName, appObj[key], reactive(appObj))
            })
        },
        directive(key: string, dir:Directive) {
            builtInDirectives[key] = dir;
        }
    }
}

export {
    createApp,
    reactive,
    effect
}