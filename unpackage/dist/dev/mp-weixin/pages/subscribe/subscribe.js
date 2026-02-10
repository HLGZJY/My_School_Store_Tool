"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      subscribed: [],
      recommended: []
    };
  },
  onLoad() {
    this.loadSubscribeSources();
  },
  methods: {
    async loadSubscribeSources() {
      try {
        const userId = this.$store.state.user.userId;
        const res = await common_vendor.Vs.callFunction({
          name: "getSubscribeSources",
          data: { userId }
        });
        if (res.result.code === 0) {
          this.subscribed = res.result.data.subscribed || [];
          this.recommended = res.result.data.recommended || [];
        }
      } catch (error) {
        console.error("加载订阅源失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      }
    },
    isSubscribed(sourceId) {
      return this.subscribed.some((s) => s._id === sourceId);
    },
    async toggleSubscribe(source) {
      const userId = this.$store.state.user.userId;
      if (!userId) {
        common_vendor.index.showToast({
          title: "请先登录",
          icon: "none"
        });
        return;
      }
      const isSub = this.isSubscribed(source._id);
      const action = isSub ? "unsubscribe" : "subscribe";
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "toggleSubscribe",
          data: {
            userId,
            sourceId: source._id,
            action
          }
        });
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: isSub ? "已取消订阅" : "订阅成功",
            icon: "success"
          });
          this.loadSubscribeSources();
        }
      } catch (error) {
        console.error("订阅操作失败:", error);
        common_vendor.index.showToast({
          title: "操作失败",
          icon: "none"
        });
      }
    },
    unsubscribe(sourceId) {
      this.toggleSubscribe(this.subscribed.find((s) => s._id === sourceId));
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.subscribed.length > 0
  }, $data.subscribed.length > 0 ? {
    b: common_vendor.f($data.subscribed, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.t(item.description),
        c: common_vendor.o(($event) => $options.unsubscribe(item._id), item._id),
        d: item._id
      };
    })
  } : {}, {
    c: $data.recommended.length > 0
  }, $data.recommended.length > 0 ? {
    d: common_vendor.f($data.recommended, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.t(item.description),
        c: common_vendor.t($options.isSubscribed(item._id) ? "已订阅" : "订阅"),
        d: $options.isSubscribed(item._id) ? 1 : "",
        e: common_vendor.o(($event) => $options.toggleSubscribe(item), item._id),
        f: item._id
      };
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b281fdea"]]);
wx.createPage(MiniProgramPage);
