"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      articleId: "",
      article: {},
      relatedArticles: [],
      isCollected: false
    };
  },
  onLoad(options) {
    this.articleId = options.id;
    this.loadArticleDetail();
    this.loadCollectStatus();
    this.recordRead();
  },
  methods: {
    async loadArticleDetail() {
      try {
        const userId = this.$store.state.user.userId;
        const res = await common_vendor.Vs.callFunction({
          name: "getArticleDetail",
          data: {
            articleId: this.articleId,
            userId
          }
        });
        if (res.result.code === 0) {
          this.article = res.result.data;
          this.relatedArticles = res.result.data.relatedArticles || [];
        }
      } catch (error) {
        console.error("加载文章详情失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      }
    },
    async loadCollectStatus() {
      try {
        const userId = this.$store.state.user.userId;
        if (!userId)
          return;
        const res = await common_vendor.Vs.callFunction({
          name: "getCollections",
          data: {
            userId,
            articleId: this.articleId,
            pageSize: 1
          }
        });
        if (res.result.code === 0) {
          this.isCollected = res.result.data.collections.length > 0;
        }
      } catch (error) {
        console.error("加载收藏状态失败:", error);
      }
    },
    async recordRead() {
      try {
        const userId = this.$store.state.user.userId;
        if (!userId)
          return;
        common_vendor.Vs.callFunction({
          name: "recordRead",
          data: {
            userId,
            articleId: this.articleId,
            duration: 0
          }
        });
      } catch (error) {
        console.error("记录阅读失败:", error);
      }
    },
    async toggleCollect() {
      const userId = this.$store.state.user.userId;
      if (!userId) {
        common_vendor.index.showToast({
          title: "请先登录",
          icon: "none"
        });
        return;
      }
      try {
        const res = await common_vendor.Vs.callFunction({
          name: "collectArticle",
          data: {
            userId,
            articleId: this.articleId,
            action: this.isCollected ? "uncollect" : "collect"
          }
        });
        if (res.result.code === 0) {
          this.isCollected = !this.isCollected;
          common_vendor.index.showToast({
            title: this.isCollected ? "收藏成功" : "取消收藏",
            icon: "success"
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
    openOriginal() {
      if (!this.article.originalUrl)
        return;
      common_vendor.index.showModal({
        title: "提示",
        content: "即将跳转到第三方网站，请注意辨别信息真伪",
        confirmText: "继续",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.setClipboardData({
              data: this.article.originalUrl,
              success: () => {
                common_vendor.index.showToast({
                  title: "链接已复制，请粘贴到浏览器打开",
                  icon: "none"
                });
              }
            });
          }
        }
      });
    },
    share() {
      common_vendor.index.showShareMenu({
        withShareTicket: true
      });
    },
    goBack() {
      common_vendor.index.navigateBack();
    },
    goToArticle(id) {
      common_vendor.index.redirectTo({
        url: `/pages/detail/detail?id=${id}`
      });
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c;
  return common_vendor.e({
    a: common_vendor.o($options.goBack),
    b: common_vendor.p({
      type: "back",
      size: "20",
      color: "#0A2540"
    }),
    c: common_vendor.p({
      type: "redo",
      size: "20",
      color: "#0A2540"
    }),
    d: common_vendor.o((...args) => $options.share && $options.share(...args)),
    e: common_vendor.t($data.article.title),
    f: common_vendor.t($data.article.sourceName),
    g: common_vendor.t($options.formatTime($data.article.publishTime)),
    h: common_vendor.t(((_a = $data.article.stats) == null ? void 0 : _a.viewCount) || 0),
    i: common_vendor.f(((_b = $data.article.tags) == null ? void 0 : _b.source) || [], (tag, k0, i0) => {
      return {
        a: common_vendor.t(tag),
        b: tag
      };
    }),
    j: common_vendor.f(((_c = $data.article.tags) == null ? void 0 : _c.role) || [], (tag, k0, i0) => {
      return {
        a: common_vendor.t(tag),
        b: tag
      };
    }),
    k: $data.article.summary
  }, $data.article.summary ? {
    l: common_vendor.t($data.article.summary)
  } : {}, {
    m: $data.article.content,
    n: $data.relatedArticles.length > 0
  }, $data.relatedArticles.length > 0 ? {
    o: common_vendor.f($data.relatedArticles, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: common_vendor.t(item.sourceName),
        c: common_vendor.t($options.formatTime(item.publishTime)),
        d: item._id,
        e: common_vendor.o(($event) => $options.goToArticle(item._id), item._id)
      };
    })
  } : {}, {
    p: common_vendor.p({
      type: $data.isCollected ? "heart-filled" : "heart",
      size: "22",
      color: $data.isCollected ? "#EF4444" : "#A0AEC0"
    }),
    q: common_vendor.t($data.isCollected ? "已收藏" : "收藏"),
    r: $data.isCollected ? 1 : "",
    s: common_vendor.o((...args) => $options.toggleCollect && $options.toggleCollect(...args)),
    t: $data.article.originalUrl
  }, $data.article.originalUrl ? {
    v: common_vendor.o((...args) => $options.openOriginal && $options.openOriginal(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-eca06f3c"]]);
wx.createPage(MiniProgramPage);
