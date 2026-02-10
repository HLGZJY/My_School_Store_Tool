"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      currentTab: 0,
      tabs: [
        { name: "全部", category: "" },
        { name: "通知公告", category: "notice" },
        { name: "学术动态", category: "academic" },
        { name: "社团活动", category: "activity" },
        { name: "生活服务", category: "service" }
      ]
    };
  },
  methods: {
    onTabChange(index) {
      this.currentTab = index;
      console.log("切换到:", this.tabs[index].name);
    },
    goToSearch() {
      console.log("跳转到搜索页");
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.p({
      type: "search",
      size: "18",
      color: "#A0AEC0"
    }),
    b: common_vendor.o((...args) => $options.goToSearch && $options.goToSearch(...args)),
    c: common_vendor.f($data.tabs, (tab, index, i0) => {
      return {
        a: common_vendor.t(tab.name),
        b: index,
        c: $data.currentTab === index ? 1 : "",
        d: common_vendor.o(($event) => $options.onTabChange(index), index)
      };
    }),
    d: common_vendor.f(3, (i, k0, i0) => {
      return {
        a: common_vendor.t(i),
        b: i
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
