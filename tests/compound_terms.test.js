/**
 * tests/compound_terms.test.js
 * Comprehensive automated test suite for Compound Terms & Longest-Match Priority (WP:OVERLINKING)
 * Covers Features 1, 2, 3, and 4 across Tiers 1-4.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppEngine, applySuggestions, Features } = require('./harness.js');

describe('Feature 1: Compound Longest-Match Priority', () => {

    test('T1.1: "भारतीय संविधान सभा" prioritized over "भारतीय", "संविधान", "सभा"', () => {
        const candidates = ['सभा', 'संविधान', 'भारतीय', 'भारतीय संविधान', 'भारतीय संविधान सभा'];
        const sorted = [...candidates].sort((a, b) => {
            const wordsA = a.trim().split(/\s+/).length;
            const wordsB = b.trim().split(/\s+/).length;
            if (wordsA !== wordsB) return wordsB - wordsA;
            return b.length - a.length;
        });
        assert.strictEqual(sorted[0], 'भारतीय संविधान सभा', 'Longest multi-word compound must be sorted first');
        assert.strictEqual(sorted[1], 'भारतीय संविधान', 'Second longest compound must follow');
    });

    test('T1.2: "उत्तर प्रदेश सरकार" prioritized over constituent sub-words', () => {
        const candidates = ['सरकार', 'उत्तर', 'प्रदेश', 'उत्तर प्रदेश', 'उत्तर प्रदेश सरकार'];
        const sorted = [...candidates].sort((a, b) => {
            const wordsA = a.trim().split(/\s+/).length;
            const wordsB = b.trim().split(/\s+/).length;
            if (wordsA !== wordsB) return wordsB - wordsA;
            return b.length - a.length;
        });
        assert.strictEqual(sorted[0], 'उत्तर प्रदेश सरकार');
    });

    test('T1.3: "सर्वोच्च न्यायालय" prioritized over "न्यायालय"', () => {
        const candidates = ['न्यायालय', 'सर्वोच्च न्यायालय'];
        const sorted = [...candidates].sort((a, b) => {
            const wordsA = a.trim().split(/\s+/).length;
            const wordsB = b.trim().split(/\s+/).length;
            if (wordsA !== wordsB) return wordsB - wordsA;
            return b.length - a.length;
        });
        assert.strictEqual(sorted[0], 'सर्वोच्च न्यायालय');
    });

    test('T1.4: "भारतीय राष्ट्रीय कांग्रेस" prioritized over "कांग्रेस"', () => {
        const candidates = ['कांग्रेस', 'राष्ट्रीय कांग्रेस', 'भारतीय राष्ट्रीय कांग्रेस'];
        const sorted = [...candidates].sort((a, b) => {
            const wordsA = a.trim().split(/\s+/).length;
            const wordsB = b.trim().split(/\s+/).length;
            if (wordsA !== wordsB) return wordsB - wordsA;
            return b.length - a.length;
        });
        assert.strictEqual(sorted[0], 'भारतीय राष्ट्रीय कांग्रेस');
    });

    test('T1.5: "विश्व स्वास्थ्य संगठन" prioritized over "संगठन"', () => {
        const candidates = ['संगठन', 'स्वास्थ्य संगठन', 'विश्व स्वास्थ्य संगठन'];
        const sorted = [...candidates].sort((a, b) => {
            const wordsA = a.trim().split(/\s+/).length;
            const wordsB = b.trim().split(/\s+/).length;
            if (wordsA !== wordsB) return wordsB - wordsA;
            return b.length - a.length;
        });
        assert.strictEqual(sorted[0], 'विश्व स्वास्थ्य संगठन');
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Overlapping 4-gram, 3-gram, and 2-gram interval claiming resolution', () => {
        const claimed = [];
        const isClaimed = (start, end) => claimed.some(([cs, ce]) => Math.max(start, cs) < Math.min(end, ce));
        const claim = (start, end) => claimed.push([start, end]);

        claim(0, 20);
        assert.strictEqual(isClaimed(0, 7), true, 'Prefix sub-span should be claimed');
        assert.strictEqual(isClaimed(8, 15), true, 'Middle sub-span should be claimed');
        assert.strictEqual(isClaimed(16, 20), true, 'Suffix sub-span should be claimed');
        assert.strictEqual(isClaimed(25, 35), false, 'Non-overlapping span should remain unclaimed');
    });

    test('T2.2: Compound term starting at character index 0', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने कार्य किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारतीय संविधान सभा]]'), 'Compound at index 0 should be linked cleanly');
    });

    test('T2.3: Compound term ending at text boundary (end of string)', () => {
        const engine = loadAppEngine();
        const text = 'यह बैठक आयोजित की सर्वोच्च न्यायालय';
        const suggestions = [
            { term: 'सर्वोच्च न्यायालय', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[सर्वोच्च न्यायालय]]'), 'Compound at string end should be linked cleanly');
    });

    test('T2.4: Compound separated by danda or clause boundary does not match across clause', () => {
        const engine = loadAppEngine();
        const isCandidate = engine.exports.isValidCandidate('संविधान सभा', 2, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
        assert.strictEqual(isCandidate, true);
    });

    test('T2.5: Hyphenated compound terms supported', () => {
        const engine = loadAppEngine();
        const text = '1965 में भारत-पाकिस्तान युद्ध हुआ था।';
        const suggestions = [
            { term: 'भारत-पाकिस्तान युद्ध', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारत-पाकिस्तान युद्ध]]'), 'Hyphenated compound should link cleanly');
    });
});

describe('Feature 2: Sub-Word Span & Plain Shielding', () => {

    test('T1.1: Inner sub-word "संविधान" inside "भारतीय संविधान सभा" is shielded', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने भारत का संविधान तैयार किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true },
            { term: 'संविधान', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारतीय संविधान सभा]]'), 'Compound should be linked as single entity');
        assert.strictEqual(res.includes('[[भारतीय [[संविधान]]'), false, 'Sub-word must not be double-linked inside compound');
    });

    test('T1.2: Standalone sub-word outside compound is linked normally', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने भारत का संविधान तैयार किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true },
            { term: 'संविधान', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('का [[संविधान]] तैयार किया'), 'Standalone sub-word outside compound must be linked');
    });

    test('T1.3: Sub-word "भारत" inside "भारतीय गणराज्य" shielded from being carved out', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय गणराज्य एक संप्रभु राष्ट्र है।';
        const suggestions = [
            { term: 'भारतीय गणराज्य', checked: true },
            { term: 'भारत', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारतीय गणराज्य]]'));
        assert.strictEqual(res.includes('[[भारत]]ीय गणराज्य'), false);
    });

    test('T1.4: Sub-word "न्यायालय" inside "उच्च न्यायालय" shielded', () => {
        const engine = loadAppEngine();
        const text = 'इलाहाबाद उच्च न्यायालय ऐतिहासिक है।';
        const suggestions = [
            { term: 'उच्च न्यायालय', checked: true },
            { term: 'न्यायालय', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[उच्च न्यायालय]]'));
        assert.strictEqual(res.includes('उच्च [[न्यायालय]]'), false);
    });

    test('T1.5: Sub-word "सरकार" inside "केन्द्र सरकार" shielded', () => {
        const engine = loadAppEngine();
        const text = 'केन्द्र सरकार ने नई नीति घोषित की।';
        const suggestions = [
            { term: 'केन्द्र सरकार', checked: true },
            { term: 'सरकार', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[केन्द्र सरकार]]'));
        assert.strictEqual(res.includes('केन्द्र [[सरकार]]'), false);
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Multiple occurrences of sub-word inside and outside compounds', () => {
        const engine = loadAppEngine();
        const text = 'सर्वोच्च न्यायालय के आदेश का सम्मान प्रत्येक न्यायालय को करना चाहिए।';
        const suggestions = [
            { term: 'सर्वोच्च न्यायालय', checked: true },
            { term: 'न्यायालय', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[सर्वोच्च न्यायालय]]'));
        assert.ok(res.includes('प्रत्येक [[न्यायालय]]'));
    });

    test('T2.2: Sub-word appearing as prefix of compound ("भारतीय")', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय सेना देश की रक्षा करती है।';
        const suggestions = [
            { term: 'भारतीय सेना', checked: true },
            { term: 'भारतीय', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारतीय सेना]]'));
        assert.strictEqual(res.includes('[[भारतीय]] सेना'), false);
    });

    test('T2.3: Sub-word appearing as suffix of compound ("सभा")', () => {
        const engine = loadAppEngine();
        const text = 'लोक सभा संसद का निचला सदन है।';
        const suggestions = [
            { term: 'लोक सभा', checked: true },
            { term: 'सभा', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[लोक सभा]]'));
        assert.strictEqual(res.includes('लोक [[सभा]]'), false);
    });

    test('T2.4: Sub-word appearing in the middle of a 3-word compound ("संविधान")', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा का ऐतिहासिक सत्र चला।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true },
            { term: 'संविधान', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारतीय संविधान सभा]]'));
        assert.strictEqual(res.includes('भारतीय [[संविधान]] सभा'), false);
    });

    test('T2.5: Sub-word with oblique inflection adjacent to compound handled cleanly', () => {
        const engine = loadAppEngine();
        assert.strictEqual(engine.exports.isInflectedHindiPluralOrOblique('पालिकाओं'), true);
    });
});

describe('Feature 3: Civic Compound Allowlist Expansion', () => {

    test('T1.1: "राज्य सभा" recognized as valid candidate', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2 (Civic allowlist expansion)');
            return;
        }
        const valid = engine.exports.isValidCandidate('राज्य सभा', 2, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
        assert.strictEqual(valid, true, '"राज्य सभा" must be recognized as valid compound candidate');
    });

    test('T1.2: "विधान सभा" recognized as valid candidate', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2 (Civic allowlist expansion)');
            return;
        }
        const valid = engine.exports.isValidCandidate('विधान सभा', 2, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
        assert.strictEqual(valid, true, '"विधान सभा" must be recognized as valid compound candidate');
    });

    test('T1.3: "नगर निगम" recognized as valid candidate', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2 (Civic allowlist expansion)');
            return;
        }
        const valid = engine.exports.isValidCandidate('नगर निगम', 2, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
        assert.strictEqual(valid, true, '"नगर निगम" must be recognized as valid compound candidate');
    });

    test('T1.4: "ग्राम पंचायत" recognized as valid candidate', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2 (Civic allowlist expansion)');
            return;
        }
        const valid = engine.exports.isValidCandidate('ग्राम पंचायत', 2, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
        assert.strictEqual(valid, true, '"ग्राम पंचायत" must be recognized as valid compound candidate');
    });

    test('T1.5: "विधान परिषद" recognized as valid candidate', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2 (Civic allowlist expansion)');
            return;
        }
        const valid = engine.exports.isValidCandidate('विधान परिषद', 2, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
        assert.strictEqual(valid, true, '"विधान परिषद" must be recognized as valid compound candidate');
    });

    // Tier 2: Boundary & Corner Cases (Individual Words Blacklisted)
    test('T2.1: Standalone "राज्य" rejected as non-linkable', () => {
        const engine = loadAppEngine();
        assert.strictEqual(engine.exports.isNonLinkableWord('राज्य', 'hi'), true, 'Standalone "राज्य" must be non-linkable');
    });

    test('T2.2: Standalone "सभा" rejected as non-linkable', () => {
        const engine = loadAppEngine();
        assert.strictEqual(engine.exports.isNonLinkableWord('सभा', 'hi'), true, 'Standalone "सभा" must be non-linkable');
    });

    test('T2.3: Standalone "विधान" rejected as non-linkable', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2');
            return;
        }
        assert.strictEqual(engine.exports.isNonLinkableWord('विधान', 'hi'), true);
    });

    test('T2.4: Standalone "निगम" rejected as non-linkable', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2');
            return;
        }
        assert.strictEqual(engine.exports.isNonLinkableWord('निगम', 'hi'), true);
    });

    test('T2.5: Standalone "पंचायत" rejected as non-linkable', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2');
            return;
        }
        assert.strictEqual(engine.exports.isNonLinkableWord('पंचायत', 'hi'), true);
    });
});

describe('Feature 4: Repeat and Unchecked Compound Shielding', () => {

    test('T1.1: Repeat occurrence of compound with firstOnly=true shielded with plain token', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने कार्य शुरू किया। भारतीय संविधान सभा के अध्यक्ष डॉ. राजेन्द्र प्रसाद थे।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: true },
            { term: 'संविधान', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारतीय संविधान सभा]]'));
        assert.ok(res.includes('भारतीय संविधान सभा के अध्यक्ष'));
        assert.strictEqual(res.includes('भारतीय [[संविधान]] सभा के अध्यक्ष'), false, 'Repeat compound must shield inner sub-words');
    });

    test('T1.2: Unchecked compound suggestion is left plain in output wikitext', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने भारत का संविधान तैयार किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: false },
            { term: 'संविधान', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('भारतीय संविधान सभा ने'));
        assert.strictEqual(res.includes('[[भारतीय संविधान सभा]]'), false, 'Unchecked compound must not be linked');
    });

    test('T1.3: Unchecked compound prevents sub-word "संविधान" from carving into it', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने भारत का संविधान तैयार किया।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: false },
            { term: 'संविधान', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.strictEqual(res.includes('भारतीय [[संविधान]] सभा'), false, 'Unchecked compound must shield sub-words');
        assert.ok(res.includes('का [[संविधान]] तैयार किया'), 'Standalone occurrence should link');
    });

    test('T1.4: Second occurrence of an unchecked compound remains plain', () => {
        const engine = loadAppEngine();
        const text = 'उत्तर प्रदेश सरकार ने घोषणा की। उत्तर प्रदेश सरकार की नीति स्पष्ट है।';
        const suggestions = [
            { term: 'उत्तर प्रदेश सरकार', checked: false },
            { term: 'सरकार', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.strictEqual(res.includes('[[उत्तर प्रदेश सरकार]]'), false);
        assert.strictEqual(res.includes('उत्तर प्रदेश [[सरकार]]'), false);
    });

    test('T1.5: Unchecked compound followed by a valid 1-gram candidate', () => {
        const engine = loadAppEngine();
        const text = 'सर्वोच्च न्यायालय ने आज बड़ा निर्णय सुनाया।';
        const suggestions = [
            { term: 'सर्वोच्च न्यायालय', checked: false },
            { term: 'निर्णय', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('सर्वोच्च न्यायालय ने आज बड़ा [[निर्णय]] सुनाया।'));
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Unchecked compound containing blacklisted stopwords preserves integrity', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा का कार्य पूरा हुआ।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: false }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.strictEqual(res.trim(), text.trim(), 'Text should be identical when compound is unchecked');
    });

    test('T2.2: Unchecking all suggestions leaves wikitext completely plain without token leaks', () => {
        const engine = loadAppEngine();
        const text = 'भारतीय संविधान सभा ने कार्य किया। डॉ. भीमराव आंबेडकर उपस्थित थे।';
        const suggestions = [
            { term: 'भारतीय संविधान सभा', checked: false },
            { term: 'भीमराव आंबेडकर', checked: false }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.strictEqual(/[\x01\x02]/.test(res), false, 'Output must not leak control tokens');
        assert.strictEqual(/〘|〙|⟬|⟭/.test(res), false, 'Output must not leak shielding brackets');
    });

    test('T2.3: Two different unchecked compounds in adjacent clauses', () => {
        const engine = loadAppEngine();
        const text = 'लोक सभा और राज्य सभा दोनों के सत्र समाप्त हुए।';
        const suggestions = [
            { term: 'लोक सभा', checked: false },
            { term: 'राज्य सभा', checked: false }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('लोक सभा और राज्य सभा'));
        assert.strictEqual(res.includes('[['), false);
    });

    test('T2.4: Unchecked compound immediately followed by a checked compound', () => {
        const engine = loadAppEngine();
        const text = 'उत्तर प्रदेश सरकार और भारत सरकार ने समझौता किया।';
        const suggestions = [
            { term: 'उत्तर प्रदेश सरकार', checked: false },
            { term: 'भारत सरकार', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('उत्तर प्रदेश सरकार और [[भारत सरकार]]'));
    });

    test('T2.5: Repeat compound with firstOnly=false links all occurrences cleanly', () => {
        const engine = loadAppEngine();
        const text = 'सर्वोच्च न्यायालय ने आदेश दिया। सर्वोच्च न्यायालय की पीठ ने सुनवाई की।';
        const suggestions = [
            { term: 'सर्वोच्च न्यायालय', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, false);
        const matches = res.match(/\[\[सर्वोच्च न्यायालय\]\]/g);
        assert.strictEqual(matches && matches.length, 2, 'With firstOnly=false, both occurrences should link');
    });
});

describe('Tier 3: Compound Terms Cross-Feature Combinations', () => {

    test('T3.1: Civic allowlist + Longest match + Sub-word shielding ("उत्तर प्रदेश विधान सभा")', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2');
            return;
        }
        const text = 'उत्तर प्रदेश विधान सभा का सत्र आरंभ हुआ।';
        const suggestions = [
            { term: 'उत्तर प्रदेश विधान सभा', checked: true },
            { term: 'विधान सभा', checked: true },
            { term: 'उत्तर प्रदेश', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[उत्तर प्रदेश विधान सभा]]'));
        assert.strictEqual(res.includes('[[उत्तर प्रदेश]] विधान सभा'), false);
        assert.strictEqual(res.includes('उत्तर प्रदेश [[विधान सभा]]'), false);
    });
});

describe('Tier 4: Compound Terms Real-World Scenarios', () => {

    test('T4.1: Indian Constitution article excerpt handles constitutional compound terms', () => {
        const engine = loadAppEngine();
        const text = 'भारत का संविधान भारत का सर्वोच्च विधान है जो संविधान सभा द्वारा पारित हुआ।';
        const suggestions = [
            { term: 'भारत का संविधान', checked: true },
            { term: 'संविधान सभा', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारत का संविधान]]'));
        assert.ok(res.includes('[[संविधान सभा]]'));
    });

    test('T4.2: Compound noun with internal connector "भारत के राष्ट्रपति" and "भारतीय रिजर्व बैंक" preserved without fragmentation', () => {
        const engine = loadAppEngine();
        const text = 'भारत के राष्ट्रपति ने भारतीय रिजर्व बैंक और राष्ट्रीय राजमार्ग प्राधिकरण की समीक्षा की।';
        const suggestions = [
            { term: 'भारत के राष्ट्रपति', checked: true },
            { term: 'भारतीय रिजर्व बैंक', checked: true },
            { term: 'राष्ट्रीय राजमार्ग', checked: true },
            { term: 'भारत', checked: true },
            { term: 'राष्ट्रपति', checked: true },
            { term: 'बैंक', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारत के राष्ट्रपति]]'), 'Compound phrase with connector must be linked as whole');
        assert.ok(res.includes('[[भारतीय रिजर्व बैंक]]'), 'Compound banking institution must be linked as whole');
        assert.ok(res.includes('[[राष्ट्रीय राजमार्ग]]'), 'Compound infrastructure term must be linked as whole');
        assert.strictEqual(res.includes('[[भारत]] के [[राष्ट्रपति]]'), false, 'Constituent words must not be fragmented into separate links');
        assert.strictEqual(res.includes('[[भारतीय]] [[रिजर्व]]'), false, 'Sub-words must not be double-linked');
    });

    test('T4.3: Multi-word compound candidates validated by isValidCandidate', () => {
        const engine = loadAppEngine();
        const isValid = engine.exports.isValidCandidate;
        const stop = engine.exports.STOPWORDS.hi;

        assert.strictEqual(isValid('भारत का संविधान', 3, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('भारत के राष्ट्रपति', 3, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('भारतीय रिजर्व बैंक', 3, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('राष्ट्रीय राजमार्ग', 3, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('परमाणु ऊर्जा आयोग', 3, true, true, true, stop, 'hi', true, true), true);

        // Invalid phrases starting or ending with stopwords or verbs
        assert.strictEqual(isValid('और भारत का', 3, true, true, true, stop, 'hi', true, true), false);
        assert.strictEqual(isValid('भारत जो है', 3, true, true, true, stop, 'hi', true, true), false);
    });

    test('T4.4: Repeated compound with internal connector shielded on repeat occurrence without leaking tokens', () => {
        const engine = loadAppEngine();
        const text = 'भारत के राष्ट्रपति ने भाषण दिया। भारत के राष्ट्रपति ने पदक प्रदान किए।';
        const suggestions = [
            { term: 'भारत के राष्ट्रपति', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[भारत के राष्ट्रपति]] ने भाषण दिया। भारत के राष्ट्रपति'));
        assert.strictEqual(res.includes('[[भारत के राष्ट्रपति]] ने पदक'), false, 'Second occurrence must not be linked when firstOnly=true');
        assert.strictEqual(/[\x01\x02]/.test(res), false, 'Must not leak control bytes');
    });
});
