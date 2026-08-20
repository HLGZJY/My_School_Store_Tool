<template>
  <view class="container">
    <view class="login-section">
      <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
      <text class="app-name">我的校园信息收藏工具</text>
      <text class="welcome-text">欢迎登录使用，民大er~</text>

      <view class="privacy-check" @click="togglePrivacyAgreement">
        <view class="checkbox" :class="{ checked: privacyAgreed }">
          <uni-icons v-if="privacyAgreed" type="checkmark" size="12" color="#FFFFFF"></uni-icons>
        </view>
        <text class="privacy-text">我已阅读并同意</text>
        <text class="link" @click.stop="showUserAgreement">《用户协议》</text>
        <text class="privacy-text">和</text>
        <text class="link" @click.stop="showPrivacyPolicy">《隐私政策》</text>
      </view>

      <button
        class="login-btn"
        :disabled="!privacyAgreed"
        :class="{ disabled: !privacyAgreed }"
        open-type="getUserInfo"
        @getuserinfo="onGetUserInfo"
      >
        <uni-icons type="weixin" size="20" color="#FFFFFF"></uni-icons>
        <text>微信一键登录</text>
      </button>

      <view class="skip-btn" @click="goBack">
        <text>暂不登录，先看看</text>
      </view>
    </view>
  </view>
</template>

<script>
import { userApi } from "@/api/index";
import { useUserStore } from "@/store";

