import Vue from 'vue'
import Vuex from './vuex'

Vue.use(Vuex) // install

const presite = (store) => {
  store.subscribe((mutation, state) => {
    console.log(state);
  })
}

export default new Vuex.Store({
  plugins: [
    presite
  ],
  modules: {
    a: {
      state: {
        a: 1
      },
      modules: {
        c: {
          namespaced: true,
          state: {
            c: 3
          },
          getters: { // 所有的getters都会定义到根上
            computedC (state) {
              return state.c + 100;
            }
          },
          mutations: {
            // this.mutation[async] = [fn, fn]
            asyncAdd(state, paylod) {
              console.log('add');
            }
          }
        }
      }
    },
    b: {
      state: {
        b: 2
      }
    }
  },
  state: {
    age: 18
  },
  getters: {
    getAge(state) {
      return state.age + 10;
    }
  },
  mutations: {
    asyncAdd(state, paylod) {
      state.age += paylod;
    },
    asyncMinus(state, paylod) {
      state.age -= paylod
    }
  },
  actions: {
    syncMinus({ commit }, paylod) {
      setTimeout(() => {
        commit('asyncMinus', paylod);
      }, 1000);
    }
  }
})
