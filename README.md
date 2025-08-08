# GRWCF (Working Title)

A petite-vue like way to create custom elements to create reactive and interactive experiences on the web.

```js
import { createApp, effect } from 'grwcf';

createApp({
    name: 'Jane',
    Button() {
        this.addEventListener('click', () => {
            this.$store.name = document.querySelector('input').value
        })
    },
    Output() {
        effect(() => {
            this.textContent = this.$store.name;
        })
    }
}).mount();
```

```html
<label>Enter new name here</label>
<input id="name" />
<x-button>
    Update name
</x-button>
<x-output></x-output>
```

## Differences between Petite-Vue and GRWCF

- Directives are not implemented yet
- Because it is built on web components, all elements are registered in the global scope. Duplicate names will lead to errors.
- Templating features like `{{variableName}}` are not included yet
- Scope works differently, and is not per component, but per `createApp`
```js
createApp({
    i: 0,
    Button() {
        this.addEventListener('click', () => this.$store.i = Math.random());
    }
}).mount(); // This defines an `x-button` custom element that will set the i property to a random number between 0 and 1 when clicked
createApp({
    i: 0,
}).mount(); // This will be unaffected by the button above
```
- A property in the app definition cannot be retrieved on the `this` object, and is instead copied to the magic `$store` property.
```js
createApp({
    name: 'Jill',
    ExampleElement() {
        // Updating this store will update it above
        this.$store.name = 'Jackson';
    }
})
```


## How to define a custom element?
Elements are any function passed to the app object that start with a capital letter:
```js
createApp({
    thisIsAFunction() { ... },
    ThisIsAnElement() { ... },
    // <this-is-an-element>
})
```
If the component function is a single word like `Button` or `Input`, GRWCF will add a `x-` to the start of the element name, as seen in the first example.

The function runs in the `connectedCallback` of the custom element, and returns an interface:
```ts
function MyButton() {
    this.addEventListener('click', console.log);

    return {
        disconnected() {
            this.removeEventListener('click', console.log);
        }
    }
}
```
Currently the returned interface has little going on. It will be expanded to be more useful as the library develops.

## How do reactive properties work?
To make reactive properties easier, GRWCF uses `@vue/reactivity` as a familiar solution. We reexport `reactive` and `effect`, and anything in the app object will be added to the magic `$store` variable.

> **What is so magic about $store?** Nothing. The only thing magic about it is that it is included as a property in each element defined in the `createApp` function.

## How do I affect the DOM?

Because your functions are just custom elements, you can interact with the dom using `this` keyword for operations scoped to your element, or querying the dom directly using `document`.