"use strict";
const common_vendor = require("../../common/vendor.js");
const ArticleCard = () => "../../components/ArticleCard.js";
const FilterPanel = () => "../../components/FilterPanel.js";
const _sfc_main = {
  components: {
    ArticleCard,
    FilterPanel
  },
  data() {
    return {
      currentTab: 0,
      tabs: [
        { name: "全部", category: "" },
        { name: "通知公告", category: "notice" },
        { name: "学术动态", category: "academic" },
        { name: "社团活动", category: "activity" },
        { name: "生活服务", category: "service" }
      ],
      articleList: [],
      recommendations: [],
      page: 1,
      pageSize: 10,
      loading: false,
      hasMore: true,
      refresherTriggered: false,
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
        { id: "jyzd", name: "就业指导中心" },
        { id: "yjs", name: "研究生院" },
        { id: "kjc", name: "科技处" },
        { id: "rsc", name: "人事处" }
      ],
      tagOptions: ["通知", "讲座", "活动", "竞赛", "讲座预告", "考试通知", "比赛", "招聘"],
      // 滚动位置记录
      scrollPositions: {},
      // 左滑收藏相关
      swipeShowIndex: null,
      touchStartX: 0,
      touchEndX: 0,
      touchThreshold: 50,
      scrollIntoView: "",
      currentTouchIndex: -1
      // 当前触摸的卡片索引
    };
  },
  onLoad() {
    this.loadSources();
    this.loadArticles();
    this.loadRecommendations();
  },
  onShow() {
    this.refreshCollectionStatus();
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
      this.articleList = [];
      this.loadArticles(true);
    },
    // 获取时间范围
    getTimeRangeFilter() {
      if (!this.filterTimeRange)
        return {};
      const now = Date.now();
      const ranges = {
        "1d": 1 * 24 * 60 * 60 * 1e3,
        "7d": 7 * 24 * 60 * 60 * 1e3,
        "30d": 30 * 24 * 60 * 60 * 1e3
      };
      const days = ranges[this.filterTimeRange] || 0;
      if (days === 0)
        return {};
      return {
        startTime: now - days,
        endTime: now
      };
    },
    // 加载文章列表
    async loadArticles(isRefresh = false) {
      if (isRefresh) {
        this.refresherTriggered = false;
        setTimeout(() => {
          this.refresherTriggered = false;
        }, 10);
      }
      if (this.loading && !isRefresh)
        return;
      this.loading = !isRefresh;
      if (isRefresh) {
        this.refresherTriggered = true;
      }
      const category = this.tabs[this.currentTab].category;
      const userRole = common_vendor.index.getStorageSync("userRole") || "student";
      const timeFilter = this.getTimeRangeFilter();
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getArticles",
          data: {
            page: this.page,
            pageSize: this.pageSize,
            category,
            userRole,
            sourceId: this.filterSourceId,
            tag: this.filterTag,
            startDate: timeFilter.startTime || 0,
            endDate: timeFilter.endTime || 0
          }
        });
        if (res.result.code === 0) {
          const { articles, hasMore } = res.result.data;
          const openid = common_vendor.index.getStorageSync("userId");
          let collectedIds = [];
          if (openid) {
            try {
              const collectRes = await common_vendor.Vs.callFunction({
                name: "getCollections",
                data: { userId: openid, pageSize: 500 }
              });
              if (collectRes.result.code === 0) {
                collectedIds = collectRes.result.data.collections.map((c) => c.articleId);
              }
            } catch (e) {
              console.error("获取收藏状态失败:", e);
            }
          }
          if (isRefresh) {
            this.articleList = articles.map((a) => ({
              ...a,
              isCollected: collectedIds.includes(a._id)
            }));
          } else {
            const newArticles = articles.map((a) => ({
              ...a,
              isCollected: collectedIds.includes(a._id)
            }));
            this.articleList = [...this.articleList, ...newArticles];
          }
          this.hasMore = hasMore;
        }
      } catch (error) {
        console.error("加载文章失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        setTimeout(() => {
          this.loading = false;
          this.refresherTriggered = false;
        }, 100);
      }
    },
    // 加载推荐文章
    async loadRecommendations() {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getArticles",
          data: {
            page: 1,
            pageSize: 3,
            category: ""
          }
        });
        if (res.result.code === 0) {
          this.recommendations = res.result.data.recommendations || [];
        }
      } catch (error) {
        console.error("加载推荐失败:", error);
      }
    },
    // 下拉刷新
    onRefresh() {
      this.page = 1;
      this.refresherTriggered = true;
      this.loadArticles(true);
      this.loadRecommendations();
    },
    // 上拉加载更多
    onLoadMore() {
      if (!this.loading && this.hasMore) {
        this.page++;
        this.loadArticles(false);
      }
    },
    // Tab切换
    onTabChange(index) {
      if (index === this.currentTab)
        return;
      this.scrollPositions[this.currentTab] = this.articleList.length > 0 ? this.articleList[this.articleList.length - 1]._id : "";
      this.currentTab = index;
      this.page = 1;
      this.hasMore = true;
      this.articleList = [];
      this.refresherTriggered = false;
      this.scrollIntoView = "article-list";
      this.loadArticles(true);
    },
    // 跳转搜索页
    goToSearch() {
      common_vendor.index.navigateTo({
        url: "/pages/search/search"
      });
    },
    // 跳转详情页
    goToDetail(article) {
      this.addToHistory(article);
      common_vendor.index.navigateTo({
        url: `/pages/detail/detail?id=${article._id}`
      });
    },
    // 添加到阅读历史
    addToHistory(article) {
      let history = common_vendor.index.getStorageSync("readHistory") || [];
      history = history.filter((h) => h._id !== article._id);
      history.unshift({
        _id: article._id,
        title: article.title,
        publishTime: article.publishTime
      });
      history = history.slice(0, 50);
      common_vendor.index.setStorageSync("readHistory", history);
    },
    // 刷新收藏状态
    async refreshCollectionStatus() {
      const openid = common_vendor.index.getStorageSync("userId");
      if (!openid)
        return;
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getCollections",
          data: {
            userId: openid,
            pageSize: 100
          }
        });
        if (res.result.code === 0) {
          const collectedIds = res.result.data.collections.map((c) => c.articleId);
          this.articleList = this.articleList.map((article) => ({
            ...article,
            isCollected: collectedIds.includes(article._id)
          }));
        }
      } catch (error) {
        console.error("刷新收藏状态失败:", error);
      }
    },
    // 切换收藏
    async toggleCollect(article, index) {
      const openid = common_vendor.index.getStorageSync("userId");
      if (!openid) {
        common_vendor.index.showToast({
          title: "请先登录",
          icon: "none"
        });
        return;
      }
      const isCollected = article.isCollected;
      const action = isCollected ? "uncollect" : "collect";
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "collectArticle",
          data: {
            userId: openid,
            articleId: article._id,
            action
          }
        });
        if (res.result.code === 0) {
          this.articleList[index].isCollected = !isCollected;
          this.swipeShowIndex = null;
          common_vendor.index.vibrateShort();
          common_vendor.index.showToast({
            title: isCollected ? "已取消收藏" : "收藏成功",
            icon: "success"
          });
        } else {
          common_vendor.index.showToast({
            title: res.result.message || "操作失败",
            icon: "none"
          });
        }
      } catch (error) {
        console.error("收藏操作失败:", error);
        common_vendor.index.showToast({
          title: "操作失败，请重试",
          icon: "none"
        });
      }
    },
    // 触摸事件处理
    onTouchStart(e, index) {
      this.touchStartX = e.changedTouches[0].clientX;
      this.currentTouchIndex = index;
    },
    onTouchEnd(e) {
      this.touchEndX = e.changedTouches[0].clientX;
      this.handleSwipe();
    },
    handleSwipe() {
      const diff = this.touchStartX - this.touchEndX;
      if (diff > this.touchThreshold) {
        if (this.currentTouchIndex >= 0 && this.currentTouchIndex < this.articleList.length) {
          if (this.swipeShowIndex !== this.currentTouchIndex) {
            this.swipeShowIndex = this.currentTouchIndex;
          }
        }
      } else if (diff < -this.touchThreshold) {
        this.swipeShowIndex = null;
      }
      this.currentTouchIndex = -1;
    }
  },
  // 页面分享
  onShareAppMessage() {
    return {
      title: "校园信息聚合 - 分享你的校园生活",
      path: "/pages/index/index"
    };
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  const _component_FilterPanel = common_vendor.resolveComponent("FilterPanel");
  const _component_ArticleCard = common_vendor.resolveComponent("ArticleCard");
  (_component_uni_icons + _component_FilterPanel + _component_ArticleCard)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      type: "search",
      size: "18",
      color: "#A0AEC0"
    }),
    b: common_vendor.o((...args) => $options.goToSearch && $options.goToSearch(...args)),
    c: common_vendor.sr("filterRef", "1cf27b2a-1"),
    d: common_vendor.o($options.onFilterChange),
    e: common_vendor.p({
      sources: $data.sources,
      tags: $data.tagOptions
    }),
    f: common_vendor.f($data.tabs, (tab, index, i0) => {
      return {
        a: common_vendor.t(tab.name),
        b: index,
        c: $data.currentTab === index ? 1 : "",
        d: common_vendor.o(($event) => $options.onTabChange(index), index)
      };
    }),
    g: $data.currentTab === 0 && $data.recommendations.length > 0
  }, $data.currentTab === 0 && $data.recommendations.length > 0 ? {
    h: common_vendor.p({
      type: "light",
      size: "16",
      color: "#00D4AA"
    }),
    i: common_vendor.f($data.recommendations, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: common_vendor.t(item.sourceName),
        c: item._id,
        d: common_vendor.o(($event) => $options.goToDetail(item), item._id)
      };
    })
  } : {}, {
    j: common_vendor.f($data.articleList, (article, index, i0) => {
      return {
        a: "1cf27b2a-3-" + i0,
        b: common_vendor.p({
          type: article.isCollected ? "star-filled" : "star",
          size: "20",
          color: article.isCollected ? "#00D4AA" : "#FFFFFF"
        }),
        c: common_vendor.t(article.isCollected ? "已收藏" : "收藏"),
        d: article.isCollected ? 1 : "",
        e: common_vendor.o(($event) => $options.toggleCollect(article, index), article._id),
        f: $data.swipeShowIndex === index ? 1 : "",
        g: "1cf27b2a-4-" + i0,
        h: common_vendor.p({
          article
        }),
        i: $data.swipeShowIndex === index ? 1 : "",
        j: common_vendor.o(($event) => $options.onTouchStart($event, index), article._id),
        k: common_vendor.o((...args) => $options.onTouchEnd && $options.onTouchEnd(...args), article._id),
        l: article._id,
        m: common_vendor.o(($event) => $options.goToDetail(article), article._id)
      };
    }),
    k: $data.loading
  }, $data.loading ? {} : !$data.hasMore && $data.articleList.length > 0 ? {} : $data.articleList.length === 0 ? {} : {}, {
    l: !$data.hasMore && $data.articleList.length > 0,
    m: $data.articleList.length === 0,
    n: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args)),
    o: common_vendor.o((...args) => $options.onLoadMore && $options.onLoadMore(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1cf27b2a"]]);
_sfc_main.__runtimeHooks = 2;
wx.createPage(MiniProgramPage);
