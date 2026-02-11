"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "SearchSuggest",
  props: {
    history: {
      type: Array,
      default: () => []
    },
    hotKeywords: {
      type: Array,
      default: () => []
    }
  },
  emits: ["search", "clear"]
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $props.history.length > 0
  }, $props.history.length > 0 ? {
    b: common_vendor.o(($event) => _ctx.$emit("clear")),
    c: common_vendor.f($props.history, (item, k0, i0) => {
      return {
        a: common_vendor.t(item),
        b: item,
        c: common_vendor.o(($event) => _ctx.$emit("search", item), item)
      };
    })
  } : {}, {
    d: common_vendor.f($props.hotKeywords, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.keyword),
        b: item.keyword,
        c: item.count > 100 ? 1 : "",
        d: common_vendor.o(($event) => _ctx.$emit("search", item.keyword), item.keyword)
      };
    })
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f03278b9"]]);
wx.createComponent(Component);
