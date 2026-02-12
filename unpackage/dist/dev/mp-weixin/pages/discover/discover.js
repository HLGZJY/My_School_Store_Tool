"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_cache = require("../../utils/cache.js");
const HotRanking = () => "./components/HotRanking.js";
const TagCloud = () => "./components/TagCloud.js";
const Timeline = () => "./components/Timeline.js";
const SubscribeManager = () => "./components/SubscribeManager.js";
const _sfc_main = {
  name: "Discover",
  components: {
    HotRanking,
    TagCloud,
    Timeline,
    SubscribeManager
  },
  data() {
    return {
      ranking: [],
      tags: [],
      timeline: [],
      subscribed: [],
      recommended: []
    };
  },
  onLoad() {
    this.loadHotRanking();
    this.loadTagCloud();
    this.loadTimeline();
    this.loadSubscriptions();
  },
  methods: {
    // 加载热门排行
    async loadHotRanking() {
      const data = await utils_cache.loadWithCache("discover_hot", "DISCOVER", async () => {
        const res = await common_vendor.Vs.callFunction({
          name: "getHotArticles",
          data: {
            days: 7,
            limit: 5
          }
        });
        if (res.result.code === 0) {
          return res.result.data || [];
        }
        return [];
      });
      this.ranking = data;
    },
    // 加载标签云
    async loadTagCloud() {
      const data = await utils_cache.loadWithCache("discover_tags", "DISCOVER", async () => {
        const res = await common_vendor.Vs.callFunction({
          name: "getTagCloud",
          data: {
            limit: 20
          }
        });
        if (res.result.code === 0) {
          return res.result.data || [];
        }
        return [];
      });
      this.tags = data;
    },
    // 加载时间轴
    async loadTimeline() {
      const data = await utils_cache.loadWithCache("discover_timeline", "DISCOVER", async () => {
        const res = await common_vendor.Vs.callFunction({
          name: "getTimeline"
        });
        if (res.result.code === 0) {
          return res.result.data || [];
        }
        return [];
      });
      this.timeline = data;
    },
    // 加载时间轴文章
    async loadTimelineArticles(timelineItem) {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getArticles",
          data: {
            page: 1,
            pageSize: 50,
            startDate: timelineItem.timestamp,
            endDate: timelineItem.timestamp + 24 * 60 * 60 * 1e3
          }
        });
        if (res.result.code === 0) {
          const articles = res.result.data.articles || [];
          const index = this.timeline.findIndex((t) => t.timestamp === timelineItem.timestamp);
          if (index >= 0) {
            this.timeline[index].articles = articles;
          }
        }
      } catch (error) {
        console.error("加载时间轴文章失败:", error);
      }
    },
    // 加载订阅列表
    loadSubscriptions() {
      const allSources = [
        { id: "jwc", name: "教务处", type: "official" },
        { id: "library", name: "图书馆", type: "official" },
        { id: "xsc", name: "学生处", type: "official" },
        { id: "cs", name: "计算机学院", type: "college" },
        { id: "jyzd", name: "就业指导中心", type: "official" }
      ];
      const subscriptions = common_vendor.index.getStorageSync("subscriptions") || [];
      this.subscribed = allSources.filter(
        (s) => subscriptions.some((sub) => sub.id === s.id)
      );
      this.recommended = allSources.filter(
        (s) => !subscriptions.some((sub) => sub.id === s.id)
      );
    },
    // 搜索标签
    searchTag(tagName) {
      common_vendor.index.navigateTo({
        url: `/pages/search/search?keyword=${tagName}`
      });
    },
    // 查看更多订阅
    viewMoreSubscribe() {
      common_vendor.index.navigateTo({
        url: "/pages/subscribe/subscribe"
      });
    },
    // 订阅
    handleSubscribe(item) {
      const subscriptions = common_vendor.index.getStorageSync("subscriptions") || [];
      subscriptions.push({
        id: item.id,
        name: item.name,
        subscribeTime: Date.now()
      });
      common_vendor.index.setStorageSync("subscriptions", subscriptions);
      this.subscribed.push(item);
      this.recommended = this.recommended.filter((r) => r.id !== item.id);
      common_vendor.index.showToast({
        title: "订阅成功",
        icon: "success"
      });
    },
    // 取消订阅
    handleUnsubscribe(item) {
      const subscriptions = common_vendor.index.getStorageSync("subscriptions") || [];
      const index = subscriptions.findIndex((s) => s.id === item.id);
      if (index >= 0) {
        subscriptions.splice(index, 1);
      }
      common_vendor.index.setStorageSync("subscriptions", subscriptions);
      this.recommended.push(item);
      this.subscribed = this.subscribed.filter((s) => s.id !== item.id);
      common_vendor.index.showToast({
        title: "已取消订阅",
        icon: "none"
      });
    },
    // 跳转详情
    goToDetail(id) {
      common_vendor.index.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    }
  }
};
if (!Array) {
  const _component_HotRanking = common_vendor.resolveComponent("HotRanking");
  const _component_TagCloud = common_vendor.resolveComponent("TagCloud");
  const _component_Timeline = common_vendor.resolveComponent("Timeline");
  const _component_SubscribeManager = common_vendor.resolveComponent("SubscribeManager");
  (_component_HotRanking + _component_TagCloud + _component_Timeline + _component_SubscribeManager)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o($options.goToDetail),
    b: common_vendor.p({
      ranking: $data.ranking
    }),
    c: common_vendor.o($options.searchTag),
    d: common_vendor.p({
      tags: $data.tags
    }),
    e: common_vendor.sr("timelineRef", "7f6951af-2"),
    f: common_vendor.o($options.loadTimelineArticles),
    g: common_vendor.o($options.goToDetail),
    h: common_vendor.p({
      timeline: $data.timeline
    }),
    i: common_vendor.o($options.handleSubscribe),
    j: common_vendor.o($options.handleUnsubscribe),
    k: common_vendor.o($options.viewMoreSubscribe),
    l: common_vendor.p({
      subscribed: $data.subscribed,
      recommended: $data.recommended
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7f6951af"]]);
wx.createPage(MiniProgramPage);
