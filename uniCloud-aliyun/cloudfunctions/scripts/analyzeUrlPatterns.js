#!/usr/bin/env node
'use strict';

/**
 * URL结构分析脚本 v2
 *
 * 验证新的URL分离方案：
 * - baseUrl: 只取到主要域名+第一层路径 (如 https://www.scuec.edu.cn/cxcy)
 * - suffix: 固定格式 (如 info/1002/3364.htm 或 1030/1957.htm)
 *
 * 运行: node analyzeUrlPatterns.js
 */

const fs = require('fs');
const path = require('path');

// ============ URL分析函数 ============

/**
 * 从sourceUrl提取第一层路径作为baseUrl
 * 例如:
 *   https://www.scuec.edu.cn/cxcy/scss/jstz.htm -> https://www.scuec.edu.cn/cxcy
 *   https://www.scuec.edu.cn/bwc/tztg.htm -> https://www.scuec.edu.cn/bwc
 *   https://www.scuec.edu.cn/yjs/bksszpx.htm -> https://www.scuec.edu.cn/yjs
 */
function extractBaseUrl(sourceUrl) {
    try {
        const urlObj = new URL(sourceUrl);
        const pathname = urlObj.pathname;
        const parts = pathname.split('/').filter(p => p);
        // 取第一层路径作为 base
        const basePath = '/' + (parts[0] || '');
        return urlObj.origin + basePath;
    } catch (e) {
        console.error('URL解析错误:', e.message);
        return sourceUrl;
    }
}

/**
 * 从完整文章URL提取suffix
 * 使用第一层路径作为base来判断
 */
function extractSuffix(articleUrl, sourceUrl) {
    const baseUrl = extractBaseUrl(sourceUrl);
    try {
        const articleUrlObj = new URL(articleUrl);
        const baseUrlObj = new URL(baseUrl);
        // article的路径
        const articlePath = articleUrlObj.pathname;
        // base的路径
        const basePath = baseUrlObj.pathname; // 如 /cxcy

        if (articlePath.startsWith(basePath + '/') || articlePath === basePath) {
            return articlePath.substring(basePath.length);
        }
        // 尝试去掉base后面的第一部分再比较
        const articleParts = articlePath.split('/').filter(p => p);
        const baseParts = basePath.split('/').filter(p => p);

        // 如果article路径深度 > base路径深度，从第baseParts.length个部分开始就是suffix
        if (articleParts.length > baseParts.length) {
            return '/' + articleParts.slice(baseParts.length).join('/');
        }
    } catch (e) {
        console.error('URL解析错误:', e.message);
    }
    return null;
}

/**
 * 用suffix还原完整URL
 */
function reconstructUrl(suffix, sourceUrl) {
    const baseUrl = extractBaseUrl(sourceUrl);
    return baseUrl + suffix;
}

/**
 * 分析URL模式
 */
function analyzeUrlPattern(articleUrl, sourceUrl) {
    const baseUrl = extractBaseUrl(sourceUrl);
    const suffix = extractSuffix(articleUrl, sourceUrl);
    const reconstructed = suffix ? reconstructUrl(suffix, sourceUrl) : null;

    return {
        sourceUrl,
        baseUrl,
        articleUrl,
        suffix,
        reconstructed,
        isMatch: reconstructed === articleUrl
    };
}

/**
 * 打印分析结果
 */
function printAnalysis(results) {
    console.log('\n========== URL结构分析结果 ==========\n');

    const baseUrlMap = new Map();
    const suffixPatterns = new Map();

    for (const result of results) {
        const { sourceUrl, baseUrl, articleUrl, suffix } = result;

        if (!baseUrlMap.has(baseUrl)) {
            baseUrlMap.set(baseUrl, []);
        }
        baseUrlMap.get(baseUrl).push({ sourceUrl, articleUrl, suffix });

        if (suffix) {
            if (!suffixPatterns.has(suffix)) {
                suffixPatterns.set(suffix, { count: 0, examples: [] });
            }
            const entry = suffixPatterns.get(suffix);
            entry.count++;
            if (entry.examples.length < 3) {
                entry.examples.push({ sourceUrl, articleUrl });
            }
        }
    }

    console.log(`发现 ${baseUrlMap.size} 个不同的 baseUrl:\n`);
    for (const [baseUrl, items] of baseUrlMap) {
        console.log(`  ${baseUrl}`);
        console.log(`    -> 文章数量: ${items.length}`);
        console.log(`    -> 示例: ${items[0]?.articleUrl}`);
        if (items[0]?.suffix) {
            console.log(`    -> suffix: ${items[0].suffix}`);
        }
        console.log('');
    }

    console.log('\n========== Suffix模式统计 ==========\n');
    for (const [suffix, info] of suffixPatterns) {
        console.log(`  ${suffix} (${info.count}次)`);
    }

    // 一致性检查
    console.log('\n========== 一致性检查 ==========\n');
    let matchCount = 0;
    let mismatchCount = 0;

    for (const result of results) {
        if (result.isMatch) {
            matchCount++;
        } else {
            mismatchCount++;
            console.log(`  不匹配: ${result.articleUrl}`);
            console.log(`    baseUrl: ${result.baseUrl}`);
            console.log(`    suffix: ${result.suffix}`);
            console.log(`    还原: ${result.reconstructed}`);
        }
    }

    console.log(`\n总计: ${matchCount} 匹配, ${mismatchCount} 不匹配`);

    return { baseUrlMap, suffixPatterns, matchCount, mismatchCount };
}

