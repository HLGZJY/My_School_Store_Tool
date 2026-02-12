"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      currentRole: "",
      selectedRole: "",
      isSwitching: false,
      roles: [
        {
          value: "student",
          name: "在校学生",
          icon: "🎓",
          description: "关注课程通知、社团活动、就业信息"
        },
        {
          value: "teacher",
          name: "教师",
          icon: "👨‍🏫",
          description: "关注教务通知、科研申报、学术会议"
        },
        {
          value: "admin",
          name: "行政人员",
          icon: "👔",
          description: "关注校内公文、会议通知、政策文件"
        }
      ]
    };
  },
  computed: {
    currentRoleName() {
      const map = { student: "在校学生", teacher: "教师", admin: "行政人员" };
      return map[this.currentRole] || "未设置";
    }
  },
  onLoad(options) {
    this.currentRole = options.currentRole || "";
    this.isSwitching = !!options.switch;
  },
  methods: {
    selectRole(value) {
      this.selectedRole = value;
    },
    goBack() {
      common_vendor.index.navigateBack();
    },
    async confirmRole() {
      if (!this.selectedRole)
        return;
      if (this.selectedRole === this.currentRole && this.isSwitching) {
        common_vendor.index.showToast({
          title: "您已是该身份",
          icon: "none"
        });
        common_vendor.index.navigateBack();
        return;
      }
      common_vendor.index.showLoading({ title: "设置中..." });
      try {
        const userId = this.$store.state.user.userId;
        common_vendor.index.redirectTo({
          url: `/pages/role/role-detail?role=${this.selectedRole}`
        });
      } catch (error) {
        console.error("设置角色失败:", error);
        common_vendor.index.showToast({
          title: "设置失败，请重试",
          icon: "none"
        });
      } finally {
        common_vendor.index.hideLoading();
      }
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.isSwitching ? "切换身份" : "请选择您的身份"),
    b: common_vendor.t($data.isSwitching ? "您当前是 " + $options.currentRoleName : "我们将根据您的身份推送相关内容"),
    c: common_vendor.f($data.roles, (role, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(role.icon),
        b: common_vendor.t(role.name),
        c: common_vendor.t(role.description),
        d: $data.selectedRole === role.value
      }, $data.selectedRole === role.value ? {
        e: "601540eb-0-" + i0,
        f: common_vendor.p({
          type: "checkmarkempty",
          size: "24",
          color: "#00D4AA"
        })
      } : {}, {
        g: role.value,
        h: $data.selectedRole === role.value ? 1 : "",
        i: common_vendor.o(($event) => $options.selectRole(role.value), role.value)
      });
    }),
    d: common_vendor.t($data.isSwitching ? "确认切换" : "确认选择"),
    e: !$data.selectedRole,
    f: common_vendor.o((...args) => $options.confirmRole && $options.confirmRole(...args)),
    g: $data.isSwitching
  }, $data.isSwitching ? {
    h: common_vendor.o((...args) => $options.goBack && $options.goBack(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-601540eb"]]);
wx.createPage(MiniProgramPage);
