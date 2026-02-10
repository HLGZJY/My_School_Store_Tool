"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      messages: [],
      page: 1,
      hasMore: true,
      loading: false
    };
  },
  computed: {
    hasUnread() {
      return this.messages.some((m) => !m.isRead);
    }
  },
  onLoad() {
    this.loadMessages();
  },
  onShow() {
    this.page = 1;
    this.hasMore = true;
    this.loadMessages();
  },
  methods: {
    async loadMessages() {
      if (this.loading)
        return;
      this.loading = true;
      try {
        const userId = this.$store.state.user.userId;
        const res = await common_vendor.Vs.callFunction({
          name: "getMessages",
          data: {
            userId,
            type: "all",
            page: this.page,
            pageSize: 20
          }
        });
        if (res.result.code === 0) {
          const { messages, hasMore } = res.result.data;
          if (this.page === 1) {
            this.messages = messages;
          } else {
            this.messages = [...this.messages, ...messages];
          }
          this.hasMore = hasMore;
        }
      } catch (error) {
        console.error("加载消息失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
      }
    },
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.page++;
        this.loadMessages();
      }
    },
    async handleMessageClick(message) {
      if (!message.isRead) {
        await this.markAsRead(message._id);
        message.isRead = true;
      }
      if (message.link) {
        common_vendor.index.navigateTo({
          url: message.link,
          fail: () => {
            common_vendor.index.switchTab({
              url: message.link
            });
          }
        });
      }
    },
    async markAsRead(messageId) {
      try {
        await common_vendor.Vs.callFunction({
          name: "markMessageRead",
          data: {
            userId: this.$store.state.user.userId,
            messageId
          }
        });
      } catch (error) {
        console.error("标记已读失败:", error);
      }
    },
    async markAllRead() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定将所有消息标记为已读吗？",
        success: async (res) => {
          if (res.confirm) {
            try {
              await common_vendor.Vs.callFunction({
                name: "markMessageRead",
                data: {
                  userId: this.$store.state.user.userId,
                  all: true
                }
              });
              common_vendor.index.showToast({
                title: "已全部标记为已读",
                icon: "success"
              });
              this.messages.forEach((m) => {
                m.isRead = true;
              });
            } catch (error) {
              console.error("标记已读失败:", error);
              common_vendor.index.showToast({
                title: "操作失败",
                icon: "none"
              });
            }
          }
        }
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
    }
  }
};
if (!Array) {
  const _component_uni_load_more = common_vendor.resolveComponent("uni-load-more");
  _component_uni_load_more();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $options.hasUnread
  }, $options.hasUnread ? {
    b: common_vendor.o((...args) => $options.markAllRead && $options.markAllRead(...args))
  } : {}, {
    c: $data.messages.length > 0
  }, $data.messages.length > 0 ? common_vendor.e({
    d: common_vendor.f($data.messages, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: common_vendor.t($options.formatTime(item.createTime)),
        c: common_vendor.t(item.content),
        d: item._id,
        e: !item.isRead ? 1 : "",
        f: common_vendor.o(($event) => $options.handleMessageClick(item), item._id)
      };
    }),
    e: $data.loading
  }, $data.loading ? {
    f: common_vendor.p({
      status: "loading"
    })
  } : {}, {
    g: !$data.hasMore && $data.messages.length > 0
  }, !$data.hasMore && $data.messages.length > 0 ? {} : {}) : {}, {
    h: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-4c1b26cf"]]);
wx.createPage(MiniProgramPage);
