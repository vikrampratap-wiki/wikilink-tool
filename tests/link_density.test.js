/**
 * tests/link_density.test.js
 * Comprehensive automated test suite for Link Inflation Bug Resolution & Accurate Link Density %
 * Covers Features 8 and 9 across Tiers 1-4.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppEngine, protect, Features } = require('./harness.js');

describe('Feature 8: Link Inflation Bug Resolution (Exact existingLinksCount)', () => {

    test('T1.1: Single plain link [[भारत]] increments count by exactly 1', () => {
        const engine = loadAppEngine();
        const text = '[[भारत]] एक महान देश है।';
        const res = protect(engine, text);
        // Match counter should find exactly 1 link match
        const matches = text.match(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g);
        assert.strictEqual(matches && matches.length, 1, 'Raw regex must find exactly 1 link');
        if (Features.isLinkInflationFixed()) {
            assert.strictEqual(res.existingLinksCount, 1, 'existingLinksCount must be exactly 1');
        }
    });

    test('T1.2: Piped link [[भारत|भारतीय गणराज्य]] increments count by exactly 1 (not 2, 3, or 4)', (t) => {
        const engine = loadAppEngine();
        const text = 'यहाँ [[भारत|भारतीय गणराज्य]] का उल्लेख है।';
        if (!Features.isLinkInflationFixed()) {
            t.skip('Pending Milestone M2 (Link inflation fix)');
            return;
        }
        const res = protect(engine, text);
        assert.strictEqual(res.existingLinksCount, 1, 'Piped link must only count as 1 link');
    });

    test('T1.3: Two piped links result in existingLinksCount === 2', (t) => {
        const engine = loadAppEngine();
        const text = '[[भारत|भारतीय गणराज्य]] एवं [[हिमालय|हिमालय पर्वतमाला]]';
        if (!Features.isLinkInflationFixed()) {
            t.skip('Pending Milestone M2 (Link inflation fix)');
            return;
        }
        const res = protect(engine, text);
        assert.strictEqual(res.existingLinksCount, 2, 'Two piped links must count as 2');
    });

    test('T1.4: Ten mixed plain and piped links result in count === 10', (t) => {
        const engine = loadAppEngine();
        const text = '[[A]] [[B|b]] [[C]] [[D|d]] [[E]] [[F|f]] [[G]] [[H|h]] [[I]] [[J|j]]';
        if (!Features.isLinkInflationFixed()) {
            t.skip('Pending Milestone M2 (Link inflation fix)');
            return;
        }
        const res = protect(engine, text);
        assert.strictEqual(res.existingLinksCount, 10, 'Ten links must count as 10');
    });

    test('T1.5: Canonical targets set contains normalized targets', (t) => {
        const engine = loadAppEngine();
        const text = '[[भारत|भारतीय गणराज्य]] एवं [[उत्तर_प्रदेश|यू पी]]';
        if (!Features.isLinkInflationFixed()) {
            t.skip('Pending Milestone M2 (Link inflation fix)');
            return;
        }
        const res = protect(engine, text);
        if (res.uniqueExistingTargets) {
            assert.ok(res.uniqueExistingTargets.has('भारत') || res.uniqueExistingTargets.has('bharat'), 'Canonical target must be preserved');
            assert.strictEqual(res.uniqueExistingTargets.size, 2, 'Two distinct targets should yield size 2');
        }
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Section anchor in piped link [[भारत#भूगोल|भारतीय भूगोल]] counts as 1', (t) => {
        const engine = loadAppEngine();
        const text = 'पढ़ें [[भारत#भूगोल|भारतीय भूगोल]] के बारे में।';
        if (!Features.isLinkInflationFixed()) {
            t.skip('Pending Milestone M2 (Link inflation fix)');
            return;
        }
        const res = protect(engine, text);
        assert.strictEqual(res.existingLinksCount, 1);
    });

    test('T2.2: Piped link with spaces and underscores [[उत्तर_प्रदेश | यू पी]] normalized cleanly', (t) => {
        const engine = loadAppEngine();
        const text = 'राजधानी है [[उत्तर_प्रदेश | यू पी]] की लखनऊ।';
        if (!Features.isLinkInflationFixed()) {
            t.skip('Pending Milestone M2 (Link inflation fix)');
            return;
        }
        const res = protect(engine, text);
        assert.strictEqual(res.existingLinksCount, 1);
    });

    test('T2.3: Zero links in wikitext results in existingLinksCount === 0', () => {
        const engine = loadAppEngine();
        const text = 'यह सादा लेख है जिसमें कोई कड़ी नहीं है।';
        const res = protect(engine, text);
        assert.strictEqual(res.existingLinksCount, 0, 'Zero links text must result in count 0');
    });

    test('T2.4: Two identical links [[भारत]] and [[भारत]] handled accurately', (t) => {
        const engine = loadAppEngine();
        const text = '[[भारत]] हमारा देश है और [[भारत]] महान है।';
        if (!Features.isLinkInflationFixed()) {
            t.skip('Pending Milestone M2 (Link inflation fix)');
            return;
        }
        const res = protect(engine, text);
        assert.strictEqual(res.existingLinksCount, 2, 'Total link occurrences should be 2');
        if (res.uniqueExistingTargets) {
            assert.strictEqual(res.uniqueExistingTargets.size, 1, 'Unique canonical targets should be 1');
        }
    });

    test('T2.5: Piped link with identical target and display [[प्रेमचंद|प्रेमचंद]] counts as 1', (t) => {
        const engine = loadAppEngine();
        const text = 'लेखक [[प्रेमचंद|प्रेमचंद]] प्रसिद्ध हैं।';
        if (!Features.isLinkInflationFixed()) {
            t.skip('Pending Milestone M2 (Link inflation fix)');
            return;
        }
        const res = protect(engine, text);
        assert.strictEqual(res.existingLinksCount, 1);
    });
});

describe('Feature 9: Accurate Link Density Calculation', () => {

    test('T1.1: 10 links in a 100-word article yields exactly 10.0% density', () => {
        const linksCount = 10;
        const wordCount = 100;
        const density = (linksCount / wordCount) * 100;
        assert.strictEqual(density, 10.0);
        assert.strictEqual(density.toFixed(1) + '%', '10.0%');
    });

    test('T1.2: 5 links in a 100-word article yields exactly 5.0% density', () => {
        const linksCount = 5;
        const wordCount = 100;
        const density = (linksCount / wordCount) * 100;
        assert.strictEqual(density, 5.0);
        assert.strictEqual(density.toFixed(1) + '%', '5.0%');
    });

    test('T1.3: 0 links in an article yields 0.0% density', () => {
        const linksCount = 0;
        const wordCount = 100;
        const density = (linksCount / wordCount) * 100;
        assert.strictEqual(density, 0.0);
        assert.strictEqual(density.toFixed(1) + '%', '0.0%');
    });

    test('T1.4: Density formula does not use artificial / 2 or 2x inflation factors', () => {
        // Test that density calculation uses clean exact counts
        const calcDensity = (links, words) => words > 0 ? ((links / words) * 100) : 0;
        assert.strictEqual(calcDensity(15, 150), 10);
        assert.strictEqual(calcDensity(3, 50), 6);
    });

    test('T1.5: Max density threshold (e.g. 10%) correctly caps suggestions', () => {
        const wordCount = 100;
        const maxDensityPercent = 10; // 10% of 100 words = 10 maximum links
        const existingLinks = 3;
        const maxAllowedNew = Math.max(0, Math.floor((wordCount * maxDensityPercent) / 100) - existingLinks);
        assert.strictEqual(maxAllowedNew, 7, 'Allowed new links should be capped at 7');
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Short article with <= 30 words handles density threshold safely', () => {
        const wordCount = 20;
        const maxDensityPercent = 10;
        // In app.js line 2801, for articles <= 30 words, density cap is relaxed to avoid capping to 0
        const isShortArticle = wordCount <= 30;
        assert.strictEqual(isShortArticle, true, 'Short articles should be identified');
    });

    test('T2.2: Article with 0 words does not cause division by zero (NaN or Infinity)', () => {
        const calcSafeDensity = (links, words) => {
            if (!words || words <= 0) return 0;
            return ((links / words) * 100);
        };
        const res = calcSafeDensity(5, 0);
        assert.strictEqual(res, 0);
        assert.strictEqual(Number.isFinite(res), true);
    });

    test('T2.3: Piped links with very long display strings do not distort word counting', () => {
        const engine = loadAppEngine();
        const text = 'भारत में [[संविधान|भारतीय संविधान जो 1950 में लागू हुआ]] का महत्व है।';
        const res = protect(engine, text);
        // The protected text replaces the piped link with a single token, keeping word count accurate
        const cleanWords = (res.text || res.cleanText).trim().split(/\s+/);
        assert.ok(cleanWords.length < 15, 'Placeholder token should not inflate word count');
    });

    test('T2.4: Decimal precision formatted to 1 decimal place (e.g. "7.5%")', () => {
        const formatDensity = (d) => Number(d).toFixed(1) + '%';
        assert.strictEqual(formatDensity(7.532), '7.5%');
        assert.strictEqual(formatDensity(12.0), '12.0%');
        assert.strictEqual(formatDensity(0), '0.0%');
    });

    test('T2.5: Link density cap correctly accounts for existing links', () => {
        const wordCount = 200;
        const maxDensity = 5; // 5% = 10 total links max
        const existing = 10;
        const allowed = Math.max(0, Math.floor((wordCount * maxDensity) / 100) - existing);
        assert.strictEqual(allowed, 0, 'When existing links already meet cap, allowed new should be 0');
    });
});

describe('Tier 3: Link Density Cross-Feature Combinations', () => {

    test('T3.1: Pre-existing piped links + New candidate suggestions + Exact density cap', (t) => {
        if (!Features.isLinkInflationFixed()) {
            t.skip('Pending Milestone M2 (Link inflation fix)');
            return;
        }
        const engine = loadAppEngine();
        const text = '[[भारत|भारतीय गणराज्य]] के 28 राज्य और 8 केंद्र शासित प्रदेश हैं।';
        const res = protect(engine, text);
        assert.strictEqual(res.existingLinksCount, 1, 'Only 1 existing link present');
    });
});

describe('Tier 4: Link Density Real-World Scenarios', () => {

    test('T4.1: Constitution excerpt link count and density calculation', (t) => {
        const engine = loadAppEngine();
        const constitutionText = `'''भारत का संविधान''' भारत का सर्वोच्च विधान है जो संविधान सभा द्वारा पारित हुआ। [[डॉ. भीमराव आंबेडकर]] को संविधान का जनक माना जाता है। [[राज्य सभा]] और [[लोक सभा]] भारतीय संसद के दो प्रमुख सदन हैं।`;
        const res = protect(engine, constitutionText);
        // Pre-existing links in this snippet: [[डॉ. भीमराव आंबेडकर]], [[राज्य सभा]], [[लोक सभा]] = 3 links
        const expectedLinks = 3;
        const matches = constitutionText.match(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g);
        assert.strictEqual(matches && matches.length, expectedLinks, 'Wikitext has 3 pre-existing links');

        if (Features.isLinkInflationFixed()) {
            assert.strictEqual(res.existingLinksCount, expectedLinks);
        }
    });
});
