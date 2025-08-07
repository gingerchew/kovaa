import { reactive, effect } from '@vue/reactivity';
import { define } from './define';
import { $t } from './utils';

const createApp = (appObj: Record<string, any>) => {
    if ($t(appObj) !== 'Object') throw new Error('App definition must be an object');
    
    const $store = reactive(appObj);

    return {
        mount() {
            const els = [];
            for (const [key, value] of Object.entries($store)) {
                if (typeof value === 'function' && key[0].toUpperCase() === key[0]) {
                    let localName = key.replace(/(.)([A-Z])/g, '$1-$2').toLowerCase();
                    if (localName.indexOf('-') < 0) {
                        localName = `x-${localName}`;
                    }
                    els.push([localName, value]);
                }
            }

            els.forEach(([localName, def]) => {
                define(localName, def, $store);
            })
        }
    }
}

export {
    createApp,
    reactive,
    effect
}