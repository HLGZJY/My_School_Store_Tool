"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "StatsCard",
  props: {
    collectCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($props.collectCount),
    b: common_vendor.o(($event) => _ctx.$emit("click", "collect")),
    c: common_vendor.t($props.readCount),
    d: common_vendor.o(($event) => _ctx.$emit("click", "read"))
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-32d9cf9b"]]);
wx.createComponent(Component);
