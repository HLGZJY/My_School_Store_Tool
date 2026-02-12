'use strict';

const db = uniCloud.database();

module.exports = {
	async main(event) {
		// 注意：userId 是前端存储的 users 表 _id
		// 但其他表存储的是 openid（微信标识）
		const { userId } = event;
		const { userId: openid } = event;

		console.log('=== deleteUserAccount ===');
		console.log('userId (users表的_id):', userId);
		console.log('openid (微信标识):', openid);

		if (!openid) {
			return {
				code: -1,
				message: '参数不完整'
			};
		}

		try {
			// 删除用户的收藏记录
			await db.collection('collections').where({
				openid
			}).remove();
			console.log('删除收藏记录成功');

			// 删除用户的阅读历史
			await db.collection('readHistory').where({
				openid
			}).remove();
			console.log('删除阅读历史成功');

			// 删除用户的搜索历史
			await db.collection('searchHistory').where({
				openid
			}).remove();
			console.log('删除搜索历史成功');

			// 删除用户的消息通知
			await db.collection('messages').where({
				openid
			}).remove();
			console.log('删除消息通知成功');

			// 删除用户的订阅记录
			await db.collection('subscriptions').where({
				openid
			}).remove();
			console.log('删除订阅记录成功');

			// 删除用户表中的用户记录,可以正常删除
			await db.collection('users').doc(userId).remove();
			console.log('用户表记录成功');

			console.log('账号注销成功');

			return {
				code: 0,
				message: '账号注销成功'
			};
		} catch (error) {
			console.error('注销账号失败:', error);
			return {
				code: -1,
				message: '注销失败: ' + error.message
			};
		}
	}
};