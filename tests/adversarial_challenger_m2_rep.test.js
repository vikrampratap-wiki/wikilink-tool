/**
 * tests/adversarial_challenger_m2_rep.test.js
 * Adversarial Challenger 2 Replacement Test Suite for Milestone M2 (core_engine)
 *
 * Verifies:
 * 1. Empty strings, whitespace, massive text corpora (10,000 words), zero-word articles for density calculation (no NaN/Infinity)
 * 2. Unbalanced templates {{foo and malformed tokens
 * 3. Repeat compound shielding (firstOnly = true vs firstOnly = false)
 * 4. Unselected compound phrase shielding
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppEngine, protect, unprotect, applySuggestions } = require('./harness.js');

describe('Adversarial Suite 1: Empty Strings, Whitespace, Massive Corpora, and Density Bounds', () => {

    test('E1.1: calculateDensity robustness against zero, negative, null, NaN, and Infinity', () => {
        const engine = loadAppEngine();
        const calc = engine.exports.calculateDensity;
        assert.strictEqual(typeof calc, 'function', 'calculateDensity must be a callable function');

        // Zero words and zero links
        assert.strictEqual(calc(0, 0), 0.0);
        assert.strictEqual(calc(5, 0), 0.0);
        assert.strictEqual(calc(0, 5), 0.0);

        // Negative numbers
        assert.strictEqual(calc(-1, 100), 0.0);
        assert.strictEqual(calc(10, -50), 0.0);
        assert.strictEqual(calc(-5, -50), 0.0);

        // Non-number primitives
        assert.strictEqual(calc(null, 100), 0.0);
        assert.strictEqual(calc(10, null), 0.0);
        assert.strictEqual(calc(undefined, 100), 0.0);
        assert.strictEqual(calc(10, undefined), 0.0);
        assert.strictEqual(calc('', ''), 0.0);
        assert.strictEqual(calc('   ', '   '), 0.0);
        assert.strictEqual(calc('10', '100'), 10.0);

        // NaN and Infinity bounds
        assert.strictEqual(calc(NaN, 100), 0.0);
        assert.strictEqual(calc(10, NaN), 0.0);
        assert.strictEqual(calc(NaN, NaN), 0.0);
        assert.strictEqual(Number.isFinite(calc(10, 100)), true);
        assert.strictEqual(Number.isNaN(calc(0, 0)), false);
        assert.strictEqual(calc(0, 0) === Infinity, false);
    });

    test('E1.2: Empty string input lifecycle (protect, unprotect, applySuggestions)', () => {
        const engine = loadAppEngine();
        const empty = '';

        const pRes = protect(engine, empty);
        assert.strictEqual(pRes.text, '');
        assert.strictEqual(pRes.existingLinksCount, 0);
        assert.strictEqual(pRes.tokens.length, 0);

        const unp = unprotect(engine, pRes);
        assert.strictEqual(unp, '');

        const applied = applySuggestions(engine, empty, [{ term: 'भारत', checked: true }], true);
        assert.strictEqual(applied, '');
    });

    test('E1.3: Whitespace-only input (spaces, tabs, newlines) preserves whitespace and zero token leaks', () => {
        const engine = loadAppEngine();
        const ws = '   \n\t\n   \r\n   ';

        const pRes = protect(engine, ws);
        assert.strictEqual(pRes.text, ws);
        assert.strictEqual(pRes.existingLinksCount, 0);

        const unp = unprotect(engine, pRes);
        assert.strictEqual(unp, ws);

        const applied = applySuggestions(engine, ws, [{ term: 'भारत', checked: true }], true);
        assert.strictEqual(applied, ws);
    });

    test('E1.4: Zero-word article with only wikilinks or punctuation', () => {
        const engine = loadAppEngine();
        const text = '[[भारत]]';
        const pRes = protect(engine, text);
        assert.strictEqual(pRes.existingLinksCount, 1);

        const restored = unprotect(engine, pRes);
        assert.strictEqual(restored, text);

        // Density bounds check for 1 link with 0 or 1 words
        const calc = engine.exports.calculateDensity;
        assert.strictEqual(calc(1, 0), 0.0);
        assert.strictEqual(calc(1, 1), 100.0);
    });

    test('E1.5: Massive text corpus (10,000 words) performance, density bounds, and zero token leaks', () => {
        const engine = loadAppEngine();

        // Build a massive 10,000-word Devanagari text fixture with mixed links and templates
        const sentenceTemplates = [
            'भारतीय संविधान सभा ने स्वतंत्र भारत के लिए सर्वोच्च विधान का प्रारूप तैयार किया।',
            'राज्य सभा और लोक सभा भारतीय संसद के महत्वपूर्ण लोकतांत्रिक सदन हैं।',
            'विधान सभा और विधान परिषद विभिन्न राज्यों के विधायी कामकाज का संचालन करती हैं।',
            'ग्राम पंचायत तथा नगर निगम स्थानीय स्वशासन की महत्वपूर्ण प्रशासनिक इकाइयां हैं।',
            'हिमालय पर्वतमाला से निकलने वाली नदियां भारत के विशाल मैदानों को सींचती हैं।',
            'मुंशी प्रेमचंद ने हिन्दी साहित्य में यथार्थवादी उपन्यासों की गौरवशाली परम्परा स्थापित की।',
            '{{तारीख|1950|1|26}} को भारत का संविधान सम्पूर्ण देश में औपचारिक रूप से लागू हुआ।',
            'विद्वानों के अनुसार [[भारत]] की संप्रभुता [[संविधान]] की सर्वोच्चता पर आधारित है।',
            'उच्च न्यायालय और सर्वोच्च न्यायालय न्यायिक समीक्षा का महत्वपूर्ण अधिकार रखते हैं।',
            'प्रौद्योगिकी और वैज्ञानिक अनुसंधान के क्षेत्र में नए प्रतिमान स्थापित किए गए हैं।'
        ];

        const sentences = [];
        let currentWordCount = 0;
        let idx = 0;
        while (currentWordCount < 10000) {
            const tmpl = sentenceTemplates[idx % sentenceTemplates.length];
            sentences.push(tmpl);
            currentWordCount += tmpl.split(/\s+/).length;
            idx++;
        }

        const largeCorpus = sentences.join('\n');
        assert.ok(currentWordCount >= 10000, `Corpus must exceed 10,000 words (got ${currentWordCount})`);

        // Measure protect performance
        const t0 = Date.now();
        const pRes = protect(engine, largeCorpus);
        const protectDuration = Date.now() - t0;
        assert.ok(protectDuration < 2000, `protectWikitextStructures must complete within 2000ms (took ${protectDuration}ms)`);

        // Density calculation for large corpus
        const calc = engine.exports.calculateDensity;
        const density = calc(pRes.existingLinksCount, currentWordCount);
        assert.strictEqual(Number.isFinite(density), true, 'Density must be finite number');
        assert.strictEqual(Number.isNaN(density), false, 'Density must not be NaN');
        assert.ok(density >= 0.0 && density <= 100.0, 'Density must be between 0% and 100%');

        // Measure unprotect performance and zero leakage
        const t1 = Date.now();
        const restored = unprotect(engine, pRes);
        const unprotectDuration = Date.now() - t1;
        assert.ok(unprotectDuration < 2000, `unprotectWikitext must complete within 2000ms (took ${unprotectDuration}ms)`);

        assert.strictEqual(restored, largeCorpus, 'Massive corpus must restore 100% byte-identical');
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false, 'Zero leaked placeholders or control bytes');
    });
});

describe('Adversarial Suite 2: Unbalanced Templates and Malformed Tokens', () => {

    test('E2.1: Single unclosed template {{foo does not infinite-loop or throw', () => {
        const engine = loadAppEngine();
        const inputs = [
            '{{ज्ञानसन्दूक अधूरा',
            'शुरुआत {{साँचा_आधा बीच का पाठ',
            'अंतिम वाक्य {{अपूर्ण'
        ];

        for (const input of inputs) {
            const pRes = protect(engine, input);
            const restored = unprotect(engine, pRes);
            assert.strictEqual(restored, input, `Unclosed template must restore verbatim for: ${input}`);
            assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false);
        }
    });

    test('E2.2: Unbalanced nested templates {{outer | arg = {{inner}} (outer unclosed)', () => {
        const engine = loadAppEngine();
        const input = 'विवरण {{बाहरी_साँचा | पैरा = {{आंतरिक_साँचा|मान=123}} शेष पाठ बिना बन्द कोष्ठक के';
        const pRes = protect(engine, input);
        const restored = unprotect(engine, pRes);

        assert.strictEqual(restored, input, 'Nested unbalanced template must restore verbatim');
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false);
    });

    test('E2.3: Unbalanced extra closing braces }} without matching opening', () => {
        const engine = loadAppEngine();
        const input = 'सामान्य पाठ }} अतिरिक्त बन्द कोष्ठक {{वैध_साँचा|मान=1}} तथा और }} बन्द';
        const pRes = protect(engine, input);
        const restored = unprotect(engine, pRes);

        assert.strictEqual(restored, input, 'Extra closing braces must be preserved verbatim');
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false);
    });

    test('E2.4: Malformed and synthetic tokens in unprotect input', () => {
        const engine = loadAppEngine();
        const malformedCases = [
            '\x01⟪999999⟫\x02',
            'PROTECTED_999999',
            '\x01PROTECTED_999999\x02',
            '⟪abc⟫',
            'पाठ के मध्य \x01 नियंत्रण वर्ण \x02 और ⟪9999⟫ टोकन'
        ];

        for (const malformed of malformedCases) {
            // Must not throw or enter infinite loop when tokens array is empty
            assert.doesNotThrow(() => {
                const res = engine.exports.unprotectWikitext(malformed, []);
                assert.strictEqual(typeof res, 'string');
            });

            // When tokens array is non-empty, must replace valid tokens and strip control characters
            assert.doesNotThrow(() => {
                const dummyTokens = [{ placeholder: '\x01⟪0⟫\x02', original: '{{साँचा}}' }];
                const res = engine.exports.unprotectWikitext(malformed + ' \x01⟪0⟫\x02', dummyTokens);
                assert.strictEqual(res.includes('{{साँचा}}'), true);
                assert.strictEqual(/[\x01\x02]/.test(res), false, 'Control bytes must be stripped in unprotect');
            });

            // In full lifecycle applySuggestions pipeline, control bytes are never leaked
            assert.doesNotThrow(() => {
                const applied = applySuggestions(engine, malformed, [{ term: 'भारत', checked: true }], true);
                assert.strictEqual(/[\x01\x02]/.test(applied), false, 'Pipeline must never leak control bytes');
            });
        }
    });

    test('E2.5: Deep multi-brace cascade {{{{{{{{foo}}}} handles safely', () => {
        const engine = loadAppEngine();
        const cascade = '{{{{{{{{अत्यधिक_कोष्ठक|मान=परीक्षण}}}}}}';
        const pRes = protect(engine, cascade);
        const restored = unprotect(engine, pRes);

        assert.strictEqual(restored, cascade, 'Multi-brace cascade must restore verbatim');
        assert.strictEqual(/[\x01\x02]/.test(restored), false);
    });
});

describe('Adversarial Suite 3: Repeat Compound Shielding (firstOnly = true vs firstOnly = false)', () => {

    test('E3.1: Two occurrences of civic compound "राज्य सभा" with firstOnly = true', () => {
        const engine = loadAppEngine();
        const text = 'राज्य सभा एक स्थायी सदन है। राज्य सभा के सदस्यों का चुनाव अप्रत्यक्ष होता है।';
        const suggestions = [
            { term: 'राज्य सभा', checked: true },
            { term: 'राज्य', checked: true },
            { term: 'सभा', checked: true }
        ];

        const res = applySuggestions(engine, text, suggestions, true);

        // Occurrence 1: linked as [[राज्य सभा]]
        // Occurrence 2: preserved plain "राज्य सभा", NOT broken into [[राज्य]] सभा or राज्य [[सभा]]
        assert.ok(res.startsWith('[[राज्य सभा]] एक स्थायी सदन है।'), 'First occurrence must link');
        assert.ok(res.includes('। राज्य सभा के सदस्यों का'), 'Second occurrence must remain verbatim plain');
        assert.strictEqual(res.includes('[[राज्य]] सभा'), false, 'Sub-word "राज्य" must not carve into second occurrence');
        assert.strictEqual(res.includes('राज्य [[सभा]]'), false, 'Sub-word "सभा" must not carve into second occurrence');
        assert.strictEqual(res.includes('[[राज्य सभा]] के सदस्यों'), false, 'Second occurrence must not be linked when firstOnly=true');
    });

    test('E3.2: Two occurrences of civic compound "राज्य सभा" with firstOnly = false', () => {
        const engine = loadAppEngine();
        const text = 'राज्य सभा एक स्थायी सदन है। राज्य सभा के सदस्यों का चुनाव अप्रत्यक्ष होता है।';
        const suggestions = [
            { term: 'राज्य सभा', checked: true },
            { term: 'राज्य', checked: true },
            { term: 'सभा', checked: true }
        ];

        const res = applySuggestions(engine, text, suggestions, false);

        // Both occurrences must link as [[राज्य सभा]], neither carved by sub-words
        const expected = '[[राज्य सभा]] एक स्थायी सदन है। [[राज्य सभा]] के सदस्यों का चुनाव अप्रत्यक्ष होता है।';
        assert.strictEqual(res, expected, 'Both occurrences must link cleanly when firstOnly=false');
        assert.strictEqual(res.includes('[[राज्य]]'), false);
        assert.strictEqual(res.includes('[[सभा]]'), false);
    });

    test('E3.3: Three occurrences of "विधान सभा" with firstOnly = true', () => {
        const engine = loadAppEngine();
        const text = 'विधान सभा की बैठक हुई। विधान सभा के अध्यक्ष ने बात की। अंत में विधान सभा स्थगित हुई।';
        const suggestions = [
            { term: 'विधान सभा', checked: true },
            { term: 'विधान', checked: true },
            { term: 'सभा', checked: true }
        ];

        const res = applySuggestions(engine, text, suggestions, true);

        // Occurrence 1 linked, occurrences 2 and 3 plain and shielded
        assert.ok(res.startsWith('[[विधान सभा]] की बैठक हुई।'), '1st occurrence must link');
        assert.ok(res.includes('। विधान सभा के अध्यक्ष ने बात की।'), '2nd occurrence must remain plain');
        assert.ok(res.includes('। अंत में विधान सभा स्थगित हुई।'), '3rd occurrence must remain plain');
        assert.strictEqual(res.includes('[[विधान]] सभा'), false, 'No sub-word prefix carving in 2nd/3rd');
        assert.strictEqual(res.includes('विधान [[सभा]]'), false, 'No sub-word suffix carving in 2nd/3rd');
    });

    test('E3.4: Repeat 4-gram compound "उत्तर प्रदेश विधान सभा" with sub-compounds and firstOnly = true', () => {
        const engine = loadAppEngine();
        const text = 'उत्तर प्रदेश विधान सभा लखनऊ में स्थित है। उत्तर प्रदेश विधान सभा का भवन ऐतिहासिक है।';
        const suggestions = [
            { term: 'उत्तर प्रदेश विधान सभा', checked: true },
            { term: 'विधान सभा', checked: true },
            { term: 'उत्तर प्रदेश', checked: true },
            { term: 'सभा', checked: true }
        ];

        const res = applySuggestions(engine, text, suggestions, true);

        // Occurrence 1: [[उत्तर प्रदेश विधान सभा]]
        // Occurrence 2: plain "उत्तर प्रदेश विधान सभा" shielded from both "विधान सभा" and "उत्तर प्रदेश"
        assert.ok(res.startsWith('[[उत्तर प्रदेश विधान सभा]] लखनऊ में स्थित है।'));
        assert.ok(res.includes('। उत्तर प्रदेश विधान सभा का भवन'));
        assert.strictEqual(res.includes('उत्तर प्रदेश [[विधान सभा]]'), false, 'Sub-compound must not carve into repeat 4-gram');
        assert.strictEqual(res.includes('[[उत्तर प्रदेश]] विधान सभा'), false, 'Prefix sub-compound must not carve into repeat 4-gram');
    });

    test('E3.5: Repeat 4-gram compound with firstOnly = false across multiple occurrences', () => {
        const engine = loadAppEngine();
        const text = 'उत्तर प्रदेश विधान सभा प्रथम। उत्तर प्रदेश विधान सभा द्वितीय। उत्तर प्रदेश विधान सभा तृतीय।';
        const suggestions = [
            { term: 'उत्तर प्रदेश विधान सभा', checked: true },
            { term: 'विधान सभा', checked: true },
            { term: 'उत्तर प्रदेश', checked: true }
        ];

        const res = applySuggestions(engine, text, suggestions, false);

        const expected = '[[उत्तर प्रदेश विधान सभा]] प्रथम। [[उत्तर प्रदेश विधान सभा]] द्वितीय। [[उत्तर प्रदेश विधान सभा]] तृतीय।';
        assert.strictEqual(res, expected, 'All occurrences must link as full 4-gram when firstOnly=false');
    });
});

describe('Adversarial Suite 4: Unselected Compound Phrase Shielding', () => {

    test('E4.1: Unchecked 4-gram shields entire phrase from checked 2-grams', () => {
        const engine = loadAppEngine();
        const text = 'उत्तर प्रदेश विधान सभा का सत्र आरंभ हुआ। अन्यत्र विधान सभा की चर्चा हुई।';
        const suggestions = [
            { term: 'उत्तर प्रदेश विधान सभा', checked: false },
            { term: 'विधान सभा', checked: true },
            { term: 'उत्तर प्रदेश', checked: true }
        ];

        const res = applySuggestions(engine, text, suggestions, true);

        // In clause 1: "उत्तर प्रदेश विधान सभा" was unchecked -> must remain completely plain
        // Neither "विधान सभा" nor "उत्तर प्रदेश" may carve into it
        assert.ok(res.startsWith('उत्तर प्रदेश विधान सभा का सत्र आरंभ हुआ।'), 'Unchecked 4-gram must remain intact plain text');
        assert.strictEqual(res.includes('उत्तर प्रदेश [[विधान सभा]] का सत्र'), false, 'Sub-compound must NOT carve into unchecked 4-gram');
        assert.strictEqual(res.includes('[[उत्तर प्रदेश]] विधान सभा का सत्र'), false, 'Prefix must NOT carve into unchecked 4-gram');

        // In clause 2: standalone "विधान सभा" outside the 4-gram links cleanly
        assert.ok(res.includes('अन्यत्र [[विधान सभा]] की चर्चा हुई।'), 'Independent 2-gram outside unchecked compound links cleanly');
    });

    test('E4.2: Unchecked 2-gram shields phrase from checked 1-gram sub-words', () => {
        const engine = loadAppEngine();
        const text = 'ग्राम पंचायत द्वारा विकास कार्य हुआ। इस ग्राम में सुख-शांति है।';
        const suggestions = [
            { term: 'ग्राम पंचायत', checked: false },
            { term: 'ग्राम', checked: true }
        ];

        const res = applySuggestions(engine, text, suggestions, true);

        // "ग्राम पंचायत" must stay completely plain, "ग्राम" must not carve into it
        assert.ok(res.startsWith('ग्राम पंचायत द्वारा विकास कार्य हुआ।'), 'Unchecked 2-gram must remain plain');
        assert.strictEqual(res.includes('[[ग्राम]] पंचायत'), false, '1-gram must not carve into unchecked 2-gram');

        // Standalone "ग्राम" outside the compound links cleanly
        assert.ok(res.includes('इस [[ग्राम]] में सुख-शांति है।'), 'Independent 1-gram outside compound links cleanly');
    });

    test('E4.3: Multiple unchecked compounds interleaved with checked compounds', () => {
        const engine = loadAppEngine();
        const text = 'नगर निगम ने आदेश दिया जबकि जिला पंचायत ने सहमति दी तथा विधान सभा ने नियम बनाया।';
        const suggestions = [
            { term: 'नगर निगम', checked: false },
            { term: 'जिला पंचायत', checked: true },
            { term: 'विधान सभा', checked: false },
            { term: 'निगम', checked: true },
            { term: 'सभा', checked: true }
        ];

        const res = applySuggestions(engine, text, suggestions, true);

        // "नगर निगम" (unchecked): plain, no [[निगम]]
        assert.ok(res.includes('नगर निगम ने आदेश दिया'), 'Unchecked "नगर निगम" remains plain');
        assert.strictEqual(res.includes('नगर [[निगम]]'), false);

        // "जिला पंचायत" (checked): linked
        assert.ok(res.includes('जबकि [[जिला पंचायत]] ने सहमति दी'), 'Checked "जिला पंचायत" links');

        // "विधान सभा" (unchecked): plain, no [[सभा]]
        assert.ok(res.includes('तथा विधान सभा ने नियम बनाया।'), 'Unchecked "विधान सभा" remains plain');
        assert.strictEqual(res.includes('विधान [[सभा]]'), false);
    });

    test('E4.4: All suggestions unchecked produces 100% byte-identical original text', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने भारत का संविधान तैयार किया। राज्य सभा एक उच्च सदन है।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: false },
            { term: 'संविधान सभा', checked: false },
            { term: 'राज्य सभा', checked: false },
            { term: 'संविधान', checked: false },
            { term: 'भारत', checked: false },
            { term: 'सभा', checked: false }
        ];

        const res = applySuggestions(engine, text, suggestions, true);
        assert.strictEqual(res, text, 'When all suggestions are unchecked, text must be verbatim identical to input');
        assert.strictEqual(/PROTECTED_|⟪|⟫|〘|〙|⟬|⟭|[\x01\x02]/.test(res), false, 'Zero token residue');
    });
});
