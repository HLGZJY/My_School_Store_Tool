"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {},
      fontSizes: ["小", "中", "大"],
      currentFontSize: "中",
      darkMode: false,
      cacheSize: "0MB"
    };
  },
  onLoad() {
    this.loadUserInfo();
    this.loadSettings();
    this.calculateCacheSize();
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
    loadSettings() {
      const settings = common_vendor.index.getStorageSync("settings") || {};
      this.currentFontSize = settings.fontSize || "中";
      this.darkMode = settings.darkMode || false;
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
    onFontSizeChange(e) {
      const index = e.detail.value;
      const fontSize = this.fontSizes[index];
      this.currentFontSize = fontSize;
      this.saveSettings();
      common_vendor.index.showToast({
        title: "已设置字体大小",
        icon: "success"
      });
    },
    onDarkModeChange(e) {
      this.darkMode = e.detail.value;
      this.saveSettings();
      common_vendor.index.showToast({
        title: this.darkMode ? "深色模式已开启" : "深色模式已关闭",
        icon: "success"
      });
    },
    saveSettings() {
      const settings = {
        fontSize: this.currentFontSize,
        darkMode: this.darkMode
      };
      common_vendor.index.setStorageSync("settings", settings);
    },
    editRole() {
      common_vendor.index.navigateTo({
        url: "/pages/role/role-detail?role=" + this.userInfo.role
      });
    },
    goToAbout() {
      common_vendor.index.navigateTo({
        url: "/pages/about/about"
      });
    },
    clearCache() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定清除缓存吗？",
        success: (res) => {
          if (res.confirm) {
            try {
              common_vendor.index.clearStorageSync();
              common_vendor.index.showToast({
                title: "缓存已清除",
                icon: "success"
              });
              this.calculateCacheSize();
            } catch (error) {
              console.error("清除缓存失败:", error);
              common_vendor.index.showToast({
                title: "清除失败",
                icon: "none"
              });
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
    logout() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定退出登录吗？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.clearStorageSync();
            this.$store.commit("user/clear");
            common_vendor.index.reLaunch({
              url: "/pages/login/login"
            });
          }
        }
      });
    },
    getRoleName(role) {
      const roleMap = {
        "student": "学生",
        "teacher": "教师",
        "admin": "行政人员"
      };
      return roleMap[role] || "未设置";
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.userInfo.avatar || "/static/logo.png",
    b: common_vendor.t($data.userInfo.nickname || "未登录"),
    c: common_vendor.t($options.getRoleName($data.userInfo.role)),
    d: common_vendor.o((...args) => $options.editRole && $options.editRole(...args)),
    e: common_vendor.t($data.currentFontSize),
    f: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    g: $data.fontSizes,
    h: common_vendor.o((...args) => $options.onFontSizeChange && $options.onFontSizeChange(...args)),
    i: $data.darkMode,
    j: common_vendor.o((...args) => $options.onDarkModeChange && $options.onDarkModeChange(...args)),
    k: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    l: common_vendor.o((...args) => $options.goToAbout && $options.goToAbout(...args)),
    m: common_vendor.t($data.cacheSize),
    n: common_vendor.o((...args) => $options.clearCache && $options.clearCache(...args)),
    o: common_vendor.p({
      type: "arrowright",
      size: "16",
      color: "#A0AEC0"
    }),
    p: common_vendor.o((...args) => $options.contactUs && $options.contactUs(...args)),
    q: common_vendor.o((...args) => $options.logout && $options.logout(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7fad0a1c"]]);
wx.createPage(MiniProgramPage);
