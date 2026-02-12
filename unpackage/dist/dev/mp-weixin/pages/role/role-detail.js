"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      role: "",
      form: {
        college: "",
        grade: "",
        interests: [],
        department: ""
      },
      grades: ["2021级", "2022级", "2023级", "2024级"],
      colleges: [
        "信息科学技术学院",
        "机械工程学院",
        "经济管理学院",
        "文法学院",
        "外国语学院",
        "艺术学院",
        "理学院",
        "建筑工程学院",
        "材料科学与工程学院",
        "电气工程学院",
        "能源与动力工程学院",
        "化学与环境工程学院",
        "生命科学学院",
        "马克思主义学院",
        "体育学院",
        "继续教育学院"
      ],
      departments: [
        "信息科学技术学院",
        "机械工程学院",
        "经济管理学院",
        "文法学院",
        "外国语学院",
        "艺术学院",
        "理学院",
        "建筑工程学院",
        "材料科学与工程学院",
        "电气工程学院",
        "能源与动力工程学院",
        "化学与环境工程学院",
        "生命科学学院",
        "马克思主义学院",
        "体育学院",
        "继续教育学院"
      ],
      adminDepts: [
        "党委办公室",
        "校长办公室",
        "人事处",
        "教务处",
        "学生工作处",
        "科研处",
        "财务处",
        "后勤管理处",
        "保卫处",
        "组织部",
        "宣传部",
        "统战部",
        "纪委办公室",
        "工会",
        "团委"
      ],
      interestTags: ["编程", "人工智能", "考研", "就业", "竞赛", "科研", "实习", "创新创业"]
    };
  },
  computed: {
    isFormValid() {
      if (this.role === "student") {
        return this.form.college && this.form.grade && this.form.interests.length > 0;
      }
      if (this.role === "teacher") {
        return this.form.department;
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
    onCollegeChange(e) {
      this.form.college = this.colleges[e.detail.value];
    },
    onGradeChange(e) {
      this.form.grade = this.grades[e.detail.value];
    },
    onDepartmentChange(e) {
      this.form.department = this.departments[e.detail.value];
    },
    onAdminDeptChange(e) {
      this.form.department = this.adminDepts[e.detail.value];
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
            college: this.form.college,
            grade: this.form.grade,
            interests: this.form.interests
          };
        } else if (this.role === "teacher") {
          roleDetail.teacher = {
            department: this.form.department
          };
        } else if (this.role === "admin") {
          roleDetail.admin = {
            department: this.form.department
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
    b: common_vendor.t($data.form.college || "请选择所在学院"),
    c: common_vendor.p({
      type: "arrowdown",
      size: "16",
      color: "#A0AEC0"
    }),
    d: $data.colleges,
    e: common_vendor.o((...args) => $options.onCollegeChange && $options.onCollegeChange(...args)),
    f: common_vendor.t($data.form.grade || "请选择年级"),
    g: common_vendor.p({
      type: "arrowdown",
      size: "16",
      color: "#A0AEC0"
    }),
    h: $data.grades,
    i: common_vendor.o((...args) => $options.onGradeChange && $options.onGradeChange(...args)),
    j: common_vendor.f($data.interestTags, (tag, k0, i0) => {
      return {
        a: common_vendor.t(tag),
        b: tag,
        c: $data.form.interests.includes(tag) ? 1 : "",
        d: common_vendor.o(($event) => $options.toggleInterest(tag), tag)
      };
    })
  } : {}, {
    k: $data.role === "teacher"
  }, $data.role === "teacher" ? {
    l: common_vendor.t($data.form.department || "请选择院系"),
    m: common_vendor.p({
      type: "arrowdown",
      size: "16",
      color: "#A0AEC0"
    }),
    n: $data.departments,
    o: common_vendor.o((...args) => $options.onDepartmentChange && $options.onDepartmentChange(...args))
  } : {}, {
    p: $data.role === "admin"
  }, $data.role === "admin" ? {
    q: common_vendor.t($data.form.department || "请选择部门"),
    r: common_vendor.p({
      type: "arrowdown",
      size: "16",
      color: "#A0AEC0"
    }),
    s: $data.adminDepts,
    t: common_vendor.o((...args) => $options.onAdminDeptChange && $options.onAdminDeptChange(...args))
  } : {}, {
    v: !$options.isFormValid,
    w: common_vendor.o((...args) => $options.confirm && $options.confirm(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0a3495a6"]]);
wx.createPage(MiniProgramPage);