// ============ 主程序 ============

function main() {
    console.log('========== URL结构分析工具 v2 ==========\n');

    // 验证: 所有cxcy下的数据源，baseUrl都是 https://www.scuec.edu.cn/cxcy
    // suffix 是 info/{数字}/{数字}.htm
    const cxcySources = [
        { sourceUrl: 'https://www.scuec.edu.cn/cxcy/scss/jstz.htm', articleUrl: 'https://www.scuec.edu.cn/cxcy/info/1002/3364.htm' },
        { sourceUrl: 'https://www.scuec.edu.cn/cxcy/scss/info.htm', articleUrl: 'https://www.scuec.edu.cn/cxcy/info/1002/3365.htm' },
        { sourceUrl: 'https://www.scuec.edu.cn/cxcy/scs/jstz.htm', articleUrl: 'https://www.scuec.edu.cn/cxcy/info/1002/3366.htm' },
    ];

    console.log('========== Cxcy 数据源验证 ==========\n');
    for (const { sourceUrl, articleUrl } of cxcySources) {
        const r = analyzeUrlPattern(articleUrl, sourceUrl);
        console.log(`source: ${sourceUrl}`);
        console.log(`  -> baseUrl: ${r.baseUrl}`);
        console.log(`  -> articleUrl: ${articleUrl}`);
        console.log(`  -> suffix: ${r.suffix}`);
        console.log(`  -> 还原: ${r.reconstructed}`);
        console.log(`  -> 匹配: ${r.isMatch ? '✓' : '✗'}`);
        console.log('');
    }

    // 其他数据源格式
    const otherSources = [
        // bwc: 直接是 {数字}/{数字}.htm
        { sourceUrl: 'https://www.scuec.edu.cn/bwc/tztg.htm', articleUrl: 'https://www.scuec.edu.cn/bwc/1030/1957.htm' },
        { sourceUrl: 'https://www.scuec.edu.cn/bwc/tztg.htm', articleUrl: 'https://www.scuec.edu.cn/bwc/1030/1958.htm' },
        // yjs: 直接是 {数字}/{数字}.htm
        { sourceUrl: 'https://www.scuec.edu.cn/yjs/bksszpx.htm', articleUrl: 'https://www.scuec.edu.cn/yjs/1029/3723.htm' },
        // jwc: 直接是 {数字}/{数字}.htm
        { sourceUrl: 'https://www.scuec.edu.cn/jwc/tztg.htm', articleUrl: 'https://www.scuec.edu.cn/jwc/1030/1957.htm' },
        // xsc: 直接是 {数字}/{数字}.htm
        { sourceUrl: 'https://www.scuec.edu.cn/xsc/xsyx.htm', articleUrl: 'https://www.scuec.edu.cn/xsc/1030/1959.htm' },
    ];

    console.log('\n========== 其他数据源验证 ==========\n');
    for (const { sourceUrl, articleUrl } of otherSources) {
        const r = analyzeUrlPattern(articleUrl, sourceUrl);
        console.log(`source: ${sourceUrl}`);
        console.log(`  -> baseUrl: ${r.baseUrl}`);
        console.log(`  -> articleUrl: ${articleUrl}`);
        console.log(`  -> suffix: ${r.suffix}`);
        console.log(`  -> 还原: ${r.reconstructed}`);
        console.log(`  -> 匹配: ${r.isMatch ? '✓' : '✗'}`);
        console.log('');
    }

    const allResults = [
        ...cxcySources.map(item => analyzeUrlPattern(item.articleUrl, item.sourceUrl)),
        ...otherSources.map(item => analyzeUrlPattern(item.articleUrl, item.sourceUrl))
    ];

    const stats = printAnalysis(allResults);

    // 总结
    console.log('\n========== 结论 ==========\n');
    console.log('URL分离方案可行：');
    console.log('  1. baseUrl = origin + 第一层路径 (如 https://www.scuec.edu.cn/cxcy)');
    console.log('  2. suffix = 剩余路径 (如 info/1002/3364.htm 或 1030/1957.htm)');
    console.log('  3. 还原 = baseUrl + suffix');
    console.log('');

    // 按baseUrl分组看
    console.log('按baseUrl分组:\n');
    const byBase = new Map();
    for (const r of allResults) {
        if (!byBase.has(r.baseUrl)) {
            byBase.set(r.baseUrl, []);
        }
        byBase.get(r.baseUrl).push(r);
    }
    for (const [base, items] of byBase) {
        const suffixes = [...new Set(items.map(i => i.suffix))];
        console.log(`  ${base}`);
        console.log(`    来源: ${items[0].sourceUrl}`);
        console.log(`    suffix种类: ${suffixes.length}种 -> ${suffixes.slice(0, 2).join(', ')}`);
        console.log('');
    }

    return stats;
}

if (require.main === module) {
    try {
        main();
        console.log('\n分析完成！');
        process.exit(0);
    } catch (e) {
        console.error('分析失败:', e);
        process.exit(1);
    }
}

module.exports = { main, analyzeUrlPattern, extractBaseUrl, extractSuffix, reconstructUrl };
