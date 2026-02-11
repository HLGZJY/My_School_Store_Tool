"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "MenuList",
  props: {
    unreadCount: { type: Number, default: 0 }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      type: "notification",
      size: "20",
      color: "#00D4AA"
    }),
    b: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    c: common_vendor.o(($event) => _ctx.$emit("click", "subscribe")),
    d: common_vendor.p({
      type: "email",
      size: "20",
      color: "#00D4AA"
    }),
    e: $props.unreadCount > 0
  }, $props.unreadCount > 0 ? {
    f: common_vendor.t($props.unreadCount)
  } : {}, {
    g: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    h: common_vendor.o(($event) => _ctx.$emit("click", "message")),
    i: common_vendor.p({
      type: "gear",
      size: "20",
      color: "#00D4AA"
    }),
    j: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    k: common_vendor.o(($event) => _ctx.$emit("click", "settings"))
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-92fcc5ab"]]);
wx.createComponent(Component);
