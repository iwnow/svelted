// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  return newRequire;
})({"node_modules/svelte-dev-helper/lib/registry.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class registry {
  constructor() {
    this._items = {};
  }

  set(k, v) {
    this._items[k] = Object.assign({
      rollback: null,
      component: null,
      instances: []
    }, v);
  }

  get(k) {
    return k ? this._items[k] || undefined : this._items;
  }

  registerInstance(instance) {
    const id = instance.id;
    this._items[id] && this._items[id].instances.push(instance);
  }

  deRegisterInstance(instance) {
    const id = instance.id;
    this._items[id] && this._items[id].instances.forEach(function (comp, idx, instances) {
      if (comp == instance) {
        instances.splice(idx, 1);
      }
    });
  }

} // eslint-disable-next-line no-undef


const componentRegistry = window.__SVELTE_REGISTRY__ = new registry();
var _default = componentRegistry;
exports.default = _default;
},{}],"node_modules/svelte-dev-helper/lib/proxy.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.configure = configure;
exports.getConfig = getConfig;
exports.createProxy = createProxy;
Object.defineProperty(exports, "Registry", {
  enumerable: true,
  get: function () {
    return _registry.default;
  }
});

var _registry = _interopRequireDefault(require("./registry"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let proxyOptions = {
  noPreserveState: false
};

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

function getDebugName(id) {
  const posixID = id.replace(/[/\\]/g, '/');
  const name = posixID.split('/').pop().split('.').shift();
  return `<${capitalize(name)}>`;
}

function groupStart(msg) {
  console.group && console.group(msg);
}

function groupEnd() {
  console.groupEnd && console.groupEnd();
}

function configure(_options) {
  proxyOptions = Object.assign(proxyOptions, _options);
}

function getConfig() {
  return proxyOptions;
}
/*
creates a proxy object that
decorates the original component with trackers
and ensures resolution to the
latest version of the component
*/


function createProxy(id) {
  const handledMethods = '_mount,_unmount,destroy'.split(',');
  const forwardedMethods = 'get,fire,observe,on,set,teardown,_recompute,_set,_bind'.split(',');

  class proxyComponent {
    constructor(options) {
      this.id = id;
      this.__mountpoint = null;
      this.__anchor = null;
      this.__insertionPoint = null;
      this.__mounted = false;

      this._register(options);

      this._debugName = this.proxyTarget._debugName || getDebugName(this.id); // ---- forwarded methods ----

      const self = this;
      forwardedMethods.forEach(function (method) {
        self[method] = function () {
          return self.proxyTarget[method].apply(self.proxyTarget, arguments);
        };
      }); // ---- END forwarded methods ----
    } // ---- augmented methods ----


    _mount(target, anchor, insertionPoint) {
      this.__mountpoint = target;
      this.__anchor = anchor;

      if (insertionPoint) {
        this.__insertionPoint = insertionPoint;
      } else {
        // eslint-disable-next-line no-undef
        this.__insertionPoint = document.createComment(this._debugName);
        target.insertBefore(this.__insertionPoint, anchor);
      }

      this.__insertionPoint.__component__ = this;
      anchor = this.__insertionPoint.nextSibling;

      if (target.nodeName == '#document-fragment' && insertionPoint) {
        //handles #4 by forcing a target
        //if original target was a document fragment
        target = this.__insertionPoint.parentNode;
      }

      this.__mounted = true;
      return this.proxyTarget._mount(target, anchor);
    }

    destroy(detach, keepInsertionPoint) {
      _registry.default.deRegisterInstance(this);

      if (!keepInsertionPoint && this.__insertionPoint) {
        //deref for GC before removal of node
        this.__insertionPoint.__component__ = null;
        const ip = this.__insertionPoint;
        ip && ip.parentNode && ip.parentNode.removeChild(ip);
      }

      return this.proxyTarget.destroy(detach);
    }

    _unmount() {
      this.__mounted = false;
      return this.proxyTarget._unmount.apply(this.proxyTarget, arguments);
    } // ---- END augmented methods ----
    // ---- extra methods ----


    _register(options) {
      const record = _registry.default.get(this.id);

      try {
        //resolve to latest version of component
        this.proxyTarget = new record.component(options);
      } catch (e) {
        const rb = record.rollback;

        if (!rb) {
          console.error(e);
          console.warn('Full reload required. Please fix component errors and reload the whole page');
          return;
        }

        groupStart(this._debugName + ' Errors');
        console.warn(e);
        console.warn(this._debugName + ' could not be hot-loaded because it has an error'); //resolve to previous working version of component

        this.proxyTarget = new rb(options);
        console.info('%c' + this._debugName + ' rolled back to previous working version', 'color:green'); //set latest version as the rolled-back version

        record.component = rb;
        groupEnd();
      }

      _registry.default.set(this.id, record); //register current instance, so that
      //we can re-render it when required


      _registry.default.registerInstance(this); //proxy custom methods


      const self = this;
      let methods = Object.getOwnPropertyNames(Object.getPrototypeOf(self.proxyTarget));
      methods.forEach(function (method) {
        if (!handledMethods.includes(method) && !forwardedMethods.includes(method)) {
          self[method] = function () {
            return self.proxyTarget[method].apply(self.proxyTarget, arguments);
          };
        }
      }); //(re)expose properties that might be used from outside

      this.refs = this.proxyTarget.refs || {};
      this._fragment = this.proxyTarget._fragment;
      this._slotted = this.proxyTarget._slotted;
      this.root = this.proxyTarget.root;
      this.store = this.proxyTarget.store || null;
    }

    _rerender() {
      const mountpoint = this.__mountpoint || null,
            anchor = this.__anchor || null,
            options = this.proxyTarget.options,
            oldstate = this.get(),
            isMounted = this.__mounted,
            insertionPoint = this.__insertionPoint,
            handlers = this.proxyTarget._handlers;
      this.destroy(true, true);

      this._register(options); //re-attach event handlers


      const self = this;

      for (const ev in handlers) {
        const _handlers = handlers[ev];

        _handlers.forEach(function (item) {
          if (item.toString().includes('component.fire(')) {
            self.proxyTarget.on(ev, item);
          }
        });
      }

      if (mountpoint && isMounted) {
        this.proxyTarget._fragment.c();

        this._mount(mountpoint, anchor, insertionPoint); //work around _checkReadOnly in svelte (for computed properties)


        this.proxyTarget._updatingReadonlyProperty = true; //preserve local state (unless noPreserveState is true)

        if (!this.proxyTarget.constructor.noPreserveState && !proxyOptions.noPreserveState) {
          //manually flush computations and re-render changes
          let changed = {};

          for (let k in oldstate) {
            changed[k] = true;
          }

          this.proxyTarget._recompute(changed, oldstate);

          this.proxyTarget._fragment && this.proxyTarget._fragment.p(changed, oldstate); //set old state back

          this.set(oldstate);
        } else {
          //we have to call .set() here
          //otherwise oncreate is not fired
          this.set(this.get());
        }

        this.proxyTarget._updatingReadonlyProperty = false;
      }
    } // ---- END extra methods ----


  } //forward static properties and methods


  const originalComponent = _registry.default.get(id).component;

  for (let key in originalComponent) {
    proxyComponent[key] = originalComponent[key];
  }

  return proxyComponent;
}
},{"./registry":"node_modules/svelte-dev-helper/lib/registry.js"}],"node_modules/svelte-dev-helper/index.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _proxy = require("./lib/proxy");

