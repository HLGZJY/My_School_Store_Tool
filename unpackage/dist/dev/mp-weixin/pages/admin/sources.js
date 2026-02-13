"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      sourceList: [],
      loading: false,
      isEdit: false,
      editId: null,
      sourceTypes: ["RSS订阅", "API接口", "网站抓取", "手动录入"],
      formData: {
        name: "",
        typeIndex: 1,
        type: "api",
        url: "",
        interval: 60,
        defaultTags: ""
      }
    };
  },
  onLoad() {
    this.loadSources();
  },
  methods: {
    async loadSources() {
      this.loading = true;
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "manageSources",
          data: { action: "list" }
        });
        if (res.result.code === 0) {
          this.sourceList = res.result.data;
        }
      } catch (e) {
        console.error("加载失败:", e);
      } finally {
        this.loading = false;
      }
    },
    onTypeChange(e) {
      const types = ["rss", "api", "website", "manual"];
      this.formData.typeIndex = e.detail.value;
      this.formData.type = types[e.detail.value];
    },
    showAddModal() {
      this.isEdit = false;
      this.editId = null;
      this.formData = {
        name: "",
        typeIndex: 1,
        type: "api",
        url: "",
        interval: 60,
        defaultTags: ""
      };
      this.$refs.popup.open();
    },
    editSource(item) {
      var _a, _b, _c, _d;
      this.isEdit = true;
      this.editId = item._id;
      const typeMap = { rss: 0, api: 1, website: 2, manual: 3 };
      this.formData = {
        name: item.name,
        typeIndex: typeMap[item.type] || 1,
        type: item.type,
        url: ((_a = item.config) == null ? void 0 : _a.url) || "",
        interval: (((_b = item.schedule) == null ? void 0 : _b.interval) || 36e5) / 6e4,
        defaultTags: ((_d = (_c = item.defaultTags) == null ? void 0 : _c.source) == null ? void 0 : _d.join(",")) || ""
      };
      this.$refs.popup.open();
    },
    closePopup() {
      this.$refs.popup.close();
    },
    async toggleEnabled(item) {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "manageSources",
          data: {
            action: "update",
            sourceId: item._id,
            enabled: !item.enabled
          }
        });
        if (res.result.code === 0) {
          common_vendor.index.showToast({ title: "更新成功", icon: "success" });
          this.loadSources();
        }
      } catch (e) {
        common_vendor.index.showToast({ title: "更新失败", icon: "none" });
        this.loadSources();
      }
    },
    async submitSource() {
      if (!this.formData.name || !this.formData.url) {
        common_vendor.index.showToast({ title: "请填写完整信息", icon: "none" });
        return;
      }
      const data = {
        action: this.isEdit ? "update" : "create",
        name: this.formData.name,
        type: this.formData.type,
        config: {
          url: this.formData.url
        },
        schedule: {
          interval: this.formData.interval * 6e4
        },
        defaultTags: {
          source: this.formData.defaultTags.split(",").filter((t) => t),
          role: ["通用"],
          custom: []
        }
      };
      if (this.isEdit) {
        data.sourceId = this.editId;
      }
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "manageSources",
          data
        });
        if (res.result.code === 0) {
          common_vendor.index.showToast({ title: "保存成功", icon: "success" });
          this.closePopup();
          this.loadSources();
        } else {
          common_vendor.index.showToast({ title: res.result.message, icon: "none" });
        }
      } catch (e) {
        common_vendor.index.showToast({ title: "保存失败", icon: "none" });
      }
    },
    async testSource(item) {
      common_vendor.index.showLoading({ title: "测试中..." });
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "syncSource",
          data: { sourceId: item._id }
        });
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: `获取${res.result.data.newArticles}条`,
            icon: "success"
          });
          this.loadSources();
        } else {
          common_vendor.index.showToast({ title: res.result.message, icon: "none" });
        }
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "测试失败", icon: "none" });
      }
    },
    deleteSource(item) {
      common_vendor.index.showModal({
        title: "确认删除",
        content: `确定要删除"${item.name}"吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const res2 = await common_vendor.Vs.callFunction({
                name: "manageSources",
                data: {
                  action: "delete",
                  sourceId: item._id
                }
              });
              if (res2.result.code === 0) {
                common_vendor.index.showToast({ title: "已删除", icon: "success" });
                this.loadSources();
              }
            } catch (e) {
              common_vendor.index.showToast({ title: "删除失败", icon: "none" });
            }
          }
        }
      });
    },
    getTypeText(type) {
      const map = {
        rss: "RSS",
        api: "API",
        website: "网站",
        manual: "手动"
      };
      return map[type] || type;
    },
    formatTime(timestamp) {
      if (!timestamp)
        return "从未";
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  (_component_uni_icons + _component_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      type: "plus",
      size: "20",
      color: "#FFFFFF"
    }),
    b: common_vendor.o((...args) => $options.showAddModal && $options.showAddModal(...args)),
    c: common_vendor.f($data.sourceList, (item, k0, i0) => {
      var _a, _b, _c;
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.t($options.getTypeText(item.type)),
        c: common_vendor.n(item.type),
        d: item.enabled,
        e: common_vendor.o(($event) => $options.toggleEnabled(item), item._id),
        f: common_vendor.t(((_a = item.config) == null ? void 0 : _a.url) || "未配置URL"),
        g: common_vendor.t(((_b = item.stats) == null ? void 0 : _b.totalArticles) || 0),
        h: common_vendor.t($options.formatTime((_c = item.schedule) == null ? void 0 : _c.lastRunTime)),
        i: common_vendor.o(($event) => $options.editSource(item), item._id),
        j: common_vendor.o(($event) => $options.testSource(item), item._id),
        k: common_vendor.o(($event) => $options.deleteSource(item), item._id),
        l: item._id
      };
    }),
    d: $data.sourceList.length === 0 && !$data.loading
  }, $data.sourceList.length === 0 && !$data.loading ? {} : {}, {
    e: common_vendor.t($data.isEdit ? "编辑数据源" : "添加数据源"),
    f: common_vendor.o((...args) => $options.closePopup && $options.closePopup(...args)),
    g: $data.formData.name,
    h: common_vendor.o(($event) => $data.formData.name = $event.detail.value),
    i: common_vendor.t($data.sourceTypes[$data.formData.typeIndex]),
    j: $data.sourceTypes,
    k: common_vendor.o((...args) => $options.onTypeChange && $options.onTypeChange(...args)),
    l: $data.formData.url,
    m: common_vendor.o(($event) => $data.formData.url = $event.detail.value),
    n: $data.formData.interval,
    o: common_vendor.o(($event) => $data.formData.interval = $event.detail.value),
    p: $data.formData.defaultTags,
    q: common_vendor.o(($event) => $data.formData.defaultTags = $event.detail.value),
    r: common_vendor.o((...args) => $options.submitSource && $options.submitSource(...args)),
    s: common_vendor.sr("popup", "7c7921be-1"),
    t: common_vendor.p({
      type: "bottom"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7c7921be"]]);
wx.createPage(MiniProgramPage);
