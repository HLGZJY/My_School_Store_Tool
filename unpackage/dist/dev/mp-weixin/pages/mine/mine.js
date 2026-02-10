"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {},
      stats: {
        collectCount: 0,
        readCount: 0
      },
      unreadCount: 0
    };
  },
  onLoad() {
    this.loadUserInfo();
    this.loadStats();
    this.loadUnreadCount();
  },
  onShow() {
    this.loadUnreadCount();
  },
  methods: {
    async loadUserInfo() {
      try {
        const userId = this.$store.state.user.userId;
        if (!userId)
          return;
        const res = await common_vendor.Vs.callFunction({
          name: "getUserInfo",
          data: { userId }
        });
        if (res.result.code === 0) {
          this.userInfo = res.result.data;
        }
      } catch (error) {
        console.error("加载用户信息失败:", error);
      }
    },
    async loadStats() {
      try {
        const userId = this.$store.state.user.userId;
        if (!userId)
          return;
        const res = await common_vendor.Vs.callFunction({
          name: "getUserInfo",
          data: { userId }
        });
        if (res.result.code === 0) {
          this.stats = res.result.data.stats;
        }
      } catch (error) {
        console.error("加载统计信息失败:", error);
      }
    },
    async loadUnreadCount() {
      try {
        const userId = this.$store.state.user.userId;
        if (!userId)
          return;
        const res = await common_vendor.Vs.callFunction({
          name: "getMessages",
          data: {
            userId,
            type: "unread",
            page: 1,
            pageSize: 1
          }
        });
        if (res.result.code === 0) {
          this.unreadCount = res.result.data.unreadCount || 0;
        }
      } catch (error) {
        console.error("加载未读消息数失败:", error);
      }
    },
    getRoleName(role) {
      const roleMap = {
        "student": "学生",
        "teacher": "教师",
        "admin": "行政人员"
      };
      return roleMap[role] || "";
    },
    goToCollection() {
      common_vendor.index.navigateTo({
        url: "/pages/collection/collection"
      });
    },
    goToHistory() {
      common_vendor.index.navigateTo({
        url: "/pages/history/history"
      });
    },
    goToSubscribe() {
      common_vendor.index.navigateTo({
        url: "/pages/subscribe/subscribe"
      });
    },
    goToMessage() {
      common_vendor.index.navigateTo({
        url: "/pages/message/message"
      });
    },
    goToSettings() {
      common_vendor.index.navigateTo({
        url: "/pages/settings/settings"
      });
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.userInfo.avatar || "/static/logo.png",
    b: common_vendor.t($data.userInfo.nickname || "未登录"),
    c: $data.userInfo.role
  }, $data.userInfo.role ? {
    d: common_vendor.t($options.getRoleName($data.userInfo.role))
  } : {}, {
    e: common_vendor.t($data.stats.collectCount || 0),
    f: common_vendor.o((...args) => $options.goToCollection && $options.goToCollection(...args)),
    g: common_vendor.t($data.stats.readCount || 0),
    h: common_vendor.o((...args) => $options.goToHistory && $options.goToHistory(...args)),
    i: common_vendor.p({
      type: "notification",
      size: "20",
      color: "#00D4AA"
    }),
    j: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    k: common_vendor.o((...args) => $options.goToSubscribe && $options.goToSubscribe(...args)),
    l: common_vendor.p({
      type: "email",
      size: "20",
      color: "#00D4AA"
    }),
    m: $data.unreadCount > 0
  }, $data.unreadCount > 0 ? {
    n: common_vendor.t($data.unreadCount)
  } : {}, {
    o: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    p: common_vendor.o((...args) => $options.goToMessage && $options.goToMessage(...args)),
    q: common_vendor.p({
      type: "gear",
      size: "20",
      color: "#00D4AA"
    }),
    r: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    s: common_vendor.o((...args) => $options.goToSettings && $options.goToSettings(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7c2ebfa5"]]);
wx.createPage(MiniProgramPage);
