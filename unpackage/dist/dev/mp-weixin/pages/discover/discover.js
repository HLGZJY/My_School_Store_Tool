"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      ranking: [],
      tags: [],
      timeline: [],
      expandedTimeline: null
    };
  },
  onLoad() {
    this.loadHotRanking();
    this.loadTagCloud();
    this.loadTimeline();
  },
  methods: {
    async loadHotRanking() {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getHotRanking",
          data: {
            type: "view",
            days: 7,
            limit: 5
          }
        });
        if (res.result.code === 0) {
          this.ranking = res.result.data.ranking || [];
        }
      } catch (error) {
        console.error("加载热门排行失败:", error);
      }
    },
    async loadTagCloud() {
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "getTagCloud",
          data: {
            limit: 20
          }
        });
        if (res.result.code === 0) {
          this.tags = res.result.data.tags || [];
        }
      } catch (error) {
        console.error("加载标签云失败:", error);
      }
    },
    async loadTimeline() {
      try {
        const userId = this.$store.state.user.userId;
        const res = await common_vendor.Vs.callFunction({
          name: "getTimeline",
          data: {
            userId
          }
        });
        if (res.result.code === 0) {
          this.timeline = res.result.data.timeline || [];
        }
      } catch (error) {
        console.error("加载时间轴失败:", error);
      }
    },
    getTagSize(count) {
      const minCount = Math.min(...this.tags.map((t) => t.count));
      const maxCount = Math.max(...this.tags.map((t) => t.count));
      const ratio = (count - minCount) / (maxCount - minCount);
      const minSize = 14;
      const maxSize = 18;
      return minSize + ratio * (maxSize - minSize) + "px";
    },
    toggleTimeline(item) {
      if (this.expandedTimeline && this.expandedTimeline.timestamp === item.timestamp) {
        item.expanded = !item.expanded;
        if (!item.expanded) {
          this.expandedTimeline = null;
        }
      } else {
        if (this.expandedTimeline) {
          this.expandedTimeline.expanded = false;
        }
        item.expanded = true;
        this.expandedTimeline = item;
        this.loadTimelineArticles(item);
      }
    },
    async loadTimelineArticles(timelineItem) {
      try {
        const userId = this.$store.state.user.userId;
        const res = await common_vendor.Vs.callFunction({
          name: "getArticles",
          data: {
            userId,
            page: 1,
            pageSize: 50,
            startDate: timelineItem.timestamp,
            endDate: timelineItem.timestamp + 24 * 60 * 60 * 1e3
          }
        });
        if (res.result.code === 0) {
          timelineItem.articles = res.result.data.articles || [];
        }
      } catch (error) {
        console.error("加载时间轴文章失败:", error);
      }
    },
    searchTag(tag) {
      common_vendor.index.navigateTo({
        url: `/pages/search/search?keyword=${tag}`
      });
    },
    viewMoreRanking() {
      common_vendor.index.showToast({
        title: "功能开发中",
        icon: "none"
      });
    },
    goToDetail(id) {
      common_vendor.index.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.viewMoreRanking && $options.viewMoreRanking(...args)),
    b: common_vendor.f($data.ranking, (item, index, i0) => {
      return {
        a: common_vendor.t(index + 1),
        b: common_vendor.n("rank-" + (index + 1)),
        c: common_vendor.t(item.title),
        d: common_vendor.t(item.count),
        e: item._id,
        f: common_vendor.o(($event) => $options.goToDetail(item._id), item._id)
      };
    }),
    c: common_vendor.f($data.tags, (tag, k0, i0) => {
      return {
        a: common_vendor.t(tag.name),
        b: tag.name,
        c: $options.getTagSize(tag.count),
        d: common_vendor.o(($event) => $options.searchTag(tag.name), tag.name)
      };
    }),
    d: common_vendor.f($data.timeline, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.date),
        b: common_vendor.t(item.count),
        c: "7f6951af-0-" + i0,
        d: common_vendor.p({
          type: item.expanded ? "up" : "down",
          size: "16",
          color: "#A0AEC0"
        }),
        e: item.timestamp,
        f: common_vendor.o(($event) => $options.toggleTimeline(item), item.timestamp)
      };
    }),
    e: $data.expandedTimeline
  }, $data.expandedTimeline ? {
    f: common_vendor.f($data.expandedTimeline.articles, (article, k0, i0) => {
      return {
        a: common_vendor.t(article.title),
        b: common_vendor.t($options.formatTime(article.publishTime)),
        c: article._id,
        d: common_vendor.o(($event) => $options.goToDetail(article._id), article._id)
      };
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7f6951af"]]);
wx.createPage(MiniProgramPage);
