"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
const store_index = require("./store/index.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/discover/discover.js";
  "./pages/mine/mine.js";
  "./pages/detail/detail.js";
  "./pages/role/role.js";
  "./pages/role/role-detail.js";
  "./pages/collection/collection.js";
  "./pages/history/history.js";
  "./pages/message/message.js";
  "./pages/subscribe/subscribe.js";
  "./pages/about/about.js";
  "./pages/login/login.js";
  "./pages/search/search.js";
  "./pages/admin/dashboard.js";
  "./pages/admin/review.js";
  "./pages/admin/sources.js";
  "./pages/admin/users.js";
}
const _sfc_main = {
  onLaunch() {
    console.log("App Launch");
    this.initCloud();
    this.checkLoginStatus();
  },
  onShow() {
    console.log("App Show");
  },
  onHide() {
    console.log("App Hide");
  },
  methods: {
    initCloud() {
      console.log("Cloud initialized");
    },
    checkLoginStatus() {
      const openid = common_vendor.index.getStorageSync("openid");
      const token = common_vendor.index.getStorageSync("token");
      if (openid && token) {
        this.$store.commit("user/setUserId", openid);
        this.$store.commit("user/setToken", token);
        this.getUserInfoAndCheckRole(openid);
      } else {
        common_vendor.index.reLaunch({
          url: "/pages/login/login"
        });
      }
    },
    async getUserInfoAndCheckRole(userId) {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "login",
          data: { code: "restore" }
          // 使用特殊code触发查询模式
        });
        if (res.result.code === 0) {
          const { userInfo, hasRole } = res.result.data;
          this.$store.commit("user/setUserInfo", userInfo);
          if (!hasRole) {
            common_vendor.index.reLaunch({
              url: "/pages/role/role"
            });
          }
        }
      } catch (error) {
        console.error("获取用户信息失败:", error);
      }
    }
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  app.config.globalProperties.$store = store_index.store;
  return {
    app,
    Pinia: common_vendor.createPinia()
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
