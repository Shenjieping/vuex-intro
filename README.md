## 思考问题

1. Vuex 只在更实例引入了，那么它是如何在每个子组件中都能使用的？
2. Vuex 是一个插件，为什么更改了Vuex中的state，会触发视图的跟新？
 
## vuex原理
vuex 是vue的状态管理工具，目的是为了更方便实现多个组件之间的状态共享

vuex的工作原理, [Vuex 官方文档](https://vuex.vuejs.org/zh/)
![vuex](https://vuex.vuejs.org/vuex.png)

## vuex实现
1. 新建一个vuex文件，导出一个store对象

  ```js
  let Vue;
  class Store {
    
  }
  const install = (_Vue) => {
    Vue = _Vue;
  }

  export default {
    // 这方法在use的时候默认会被调用
    install,
    Store
  }
  ```

2. 使用混合，在创建组件之前，将vuex实例挂载到vue的实例上

  ```js
  Vue.mixin({
    beforeCreate() {
      // 需要拿到store,给每个组件都增加 $store 属性
      // 为什么不直接给Vue.prototype 上增加？是因为可能会new 好多个Vue的实例，在别的实例上不需要store
      if (this.$options && this.$options.store) {
        this.$store = this.$options.store;
      } else {
        // 这里判断一下，如果单独创建了一个实例没有parent
        this.$store = this.$parent && this.$parent.$store;
      }
    }
  });
  ```
3. 获取`new Store`传入的对象

  ```js
    class Store {
      constructor(options = {}) {
        // 将用户的状态放入到 store 中
        this.state = options.state;
        
        // 获取计算属性
        let getters = options.getters;
        this.getters = {};
        Object.keys(getters).forEach(getterName => {
          Object.defineProperty(this.getters, getterName, {
            get: () => {
              return getters[getterName](this.state);
            }
          });
        });
      }
    }
  ```
4. 将`state`的数据变成响应式的数据

  ```js
    class Store {
      constructor(options = {}) {
        // Vuex 的核心，定义了响应式变化，数据更新之后更新视图
        this._vm = new Vue({
          data() {
            return {
              state: options.state
            };
          }
        });
      }
      // 类的属性访问器
      get state() {
        return this._vm.state;
      }
    }
  ```
5. 通过触发 `mutations` 更改状态

  ```js
    通过 this.commit() 触发更改
    mutations: {
      syncAdd(state, payload) {
        state.age += payload;
      }
    }
    
    // 通过发布订阅的模式
    class Store {
      constructor(options = {}) {
        let mutations = options.mutations;
        this.mutations = {};
        Object.keys(mutations).forEach(mutationName => {
          // 订阅所有的mutations
          this.mutations[mutationName] = (payload) => {
            // 内部的第一个参数是状态
            mutations[mutationName](this.state, payload);
          }
        });
      }
      // 提交更改，会在当前的 store 上找到对应的函数执行
      // 发布
      commit = (mutationName, payload) => { // 保证this
        this.mutations[mutationName](payload);
      }
    }
  ```
6. 内部封装的 `forEach`, 减少重复代码

  ```js
    const forEachValue = (obj, fn) => {
      Object.keys(obj).forEach(key => {
        fn(key, obj[key]);
      });
    };
    
    // 对上面的 getters 改造下
    forEachValue(getters, (gettersName, fn) => {
      Object.defineProperty(this.getters, getterName, {
        get: () => {
          return fn(this.state);
        }
      });
    });
    
    // 对上面的mutations 改造下
    forEachValue(mutations, (mutationName, fn) => {
      this.mutations[mutationName] = (payload) => {
        fn(this.state, payload);
      }
    })
  ```
7. 通过触发 `action` 异步跟新转态

  ```js
    action 异步提交更改，异步操作完之后提交到mutation中
    例：
    actions: {
      asyncMinus({ commit }, payload) {
        setTimeout(() => {
          commit('syncMinus', payload);
        }, 1000);
      }
    }
    mutations: {
      syncMinus(state, payload) {
        state.age -= payload;
      }
    }
    
    // 也是一个发布订阅模式
    class Store {
      constructor(options ={}) {
        let actions = options.actions;
        this.actions = {};
        forEachValue(actions, (actionName, fn) => {
          this.actions[actionName] = (payload) => {
            fn(this, payload);
          }
        });
      }
      dispatch = (actionName, payload) => {
        // 源码里有一个变量，来控制是否是通过mutation 来更新的转态，不是会抛个警告
        this.actions[actionName](payload);
      }
    }
  ```

  <details>
  <summary>vuex简单实现</summary>

  ```js
    let Vue;
    const forEachValue = (obj = {}, fn) => {
      return Object.keys(obj || {}).forEach(key => {
        fn(key, obj[key]);
      })
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
    
        let getters = options.getters;
        this.getters = {};
        forEachValue(getters, (getterName, fn) => {
          Object.defineProperty(this.getters, getterName, {
            get: () => {
              return fn(this.state);
            }
          });
        });
    
        // mutations
        let mutations = options.mutations;
        this._mutations = {};
        // 订阅
        forEachValue(mutations, (mutationName, fn) => {
          this._mutations[mutationName] = (paylod) => {
            fn(this.state, paylod);
          }
        });
    
        // actions
        let actions = options.actions;
        this._actions = {};
        forEachValue(actions, (actionName, fn) => {
          this._actions[actionName] = (paylod) => {
            fn(this, paylod);
          }
        });
      }
      // 发布
      commit = (mutationName, paylod) => {
        this._mutations[mutationName](paylod);
      }
      dispatch = (actionName, paylod) => {
        this._actions[actionName](paylod);
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
  ```
  </details>

8. modules的实现

  主要是将mosules里面的数据格式化成我们想要的格式
  ```js
  {
    _modules: {
      root:
      state: {__ob__: Observer}
      _children: {}
      _rawModule: {modules: {…}, state: {…}, getters: {…}, mutations: {…}, actions: {…}
    }
  }
  ```

  - 数据格式化

    ```js
    // 在 Store 中定义modules
    this._modules = new ModuleCollection(options); // 把数据格式化成我们想要的结构
    
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
    ```
  - 安装模块

    ```js
      installModule(this, this.state, [], this._modules.root);
      
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
    ```
    
  <details>
  <summary>vuex完整实现</summary>

  ```js
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
  ```
  </details>
