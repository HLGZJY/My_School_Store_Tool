"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "TagCloud",
  props: {
    tags: {
      type: Array,
      default: () => []
    }
  },
  emits: ["search"],
  methods: {
    getTagSize(count) {
      if (this.tags.length === 0)
        return "14px";
      const counts = this.tags.map((t) => t.count);
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);
      if (minCount === maxCount)
        return "14px";
      const ratio = (count - minCount) / (maxCount - minCount);
      const minSize = 14;
      const maxSize = 18;
      return minSize + ratio * (maxSize - minSize) + "px";
    },
    searchTag(tagName) {
      this.$emit("search", tagName);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.f($props.tags, (tag, k0, i0) => {
      return {
        a: common_vendor.t(tag.name),
        b: tag.name,
        c: $options.getTagSize(tag.count),
        d: common_vendor.o(($event) => $options.searchTag(tag.name), tag.name)
      };
    })
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-a1ea358c"]]);
wx.createComponent(Component);
