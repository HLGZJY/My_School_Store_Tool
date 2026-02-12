"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "UserCard",
  props: {
    avatar: { type: String, default: "" },
    nickname: { type: String, default: "" },
    role: { type: String, default: "" },
    roleDetail: { type: Object, default: () => ({}) }
  },
  computed: {
    roleName() {
      const map = { student: "学生", teacher: "教师", admin: "行政人员" };
      return map[this.role] || "";
    },
    roleDetailText() {
      if (!this.role || !this.roleDetail)
        return "";
      if (this.role === "student") {
        const { college, grade } = this.roleDetail;
        const parts = [];
        if (college)
          parts.push(college);
        if (grade)
          parts.push(grade);
        return parts.join(" · ");
      }
      if (this.role === "teacher") {
        return this.roleDetail.department || "";
      }
      if (this.role === "admin") {
        return this.roleDetail.department || "";
      }
      return "";
    },
    interests() {
      if (this.role === "student" && this.roleDetail.interests) {
        return this.roleDetail.interests;
      }
      return [];
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $props.avatar || "/static/logo.png",
    b: common_vendor.o(($event) => _ctx.$emit("click")),
    c: common_vendor.t($props.nickname || "未登录"),
    d: $props.role
  }, $props.role ? {
    e: common_vendor.t($options.roleName)
  } : {}, {
    f: $options.roleDetailText
  }, $options.roleDetailText ? {
    g: common_vendor.t($options.roleDetailText)
  } : {}, {
    h: $options.interests.length > 0
  }, $options.interests.length > 0 ? {
    i: common_vendor.f($options.interests, (tag, k0, i0) => {
      return {
        a: common_vendor.t(tag),
        b: tag
      };
    })
  } : {}, {
    j: $props.role
  }, $props.role ? {
    k: common_vendor.o(($event) => _ctx.$emit("switchRole"))
  } : {});
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-046ad85a"]]);
wx.createComponent(Component);
