/**
 * tests/syntax_audit.test.js
 * Comprehensive automated test suite for JavaScript Syntax, JSON Validity & Test Infrastructure (Feature 21)
 * Covers Feature 21 across Tiers 1-4.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { PROJECT_ROOT } = require('./harness.js');

describe('Feature 21: Automated Test Suite & Code Quality (Syntax Verification)', () => {

    test('T1.1: node --check app.js succeeds with exit code 0', () => {
        const appPath = path.join(PROJECT_ROOT, 'app.js');
        const output = execSync(`node --check "${appPath}"`, { encoding: 'utf8' });
        assert.strictEqual(output.trim(), '', 'node --check app.js should produce no error output');
    });

    test('T1.2: node --check server.js succeeds with exit code 0', () => {
        const srvPath = path.join(PROJECT_ROOT, 'server.js');
        const output = execSync(`node --check "${srvPath}"`, { encoding: 'utf8' });
        assert.strictEqual(output.trim(), '', 'node --check server.js should produce no error output');
    });

    test('T1.3: node --check words_blacklist.js succeeds with exit code 0', () => {
        const blPath = path.join(PROJECT_ROOT, 'words_blacklist.js');
        const output = execSync(`node --check "${blPath}"`, { encoding: 'utf8' });
        assert.strictEqual(output.trim(), '', 'node --check words_blacklist.js should produce no error output');
    });

    test('T1.3b: node --check compound_dictionary.js succeeds with exit code 0', () => {
        const cdPath = path.join(PROJECT_ROOT, 'compound_dictionary.js');
        const output = execSync(`node --check "${cdPath}"`, { encoding: 'utf8' });
        assert.strictEqual(output.trim(), '', 'node --check compound_dictionary.js should produce no error output');
    });

    test('T1.3c: node --check ai_compound_classifier.js succeeds with exit code 0', () => {
        const aiPath = path.join(PROJECT_ROOT, 'ai_compound_classifier.js');
        const output = execSync(`node --check "${aiPath}"`, { encoding: 'utf8' });
        assert.strictEqual(output.trim(), '', 'node --check ai_compound_classifier.js should produce no error output');
    });

    test('T1.4: node --check sw.js succeeds with exit code 0', () => {
        const swPath = path.join(PROJECT_ROOT, 'sw.js');
        const output = execSync(`node --check "${swPath}"`, { encoding: 'utf8' });
        assert.strictEqual(output.trim(), '', 'node --check sw.js should produce no error output');
    });

    test('T1.5: package.json specifies "test": "node --test tests/*.test.js"', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
        assert.ok(pkg.scripts && pkg.scripts.test, 'package.json must have "test" script');
        assert.strictEqual(pkg.scripts.test, 'node --test tests/*.test.js');
    });

    test('T1.6: firebase-client.js ES module syntax validation succeeds', () => {
        const fbPath = path.join(PROJECT_ROOT, 'firebase-client.js');
        const output = execSync(`node --input-type=module --check < "${fbPath}"`, { encoding: 'utf8' });
        assert.strictEqual(output.trim(), '', 'firebase-client.js module check should produce no error output');
    });

    // JSON Validation
    test('T1.7: package.json parses as valid JSON', () => {
        const content = fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8');
        const parsed = JSON.parse(content);
        assert.strictEqual(typeof parsed, 'object');
        assert.strictEqual(parsed.name, 'wikilink-assistant');
    });

    test('T1.8: manifest.json parses as valid JSON', () => {
        const content = fs.readFileSync(path.join(PROJECT_ROOT, 'manifest.json'), 'utf8');
        const parsed = JSON.parse(content);
        assert.strictEqual(typeof parsed, 'object');
        assert.ok(parsed.name && parsed.icons);
    });

    test('T1.9: metadata.json parses as valid JSON', () => {
        const content = fs.readFileSync(path.join(PROJECT_ROOT, 'metadata.json'), 'utf8');
        const parsed = JSON.parse(content);
        assert.strictEqual(typeof parsed, 'object');
        assert.ok(parsed.name);
    });

    test('T1.10: firebase-blueprint.json parses as valid JSON', () => {
        const content = fs.readFileSync(path.join(PROJECT_ROOT, 'firebase-blueprint.json'), 'utf8');
        const parsed = JSON.parse(content);
        assert.strictEqual(typeof parsed, 'object');
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Zero runtime npm dependencies in package.json', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
        const deps = pkg.dependencies || {};
        assert.strictEqual(Object.keys(deps).length, 0, 'Production runtime should require 0 npm dependencies');
    });

    test('T2.2: JavaScript files use UTF-8 character encoding without BOM marks', () => {
        const jsFiles = ['app.js', 'server.js', 'words_blacklist.js', 'compound_dictionary.js', 'ai_compound_classifier.js', 'sw.js', 'firebase-client.js'];
        for (const file of jsFiles) {
            const buffer = fs.readFileSync(path.join(PROJECT_ROOT, file));
            // Check for UTF-8 BOM: EF BB BF
            const hasBom = buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
            assert.strictEqual(hasBom, false, `${file} must not contain UTF-8 BOM mark`);
        }
    });

    test('T2.3: app.js contains strict mode declaration', () => {
        const content = fs.readFileSync(path.join(PROJECT_ROOT, 'app.js'), 'utf8');
        assert.ok(content.includes("'use strict'") || content.includes('"use strict"'), 'app.js must declare strict mode');
    });

    test('T2.4: open_tool.sh shell script is valid bash syntax', () => {
        const shPath = path.join(PROJECT_ROOT, 'open_tool.sh');
        if (fs.existsSync(shPath)) {
            const output = execSync(`bash -n "${shPath}"`, { encoding: 'utf8' });
            assert.strictEqual(output.trim(), '');
        }
    });

    test('T2.5: All test files in tests/ use node:test and node:assert/strict', () => {
        const testsDir = path.join(PROJECT_ROOT, 'tests');
        const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
        assert.ok(testFiles.length >= 8, `Expected at least 8 test suites, found: ${testFiles.length}`);
        for (const tf of testFiles) {
            const content = fs.readFileSync(path.join(testsDir, tf), 'utf8');
            assert.ok(content.includes("require('node:test')"), `${tf} must import node:test`);
            assert.ok(content.includes("require('node:assert/strict')"), `${tf} must import node:assert/strict`);
        }
    });
});

describe('Tier 3: Syntax Cross-Feature Combinations', () => {

    test('T3.1: All test suites in tests/ pass syntax check node --check', () => {
        const testsDir = path.join(PROJECT_ROOT, 'tests');
        const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.js'));
        for (const tf of testFiles) {
            const p = path.join(testsDir, tf);
            const output = execSync(`node --check "${p}"`, { encoding: 'utf8' });
            assert.strictEqual(output.trim(), '', `${tf} syntax check failed`);
        }
    });
});

describe('Tier 4: Build Command Verification', () => {

    test('T4.1: npm run build executes with exit code 0', () => {
        const output = execSync('npm run build', { cwd: PROJECT_ROOT, encoding: 'utf8' });
        assert.ok(output.includes('Static assets verified successfully'), 'Build command should succeed');
    });
});
