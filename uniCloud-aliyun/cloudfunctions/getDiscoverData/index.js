'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { days = 7, limit = 10, tagLimit = 20, range = 'week' } = event;

        console.log('=== getDiscoverData 云函数开始 ===');
        console.log('参数:', { days, limit, tagLimit, range });

        try {
            // 使用 Promise.all 并行调用 4 个数据源
            const [hotArticlesResult, tagCloudResult, timelineResult, subscriptionsResult] = await Promise.all([
                // 1. getHotArticles - 热门排行
                (async () => {
                    try {
                        const res = await db.collection('articles')
                            .where({ status: db.command.in(['published', 'pending']) })
                            .orderBy('publishTime', 'desc')
                            .limit(100)
                            .get();

                        const sortedData = res.data
                            .sort((a, b) => (b.stats?.viewCount || 0) - (a.stats?.viewCount || 0))
                            .slice(0, limit);

                        return {
                            code: 0,
                            data: sortedData.map(item => ({
                                _id: item._id,
                                title: item.title,
                                count: item.stats?.viewCount || 0
                            }))
                        };
                    } catch (error) {
                        console.error('getHotArticles 失败:', error);
                        return { code: -1, data: [] };
                    }
                })(),

                // 2. getTagCloud - 标签云
                (async () => {
                    try {
                        const res = await db.collection('articles')
                            .where({ status: db.command.in(['published', 'pending']) })
                            .limit(500)
                            .get();

                        const tagCountMap = {};
                        res.data.forEach(article => {
                            if (article.tags && article.tags.role) {
                                article.tags.role.forEach(tag => {
                                    tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
                                });
                            }
                            const keywords = ['考试', '讲座', '招新', '图书馆', '放假', '选课', '成绩', '就业', '奖学金', '会议'];
                            keywords.forEach(keyword => {
                                if (article.title && article.title.includes(keyword)) {
                                    tagCountMap[keyword] = (tagCountMap[keyword] || 0) + 1;
                                }
                            });
                        });

                        const tags = Object.entries(tagCountMap)
                            .map(([name, count]) => ({ name, count }))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, tagLimit);

                        return { code: 0, data: tags };
                    } catch (error) {
                        console.error('getTagCloud 失败:', error);
                        return { code: -1, data: [] };
                    }
                })(),

                // 3. getTimeline - 时间轴
                (async () => {
                    try {
                        const now = Date.now();
                        let startTime = 0;
                        const nowDate = new Date();

                        if (range === 'week') {
                            const dayOfWeek = nowDate.getDay() || 7;
                            startTime = new Date(nowDate.setDate(nowDate.getDate() - dayOfWeek + 1)).setHours(0, 0, 0, 0);
                        } else if (range === 'month') {
                            startTime = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
                        }

                        const queryCondition = {
                            status: db.command.in(['published', 'pending'])
                        };

                        if (startTime > 0) {
                            queryCondition.publishTime = db.command.gte(startTime);
                        }

                        const res = await db.collection('articles')
                            .where(queryCondition)
                            .orderBy('publishTime', 'desc')
                            .limit(100)
                            .get();

                        const dateGroupMap = {};
                        res.data.forEach(article => {
                            const date = new Date(article.publishTime);
                            const year = date.getFullYear();
                            const dateKey = `${date.getMonth() + 1}-${date.getDate()}`;
                            const timestamp = new Date(date.toDateString()).getTime();

                            if (!dateGroupMap[dateKey]) {
                                dateGroupMap[dateKey] = {
                                    timestamp,
                                    date: dateKey,
                                    year: `${year}年`,
                                    count: 0,
                                    expanded: false,
                                    articles: []
                                };
                            }
                            dateGroupMap[dateKey].count++;
                            dateGroupMap[dateKey].articles.push({
                                _id: article._id,
                                title: article.title,
                                publishTime: article.publishTime
                            });
                        });

                        const timeline = Object.values(dateGroupMap)
                            .sort((a, b) => b.timestamp - a.timestamp);

                        return { code: 0, data: timeline };
                    } catch (error) {
                        console.error('getTimeline 失败:', error);
                        return { code: -1, data: [] };
                    }
                })(),

                // 4. manageSources - 订阅列表
                (async () => {
                    try {
                        const sources = await db.collection('sources').where({ enabled: true }).get();
                        const sourceList = sources.data || [];

                        let userSubs = [];
                        const openid = context.OPENID;
                        if (openid) {
                            const subsRes = await db.collection('subscriptions').where({ openid }).get();
                            userSubs = subsRes.data || [];
                        }

                        const subscribedIds = userSubs.map(s => s.sourceId);

                        const result = sourceList.map(s => ({
                            _id: s._id,
                            sourceId: s.sourceId,
                            sourceName: s.sourceName,
                            sourceType: s.sourceType,
                            description: s.description,
                            isSubscribed: subscribedIds.includes(s.sourceId)
                        }));

                        return { code: 0, data: result };
                    } catch (error) {
                        console.error('manageSources 失败:', error);
                        return { code: -1, data: [] };
                    }
                })()
            ]);

            // 处理订阅结果，分离已订阅和未订阅
            let subscriptions = { subscribed: [], recommended: [] };
            if (subscriptionsResult.code === 0 && subscriptionsResult.data) {
                const sourceList = subscriptionsResult.data;
                subscriptions.subscribed = sourceList
                    .filter(s => s.isSubscribed)
                    .map(s => ({
                        id: s.sourceId,
                        name: s.sourceName,
                        type: s.sourceType || 'website'
                    }));
                subscriptions.recommended = sourceList
                    .filter(s => !s.isSubscribed)
                    .map(s => ({
                        id: s.sourceId,
                        name: s.sourceName,
                        type: s.sourceType || 'website'
                    }));
            }

            console.log('getDiscoverData: 返回数据概览', {
                ranking: hotArticlesResult.data?.length || 0,
                tags: tagCloudResult.data?.length || 0,
                timeline: timelineResult.data?.length || 0,
                subscriptions: {
                    subscribed: subscriptions.subscribed.length,
                    recommended: subscriptions.recommended.length
                }
            });

            return {
                code: 0,
                message: 'success',
                data: {
                    ranking: hotArticlesResult.data || [],
                    tags: tagCloudResult.data || [],
                    timeline: timelineResult.data || [],
                    subscriptions
                }
            };
        } catch (error) {
            console.error('getDiscoverData 云函数失败:', error);
            return {
                code: -1,
                message: '获取发现页数据失败',
                data: {
                    ranking: [],
                    tags: [],
                    timeline: [],
                    subscriptions: { subscribed: [], recommended: [] }
                }
            };
        }
    }
};