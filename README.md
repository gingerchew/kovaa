# Kovaa

A petite-vue like way to create custom elements to create reactive and interactive experiences on the web.

```js
import { createApp, effect } from 'kovaa';

createApp({
    name: 'Jane',
    Button({ $listen }) {
        $listen('click', () => {
            this.name = document.querySelector('input').value
        })
    },
    Output() {
        effect(() => {
            this.textContent = this.name;
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

## Differences between Petite-Vue and Kovaa

- Directives are not implemented yet
- Because it is built on web components, all elements are registered in the global scope. Duplicate names will lead to errors.
- Templating features like `{{variableName}}` are not included yet
- Scope works differently, and is not per component, but per `createApp`
```js
createApp({
    i: 0,
    Button({ $listen }) {
        $listen('click', () => this.i = Math.random());
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
        this.name = 'Jackson';
    }
})
```

## How to define a custom element?
Elements are defined by passing any function to the app object and starting it with a capital letter:
```js
createApp({
    thisIsAFunction() { ... },
    ThisIsAnElement() { ... },
    // <this-is-an-element>
})
```
If the component function is a single word like `Button` or `Input`, Kovaa will add a `x-` to the start of the element name, as seen in the first example.

The function runs in the `constructor` of the custom element, and returns an interface:
```ts
// If you use $listen
function MyButton({ $listen }) {
    $listen('click', console.log);

    return {
        attributeChanged() {...}
        connected() {...},
        disconnected() {
            this.removeEventListener('click', console.log);
        }
    }
}
```

## How do reactive properties work?
To make reactive properties easier, Kovaa uses `@vue/reactivity` as a familiar solution. We reexport `reactive` and `effect`, and anything in the app object will be added to the magic `$store` variable. `$store` is available inside component definitions within `this`, but anything in the `appObj` will be added and reactive to the custom elements.

```js
createApp({
    name: 'Jane',
    MyInput() {
        console.assert(this.name === this.$store.name); // true
    }
})
```

> **What is so magic about $store?** Nothing. The only thing magic about it is that it is included as a property in each element defined in the `createApp` function. They all point to the app object passed into the `createApp` function.

## How do I affect the DOM?

Because your functions are just custom elements, you can interact with the dom using `this` keyword for operations scoped to your element, or querying the dom directly using `document`.

## How do I react to changes in attributes?

Because `observedAttributes` is a `static` getter, we have to define the props we want to observe on the function definition.

```js
function MyButton({ $listen }) {
    $listen('click', () => {
        this.toggleAttribute('pressed');
    });

    return {
        attributeChanged(key, oldValue, newValue) {
            console.log('Is pressed?', newValue === '');
        }
    }
}
MyButton.props = ['pressed']

