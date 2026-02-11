"use strict";
const common_vendor = require("../../common/vendor.js");
const SearchHeader = () => "./components/SearchHeader.js";
const SearchSuggest = () => "./components/SearchSuggest.js";
const SearchResult = () => "./components/SearchResult.js";
const _sfc_main = {
  name: "Search",
  components: {
    SearchHeader,
    SearchSuggest,
    SearchResult
  },
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
  onLoad(options) {
    if (options.keyword) {
      this.keyword = options.keyword;
      this.doSearch();
    }
    this.loadHotKeywords();
    this.loadSearchHistory();
  },
  methods: {
    // 执行搜索
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
    // 加载搜索结果
    async loadArticles() {
      if (this.loading)
        return;
      this.loading = true;
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "searchArticles",
          data: {
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
    // 加载更多
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.page++;
        this.loadArticles();
      }
    },
    // 加载热门关键词
    async loadHotKeywords() {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getHotKeywords",
          data: { limit: 10 }
        });
        if (res.result.code === 0) {
          this.hotKeywords = res.result.data || [];
        }
      } catch (error) {
        console.error("加载热门搜索失败:", error);
      }
    },
    // 加载搜索历史
    loadSearchHistory() {
      this.searchHistory = common_vendor.index.getStorageSync("searchHistory") || [];
    },
    // 保存搜索历史
    saveSearchHistory() {
      let history = common_vendor.index.getStorageSync("searchHistory") || [];
      history = history.filter((item) => item !== this.keyword);
      history.unshift(this.keyword);
      history = history.slice(0, 10);
      common_vendor.index.setStorageSync("searchHistory", history);
      this.searchHistory = history;
      const openid = this.$store.state.user.userId || common_vendor.index.getStorageSync("userId") || "anonymous";
      common_vendor.Vs.callFunction({
        name: "reportSearch",
        data: {
          keyword: this.keyword,
          resultCount: this.articles.length,
          userId: openid
          // 方案A：传递 openid
        }
      });
    },
    // 清空历史
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
    // 点击搜索项
    searchItem(keyword) {
      this.keyword = keyword;
      this.doSearch();
    },
    // 跳转详情
    goToDetail(id) {
      common_vendor.index.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    },
    // 返回
    goBack() {
      common_vendor.index.navigateBack();
    }
  }
};
if (!Array) {
  const _component_SearchHeader = common_vendor.resolveComponent("SearchHeader");
  const _component_SearchResult = common_vendor.resolveComponent("SearchResult");
  const _component_SearchSuggest = common_vendor.resolveComponent("SearchSuggest");
  (_component_SearchHeader + _component_SearchResult + _component_SearchSuggest)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o($options.doSearch),
    b: common_vendor.o($options.goBack),
    c: common_vendor.o(($event) => $data.keyword = $event),
    d: common_vendor.p({
      focus: true,
      keyword: $data.keyword
    }),
    e: $data.hasSearched
  }, $data.hasSearched ? {
    f: common_vendor.o($options.loadMore),
    g: common_vendor.o($options.goToDetail),
    h: common_vendor.p({
      articles: $data.articles,
      loading: $data.loading,
      ["has-more"]: $data.hasMore,
      keyword: $data.keyword
    })
  } : {
    i: common_vendor.o($options.searchItem),
    j: common_vendor.o($options.clearHistory),
    k: common_vendor.p({
      history: $data.searchHistory,
      ["hot-keywords"]: $data.hotKeywords
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c10c040c"]]);
wx.createPage(MiniProgramPage);
