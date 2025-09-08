import { Signal } from "signal-polyfill";

let needsEnqueue = true;

const $w = new Signal.subtle.Watcher(() => {
    if (needsEnqueue) {
        needsEnqueue = false;
        queueMicrotask(processPending);
    }
});

function processPending() {
    needsEnqueue = true;

    for (const s of $w.getPending()) {
        s.get();
    }
    
    $w.watch();
}

export { $w }