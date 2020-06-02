let Vue;
const forEachValue = (obj, fn) => {
  return Object.keys(obj || {}).forEach(key => {
    fn(key, obj[key]);
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
    let getters = options.getters;
    this.getters = {};
    forEachValue(getters, (getterName, fn) => {
      Object.defineProperty(this.getters, getterName, {
        get: () => {
          return fn(this.state);
        }
      });
    })
    // Object.keys(getters).forEach(getterName => {
    //   Object.defineProperty(this.getters, getterName, {
    //     get: () => {
    //       return getters[getterName](this.state);
    //     }
    //   });
    // });

    let mutations = options.mutations;
    this.mutations = {};
    forEachValue(mutations, (mutationName, fn) => {
      this.mutations[mutationName] = (payload) => {
        fn(this.state, payload);
      }
    })
    // Object.keys(mutations).forEach(mutationName => {
    //   this.mutations[mutationName] = (payload) => {
    //     mutations[mutationName](this.state, payload);
    //   }
    // });

    let actions = options.actions;
    this.actions = {};
    forEachValue(actions, (actionName, fn) => {
      this.actions[actionName] = (payload) => {
        fn(this, payload);
      }
    });
  }
  dispatch = (actionName, payload) => {
    this.actions[actionName](payload)
  }
  commit = (mutationName, payload) => {
    this.mutations[mutationName](payload);
  }
  get state () {
    return this._vm.state;
  }
};
const install = function (_Vue) {
  Vue = _Vue;
  Vue.mixin({
    beforeCreate() {
      if (this.$options && this.$options.store) {
        this.$store = this.$options.store;
      } else {
        this.$store = this.$parent && this.$parent.$store;
      }
    }
  })
}

export default {
  install,
  Store
}