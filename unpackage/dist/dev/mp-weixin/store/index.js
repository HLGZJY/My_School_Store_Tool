"use strict";
const common_vendor = require("../common/vendor.js");
const store_modules_user = require("./modules/user.js");
const store = common_vendor.createStore({
  modules: {
    user: store_modules_user.user
  },
  state: {},
  mutations: {},
  actions: {}
});
exports.store = store;
