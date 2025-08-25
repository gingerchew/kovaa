import type { $Store, ReactiveElement } from "./types";

// Adds stylesheets to the reactive element shadow root or to the page
export const css = (instance: ReactiveElement<$Store>) => 
    (css: string) => 
        (new CSSStyleSheet())
            .replace(css)
            .then(sheet => (instance.shadowRoot ?? document).adoptedStyleSheets.push(sheet));