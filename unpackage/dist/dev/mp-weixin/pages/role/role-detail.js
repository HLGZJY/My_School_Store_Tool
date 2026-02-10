"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      role: "",
      form: {
        major: "",
        grade: "",
        interests: [],
        department: "",
        title: "",
        researchField: "",
        duties: ""
      },
      grades: ["2021级", "2022级", "2023级", "2024级"],
      titles: ["助教", "讲师", "副教授", "教授"],
      interestTags: ["编程", "人工智能", "考研", "就业", "竞赛", "科研", "实习", "创新创业"]
    };
  },
  computed: {
    isFormValid() {
      if (this.role === "student") {
        return this.form.major && this.form.grade && this.form.interests.length > 0;
      }
      if (this.role === "teacher") {
        return this.form.department && this.form.title;
      }
      if (this.role === "admin") {
        return this.form.department;
      }
      return false;
    }
  },
  onLoad(options) {
    this.role = options.role || "";
  },
  methods: {
    onGradeChange(e) {
      this.form.grade = this.grades[e.detail.value];
    },
    onTitleChange(e) {
      this.form.title = this.titles[e.detail.value];
    },
    toggleInterest(tag) {
      const index = this.form.interests.indexOf(tag);
      if (index > -1) {
        this.form.interests.splice(index, 1);
      } else {
        this.form.interests.push(tag);
      }
    },
    async confirm() {
      common_vendor.index.showLoading({ title: "保存中..." });
      try {
        const userId = this.$store.state.user.userId;
        const roleDetail = {};
        if (this.role === "student") {
          roleDetail.student = {
            major: this.form.major,
            grade: this.form.grade,
            interests: this.form.interests
          };
        } else if (this.role === "teacher") {
          roleDetail.teacher = {
            department: this.form.department,
            title: this.form.title,
            researchField: this.form.researchField
          };
        } else if (this.role === "admin") {
          roleDetail.admin = {
            department: this.form.department,
            duties: this.form.duties
          };
        }
        const res = await common_vendor.Vs.callFunction({
          name: "setUserRole",
          data: {
            userId,
            role: this.role,
            roleDetail
          }
        });
        if (res.result.code === 0) {
          this.$store.commit("user/setRole", this.role);
          common_vendor.index.showToast({
            title: "设置成功",
            icon: "success"
          });
          setTimeout(() => {
            common_vendor.index.switchTab({
              url: "/pages/index/index"
            });
          }, 1500);
        } else {
          throw new Error(res.result.message);
        }
      } catch (error) {
        console.error("保存失败:", error);
        common_vendor.index.showToast({
          title: "保存失败，请重试",
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
    a: $data.role === "student"
  }, $data.role === "student" ? {
    b: $data.form.major,
    c: common_vendor.o(($event) => $data.form.major = $event.detail.value),
    d: common_vendor.t($data.form.grade || "请选择年级"),
    e: common_vendor.p({
      type: "arrowdown",
      size: "16",
      color: "#A0AEC0"
    }),
    f: $data.grades,
    g: common_vendor.o((...args) => $options.onGradeChange && $options.onGradeChange(...args)),
    h: common_vendor.f($data.interestTags, (tag, k0, i0) => {
      return {
        a: common_vendor.t(tag),
        b: tag,
        c: $data.form.interests.includes(tag) ? 1 : "",
        d: common_vendor.o(($event) => $options.toggleInterest(tag), tag)
      };
    })
  } : {}, {
    i: $data.role === "teacher"
  }, $data.role === "teacher" ? {
    j: $data.form.department,
    k: common_vendor.o(($event) => $data.form.department = $event.detail.value),
    l: common_vendor.t($data.form.title || "请选择职称"),
    m: common_vendor.p({
      type: "arrowdown",
      size: "16",
      color: "#A0AEC0"
    }),
    n: $data.titles,
    o: common_vendor.o((...args) => $options.onTitleChange && $options.onTitleChange(...args)),
    p: $data.form.researchField,
    q: common_vendor.o(($event) => $data.form.researchField = $event.detail.value)
  } : {}, {
    r: $data.role === "admin"
  }, $data.role === "admin" ? {
    s: $data.form.department,
    t: common_vendor.o(($event) => $data.form.department = $event.detail.value),
    v: $data.form.duties,
    w: common_vendor.o(($event) => $data.form.duties = $event.detail.value)
  } : {}, {
    x: !$options.isFormValid,
    y: common_vendor.o((...args) => $options.confirm && $options.confirm(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0a3495a6"]]);
wx.createPage(MiniProgramPage);
