/*!
betajs-google-data - v0.0.8 - 2020-01-18
Copyright (c) Oliver Friedmann
Apache-2.0 Software License.
*/
/** @flow **//*!
betajs-scoped - v0.0.19 - 2018-04-07
Copyright (c) Oliver Friedmann
Apache-2.0 Software License.
*/
var Scoped = (function () {
var Globals = (function () {  
/** 
 * This helper module provides functions for reading and writing globally accessible namespaces, both in the browser and in NodeJS.
 * 
 * @module Globals
 * @access private
 */
return {
		
	/**
	 * Returns the value of a global variable.
	 * 
	 * @param {string} key identifier of a global variable
	 * @return value of global variable or undefined if not existing
	 */
	get : function(key/* : string */) {
		if (typeof window !== "undefined")
			return key ? window[key] : window;
		if (typeof global !== "undefined")
			return key ? global[key] : global;
		if (typeof self !== "undefined")
			return key ? self[key] : self;
		return undefined;
	},

	
	/**
	 * Sets a global variable.
	 * 
	 * @param {string} key identifier of a global variable
	 * @param value value to be set
	 * @return value that has been set
	 */
	set : function(key/* : string */, value) {
		if (typeof window !== "undefined")
			window[key] = value;
		if (typeof global !== "undefined")
			global[key] = value;
		if (typeof self !== "undefined")
			self[key] = value;
		return value;
	},
	
	
	/**
	 * Returns the value of a global variable under a namespaced path.
	 * 
	 * @param {string} path namespaced path identifier of variable
	 * @return value of global variable or undefined if not existing
	 * 
	 * @example
	 * // returns window.foo.bar / global.foo.bar 
	 * Globals.getPath("foo.bar")
	 */
	getPath: function (path/* : string */) {
		if (!path)
			return this.get();
		var args = path.split(".");
		if (args.length == 1)
			return this.get(path);		
		var current = this.get(args[0]);
		for (var i = 1; i < args.length; ++i) {
			if (!current)
				return current;
			current = current[args[i]];
		}
		return current;
	},


	/**
	 * Sets a global variable under a namespaced path.
	 * 
	 * @param {string} path namespaced path identifier of variable
	 * @param value value to be set
	 * @return value that has been set
	 * 
	 * @example
	 * // sets window.foo.bar / global.foo.bar 
	 * Globals.setPath("foo.bar", 42);
	 */
	setPath: function (path/* : string */, value) {
		var args = path.split(".");
		if (args.length == 1)
			return this.set(path, value);		
		var current = this.get(args[0]) || this.set(args[0], {});
		for (var i = 1; i < args.length - 1; ++i) {
			if (!(args[i] in current))
				current[args[i]] = {};
			current = current[args[i]];
		}
		current[args[args.length - 1]] = value;
		return value;
	}
	
};}).call(this);
/*::
declare module Helper {
	declare function extend<A, B>(a: A, b: B): A & B;
}
*/

var Helper = (function () {  
/** 
 * This helper module provides auxiliary functions for the Scoped system.
 * 
 * @module Helper
 * @access private
 */
return { 
		
	/**
	 * Attached a context to a function.
	 * 
	 * @param {object} obj context for the function
	 * @param {function} func function
	 * 
	 * @return function with attached context
	 */
	method: function (obj, func) {
		return function () {
			return func.apply(obj, arguments);
		};
	},

	
	/**
	 * Extend a base object with all attributes of a second object.
	 * 
	 * @param {object} base base object
	 * @param {object} overwrite second object
	 * 
	 * @return {object} extended base object
	 */
	extend: function (base, overwrite) {
		base = base || {};
		overwrite = overwrite || {};
		for (var key in overwrite)
			base[key] = overwrite[key];
		return base;
	},
	
	
	/**
	 * Returns the type of an object, particulary returning 'array' for arrays.
	 * 
	 * @param obj object in question
	 * 
	 * @return {string} type of object
	 */
	typeOf: function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]' ? "array" : typeof obj;
	},
	
	
	/**
	 * Returns whether an object is null, undefined, an empty array or an empty object.
	 * 
	 * @param obj object in question
	 * 
	 * @return true if object is empty
	 */
	isEmpty: function (obj) {
		if (obj === null || typeof obj === "undefined")
			return true;
		if (this.typeOf(obj) == "array")
			return obj.length === 0;
		if (typeof obj !== "object")
			return false;
		for (var key in obj)
			return false;
		return true;
	},
	
	
    /**
     * Matches function arguments against some pattern.
     * 
     * @param {array} args function arguments
     * @param {object} pattern typed pattern
     * 
     * @return {object} matched arguments as associative array 
     */	
	matchArgs: function (args, pattern) {
		var i = 0;
		var result = {};
		for (var key in pattern) {
			if (pattern[key] === true || this.typeOf(args[i]) == pattern[key]) {
				result[key] = args[i];
				i++;
			} else if (this.typeOf(args[i]) == "undefined")
				i++;
		}
		return result;
	},
	
	
	/**
	 * Stringifies a value as JSON and functions to string representations.
	 * 
	 * @param value value to be stringified
	 * 
	 * @return stringified value
	 */
	stringify: function (value) {
		if (this.typeOf(value) == "function")
			return "" + value;
		return JSON.stringify(value);
	}	

	
};}).call(this);
var Attach = (function () {  
/** 
 * This module provides functionality to attach the Scoped system to the environment.
 * 
 * @module Attach
 * @access private
 */
return { 
		
	__namespace: "Scoped",
	__revert: null,
	
	
	/**
	 * Upgrades a pre-existing Scoped system to the newest version present. 
	 * 
	 * @param {string} namespace Optional namespace (default is 'Scoped')
	 * @return {object} the attached Scoped system
	 */
	upgrade: function (namespace/* : ?string */) {
		var current = Globals.get(namespace || Attach.__namespace);
		if (current && Helper.typeOf(current) == "object" && current.guid == this.guid && Helper.typeOf(current.version) == "string") {
			var my_version = this.version.split(".");
			var current_version = current.version.split(".");
			var newer = false;
			for (var i = 0; i < Math.min(my_version.length, current_version.length); ++i) {
				newer = parseInt(my_version[i], 10) > parseInt(current_version[i], 10);
				if (my_version[i] != current_version[i]) 
					break;
			}
			return newer ? this.attach(namespace) : current;				
		} else
			return this.attach(namespace);		
	},


	/**
	 * Attaches the Scoped system to the environment. 
	 * 
	 * @param {string} namespace Optional namespace (default is 'Scoped')
	 * @return {object} the attached Scoped system
	 */
	attach : function(namespace/* : ?string */) {
		if (namespace)
			Attach.__namespace = namespace;
		var current = Globals.get(Attach.__namespace);
		if (current == this)
			return this;
		Attach.__revert = current;
		if (current) {
			try {
				var exported = current.__exportScoped();
				this.__exportBackup = this.__exportScoped();
				this.__importScoped(exported);
			} catch (e) {
				// We cannot upgrade the old version.
			}
		}
		Globals.set(Attach.__namespace, this);
		return this;
	},
	

	/**
	 * Detaches the Scoped system from the environment. 
	 * 
	 * @param {boolean} forceDetach Overwrite any attached scoped system by null.
	 * @return {object} the detached Scoped system
	 */
	detach: function (forceDetach/* : ?boolean */) {
		if (forceDetach)
			Globals.set(Attach.__namespace, null);
		if (typeof Attach.__revert != "undefined")
			Globals.set(Attach.__namespace, Attach.__revert);
		delete Attach.__revert;
		if (Attach.__exportBackup)
			this.__importScoped(Attach.__exportBackup);
		return this;
	},
	

	/**
	 * Exports an object as a module if possible. 
	 * 
	 * @param {object} mod a module object (optional, default is 'module')
	 * @param {object} object the object to be exported
	 * @param {boolean} forceExport overwrite potentially pre-existing exports
	 * @return {object} the Scoped system
	 */
	exports: function (mod, object, forceExport) {
		mod = mod || (typeof module != "undefined" ? module : null);
		if (typeof mod == "object" && mod && "exports" in mod && (forceExport || mod.exports == this || !mod.exports || Helper.isEmpty(mod.exports)))
			mod.exports = object || this;
		return this;
	}	

};}).call(this);

