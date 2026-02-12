"use strict";
const common_vendor = require("../../common/vendor.js");
const user = {
  namespaced: true,
  state: {
    userId: null,
    // 现在等于 openid
    token: null,
    userInfo: null
  },
  mutations: {
    setUserId(state, userId) {
      state.userId = userId;
    },
    setToken(state, token) {
      state.token = token;
    },
    setUserInfo(state, userInfo) {
      state.userInfo = userInfo;
    },
    setRole(state, role) {
      if (state.userInfo) {
        state.userInfo.role = role;
      }
    },
    clear(state) {
      state.userId = null;
      state.token = null;
      state.userInfo = null;
    }
  },
  actions: {
    async login({ commit }, { code, userInfo }) {
      const res = await common_vendor.Vs.callFunction({
        name: "login",
        data: { code, userInfo }
      });
      if (res.result.code === 0) {
        const { userId, openid, token } = res.result.data;
        commit("setUserId", userId);
        commit("setToken", token);
        common_vendor.index.setStorageSync("openid", openid);
        common_vendor.index.setStorageSync("token", token);
      }
      return res.result;
    },
    async logout({ commit }) {
      commit("clear");
      common_vendor.index.clearStorageSync();
    }
  }
};
exports.user = user;
