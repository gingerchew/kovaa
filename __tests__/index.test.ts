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
    });

    it('should parse the x-scope attribute and be accessible in function',async () => {
        document.body.innerHTML = `<scope-parsing x-scope="{name:'Test'}"></scope-parsing>`
        let $scope;
        createApp({
            ScopeParsing(scope: Record<string, string>) {
                $scope = scope;
            }
        }).mount();

        await customElements.whenDefined('scope-parsing');

        expect($scope).toStrictEqual({ name: 'Test' });
    })

    it('should support bind directive', () => {
        document.body.innerHTML = `<bind-directive>
            <span x-bind:data-name="name"></span>
            <div :data-name="name"></div>
        </bind-directive>`

        createApp({
            name: 'Jill',
            BindDirective() {
                return {
                    changeName() {
                        this.$store.name = 'Jane';
                    }
                }
            }
        }).mount();

        const span = document.querySelector('span')!;
        const div = document.querySelector('div')!;
        
        expect(span.dataset.name).toBe('Jill');
        expect(div.dataset.name).toBe('Jill')
        // @ts-ignore
        span?.parentElement.changeName();
        expect(span.dataset.name).toBe('Jane');
        expect(div.dataset.name).toBe('Jane');
    });

    it('should support event listeners', () => {
        document.body.innerHTML = `<on-directive>
            <button @click="clickHandler"></button>
            <input @input="inputHandler" />
            <button class="global-button" @click="globalClickHandler"></button>
            <input class="global-input" @input="globalInputHandler" />
            <button class="inline-button" @click="$store.i += 1"></button>
        </on-directive>`

        const input = document.querySelector('input')!;
        const button = document.querySelector('button')!;
        const globalBtn = document.querySelector<HTMLButtonElement>('.global-button')!;
        const globalInput = document.querySelector('.global-input')!;
        const inlineBtn = document.querySelector<HTMLButtonElement>('.inline-button')!;

        const clickHandler = vi.fn();
        const inputHandler = vi.fn();
        const globalInputHandler = vi.fn();
        const globalClickHandler = vi.fn();
        let i = 0;
        createApp({
            set i(v) {
                i = v;
            },
            get i() {
                return i;
            },
            globalClickHandler,
            globalInputHandler,
            OnDirective() {
                return {
                    clickHandler,
                    inputHandler
                }
            }
        }).mount();

        input.dispatchEvent(new Event('input'));
        button.click();
        expect(clickHandler).toBeCalled();
        expect(inputHandler).toBeCalled();
        globalBtn.click();
        globalInput.dispatchEvent(new Event('input'));
        expect(globalClickHandler).toBeCalled();
        expect(globalInputHandler).toBeCalled();
        inlineBtn.click();
        expect(i).toBe(1);
    });

    it('should adopt innerHTML from template elements', () => {
        document.body.innerHTML = `<has-tpl></has-tpl><template id="tpl">true</template><has-tpl-child><template id="child">true</template></has-tpl-child>`;

        createApp({
            HasTpl() {
                return {
                    $tpl: '#tpl'
                }
            },
            HasTplChild() {
                return {
                    $tpl: '#child'
                }
            }
        }).mount();

        expect(document.querySelector('has-tpl')?.textContent).toBe('true');
        expect(document.querySelector('has-tpl-child')?.textContent).toBe('true');
    })

    it('should support inline html $tpl', () => {
        document.body.innerHTML = '<has-inline-html></has-inline-html><has-inline-text></has-inline-text>';

        createApp({
            HasInlineHtml() {
                return {
                    $tpl: '<span>true</span>'
                }
            },
            HasInlineText() {
                return {
                    $tpl: 'true'
                }
            }
        }).mount();

        expect(document.querySelector('has-inline-html')?.textContent).toBe('true');
        expect(document.querySelector('has-inline-html')?.children.length).toBe(1);
        expect(document.querySelector('has-inline-text')?.textContent).toBe('true');
    });

    it('should have access to $store in $tpl', () => {
        document.body.innerHTML = `<use-store-for-text></use-store-for-text><use-store-for-tpl></use-store-for-tpl><template id="test">true</template>`;

        createApp({
            tpl: '#test',
            text: 'true',
            UseStoreForText() {
                return {
                    $tpl: this.$store.text
                }
            },
            UseStoreForTpl() {
                return {
                    $tpl: this.$store.tpl
                }
            }
        }).mount();

        expect(document.querySelector('use-store-for-text')?.textContent).toBe('true');
        expect(document.querySelector('use-store-for-tpl')?.textContent).toBe('true');
    })
});