function newNamespace (opts/* : {tree ?: boolean, global ?: boolean, root ?: Object} */) {

	var options/* : {
		tree: boolean,
	    global: boolean,
	    root: Object
	} */ = {
		tree: typeof opts.tree === "boolean" ? opts.tree : false,
		global: typeof opts.global === "boolean" ? opts.global : false,
		root: typeof opts.root === "object" ? opts.root : {}
	};

	/*::
	type Node = {
		route: ?string,
		parent: ?Node,
		children: any,
		watchers: any,
		data: any,
		ready: boolean,
		lazy: any
	};
	*/

	function initNode(options)/* : Node */ {
		return {
			route: typeof options.route === "string" ? options.route : null,
			parent: typeof options.parent === "object" ? options.parent : null,
			ready: typeof options.ready === "boolean" ? options.ready : false,
			children: {},
			watchers: [],
			data: {},
			lazy: []
		};
	}
	
	var nsRoot = initNode({ready: true});
	
	if (options.tree) {
		if (options.global) {
			try {
				if (window)
					nsRoot.data = window;
			} catch (e) { }
			try {
				if (global)
					nsRoot.data = global;
			} catch (e) { }
			try {
				if (self)
					nsRoot.data = self;
			} catch (e) { }
		} else
			nsRoot.data = options.root;
	}
	
	function nodeDigest(node/* : Node */) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready) {
			nodeDigest(node.parent);
			return;
		}
		if (node.route && node.parent && (node.route in node.parent.data)) {
			node.data = node.parent.data[node.route];
			node.ready = true;
			for (var i = 0; i < node.watchers.length; ++i)
				node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
			node.watchers = [];
			for (var key in node.children)
				nodeDigest(node.children[key]);
		}
	}
	
	function nodeEnforce(node/* : Node */) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready)
			nodeEnforce(node.parent);
		node.ready = true;
		if (node.parent) {
			if (options.tree && typeof node.parent.data == "object")
				node.parent.data[node.route] = node.data;
		}
		for (var i = 0; i < node.watchers.length; ++i)
			node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
		node.watchers = [];
	}
	
	function nodeSetData(node/* : Node */, value) {
		if (typeof value == "object" && node.ready) {
			for (var key in value)
				node.data[key] = value[key];
		} else
			node.data = value;
		if (typeof value == "object") {
			for (var ckey in value) {
				if (node.children[ckey])
					node.children[ckey].data = value[ckey];
			}
		}
		nodeEnforce(node);
		for (var k in node.children)
			nodeDigest(node.children[k]);
	}
	
	function nodeClearData(node/* : Node */) {
		if (node.ready && node.data) {
			for (var key in node.data)
				delete node.data[key];
		}
	}
	
	function nodeNavigate(path/* : ?String */) {
		if (!path)
			return nsRoot;
		var routes = path.split(".");
		var current = nsRoot;
		for (var i = 0; i < routes.length; ++i) {
			if (routes[i] in current.children)
				current = current.children[routes[i]];
			else {
				current.children[routes[i]] = initNode({
					parent: current,
					route: routes[i]
				});
				current = current.children[routes[i]];
				nodeDigest(current);
			}
		}
		return current;
	}
	
	function nodeAddWatcher(node/* : Node */, callback, context) {
		if (node.ready)
			callback.call(context || this, node.data);
		else {
			node.watchers.push({
				callback: callback,
				context: context
			});
			if (node.lazy.length > 0) {
				var f = function (node) {
					if (node.lazy.length > 0) {
						var lazy = node.lazy.shift();
						lazy.callback.call(lazy.context || this, node.data);
						f(node);
					}
				};
				f(node);
			}
		}
	}
	
	function nodeUnresolvedWatchers(node/* : Node */, base, result) {
		node = node || nsRoot;
		result = result || [];
		if (!node.ready && node.lazy.length === 0 && node.watchers.length > 0)
			result.push(base);
		for (var k in node.children) {
			var c = node.children[k];
			var r = (base ? base + "." : "") + c.route;
			result = nodeUnresolvedWatchers(c, r, result);
		}
		return result;
	}

	/** 
	 * The namespace module manages a namespace in the Scoped system.
	 * 
	 * @module Namespace
	 * @access public
	 */
	return {
		
		/**
		 * Extend a node in the namespace by an object.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @param {object} value object that should be used for extend the namespace node
		 */
		extend: function (path, value) {
			nodeSetData(nodeNavigate(path), value);
		},
		
		/**
		 * Set the object value of a node in the namespace.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @param {object} value object that should be used as value for the namespace node
		 */
		set: function (path, value) {
			var node = nodeNavigate(path);
			if (node.data)
				nodeClearData(node);
			nodeSetData(node, value);
		},
		
		/**
		 * Read the object value of a node in the namespace.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @return {object} object value of the node or null if undefined
		 */
		get: function (path) {
			var node = nodeNavigate(path);
			return node.ready ? node.data : null;
		},
		
		/**
		 * Lazily navigate to a node in the namespace.
		 * Will asynchronously call the callback as soon as the node is being touched.
		 *
		 * @param {string} path path to the node in the namespace
		 * @param {function} callback callback function accepting the node's object value
		 * @param {context} context optional callback context
		 */
		lazy: function (path, callback, context) {
			var node = nodeNavigate(path);
			if (node.ready)
				callback(context || this, node.data);
			else {
				node.lazy.push({
					callback: callback,
					context: context
				});
			}
		},
		
		/**
		 * Digest a node path, checking whether it has been defined by an external system.
		 * 
		 * @param {string} path path to the node in the namespace
		 */
		digest: function (path) {
			nodeDigest(nodeNavigate(path));
		},
		
		/**
		 * Asynchronously access a node in the namespace.
		 * Will asynchronously call the callback as soon as the node is being defined.
		 *
		 * @param {string} path path to the node in the namespace
		 * @param {function} callback callback function accepting the node's object value
		 * @param {context} context optional callback context
		 */
		obtain: function (path, callback, context) {
			nodeAddWatcher(nodeNavigate(path), callback, context);
		},
		
		/**
		 * Returns all unresolved watchers under a certain path.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @return {array} list of all unresolved watchers 
		 */
		unresolvedWatchers: function (path) {
			return nodeUnresolvedWatchers(nodeNavigate(path), path);
		},
		
		__export: function () {
			return {
				options: options,
				nsRoot: nsRoot
			};
		},
		
		__import: function (data) {
			options = data.options;
			nsRoot = data.nsRoot;
		}
		
	};
	
}
function newScope (parent, parentNS, rootNS, globalNS) {
	
	var self = this;
	var nextScope = null;
	var childScopes = [];
	var parentNamespace = parentNS;
	var rootNamespace = rootNS;
	var globalNamespace = globalNS;
	var localNamespace = newNamespace({tree: true});
	var privateNamespace = newNamespace({tree: false});
	
	var bindings = {
		"global": {
			namespace: globalNamespace
		}, "root": {
			namespace: rootNamespace
		}, "local": {
			namespace: localNamespace
		}, "default": {
			namespace: privateNamespace
		}, "parent": {
			namespace: parentNamespace
		}, "scope": {
			namespace: localNamespace,
			readonly: false
		}
	};
	
	var custom = function (argmts, name, callback) {
		var args = Helper.matchArgs(argmts, {
			options: "object",
			namespaceLocator: true,
			dependencies: "array",
			hiddenDependencies: "array",
			callback: true,
			context: "object"
		});
		
		var options = Helper.extend({
			lazy: this.options.lazy
		}, args.options || {});
		
		var ns = this.resolve(args.namespaceLocator);
		
		var execute = function () {
			this.require(args.dependencies, args.hiddenDependencies, function () {
                var _arguments = [];
                for (var a = 0; a < arguments.length; ++a)
                    _arguments.push(arguments[a]);
                _arguments[_arguments.length - 1].ns = ns;
				if (this.options.compile) {
					var params = [];
					for (var i = 0; i < argmts.length; ++i)
						params.push(Helper.stringify(argmts[i]));
					this.compiled += this.options.ident + "." + name + "(" + params.join(", ") + ");\n\n";
				}
				if (this.options.dependencies) {
					this.dependencies[ns.path] = this.dependencies[ns.path] || {};
					if (args.dependencies) {
						args.dependencies.forEach(function (dep) {
							this.dependencies[ns.path][this.resolve(dep).path] = true;
						}, this);
					}
					if (args.hiddenDependencies) {
						args.hiddenDependencies.forEach(function (dep) {
							this.dependencies[ns.path][this.resolve(dep).path] = true;
						}, this);
					}
				}
				var result = this.options.compile ? {} : args.callback.apply(args.context || this, _arguments);
				callback.call(this, ns, result);
			}, this);
		};
		
		if (options.lazy)
			ns.namespace.lazy(ns.path, execute, this);
		else
			execute.apply(this);

		return this;
	};
	
	/** 
	 * This module provides all functionality in a scope.
	 * 
	 * @module Scoped
	 * @access public
	 */
	return {
		
		getGlobal: Helper.method(Globals, Globals.getPath),
		setGlobal: Helper.method(Globals, Globals.setPath),
		
		options: {
			lazy: false,
			ident: "Scoped",
			compile: false,
			dependencies: false
		},
		
		compiled: "",
		
		dependencies: {},
		
		
		/**
		 * Returns a reference to the next scope that will be obtained by a subScope call.
		 * 
		 * @return {object} next scope
		 */
		nextScope: function () {
			if (!nextScope)
				nextScope = newScope(this, localNamespace, rootNamespace, globalNamespace);
			return nextScope;
		},
		
		/**
		 * Creates a sub scope of the current scope and returns it.
		 * 
		 * @return {object} sub scope
		 */
		subScope: function () {
			var sub = this.nextScope();
			childScopes.push(sub);
			nextScope = null;
			return sub;
		},
		
		/**
		 * Creates a binding within in the scope. 
		 * 
		 * @param {string} alias identifier of the new binding
		 * @param {string} namespaceLocator identifier of an existing namespace path
		 * @param {object} options options for the binding
		 * 
		 */
		binding: function (alias, namespaceLocator, options) {
			if (!bindings[alias] || !bindings[alias].readonly) {
				var ns;
				if (Helper.typeOf(namespaceLocator) != "string") {
					ns = {
						namespace: newNamespace({
							tree: true,
							root: namespaceLocator
						}),
						path: null	
					};
				} else
					ns = this.resolve(namespaceLocator);
				bindings[alias] = Helper.extend(options, ns);
			}
			return this;
		},
		
		
		/**
		 * Resolves a name space locator to a name space.
		 * 
		 * @param {string} namespaceLocator name space locator
		 * @return {object} resolved name space
		 * 
		 */
		resolve: function (namespaceLocator) {
			var parts = namespaceLocator.split(":");
			if (parts.length == 1) {
                throw ("The locator '" + parts[0] + "' requires a namespace.");
			} else {
				var binding = bindings[parts[0]];
				if (!binding)
					throw ("The namespace '" + parts[0] + "' has not been defined (yet).");
				return {
					namespace: binding.namespace,
					path : binding.path && parts[1] ? binding.path + "." + parts[1] : (binding.path || parts[1])
				};
			}
		},

		
		/**
		 * Defines a new name space once a list of name space locators is available.
		 * 
		 * @param {string} namespaceLocator the name space that is to be defined
		 * @param {array} dependencies a list of name space locator dependencies (optional)
		 * @param {array} hiddenDependencies a list of hidden name space locators (optional)
		 * @param {function} callback a callback function accepting all dependencies as arguments and returning the new definition
		 * @param {object} context a callback context (optional)
		 * 
		 */
		define: function () {
			return custom.call(this, arguments, "define", function (ns, result) {
				if (ns.namespace.get(ns.path))
					throw ("Scoped namespace " + ns.path + " has already been defined. Use extend to extend an existing namespace instead");
				ns.namespace.set(ns.path, result);
			});
		},
		
		
		/**
		 * Assume a specific version of a module and fail if it is not met.
		 * 
		 * @param {string} assumption name space locator
		 * @param {string} version assumed version
		 * 
		 */
		assumeVersion: function () {
			var args = Helper.matchArgs(arguments, {
				assumption: true,
				dependencies: "array",
				callback: true,
				context: "object",
				error: "string"
			});
			var dependencies = args.dependencies || [];
			dependencies.unshift(args.assumption);
			this.require(dependencies, function () {
				var argv = arguments;
				var assumptionValue = argv[0].replace(/[^\d\.]/g, "");
				argv[0] = assumptionValue.split(".");
				for (var i = 0; i < argv[0].length; ++i)
					argv[0][i] = parseInt(argv[0][i], 10);
				if (Helper.typeOf(args.callback) === "function") {
					if (!args.callback.apply(args.context || this, args))
						throw ("Scoped Assumption '" + args.assumption + "' failed, value is " + assumptionValue + (args.error ? ", but assuming " + args.error : ""));
				} else {
					var version = (args.callback + "").replace(/[^\d\.]/g, "").split(".");
					for (var j = 0; j < Math.min(argv[0].length, version.length); ++j)
						if (parseInt(version[j], 10) > argv[0][j])
							throw ("Scoped Version Assumption '" + args.assumption + "' failed, value is " + assumptionValue + ", but assuming at least " + args.callback);
				}
			});
		},
		
		
		/**
		 * Extends a potentiall existing name space once a list of name space locators is available.
		 * 
		 * @param {string} namespaceLocator the name space that is to be defined
		 * @param {array} dependencies a list of name space locator dependencies (optional)
		 * @param {array} hiddenDependencies a list of hidden name space locators (optional)
		 * @param {function} callback a callback function accepting all dependencies as arguments and returning the new additional definitions.
		 * @param {object} context a callback context (optional)
		 * 
		 */
		extend: function () {
			return custom.call(this, arguments, "extend", function (ns, result) {
				ns.namespace.extend(ns.path, result);
			});
		},
				
		
		/**
		 * Requires a list of name space locators and calls a function once they are present.
		 * 
		 * @param {array} dependencies a list of name space locator dependencies (optional)
		 * @param {array} hiddenDependencies a list of hidden name space locators (optional)
		 * @param {function} callback a callback function accepting all dependencies as arguments
		 * @param {object} context a callback context (optional)
		 * 
		 */
		require: function () {
			var args = Helper.matchArgs(arguments, {
				dependencies: "array",
				hiddenDependencies: "array",
				callback: "function",
				context: "object"
			});
			args.callback = args.callback || function () {};
			var dependencies = args.dependencies || [];
			var allDependencies = dependencies.concat(args.hiddenDependencies || []);
			var count = allDependencies.length;
			var deps = [];
			var environment = {};
			if (count) {
				var f = function (value) {
					if (this.i < deps.length)
						deps[this.i] = value;
					count--;
					if (count === 0) {
						deps.push(environment);
						args.callback.apply(args.context || this.ctx, deps);
					}
				};
				for (var i = 0; i < allDependencies.length; ++i) {
					var ns = this.resolve(allDependencies[i]);
					if (i < dependencies.length)
						deps.push(null);
					ns.namespace.obtain(ns.path, f, {
						ctx: this,
						i: i
					});
				}
			} else {
				deps.push(environment);
				args.callback.apply(args.context || this, deps);
			}
			return this;
		},

		
		/**
		 * Digest a name space locator, checking whether it has been defined by an external system.
		 * 
		 * @param {string} namespaceLocator name space locator
		 */
		digest: function (namespaceLocator) {
			var ns = this.resolve(namespaceLocator);
			ns.namespace.digest(ns.path);
			return this;
		},
		
		
		/**
		 * Returns all unresolved definitions under a namespace locator
		 * 
		 * @param {string} namespaceLocator name space locator, e.g. "global:"
		 * @return {array} list of all unresolved definitions 
		 */
		unresolved: function (namespaceLocator) {
			var ns = this.resolve(namespaceLocator);
			return ns.namespace.unresolvedWatchers(ns.path);
		},
		
		/**
		 * Exports the scope.
		 * 
		 * @return {object} exported scope
		 */
		__export: function () {
			return {
				parentNamespace: parentNamespace.__export(),
				rootNamespace: rootNamespace.__export(),
				globalNamespace: globalNamespace.__export(),
				localNamespace: localNamespace.__export(),
				privateNamespace: privateNamespace.__export()
			};
		},
		
		/**
		 * Imports a scope from an exported scope.
		 * 
		 * @param {object} data exported scope to be imported
		 * 
		 */
		__import: function (data) {
			parentNamespace.__import(data.parentNamespace);
			rootNamespace.__import(data.rootNamespace);
			globalNamespace.__import(data.globalNamespace);
			localNamespace.__import(data.localNamespace);
			privateNamespace.__import(data.privateNamespace);
		}
		
	};
	
}
var globalNamespace = newNamespace({tree: true, global: true});
var rootNamespace = newNamespace({tree: true});
var rootScope = newScope(null, rootNamespace, rootNamespace, globalNamespace);

