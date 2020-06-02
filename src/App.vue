<template>
  <div>
    test:{{$store.state.age}} <br/>
    getters: {{ $store.getters.getAge}} <br/>
    <button @click="asyncAddHandler">Add</button>
    <button @click="syncMinusHandler">Minus</button> <br/>
    {{$store.getters.computedC}}
    <!-- {{$store.state.a.b}} -->
  </div>
</template>

<script>
export default {
  mounted() {
    console.log(this.$store)
    // setInterval(() => {
    //   this.$store.state.age += 1;
    // }, 1000)
  },
  methods: {
    asyncAddHandler() {
      this.$store.commit('asyncAdd', 10);
    },
    syncMinusHandler () {
      this.$store.dispatch('syncMinus', 1)
    }
  },
}
</script>

