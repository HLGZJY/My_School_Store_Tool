"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      keyword: "",
      hasSearched: false,
      articles: [],
      page: 1,
      hasMore: true,
      loading: false,
      searchHistory: [],
      hotKeywords: []
    };
  },
  onLoad() {
    this.loadHotKeywords();
    this.loadSearchHistory();
  },
  methods: {
    async doSearch() {
      if (!this.keyword.trim()) {
        common_vendor.index.showToast({
          title: "请输入搜索关键词",
          icon: "none"
        });
        return;
      }
      this.hasSearched = true;
      this.page = 1;
      this.hasMore = true;
      this.articles = [];
      await this.loadArticles();
      this.saveSearchHistory();
    },
    async loadArticles() {
      if (this.loading)
        return;
      this.loading = true;
      try {
        const userId = this.$store.state.user.userId;
        const res = await common_vendor.Vs.callFunction({
          name: "searchArticles",
          data: {
            userId,
            keyword: this.keyword,
            page: this.page,
            pageSize: 20
          }
        });
        if (res.result.code === 0) {
          const { articles, hasMore } = res.result.data;
          if (this.page === 1) {
            this.articles = articles;
          } else {
            this.articles = [...this.articles, ...articles];
          }
          this.hasMore = hasMore;
        }
      } catch (error) {
        console.error("搜索失败:", error);
        common_vendor.index.showToast({
          title: "搜索失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
      }
    },
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.page++;
        this.loadArticles();
      }
    },
    async loadHotKeywords() {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getHotKeywords",
          data: {
            limit: 10
          }
        });
        if (res.result.code === 0) {
          this.hotKeywords = res.result.data.tags || [];
        }
      } catch (error) {
        console.error("加载热门搜索失败:", error);
      }
    },
    loadSearchHistory() {
      this.searchHistory = common_vendor.index.getStorageSync("searchHistory") || [];
    },
    saveSearchHistory() {
      let history = common_vendor.index.getStorageSync("searchHistory") || [];
      history = history.filter((item) => item !== this.keyword);
      history.unshift(this.keyword);
      history = history.slice(0, 10);
      common_vendor.index.setStorageSync("searchHistory", history);
      this.searchHistory = history;
      common_vendor.Vs.callFunction({
        name: "reportSearch",
        data: {
          userId: this.$store.state.user.userId,
          keyword: this.keyword,
          resultCount: this.articles.length
        }
      });
    },
    clearHistory() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定清空搜索历史吗？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.removeStorageSync("searchHistory");
            this.searchHistory = [];
          }
        }
      });
    },
    searchItem(keyword) {
      this.keyword = keyword;
      this.doSearch();
    },
    highlightKeyword(text) {
      if (!this.keyword)
        return text;
      const reg = new RegExp(this.keyword, "gi");
      return text.replace(reg, `<span class="highlight">${this.keyword}</span>`);
    },
    goToDetail(id) {
      common_vendor.index.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    },
    goBack() {
      common_vendor.index.navigateBack();
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}月${date.getDate()}日`;
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
    a: common_vendor.o($options.goBack),
    b: common_vendor.p({
      type: "back",
      size: "20",
      color: "#0A2540"
    }),
    c: common_vendor.o((...args) => $options.doSearch && $options.doSearch(...args)),
    d: $data.keyword,
    e: common_vendor.o(($event) => $data.keyword = $event.detail.value),
    f: common_vendor.o((...args) => $options.doSearch && $options.doSearch(...args)),
    g: $data.hasSearched
  }, $data.hasSearched ? common_vendor.e({
    h: $data.articles.length > 0
  }, $data.articles.length > 0 ? common_vendor.e({
    i: common_vendor.f($data.articles, (article, k0, i0) => {
      return {
        a: $options.highlightKeyword(article.title),
        b: common_vendor.t(article.sourceName),
        c: common_vendor.t($options.formatTime(article.publishTime)),
        d: article._id,
        e: common_vendor.o(($event) => $options.goToDetail(article._id), article._id)
      };
    }),
    j: $data.loading
  }, $data.loading ? {
    k: common_vendor.p({
      status: "loading"
    })
  } : {}, {
    l: !$data.hasMore && $data.articles.length > 0
  }, !$data.hasMore && $data.articles.length > 0 ? {} : {}) : {}, {
    m: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  }) : common_vendor.e({
    n: $data.searchHistory.length > 0
  }, $data.searchHistory.length > 0 ? {
    o: common_vendor.o((...args) => $options.clearHistory && $options.clearHistory(...args)),
    p: common_vendor.f($data.searchHistory, (item, k0, i0) => {
      return {
        a: common_vendor.t(item),
        b: item,
        c: common_vendor.o(($event) => $options.searchItem(item), item)
      };
    })
  } : {}, {
    q: common_vendor.f($data.hotKeywords, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.keyword),
        b: item.keyword,
        c: item.count > 100 ? 1 : "",
        d: common_vendor.o(($event) => $options.searchItem(item.keyword), item.keyword)
      };
    })
  }));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c10c040c"]]);
wx.createPage(MiniProgramPage);