var Public = Helper.extend(rootScope, (function () {  
/** 
 * This module includes all public functions of the Scoped system.
 * 
 * It includes all methods of the root scope and the Attach module.
 * 
 * @module Public
 * @access public
 */
return {
		
	guid: "4b6878ee-cb6a-46b3-94ac-27d91f58d666",
	version: '0.0.19',
		
	upgrade: Attach.upgrade,
	attach: Attach.attach,
	detach: Attach.detach,
	exports: Attach.exports,
	
	/**
	 * Exports all data contained in the Scoped system.
	 * 
	 * @return data of the Scoped system.
	 * @access private
	 */
	__exportScoped: function () {
		return {
			globalNamespace: globalNamespace.__export(),
			rootNamespace: rootNamespace.__export(),
			rootScope: rootScope.__export()
		};
	},
	
	/**
	 * Import data into the Scoped system.
	 * 
	 * @param data of the Scoped system.
	 * @access private
	 */
	__importScoped: function (data) {
		globalNamespace.__import(data.globalNamespace);
		rootNamespace.__import(data.rootNamespace);
		rootScope.__import(data.rootScope);
	}
	
};

}).call(this));

Public = Public.upgrade();
Public.exports();
	return Public;
}).call(this);
/*!
betajs-google-data - v0.0.8 - 2020-01-18
Copyright (c) Oliver Friedmann
Apache-2.0 Software License.
*/

