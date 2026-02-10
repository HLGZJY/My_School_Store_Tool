/**
 * 常量定义
 */

// 用户角色
export const USER_ROLES = {
    STUDENT: 'student',
    TEACHER: 'teacher',
    ADMIN: 'admin'
}

// 文章分类
export const ARTICLE_CATEGORIES = {
    ALL: '',
    NOTICE: 'notice',
    ACADEMIC: 'academic',
    ACTIVITY: 'activity',
    SERVICE: 'service'
}

// 分类映射
export const CATEGORY_MAP = {
    [ARTICLE_CATEGORIES.NOTICE]: '通知公告',
    [ARTICLE_CATEGORIES.ACADEMIC]: '学术动态',
    [ARTICLE_CATEGORIES.ACTIVITY]: '社团活动',
    [ARTICLE_CATEGORIES.SERVICE]: '生活服务'
}

// 角色标签映射
export const ROLE_TAG_MAP = {
    [USER_ROLES.STUDENT]: '本科生',
    [USER_ROLES.TEACHER]: '教职工',
    [USER_ROLES.ADMIN]: '教职工'
}

// 紧急程度
export const URGENCY_LEVELS = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
}

// 紧急标签
export const URGENCY_TAGS = {
    [URGENCY_LEVELS.HIGH]: '置顶24小时',
    [URGENCY_LEVELS.MEDIUM]: '本周截止',
    [URGENCY_LEVELS.LOW]: ''
}

// API错误码
export const API_ERROR_CODES = {
    SUCCESS: 0,
    SYSTEM_ERROR: 1000,
    PARAM_ERROR: 1001,
    NOT_LOGIN: 1002,
    NO_PERMISSION: 1003,
    RESOURCE_NOT_FOUND: 1004,
    DATABASE_ERROR: 1005,
    NETWORK_ERROR: 1006,
    THIRD_PARTY_ERROR: 1007,
    WX_LOGIN_ERROR: 2001,
    GET_USER_INFO_ERROR: 2002,
    ARTICLE_NOT_FOUND: 3001,
    ARTICLE_DELETED: 3002,
    ALREADY_COLLECTED: 3003,
    NOT_COLLECTED: 3004,
    SOURCE_NOT_FOUND: 4001,
    SYNC_ERROR: 4002,
    AI_PROCESS_ERROR: 4003,
    AI_CONFIDENCE_LOW: 4004
}
