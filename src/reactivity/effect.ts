import { Signal } from "signal-polyfill";
import { $w } from "./watcher";
import type { Cleanup } from "../types";
import { isFunction } from "@vue/shared";

export function effect(callback: () => (Cleanup|void)) {
    let cleanup: Cleanup | undefined;

    const computed = new Signal.Computed(() => {
        isFunction(cleanup) && cleanup()
        const result = callback();
        if (result) {
            cleanup = result;
        }
    });

    $w.watch(computed);
    computed.get();

    return {
        computed,
        cleanup: () => {
            $w.unwatch(computed);
            typeof cleanup === "function" && cleanup();
            cleanup = undefined;
        }
    }
}