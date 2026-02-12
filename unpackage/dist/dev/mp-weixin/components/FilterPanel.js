"use strict";
const common_vendor = require("../common/vendor.js");
const _sfc_main = {
  name: "FilterPanel",
  props: {
    // 显示哪些筛选
    showSource: {
      type: Boolean,
      default: true
    },
    showTag: {
      type: Boolean,
      default: true
    },
    showTime: {
      type: Boolean,
      default: true
    },
    // 数据源
    sources: {
      type: Array,
      default: () => [
        { id: "jwc", name: "教务处" },
        { id: "library", name: "图书馆" },
        { id: "xsc", name: "学生处" },
        { id: "cs", name: "计算机学院" },
        { id: "jyzd", name: "就业指导中心" },
        { id: "yjs", name: "研究生院" },
        { id: "kjc", name: "科技处" },
        { id: "rsc", name: "人事处" }
      ]
    },
    tags: {
      type: Array,
      default: () => ["通知", "讲座", "活动", "竞赛", "讲座预告", "考试通知", "比赛", "招聘"]
    }
  },
  emits: ["filterChange"],
  data() {
    return {
      showPanel: false,
      selectedSource: "",
      selectedTag: "",
      selectedTimeRange: "",
      timeRangeLabels: {
        "1d": "最近1天",
        "7d": "最近7天",
        "30d": "最近1个月",
        "all": "更久"
      }
    };
  },
  computed: {
    timeRanges() {
      return [
        { value: "1d", label: "最近1天" },
        { value: "7d", label: "最近7天" },
        { value: "30d", label: "最近1个月" },
        { value: "all", label: "更久" }
      ];
    },
    hasActiveFilters() {
      return !!(this.selectedSource || this.selectedTag || this.selectedTimeRange);
    },
    activeFilters() {
      const filters = {};
      if (this.selectedSource) {
        const source = this.sources.find((s) => s.id === this.selectedSource);
        filters.sourceName = source ? source.name : "";
      }
      if (this.selectedTag) {
        filters.tag = this.selectedTag;
      }
      if (this.selectedTimeRange) {
        filters.timeRange = this.selectedTimeRange;
      }
      return filters;
    }
  },
  methods: {
    togglePanel() {
      this.showPanel = !this.showPanel;
    },
    closePanel() {
      this.showPanel = false;
    },
    selectSource(id) {
      this.selectedSource = this.selectedSource === id ? "" : id;
    },
    selectTag(tag) {
      this.selectedTag = this.selectedTag === tag ? "" : tag;
    },
    selectTimeRange(value) {
      this.selectedTimeRange = this.selectedTimeRange === value ? "" : value;
    },
    clearSource() {
      this.selectedSource = "";
    },
    clearTag() {
      this.selectedTag = "";
    },
    clearTimeRange() {
      this.selectedTimeRange = "";
    },
    resetFilters() {
      this.selectedSource = "";
      this.selectedTag = "";
      this.selectedTimeRange = "";
    },
    confirmFilters() {
      const filters = {
        sourceId: this.selectedSource || "",
        tag: this.selectedTag || "",
        timeRange: this.selectedTimeRange || ""
      };
      this.$emit("filterChange", filters);
      this.showPanel = false;
    },
    // 外部设置筛选条件
    setFilters(filters) {
      if (filters.sourceId)
        this.selectedSource = filters.sourceId;
      if (filters.tag)
        this.selectedTag = filters.tag;
      if (filters.timeRange)
        this.selectedTimeRange = filters.timeRange;
    },
    // 清空筛选
    clearFilters() {
      this.resetFilters();
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  _component_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $options.activeFilters.sourceName
  }, $options.activeFilters.sourceName ? {
    b: common_vendor.t($options.activeFilters.sourceName),
    c: common_vendor.p({
      type: "closeempty",
      size: "12",
      color: "#FFFFFF"
    }),
    d: common_vendor.o((...args) => $options.clearSource && $options.clearSource(...args))
  } : {}, {
    e: $options.activeFilters.tag
  }, $options.activeFilters.tag ? {
    f: common_vendor.t($options.activeFilters.tag),
    g: common_vendor.p({
      type: "closeempty",
      size: "12",
      color: "#FFFFFF"
    }),
    h: common_vendor.o((...args) => $options.clearTag && $options.clearTag(...args))
  } : {}, {
    i: $options.activeFilters.timeRange
  }, $options.activeFilters.timeRange ? {
    j: common_vendor.t($data.timeRangeLabels[$options.activeFilters.timeRange]),
    k: common_vendor.p({
      type: "closeempty",
      size: "12",
      color: "#FFFFFF"
    }),
    l: common_vendor.o((...args) => $options.clearTimeRange && $options.clearTimeRange(...args))
  } : {}, {
    m: common_vendor.p({
      type: "funnel",
      size: "18",
      color: $options.hasActiveFilters ? "#00D4AA" : "#A0AEC0"
    }),
    n: $options.hasActiveFilters ? 1 : "",
    o: $data.showPanel ? 1 : "",
    p: common_vendor.o((...args) => $options.togglePanel && $options.togglePanel(...args)),
    q: $data.showPanel
  }, $data.showPanel ? common_vendor.e({
    r: $props.showSource
  }, $props.showSource ? {
    s: common_vendor.f($props.sources, (source, k0, i0) => {
      return {
        a: common_vendor.t(source.name),
        b: source.id,
        c: $data.selectedSource === source.id ? 1 : "",
        d: common_vendor.o(($event) => $options.selectSource(source.id), source.id)
      };
    })
  } : {}, {
    t: $props.showTag
  }, $props.showTag ? {
    v: common_vendor.f($props.tags, (tag, k0, i0) => {
      return {
        a: common_vendor.t(tag),
        b: tag,
        c: $data.selectedTag === tag ? 1 : "",
        d: common_vendor.o(($event) => $options.selectTag(tag), tag)
      };
    })
  } : {}, {
    w: $props.showTime
  }, $props.showTime ? {
    x: common_vendor.f($options.timeRanges, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.label),
        b: item.value,
        c: $data.selectedTimeRange === item.value ? 1 : "",
        d: common_vendor.o(($event) => $options.selectTimeRange(item.value), item.value)
      };
    })
  } : {}, {
    y: common_vendor.o((...args) => $options.resetFilters && $options.resetFilters(...args)),
    z: common_vendor.o((...args) => $options.confirmFilters && $options.confirmFilters(...args)),
    A: common_vendor.o(() => {
    })
  }) : {}, {
    B: $data.showPanel
  }, $data.showPanel ? {
    C: common_vendor.o((...args) => $options.closePanel && $options.closePanel(...args))
  } : {});
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-01c0866d"]]);
wx.createComponent(Component);