Object.keys(_proxy).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _proxy[key];
    }
  });
});
},{"./lib/proxy":"node_modules/svelte-dev-helper/lib/proxy.js"}],"node_modules/parcel-plugin-svelte/src/hot-api.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.configure = configure;
exports.register = register;
exports.reload = reload;

var _svelteDevHelper = require("svelte-dev-helper");

let hotOptions = {
  noPreserveState: false
};

function configure(options) {
  hotOptions = Object.assign(hotOptions, options);
  (0, _svelteDevHelper.configure)(hotOptions);
}

function register(id, component) {
  // Store original component in registry
  _svelteDevHelper.Registry.set(id, {
    rollback: null,
    component,
    instances: []
  }); // Create the proxy itself


  const proxy = (0, _svelteDevHelper.createProxy)(id); // Patch the registry record with proxy constructor

  const record = _svelteDevHelper.Registry.get(id);

  record.proxy = proxy;

  _svelteDevHelper.Registry.set(id, record);

  return proxy;
}

function reload(id, component) {
  const record = _svelteDevHelper.Registry.get(id); // Keep reference to previous version to enable rollback


  record.rollback = record.component; // Replace component in registry with newly loaded component

  record.component = component;

  _svelteDevHelper.Registry.set(id, record); // Re-render the proxy instances


  record.instances.slice().forEach(instance => instance && instance._rerender()); // Return the original proxy constructor that was `register()`-ed

  return record.proxy;
}
},{"svelte-dev-helper":"node_modules/svelte-dev-helper/index.js"}],"src/App.svelte":[function(require,module,exports) {
/* src/App.svelte generated by Svelte v2.15.2 */
"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function create_main_fragment(component, ctx) {
  var h1, text0, text1, text2;
  return {
    c: function c() {
      h1 = createElement("h1");
      text0 = createText("Hello ");
      text1 = createText(ctx.name);
      text2 = createText("!");
    },
    m: function m(target, anchor) {
      insert(target, h1, anchor);
      append(h1, text0);
      append(h1, text1);
      append(h1, text2);
    },
    p: function p(changed, ctx) {
      if (changed.name) {
        setData(text1, ctx.name);
      }
    },
    d: function d(detach) {
      if (detach) {
        detachNode(h1);
      }
    }
  };
}

function App(options) {
  init(this, options);
  this._state = assign({}, options.data);
  this._intro = true;
  this._fragment = create_main_fragment(this, this._state);

  if (options.target) {
    this._fragment.c();

    this._mount(options.target, options.anchor);
  }
}

assign(App.prototype, {
  destroy: destroy,
  get: get,
  fire: fire,
  on: on,
  set: set,
  _set: _set,
  _stage: _stage,
  _mount: _mount,
  _differs: _differs
});
App.prototype._recompute = noop;

function createElement(name) {
  return document.createElement(name);
}

function createText(data) {
  return document.createTextNode(data);
}

function insert(target, node, anchor) {
  target.insertBefore(node, anchor);
}

function append(target, node) {
  target.appendChild(node);
}

function setData(text, data) {
  text.data = '' + data;
}

function detachNode(node) {
  node.parentNode.removeChild(node);
}

function init(component, options) {
  component._handlers = blankObject();
  component._slots = blankObject();
  component._bind = options._bind;
  component._staged = {};
  component.options = options;
  component.root = options.root || component;
  component.store = options.store || component.root.store;

  if (!options.root) {
    component._beforecreate = [];
    component._oncreate = [];
    component._aftercreate = [];
  }
}

function assign(tar, src) {
  for (var k in src) {
    tar[k] = src[k];
  }

  return tar;
}

function destroy(detach) {
  this.destroy = noop;
  this.fire('destroy');
  this.set = noop;

  this._fragment.d(detach !== false);

  this._fragment = null;
  this._state = {};
}

function get() {
  return this._state;
}

function fire(eventName, data) {
  var handlers = eventName in this._handlers && this._handlers[eventName].slice();

  if (!handlers) return;

  for (var i = 0; i < handlers.length; i += 1) {
    var handler = handlers[i];

    if (!handler.__calling) {
      try {
        handler.__calling = true;
        handler.call(this, data);
      } finally {
        handler.__calling = false;
      }
    }
  }
}

function on(eventName, handler) {
  var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
  handlers.push(handler);
  return {
    cancel: function cancel() {
      var index = handlers.indexOf(handler);
      if (~index) handlers.splice(index, 1);
    }
  };
}

function set(newState) {
  this._set(assign({}, newState));

  if (this.root._lock) return;
  flush(this.root);
}

function _set(newState) {
  var oldState = this._state,
      changed = {},
      dirty = false;
  newState = assign(this._staged, newState);
  this._staged = {};

  for (var key in newState) {
    if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
  }

  if (!dirty) return;
  this._state = assign(assign({}, oldState), newState);

  this._recompute(changed, this._state);

  if (this._bind) this._bind(changed, this._state);

  if (this._fragment) {
    this.fire("state", {
      changed: changed,
      current: this._state,
      previous: oldState
    });

    this._fragment.p(changed, this._state);

    this.fire("update", {
      changed: changed,
      current: this._state,
      previous: oldState
    });
  }
}

function _stage(newState) {
  assign(this._staged, newState);
}

function _mount(target, anchor) {
  this._fragment[this._fragment.i ? 'i' : 'm'](target, anchor || null);
}

function _differs(a, b) {
  return a != a ? b == b : a !== b || a && _typeof(a) === 'object' || typeof a === 'function';
}

function noop() {}

function blankObject() {
  return Object.create(null);
}

function flush(component) {
  component._lock = true;
  callAll(component._beforecreate);
  callAll(component._oncreate);
  callAll(component._aftercreate);
  component._lock = false;
}

function callAll(fns) {
  while (fns && fns.length) {
    fns.shift()();
  }
}

if (module.hot) {
  var _require = require('../node_modules/parcel-plugin-svelte/src/hot-api.js'),
      configure = _require.configure,
      register = _require.register,
      reload = _require.reload;

  module.hot.accept();

  if (!module.hot.data) {
    // initial load
    configure({});
    App = register('src/App.svelte', App);
  } else {
    // hot update
    App = reload('src/App.svelte', App);
  }
}

module.exports = App;
},{"../node_modules/parcel-plugin-svelte/src/hot-api.js":"node_modules/parcel-plugin-svelte/src/hot-api.js"}],"src/app.js":[function(require,module,exports) {
"use strict";

var _App = _interopRequireDefault(require("./App.svelte"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = new _App.default({
  target: document.getElementById('demo'),
  data: {
    name: 'world'
  }
});
window.app = app;
},{"./App.svelte":"src/App.svelte"}],"node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "60595" + '/');

  ws.onmessage = function (event) {
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      console.clear();
      data.assets.forEach(function (asset) {
        hmrApply(global.parcelRequire, asset);
      });
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          hmrAccept(global.parcelRequire, asset.id);
        }
      });
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAccept(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAccept(bundle.parent, id);
  }

  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAccept(global.parcelRequire, id);
  });
}
},{}]},{},["node_modules/parcel-bundler/src/builtins/hmr-runtime.js","src/app.js"], null)
//# sourceMappingURL=/app.a6a4d504.map