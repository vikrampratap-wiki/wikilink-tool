/**
 * tests/challenger_m2_rep_stress.test.js
 * Comprehensive Adversarial Probe by Challenger 1 Replacement (Milestone M2: core_engine)
 *
 * Probe 1: Compound Terms Shielding & Civic Terms Allowlist
 * Probe 2: Link Inflation Count vs Duplicate & Piped Links
 * Probe 3: Multi-Level Nested Templates (5+ layers) & Zero Token Leakage
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppEngine, protect, unprotect, applySuggestions } = require('./harness.js');

describe('Probe 1: Adversarial Stress of Compound Terms (R1)', () => {

    test('P1.1: Exact prompt case "भारतीय संविधान सभा ने भारत का संविधान तैयार किया।" with all constituents checked', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने भारत का संविधान तैयार किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true },
            { term: 'संविधान सभा', checked: true },
            { term: 'संविधान', checked: true },
            { term: 'भारत', checked: true },
            { term: 'भारतीय', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);

        // Assert "भारतीय संविधान सभा" is never fragmented into sub-words
        assert.ok(res.includes('[[भारतीय संविधान सभा]]'), 'Must link whole 3-word compound');
        assert.strictEqual(res.includes('[[भारतीय]] संविधान सभा'), false, 'Must not link sub-word भारतीय inside compound');
        assert.strictEqual(res.includes('भारतीय [[संविधान]] सभा'), false, 'Must not link sub-word संविधान inside compound');
        assert.strictEqual(res.includes('भारतीय संविधान [[सभा]]'), false, 'Must not link sub-word सभा inside compound');
        assert.strictEqual(res.includes('[[भारतीय [[संविधान सभा]]'), false, 'Must not produce nested wikilinks');

        // External independent occurrences must be linked cleanly
        assert.ok(res.includes('ने [[भारत]] का [[संविधान]] तैयार किया'), 'Independent occurrences outside compound link cleanly');
    });

    test('P1.2: Prompt case with compound UNCHECKED leaves text verbatim plain and shields sub-words', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने भारत का संविधान तैयार किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: false },
            { term: 'संविधान सभा', checked: false },
            { term: 'संविधान', checked: true },
            { term: 'भारत', checked: true },
            { term: 'भारतीय', checked: true },
            { term: 'सभा', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);

        // Unchecked compound MUST remain plain text, and inner words must NOT carve into it
        assert.strictEqual(res.includes('[[भारतीय संविधान सभा]]'), false, 'Unchecked compound must not link');
        assert.strictEqual(res.includes('भारतीय [[संविधान]] सभा'), false, 'Subword संविधान must not carve into unchecked compound');
        assert.strictEqual(res.includes('[[भारतीय]] संविधान सभा'), false, 'Subword भारतीय must not carve into unchecked compound');
        assert.strictEqual(res.includes('भारतीय संविधान [[सभा]]'), false, 'Subword सभा must not carve into unchecked compound');
        assert.ok(res.startsWith('भारतीय संविधान सभा ने'), 'Compound prefix must stay verbatim plain');

        // External independent words outside the compound still link
        assert.ok(res.includes('ने [[भारत]] का [[संविधान]] तैयार किया'), 'Outside occurrences link normally');
    });

    test('P1.3: Punctuation, casing, brackets, and symbol variations around "भारतीय संविधान सभा"', () => {
        const engine = loadAppEngine();
        const variations = [
            '«भारतीय संविधान सभा» ने भारत का संविधान तैयार किया।',
            '"भारतीय संविधान सभा" ने भारत का संविधान तैयार किया।',
            '\'भारतीय संविधान सभा\' ने भारत का संविधान तैयार किया।',
            '(भारतीय संविधान सभा) ने भारत का संविधान तैयार किया।',
            '[भारतीय संविधान सभा] ने भारत का संविधान तैयार किया।',
            'भारतीय संविधान सभा! ने भारत का संविधान तैयार किया।',
            'भारतीय संविधान सभा? ने भारत का संविधान तैयार किया।',
            'भारतीय संविधान सभा, ने भारत का संविधान तैयार किया।',
            'भारतीय संविधान सभा: ने भारत का संविधान तैयार किया।',
            'भारतीय संविधान सभा; ने भारत का संविधान तैयार किया।',
            'भारतीय संविधान सभा - ने भारत का संविधान तैयार किया।',
            'भारतीय संविधान सभा—ने भारत का संविधान तैयार किया।',
            '\nभारतीय संविधान सभा\nने भारत का संविधान तैयार किया।',
            'भारतीय संविधान सभा। ने भारत का संविधान तैयार किया।'
        ];

        for (const input of variations) {
            const suggestions = [
                { term: 'भारतीय संविधान सभा', checked: true },
                { term: 'संविधान', checked: true },
                { term: 'सभा', checked: true },
                { term: 'भारत', checked: true }
            ];
            const res = applySuggestions(engine, input, suggestions, true);

            assert.ok(res.includes('[[भारतीय संविधान सभा]]'), `Failed to link compound with punctuation in: ${input}`);
            assert.strictEqual(res.includes('[[संविधान]] सभा'), false, `Sub-word carved into compound in: ${input}`);
            assert.strictEqual(res.includes('भारतीय [[संविधान]]'), false, `Sub-word carved into compound in: ${input}`);
            assert.strictEqual(res.includes('संविधान [[सभा]]'), false, `Sub-word carved into compound in: ${input}`);
        }
    });

    test('P1.4: Civic terms allowlist: "राज्य सभा", "विधान सभा", "नगर निगम", "ग्राम पंचायत"', () => {
        const engine = loadAppEngine();
        const civicTerms = [
            'राज्य सभा',
            'विधान सभा',
            'नगर निगम',
            'ग्राम पंचायत',
            'विधान परिषद',
            'नगर पालिका',
            'जिला पंचायत'
        ];

        for (const term of civicTerms) {
            const words = term.split(/\s+/).length;
            const valid = engine.exports.isValidCandidate(term, words, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
            assert.strictEqual(valid, true, `Civic term "${term}" must be valid candidate`);
        }
    });

    test('P1.5: Standalone civic words "राज्य", "सभा", "विधान", "नगर", "निगम", "ग्राम", "पंचायत" rejected as non-linkable', () => {
        const engine = loadAppEngine();
        const standaloneCivic = [
            'राज्य',
            'सभा',
            'विधान',
            'नगर',
            'निगम',
            'ग्राम',
            'पंचायत'
        ];

        for (const word of standaloneCivic) {
            const isNonLinkable = engine.exports.isNonLinkableWord(word, 'hi');
            assert.strictEqual(isNonLinkable, true, `Standalone word "${word}" must be non-linkable common word`);

            const valid = engine.exports.isValidCandidate(word, 1, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
            assert.strictEqual(valid, false, `Standalone word "${word}" must be rejected by isValidCandidate`);
        }
    });

    test('P1.6: Candidate extraction and simulation recognizes civic compounds', () => {
        const engine = loadAppEngine();
        const text = 'राज्य सभा और विधान सभा संवैधानिक निकाय हैं। नगर निगम और ग्राम पंचायत स्थानीय शासन संभालते हैं।';
        const sim = engine.exports.simulateWikitextLinking(text, { lang: 'hi', enableBlacklist: true });

        const acceptedTokens = sim.decisions.filter(d => d.outcome === 'ACCEPTED').map(d => d.token);
        const rejectedTokens = sim.decisions.filter(d => d.outcome === 'REJECTED').map(d => d.token);

        assert.ok(acceptedTokens.includes('राज्य सभा'), 'Should accept compound राज्य सभा');
        assert.ok(acceptedTokens.includes('विधान सभा'), 'Should accept compound विधान सभा');
        assert.ok(acceptedTokens.includes('नगर निगम'), 'Should accept compound नगर निगम');
        assert.ok(acceptedTokens.includes('ग्राम पंचायत'), 'Should accept compound ग्राम पंचायत');

        // Standalone common words must be rejected or not accepted
        assert.strictEqual(acceptedTokens.includes('राज्य'), false, 'Should not accept standalone राज्य');
        assert.strictEqual(acceptedTokens.includes('सभा'), false, 'Should not accept standalone सभा');
        assert.strictEqual(acceptedTokens.includes('विधान'), false, 'Should not accept standalone विधान');
        assert.strictEqual(acceptedTokens.includes('नगर'), false, 'Should not accept standalone नगर');
        assert.strictEqual(acceptedTokens.includes('निगम'), false, 'Should not accept standalone निगम');
        assert.strictEqual(acceptedTokens.includes('ग्राम'), false, 'Should not accept standalone ग्राम');
        assert.strictEqual(acceptedTokens.includes('पंचायत'), false, 'Should not accept standalone पंचायत');
    });
});

describe('Probe 2: Adversarial Stress of Link Density & Inflation (R3)', () => {

    test('P2.1: 10 duplicate links [[भारत]] -> existingLinksCount === 10 (not 1)', () => {
        const engine = loadAppEngine();
        const text = Array(10).fill('[[भारत]]').join(' ');
        const res = protect(engine, text);

        assert.strictEqual(res.existingLinksCount, 10, '10 duplicate links must result in existingLinksCount === 10');
        assert.strictEqual(engine.exports.state.existingLinksCount, 10, 'state.existingLinksCount must also be 10');
    });

    test('P2.2: 5 piped links [[भारत|भारतीय गणराज्य]] -> existingLinksCount === 5 (not 10)', () => {
        const engine = loadAppEngine();
        const text = Array(5).fill('[[भारत|भारतीय गणराज्य]]').join(' ');
        const res = protect(engine, text);

        assert.strictEqual(res.existingLinksCount, 5, '5 piped links must result in existingLinksCount === 5');
        assert.strictEqual(engine.exports.state.existingLinksCount, 5, 'state.existingLinksCount must also be 5');
    });

    test('P2.3: Mixed duplicate and piped links stress test', () => {
        const engine = loadAppEngine();
        const links = [
            '[[भारत]]', '[[भारत]]', '[[भारत]]',
            '[[भारत|भारतीय संघ]]', '[[भारत|भारतीय गणराज्य]]',
            '[[उत्तर प्रदेश]]', '[[उत्तर प्रदेश|यू पी]]',
            '[[गंगा|पवित्र गंगा]]', '[[यमुना]]', '[[हिमालय]]'
        ];
        const text = links.join('\n');
        const res = protect(engine, text);

        assert.strictEqual(res.existingLinksCount, 10, '10 link occurrences must yield existingLinksCount === 10');
    });

    test('P2.4: calculateDensity boundary & stress cases', () => {
        const engine = loadAppEngine();
        const calc = engine.exports.calculateDensity;

        assert.strictEqual(calc(10, 100), 10.0, '10 links in 100 words = 10.0%');
        assert.strictEqual(calc(5, 100), 5.0, '5 links in 100 words = 5.0%');
        assert.strictEqual(calc(0, 100), 0.0, '0 links in 100 words = 0.0%');
        assert.strictEqual(calc(10, 0), 0.0, '0 words returns 0.0');
        assert.strictEqual(calc(10, -10), 0.0, 'Negative words returns 0.0');
        assert.strictEqual(calc(-5, 100), 0.0, 'Negative links returns 0.0');
        assert.strictEqual(calc(NaN, 100), 0.0);
        assert.strictEqual(calc(10, NaN), 0.0);
        assert.strictEqual(calc(null, undefined), 0.0);
    });
});

describe('Probe 3: Adversarial Stress of Multi-Level Nested Templates (R5)', () => {

    test('P3.1: 5-level deep template nesting restores verbatim with zero leaked tokens', () => {
        const engine = loadAppEngine();
        const text = '{{Level1|arg1={{Level2|arg2={{Level3|arg3={{Level4|arg4={{Level5|arg5=DeepestValue}}}}}}}}}}';
        const res = protect(engine, text);
        const restored = unprotect(engine, res);

        assert.strictEqual(restored, text, '5-level nested template must restore exactly verbatim');
        assert.strictEqual(/PROTECTED_/.test(restored), false, 'Zero PROTECTED_ tokens allowed in restored output');
        assert.strictEqual(/⟪\d+⟫/.test(restored), false, 'Zero ⟪...⟫ placeholders allowed in restored output');
        assert.strictEqual(/[\x01\x02]/.test(restored), false, 'Zero control characters allowed in restored output');
    });

    test('P3.2: 8-level deep template nesting restores verbatim', () => {
        const engine = loadAppEngine();
        let text = 'core_content';
        for (let i = 8; i >= 1; i--) {
            text = `{{T${i}|param=${text}}}`;
        }
        const res = protect(engine, text);
        const restored = unprotect(engine, res);

        assert.strictEqual(restored, text, '8-level nested template must restore verbatim');
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false);
    });

    test('P3.3: Branching complex templates with newlines, tables, and references', () => {
        const engine = loadAppEngine();
        const text = `{{सूचनासन्दूक भारत
| नाम = {{साँचा_नाम|हिन्दी=भारत|अंग्रेज़ी=India}}
| संसद = {{साँचा_संसद|उच्च_सदन=[[राज्य सभा]]|निम्न_सदन=[[लोक सभा]]}}
| न्यायपालिका = {{साँचा_न्यायालय|सर्वोच्च=[[सर्वोच्च न्यायालय]]}}
| सन्दर्भ = {{cite web|url=https://example.com|title={{शीर्षक|भाषा=hi|मूल=भारत}}}}
}}
{| class="wikitable"
! राज्य !! राजधानी
|-
| [[उत्तर प्रदेश]] || लखनऊ
|}
<ref>{{cite book|author=गांधी|title=सत्य के प्रयोग}}</ref>`;

        const res = protect(engine, text);
        const restored = unprotect(engine, res);

        assert.strictEqual(restored, text, 'Complex wikitext structure must restore byte-for-byte');
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false);
    });

    test('P3.4: 25 recursive template nesting layers restore verbatim', () => {
        const engine = loadAppEngine();
        let text = 'inner';
        for (let i = 25; i >= 1; i--) {
            text = `{{N${i}|val=${text}}}`;
        }
        const res = protect(engine, text);
        const restored = unprotect(engine, res);

        assert.strictEqual(restored, text, '25-level nested template restores cleanly');
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false);
    });
});
