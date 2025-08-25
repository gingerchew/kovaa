import type { $Store, ReactiveElement } from "./types";

// Adds stylesheets to the reactive element shadow root or to the page
export function css(this: ReactiveElement<$Store>, css: string) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    (this.shadowRoot ?? document).adoptedStyleSheets.push(sheet);
}