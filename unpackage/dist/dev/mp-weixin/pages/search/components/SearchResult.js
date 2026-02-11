"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "SearchResult",
  props: {
    articles: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: true
    },
    keyword: {
      type: String,
      default: ""
    }
  },
  emits: ["loadMore", "detail"],
  methods: {
    highlightTitle(text) {
      if (!this.keyword)
        return text;
      const reg = new RegExp(this.keyword, "gi");
      return text.replace(reg, (match) => `<span class="highlight">${match}</span>`);
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  }
};
if (!Array) {
  const _component_uni_load_more = common_vendor.resolveComponent("uni-load-more");
  _component_uni_load_more();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $props.articles.length > 0
  }, $props.articles.length > 0 ? common_vendor.e({
    b: common_vendor.f($props.articles, (article, k0, i0) => {
      return {
        a: $options.highlightTitle(article.title),
        b: common_vendor.t(article.sourceName),
        c: common_vendor.t($options.formatTime(article.publishTime)),
        d: article._id,
        e: common_vendor.o(($event) => _ctx.$emit("detail", article._id), article._id)
      };
    }),
    c: $props.loading
  }, $props.loading ? {
    d: common_vendor.p({
      status: "loading"
    })
  } : {}, {
    e: !$props.hasMore && $props.articles.length > 0
  }, !$props.hasMore && $props.articles.length > 0 ? {} : {}) : {}, {
    f: $props.loading && $props.articles.length === 0
  }, $props.loading && $props.articles.length === 0 ? {
    g: common_vendor.p({
      status: "loading"
    })
  } : $props.articles.length === 0 ? {} : {}, {
    h: $props.articles.length === 0,
    i: common_vendor.o(($event) => _ctx.$emit("loadMore"))
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0abafb44"]]);
wx.createComponent(Component);
