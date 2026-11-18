/**
 * tests/adversarial_challenger_m2.test.js
 * Adversarial Challenger Stress Harness for Milestone M2 (Core Wikilinking Engine)
 * Probes:
 *   1. Compound Terms Shielding & Civic Terms Matching (R1)
 *   2. Link Density & Inflation Calculation (R3)
 *   3. Multi-Level Nested Templates & Zero Token Leakage (R5)
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppEngine, protect, unprotect, applySuggestions } = require('./harness.js');

describe('Adversarial Challenge 1: Compound Terms Shielding & Civic Matching', () => {

    test('AC1.1: Multi-candidate sentence "भारतीय संविधान सभा ने भारत का संविधान तैयार किया।" with all constituents checked', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने भारत का संविधान तैयार किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true },
            { term: 'संविधान सभा', checked: true },
            { term: 'संविधान', checked: true },
            { term: 'भारत', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);

        // "भारतीय संविधान सभा" must NEVER be fragmented or inner-linked
        assert.ok(res.includes('[[भारतीय संविधान सभा]]'), 'Must contain intact [[भारतीय संविधान सभा]]');
        assert.strictEqual(res.includes('[[भारतीय [[संविधान सभा]]'), false, 'No nested compound link');
        assert.strictEqual(res.includes('[[भारतीय संविधान [[सभा]]'), false, 'No nested sub-word link');
        assert.strictEqual(res.includes('भारतीय [[संविधान]] सभा'), false, 'No inner sub-word carving');
        assert.strictEqual(res.includes('[[भारतीय]] संविधान सभा'), false, 'No prefix carving');

        // Outside compound: "भारत" and "संविधान" must be linked cleanly
        assert.ok(res.includes('ने [[भारत]] का [[संविधान]] तैयार किया'), 'Independent occurrences outside compound must link cleanly');
    });

    test('AC1.2: Unchecked compound leaves text plain and shields inner words from lower-tier suggestions', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने भारत का संविधान तैयार किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: false },
            { term: 'संविधान सभा', checked: false },
            { term: 'संविधान', checked: true },
            { term: 'भारत', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);

        // "भारतीय संविधान सभा" was unchecked, so it must stay completely plain
        assert.strictEqual(res.includes('[[भारतीय संविधान सभा]]'), false, 'Unchecked compound must not link');
        assert.strictEqual(res.includes('[[संविधान सभा]]'), false, 'Unchecked 2-gram must not link inside 3-gram');
        assert.strictEqual(res.includes('भारतीय [[संविधान]] सभा'), false, '1-gram must not carve into unchecked compound');
        assert.ok(res.includes('भारतीय संविधान सभा ने'), 'Compound text must remain verbatim plain');

        // Standalone occurrences outside the compound must still link
        assert.ok(res.includes('ने [[भारत]] का [[संविधान]] तैयार किया'), 'Outside occurrences link normally');
    });

    test('AC1.3: Punctuation boundaries around compound "भारतीय संविधान सभा"', () => {
        const engine = loadAppEngine();
        const cases = [
            { input: '"भारतीय संविधान सभा" ने निर्णय लिया।', expected: '"[[भारतीय संविधान सभा]]" ने निर्णय लिया।' },
            { input: '«भारतीय संविधान सभा» का गठन हुआ।', expected: '«[[भारतीय संविधान सभा]]» का गठन हुआ।' },
            { input: "'भारतीय संविधान सभा' का कार्य।", expected: "'[[भारतीय संविधान सभा]]' का कार्य।" },
            { input: '(भारतीय संविधान सभा) द्वारा निर्मित।', expected: '([[भारतीय संविधान सभा]]) द्वारा निर्मित।' },
            { input: 'सदस्य थे: भारतीय संविधान सभा, जिन्होंने हस्ताक्षर किए।', expected: 'सदस्य थे: [[भारतीय संविधान सभा]], जिन्होंने हस्ताक्षर किए।' },
            { input: 'यह निर्णय था भारतीय संविधान सभा।', expected: 'यह निर्णय था [[भारतीय संविधान सभा]]।' },
            { input: 'भारतीय संविधान सभा - एक ऐतिहासिक निकाय।', expected: '[[भारतीय संविधान सभा]] - एक ऐतिहासिक निकाय।' },
            { input: '\nभारतीय संविधान सभा\nका विवरण।', expected: '\n[[भारतीय संविधान सभा]]\nका विवरण।' }
        ];

        for (const { input, expected } of cases) {
            const suggestions = [
                { term: 'भारतीय संविधान सभा', checked: true },
                { term: 'संविधान', checked: true }
            ];
            const res = applySuggestions(engine, input, suggestions, true);
            assert.strictEqual(res, expected, `Punctuation boundary failed for: ${input}`);
            assert.strictEqual(res.includes('[[संविधान]] सभा'), false, 'Sub-word must not carve into compound');
        }
    });

    test('AC1.4: Repeat occurrence of compound with firstOnly=true shields second occurrence from sub-words', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने प्रारूप बनाया। बाद में भारतीय संविधान सभा ने इसे स्वीकार किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true },
            { term: 'संविधान', checked: true },
            { term: 'सभा', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);

        // Occurrence 1: linked as [[भारतीय संविधान सभा]]
        assert.ok(res.includes('[[भारतीय संविधान सभा]] ने प्रारूप बनाया'), 'First occurrence must be linked');
        // Occurrence 2: kept plain, sub-words 'संविधान' or 'सभा' must NOT carve into it
        assert.ok(res.includes('बाद में भारतीय संविधान सभा ने इसे स्वीकार किया'), 'Second occurrence must be plain and intact');
        assert.strictEqual(res.includes('भारतीय [[संविधान]] सभा'), false, 'Second occurrence must not have inner link');
        assert.strictEqual(res.includes('भारतीय संविधान [[सभा]]'), false, 'Second occurrence must not have suffix link');
    });

    test('AC1.5: 4-gram > 3-gram > 2-gram longest-match hierarchy resolution', () => {
        const engine = loadAppEngine();
        const text = 'उत्तर प्रदेश विधान सभा का अधिवेशन हुआ।';
        const suggestions = [
            { term: 'उत्तर प्रदेश विधान सभा', checked: true },
            { term: 'विधान सभा', checked: true },
            { term: 'उत्तर प्रदेश', checked: true },
            { term: 'सभा', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.strictEqual(res, '[[उत्तर प्रदेश विधान सभा]] का अधिवेशन हुआ।', '4-gram must take complete precedence');
    });

    test('AC1.6: Civic terms allowlist recognition across all constitutional bodies', () => {
        const engine = loadAppEngine();
        const civicTerms = [
            'राज्य सभा',
            'विधान सभा',
            'नगर निगम',
            'ग्राम पंचायत',
            'विधान परिषद',
            'नगर पालिका',
            'जिला पंचायत',
            'उच्च न्यायालय',
            'सर्वोच्च न्यायालय'
        ];

        for (const term of civicTerms) {
            const words = term.split(/\s+/).length;
            const valid = engine.exports.isValidCandidate(term, words, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
            assert.strictEqual(valid, true, `Civic compound "${term}" MUST be recognized as a valid candidate`);
        }
    });

    test('AC1.7: Standalone civic constituent words are strictly non-linkable', () => {
        const engine = loadAppEngine();
        const standaloneWords = [
            'राज्य',
            'सभा',
            'विधान',
            'नगर',
            'निगम',
            'ग्राम',
            'पंचायत',
            'संसद',
            'सदन',
            'पालिका',
            'अदालत',
            'प्राधिकरण'
        ];

        for (const word of standaloneWords) {
            const isNonLinkable = engine.exports.isNonLinkableWord(word, 'hi');
            assert.strictEqual(isNonLinkable, true, `Standalone word "${word}" MUST be flagged as non-linkable`);

            const valid = engine.exports.isValidCandidate(word, 1, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
            assert.strictEqual(valid, false, `Standalone word "${word}" MUST NOT be a valid candidate`);
        }
    });
});

describe('Adversarial Challenge 2: Link Inflation Count vs Duplicate & Piped Links', () => {

    test('AC2.1: 10 duplicate links [[भारत]] yields existingLinksCount === 10 (not 1)', () => {
        const engine = loadAppEngine();
        const text = Array(10).fill('[[भारत]]').join(' ');
        const res = protect(engine, text);

        assert.strictEqual(res.existingLinksCount, 10, '10 duplicate links must yield existingLinksCount === 10');
        if (res.uniqueExistingTargets) {
            assert.strictEqual(res.uniqueExistingTargets.size, 1, 'Only 1 unique canonical target');
            assert.ok(res.uniqueExistingTargets.has('भारत') || res.uniqueExistingTargets.has('bharat'));
        }
    });

    test('AC2.2: 5 piped links [[भारत|भारतीय गणराज्य]] yields existingLinksCount === 5 (not 10 or 15)', () => {
        const engine = loadAppEngine();
        const text = Array(5).fill('[[भारत|भारतीय गणराज्य]]').join(' ');
        const res = protect(engine, text);

        assert.strictEqual(res.existingLinksCount, 5, '5 piped links must yield existingLinksCount === 5');
        if (res.uniqueExistingTargets) {
            assert.strictEqual(res.uniqueExistingTargets.size, 1, 'All 5 piped links point to 1 unique target');
        }
    });

    test('AC2.3: Heavy mixed wikitext: 10 duplicate links + 5 identical piped links + 5 distinct piped links', () => {
        const engine = loadAppEngine();
        const links = [
            ...Array(10).fill('[[भारत]]'),
            ...Array(5).fill('[[भारत|भारतीय गणराज्य]]'),
            '[[उत्तर प्रदेश|यू पी]]',
            '[[मध्य प्रदेश|एम पी]]',
            '[[बिहार|बिहार राज्य]]',
            '[[राजस्थान|मरुभूमि]]',
            '[[पंजाब|पंजाब क्षेत्र]]'
        ];
        const text = links.join('\n');
        const res = protect(engine, text);

        assert.strictEqual(res.existingLinksCount, 20, 'Total 20 link occurrences must yield existingLinksCount === 20');
        if (res.uniqueExistingTargets) {
            // Targets: भारत, उत्तर प्रदेश, मध्य प्रदेश, बिहार, राजस्थान, पंजाब (6 unique)
            assert.strictEqual(res.uniqueExistingTargets.size, 6, 'Unique canonical targets must equal 6');
        }
    });

    test('AC2.4: Section anchors and spacing in piped links', () => {
        const engine = loadAppEngine();
        const text = '[[भारत#भूगोल|भारतीय भूगोल]] एवं [[ उत्तर_प्रदेश #इतिहास | यू पी का इतिहास ]]';
        const res = protect(engine, text);

        assert.strictEqual(res.existingLinksCount, 2, 'Two anchor-piped links must count as 2');
        if (res.uniqueExistingTargets) {
            assert.strictEqual(res.uniqueExistingTargets.size, 2);
            assert.ok(res.uniqueExistingTargets.has('भारत') || res.uniqueExistingTargets.has('bharat'));
            assert.ok(res.uniqueExistingTargets.has('उत्तर प्रदेश') || res.uniqueExistingTargets.has('uttar pradesh'));
        }
    });

    test('AC2.5: Category and File links are shielded and NOT counted in existingLinksCount', () => {
        const engine = loadAppEngine();
        const text = `[[चित्र:Flag of India.svg|अंगूठाकार|भारत का ध्वज]]
[[श्रेणी:भारतीय राजनीति]]
[[Category:India]]
[[File:Emblem of India.svg|100px]]
साधारण कड़ी: [[भारत]]`;
        const res = protect(engine, text);

        // Only [[भारत]] is an internal encyclopedic article link
        assert.strictEqual(res.existingLinksCount, 1, 'Category and File embeds must not inflate existingLinksCount');
    });

    test('AC2.6: Mathematical density calculation robustness and zero-division defenses', () => {
        const engine = loadAppEngine();
        const calc = engine.exports.calculateDensity;
        assert.strictEqual(typeof calc, 'function', 'calculateDensity must be exported function');

        assert.strictEqual(calc(10, 100), 10.0);
        assert.strictEqual(calc(5, 50), 10.0);
        assert.strictEqual(calc(0, 100), 0.0);
        assert.strictEqual(calc(10, 0), 0.0, '0 words must return 0 without throwing or returning Infinity');
        assert.strictEqual(calc(10, -5), 0.0, 'Negative words must return 0');
        assert.strictEqual(calc(null, 100), 0.0, 'Null links must return 0');
        assert.strictEqual(calc(10, null), 0.0, 'Null words must return 0');
        assert.strictEqual(calc(undefined, 100), 0.0);
        assert.strictEqual(calc(10, undefined), 0.0);
        assert.strictEqual(calc(NaN, 100), 0.0);
        assert.strictEqual(calc(10, NaN), 0.0);
    });
});

describe('Adversarial Challenge 3: Multi-Level Nested Templates & Zero Token Leakage', () => {

    test('AC3.1: 5-level deep template nesting restores verbatim with zero leaked tokens', () => {
        const engine = loadAppEngine();
        const input = '{{L1|v1={{L2|v2={{L3|v3={{L4|v4={{L5|v5=DeepestValue}}}}}}}}}}';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);

        assert.strictEqual(restored, input, '5-level nested template must restore 100% verbatim');
        assert.strictEqual(/PROTECTED_[A-Z0-9_]*/.test(restored), false, 'Zero PROTECTED_ tokens allowed');
        assert.strictEqual(/⟪\d+⟫/.test(restored), false, 'Zero ⟪...⟫ placeholders allowed');
        assert.strictEqual(/[\x01\x02]/.test(restored), false, 'Zero control characters allowed');
    });

    test('AC3.2: 10-level deep template nesting restores verbatim', () => {
        const engine = loadAppEngine();
        let input = 'leaf';
        for (let i = 10; i >= 1; i--) {
            input = `{{T${i}|arg=${input}}}`;
        }
        const res = protect(engine, input);
        const restored = unprotect(engine, res);

        assert.strictEqual(restored, input, '10-level deep template must restore 100% verbatim');
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false);
    });

    test('AC3.3: Branching cross-nested templates with multi-line parameters and embedded wikilinks', () => {
        const engine = loadAppEngine();
        const input = `{{ज्ञानसन्दूक व्यक्ति
| नाम = {{नाम_साँचा|पहला=मोहनदास|मध्य=करमचंद|अंतिम=गांधी}}
| जन्म = {{तारीख|1869|10|2}}
| कार्यक्षेत्र = {{सूची|आइटम1=[[अहिंसा]]|आइटम2=[[सत्याग्रह]]|आइटम3={{साँचा3|उप={{साँचा4|गहन}}}}}}
| सन्दर्भ = {{cite web|url=https://example.org|archive={{wayback|url={{mirror|http://backup.org}}|date=2020}}}}
}}
मुख्य पाठ: [[महात्मा गांधी]] ने भारत के [[स्वतंत्रता आंदोलन]] का नेतृत्व किया।`;

        const res = protect(engine, input);
        const restored = unprotect(engine, res);

        assert.strictEqual(restored, input, 'Complex branching template tree must restore byte-for-byte');
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false);
    });

    test('AC3.4: Stress-test unprotection against all placeholder formats (tokenMap coverage)', () => {
        const engine = loadAppEngine();
        // Emulate raw text that has internal placeholders exposed
        const protectedTokens = [
            { placeholder: '\x01⟪0⟫\x02', original: '{{Template0}}' },
            { placeholder: '\x01⟪1⟫\x02', original: '{{Template1|inner=\x01⟪0⟫\x02}}' },
            { placeholder: '\x01PROTECTED_2\x02', original: '{{Template2|deep=\x01⟪1⟫\x02}}' }
        ];

        const textWithTokens = '\x01PROTECTED_2\x02';
        const restored = engine.exports.unprotectWikitext(textWithTokens, protectedTokens);

        assert.strictEqual(restored, '{{Template2|deep={{Template1|inner={{Template0}}}}}}');
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false);
    });

    test('AC3.5: Literal identifier "PROTECTED_VAR" is preserved when not matching tokenMap indices', () => {
        const engine = loadAppEngine();
        const input = 'कॉन्फ़िगरेशन में PROTECTED_VAR_99999 का उपयोग हुआ है।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);

        assert.strictEqual(restored, input, 'Non-existent token indices must remain uncorrupted');
    });
});
