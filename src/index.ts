import { reactive, effect } from '@vue/reactivity';
import { define } from './define';
import { $t, makeLocalName } from './utils';
import { toDisplayString } from './directives/text';

const createApp = (appObj: Record<string, any>) => {
    if ($t(appObj) !== 'Object') throw new Error('App definition must be an object');
    appObj.$s = toDisplayString
    const $store = reactive(appObj);

    return {
        mount() {
            const els = [];
            for (const [key, value] of Object.entries(appObj)) {
                if (key[0] !== '$' && typeof value === 'function' && key[0].toUpperCase() === key[0]) {
                    els.push([makeLocalName(key, appObj.$prefix), value]);
                }
            }
            els.forEach(([localName, def]) => define(localName, def, $store));
        }
    }
}

export {
    createApp,
    reactive,
    effect
}