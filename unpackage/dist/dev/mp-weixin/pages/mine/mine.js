"use strict";
const common_vendor = require("../../common/vendor.js");
const UserCard = () => "./components/UserCard.js";
const StatsCard = () => "./components/StatsCard.js";
const MenuList = () => "./components/MenuList.js";
const PAGE_MAP = {
  collect: "/pages/collection/collection",
  read: "/pages/history/history",
  subscribe: "/pages/subscribe/subscribe",
  message: "/pages/message/message",
  settings: "/pages/settings/settings"
};
const _sfc_main = {
  name: "Mine",
  components: { UserCard, StatsCard, MenuList },
  data: () => ({
    userInfo: {},
    stats: { collectCount: 0, readCount: 0 },
    unreadCount: 0
  }),
  onLoad() {
    this.loadData();
    common_vendor.index.$on("collectChange", this.refreshStats);
  },
  onUnload() {
    common_vendor.index.$off("collectChange", this.refreshStats);
  },
  onShow() {
    this.loadUnread();
    this.loadData();
  },
  methods: {
    async loadData() {
      const openid = this.$store.state.user.userId || common_vendor.index.getStorageSync("userId");
      if (!openid)
        return;
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getUserInfo",
          data: { userId: openid }
        });
        if (res.result.code === 0) {
          this.userInfo = res.result.data;
          this.stats = res.result.data.stats || {};
        }
      } catch (e) {
        console.error("加载用户信息失败:", e);
      }
    },
    async loadUnread() {
      const openid = this.$store.state.user.userId || common_vendor.index.getStorageSync("userId");
      if (!openid)
        return;
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getMessages",
          data: { userId: openid, type: "unread" }
        });
        if (res.result.code === 0) {
          this.unreadCount = res.result.data.unreadCount || 0;
        }
      } catch (e) {
        console.error("加载未读消息数失败:", e);
      }
    },
    goToPage(name) {
      const url = PAGE_MAP[name];
      if (url)
        common_vendor.index.navigateTo({ url });
    },
    goToRole() {
      common_vendor.index.navigateTo({ url: "/pages/role/role" });
    },
    refreshStats() {
      this.loadData();
    }
  }
};
if (!Array) {
  const _component_UserCard = common_vendor.resolveComponent("UserCard");
  const _component_StatsCard = common_vendor.resolveComponent("StatsCard");
  const _component_MenuList = common_vendor.resolveComponent("MenuList");
  (_component_UserCard + _component_StatsCard + _component_MenuList)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o($options.goToRole),
    b: common_vendor.p({
      avatar: _ctx.userInfo.avatar,
      nickname: _ctx.userInfo.nickname || "未登录",
      role: _ctx.userInfo.role
    }),
    c: common_vendor.o($options.goToPage),
    d: common_vendor.p({
      collectCount: _ctx.stats.collectCount,
      readCount: _ctx.stats.readCount
    }),
    e: common_vendor.o($options.goToPage),
    f: common_vendor.p({
      unreadCount: _ctx.unreadCount
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7c2ebfa5"]]);
wx.createPage(MiniProgramPage);
