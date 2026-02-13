"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      filterStatus: "pending",
      articleList: [],
      loading: false,
      page: 1,
      pageSize: 20
    };
  },
  onLoad() {
    this.loadArticles();
  },
  onPullDownRefresh() {
    this.page = 1;
    this.loadArticles().then(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  methods: {
    changeFilter(status) {
      this.filterStatus = status;
      this.page = 1;
      this.loadArticles();
    },
    async loadArticles() {
      this.loading = true;
      try {
        let where = {};
        if (this.filterStatus !== "all") {
          where.status = this.filterStatus;
        }
        const res = await common_vendor.Vs.callFunction({
          name: "adminGetArticles",
          data: {
            where,
            page: this.page,
            pageSize: this.pageSize
          }
        });
        if (res.result.code === 0) {
          this.articleList = res.result.data.list;
        }
      } catch (e) {
        console.error("加载失败:", e);
      } finally {
        this.loading = false;
      }
    },
    showDetail(item) {
      common_vendor.index.navigateTo({
        url: `/pages/detail/detail?id=${item._id}`
      });
    },
    async handleApprove(item) {
      common_vendor.index.showModal({
        title: "确认通过",
        content: "确定要通过这篇审核吗？",
        success: async (res) => {
          if (res.confirm) {
            try {
              const res2 = await common_vendor.Vs.callFunction({
                name: "approveArticle",
                data: {
                  articleId: item._id,
                  action: "approve"
                }
              });
              if (res2.result.code === 0) {
                common_vendor.index.showToast({ title: "已通过", icon: "success" });
                this.loadArticles();
              } else {
                common_vendor.index.showToast({ title: res2.result.message, icon: "none" });
              }
            } catch (e) {
              common_vendor.index.showToast({ title: "操作失败", icon: "none" });
            }
          }
        }
      });
    },
    async handleReject(item) {
      common_vendor.index.showModal({
        title: "拒绝原因",
        content: "请输入拒绝原因",
        editable: true,
        success: async (res) => {
          if (res.confirm) {
            try {
              const res2 = await common_vendor.Vs.callFunction({
                name: "approveArticle",
                data: {
                  articleId: item._id,
                  action: "reject",
                  note: res2.content
                }
              });
              if (res2.result.code === 0) {
                common_vendor.index.showToast({ title: "已拒绝", icon: "success" });
                this.loadArticles();
              } else {
                common_vendor.index.showToast({ title: res2.result.message, icon: "none" });
              }
            } catch (e) {
              common_vendor.index.showToast({ title: "操作失败", icon: "none" });
            }
          }
        }
      });
    },
    getStatusText(status) {
      const map = {
        pending: "待审核",
        published: "已发布",
        rejected: "已拒绝",
        draft: "草稿"
      };
      return map[status] || status;
    },
    formatTime(timestamp) {
      if (!timestamp)
        return "";
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.n({
      active: $data.filterStatus === "pending"
    }),
    b: common_vendor.o(($event) => $options.changeFilter("pending")),
    c: common_vendor.n({
      active: $data.filterStatus === "rejected"
    }),
    d: common_vendor.o(($event) => $options.changeFilter("rejected")),
    e: common_vendor.n({
      active: $data.filterStatus === "all"
    }),
    f: common_vendor.o(($event) => $options.changeFilter("all")),
    g: common_vendor.f($data.articleList, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.title),
        b: common_vendor.t($options.getStatusText(item.status)),
        c: common_vendor.n(item.status),
        d: common_vendor.t(item.sourceName),
        e: common_vendor.t($options.formatTime(item.createTime)),
        f: item.summary
      }, item.summary ? {
        g: common_vendor.t(item.summary)
      } : {}, {
        h: item.status === "pending"
      }, item.status === "pending" ? {
        i: common_vendor.o(($event) => $options.handleApprove(item), item._id),
        j: common_vendor.o(($event) => $options.handleReject(item), item._id)
      } : {}, {
        k: item._id,
        l: common_vendor.o(($event) => $options.showDetail(item), item._id)
      });
    }),
    h: $data.articleList.length === 0 && !$data.loading
  }, $data.articleList.length === 0 && !$data.loading ? {} : {}, {
    i: $data.loading
  }, $data.loading ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ee62b3dc"]]);
wx.createPage(MiniProgramPage);
