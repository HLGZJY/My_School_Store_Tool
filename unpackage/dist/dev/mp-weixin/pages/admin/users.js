"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      userList: [],
      keyword: "",
      loading: false,
      page: 1,
      pageSize: 20
    };
  },
  onLoad() {
    this.loadUsers();
  },
  onPullDownRefresh() {
    this.page = 1;
    this.loadUsers().then(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  methods: {
    async loadUsers() {
      this.loading = true;
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "manageUsers",
          data: {
            action: "list",
            keyword: this.keyword,
            page: this.page,
            pageSize: this.pageSize
          }
        });
        if (res.result.code === 0) {
          this.userList = res.result.data.list;
        }
      } catch (e) {
        console.error("加载失败:", e);
      } finally {
        this.loading = false;
      }
    },
    searchUsers() {
      this.page = 1;
      this.loadUsers();
    },
    setAsAdmin(user) {
      common_vendor.index.showModal({
        title: "确认设置",
        content: `确定要将 "${user.nickname || "该用户"}" 设为管理员吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const res2 = await common_vendor.Vs.callFunction({
                name: "addAdmin",
                data: {
                  secret: "test_admin_key_2024",
                  openid: user.openid,
                  nickname: user.nickname
                }
              });
              if (res2.result.code === 0) {
                common_vendor.index.showToast({ title: "设置成功", icon: "success" });
              } else {
                common_vendor.index.showToast({ title: res2.result.message, icon: "none" });
              }
            } catch (e) {
              common_vendor.index.showToast({ title: "设置失败", icon: "none" });
            }
          }
        }
      });
    },
    viewDetail(user) {
      var _a, _b;
      common_vendor.index.showModal({
        title: "用户详情",
        content: `
OpenID: ${user.openid}
昵称: ${user.nickname || "未设置"}
角色: ${this.getRoleText(user.role)}
学院: ${((_a = user.roleDetail) == null ? void 0 : _a.college) || "-"}
年级: ${((_b = user.roleDetail) == null ? void 0 : _b.grade) || "-"}
注册时间: ${this.formatDate(user.createTime)}
最后登录: ${this.formatDate(user.lastLoginTime)}
                `,
        showCancel: false
      });
    },
    getRoleText(role) {
      const map = {
        student: "学生",
        teacher: "教师",
        admin: "管理员"
      };
      return map[role] || "未设置";
    },
    formatDate(timestamp) {
      if (!timestamp)
        return "-";
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.searchUsers && $options.searchUsers(...args)),
    b: $data.keyword,
    c: common_vendor.o(($event) => $data.keyword = $event.detail.value),
    d: common_vendor.o((...args) => $options.searchUsers && $options.searchUsers(...args)),
    e: common_vendor.f($data.userList, (item, k0, i0) => {
      var _a, _b;
      return {
        a: item.avatar || "/static/icons/default-avatar.png",
        b: common_vendor.t(item.nickname || "未设置昵称"),
        c: common_vendor.t($options.getRoleText(item.role)),
        d: common_vendor.t($options.formatDate(item.createTime)),
        e: common_vendor.t(((_a = item.stats) == null ? void 0 : _a.readCount) || 0),
        f: common_vendor.t(((_b = item.stats) == null ? void 0 : _b.collectCount) || 0),
        g: common_vendor.o(($event) => $options.setAsAdmin(item), item._id),
        h: common_vendor.o(($event) => $options.viewDetail(item), item._id),
        i: item._id
      };
    }),
    f: $data.userList.length === 0 && !$data.loading
  }, $data.userList.length === 0 && !$data.loading ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-a139a655"]]);
wx.createPage(MiniProgramPage);
