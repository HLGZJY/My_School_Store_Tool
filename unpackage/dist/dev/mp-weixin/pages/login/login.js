"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return "";
  },
  onLoad() {
    const userId = this.$store.state.user.userId;
    if (userId) {
      common_vendor.index.switchTab({
        url: "/pages/index/index"
      });
    }
  },
  methods: {
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
          const { userId, openid, token, hasRole } = res.result.data;
          this.$store.commit("user/setUserId", userId);
          this.$store.commit("user/setToken", token);
          this.$store.commit("user/setUserInfo", res.result.data.userInfo);
          common_vendor.index.setStorageSync("userId", userId);
          common_vendor.index.setStorageSync("openid", openid);
          common_vendor.index.setStorageSync("token", token);
          common_vendor.index.hideLoading();
          if (!hasRole) {
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
