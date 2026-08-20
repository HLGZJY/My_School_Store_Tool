'use strict';

const fs = require('fs');
const path = require('path');

describe('EmptyState.vue', () => {
    const filePath = path.join(__dirname, '../../../components/EmptyState.vue');
    let content;

    beforeAll(() => {
        content = fs.readFileSync(filePath, 'utf8');
    });

    it('file exists', () => {
        expect(fs.existsSync(filePath)).toBe(true);
    });

    it('has correct name', () => {
        expect(content).toMatch(/name:\s*['"]EmptyState['"]/);
    });

    it('has text prop with default 暂无内容', () => {
        expect(content).toMatch(/text:\s*\{[\s\S]*?type:\s*String[\s\S]*?default:\s*['"]暂无内容['"]/);
    });

    it('has tip prop', () => {
        expect(content).toMatch(/tip:\s*\{/);
    });

    it('has actionText prop', () => {
        expect(content).toMatch(/actionText:\s*\{/);
    });

    it('emits action event', () => {
        expect(content).toMatch(/emits:\s*\[[\s\S]*?['"]action['"]/);
    });

    it('uses empty-default.svg illustration', () => {
        expect(content).toMatch(/empty-default\.svg/);
    });

    it('has action button with #00D4AA background', () => {
        expect(content).toMatch(/background-color:\s*#00D4AA/);
    });

    it('has transition 0.2s ease on button', () => {
        expect(content).toMatch(/transition:\s*all\s+0\.2s\s+ease/);
    });
});
