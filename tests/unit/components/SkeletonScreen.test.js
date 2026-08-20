'use strict';

const fs = require('fs');
const path = require('path');

describe('SkeletonScreen.vue', () => {
    const filePath = path.join(__dirname, '../../../components/SkeletonScreen.vue');
    let content;

    beforeAll(() => {
        content = fs.readFileSync(filePath, 'utf8');
    });

    it('file exists', () => {
        expect(fs.existsSync(filePath)).toBe(true);
    });

    it('has correct name', () => {
        expect(content).toMatch(/name:\s*['"]SkeletonScreen['"]/);
    });

    it('has rows prop with default 3', () => {
        expect(content).toMatch(/rows:\s*\{[\s\S]*?type:\s*Number[\s\S]*?default:\s*3/);
    });

    it('has type prop with default article', () => {
        expect(content).toMatch(/type:\s*\{[\s\S]*?default:\s*['"]article['"]/);
    });

    it('uses #EEEEEE for skeleton blocks', () => {
        expect(content).toMatch(/background-color:\s*#EEEEEE/);
    });

    it('has border-radius 8px for cards', () => {
        expect(content).toMatch(/border-radius:\s*8px/);
    });

    it('has border-radius 4px for tags', () => {
        expect(content).toMatch(/border-radius:\s*4px/);
    });

    it('has v-for rendering rows', () => {
        expect(content).toMatch(/v-for.*in\s+rows/);
    });
});