(function () {
var Scoped = this.subScope();
Scoped.binding('module', 'global:BetaJS.Data.Google');
Scoped.binding('base', 'global:BetaJS');
Scoped.binding('data', 'global:BetaJS.Data');
Scoped.define("module:", function () {
	return {
    "guid": "40dfb24a-cf2c-4992-bf16-725d5177b5c9",
    "version": "0.0.8"
};
});
Scoped.assumeVersion('base:version', '~1.0.96');
Scoped.assumeVersion('data:version', '~1.0.41');
Scoped.define("module:Helpers.Google", [
    "base:Promise",
    "base:Time"
], function(Promise, Time) {

    var Google = require("googleapis");
    var PubSub = require('@google-cloud/pubsub');

    return {

        getUserProfile: function(google) {
            var promise = Promise.create();
            Google.google.gmail("v1").users.getProfile({
                auth: google,
                userId: "me"
            }, promise.asyncCallbackFunc());
            return promise.mapSuccess(function(profile) {
                return profile.data;
            });
        },

        oauth2: function(clientId, clientSecret, redirectUri) {
            return new(Google.google.auth.OAuth2)(clientId, clientSecret, redirectUri);
        },

        oauth2WithCredentials: function(clientId, clientSecret, credentials) {
            var oauth2 = this.oauth2(clientId, clientSecret);
            oauth2.setCredentials(credentials);
            return oauth2;
        },

        oauth2RefreshRequired: function(oauth2) {
            return oauth2.credentials.expiry_date < Time.now();
        },

        oauth2ForceRefresh: function(oauth2) {
            var promise = Promise.create();
            oauth2.refreshAccessToken(promise.asyncCallbackFunc());
            return promise;
        },

        oauth2EnsureRefreshed: function(oauth2) {
            return this.oauth2RefreshRequired(oauth) ? this.oauth2ForceRefresh(oauth2) : Promise.value(true);
        },

        oauth2GetToken: function(oauth2, code) {
            var promise = Promise.create();
            oauth2.getToken(code, promise.asyncCallbackFunc());
            return promise;
        },

        oauth2Url: function(oauth2, scopes) {
            return oauth2.generateAuthUrl({
                access_type: 'offline',
                prompt: "consent",
                scope: scopes
            });
        },

        gmailWatch: function(oauth2, pubSubCreds) {
            var promise = Promise.create();
            Google.google.gmail("v1").users.watch({
                userId: 'me',
                auth: oauth2,
                resource: {
                    labelIds: ['INBOX'],
                    topicName: 'projects/' + pubSubCreds.project_id + '/topics/' + pubSubCreds.topic_name
                }
            }, promise.asyncCallbackFunc());
            return promise;
        },

        pubsubSubscribe: function(pubSubCreds, callback, callbackCtx) {
            var pubsub = new PubSub({
                projectId: pubSubCreds.project_id,
                credentials: {
                    "private_key": pubSubCreds.private_key,
                    "client_email": pubSubCreds.client_email
                }
            });
            var subscriptionName = 'projects/' + pubSubCreds.project_id + '/subscriptions/' + pubSubCreds.subscription_name;
            var subscription = pubsub.subscription(subscriptionName);
            subscription.on("message", function(message) {
                // 1234567890, {"emailAddress":"foobar@gmail.com", "historyId":1234567}, {...}
                try {
                    callback.call(callbackCtx, message.id, JSON.parse(message.data), message.attributes);
                } catch (e) {
                    console.log(e);
                }
                message.ack();
            });
        }

    };
});
Scoped.define("module:Net.Imap", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Async",
    "base:Promise",
    "base:Types"
], function(Class, EventsMixin, Objs, Async, Promise, Types, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(auth, options) {
                inherited.constructor.call(this);
                this.__quoted_printable = require("quoted-printable");
                this.__html_strip = require('htmlstrip-native');
                this.__auth = auth;
                options = options || {};
                this.__options = options;
                this.__count = 0;
                this.__Imap = require("imap");
                this.__connected = false;
                this.__imap = new this.__Imap(Objs.extend({
                    tls: true,
                    tlsOptions: {
                        rejectUnauthorized: false
                    }
                }, auth));
                var self = this;
                this.__imap.on("mail", function(mails) {
                    self.__count += mails;
                });
                this.__imap.on("error", function() {
                    self.trigger("error");
                    if (options.reconnect_on_error)
                        Async.eventually(self.reconnect, [], self);
                });
            },

            destroy: function() {
                this.disconnect();
                inherited.destroy.call(this);
            },

            connect: function() {
                if (this.__connected)
                    return Promise.value(true);
                this.__count = 0;
                var self = this;
                var promise = Promise.create();
                var f = function() {
                    promise.error(true);
                    self.off("error", f);
                };
                this.on("error", f);
                this.__imap.connect();
                this.__imap.once('ready', function() {
                    self.__connected = true;
                    var boxes = self.__options.mailbox || "INBOX";
                    if (!Types.is_array(boxes))
                        boxes = [boxes];
                    boxes = Objs.clone(boxes, 1);
                    var err = null;
                    var worker = function() {
                        if (boxes.length === 0) {
                            promise.error(err);
                            self.__connected = false;
                        }
                        var box = boxes.shift();
                        self.__imap.openBox(box, true, function(error, box) {
                            if (error) {
                                err = error;
                                worker();
                                return;
                            }
                            self.on("error", f);
                            self.__imap.on('mail', function(count) {
                                self.trigger("new_mail", count);
                            });
                            promise.asyncSuccess(true);
                        });
                    };
                    self.off("error", f);
                    worker();
                });
                return promise;
            },

            disconnect: function() {
                if (!this.__connected)
                    return;
                this.__imap.end();
                this.__connected = false;
            },

            reconnect: function() {
                this.disconnect();
                this.connect();
            },

            count: function() {
                return this.__count;
            },

            /*
             * body: boolean (= true)
             * headers: boolean (= true)
             * seq_from
             * seq_to
             * seq_count
             * reverse
             */
            fetch: function(options, callbacks) {
                options = options || {};
                var bodies = [];
                if (!("headers" in options) || options.headers)
                    bodies.push('HEADER.FIELDS (FROM TO SUBJECT DATE)');
                if (!("body" in options) || options.body)
                    bodies.push('TEXT');
                var seq_start = 1;
                var seq_end = 100;
                if (options.seq_count) {
                    if (options.seq_end) {
                        seq_end = options.seq_end;
                        seq_start = seq_end - options.seq_count + 1;
                    } else {
                        seq_start = options.seq_start || seq_start;
                        seq_end = seq_start + options.seq_count - 1;
                    }
                } else {
                    seq_start = options.seq_start || seq_start;
                    seq_end = options.seq_end || seq_start + 99;
                }
                if (options.reverse) {
                    var dist = seq_end - seq_start;
                    seq_end = this.__count - seq_start + 1;
                    seq_start = seq_end - dist;
                }
                var f = this.__imap.seq.fetch(seq_start + ":" + seq_end, {
                    bodies: bodies,
                    struct: true
                });
                return this.__query(f);
            },

            __query: function(f) {
                var self = this;
                var mails = [];
                f.on('message', function(msg, seqno) {
                    var attrs = {};
                    var header_buffer = '';
                    var body_buffer = '';
                    msg.on('body', function(stream, info) {
                        stream.on('data', function(chunk) {
                            if (info.which === 'TEXT')
                                body_buffer += chunk.toString('utf8');
                            else
                                header_buffer += chunk.toString('utf8');
                        });
                    });
                    msg.once('attributes', function(a) {
                        attrs = a;
                    });
                    msg.once('end', function() {
                        attrs.seqno = seqno;
                        try {
                            var mail = self.__parse(self.__Imap.parseHeader(header_buffer), body_buffer, attrs);
                            if (mail)
                                mails.push(mail);
                        } catch (e) {}
                    });
                });
                var promise = Promise.create();
                f.once('error', function(err) {
                    promise.asyncError(err);
                });
                f.once('end', function() {
                    promise.asyncSuccess(mails);
                });
                return promise;
            },

            __parse: function(header, body, attrs) {
                this.trigger("parse", header, body, attrs);
                var mail = {};
                /* Attrs */
                mail.uid = attrs.uid;
                mail.threadid = attrs['x-gm-thrid'];
                mail.id = attrs.uid;
                mail.seqid = attrs.seqno;
                /* Header */
                if (header && header.subject && header.subject.length > 0)
                    mail.subject = header.subject[0];
                if (header && header.to && header.to.length > 0)
                    mail.to = header.to[0];
                if (header && header.from && header.from.length > 0)
                    mail.from = header.from[0];
                if (header && header.date && header.date.length > 0) {
                    var d = new Date(header.date[0]);
                    mail.time = d.getTime();
                }
                if (body) {
                    /* Meta Body */
                    var struct = attrs.struct;
                    var parts = [];
                    if (struct.length > 1) {
                        var boundary = struct[0].params.boundary;
                        var rest = body;
                        var boundary_prefix = rest.indexOf(boundary);
                        for (var i = 1; i < struct.length; ++i) {
                            var obj = struct[i][0] || {};
                            // Remove everything before boundary
                            rest = rest.substring(rest.indexOf(boundary) + boundary.length);
                            // Remove everything before empty line
                            rest = rest.substring(rest.indexOf("\r\n\r\n") + "\r\n\r\n".length);
                            // Ignore attachments for now
                            if (obj.disposition || obj.type !== 'text')
                                continue;
                            var j = rest.indexOf(boundary) - boundary_prefix;
                            parts.push({
                                meta: obj,
                                body: j >= 0 ? rest.substring(0, j) : rest
                            });
                        }
                    } else
                        parts.push({
                            meta: struct[0],
                            body: body
                        });
                    var html_body = null;
                    var text_body = null;
                    for (var k = 0; k < parts.length; ++k) {
                        var encoded = parts[k].body;
                        var encoding = parts[k].meta.encoding.toLowerCase();
                        try {
                            if (encoding === "quoted-printable") {
                                encoded = this.__quoted_printable.decode(encoded).toString();
                            } else {
                                encoded = new Buffer(encoded, encoding).toString();
                            }
                        } catch (e) {}
                        if (parts[k].meta.subtype === "html")
                            html_body = encoded;
                        else
                            text_body = encoded;
                    }
                    if (!text_body && html_body) {
                        text_body = this.__html_strip.html_strip(html_body, {
                            include_script: false,
                            include_style: false,
                            compact_whitespace: true
                        });
                    }
                    mail.html_body = html_body;
                    mail.text_body = text_body;
                }
                return mail;
            }

        };
    }]);
});
Scoped.define("module:Net.Smtp", [
    "base:Strings",
    "base:Promise"
], function(Strings, Promise) {
    return {

        send: function(config, message) {
            var email = require("emailjs");
            message.from = Strings.email_get_email(message.from);
            message.to = Strings.email_get_email(message.to);
            if (message.text_body) {
                message.text = message.text_body;
                delete message.text_body;
            }
            var promise = Promise.create();
            email.server.connect(config).send(email.message.create(message), promise.asyncCallbackFunc());
            return promise;
        }

    };
});
Scoped.define("module:Stores.GoogleRawCalendarStore", [
    "data:Stores.BaseStore",
    "data:Queries",
    "base:Promise",
    "base:Objs",
    "base:Time"
], function(BaseStore, Queries, Promise, Objs, Time, scoped) {
    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google, calendarId) {
                inherited.constructor.call(this);
                this.__calendar = require("googleapis").google.calendar("v3");
                this.__google = google;
                this.__calendarId = calendarId;
            },

            _query_capabilities: function() {
                return {
                    limit: true,
                    skip: false,
                    sort: true,
                    query: Queries.fullQueryCapabilities()
                };
            },

            _query: function(query, options) {
                if (query.id) {
                    return this.get(query.id).mapSuccess(function(json) {
                        return [json];
                    });
                }
                var promise = Promise.create();
                var googleQuery = Objs.extend({
                    auth: this.__google,
                    calendarId: this.__calendarId,
                    maxResults: options.limit || 100,
                    singleEvents: true,
                    timeZone: "UTC"
                }, query);
                this.__calendar.events.list(googleQuery, promise.asyncCallbackFunc());
                return promise.mapSuccess(function(json) {
                    return json.data.items;
                }, this);
            },

            _get: function(id) {
                var promise = Promise.create();
                this.__calendar.events.get({
                    auth: this.__google,
                    calendarId: this.__calendarId,
                    eventId: id
                }, promise.asyncCallbackFunc());
                return promise;
            },

            _remove: function(id) {
                var promise = Promise.create();
                this.__calendar.events["delete"]({
                    auth: this.__google,
                    calendarId: this.__calendarId,
                    eventId: id
                }, promise.asyncCallbackFunc());
                return promise;
            },

            _update: function(id, data) {
                // For now, we don't do anything updating it. We gracefully ignore the request.
                return Promise.value(data);
            },

            _insert: function(data) {
                var promise = Promise.create();
                this.__calendar.events.quickAdd({
                    auth: this.__google,
                    calendarId: this.__calendarId,
                    text: data.value
                }, promise.asyncCallbackFunc());
                return promise.mapSuccess(function(result) {
                    return {
                        id: result.eventId,
                        value: data.value,
                        start_date_utc: Time.now(),
                        start_date_utc_time_difference: null
                    };
                });
            }

        };
    });
});



