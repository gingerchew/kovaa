import { hasChanged, isFunction } from "@vue/shared";
import { Signal } from "signal-polyfill";
import { defineProp, isComponent } from "../utils";
import { $w } from "./watcher";

export const reactive = <T extends Record<string, any>>(data: T) => {
    const obj = Object.entries(data).reduce((acc, [K, V]) => {
        if (isComponent(K, V)) return acc;
        if (isFunction(V)) {
            acc[K] = V;
        } else {
            const s = new Signal.State(V);
            defineProp(acc, K, {
                get() {
                    return s.get()
                },
                set(v: typeof V) {
                    s.set(v);
                }
            });
            $w.watch(s)
        }

        return acc;
    }, {} as Record<string, any>);

    const prox = new Proxy(obj, {
        get(target, key:string) {
            typeof key !== 'symbol' && console.log(`Reading ${key}`)
            return key in target ? target[key] : null;
        },
        set(target, key:string, value: unknown) {
            console.log(`Writing ${key} to ${value}`)
            if (import.meta.env.DEV && isFunction(target[key])) {
                console.warn('Cannot overwrite a function value');
            }
            if (hasChanged(target[key], value)) target[key] = value;
            return true;
        }
    });

    return prox;
}