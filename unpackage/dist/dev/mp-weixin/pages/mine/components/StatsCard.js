"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "StatsCard"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o(($event) => _ctx.$emit("click", "collect")),
    b: common_vendor.o(($event) => _ctx.$emit("click", "read"))
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-32d9cf9b"]]);
wx.createComponent(Component);
