"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      adminInfo: {},
      stats: {
        totalArticles: 0,
        todayArticles: 0,
        pendingReview: 0,
        sources: 0
      },
      recentLogs: []
    };
  },
  onLoad() {
    this.checkAdminAuth();
    this.loadAdminInfo();
    this.loadStats();
  },
  onShow() {
    this.loadStats();
  },
  methods: {
    // 检查管理员权限
    checkAdminAuth() {
      const entryType = common_vendor.index.getStorageSync("entryType");
      if (entryType !== "admin") {
        common_vendor.index.showToast({
          title: "无管理员权限",
          icon: "none"
        });
        setTimeout(() => {
          common_vendor.index.reLaunch({
            url: "/pages/login/login"
          });
        }, 1500);
      }
    },
    // 加载管理员信息
    loadAdminInfo() {
      const userInfo = this.$store.state.user.userInfo;
      if (userInfo) {
        this.adminInfo = userInfo;
      }
    },
    // 加载统计数据
    async loadStats() {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "adminStats"
        });
        if (res.result.code === 0) {
          this.stats = res.result.data;
        }
      } catch (e) {
        console.error("加载统计数据失败:", e);
      }
    },
    // 手动采集
    async handleSync() {
      common_vendor.index.showModal({
        title: "确认采集",
        content: "确定要立即执行数据采集吗？",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "采集中..." });
            try {
              const res2 = await common_vendor.Vs.callFunction({
                name: "syncSource"
              });
              common_vendor.index.hideLoading();
              if (res2.result.code === 0) {
                common_vendor.index.showToast({
                  title: `采集完成，新增${res2.result.data.newArticles}篇`,
                  icon: "success"
                });
                this.loadStats();
              } else {
                common_vendor.index.showToast({
                  title: res2.result.message || "采集失败",
                  icon: "none"
                });
              }
            } catch (e) {
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({
                title: "采集失败",
                icon: "none"
              });
            }
          }
        }
      });
    },
    // 跳转审核页面
    goToReview() {
      common_vendor.index.navigateTo({
        url: "/pages/admin/review"
      });
    },
    // 跳转数据源管理
    goToSources() {
      common_vendor.index.navigateTo({
        url: "/pages/admin/sources"
      });
    },
    // 跳转用户管理
    goToUsers() {
      common_vendor.index.navigateTo({
        url: "/pages/admin/users"
      });
    },
    // 退出登录
    handleLogout() {
      common_vendor.index.showModal({
        title: "确认退出",
        content: "确定要退出管理端吗？",
        success: (res) => {
          if (res.confirm) {
            this.$store.commit("user/clear");
            common_vendor.index.clearStorageSync();
            common_vendor.index.reLaunch({
              url: "/pages/login/login"
            });
          }
        }
      });
    },
    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp)
        return "";
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.adminInfo.nickname || "管理员"),
    b: common_vendor.o((...args) => $options.handleLogout && $options.handleLogout(...args)),
    c: common_vendor.t($data.stats.totalArticles),
    d: common_vendor.t($data.stats.todayArticles),
    e: common_vendor.t($data.stats.pendingReview),
    f: common_vendor.t($data.stats.sources),
    g: common_vendor.p({
      type: "refresh",
      size: "24",
      color: "#07C160"
    }),
    h: common_vendor.o((...args) => $options.handleSync && $options.handleSync(...args)),
    i: common_vendor.p({
      type: "flag",
      size: "24",
      color: "#FF9500"
    }),
    j: $data.stats.pendingReview > 0
  }, $data.stats.pendingReview > 0 ? {
    k: common_vendor.t($data.stats.pendingReview)
  } : {}, {
    l: common_vendor.o((...args) => $options.goToReview && $options.goToReview(...args)),
    m: common_vendor.p({
      type: "link",
      size: "24",
      color: "#007AFF"
    }),
    n: common_vendor.o((...args) => $options.goToSources && $options.goToSources(...args)),
    o: common_vendor.p({
      type: "person",
      size: "24",
      color: "#5856D6"
    }),
    p: common_vendor.o((...args) => $options.goToUsers && $options.goToUsers(...args)),
    q: common_vendor.f($data.recentLogs, (item, index, i0) => {
      return {
        a: common_vendor.t($options.formatTime(item.time)),
        b: common_vendor.t(item.message),
        c: common_vendor.t(item.statusText),
        d: common_vendor.n(item.status),
        e: index
      };
    }),
    r: $data.recentLogs.length === 0
  }, $data.recentLogs.length === 0 ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-16cc67e3"]]);
wx.createPage(MiniProgramPage);
