"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      categories: [
        { name: "全部", category: "" },
        { name: "通知公告", category: "notice" },
        { name: "学术动态", category: "academic" },
        { name: "社团活动", category: "activity" },
        { name: "生活服务", category: "service" }
      ],
      currentCategory: 0,
      collections: [],
      page: 1,
      hasMore: true,
      loading: false
    };
  },
  computed: {
    hasSelected() {
      return this.collections.some((item) => item.selected);
    },
    selectedCount() {
      return this.collections.filter((item) => item.selected).length;
    },
    selectedIds() {
      return this.collections.filter((item) => item.selected).map((item) => item.articleId);
    }
  },
  onLoad() {
    this.loadCollections();
    common_vendor.index.$on("collectChange", this.onCollectChange);
  },
  onShow() {
    this.loadCollections(true);
  },
  onUnload() {
    common_vendor.index.$off("collectChange", this.onCollectChange);
  },
  onPullDownRefresh() {
    this.page = 1;
    this.hasMore = true;
    this.loadCollections(true);
  },
  methods: {
    async loadCollections(refresh = false) {
      if (this.loading)
        return;
      this.loading = true;
      try {
        const openid = common_vendor.index.getStorageSync("userId");
        const category = this.categories[this.currentCategory].category;
        const res = await common_vendor.Vs.callFunction({
          name: "getCollections",
          data: {
            userId: openid,
            category,
            page: this.page,
            pageSize: 20
          }
        });
        if (res.result.code === 0) {
          const { collections, hasMore } = res.result.data;
          const collectionsWithSelected = collections.map((c) => ({
            ...c,
            selected: false
          }));
          if (refresh || this.page === 1) {
            this.collections = collectionsWithSelected;
          } else {
            this.collections = [...this.collections, ...collectionsWithSelected];
          }
          this.hasMore = hasMore;
        }
      } catch (error) {
        console.error("加载收藏失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
        common_vendor.index.stopPullDownRefresh();
      }
    },
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.page++;
        this.loadCollections();
      }
    },
    selectCategory(index) {
      if (this.currentCategory === index)
        return;
      this.currentCategory = index;
      this.page = 1;
      this.hasMore = true;
      this.collections = [];
      this.loadCollections();
    },
    toggleSelect(id) {
      const item = this.collections.find((c) => c._id === id);
      if (item) {
        item.selected = !item.selected;
      }
    },
    cancelSelect() {
      this.collections.forEach((item) => {
        item.selected = false;
      });
    },
    async batchDelete() {
      common_vendor.index.showModal({
        title: "提示",
        content: `确定删除选中的 ${this.selectedCount} 篇收藏吗？`,
        success: async (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "删除中..." });
            try {
              const openid = common_vendor.index.getStorageSync("userId");
              const res2 = await common_vendor.Vs.callFunction({
                name: "batchUncollect",
                data: {
                  userId: openid,
                  articleIds: this.selectedIds
                }
              });
              if (res2.result.code === 0) {
                common_vendor.index.showToast({
                  title: "删除成功",
                  icon: "success"
                });
                this.page = 1;
                this.hasMore = true;
                this.collections = [];
                this.loadCollections();
              }
            } catch (error) {
              console.error("删除失败:", error);
              common_vendor.index.showToast({
                title: "删除失败",
                icon: "none"
              });
            } finally {
              common_vendor.index.hideLoading();
            }
          }
        }
      });
    },
    goToDetail(id) {
      common_vendor.index.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    },
    onCollectChange({ articleId, collected }) {
      if (!collected) {
        const index = this.collections.findIndex((c) => c.articleId === articleId);
        if (index >= 0) {
          this.collections.splice(index, 1);
        }
      }
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  const _component_uni_load_more = common_vendor.resolveComponent("uni-load-more");
  (_component_uni_icons + _component_uni_load_more)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($data.categories, (item, index, i0) => {
      return {
        a: common_vendor.t(item.name),
        b: index,
        c: $data.currentCategory === index ? 1 : "",
        d: common_vendor.o(($event) => $options.selectCategory(index), index)
      };
    }),
    b: $data.collections.length > 0
  }, $data.collections.length > 0 ? common_vendor.e({
    c: common_vendor.f($data.collections, (item, k0, i0) => {
      var _a, _b;
      return {
        a: common_vendor.t(((_a = item.article) == null ? void 0 : _a.title) || "未知标题"),
        b: common_vendor.t(((_b = item.article) == null ? void 0 : _b.sourceName) || "未知来源"),
        c: common_vendor.t($options.formatTime(item.collectTime)),
        d: "cd17183b-0-" + i0,
        e: common_vendor.p({
          type: item.selected ? "checkbox-filled" : "circle",
          size: "18",
          color: item.selected ? "#00D4AA" : "#A0AEC0"
        }),
        f: common_vendor.o(($event) => $options.toggleSelect(item._id), item._id),
        g: item._id,
        h: common_vendor.o(($event) => $options.goToDetail(item.articleId), item._id)
      };
    }),
    d: $data.loading
  }, $data.loading ? {
    e: common_vendor.p({
      status: "loading"
    })
  } : {}, {
    f: !$data.hasMore && $data.collections.length > 0
  }, !$data.hasMore && $data.collections.length > 0 ? {} : {}) : {}, {
    g: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    h: $options.hasSelected
  }, $options.hasSelected ? {
    i: common_vendor.t($options.selectedCount),
    j: common_vendor.o((...args) => $options.cancelSelect && $options.cancelSelect(...args)),
    k: common_vendor.o((...args) => $options.batchDelete && $options.batchDelete(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-cd17183b"]]);
wx.createPage(MiniProgramPage);
