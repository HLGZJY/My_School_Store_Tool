"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      history: [],
      page: 1,
      hasMore: true,
      loading: false
    };
  },
  onLoad() {
    this.loadHistory();
  },
  onPullDownRefresh() {
    this.page = 1;
    this.hasMore = true;
    this.loadHistory(true);
  },
  methods: {
    async loadHistory(refresh = false) {
      if (this.loading)
        return;
      this.loading = true;
      try {
        const userId = this.$store.state.user.userId;
        const res = await common_vendor.Vs.callFunction({
          name: "getReadingHistory",
          data: {
            userId,
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
        common_vendor.index.stopPullDownRefresh();
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
              const userId = this.$store.state.user.userId;
              const res2 = await common_vendor.Vs.callFunction({
                name: "clearReadingHistory",
                data: { userId }
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
  const _component_uni_load_more = common_vendor.resolveComponent("uni-load-more");
  (_component_uni_icons + _component_uni_load_more)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      type: "trash",
      size: "16",
      color: "#EF4444"
    }),
    b: common_vendor.o((...args) => $options.clearHistory && $options.clearHistory(...args)),
    c: $data.history.length > 0
  }, $data.history.length > 0 ? common_vendor.e({
    d: common_vendor.f($data.history, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.article.title),
        b: common_vendor.t(item.article.sourceName),
        c: common_vendor.t($options.formatTime(item.readTime)),
        d: common_vendor.t($options.formatDuration(item.readDuration)),
        e: item._id,
        f: common_vendor.o(($event) => $options.goToDetail(item.articleId), item._id)
      };
    }),
    e: $data.loading
  }, $data.loading ? {
    f: common_vendor.p({
      status: "loading"
    })
  } : {}, {
    g: !$data.hasMore && $data.history.length > 0
  }, !$data.hasMore && $data.history.length > 0 ? {} : {}) : {}, {
    h: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b2d018fa"]]);
wx.createPage(MiniProgramPage);
