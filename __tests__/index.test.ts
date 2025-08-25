// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createApp, effect, reactive } from '../src/index';
import type { $Store, ReactiveElement } from '../src/types';

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
            Btn({ $listen }) {
                $listen('click', () => {
                    this.name = 'John'
                })
            },
            El() {},
            name: 'Jane',
        });

        app.mount();

        const el = document.querySelector<ReactiveElement<{ name: string }>>('x-el')!;
        const button = document.querySelector<ReactiveElement<{name:string}>>('x-btn')!;

        expect(el.name).toBe('Jane');
        expect(button.name).toBe('Jane');
        button.click();
        expect(el.name).toBe('John');
        expect(button.name).toBe('John');
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
        AttributeChanged.$attrs = ['test'];
        
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
            ScopeParsing({ name }: Record<string, string>) {
                
                
                $scope = { name };
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
                        this.name = 'Jane';
                    }
                }
            }
        }).mount();

        const el = document.querySelector<ReactiveElement<{ name: string }>>('bind-directive')!;
        const span = document.querySelector('span')!;
        const div = document.querySelector('div')!;
        
        expect(span.dataset.name).toBe(el.name);
        expect(div.dataset.name).toBe(el.name)
        // @ts-ignore
        el.changeName();
        expect(span.dataset.name).toBe(el.name);
        expect(div.dataset.name).toBe(el.name);
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
    });


    /**
     * Need to figure out how to adjust scoping so that the store inside of the individual components
     * does not cross pollute.
     * 
     * Need to think on this
     * 
     * Currently it is pointless, I should research how petite-vue scope works a little more carefully
     */
    it.todo('should maintain proper context across elements', () => {
        document.body.innerHTML = `<parent-el x-scope="{name:'Jane'}">
            <child-el x-scope="{name:'Jill'}">
                <span :data-name="name"></span>
            </child-el>
            <div :data-name="name"></span>
        </parent-el>`;

        createApp({
            ParentEl({ name }) {
                this.name = name;
            },
            ChildEl({ name }) {
                this.name = name;
            },
        }).mount();

        const span = document.querySelector('span')!;
        const div = document.querySelector('div')!;
        expect(div.dataset.name).toBe('Jane');
        expect(span.dataset.name).toBe('Jill');
    });

    it('should model select elements', () => {
        document.body.innerHTML = `<select-wrapper :data-name="fname">
            <select x-model="fname">
                <option>Jane</option>
                <option>Jill</option>
            </select>
        </select-wrapper>`

        createApp({
            fname: 'Jill',
            SelectWrapper({ $emit, $ }) {
                
                return {
                    updateChoice() {
                        $('select').value = 'Jane'
                        // Have to mimic the change actually happening
                        $emit('change', $('select'));
                    }
                }
            }
        }).mount();

        const wrapper = document.querySelector('select-wrapper')!;
        expect(wrapper.getAttribute('data-name')).toBe('Jill');
        // @ts-ignore
        wrapper.updateChoice();
        
        expect(wrapper.getAttribute('data-name')).toBe('Jane');
    });

    it('should model input elements', () => {
        document.body.innerHTML = `<input-wrapper>
            <input x-model="name" />
        </input-wrapper>`

        let name = '';

        createApp({
            name: 'Jill',
            InputWrapper({ $listen, $emit, $ }) {
                effect(() => {
                    name = this.name;
                });
                $listen('click', () => {
                    $('input').value = 'Jane';
                    $emit('input', $('input'))
                });
            }
        }).mount();

        expect(name).toBe('Jill');
        // @ts-ignore
        document.querySelector('input-wrapper')!.click();
        expect(name).toBe('Jane');
    });
    // @TODO: Make sure this supports individual values as well
    // @TODO: Make sure this isn't as rigid
    it('should model checkbox inputs', () => {
        document.body.innerHTML = `<checkbox-wrapper>
            <input type="checkbox" name="check" value="1" x-model="check">
            <input type="checkbox" name="check" value="2" x-model="check">
            <input type="checkbox" name="check" value="3" x-model="check">
        </checkbox-wrapper>`;

        let check = [];

        createApp({
            check: [],
            CheckboxWrapper({ $listen, $emit, $ }) {
                effect(() => check = this.check);
                $listen('click', () => {
                    const secondCheck = $('[value="2"]')!;
                    secondCheck.checked = true;
                    $emit('change', secondCheck);
                });
            }
        }).mount();

        expect(check.length).toBe(0);
        // @ts-ignore
        document.querySelector('checkbox-wrapper')!.click();
        expect(check.length).toBe(1);
    });

    it('should model radio inputs', () => {
        document.body.innerHTML = `<radio-wrapper>
            <input type="radio" value="1" x-model="radio" selected />
            <input type="radio" value="2" x-model="radio" />
        </radio-wrapper>`;

        let radio:string = '1';

        createApp({
            radio,
            RadioWrapper() {
                this.addEventListener('click', () => {
                    this.querySelector('input:last-child')?.click();
                });
                return {
                    connected() {
                        effect(() => radio = this.radio);
                    }
                }
            }
        }).mount();

        expect(radio).toBe('1');
        // @ts-ignore
        document.querySelector('radio-wrapper')?.click();
        expect(radio).toBe('2');
    });

    it('should toggle display with show directive', () => {
        document.body.innerHTML = `<show-directive>
            <div class="false" x-show="startsFalse"></div>
            <div class="true" x-show="startsTrue" style="display: flex;"></div>
        </show-directive>`

        createApp({
            startsFalse: false,
            startsTrue: true,
            ShowDirective() {
                this.addEventListener('click', () => {
                    this.startsFalse = true;
                    this.startsTrue = false;
                });
            }
        }).mount();
        const f = document.querySelector<HTMLDivElement>('.false');
        const t = document.querySelector<HTMLDivElement>('.true');
        expect(f!.style.display).toBe('none');
        expect(t!.style.display).toBe('flex');
        // @ts-ignore
        document.querySelector('show-directive')?.click();
        expect(f?.style.display).toBe('');
        expect(t!.style.display).toBe('none');
    });

    it('should add text with x-text directive', () => {
        document.body.innerHTML = `<x-text>
            <div class="inline" x-text="'true'"></div>
            <div class="from-store" x-text="username"></div>
        </x-text>`

        const fromStore = document.querySelector<HTMLDivElement>('.from-store')!;
        const inline = document.querySelector<HTMLDivElement>('.inline')!;

        createApp({
            username: "Jane",
            Text() {}
        }).mount();

        expect(inline.textContent).toBe('true');
        expect(fromStore.textContent).toBe('Jane');
    });

    it('should run effects from directives', () => {
        const fn = vi.fn();
        document.body.innerHTML = `<effect-directive x-effect="fn"></effect-directive>`;

        createApp({
            fn,
            EffectDirective() {}
        }).mount();

        expect(fn).toBeCalled();
    });

    it('should run x-html directive', () => {
        document.body.innerHTML = `<html-directive x-html="'<div></div>'"></html-directive><html-child>
            <span x-html="testing"></span>
        </html-child>`;

        createApp({
            testing: '<div id="exists"></div>',
            HtmlDirective() {

            },
            HtmlChild() {

            }
        }).mount();
        const htmlDirective = document.querySelector('html-directive')!;
        const htmlChild = document.querySelector('html-child');
        
        expect(document.getElementById('exists')).not.toBe(null)
        expect(htmlDirective.children.length).toBe(1);
    });

    it('should have simple text templating', () => {
        document.body.innerHTML = `<tpl-inline>{{name}}</tpl-inline>`;
        createApp({
            name: 'Test',
            TplInline() {}
        }).mount();
        expect(document.body.children[0].textContent).toBe('Test');
    });

    it('should support custom directives', () => {
        document.body.innerHTML = `<x-test>
            <span x-test="1"></span>
        </x-test>`
        const fn = vi.fn();
        const app = createApp({
            Test() {}
        });

        app.directive('test', fn);
        app.mount();

        expect(fn).toBeCalled();
    });

    it('should save directive cleanups to the cleanup property on the reactive element', () => {
        document.body.innerHTML = `<dir-with-cleanup x-cleanup></dir-with-cleanup>`
        const app = createApp({
            DirWithCleanup() {}
        })
        const fn = vi.fn();
        const runsDirective = vi.fn();
        app.directive('cleanup', function cleanup() {
            runsDirective();
            return fn;
        });
        app.mount();
        const el = document.querySelector<ReactiveElement<$Store>>('dir-with-cleanup')!;
        expect(el.cleanups.length).toBe(1);
        expect(runsDirective).toBeCalled();
        expect(fn).not.toBeCalled();
        el?.remove();
        expect(fn).toBeCalled();
    });
    /**
     * For some reason the effect is not being run both times,
     * could this be an issue with the walk function?
     */
    it('should walk through the nodes properly', () => {
        document.body.innerHTML = `<my-el>
            <div id="0" x-effect="() => test()"></div>
            <your-el>
                <span></span>
            </your-el>
            <div id="1" x-effect="() => test()"></div>
        </my-el>`

        const test = vi.fn();

        createApp({
            test,
            YourEl() {},
            MyEl(){}
        }).mount();

        expect(test).toBeCalledTimes(2);
    })

    it('should store effects on the proper element', () => {
        document.body.innerHTML = `<el-without-effects>
            <el-with-effects>
                <span x-text="name"></span>
                <div x-html="'<div></div>'"></div>
            </el-with-effects>
            <el-with-one-effect x-text="name"></el-with-one-effect>
        </el-without-effects>`

        createApp({
            name: 'Jane',
            ElWithEffects() {},
            ElWithoutEffects(){},
            ElWithOneEffect() {},
        }).mount();

        const w = document.querySelector<ReactiveElement<{ name: string }>>('el-with-effects')!;
        const wo = document.querySelector<ReactiveElement<{ name: string }>>('el-without-effects')!;
        const w1 = document.querySelector<ReactiveElement<{ name: string }>>('el-with-one-effect')!;
        
        expect(wo.effects.length).toBe(0);
        expect(w1.effects.length).toBe(1);
        expect(w.effects.length).toBe(2);
    })
});