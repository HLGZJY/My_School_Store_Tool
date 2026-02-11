"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "Timeline",
  props: {
    timeline: {
      type: Array,
      default: () => []
    }
  },
  emits: ["toggle", "detail"],
  data() {
    return {
      expandedItem: null
    };
  },
  methods: {
    async toggleItem(item) {
      if (this.expandedItem && this.expandedItem.timestamp === item.timestamp) {
        item.expanded = !item.expanded;
        if (!item.expanded) {
          this.expandedItem = null;
        }
      } else {
        if (this.expandedItem) {
          this.expandedItem.expanded = false;
        }
        item.expanded = true;
        this.expandedItem = item;
        this.$emit("toggle", item);
      }
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
    },
    goToDetail(id) {
      this.$emit("detail", id);
    }
  },
  watch: {
    timeline: {
      handler(newVal) {
        if (this.expandedItem) {
          const found = newVal.find((t) => t.timestamp === this.expandedItem.timestamp);
          if (found) {
            this.expandedItem = found;
          }
        }
      },
      deep: true
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($props.timeline, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.date),
        b: common_vendor.t(item.count),
        c: "f671c5e6-0-" + i0,
        d: common_vendor.p({
          type: item.expanded ? "up" : "down",
          size: "16",
          color: "#A0AEC0"
        }),
        e: item.timestamp,
        f: common_vendor.o(($event) => $options.toggleItem(item), item.timestamp)
      };
    }),
    b: $data.expandedItem
  }, $data.expandedItem ? {
    c: common_vendor.f($data.expandedItem.articles, (article, k0, i0) => {
      return {
        a: common_vendor.t(article.title),
        b: common_vendor.t($options.formatTime(article.publishTime)),
        c: article._id,
        d: common_vendor.o(($event) => $options.goToDetail(article._id), article._id)
      };
    })
  } : {});
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f671c5e6"]]);
wx.createComponent(Component);
