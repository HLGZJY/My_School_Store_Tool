"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "SearchHeader",
  props: {
    keyword: {
      type: String,
      default: ""
    },
    focus: {
      type: Boolean,
      default: true
    }
  },
  emits: ["update:keyword", "search", "back"]
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o(($event) => _ctx.$emit("back")),
    b: common_vendor.p({
      type: "back",
      size: "20",
      color: "#0A2540"
    }),
    c: $props.keyword,
    d: $props.focus,
    e: common_vendor.o(($event) => _ctx.$emit("search")),
    f: common_vendor.o(($event) => _ctx.$emit("update:keyword", $event.detail.value)),
    g: common_vendor.o(($event) => _ctx.$emit("search"))
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c7ad7d98"]]);
wx.createComponent(Component);