createApp({
    MyButton
}).mount();
```

When the custom element is defined, it will look if the `props` key is defined on the function and use that. When an attribute changes, it will use the `attributeChanged` method on the returned interface.

## How do I add methods to my custom element?

To mimic something like this:

```js
customElements.define('x-el', class extends HTMLElement {
    parsePhoneNumber() {...}
})
```

All you have to do is add the function to the returned interface. This will then be automatically bound to the element and added to the class.

```js
createApp({
    HasMethods({ $listen }) {
        $listen('click', () => {
            // methods from the returned object can be used in things like event listeners
            this.parsePhoneNumber();
        });

        return {
            parsePhoneNumber() {
                // ...
            }
        }
    },
    HasInternalMethods() {
        function doAThing() {
            // but if you want to use a function in the function body
            // you'll need to define it outside the returned object
        }
        // An effect for example would need the function 
        // defined outside the returned object
        effect(() => doAThing());
        return {
            doAThing
        }
    }
}).mount();
// Now the method is available 
document.querySelector('has-methods').parsePhoneNumber();
document.querySelector('has-internal-methods').doAThing();
```

## How do I prefix elements?

While you can prefix elements by just giving them a unique name, you might want to consolidate all your custom elements to a single app like this:

```js
createApp({
    $prefix: 'my',
    Button() { ... },
    Form() { ... },
    Input() { ... },
    SpecialElement() { ... }
}).mount();
// if no $prefix is defined and the element is a single word, x- will be used as a prefix
customElements.get('x-button') // undefined
customElements.get('my-button') // <my-button>
customElements.get('my-special-element') // <my-special-element>
```

> `customElements.get` will return the class that creates the element matching a given local name, not `<local-name>`.

## What if I want to get instance specific data to the element?

For this, use the `x-scope` attribute in your HTML.

```html
<my-element x-scope="{idx: 1}"></my-element>
<my-element x-scope="{idx: 2}"></my-element>
```

> Notice that we're not passing a JSON object, but a regular old JavaScript object. This means you can use things like `Map` and `Set` in your scope. Though, you probably wouldn't want to.

Then it will be available as the first argument of your function definition:

```js
function MyElement({ idx }) {
    console.log(idx);
}
```

This is useful for passing large amounts of server side generated data to an element:

```html
<employee-card x-scope="{{serverStringifiedJSONObject}}"></employee-card>
```

```js
createApp({
    EmployeeCard({
        fname,
        lname,
        formattedName,
        age,
        id,
        birthday,
        birthdayInMS,
        birthdayInS,
        daysUntilBirthday,
        hasBirthdayPassed
    }) {
        // ...
    }
}).mount();
```

On top of this, some utility functions are passed into the initial object:

```js
function MyButton({ $, $$, $listen, $emit, ...scope }) {
    const span = $('span'); // this.querySelector('span');
    const divArr = $$('div'); // HTMLDivElement[];
    // If you use $listen to listen for events, 
    // they are automatically cleaned up in
    // in the `disconnectedCallback` using
    // an `AbortController` signal
    $listen('click', () => ...);
    // dispatch events simply as needed
    $emit('click');
}
```

## How do I bind data to attributes? What about event listeners?

Kovaa supports the `:` symbol as a "bind" directive, as well as `x-bind:`, as well as `@` for event listeners.

```html
<bind-directive>
    <aside :data-open="isOpen"></aside>
    <button @click="$store.isOpen = !$store.isOpen">
</bind-directive>
```

```js
createApp({
    isOpen: false
    BindDirective() {},
}).mount();
```

Event listeners added with `@` or `x-on:` directives will be removed automatically in the `disconnectedCallback` automatically using an `AbortController` signal.

> Currently this requires an ElementDefinition to work. Unlike petite-vue where creating the app is enough to unlock reactive functionality.

Because Kovaa handles scope differently, you might find inline event handlers more powerful for the time being.

```html
<bind-directive>
    <a-child>
        <button @click="useMethod"></button>
    </a-child>
</bind-directive>
```

```js
createApp({
    BindDirective() {
        return {
            useMethod() {
                // do a thing
            }
        }
    },
    AChild() {
        return {};
    }
}).mount();
```

The example above will error. This is because the context/store that is being used on the button is the context from `<a-child>` not `<bind-directive>`.

> There are plans to fix this in the future, but it would require a deep knowledge of how scope works in petite-vue and finding a way to apply it to Kovaa.

## What other vue directives are supported?

Currently only `:`, `x-bind`, and `@` are supported. There are plans to continue to add directives in the future to mimic petite-vue's capabilities.

## What about custom directives?

Custom directives are not supported currently. This will likely come after all the existing petite-vue directives are added.


## TODO

- [ ] Have data scope work similar to petite-vue
```js
createApp({
    name: 'Jackson',
    NamePlate(scope) {
        const { name } = scope;
        return {
            name,
            method() {
                console.log(this.name); // should be the name from scope, not from app
            }
        }
    }
})
```
- [ ] Stop using `$store`, make reactive properties available on `this`
- [ ] Directives on children (requires making a walk function)
```html
<button-group>
    <button @click="methodFoundOnButton">Click to do a thing</button>
    <button @click="methodThatNeedsAnArgument(3)">Click to do a different thing</button>
</button-group>
```
- [ ] Alternatives for v-if/else-if/else