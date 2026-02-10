"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      version: "1.0.0"
    };
  },
  onLoad() {
    const accountInfo = common_vendor.index.getAccountInfoSync();
    this.version = accountInfo.miniProgram.version;
  },
  methods: {
    openLink(type) {
      let content = "";
      if (type === "user-agreement") {
        content = "用户协议内容...";
      } else if (type === "privacy-policy") {
        content = "隐私政策内容...";
      }
      common_vendor.index.showModal({
        title: type === "user-agreement" ? "用户协议" : "隐私政策",
        content,
        showCancel: false
      });
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_assets._imports_0,
    b: common_vendor.t($data.version),
    c: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    d: common_vendor.o(($event) => $options.openLink("user-agreement")),
    e: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    f: common_vendor.o(($event) => $options.openLink("privacy-policy"))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-13a78ac6"]]);
wx.createPage(MiniProgramPage);
