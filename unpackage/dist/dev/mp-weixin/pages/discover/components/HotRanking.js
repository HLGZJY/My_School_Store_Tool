"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "HotRanking",
  props: {
    ranking: {
      type: Array,
      default: () => []
    }
  },
  emits: ["more", "detail"],
  methods: {
    viewMore() {
      this.$emit("more");
    },
    goToDetail(id) {
      this.$emit("detail", id);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.viewMore && $options.viewMore(...args)),
    b: common_vendor.f($props.ranking, (item, index, i0) => {
      return {
        a: common_vendor.t(index + 1),
        b: common_vendor.n("rank-" + (index + 1)),
        c: common_vendor.t(item.title),
        d: common_vendor.t(item.count),
        e: item._id,
        f: common_vendor.o(($event) => $options.goToDetail(item._id), item._id)
      };
    })
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b95e4132"]]);
wx.createComponent(Component);
