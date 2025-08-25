import type { $Store, ReactiveElement } from "./types";

// Adds stylesheets to the reactive element shadow root or to the page
export function css(this: ReactiveElement<$Store>, css: string) {
    const sheet = new window.CSSStyleSheet();
    sheet.replace(css).then(sheet => (this.shadowRoot ?? document).adoptedStyleSheets.push(sheet));
}