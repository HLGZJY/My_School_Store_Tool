/**
 * searchArticles cloud function tests
 */

const { createMockDb } = require('../../mocks/uniCloud.mock');

let mockDb;
let searchArticles;

const mockArticles = [
  {
    _id: '1',
    title: '关于举办人工智能讲座的通知',
    summary: '本次讲座邀请专家讲解AI最新发展趋势',
    sourceName: '计算机学院',
    publishTime: Date.now() - 100000,
    category: 'academic',
    tags: { source: '讲座' }
  },
  {
    _id: '2',
    title: '图书馆开放时间调整通知',
    summary: '为方便同学们学习，图书馆延长开放时间',
    sourceName: '图书馆',
    publishTime: Date.now() - 200000,
    category: 'notice',
    tags: { source: '通知' }
  },
  {
    _id: '3',
    title: '校园歌手大赛活动报名',
    summary: '一年一度的校园歌手大赛开始报名',
    sourceName: '学生处',
    publishTime: Date.now() - 300000,
    category: 'activity',
    tags: { source: '活动' }
  }
];

describe('searchArticles', () => {
  beforeEach(() => {
    // Reset mock DB with fresh data
    mockDb = createMockDb({
      articles: JSON.parse(JSON.stringify(mockArticles))
    });
    global.uniCloud.database = () => mockDb;
    // Re-require to reset module cache
    jest.resetModules();
    searchArticles = require('../../../uniCloud-aliyun/cloudfunctions/searchArticles/index.js');
  });

  test('should search by title (existing behavior)', async () => {
    const event = { keyword: '人工智能', page: 1, pageSize: 20 };
    const result = await searchArticles.main(event);

    expect(result.code).toBe(0);
    expect(result.data.articles.length).toBeGreaterThan(0);
    expect(result.data.articles[0].title).toContain('人工智能');
  });

  test('should search by tag', async () => {
    const event = { keyword: '讲座', page: 1, pageSize: 20 };
    const result = await searchArticles.main(event);

    expect(result.code).toBe(0);
    expect(result.data.articles.some(a => a.title.includes('人工智能'))).toBe(true);
  });

  test('should search by summary/content', async () => {
    const event = { keyword: 'AI最新发展趋势', page: 1, pageSize: 20 };
    const result = await searchArticles.main(event);

    expect(result.code).toBe(0);
    expect(result.data.articles.length).toBeGreaterThan(0);
  });

  test('should filter by sourceId', async () => {
    const event = { keyword: '', sourceId: 'library', page: 1, pageSize: 20 };
    const result = await searchArticles.main(event);

    expect(result.code).toBe(0);
    expect(result.data.articles.every(a => a.sourceName === '图书馆')).toBe(true);
  });

  test('should filter by tag', async () => {
    const event = { keyword: '', tag: '活动', page: 1, pageSize: 20 };
    const result = await searchArticles.main(event);

    expect(result.code).toBe(0);
    expect(result.data.articles.length).toBe(1);
    expect(result.data.articles[0].title).toContain('歌手大赛');
  });

  test('should combine keyword search with tag filter', async () => {
    const event = { keyword: '校园', tag: '活动', page: 1, pageSize: 20 };
    const result = await searchArticles.main(event);

    expect(result.code).toBe(0);
    expect(result.data.articles.length).toBe(1);
    expect(result.data.articles[0].title).toContain('歌手大赛');
  });
});
