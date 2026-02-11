"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "UserCard",
  props: {
    avatar: { type: String, default: "/static/logo.png" },
    nickname: { type: String, default: "未登录" },
    role: { type: String, default: "" }
  },
  computed: {
    roleName() {
      const map = { student: "学生", teacher: "教师", admin: "行政人员" };
      return map[this.role] || "";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $props.avatar,
    b: common_vendor.t($props.nickname),
    c: $props.role
  }, $props.role ? {
    d: common_vendor.t($options.roleName)
  } : {}, {
    e: common_vendor.o(($event) => _ctx.$emit("switchRole"))
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-046ad85a"]]);
wx.createComponent(Component);
