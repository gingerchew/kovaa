import { reactive, effect } from '@vue/reactivity';
import { define } from './define';
import { builtInDirectives, type Directive } from './directives';
import { $t, makeLocalName } from './utils';
import { toDisplayString } from './directives/text';

const createApp = (appObj: Record<string, any>) => {
    if ($t(appObj) !== 'Object' && import.meta.env.DEV) throw new Error('App definition must be an object');
    appObj.$s = toDisplayString

    return {
        mount() {
            Object.keys(appObj).forEach(key => key[0] !== '$' &&
                typeof appObj[key] === 'function' &&
                key[0].toUpperCase() === key[0] &&
                    define(makeLocalName(key, appObj.$prefix), appObj[key], reactive(appObj)))
        },
        directive(key: string, dir: (config: Directive<HTMLElement>) => void) {
            builtInDirectives[key] = dir;
        }
    }
}

export {
    createApp,
    reactive,
    effect
}