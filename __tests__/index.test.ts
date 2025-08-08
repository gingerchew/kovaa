// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createApp, effect } from '../src/index';
import type { ReactiveElement } from '../src/types';

describe('@createApp', () => {
    it('should fail if the passed object is invalid', () => {
        
        // @ts-expect-error
        expect(() => createApp('test')).toThrowError('App definition must be an object');
        // @ts-expect-error
        expect(() => createApp(0)).toThrowError('App definition must be an object');
    });

    it('should produce an app object with the correct properties', () => {
        expect(createApp({})).toHaveProperty('mount');
    });

    it('should define custom elements if the key starts with a capital letter', () => {
        const app = createApp({
            Button() {},
            MyElement() {},
            reactiveProperty: 'Testing'
        });

        app.mount();

        expect(customElements.get('x-button')).not.toBe(undefined);
        expect(customElements.get('my-element')).not.toBe(undefined);
        expect(customElements.get('reactive-property')).toBe(undefined);
    });

    it('should update reactive properties through the tree', () => {
        document.body.innerHTML = `<x-el></x-el><x-btn></x-btn>`;

        const app = createApp({
            Btn() {
                this.addEventListener('click', () => {
                    this.$store.name = 'John'
                })
            },
            El() {},
            name: 'Jane',
        });

        app.mount();

        const el = document.querySelector<ReactiveElement>('x-el')!;
        const button = document.querySelector<ReactiveElement>('x-btn')!;

        expect(el.$store.name).toBe('Jane');
        expect(button.$store.name).toBe('Jane');
        button.click();
        expect(el.$store.name).toBe('John');
        expect(button.$store.name).toBe('John');
    });

    it('should run effects from inside component definitions', () => {
        document.body.innerHTML = `<x-comp></x-comp>`;

        let runner;

        const appDef = {
            i: 0,
            Comp() {
                runner = vi.fn(() => this.$store.i += 1);
                effect(runner);
            }
        }
        
        createApp(appDef).mount();

        expect(runner).toBeCalled();
    });

    it('should run attributeChanged callback', () => {
        document.body.innerHTML = `<attribute-changed></attribute-changed>`;
        
        const attributeChanged = vi.fn();
        
        function AttributeChanged() {
            return {
                attributeChanged
            }
        }
        AttributeChanged.props = ['test'];
        
        createApp({
            AttributeChanged
        }).mount();


        document.querySelector('attribute-changed')?.toggleAttribute('test');

        expect(attributeChanged).toBeCalled();
    });

    it('should run disconnected callback', () => {
        document.body.innerHTML = `<x-disconnected></x-disconnected>`;

        const disconnected = vi.fn();
        function Disconnected() {
            return { disconnected };
        }

        createApp({
            Disconnected
        }).mount();

        document.querySelector('x-disconnected')?.remove();

        expect(disconnected).toBeCalled();
    })

    it('should adopt methods and be accessible on the element', () => {
        document.body.innerHTML = '<has-methods></has-methods>'

        const testing = vi.fn();

        createApp({
            HasMethods() {
                return {
                    testing
                }
            }
        }).mount();

        // @ts-ignore
        document.querySelector('has-methods')?.testing();

        expect(testing).toBeCalled()
    })

    it('should handle prefixing', async () => {
        createApp({
            $prefix: 'prefix',
            Button() {}
        }).mount()
        
        expect(customElements.get('prefix-button')).not.toBe(undefined);
    })
});