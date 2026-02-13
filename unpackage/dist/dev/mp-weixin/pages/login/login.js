"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return "";
  },
  onLoad() {
    this.autoLogin();
  },
  methods: {
    async autoLogin() {
      var _a;
      const loginRes = await common_vendor.index.login({
        provider: "weixin"
      });
      try {
        common_vendor.index.showLoading({ title: "检测中..." });
        const res = await common_vendor.Vs.callFunction({
          name: "login",
          data: {
            code: loginRes.code,
            userInfo: null
            // null 表示只查询不创建
          }
        });
        console.log("登录结果:", res.result);
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          const data = res.result.data;
          if (data.needSelect) {
            this.showEntrySelector(data);
            return;
          }
          const { userId, openid, token, entryType } = data;
          const hasRole = ((_a = data.userInfo) == null ? void 0 : _a.role) ? true : false;
          this.$store.commit("user/setUserId", userId);
          this.$store.commit("user/setToken", token);
          this.$store.commit("user/setUserInfo", data.userInfo || data.adminInfo);
          this.$store.commit("user/setEntryType", entryType);
          common_vendor.index.setStorageSync("openid", openid);
          common_vendor.index.setStorageSync("token", token);
          common_vendor.index.setStorageSync("entryType", entryType);
          if (entryType === "admin") {
            common_vendor.index.showToast({
              title: "管理员登录成功",
              icon: "success"
            });
            setTimeout(() => {
              common_vendor.index.reLaunch({
                url: "/pages/admin/dashboard"
              });
            }, 1e3);
          } else if (!hasRole) {
            common_vendor.index.redirectTo({
              url: "/pages/role/role"
            });
          } else {
            common_vendor.index.showToast({
              title: "登录成功",
              icon: "success"
            });
            setTimeout(() => {
              common_vendor.index.switchTab({
                url: "/pages/index/index"
              });
            }, 1e3);
          }
        } else {
          console.log("需要新用户注册");
        }
      } catch (error) {
        console.error("自动登录失败:", error);
        common_vendor.index.hideLoading();
      }
    },
    // 显示入口选择器
    showEntrySelector(data) {
      common_vendor.index.showModal({
        title: "请选择入口",
        content: "您同时拥有用户和管理员身份，请选择要进入的端",
        confirmText: "管理端",
        cancelText: "客户端",
        success: async (res) => {
          var _a, _b, _c, _d, _e;
          const entryType = res.confirm ? "admin" : "user";
          common_vendor.index.setStorageSync("openid", ((_a = data.userInfo) == null ? void 0 : _a.openid) || ((_b = data.adminInfo) == null ? void 0 : _b.openid));
          common_vendor.index.setStorageSync("token", data.token);
          common_vendor.index.setStorageSync("entryType", entryType);
          this.$store.commit("user/setEntryType", entryType);
          if (entryType === "admin") {
            this.$store.commit("user/setUserId", (_c = data.adminInfo) == null ? void 0 : _c.adminId);
            this.$store.commit("user/setUserInfo", data.adminInfo);
            common_vendor.index.showToast({
              title: "进入管理端",
              icon: "success"
            });
            setTimeout(() => {
              common_vendor.index.reLaunch({
                url: "/pages/admin/dashboard"
              });
            }, 1e3);
          } else {
            this.$store.commit("user/setUserId", (_d = data.userInfo) == null ? void 0 : _d.userId);
            this.$store.commit("user/setUserInfo", data.userInfo);
            const hasRole = ((_e = data.userInfo) == null ? void 0 : _e.role) ? true : false;
            if (!hasRole) {
              common_vendor.index.redirectTo({
                url: "/pages/role/role"
              });
            } else {
              common_vendor.index.showToast({
                title: "进入客户端",
                icon: "success"
              });
              setTimeout(() => {
                common_vendor.index.switchTab({
                  url: "/pages/index/index"
                });
              }, 1e3);
            }
          }
        }
      });
    },
    onGetUserInfo(e) {
      if (e.detail.userInfo) {
        this.userInfo = e.detail.userInfo;
        this.login();
      } else {
        common_vendor.index.showToast({
          title: "需要授权才能继续使用",
          icon: "none"
        });
      }
    },
    async login() {
      var _a;
      common_vendor.index.showLoading({ title: "登录中..." });
      try {
        const loginRes = await common_vendor.index.login({
          provider: "weixin"
        });
        const res = await common_vendor.Vs.callFunction({
          name: "login",
          data: {
            code: loginRes.code,
            userInfo: this.userInfo
          }
        });
        if (res.result.code === 0) {
          const data = res.result.data;
          if (data.needSelect) {
            common_vendor.index.hideLoading();
            this.showEntrySelector(data);
            return;
          }
          const { userId, openid, token, entryType } = data;
          const hasRole = ((_a = data.userInfo) == null ? void 0 : _a.role) ? true : false;
          this.$store.commit("user/setUserId", userId);
          this.$store.commit("user/setToken", token);
          this.$store.commit("user/setUserInfo", data.userInfo || data.adminInfo);
          this.$store.commit("user/setEntryType", entryType);
          common_vendor.index.setStorageSync("openid", openid);
          common_vendor.index.setStorageSync("token", token);
          common_vendor.index.setStorageSync("entryType", entryType);
          common_vendor.index.hideLoading();
          if (entryType === "admin") {
            common_vendor.index.showToast({
              title: "管理员登录成功",
              icon: "success"
            });
            setTimeout(() => {
              common_vendor.index.reLaunch({
                url: "/pages/admin/dashboard"
              });
            }, 1500);
          } else if (!hasRole) {
            common_vendor.index.redirectTo({
              url: "/pages/role/role"
            });
          } else {
            common_vendor.index.showToast({
              title: "登录成功",
              icon: "success"
            });
            setTimeout(() => {
              common_vendor.index.switchTab({
                url: "/pages/index/index"
              });
            }, 1500);
          }
        } else {
          throw new Error(res.result.message);
        }
      } catch (error) {
        console.error("登录失败:", error);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "登录失败，请重试",
          icon: "none"
        });
      }
    },
    // toLogin() {
    // 		uni.navigateTo({
    // 			url: "/uni_modules/uni-id-pages/pages/login/login-withpwd"
    // 		}) 
    // }
    showUserAgreement() {
      common_vendor.index.showModal({
        title: "用户协议",
        content: "用户协议内容...",
        showCancel: false
      });
    },
    showPrivacyPolicy() {
      common_vendor.index.showModal({
        title: "隐私政策",
        content: "隐私政策内容...",
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
    b: common_vendor.p({
      type: "weixin",
      size: "20",
      color: "#FFFFFF"
    }),
    c: common_vendor.o((...args) => $options.onGetUserInfo && $options.onGetUserInfo(...args)),
    d: common_vendor.o((...args) => $options.showUserAgreement && $options.showUserAgreement(...args)),
    e: common_vendor.o((...args) => $options.showPrivacyPolicy && $options.showPrivacyPolicy(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-e4e4508d"]]);
wx.createPage(MiniProgramPage);
