---
title: Making your first element
description: Custom elements are meant to be a low level API, so lets lift it up a little
---

First, make sure your dependencies are installed. Kovaa is a lightweight framework which means we take great effort in making sure the final package is as small as possible!

Next, import `createApp` from `kovaa`.

```ts
import { createApp } from 'kovaa';

// Kovaa takes an app definition object which is a fancy name for an object
const app = createApp({

});
// technically you can call mount directly from createApp()
app.mount();
```

There now you have an "app", but it can't do much of anything. Unlike Petite Vue and AlpineJS, you can't do most of your work inside of the html templating.

```ts
const app = createApp({
    MyFirstElement() {
        console.log('constructed');
    }
})
```

There, you've made your first element! Go into your HTML and add it as `<my-first-element>` and check the console.

These types of custom elements are good for adding functionality to existing elements. You don't need to interface with them, they just sprinkle themselves over existing elements.

```html
<phone-formatter>
    <input type="tel" />
</phone-formatter>
<script type="module">
    import { createApp } from 'kovaa';
    import formatPhoneNumber from './your/formatting/functions.js';

    createApp({
        PhoneFormatter() {
            this.querySelector('input[type="tel"]').addEventListener('input', formatPhoneNumber);
        }
    }).mount();
</script>
```

But custom elements are more than that!