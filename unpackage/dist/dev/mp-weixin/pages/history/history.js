"use strict";
const common_vendor = require("../../common/vendor.js");
const FilterPanel = () => "../../components/FilterPanel.js";
const _sfc_main = {
  components: {
    FilterPanel
  },
  data() {
    return {
      history: [],
      page: 1,
      hasMore: true,
      loading: false,
      // 筛选条件
      filterSourceId: "",
      // 数据源配置
      sources: [
        { id: "jwc", name: "教务处" },
        { id: "library", name: "图书馆" },
        { id: "xsc", name: "学生处" },
        { id: "cs", name: "计算机学院" },
        { id: "jyzd", name: "就业指导中心" }
      ]
    };
  },
  onLoad() {
    this.loadSources();
    this.loadHistory();
  },
  onPullDownRefresh() {
    this.page = 1;
    this.hasMore = true;
    this.loadHistory(true);
  },
  methods: {
    // 加载数据源
    async loadSources() {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getSubscribeSources"
        });
        if (res.result.code === 0 && res.result.data) {
          this.sources = res.result.data.map((s) => ({
            id: s.id,
            name: s.name
          }));
        }
      } catch (e) {
        console.error("加载数据源失败:", e);
      }
    },
    // 筛选变化
    onFilterChange(filters) {
      this.filterSourceId = filters.sourceId;
      this.page = 1;
      this.hasMore = true;
      this.history = [];
      this.loadHistory(true);
    },
    async loadHistory(refresh = false) {
      if (refresh) {
        common_vendor.index.stopPullDownRefresh();
        setTimeout(() => common_vendor.index.stopPullDownRefresh(), 10);
      }
      if (this.loading && !refresh)
        return;
      this.loading = !refresh;
      try {
        const openid = common_vendor.index.getStorageSync("userId");
        const res = await common_vendor.Vs.callFunction({
          name: "getReadingHistory",
          data: {
            userId: openid,
            sourceId: this.filterSourceId,
            page: this.page,
            pageSize: 20
          }
        });
        if (res.result.code === 0) {
          const { history, hasMore } = res.result.data;
          if (refresh || this.page === 1) {
            this.history = history;
          } else {
            this.history = [...this.history, ...history];
          }
          this.hasMore = hasMore;
        }
      } catch (error) {
        console.error("加载阅读历史失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
        setTimeout(() => common_vendor.index.stopPullDownRefresh(), 100);
      }
    },
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.page++;
        this.loadHistory();
      }
    },
    clearHistory() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定清空所有阅读历史吗？",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "清空中..." });
            try {
              const openid = common_vendor.index.getStorageSync("userId");
              const res2 = await common_vendor.Vs.callFunction({
                name: "clearReadingHistory",
                data: { userId: openid }
              });
              if (res2.result.code === 0) {
                common_vendor.index.showToast({
                  title: "清空成功",
                  icon: "success"
                });
                this.page = 1;
                this.hasMore = true;
                this.history = [];
                this.loadHistory();
              }
            } catch (error) {
              console.error("清空失败:", error);
              common_vendor.index.showToast({
                title: "清空失败",
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
      const now = /* @__PURE__ */ new Date();
      const diff = now - date;
      const hours = Math.floor(diff / (1e3 * 60 * 60));
      if (hours < 1)
        return "刚刚";
      if (hours < 24)
        return `${hours}小时前`;
      if (hours < 48)
        return "昨天";
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    },
    formatDuration(seconds) {
      if (!seconds)
        return "0秒";
      if (seconds < 60)
        return `${seconds}秒`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}分钟`;
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  const _component_FilterPanel = common_vendor.resolveComponent("FilterPanel");
  const _component_uni_load_more = common_vendor.resolveComponent("uni-load-more");
  (_component_uni_icons + _component_FilterPanel + _component_uni_load_more)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      type: "trash",
      size: "16",
      color: "#EF4444"
    }),
    b: common_vendor.o((...args) => $options.clearHistory && $options.clearHistory(...args)),
    c: common_vendor.o($options.onFilterChange),
    d: common_vendor.p({
      sources: $data.sources,
      showTag: false
    }),
    e: $data.history.length > 0
  }, $data.history.length > 0 ? common_vendor.e({
    f: common_vendor.f($data.history, (item, k0, i0) => {
      var _a, _b;
      return {
        a: common_vendor.t(((_a = item.article) == null ? void 0 : _a.title) || "未知标题"),
        b: common_vendor.t(((_b = item.article) == null ? void 0 : _b.sourceName) || "未知来源"),
        c: common_vendor.t($options.formatTime(item.readTime)),
        d: common_vendor.t($options.formatDuration(item.duration)),
        e: item._id,
        f: common_vendor.o(($event) => $options.goToDetail(item.articleId), item._id)
      };
    }),
    g: $data.loading
  }, $data.loading ? {
    h: common_vendor.p({
      status: "loading"
    })
  } : {}, {
    i: !$data.hasMore && $data.history.length > 0
  }, !$data.hasMore && $data.history.length > 0 ? {} : {}) : {}, {
    j: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b2d018fa"]]);
wx.createPage(MiniProgramPage);