export default {
  data() {
    return {
      privacyAgreed: false,
    };
  },
  onLoad() {
    // 不再自动登录，让用户自主选择是否登录
    // 如果用户已登录，直接跳转到首页
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      if (userStore.entryType === 'admin') {
        uni.reLaunch({ url: '/pages/admin/dashboard' })
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }
  },
  methods: {
    async autoLogin() {
      // 获取微信登录code
      const loginRes = await uni.login({
        provider: "weixin",
      });

      try {
        uni.showLoading({ title: "检测中..." });

        // 调用云函数，自动查询用户状态
        const result = await userApi.login(loginRes.code, null); // null 表示只查询不创建

        // 调试：显示openid
        console.log("登录结果:", result);

        uni.hideLoading();

        const data = result;
        const userStore = useUserStore();

        // 需要选择入口（同时是用户和管理员）
        if (data.needSelect) {
          this.showEntrySelector(data);
          return;
        }

        // 只有管理员身份，询问是否创建用户账号
        if (data.needCreateUser) {
          this.showCreateUserPrompt(data);
          return;
        }

        const { userId, openid, token, entryType } = data;

        // 使用Pinia store保存用户信息
        userStore.userId = userId;
        userStore.token = token;
        userStore.userInfo = data.userInfo || data.adminInfo;
        userStore.entryType = entryType;
        userStore.persist();

        // 根据入口类型跳转
        if (entryType === "admin") {
          // 管理员进入管理端
          uni.showToast({
            title: "管理员登录成功",
            icon: "success",
          });
          setTimeout(() => {
            uni.reLaunch({
              url: "/pages/admin/dashboard",
            });
          }, 1000);
        } else {
          // 普通用户进入首页
          uni.showToast({
            title: "登录成功",
            icon: "success",
          });
          setTimeout(() => {
            uni.switchTab({
              url: "/pages/index/index",
            });
          }, 1000);
        }
      } catch (error) {
        console.error("自动登录失败:", error);
        uni.hideLoading();
      }
    },

    // 显示入口选择器
    showEntrySelector(data) {
      uni.showModal({
        title: "请选择入口",
        content: "您同时拥有用户和管理员身份，请选择要进入的端",
        confirmText: "管理端",
        cancelText: "客户端",
        success: async (res) => {
          const userStore = useUserStore();
          const entryType = res.confirm ? "admin" : "user";

          // 使用Pinia store保存选择结果
          userStore.userId = data.userInfo?.openid || data.adminInfo?.openid;
          userStore.token = data.token;
          userStore.entryType = entryType;
          userStore.persist(); // 添加persist确保数据在页面重新加载时不会丢失

          if (entryType === "admin") {
            userStore.userInfo = data.adminInfo;
            uni.showToast({
              title: "进入管理端",
              icon: "success",
            });
            setTimeout(() => {
              uni.reLaunch({
                url: "/pages/admin/dashboard",
              });
            }, 1000);
          } else {
            userStore.userInfo = data.userInfo;
            uni.showToast({
              title: "进入客户端",
              icon: "success",
            });
            setTimeout(() => {
              uni.switchTab({
                url: "/pages/index/index",
              });
            }, 1000);
          }
        },
      });
    },

    // 仅管理员账号，询问是否创建用户账号
    showCreateUserPrompt(data) {
      uni.showModal({
        title: "选择入口",
        content: "您目前只有管理员账号，是否同时创建一个客户端用户账号？",
        confirmText: "创建用户",
        cancelText: "仅用管理员",
        success: async (res) => {
          const userStore = useUserStore();

          if (res.confirm) {
            // 选择创建用户账号，需要重新登录并传递 userInfo
            uni.showLoading({ title: "创建中..." });
            try {
              const loginRes = await uni.login({ provider: "weixin" });
              // 调用登录云函数，传入 userInfo 以创建用户
              const result = await userApi.login(loginRes.code, {
                nickName: "微信用户",
                avatarUrl: "",
              });
              uni.hideLoading();

              // result 是 login 云函数返回的 data 部分
              // 此时用户已在 users 集合中创建
              userStore.userId = result.openid;
              userStore.token = result.token;
              userStore.entryType = result.entryType;
              userStore.userInfo = result.userInfo;
              userStore.persist();

              uni.showToast({
                title: "用户账号创建成功",
                icon: "success",
              });
              setTimeout(() => {
                uni.switchTab({ url: "/pages/index/index" });
              }, 1000);
            } catch (e) {
              uni.hideLoading();
              console.error("创建用户失败:", e);
              uni.showToast({
                title: "创建失败",
                icon: "none",
              });
            }
          } else {
            // 仅使用管理员身份登录
            userStore.userId = data.openid;
            userStore.token = data.token;
            userStore.entryType = "admin";
            userStore.userInfo = data.adminInfo || data;
            userStore.persist();

            uni.showToast({
              title: "管理员登录成功",
              icon: "success",
            });
            setTimeout(() => {
              uni.reLaunch({ url: "/pages/admin/dashboard" });
            }, 1000);
          }
        },
      });
    },

    goBack() {
      // 用户选择暂不登录，直接跳转到首页
      uni.switchTab({
        url: '/pages/index/index',
      });
    },

    togglePrivacyAgreement() {
      this.privacyAgreed = !this.privacyAgreed;
    },

    onGetUserInfo(e) {
      if (!this.privacyAgreed) {
        uni.showToast({
          title: "请先阅读并同意用户协议和隐私政策",
          icon: "none",
        });
        return;
      }
      if (e.detail.userInfo) {
        this.userInfo = e.detail.userInfo;
        this.login();
      } else {
        uni.showToast({
          title: "需要授权才能继续使用",
          icon: "none",
        });
      }
    },

    async login() {
      uni.showLoading({ title: "登录中..." });

      try {
        // 获取微信登录code
        const loginRes = await uni.login({
          provider: "weixin",
        });

        // 调用云函数登录
        const result = await userApi.login(loginRes.code, this.userInfo);

        const data = result;
        const userStore = useUserStore();

        // 需要选择入口（同时是用户和管理员）
        if (data.needSelect) {
          uni.hideLoading();
          this.showEntrySelector(data);
          return;
        }

        const { userId, openid, token, entryType } = data;

        // 使用Pinia store保存用户信息
        userStore.userId = userId;
        userStore.token = token;
        userStore.userInfo = data.userInfo || data.adminInfo;
        userStore.entryType = entryType;
        userStore.persist();

        uni.hideLoading();

        // 根据入口类型跳转
        if (entryType === "admin") {
          uni.showToast({
            title: "管理员登录成功",
            icon: "success",
          });
          setTimeout(() => {
            uni.reLaunch({
              url: "/pages/admin/dashboard",
            });
          }, 1500);
        } else {
          uni.showToast({
            title: "登录成功",
            icon: "success",
          });

          setTimeout(() => {
            uni.switchTab({
              url: "/pages/index/index",
            });
          }, 1500);
        }
      } catch (error) {
        console.error("登录失败:", error);
        uni.hideLoading();
        uni.showToast({
          title: "登录失败，请重试",
          icon: "none",
        });
      }
    },

    showUserAgreement() {
      uni.navigateTo({
        url: '/pages/about/policy?type=user-agreement&title=' + encodeURIComponent('用户协议')
      });
    },

    showPrivacyPolicy() {
      uni.navigateTo({
        url: '/pages/about/policy?type=privacy-policy&title=' + encodeURIComponent('隐私政策')
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f7f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-section {
  width: 100%;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo {
  width: 120px;
  height: 120px;
  border-radius: 24px;
  margin-bottom: 24px;
}

.app-name {
  font-size: 24px;
  font-weight: 600;
  color: #0a2540;
  margin-bottom: 8px;
}

.welcome-text {
  font-size: 16px;
  color: #a0aec0;
  margin-bottom: 60px;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  background-color: #07c160;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;

  &::after {
    border: none;
  }

  text {
    margin-left: 8px;
  }

  &.disabled {
    background-color: #a0aec0;
    opacity: 0.7;
  }
}

.privacy-check {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 20px;
  padding: 0 20px;

  .checkbox {
    width: 18px;
    height: 18px;
    border: 2px solid #a0aec0;
    border-radius: 4px;
    margin-right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &.checked {
      background-color: #07c160;
      border-color: #07c160;
    }
  }

  .privacy-text {
    font-size: 12px;
    color: #a0aec0;
  }

  .link {
    font-size: 12px;
    color: #00d4aa;
    margin: 0 2px;
  }
}

.skip-btn {
  margin-top: 16px;
  padding: 10px 20px;

  text {
    font-size: 14px;
    color: #A0AEC0;
  }
}
</style>