Scoped.define("module:Stores.GoogleCalendarStore", [
    "data:Stores.TransformationStore",
    "data:Queries",
    "module:Stores.GoogleRawCalendarStore",
    "base:Objs",
    "base:Strings"
], function(TransformationStore, Queries, GoogleRawCalendarStore, Objs, Strings, scoped) {
    return TransformationStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google, calendarId) {
                inherited.constructor.call(this, new GoogleRawCalendarStore(google, calendarId), {
                    destroy_store: true
                });
            },

            _query_capabilities: function() {
                var capabilities = inherited._query_capabilities.call(this);
                capabilities.sort = true;
                return capabilities;
            },

            _encodeData: function(data) {
                var result = {};
                Objs.iter(data, function(value, key) {
                    if (key == "date")
                        result.Date = value;
                    else
                        result[key] = value;
                }, this);
                return result;
            },

            _decodeData: function(json) {
                if (json.value)
                    return json;
                var result = {
                    id: json.id,
                    value: json.summary,
                    start_date_utc: null,
                    start_date_utc_time_difference: null
                };
                if (json.start && json.start.dateTime) {
                    var components = Strings.last_after(json.start.dateTime, "-").split(":");
                    result.start_date_utc = (new Date(json.start.dateTime)).getTime();
                    result.start_date_utc_time_difference = parseInt(components[0], 10) * 60 + parseInt(components[1], 10);
                }
                return result;
            },

            _encodeQuery: function(query, options) {
                //var encoded = inherited._encodeQuery.call(this, query, options);
                var encoded = {};

                function tree(q) {
                    Objs.iter(q, function(value, key) {
                        switch (key) {
                            case "start_date_utc":
                                var ge = value.$gte || value.$gt;
                                var lt = value.$lte || value.$lt;
                                if (ge)
                                    encoded.timeMin = (new Date(ge)).toISOString();
                                if (lt)
                                    encoded.timeMax = (new Date(lt)).toISOString();
                                break;
                            case "value":
                                encoded.q = value;
                                break;
                            default:
                                tree(value);
                        }
                    });
                }
                tree(query);
                return {
                    query: encoded,
                    options: options
                };
            }

        };
    });
});
Scoped.define("module:Stores.GoogleContactsStore", [
    "data:Stores.BaseStore",
    "data:Queries",
    "base:Promise",
    "base:Objs",
    "base:Strings"
], function(BaseStore, Queries, Promise, Objs, Strings, scoped) {

    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google) {
                inherited.constructor.call(this);
                this.__contacts = new(require('google-contacts').GoogleContacts)({
                    token: google.credentials.access_token
                });
                this.__google = google;
            },

            _query_capabilities: function() {
                return {
                    limit: true,
                    skip: false,
                    sort: true,
                    query: Queries.fullQueryCapabilities()
                };
            },

            _query: function(query, options) {
                if (query.id) {
                    return this.get(query.id).mapSuccess(function(json) {
                        return [json];
                    });
                }

                options = options || {};
                var promise = Promise.create();
                this.__contacts.getContacts(promise.asyncCallbackFunc(), {
                    projection: "full",
                    "max-results": options.limit,
                    q: [query.name || "", query.email || ""].join(" ")
                });
                return promise.mapSuccess(function(data) {
                    return data.map(this._decodePerson, this);
                }, this);
            },

            _get: function(id) {
                var promise = Promise.create();
                this.__contacts.getContact(promise.asyncCallbackFunc(), {
                    id: id
                });
                return promise.mapSuccess(this._decodePerson, this);
            },

            _decodePerson: function(data) {
                data = data.entry || data;
                return {
                    id: data.id,
                    name: data.name,
                    email: data.email ? data.email.toLowerCase() : "",
                    phoneNumber: data.phoneNumber
                };
            }

        };
    });
});
// https://support.google.com/mail/answer/7190?hl=en

