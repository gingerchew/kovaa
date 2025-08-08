# Kovaa

A petite-vue like way to create custom elements to create reactive and interactive experiences on the web.

```js
import { createApp, effect } from 'kovaa';

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

## How do I react to changes in attributes?

Because `observedAttributes` is a `static` getter, we have to define the props we want to observe on the function definition.

```js
function MyButton() {
    this.addEventListener('click', () => {
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

Methods are added by adding them from the returned interface.

```js
createApp({
    HasMethods() {
        this.addEventListener('click', () => {
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


## TODO

- Have data scope work similar to petite-vue
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
- Stop using `$store`, make reactive properties available on `this`
- Directives on children (requires making a walk function)
```html
<button-group>
    <button @click="methodFoundOnButton">Click to do a thing</button>
    <button @click="methodThatNeedsAnArgument(3)">Click to do a different thing</button>
</button-group>
```
- Alternatives for v-if/else-if/else