import { defineStore } from "pinia";

export const useDragBoxStore = defineStore("dragBox", {
  state: () => ({
    w: 1,
    h: 1,
    x: 0,
    y: 0,
    img: "",
    resizing: false,
    active: true,
    show: false,
  }),
  getters: {
  },
  actions: {},
});
