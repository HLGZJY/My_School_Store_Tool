"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "SubscribeManager",
  props: {
    subscribed: {
      type: Array,
      default: () => []
    },
    recommended: {
      type: Array,
      default: () => []
    }
  },
  emits: ["subscribe", "unsubscribe", "more"],
  methods: {
    subscribe(item) {
      this.$emit("subscribe", item);
    },
    unsubscribe(item) {
      this.$emit("unsubscribe", item);
    },
    viewMore() {
      this.$emit("more");
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.viewMore && $options.viewMore(...args)),
    b: common_vendor.f($props.subscribed, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.o(($event) => $options.unsubscribe(item), item.id),
        c: item.id
      };
    }),
    c: common_vendor.f($props.recommended, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.o(($event) => $options.subscribe(item), item.id),
        c: item.id
      };
    })
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-e5bbb878"]]);
wx.createComponent(Component);
