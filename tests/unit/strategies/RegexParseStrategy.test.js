'use strict';

const RegexParseStrategy = require('../../../uniCloud-aliyun/cloudfunctions/parseArticles/strategies/RegexParseStrategy');

describe('RegexParseStrategy', () => {
    let strategy;

    beforeEach(() => {
        strategy = new RegexParseStrategy();
    });

    describe('_extractTitle', () => {
        it('extracts title from og:title meta tag', () => {
            const html = '<html><head><meta property="og:title" content="Hello World" /></head></html>';
            const title = strategy._extractTitle(html);
            expect(title).toBe('Hello World');
        });

        it('extracts title from title tag as fallback', () => {
            const html = '<html><head><title>Page Title</title></head></html>';
            const title = strategy._extractTitle(html);
            expect(title).toBe('Page Title');
        });

        it('extracts title from h1 tag', () => {
            const html = '<html><body><h1>Main Heading</h1></body></html>';
            const title = strategy._extractTitle(html);
            expect(title).toBe('Main Heading');
        });

        it('returns null when no title found', () => {
            const html = '<html><body><p>No title here</p></body></html>';
            const title = strategy._extractTitle(html);
            expect(title).toBeNull();
        });
    });

    describe('_extractPublishTime', () => {
        it('extracts publish time from ISO date format', () => {
            const html = '<html><body><time datetime="2024-01-15T10:30:00">2024-01-15</time></body></html>';
            const publishTime = strategy._extractPublishTime(html);
            expect(publishTime).toBe('2024-01-15');
        });

        it('extracts publish time from Chinese date format', () => {
            const html = '<html><body><p>发布日期：2024年01月15日</p></body></html>';
            const publishTime = strategy._extractPublishTime(html);
            expect(publishTime).toBe('2024-01-15');
        });

        it('extracts publish time from meta tag', () => {
            const html = '<html><head><meta property="article:published_time" content="2024-06-20T08:00:00Z" /></head></html>';
            const publishTime = strategy._extractPublishTime(html);
            expect(publishTime).toBe('2024-06-20');
        });

        it('returns null when no date found', () => {
            const html = '<html><body><p>No date here</p></body></html>';
            const publishTime = strategy._extractPublishTime(html);
            expect(publishTime).toBeNull();
        });
    });

    describe('_parseDate', () => {
        it('parses ISO format correctly', () => {
            expect(strategy._parseDate('2024-01-15')).toBe('2024-01-15');
            expect(strategy._parseDate('2024-01-15T10:30:00')).toBe('2024-01-15');
        });

        it('parses Chinese format correctly', () => {
            expect(strategy._parseDate('2024年01月15日')).toBe('2024-01-15');
            expect(strategy._parseDate('2024年1月5日')).toBe('2024-01-05');
        });

        it('parses slash format correctly', () => {
            expect(strategy._parseDate('2024/01/15')).toBe('2024-01-15');
        });

        it('parses dot format correctly', () => {
            expect(strategy._parseDate('2024.01.15')).toBe('2024-01-15');
        });
    });

    describe('_inferCategory', () => {
        it('infers notice category from keywords', () => {
            expect(strategy._inferCategory('这是一条重要通知', '')).toBe('notice');
            expect(strategy._inferCategory('', '公告信息')).toBe('notice');
        });

        it('infers academic category from keywords', () => {
            expect(strategy._inferCategory('学术讲座论坛', '')).toBe('academic');
            expect(strategy._inferCategory('', '论文研讨会')).toBe('academic');
        });

        it('infers activity category from keywords', () => {
            expect(strategy._inferCategory('比赛活动赛事', '')).toBe('activity');
            expect(strategy._inferCategory('', '运动会晚会')).toBe('activity');
        });

        it('infers service category from keywords', () => {
            expect(strategy._inferCategory('招聘兼职实习', '')).toBe('service');
            expect(strategy._inferCategory('', '就业信息')).toBe('service');
        });

        it('defaults to other category', () => {
            expect(strategy._inferCategory('random text', '')).toBe('other');
        });
    });

    describe('_cleanHtml', () => {
        it('removes HTML tags', () => {
            expect(strategy._cleanHtml('<p>Hello</p>')).toBe('Hello');
            expect(strategy._cleanHtml('<strong>Bold</strong>')).toBe('Bold');
        });

        it('decodes HTML entities within content', () => {
            // Bare entities become spaces then trim to empty - correct JS behavior
            // But within real HTML content (surrounded by text), entities decode correctly
            expect(strategy._cleanHtml('Hello&nbsp;World')).toBe('Hello World');
            expect(strategy._cleanHtml('A &amp; B')).toBe('A & B');
            expect(strategy._cleanHtml('&quot;quoted&quot;')).toBe('"quoted"');
            expect(strategy._cleanHtml('&#39;test&#39;')).toBe("'test'");
            // Unicode entities
            expect(strategy._cleanHtml('&mdash;')).toBe('—');
            expect(strategy._cleanHtml('&ndash;')).toBe('–');
        });
    });

    describe('parse', () => {
        it('returns isValid true when content exists', async () => {
            const html = '<html><body><article><p>Some meaningful content that is quite long and valid.</p></article></body></html>';
            const result = await strategy.parse(html, {});
            expect(result.isValid).toBe(true);
        });

        it('returns isValid false when no content', async () => {
            const html = '<html><body></body></html>';
            const result = await strategy.parse(html, {});
            expect(result.isValid).toBe(false);
        });

        it('extracts content from article tag', async () => {
            const html = '<html><body><article><p>Article content here</p></article></body></html>';
            const result = await strategy.parse(html, {});
            expect(result.content).toContain('Article content');
        });

        it('falls back to metadata.title when no title found', async () => {
            const html = '<html><body><p>Content without title</p></body></html>';
            const metadata = { title: 'From Metadata' };
            const result = await strategy.parse(html, metadata);
            expect(result.title).toBe('From Metadata');
        });
    });
});
