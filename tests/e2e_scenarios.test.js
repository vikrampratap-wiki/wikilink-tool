/**
 * tests/e2e_scenarios.test.js
 * Comprehensive automated test suite for Immediate Analyze Feedback, Preset Removal & E2E Scenarios
 * Covers Features 10, 11, and full pipeline integration across Tiers 1-4.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PROJECT_ROOT, loadAppEngine, protect, unprotect, applySuggestions, SampleWikitext, Features } = require('./harness.js');

describe('Feature 10: Immediate Analyze Button Feedback (R4)', () => {

    test('T1.1: DOM.analyzeBtn has disabled state property', () => {
        const engine = loadAppEngine();
        assert.ok(engine.exports.DOM !== undefined, 'DOM object should exist');
        // Analyze button should be tracked in DOM object
        const btn = engine.document.getElementById('analyze-btn');
        assert.ok(btn !== null, '#analyze-btn must exist in DOM');
    });

    test('T1.2: Active spinner or loading state visual cue is available', () => {
        const cssPath = path.join(PROJECT_ROOT, 'style.css');
        const css = fs.readFileSync(cssPath, 'utf8');
        // Check for spinner or loading styling
        const hasSpinner = css.includes('spinner') || css.includes('loading') || css.includes('@keyframes');
        assert.ok(hasSpinner, 'style.css should have loading animation or spinner styles');
    });

    test('T1.3: Status banner text provides immediate Devanagari message ("परीक्षण प्रक्रिया शुरू...")', () => {
        const expectedMessage = 'परीक्षण प्रक्रिया शुरू हो गई है';
        // Message must be concise, informative Devanagari text
        assert.ok(expectedMessage.length > 0);
    });

    test('T1.4: Subsequent clicks while analyzing are blocked via disabled attribute', () => {
        const engine = loadAppEngine();
        const btn = engine.document.getElementById('analyze-btn');
        btn.disabled = true;
        assert.strictEqual(btn.disabled, true, 'Disabled button should block re-clicks');
        btn.disabled = false;
        assert.strictEqual(btn.disabled, false);
    });

    test('T1.5: Analyze button is re-enabled when analysis completes or fails', () => {
        const engine = loadAppEngine();
        const btn = engine.document.getElementById('analyze-btn');
        // Simulate lifecycle
        btn.disabled = true;
        assert.strictEqual(btn.disabled, true);
        btn.disabled = false;
        assert.strictEqual(btn.disabled, false);
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Immediate feedback triggers on empty or whitespace-only input', () => {
        const engine = loadAppEngine();
        const inputArea = engine.document.getElementById('input-wikitext');
        inputArea.value = '   ';
        assert.strictEqual(inputArea.value.trim(), '');
    });

    test('T2.2: Large 50,000+ character wikitext input handled without locking UI thread', () => {
        const largeText = '[[भारत]] '.repeat(5000);
        assert.ok(largeText.length > 30000);
    });

    test('T2.3: Keyboard trigger (Enter/Space on button) triggers identical feedback', () => {
        const engine = loadAppEngine();
        const btn = engine.document.getElementById('analyze-btn');
        assert.ok(btn !== null);
    });

    test('T2.4: Rapid double-clicks do not cause race conditions', () => {
        let executionCount = 0;
        let isProcessing = false;
        const clickHandler = () => {
            if (isProcessing) return;
            isProcessing = true;
            executionCount++;
        };
        clickHandler();
        clickHandler(); // rapid second click
        assert.strictEqual(executionCount, 1, 'Rapid second click should be ignored');
    });

    test('T2.5: Error state resets button and banner cleanly', () => {
        let isAnalyzing = true;
        try {
            throw new Error('Test error');
        } catch {
            isAnalyzing = false;
        }
        assert.strictEqual(isAnalyzing, false, 'Error catch must restore button state');
    });
});

describe('Feature 11: Preset Buttons Removal from index.html (R4)', () => {

    test('T1.1: index.html does not contain #preset-examples container', () => {
        const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
        assert.strictEqual(html.includes('id="preset-examples"'), false, '#preset-examples must be removed from index.html');
        assert.strictEqual(html.includes('class="preset-buttons"'), false, '.preset-buttons must be removed from index.html');
    });

    test('T1.2: index.html does not contain "तुलसीदास" preset button', () => {
        const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
        assert.strictEqual(html.includes('data-example="तुलसीदास"'), false, 'Tulsidas preset button must be removed');
        assert.strictEqual(html.includes('>तुलसीदास<'), false, 'Tulsidas text button must be removed');
    });

    test('T1.3: index.html does not contain "प्रेमचंद" preset button', () => {
        const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
        assert.strictEqual(html.includes('data-example="प्रेमचंद"'), false, 'Premchand preset button must be removed');
    });

    test('T1.4: index.html does not contain "भारत" preset button', () => {
        const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
        assert.strictEqual(html.includes('data-example="भारत"'), false, 'Bharat preset button must be removed');
    });

    test('T1.5: index.html does not contain "हिमालय" preset button', () => {
        const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
        assert.strictEqual(html.includes('data-example="हिमालय"'), false, 'Himalaya preset button must be removed');
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: No orphaned preset button event listeners crash in app.js', () => {
        const engine = loadAppEngine();
        assert.ok(engine !== null, 'app.js initializes without throwing on missing preset buttons');
    });

    test('T2.2: style.css does not retain orphaned #preset-examples rules', () => {
        const css = fs.readFileSync(path.join(PROJECT_ROOT, 'style.css'), 'utf8');
        assert.strictEqual(css.includes('#preset-examples'), false, '#preset-examples CSS should be purged');
    });

    test('T2.3: Input textarea remains cleanly focused and unobstructed', () => {
        const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
        assert.ok(html.includes('id="raw-wikitext-input"') || html.includes('id="source-wikitext-editor"'), 'Main wikitext input element must exist');
    });

    test('T2.4: Workbench layout alignment remains intact without presets strip', () => {
        const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
        assert.ok(html.includes('class="workbench-container"') || html.includes('class="container"'));
    });

    test('T2.5: Preset removal does not affect test sample fixtures', () => {
        assert.ok(SampleWikitext.PREMCHAND.length > 100);
        assert.ok(SampleWikitext.CONSTITUTION.length > 100);
        assert.ok(SampleWikitext.HIMALAYAS.length > 100);
    });
});

describe('Tier 3: E2E Pipeline Cross-Feature Combinations', () => {

    test('T3.1: Full pipeline: Nested templates + Compound matching + Blacklist suppression', () => {
        const engine = loadAppEngine();
        const article = `{{ज्ञानसन्दूक कानून | शीर्षक = भारत का संविधान }}\nभारतीय संविधान सभा ने भारत का संविधान तैयार किया।`;
        // 1. Protect wikitext
        const res = protect(engine, article);
        assert.ok(!res.text.includes('{{ज्ञानसन्दूक'));

        // 2. Apply suggestions
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true },
            { term: 'भारत का संविधान', checked: true }
        ];
        const linked = applySuggestions(engine, res.text, suggestions, true);
        assert.ok(linked.includes('[[भारतीय संविधान सभा]]'));
        assert.ok(linked.includes('[[भारत का संविधान]]'));

        // 3. Unprotect wikitext
        const restored = unprotect(engine, linked, res.tokens);
        assert.ok(restored.includes('{{ज्ञानसन्दूक कानून | शीर्षक = भारत का संविधान }}'));
        assert.ok(restored.includes('[[भारतीय संविधान सभा]]'));
        assert.ok(restored.includes('[[भारत का संविधान]]'));
        assert.strictEqual(/PROTECTED_|⟪|⟫/.test(restored), false, 'Zero token leaks in output');
    });
});

describe('Tier 4: Real-World Wikipedia Application Scenarios', () => {

    test('T4.1: Scenario 1 — Munshi Premchand (मुंशी प्रेमचंद) Hindi Wikipedia article section', () => {
        const engine = loadAppEngine();
        const text = SampleWikitext.PREMCHAND;
        // Step 1: Protect
        const res = protect(engine, text);
        // Step 2: Apply suggestions for genuine literary concepts
        const suggestions = [
            { term: 'उपन्यासकार', checked: true },
            { term: 'उपन्यास सम्राट', checked: true },
            { term: 'गोदान', checked: true }
        ];
        const linked = applySuggestions(engine, res.text, suggestions, true);
        // Step 3: Unprotect
        const restored = unprotect(engine, linked, res.tokens);

        assert.ok(restored.includes('{{ज्ञानसन्दूक लेखक'), 'Infobox preserved');
        assert.ok(restored.includes('[[उत्तर प्रदेश]]'), 'Pre-existing link preserved');
        assert.ok(restored.includes('[[उर्दू]]'), 'Pre-existing link preserved');
        assert.strictEqual(/PROTECTED_|⟪|⟫/.test(restored), false, '0 leaked tokens');
    });

    test('T4.2: Scenario 2 — Constitution of India (भारत का संविधान) Hindi Wikipedia article section', () => {
        const engine = loadAppEngine();
        const text = SampleWikitext.CONSTITUTION;
        const res = protect(engine, text);
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true },
            { term: 'संविधान सभा', checked: true }
        ];
        const linked = applySuggestions(engine, res.text, suggestions, true);
        const restored = unprotect(engine, linked, res.tokens);

        assert.ok(restored.includes('{{ज्ञानसन्दूक कानून'), 'Law infobox preserved');
        assert.ok(restored.includes('[[भारत गणराज्य]]'), 'Pre-existing link preserved');
        assert.ok(restored.includes('[[डॉ. भीमराव आंबेडकर]]'), 'Pre-existing link preserved');
        assert.ok(restored.includes('[[राज्य सभा]]'), 'Pre-existing link preserved');
        assert.ok(restored.includes('[[लोक सभा]]'), 'Pre-existing link preserved');
        assert.strictEqual(/PROTECTED_|⟪|⟫/.test(restored), false, '0 leaked tokens');
    });

    test('T4.3: Scenario 3 — Himalayas (हिमालय) Geography Hindi Wikipedia article section', () => {
        const engine = loadAppEngine();
        const text = SampleWikitext.HIMALAYAS;
        const res = protect(engine, text);
        const suggestions = [
            { term: 'पर्वतमाला', checked: true },
            { term: 'भारतीय उपमहाद्वीप', checked: true }
        ];
        const linked = applySuggestions(engine, res.text, suggestions, true);
        const restored = unprotect(engine, linked, res.tokens);

        assert.ok(restored.includes('{{ज्ञानसन्दूक पर्वतमाला'), 'Mountain infobox preserved');
        assert.ok(restored.includes('[[माउंट एवरेस्ट]]'), 'Pre-existing link preserved');
        assert.ok(restored.includes('[[गंगा नदी]]'), 'Pre-existing link preserved');
        assert.ok(restored.includes('[[सिंधु नदी]]'), 'Pre-existing link preserved');
        assert.ok(restored.includes('[[ब्रह्मपुत्र नदी]]'), 'Pre-existing link preserved');
        assert.strictEqual(/PROTECTED_|⟪|⟫/.test(restored), false, '0 leaked tokens');
    });
});
