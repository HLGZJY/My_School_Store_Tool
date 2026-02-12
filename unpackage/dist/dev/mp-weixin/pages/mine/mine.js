"use strict";
const common_vendor = require("../../common/vendor.js");
const UserCard = () => "./components/UserCard.js";
const StatsCard = () => "./components/StatsCard.js";
const PAGE_MAP = {
  collect: "/pages/collection/collection",
  read: "/pages/history/history",
  subscribe: "/pages/subscribe/subscribe",
  message: "/pages/message/message",
  about: "/pages/about/about"
};
const _sfc_main = {
  name: "Mine",
  components: { UserCard, StatsCard },
  data: () => ({
    userInfo: {},
    unreadCount: 0,
    cacheSize: "0MB"
  }),
  onLoad() {
    this.calculateCacheSize();
    this.applySystemSettings();
  },
  onShow() {
    this.loadData();
    this.loadUnread();
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
    applySystemSettings() {
      common_vendor.index.getSystemInfoSync();
      if (common_vendor.index.onThemeChange) {
        common_vendor.index.onThemeChange((res) => {
          if (res.theme === "dark") {
            common_vendor.index.setStorageSync("darkMode", true);
          } else {
            common_vendor.index.removeStorageSync("darkMode");
          }
        });
      }
    },
    calculateCacheSize() {
      try {
        const res = common_vendor.index.getStorageInfoSync();
        const size = res.currentSize;
        const sizeMB = (size / 1024).toFixed(2);
        this.cacheSize = `${sizeMB}MB`;
      } catch (error) {
        console.error("计算缓存大小失败:", error);
      }
    },
    goToPage(name) {
      const url = PAGE_MAP[name];
      if (url)
        common_vendor.index.navigateTo({ url });
    },
    goToRole() {
      common_vendor.index.navigateTo({
        url: `/pages/role/role?switch=1&currentRole=${this.userInfo.role || ""}`
      });
    },
    goToAbout() {
      common_vendor.index.navigateTo({ url: "/pages/about/about" });
    },
    clearCache() {
      common_vendor.index.showModal({
        title: "清除缓存",
        // content: '清除该用户名下的所有记录，包括收藏、阅读历史、搜索历史、订阅信息等。请谨慎选择！',
        success: (res) => {
          if (res.confirm) {
            try {
              common_vendor.index.clearStorageSync();
              common_vendor.index.showToast({ title: "缓存已清除", icon: "success" });
              this.calculateCacheSize();
            } catch (error) {
              console.error("清除缓存失败:", error);
              common_vendor.index.showToast({ title: "清除失败", icon: "none" });
            }
          }
        }
      });
    },
    contactUs() {
      common_vendor.index.showModal({
        title: "联系我们",
        content: "如遇到问题，请通过以下方式联系我们：\n邮箱：support@example.com",
        showCancel: false
      });
    },
    deleteAccount() {
      common_vendor.index.showModal({
        title: "注销账号",
        content: "注销后将删除您的所有数据（收藏、阅读历史、搜索历史、订阅信息等），且无法恢复。确定要注销吗？",
        confirmText: "确定注销",
        confirmColor: "#EF4444",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.index.showModal({
              title: "再次确认",
              content: "注销后您将无法找回任何数据，请确认是否继续？",
              confirmText: "确认注销",
              confirmColor: "#EF4444",
              async success(res2) {
                if (res2.confirm) {
                  common_vendor.index.showLoading({ title: "注销中..." });
                  try {
                    const userId = common_vendor.index.getStorageSync("userId");
                    const openid = common_vendor.index.getStorageSync("openid");
                    if (!userId || !openid) {
                      common_vendor.index.hideLoading();
                      common_vendor.index.showToast({ title: "用户未登录", icon: "none" });
                      return;
                    }
                    const res3 = await common_vendor.Vs.callFunction({
                      name: "deleteUserAccount",
                      data: { userId, openid }
                    });
                    if (res3.result.code === 0) {
                      common_vendor.index.showToast({ title: "账号已注销", icon: "success" });
                      setTimeout(() => {
                        common_vendor.index.clearStorageSync();
                        common_vendor.index.reLaunch({ url: "/pages/login/login" });
                      }, 1500);
                    } else {
                      common_vendor.index.showToast({ title: res3.result.message || "注销失败", icon: "none" });
                    }
                  } catch (error) {
                    console.error("注销失败:", error);
                    common_vendor.index.showToast({ title: "注销失败，请重试", icon: "none" });
                  } finally {
                    common_vendor.index.hideLoading();
                  }
                }
              }
            });
          }
        }
      });
    },
    logout() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定退出登录吗？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.clearStorageSync();
            this.$store.commit("user/clear");
            common_vendor.index.reLaunch({ url: "/pages/login/login" });
          }
        }
      });
    }
  }
};
if (!Array) {
  const _component_UserCard = common_vendor.resolveComponent("UserCard");
  const _component_StatsCard = common_vendor.resolveComponent("StatsCard");
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  (_component_UserCard + _component_StatsCard + _component_uni_icons)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o($options.goToRole),
    b: common_vendor.o($options.goToRole),
    c: common_vendor.p({
      avatar: _ctx.userInfo.avatar,
      nickname: _ctx.userInfo.nickname,
      role: _ctx.userInfo.role,
      roleDetail: _ctx.userInfo.roleDetail
    }),
    d: common_vendor.o($options.goToPage),
    e: common_vendor.p({
      type: "notification",
      size: "20",
      color: "#00D4AA"
    }),
    f: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    g: common_vendor.o(($event) => $options.goToPage("subscribe")),
    h: common_vendor.p({
      type: "email",
      size: "20",
      color: "#00D4AA"
    }),
    i: _ctx.unreadCount > 0
  }, _ctx.unreadCount > 0 ? {
    j: common_vendor.t(_ctx.unreadCount)
  } : {}, {
    k: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    l: common_vendor.o(($event) => $options.goToPage("message")),
    m: common_vendor.p({
      type: "info",
      size: "20",
      color: "#00D4AA"
    }),
    n: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    o: common_vendor.o((...args) => $options.goToAbout && $options.goToAbout(...args)),
    p: common_vendor.p({
      type: "trash",
      size: "20",
      color: "#00D4AA"
    }),
    q: common_vendor.t(_ctx.cacheSize),
    r: common_vendor.o((...args) => $options.clearCache && $options.clearCache(...args)),
    s: common_vendor.p({
      type: "chat",
      size: "20",
      color: "#00D4AA"
    }),
    t: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    v: common_vendor.o((...args) => $options.contactUs && $options.contactUs(...args)),
    w: common_vendor.p({
      type: "close",
      size: "20",
      color: "#EF4444"
    }),
    x: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    y: common_vendor.o((...args) => $options.deleteAccount && $options.deleteAccount(...args)),
    z: common_vendor.o((...args) => $options.logout && $options.logout(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7c2ebfa5"]]);
wx.createPage(MiniProgramPage);
