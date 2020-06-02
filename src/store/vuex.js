let Vue;
const forEachValue = (obj = {}, fn) => {
  return Object.keys(obj || {}).forEach(key => {
    fn(key, obj[key]);
  });
}
class ModuleCollection {
  constructor(options) { // 模块依赖的收集
    this.register([], options); // 注册模块，将模块注册成树结构
  }
  register(path, rootModule) {
    let module = { // 将模块格式化
      _rawModule: rootModule,
      _children: {},
      state: rootModule.state
    }
    if (path.length === 0) { // 如何是根模块 将这个模块挂载到根实例上
      this.root = module;
    } else {
      // 递归都用reduce方法, 通过_children 属性进行查找
      let parent = path.slice(0, -1).reduce((root, current) => {
        return root._children[current];
      }, this.root);
      parent._children[path[path.length - 1]] = module;
    }
    // 看当前模块是否有modules
    if (rootModule.modules) { // 如果有modules 开始重新注册
      forEachValue(rootModule.modules, (moduleName, module) => {
        this.register(path.concat(moduleName), module);
      })
    }
  }
}
// 安装模块
const installModule = (store, rootState, path, rootModule) => {
  // 将state 挂载到根上
  if (path.length > 0) {
    let parent = path.slice(0, -1).reduce((root, current) => {
      return root[current];
    }, rootState);
    // vue 不能再对象上增加不存在的属性，否则视图不会更新
    // parent.path[path.length - 1] = rootModule.state;
    Vue.set(parent, path[path.length - 1], rootModule.state);
  }
  // getters
  let getters = rootModule._rawModule.getters;
  if (getters) {
    forEachValue(getters, (getterName, fn) => {
      Object.defineProperty(store.getters, getterName, {
        get() {
          // 让getters 执行，将自己的状态传入
          return fn(rootModule.state); // 将对应的函数执行
        }
      });
    });
  }
  // mutations
  let mutations = rootModule._rawModule.mutations; // 拿到每个模块里的mutations
  if (mutations) {
    forEachValue(mutations, (mutationName, fn) => {
      let mutations = store._mutations[mutationName] || [];
      mutations.push((paylod) => {
        fn.call(store, rootModule.state, paylod);
        // 发布，让所有的订阅依次执行
        store._subscribes.forEach(fn => fn({ type: mutationName, paylod }, rootState))
      });
      store._mutations[mutationName] = mutations;
    });
  }
  // actions
  let actions = rootModule._rawModule.actions; // 拿到每个模块里的mutations
  if (actions) {
    forEachValue(actions, (actionName, fn) => {
      let actions = store._actions[actionName] || [];
      actions.push((paylod) => {
        fn.call(store, store, paylod);
      });
      store._actions[actionName] = actions;
    });
  }
  // 循环挂载儿子
  forEachValue(rootModule._children, (moduleName, module) => {
    installModule(store, rootState, path.concat(moduleName), module);
  });
}
class Store {
  constructor(options = {}) {
    this._vm = new Vue({
      data() {
        return {
          state: options.state
        }
      }
    });
    this.getters = {};
    this._mutations = {};
    this._actions = {};
    this._subscribes = [];
    this._modules = new ModuleCollection(options); // 把数据格式化成一个想要的数据结构

    // 递归将结果分类
    // this 整个store
    // this.state 当前的根状态，把模块中的状态放在根上
    // [] 是为了递归的初始值
    // this._modules.root 是为了从跟模块开始安装
    installModule(this, this.state, [], this._modules.root);

    // plugins
    if (!Array.isArray(options.plugins)) {
      throw new TypeError('plugins is not Array');
    }
    options.plugins.forEach(fn => fn(this));
  }
  // 发布
  commit = (mutationName, paylod) => {
    this._mutations[mutationName].forEach(fn => fn(paylod));
  }
  dispatch = (actionName, paylod) => {
    this._actions[actionName].forEach(fn => fn(paylod));
  }
  // 订阅所有的plugins
  subscribe = (fn) => {
    this._subscribes.push(fn);
  }
  get state() {
    return this._vm.state;
  }
}
const install = (_Vue) => {
  Vue = _Vue;
  Vue.mixin({
    beforeCreate() {
      if (this.$options && this.$options.store) {
        this.$store = this.$options.store;
      } else {
        this.$store = this.$parent && this.$parent.$store;
      }
    }
  });
}

export default  {
  install,
  Store
};