Scoped.define("module:Stores.GoogleRawMailStore", [
    "data:Stores.BaseStore",
    "data:Queries",
    "base:Promise",
    "base:Objs",
    "base:Time",
    "base:Types"
], function(BaseStore, Queries, Promise, Objs, Time, Types, scoped) {

    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google) {
                inherited.constructor.call(this);
                this.__gmail = require("googleapis").google.gmail("v1");
                this.__google = google;
            },

            _query_capabilities: function() {
                return {
                    limit: true,
                    skip: false,
                    sort: true,
                    query: {
                        atom: true,
                        conditions: {
                            "$ct": true,
                            "$ctic": true,
                            "$sw": true,
                            "$swic": true
                        }
                    }
                };
            },

            __gmailExecute: function(method, endpoint, data, resilience) {
                return Promise.resilience(function() {
                    var promise = Promise.create();
                    var ep = this.__gmail.users;
                    endpoint.split(".").forEach(function(e) {
                        ep = ep[e];
                    });
                    ep[method](Objs.extend({
                        auth: this.__google,
                        userId: "me"
                    }, data), promise.asyncCallbackFunc());
                    return promise;
                }, this, resilience || 5);
            },

            _get: function(id) {
                var draft = id.indexOf("r") === 0;
                return this.__gmailExecute("get", draft ? "drafts" : "messages", {
                    id: id,
                    format: "full"
                }).mapSuccess(function(result) {
                    var myResult = draft ? result.data.message : result.data;
                    myResult.id = id;
                    return myResult;
                });
            },

            getAttachment: function(messageId, attachmentId) {
                return this.__gmailExecute("get", "messages.attachments", {
                    messageId: messageId,
                    id: attachmentId
                });
            },

            __rawMessageByData: function(data) {
                var mailcomposer = require("mailcomposer");
                var objs = Objs.filter({
                    to: data.to,
                    cc: data.cc,
                    bcc: data.bcc,
                    "in-reply-to": data["In-Reply-To"],
                    references: data.References,
                    subject: data.subject,
                    text: data.text_body,
                    attachments: data.attachments
                }, function(value) {
                    return !!value;
                });
                var mail = mailcomposer(objs);
                var promise = Promise.create();
                mail.build(function(err, value) {
                    promise.asyncSuccess(value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_'));
                });
                return promise;
            },

            _insert: function(data) {
                var draft = data.draft;
                if (data.threadId.indexOf("-") >= 0)
                    delete data.threadId;
                return this.__rawMessageByData(data).mapSuccess(function(raw) {
                    return this.__gmailExecute(draft ? "create" : "send", draft ? "drafts" : "messages", {
                        resource: draft ? {
                            message: {
                                threadId: data.threadId,
                                raw: raw
                            }
                        } : {
                            threadId: data.threadId,
                            raw: raw
                        }
                    }).mapSuccess(function(result) {
                        return this.get(result.data.id);
                    }, this);
                }, this);
            },

            _query: function(query, options) {
                if (query.id) {
                    return this.get(query.id).mapSuccess(function(json) {
                        return [json.data || json];
                    });
                }
                var promise = null;
                if (query.threadId) {
                    promise = this.__gmailExecute("get", "threads", {
                        id: query.threadId,
                        maxResults: options.limit || 100
                    });
                } else {
                    var q = [];
                    Objs.iter(query, function(value, key) {
                        if (Types.is_object(value)) {
                            Objs.iter(value, function(condval, cond) {
                                if (cond === "$ct" || cond === "$ctic")
                                    q.push(key + ":*" + condval + "*");
                                if (cond === "$sw" || cond === "$swic")
                                    q.push(key + ":" + condval + "*");
                            });
                        } else if (key !== "sent" && key !== "in_inbox" && key !== "draft" && key !== "starred" && key !== "archived")
                            q.push(key + ":" + value);
                    });
                    var labelids = [];
                    if (query.in_inbox)
                        labelids.push("INBOX");
                    if ("archived" in query && !query.archived)
                        labelids.push("INBOX");
                    if (query.sent)
                        labelids.push("SENT");
                    if (query.draft)
                        labelids.push("DRAFT");
                    if (query.starred)
                        labelids.push("STARRED");
                    var google_query = {
                        maxResults: options.limit || 100
                    };
                    if (labelids.length > 0)
                        google_query.labelIds = labelids;
                    if (q.length > 0)
                        google_query.q = q.join(" ");
                    promise = this.__gmailExecute("list", "messages", google_query);
                }
                return promise.mapSuccess(function(json) {
                    var promise = Promise.and();
                    Objs.iter(json.data.messages, function(msg) {
                        promise = promise.and(this.get(msg.id));
                    }, this);
                    var emailsPromise = promise.end();
                    var draftsPromise = this.__allDrafts();
                    return draftsPromise.mapError(function() {
                        return emailsPromise;
                    }).mapSuccess(function(drafts) {
                        var draftMap = {};
                        drafts.forEach(function(draft) {
                            draftMap[draft.message.id] = draft.id;
                        });
                        return emailsPromise.mapSuccess(function(emails) {
                            return emails.map(function(email) {
                                if (draftMap[email.id])
                                    email.id = draftMap[email.id];
                                return email;
                            });
                        });
                    });
                }, this);
            },

            _remove: function(id) {
                return this.__gmailExecute("delete", "messages", {
                    id: id,
                    format: "full"
                });
            },

            __allDrafts: function() {
                return this.__gmailExecute("list", "drafts", {}).mapSuccess(function(result) {
                    return result.data.drafts || [];
                });
            },

            __draftByMsgId: function(id) {
                return this.__allDrafts().mapSuccess(function(result) {
                    for (var i = 0; i < result.length; ++i) {
                        if (result[i].message.id === id)
                            return result[i];
                    }
                    return Promise.error("Not found");
                }, this);
            },

            __draftByDraftId: function(id) {
                return this.__gmailExecute("list", "drafts", {}).mapSuccess(function(result) {
                    for (var i = 0; i < result.data.drafts.length; ++i) {
                        if (result.data.drafts[i].id === id)
                            return result.data.drafts[i];
                    }
                    return Promise.error("Not found");
                }, this);
            },

            _update: function(id, data) {
                if ("draft" in data && !data.draft) {
                    if (Objs.count(data) > 1) {
                        delete data.draft;
                        return this._update(id, data).mapSuccess(function() {
                            return this._update(id, {
                                draft: false
                            });
                        }, this);
                    }
                    return this.__draftByDraftId(id).mapSuccess(function(draft) {
                        return this.__gmailExecute("send", "drafts", {
                            resource: {
                                id: draft.id,
                                message: draft.message
                            }
                        }).mapSuccess(function(result) {
                            return this.get(result.data.id);
                        }, this);
                    }, this);
                }
                return this._get(id).mapSuccess(function(draftData) {
                        Objs.iter(draftData.payload.headers, function(item) {
                            if (!(item.name.toLowerCase() in data))
                                data[item.name.toLowerCase()] = item.value;
                        });
                        if (!("text_body" in data) && draftData.payload.body && draftData.payload.body.data) {
                            var buf = new Buffer(draftData.payload.body.data, "base64");
                            data.text_body = buf.toString();
                        }
                        if (data.attachments) {
                            data.addAttachments = data.attachments;
                            data.attachments = [];
                        } else {
                            data.attachments = [];
                            var processParts = function(parts) {
                                Objs.iter(parts, function(part) {
                                    try {
                                        switch (part.mimeType) {
                                            case "text/plain":
                                                if (!("text_body" in data))
                                                    data.text_body = new Buffer(part.body.data, 'base64').toString();
                                                break;
                                            case "text/html":
                                                break;
                                            case "multipart/alternative":
                                                processParts(part.parts);
                                                break;
                                            default:
                                                if (part.body && part.body.attachmentId) {
                                                    data.attachments.push({
                                                        type: part.mimeType,
                                                        name: part.filename,
                                                        id: part.body.attachmentId
                                                    });
                                                }
                                                break;
                                        }
                                    } catch (e) {}
                                });
                            };
                            processParts(draftData.payload.parts || [draftData.payload]);
                        }
                        return Promise.and(data.attachments.map(function(attachment) {
                            return this.getAttachment(id, attachment.id).mapSuccess(function(attachmentData) {
                                return {
                                    contentType: attachment.type,
                                    filename: attachment.name,
                                    content: new Buffer(attachmentData.data.data, "base64")
                                };
                            });
                        }, this)).end().mapSuccess(function(attachments) {
                            data.attachments = attachments;
                            if (data.attachmentsAdd) {
                                data.attachments = data.attachments.concat(data.attachmentsAdd.map(function(attachment) {
                                    return {
                                        filename: attachment.name,
                                        content: attachment.data
                                    };
                                }));
                                delete data.attachmentsAdd;
                            }
                            return this.__rawMessageByData(Objs.extend(draftData, data)).mapSuccess(function(raw) {
                                return this.__gmailExecute("update", "drafts", {
                                    id: id,
                                    resource: {
                                        message: {
                                            raw: raw
                                        }
                                    }
                                }).mapSuccess(function(result) {
                                    return this.get(result.data.id);
                                }, this);
                            }, this);
                        }, this);
                    }, this)
                    .mapError(function(e) {
                        var addLabelIds = [];
                        var removeLabelIds = [];
                        if ("in_inbox" in data)
                            (data.in_inbox ? addLabelIds : removeLabelIds).push("INBOX");
                        if ("archived" in data)
                            (!data.archived ? addLabelIds : removeLabelIds).push("INBOX");
                        if ("read" in data)
                            (!data.read ? addLabelIds : removeLabelIds).push("UNREAD");
                        if ("sent" in data)
                            (data.sent ? addLabelIds : removeLabelIds).push("SENT");
                        if ("draft" in data)
                            (data.draft ? addLabelIds : removeLabelIds).push("DRAFT");
                        if ("starred" in data)
                            (data.starred ? addLabelIds : removeLabelIds).push("STARRED");
                        return this.__gmailExecute("modify", "messages", {
                            id: id,
                            resource: {
                                addLabelIds: addLabelIds,
                                removeLabelIds: removeLabelIds
                            }
                        });
                    }, this);
                //return Promise.value(data);
            }

        };
    });
});


