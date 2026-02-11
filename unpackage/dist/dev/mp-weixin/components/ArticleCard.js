"use strict";
const common_vendor = require("../common/vendor.js");
const _sfc_main = {
  name: "ArticleCard",
  props: {
    article: {
      type: Object,
      required: true
    }
  },
  methods: {
    onClick() {
      this.$emit("click", this.article);
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = /* @__PURE__ */ new Date();
      const diff = now - date;
      const hours = Math.floor(diff / (1e3 * 60 * 60));
      if (hours < 1)
        return "刚刚";
      if (hours < 24)
        return `${hours}小时前`;
      if (hours < 48)
        return "昨天";
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b;
  return common_vendor.e({
    a: $props.article.urgency === "high"
  }, $props.article.urgency === "high" ? {} : {}, {
    b: common_vendor.t($props.article.title),
    c: common_vendor.t($props.article.sourceName),
    d: common_vendor.t($options.formatTime($props.article.publishTime)),
    e: common_vendor.t(((_a = $props.article.stats) == null ? void 0 : _a.viewCount) || 0),
    f: common_vendor.f(((_b = $props.article.tags) == null ? void 0 : _b.role) || [], (tag, k0, i0) => {
      return {
        a: common_vendor.t(tag),
        b: tag
      };
    }),
    g: $props.article.urgency === "medium"
  }, $props.article.urgency === "medium" ? {} : {}, {
    h: common_vendor.o((...args) => $options.onClick && $options.onClick(...args))
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-11ccd111"]]);
wx.createComponent(Component);
