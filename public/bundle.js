
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Cartao.svelte generated by Svelte v3.19.2 */

    const file = "src/Cartao.svelte";

    function create_fragment(ctx) {
    	let div3;
    	let header;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h1;
    	let t1;
    	let t2;
    	let h2;
    	let t3;
    	let t4;
    	let div2;
    	let p;
    	let t5;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			header = element("header");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t1 = text(/*nome*/ ctx[0]);
    			t2 = space();
    			h2 = element("h2");
    			t3 = text(/*titulo*/ ctx[1]);
    			t4 = space();
    			div2 = element("div");
    			p = element("p");
    			t5 = text(/*descricao*/ ctx[2]);
    			if (img.src !== (img_src_value = /*imagem*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*nome*/ ctx[0]);
    			attr_dev(img, "class", "svelte-kf57rr");
    			add_location(img, file, 69, 6, 1087);
    			attr_dev(div0, "class", "imagem svelte-kf57rr");
    			toggle_class(div0, "imagem-placeholder", !/*imagem*/ ctx[3]);
    			add_location(div0, file, 68, 4, 1025);
    			attr_dev(h1, "class", "svelte-kf57rr");
    			add_location(h1, file, 72, 6, 1162);
    			attr_dev(h2, "class", "svelte-kf57rr");
    			add_location(h2, file, 73, 6, 1184);
    			attr_dev(div1, "class", "usuario svelte-kf57rr");
    			add_location(div1, file, 71, 4, 1134);
    			attr_dev(header, "class", "svelte-kf57rr");
    			add_location(header, file, 67, 2, 1012);
    			add_location(p, file, 77, 4, 1255);
    			attr_dev(div2, "class", "descricao svelte-kf57rr");
    			add_location(div2, file, 76, 2, 1227);
    			attr_dev(div3, "class", "cartao svelte-kf57rr");
    			add_location(div3, file, 66, 0, 989);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, header);
    			append_dev(header, div0);
    			append_dev(div0, img);
    			append_dev(header, t0);
    			append_dev(header, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, h2);
    			append_dev(h2, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(p, t5);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imagem*/ 8 && img.src !== (img_src_value = /*imagem*/ ctx[3])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*nome*/ 1) {
    				attr_dev(img, "alt", /*nome*/ ctx[0]);
    			}

    			if (dirty & /*imagem*/ 8) {
    				toggle_class(div0, "imagem-placeholder", !/*imagem*/ ctx[3]);
    			}

    			if (dirty & /*nome*/ 1) set_data_dev(t1, /*nome*/ ctx[0]);
    			if (dirty & /*titulo*/ 2) set_data_dev(t3, /*titulo*/ ctx[1]);
    			if (dirty & /*descricao*/ 4) set_data_dev(t5, /*descricao*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { nome } = $$props;
    	let { titulo } = $$props;
    	let { descricao } = $$props;
    	let { imagem } = $$props;
    	const writable_props = ["nome", "titulo", "descricao", "imagem"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Cartao> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Cartao", $$slots, []);

    	$$self.$set = $$props => {
    		if ("nome" in $$props) $$invalidate(0, nome = $$props.nome);
    		if ("titulo" in $$props) $$invalidate(1, titulo = $$props.titulo);
    		if ("descricao" in $$props) $$invalidate(2, descricao = $$props.descricao);
    		if ("imagem" in $$props) $$invalidate(3, imagem = $$props.imagem);
    	};

    	$$self.$capture_state = () => ({ nome, titulo, descricao, imagem });

    	$$self.$inject_state = $$props => {
    		if ("nome" in $$props) $$invalidate(0, nome = $$props.nome);
    		if ("titulo" in $$props) $$invalidate(1, titulo = $$props.titulo);
    		if ("descricao" in $$props) $$invalidate(2, descricao = $$props.descricao);
    		if ("imagem" in $$props) $$invalidate(3, imagem = $$props.imagem);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [nome, titulo, descricao, imagem];
    }

    class Cartao extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			nome: 0,
    			titulo: 1,
    			descricao: 2,
    			imagem: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Cartao",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*nome*/ ctx[0] === undefined && !("nome" in props)) {
    			console.warn("<Cartao> was created without expected prop 'nome'");
    		}

    		if (/*titulo*/ ctx[1] === undefined && !("titulo" in props)) {
    			console.warn("<Cartao> was created without expected prop 'titulo'");
    		}

    		if (/*descricao*/ ctx[2] === undefined && !("descricao" in props)) {
    			console.warn("<Cartao> was created without expected prop 'descricao'");
    		}

    		if (/*imagem*/ ctx[3] === undefined && !("imagem" in props)) {
    			console.warn("<Cartao> was created without expected prop 'imagem'");
    		}
    	}

    	get nome() {
    		throw new Error("<Cartao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nome(value) {
    		throw new Error("<Cartao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get titulo() {
    		throw new Error("<Cartao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set titulo(value) {
    		throw new Error("<Cartao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get descricao() {
    		throw new Error("<Cartao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set descricao(value) {
    		throw new Error("<Cartao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imagem() {
    		throw new Error("<Cartao>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imagem(value) {
    		throw new Error("<Cartao>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.19.2 */
    const file$1 = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (81:0) {:else}
    function create_else_block(ctx) {
    	let h3;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Preencha os campos acima";
    			add_location(h3, file$1, 81, 2, 1683);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(81:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (72:39) 
    function create_if_block_1(ctx) {
    	let h3;
    	let t1;
    	let ul;
    	let each_value = /*erros*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Preencha os dados obrigatórios:";
    			t1 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h3, "class", "erro svelte-rdyd");
    			add_location(h3, file$1, 72, 2, 1529);
    			attr_dev(ul, "class", "erro svelte-rdyd");
    			add_location(ul, file$1, 73, 2, 1585);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*erros*/ 32) {
    				each_value = /*erros*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(72:39) ",
    		ctx
    	});

    	return block;
    }

    // (70:0) {#if statusContato === 'valido'}
    function create_if_block(ctx) {
    	let current;

    	const cartao = new Cartao({
    			props: {
    				nome: /*nome*/ ctx[0],
    				titulo: /*titulo*/ ctx[1],
    				descricao: /*descricao*/ ctx[3],
    				imagem: /*imagem*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(cartao.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(cartao, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const cartao_changes = {};
    			if (dirty & /*nome*/ 1) cartao_changes.nome = /*nome*/ ctx[0];
    			if (dirty & /*titulo*/ 2) cartao_changes.titulo = /*titulo*/ ctx[1];
    			if (dirty & /*descricao*/ 8) cartao_changes.descricao = /*descricao*/ ctx[3];
    			if (dirty & /*imagem*/ 4) cartao_changes.imagem = /*imagem*/ ctx[2];
    			cartao.$set(cartao_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cartao.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cartao.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(cartao, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(70:0) {#if statusContato === 'valido'}",
    		ctx
    	});

    	return block;
    }

    // (76:4) {#each erros as erro}
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*erro*/ ctx[12] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file$1, 76, 6, 1636);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*erros*/ 32 && t_value !== (t_value = /*erro*/ ctx[12] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(76:4) {#each erros as erro}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div4;
    	let div0;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let div1;
    	let label1;
    	let t4;
    	let input1;
    	let t5;
    	let div2;
    	let label2;
    	let t7;
    	let input2;
    	let t8;
    	let div3;
    	let label3;
    	let t10;
    	let textarea;
    	let t11;
    	let button;
    	let t13;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	let dispose;
    	const if_block_creators = [create_if_block, create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*statusContato*/ ctx[4] === "valido") return 0;
    		if (/*statusContato*/ ctx[4] === "invalido") return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Nome";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Título";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "URL da Imagem";
    			t7 = space();
    			input2 = element("input");
    			t8 = space();
    			div3 = element("div");
    			label3 = element("label");
    			label3.textContent = "Descrição";
    			t10 = space();
    			textarea = element("textarea");
    			t11 = space();
    			button = element("button");
    			button.textContent = "Adicionar Contato";
    			t13 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			attr_dev(label0, "for", "nome");
    			add_location(label0, file$1, 50, 4, 814);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "nome");
    			add_location(input0, file$1, 51, 4, 849);
    			attr_dev(div0, "class", "form-control");
    			add_location(div0, file$1, 49, 2, 783);
    			attr_dev(label1, "for", "titulo");
    			add_location(label1, file$1, 54, 4, 941);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "id", "titulo");
    			add_location(input1, file$1, 55, 4, 980);
    			attr_dev(div1, "class", "form-control");
    			add_location(div1, file$1, 53, 2, 910);
    			attr_dev(label2, "for", "imagem");
    			add_location(label2, file$1, 58, 4, 1076);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "id", "imagem");
    			add_location(input2, file$1, 59, 4, 1122);
    			attr_dev(div2, "class", "form-control");
    			add_location(div2, file$1, 57, 2, 1045);
    			attr_dev(label3, "for", "descricao");
    			add_location(label3, file$1, 62, 4, 1218);
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "id", "descricao");
    			add_location(textarea, file$1, 63, 4, 1263);
    			attr_dev(div3, "class", "form-control");
    			add_location(div3, file$1, 61, 2, 1187);
    			attr_dev(div4, "id", "form");
    			attr_dev(div4, "class", "svelte-rdyd");
    			add_location(div4, file$1, 48, 0, 765);
    			add_location(button, file$1, 67, 0, 1340);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*nome*/ ctx[0]);
    			append_dev(div4, t2);
    			append_dev(div4, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t4);
    			append_dev(div1, input1);
    			set_input_value(input1, /*titulo*/ ctx[1]);
    			append_dev(div4, t5);
    			append_dev(div4, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t7);
    			append_dev(div2, input2);
    			set_input_value(input2, /*imagem*/ ctx[2]);
    			append_dev(div4, t8);
    			append_dev(div4, div3);
    			append_dev(div3, label3);
    			append_dev(div3, t10);
    			append_dev(div3, textarea);
    			set_input_value(textarea, /*descricao*/ ctx[3]);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, t13, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    				listen_dev(input2, "input", /*input2_input_handler*/ ctx[10]),
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[11]),
    				listen_dev(button, "click", /*adicionarContato*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*nome*/ 1 && input0.value !== /*nome*/ ctx[0]) {
    				set_input_value(input0, /*nome*/ ctx[0]);
    			}

    			if (dirty & /*titulo*/ 2 && input1.value !== /*titulo*/ ctx[1]) {
    				set_input_value(input1, /*titulo*/ ctx[1]);
    			}

    			if (dirty & /*imagem*/ 4 && input2.value !== /*imagem*/ ctx[2]) {
    				set_input_value(input2, /*imagem*/ ctx[2]);
    			}

    			if (dirty & /*descricao*/ 8) {
    				set_input_value(textarea, /*descricao*/ ctx[3]);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t13);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let nome = "Luiz Carlos";
    	let titulo = "";
    	let imagem = "";
    	let descricao = "";
    	let statusContato = "novo";
    	let mensagem = ["Nome é obrigatório", "Título é obrigatório", "Descrição é obrigatória"];
    	let erros = [];

    	function adicionarContato() {
    		$$invalidate(5, erros = []);

    		if (nome === "") {
    			erros.push(mensagem[0]);
    		}

    		if (titulo === "") {
    			erros.push(mensagem[1]);
    		}

    		if (descricao === "") {
    			erros.push(mensagem[2]);
    		}

    		if (erros.length === 0) {
    			$$invalidate(4, statusContato = "valido");
    		} else {
    			$$invalidate(4, statusContato = "invalido");
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_input_handler() {
    		nome = this.value;
    		$$invalidate(0, nome);
    	}

    	function input1_input_handler() {
    		titulo = this.value;
    		$$invalidate(1, titulo);
    	}

    	function input2_input_handler() {
    		imagem = this.value;
    		$$invalidate(2, imagem);
    	}

    	function textarea_input_handler() {
    		descricao = this.value;
    		$$invalidate(3, descricao);
    	}

    	$$self.$capture_state = () => ({
    		Cartao,
    		nome,
    		titulo,
    		imagem,
    		descricao,
    		statusContato,
    		mensagem,
    		erros,
    		adicionarContato
    	});

    	$$self.$inject_state = $$props => {
    		if ("nome" in $$props) $$invalidate(0, nome = $$props.nome);
    		if ("titulo" in $$props) $$invalidate(1, titulo = $$props.titulo);
    		if ("imagem" in $$props) $$invalidate(2, imagem = $$props.imagem);
    		if ("descricao" in $$props) $$invalidate(3, descricao = $$props.descricao);
    		if ("statusContato" in $$props) $$invalidate(4, statusContato = $$props.statusContato);
    		if ("mensagem" in $$props) mensagem = $$props.mensagem;
    		if ("erros" in $$props) $$invalidate(5, erros = $$props.erros);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		nome,
    		titulo,
    		imagem,
    		descricao,
    		statusContato,
    		erros,
    		adicionarContato,
    		mensagem,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		textarea_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
