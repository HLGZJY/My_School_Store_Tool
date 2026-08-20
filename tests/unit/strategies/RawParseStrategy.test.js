'use strict';

const RawParseStrategy = require('../../../uniCloud-aliyun/cloudfunctions/parseArticles/strategies/RawParseStrategy');

describe('RawParseStrategy', () => {
    let strategy;

    beforeEach(() => {
        strategy = new RawParseStrategy();
    });

    describe('_stripHtml', () => {
        it('strips HTML tags and returns plain text', () => {
            const html = '<p>Hello <strong>World</strong></p>';
            const plain = strategy._stripHtml(html);
            expect(plain).toContain('Hello');
            expect(plain).toContain('World');
            expect(plain).not.toContain('<p>');
            expect(plain).not.toContain('<strong>');
        });

        it('removes script tags', () => {
            const html = '<p>Content</p><script>alert("xss")</script>';
            const plain = strategy._stripHtml(html);
            expect(plain).not.toContain('alert');
            expect(plain).toContain('Content');
        });

        it('removes style tags', () => {
            const html = '<style>.red{color:red}</style><p>Text</p>';
            const plain = strategy._stripHtml(html);
            expect(plain).not.toContain('.red');
            expect(plain).toContain('Text');
        });

        it('removes nav, footer, header tags', () => {
            const html = '<nav>Nav content</nav><p>Main</p><footer>Footer</footer>';
            const plain = strategy._stripHtml(html);
            expect(plain).not.toContain('Nav content');
            expect(plain).not.toContain('Footer');
            expect(plain).toContain('Main');
        });

        it('removes comments', () => {
            const html = '<p>Before</p><!-- comment --><p>After</p>';
            const plain = strategy._stripHtml(html);
            expect(plain).not.toContain('comment');
        });

        it('handles empty input', () => {
            expect(strategy._stripHtml('')).toBe('');
            expect(strategy._stripHtml(null)).toBe('');
            expect(strategy._stripHtml(undefined)).toBe('');
        });
    });

    describe('_cleanText', () => {
        it('decodes HTML entities within content', () => {
            // Bare entities become spaces then trim to empty - correct JS behavior
            // Within real content, entities decode correctly
            expect(strategy._cleanText('Hello&nbsp;World')).toBe('Hello World');
            expect(strategy._cleanText('A &amp; B')).toBe('A & B');
            expect(strategy._cleanText('&lt;tag&gt;')).toBe('<tag>');
            expect(strategy._cleanText('&quot;quoted&quot;')).toBe('"quoted"');
            expect(strategy._cleanText('&#39;test&#39;')).toBe("'test'");
            expect(strategy._cleanText('&mdash;')).toBe('—');
            expect(strategy._cleanText('&ndash;')).toBe('–');
        });

        it('removes numeric HTML entities', () => {
            expect(strategy._cleanText('&#60;')).toBe('');
            expect(strategy._cleanText('&#65;')).toBe('');
        });

        it('removes unknown named entities', () => {
            expect(strategy._cleanText('&unknown;')).toBe('');
        });
    });

    describe('_extractTitle', () => {
        it('extracts title from og:title meta tag', () => {
            const html = '<html><head><meta property="og:title" content="OG Title" /></head></html>';
            const title = strategy._extractTitle(html);
            expect(title).toBe('OG Title');
        });

        it('extracts title from title tag as fallback', () => {
            const html = '<html><head><title>Page Title</title></head></html>';
            const title = strategy._extractTitle(html);
            expect(title).toBe('Page Title');
        });

        it('extracts title from h1 tag', () => {
            const html = '<html><body><h1>Heading Title</h1></body></html>';
            const title = strategy._extractTitle(html);
            expect(title).toBe('Heading Title');
        });

        it('returns null when no title found', () => {
            const html = '<html><body><p>No title</p></body></html>';
            const title = strategy._extractTitle(html);
            expect(title).toBeNull();
        });
    });

    describe('_extractTitleFromUrl', () => {
        it('extracts title from URL path', () => {
            const url = 'https://example.com/news/article-title';
            const title = strategy._extractTitleFromUrl(url);
            expect(title).toBe('article title');
        });

        it('decodes URL encoded parts', () => {
            const url = 'https://example.com/news/%E6%96%B0%E9%97%BB';
            const title = strategy._extractTitleFromUrl(url);
            expect(title).toContain('新闻');
        });

        it('ignores index and html extensions', () => {
            const url1 = 'https://example.com/index';
            const url2 = 'https://example.com/page.html';
            expect(strategy._extractTitleFromUrl(url1)).toBeNull();
            // page.html returns 'page' since only 'index' and 'html' are ignored
            expect(strategy._extractTitleFromUrl(url2)).toBe('page');
        });

        it('returns null for invalid URL', () => {
            expect(strategy._extractTitleFromUrl(null)).toBeNull();
            expect(strategy._extractTitleFromUrl('')).toBeNull();
        });
    });

    describe('_inferCategory', () => {
        it('infers notice category from keywords', () => {
            expect(strategy._inferCategory('这是一条重要通知公告', '')).toBe('notice');
            expect(strategy._inferCategory('', '转发告示')).toBe('notice');
        });

        it('infers academic category from keywords', () => {
            expect(strategy._inferCategory('学术论坛研讨会', '')).toBe('academic');
            expect(strategy._inferCategory('', '讲座论文')).toBe('academic');
        });

        it('infers activity category from keywords', () => {
            expect(strategy._inferCategory('比赛活动赛事', '')).toBe('activity');
            expect(strategy._inferCategory('', '运动会')).toBe('activity');
        });

        it('infers service category from keywords', () => {
            expect(strategy._inferCategory('招聘兼职', '')).toBe('service');
            expect(strategy._inferCategory('', '实习就业')).toBe('service');
        });

        it('defaults to other category', () => {
            expect(strategy._inferCategory('random content', '')).toBe('other');
        });
    });

    describe('_generateSummary', () => {
        it('returns first 200 chars of plain text', () => {
            const text = 'A'.repeat(300);
            const summary = strategy._generateSummary(text);
            expect(summary.length).toBe(200);
            expect(summary).toBe('A'.repeat(200));
        });

        it('returns empty string for empty input', () => {
            expect(strategy._generateSummary('')).toBe('');
            expect(strategy._generateSummary(null)).toBe('');
        });
    });

    describe('parse', () => {
        it('uses metadata.title as fallback when no HTML title', async () => {
            const html = '<html><body><p>Content</p></body></html>';
            const metadata = { title: 'Metadata Title' };
            const result = await strategy.parse(html, metadata);
            expect(result.title).toBe('Metadata Title');
        });

        it('uses URL path title as fallback when no HTML or metadata title', async () => {
            const html = '<html><body><p>Content</p></body></html>';
            const metadata = { url: 'https://example.com/news/my-article' };
            const result = await strategy.parse(html, metadata);
            expect(result.title).toBe('my article');
        });

        it('uses sourceName as fallback when no other title available', async () => {
            const html = '<html><body><p>Content</p></body></html>';
            const metadata = { sourceName: 'Source Name' };
            const result = await strategy.parse(html, metadata);
            expect(result.title).toBe('Source Name');
        });

        it('returns isValid true when plainText exists', async () => {
            const html = '<html><body><p>Valid content here</p></body></html>';
            const result = await strategy.parse(html, {});
            expect(result.isValid).toBe(true);
        });

        it('returns isValid false when content is empty', async () => {
            const html = '<html><body></body></html>';
            const result = await strategy.parse(html, {});
            expect(result.isValid).toBe(false);
        });

        it('returns plain text content not raw HTML', async () => {
            const html = '<article><p>Article <strong>content</strong></p></article>';
            const result = await strategy.parse(html, {});
            expect(result.content).not.toContain('<article>');
            expect(result.content).not.toContain('<p>');
            expect(result.content).toContain('Article');
            expect(result.content).toContain('content');
        });
    });
});
