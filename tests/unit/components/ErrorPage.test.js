'use strict';

const fs = require('fs');
const path = require('path');

describe('ErrorPage.vue', () => {
    const filePath = path.join(__dirname, '../../../components/ErrorPage.vue');
    let content;

    beforeAll(() => {
        content = fs.readFileSync(filePath, 'utf8');
    });

    it('file exists', () => {
        expect(fs.existsSync(filePath)).toBe(true);
    });

    it('has correct name', () => {
        expect(content).toMatch(/name:\s*['"]ErrorPage['"]/);
    });

    it('has message prop with default 加载失败', () => {
        expect(content).toMatch(/message:\s*\{[\s\S]*?type:\s*String[\s\S]*?default:\s*['"]加载失败['"]/);
    });

    it('has onRetry prop as Function', () => {
        expect(content).toMatch(/onRetry:\s*\{[\s\S]*?type:\s*Function/);
    });

    it('emits retry event', () => {
        expect(content).toMatch(/emits:\s*\[[\s\S]*?['"]retry['"]/);
    });

    it('uses error-default.svg illustration', () => {
        expect(content).toMatch(/error-default\.svg/);
    });

    it('has retry button with 重新加载 text', () => {
        expect(content).toMatch(/重新加载/);
    });

    it('has button with #00D4AA background', () => {
        expect(content).toMatch(/background-color:\s*#00D4AA/);
    });

    it('has transition 0.2s ease on button', () => {
        expect(content).toMatch(/transition:\s*all\s+0\.2s\s+ease/);
    });
});