Scoped.define("module:Stores.GoogleMailStore", [
    "data:Stores.TransformationStore",
    "data:Queries",
    "module:Stores.GoogleRawMailStore",
    "base:Objs",
    "base:Promise"
], function(TransformationStore, Queries, GoogleRawMailStore, Objs, Promise, scoped) {
    return TransformationStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google) {
                inherited.constructor.call(this, new GoogleRawMailStore(google), {
                    destroy_store: true
                });
            },

            _query_capabilities: function() {
                var capabilities = inherited._query_capabilities.call(this);
                capabilities.sort = true;
                return capabilities;
            },

            getAttachment: function(messageId, attachmentId) {
                return this._store().getAttachment(messageId, attachmentId);
            },

            addAttachments: function(messageId, attachments) {
                return this.update(messageId, {
                    attachmentsAdd: attachments
                }).mapSuccess(function(result) {
                    return result.attachments.slice(-attachments.length);
                });
            },

            _encodeData: function(data) {
                var result = {
                    labelIds: []
                };
                Objs.iter(data, function(value, key) {
                    if (value === null || value === undefined)
                        return;
                    switch (key) {
                        case "time":
                            result.Date = value;
                            break;
                        case "threadid":
                            result.threadId = value;
                            break;
                        case "in_reply_to":
                            result["In-Reply-To"] = value;
                            break;
                        case "to":
                        case "cc":
                        case "bcc":
                            result[key] = value.join ? value.join(",") : value;
                            break;
                        case "references":
                            result.References = value;
                            break;
                        default:
                            result[key] = value;
                    }
                }, this);
                if (result.labelIds.length === 0)
                    delete result.labelIds;
                return result;
            },

            _decodeData: function(json) {
                if (!json.payload)
                    return json;
                var result = {
                    id: json.id,
                    threadid: json.threadId,
                    snippet: json.snippet,
                    archived: !Objs.contains_value(json.labelIds, "INBOX"),
                    attachments: [],
                    to: [],
                    cc: [],
                    in_inbox: Objs.contains_value(json.labelIds, "INBOX"),
                    read: !Objs.contains_value(json.labelIds, "UNREAD"),
                    sent: Objs.contains_value(json.labelIds, "SENT"),
                    draft: Objs.contains_value(json.labelIds, "DRAFT"),
                    starred: Objs.contains_value(json.labelIds, "STARRED")
                };
                Objs.iter(json.labelIds, function(key) {
                    if (key.indexOf("CATEGORY_") === 0)
                        result.category = key.substring("CATEGORY_".length).toLowerCase();
                });
                Objs.iter(json.payload.headers, function(item) {
                    switch (item.name) {
                        case "To":
                            result.to.push(item.value);
                            break;
                        case "Cc":
                            result.cc.push(item.value);
                            break;
                        case "From":
                            result.from = item.value;
                            break;
                        case "Subject":
                            result.subject = item.value;
                            break;
                        case "Date":
                            result.creation_time = Date.parse(item.value);
                            break;
                        case "Message-Id":
                            result.messageid = item.value;
                            break;
                    }
                });
                var processParts = function(parts) {
                    Objs.iter(parts, function(part) {
                        try {
                            switch (part.mimeType) {
                                case "text/plain":
                                    result.text_body = new Buffer(part.body.data, 'base64').toString();
                                    break;
                                case "text/html":
                                    result.html_body = new Buffer(part.body.data, 'base64').toString();
                                    break;
                                case "multipart/alternative":
                                    processParts(part.parts);
                                    break;
                                default:
                                    if (part.body && part.body.attachmentId) {
                                        result.attachments.push({
                                            type: part.mimeType,
                                            filename: part.filename,
                                            id: part.body.attachmentId,
                                            size: part.body.size,
                                            internal: !!result.html_body && result.html_body.indexOf("cid:" + part.filename) >= 0
                                        });
                                    }
                                    break;
                            }
                        } catch (e) {}
                    });
                };
                processParts(json.payload.parts || [json.payload]);
                return result;
            }

        };
    });
});
Scoped.define("module:Stores.GooglePeopleStore", [
    "data:Stores.BaseStore",
    "data:Queries",
    "base:Promise",
    "base:Objs",
    "base:Strings"
], function(BaseStore, Queries, Promise, Objs, Strings, scoped) {

    var FIELDS = [
        "addresses",
        "ageRanges",
        "biographies",
        "birthdays",
        "braggingRights",
        "coverPhotos",
        "emailAddresses",
        "events",
        "genders",
        "imClients",
        "interests",
        "locales",
        "memberships",
        "metadata",
        "names",
        "nicknames",
        "occupations",
        "organizations",
        "phoneNumbers",
        "photos",
        "relations",
        "relationshipInterests",
        "relationshipStatuses",
        "residences",
        "skills",
        "taglines",
        "urls"
    ];

    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google) {
                inherited.constructor.call(this);
                this.__people = require("googleapis").google.people("v1");
                this.__google = google;
            },

            _query_capabilities: function() {
                return {
                    limit: true,
                    skip: false,
                    sort: true,
                    query: Queries.fullQueryCapabilities()
                };
            },

            _query: function(query, options) {
                if (query.id) {
                    return this.get(query.id).mapSuccess(function(json) {
                        return [json];
                    });
                }
                var promise = Promise.create();
                this.__people.contactGroups.get(Objs.extend({
                    auth: this.__google,
                    resourceName: "contactGroups/all",
                    maxMembers: options.limit || 100
                }, query), promise.asyncCallbackFunc());
                return promise.mapSuccess(function(data) {
                    var promise = Promise.create();
                    this.__people.people.getBatchGet({
                        auth: this.__google,
                        resourceNames: data.data.memberResourceNames || [],
                        personFields: FIELDS
                    }, promise.asyncCallbackFunc());
                    return promise.mapSuccess(function(data) {
                        return data.data.responses.filter(function(response) {
                            return response.httpStatusCode === 200;
                        }).map(this._decodePerson, this);
                    }, this);
                }, this);
            },

            _get: function(id) {
                var promise = Promise.create();
                this.__people.people.get({
                    auth: this.__google,
                    resourceName: this._encodePersonId(id),
                    personFields: FIELDS
                }, promise.asyncCallbackFunc());
                return promise.mapSuccess(this._decodePerson, this);
            },

            _encodePersonId: function(id) {
                return "people/" + Strings.strip_start(id, "people/");
            },

            _decodePersonId: function(id) {
                return Strings.strip_start(id, "people/");
            },

            _decodePerson: function(data) {
                var person = data.person || data;
                var result = {
                    id: this._decodePersonId(person.resourceName),
                    emailAddresses: (person.emailAddresses || []).map(function(emailAddress) {
                        return emailAddress.value.toLowerCase();
                    }).filter(function(emailAddress) {
                        return Strings.is_email_address(emailAddress);
                    }),
                    gender: person.genders ? person.genders[0].value : undefined,
                    displayName: person.names ? person.names[0].displayName : undefined,
                    familyName: person.names ? person.names[0].familyName : undefined,
                    givenName: person.names ? person.names[0].givenName : undefined,
                    organization: person.organizations ? person.organizations[0].name : undefined,
                    title: person.organizations ? person.organizations[0].title : undefined,
                    photos: (person.photos || []).map(function(photo) {
                        return photo.url;
                    }).filter(function(photo) {
                        return !!photo;
                    })
                };
                result.name = result.displayName;
                result.email = result.emailAddresses[0];
                return result;
            }

        };
    });
});
Scoped.define("module:Stores.ImapStore", [
    "data:Stores.BaseStore",
    "data:Stores.StoreException",
    "base:Objs",
    "module:Net.Imap",
    "module:Net.Smtp"
], function(BaseStore, StoreException, Objs, Imap, Smtp, scoped) {
    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                this.__imap = Objs.extend(Objs.clone(options.base, 1), options.imap);
                this.__smtp = Objs.extend(Objs.clone(options.base, 1), options.smtp);
                this.__imap_opts = options.imap_options || {};
                this.__imap_opts.reconnect_on_error = false;
            },

            test: function() {
                var imap = new Imap(this.__imap, this.__imap_opts);
                return imap.connect().callback(imap.destroy, imap);
            },

            _query_capabilities: function() {
                return {
                    skip: true,
                    limit: true
                };
            },

            _query: function(query, options) {
                var self = this;
                var imap = new Imap(this.__imap, this.__imap_opts);
                return imap.connect().mapSuccess(function() {
                    var opts = {};
                    if ("skip" in options)
                        opts.seq_start = options.skip + 1;
                    if ("limit" in options)
                        opts.seq_count = options.limit;
                    opts.reverse = true;
                    return imap.fetch(opts).success(function(mails) {
                        imap.destroy();
                    }, this);
                }, this);
            },

            _insert: function(mail) {
                Smtp.send(this.__smtp, {
                    from: mail.from,
                    to: mail.to,
                    subject: mail.subject,
                    text_body: mail.text_body
                }).mapCallback(function(err, msg) {
                    if (err)
                        return new StoreException(err);
                    mail.id = msg.header["message-id"];
                    return mail;
                });
            }

        };
    });
});

/*
Scoped.define("module:Stores.ImapListenerStore", [      
      "data:Stores.ListenerStore",
      "base:Objs",
      "module:Net.Imap"
  ], function (ListenerStore, Objs, Imap, scoped) {
  return ListenerStore.extend({scoped: scoped}, function (inherited) {
	return {
                                      			    
		constructor: function (options) {
			inherited.constructor.call(this, options);
			var opts = Objs.extend(Objs.clone(options.base, 1), options.imap);
			var imap = new Imap(opts, {reonnect_on_error: true});
			this._auto_destroy(imap);
			imap.on("new_mail", function (count) {
				imap.fetch({seq_count: count, reverse: true}).success(function (mails) {
					Objs.iter(mails, function (mail) {
						this._inserted(mail);
					}, this);
				}, this);
			}, this);
			imap.connect();
		}
		
	};
  });
});
*/
}).call(Scoped);