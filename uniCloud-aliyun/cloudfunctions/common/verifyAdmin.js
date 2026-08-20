'use strict';

const db = uniCloud.database();
const { ERROR_CODES } = require('./constants');

/**
 * Verify if user has admin permissions
 * @param {string} openid - User's OpenID
 * @param {string[]} requiredPermissions - Optional array of required permissions
 * @returns {Promise<Object>} { isAdmin: boolean, admin: Object|null }
 */
async function verifyAdmin(openid, requiredPermissions = []) {
    if (!openid) {
        return {
            isAdmin: false,
            error: {
                code: ERROR_CODES.NOT_LOGIN,
                message: '用户未登录'
            }
        };
    }

    try {
        const adminQuery = await db.collection('admins')
            .where({ openid, status: 'active' })
            .get();

        if (!adminQuery.data || adminQuery.data.length === 0) {
            return {
                isAdmin: false,
                error: {
                    code: ERROR_CODES.NO_PERMISSION,
                    message: '无管理员权限'
                }
            };
        }

        const adminData = adminQuery.data[0];

        // Check specific permissions if required
        if (requiredPermissions.length > 0) {
            const userPermissions = adminData.permissions || [];
            const hasAllPermissions = requiredPermissions.every(
                perm => userPermissions.includes(perm)
            );

            if (!hasAllPermissions) {
                return {
                    isAdmin: false,
                    error: {
                        code: ERROR_CODES.NO_PERMISSION,
                        message: '权限不足'
                    }
                };
            }
        }

        return {
            isAdmin: true,
            admin: {
                adminId: adminData._id,
                openid: adminData.openid,
                permissions: adminData.permissions || [],
                nickname: adminData.nickname,
                avatar: adminData.avatar
            }
        };
    } catch (error) {
        console.error('[verifyAdmin] Error:', error);
        return {
            isAdmin: false,
            error: {
                code: ERROR_CODES.SYSTEM_ERROR,
                message: '权限验证失败: ' + error.message
            }
        };
    }
}

/**
 * Middleware-style admin check that throws on failure
 * @param {string} openid - User's OpenID
 * @param {string[]} requiredPermissions - Optional required permissions
 * @throws {Object} Error object with code and message
 */
async function requireAdmin(openid, requiredPermissions = []) {
    const result = await verifyAdmin(openid, requiredPermissions);

    if (!result.isAdmin) {
        const error = result.error;
        throw {
            code: error.code,
            message: error.message,
            _isAdminError: true
        };
    }

    return result.admin;
}

module.exports = {
    verifyAdmin,
    requireAdmin
};
