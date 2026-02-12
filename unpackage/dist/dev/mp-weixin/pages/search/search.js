"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_cache = require("../../utils/cache.js");
const SearchHeader = () => "./components/SearchHeader.js";
const SearchSuggest = () => "./components/SearchSuggest.js";
const SearchResult = () => "./components/SearchResult.js";
const FilterPanel = () => "../../components/FilterPanel.js";
const _sfc_main = {
  name: "Search",
  components: {
    SearchHeader,
    SearchSuggest,
    SearchResult,
    FilterPanel
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
      hotKeywords: [],
      // 筛选条件
      filterSourceId: "",
      filterTag: "",
      filterTimeRange: "",
      // 数据源配置
      sources: [
        { id: "jwc", name: "教务处" },
        { id: "library", name: "图书馆" },
        { id: "xsc", name: "学生处" },
        { id: "cs", name: "计算机学院" },
        { id: "jyzd", name: "就业指导中心" }
      ],
      tagOptions: ["通知", "讲座", "活动", "竞赛", "讲座预告", "考试通知"]
    };
  },
  onLoad(options) {
    if (options.keyword) {
      this.keyword = options.keyword;
      this.doSearch();
    }
    this.loadHotKeywords();
    this.loadSearchHistory();
    this.loadSources();
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
      this.filterTag = filters.tag;
      this.filterTimeRange = filters.timeRange;
      this.page = 1;
      this.hasMore = true;
      this.articles = [];
      this.loadArticles();
    },
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
      let startDate = 0, endDate = 0;
      if (this.filterTimeRange) {
        const now = Date.now();
        const ranges = {
          "1d": 1 * 24 * 60 * 60 * 1e3,
          "7d": 7 * 24 * 60 * 60 * 1e3,
          "30d": 30 * 24 * 60 * 60 * 1e3
        };
        const days = ranges[this.filterTimeRange] || 0;
        if (days > 0) {
          endDate = now;
          startDate = now - days;
        }
      }
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "searchArticles",
          data: {
            keyword: this.keyword,
            page: this.page,
            pageSize: 20,
            sourceId: this.filterSourceId,
            tag: this.filterTag,
            startDate,
            endDate
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
      const data = await utils_cache.loadWithCache("search_hot", "HOT_KEYWORDS", async () => {
        const res = await common_vendor.Vs.callFunction({
          name: "getHotKeywords",
          data: { limit: 10 }
        });
        if (res.result.code === 0) {
          return res.result.data || [];
        }
        return [];
      });
      this.hotKeywords = data;
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
      const openid = common_vendor.index.getStorageSync("openid") || "anonymous";
      common_vendor.Vs.callFunction({
        name: "reportSearch",
        data: {
          keyword: this.keyword,
          resultCount: this.articles.length,
          userId: openid
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
  const _component_FilterPanel = common_vendor.resolveComponent("FilterPanel");
  const _component_SearchResult = common_vendor.resolveComponent("SearchResult");
  const _component_SearchSuggest = common_vendor.resolveComponent("SearchSuggest");
  (_component_SearchHeader + _component_FilterPanel + _component_SearchResult + _component_SearchSuggest)();
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
    f: common_vendor.sr("filterRef", "c10c040c-1"),
    g: common_vendor.o($options.onFilterChange),
    h: common_vendor.p({
      sources: $data.sources,
      tags: $data.tagOptions
    })
  } : {}, {
    i: $data.hasSearched
  }, $data.hasSearched ? {
    j: common_vendor.o($options.loadMore),
    k: common_vendor.o($options.goToDetail),
    l: common_vendor.p({
      articles: $data.articles,
      loading: $data.loading,
      ["has-more"]: $data.hasMore,
      keyword: $data.keyword
    })
  } : {
    m: common_vendor.o($options.searchItem),
    n: common_vendor.o($options.clearHistory),
    o: common_vendor.p({
      history: $data.searchHistory,
      ["hot-keywords"]: $data.hotKeywords
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c10c040c"]]);
wx.createPage(MiniProgramPage);
