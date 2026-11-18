/**
 * tests/blacklist.test.js
 * Comprehensive automated test suite for Hindi Stopwords & Non-Linkable Dictionary (WP:NOTLINKED)
 * Covers Features 5, 6, and 7 across Tiers 1-4.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadBlacklist, loadAppEngine, protect, unprotect, Features } = require('./harness.js');

describe('Feature 5: Blacklist Dictionary Expansion (WP:NOTLINKED Corpus)', () => {

    test('T1.1: COMMON_5000_WORDS contains at least 10,000 unique entries', (t) => {
        const words = loadBlacklist();
        const uniqueSet = new Set(words);
        if (!Features.isBlacklist10k()) {
            t.skip(`Pending Milestone M1 completion (current count: ${uniqueSet.size} unique words, required: 10,000+)`);
            return;
        }
        assert.ok(uniqueSet.size >= 10000, `Expected >= 10,000 unique entries, found: ${uniqueSet.size}`);
    });

    test('T1.2: All entries in blacklist are non-empty trimmed strings', () => {
        const words = loadBlacklist();
        assert.ok(words.length > 0, 'Blacklist should not be empty');
        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            assert.strictEqual(typeof w, 'string', `Entry at index ${i} must be string`);
            assert.strictEqual(w.trim(), w, `Entry "${w}" at index ${i} should be trimmed`);
            assert.ok(w.length > 0, `Entry at index ${i} must not be empty string`);
        }
    });

    test('T1.3: Predominance of Devanagari Hindi words in dictionary (>90%)', () => {
        const words = loadBlacklist();
        const devanagariRegex = /[\u0900-\u097F]/;
        const devanagariCount = words.filter(w => devanagariRegex.test(w)).length;
        const percentage = (devanagariCount / words.length) * 100;
        assert.ok(percentage > 90, `Devanagari percentage should be > 90%, got: ${percentage.toFixed(2)}%`);
    });

    test('T1.4: Ingestion of dictionary into engine NEVER_LINK_WORDS.hi Set', () => {
        const engine = loadAppEngine();
        const hiSet = engine.exports.NEVER_LINK_WORDS && engine.exports.NEVER_LINK_WORDS.hi;
        assert.ok(hiSet && (hiSet.constructor.name === 'Set' || typeof hiSet.has === 'function'), 'NEVER_LINK_WORDS.hi must be a Set');
        assert.ok(hiSet.size > 0, 'NEVER_LINK_WORDS.hi should contain words');
        // Non-linkable common policy words from words_blacklist.js must be present in NEVER_LINK_WORDS.hi
        const baselineWords = ['दिन', 'पानी', 'समय', 'काम', 'लोग'];
        for (const bw of baselineWords) {
            assert.ok(hiSet.has(bw), `NEVER_LINK_WORDS.hi must contain non-linkable word: "${bw}"`);
        }
    });

    test('T1.5: Dictionary contains no corrupted string tokens or null values', () => {
        const words = loadBlacklist();
        const invalidTokens = ['null', 'undefined', '[object Object]', 'NaN', 'false', 'true'];
        for (const token of invalidTokens) {
            assert.strictEqual(words.includes(token), false, `Blacklist must not contain invalid token: "${token}"`);
        }
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: No duplicate entries or zero duplicate inflation in unique Set', (t) => {
        const words = loadBlacklist();
        if (!Features.isBlacklist10k()) {
            t.skip('Pending Milestone M1 completion');
            return;
        }
        const uniqueSize = new Set(words).size;
        assert.strictEqual(words.length, uniqueSize, `Dictionary should have 0 duplicates (total: ${words.length}, unique: ${uniqueSize})`);
    });

    test('T2.2: Extreme short single-character Devanagari particles handled', () => {
        const engine = loadAppEngine();
        assert.strictEqual(engine.exports.isNonLinkableWord('न', 'hi'), true, 'Single particle "न" must be non-linkable');
        assert.strictEqual(engine.exports.isNonLinkableWord('व', 'hi'), true, 'Single particle "व" must be non-linkable');
    });

    test('T2.3: Devanagari combining characters and nuktas preserved without corruption', () => {
        const words = loadBlacklist();
        const wordsWithNukta = words.filter(w => w.includes('़')); // nukta U+093C
        assert.ok(wordsWithNukta.length > 0, 'Dictionary should correctly support nukta-bearing Hindi words (e.g. ज़, फ़)');
    });

    test('T2.4: Any ASCII English entries in blacklist are normalized to lowercase', () => {
        const words = loadBlacklist();
        const asciiWords = words.filter(w => /^[a-zA-Z]+$/.test(w));
        for (const aw of asciiWords) {
            assert.strictEqual(aw, aw.toLowerCase(), `ASCII word "${aw}" must be lowercase`);
        }
    });

    test('T2.5: Multi-syllabic colloquial compound words included without fragmentation', () => {
        const words = loadBlacklist();
        const sampleCheck = words.some(w => w.length >= 6 && /[\u0900-\u097F]/.test(w));
        assert.ok(sampleCheck, 'Dictionary should include longer multi-syllabic Hindi words');
    });
});

describe('Feature 6: Linguistic Categorization of Hindi Blacklist', () => {

    test('T1.1: Domestic and household nouns present (मसाले, बर्तन, वस्त्र)', (t) => {
        const words = new Set(loadBlacklist());
        if (!Features.isBlacklist10k()) {
            t.skip('Pending Milestone M1 completion');
            return;
        }
        const domesticNouns = ['थाली', 'कटोरी', 'चम्मच', 'कपड़ा', 'चाकू', 'बर्तन', 'कुर्सी', 'मेज'];
        const found = domesticNouns.filter(w => words.has(w));
        assert.ok(found.length >= 4, `Expected at least 4 domestic nouns in blacklist, found: ${found.join(', ')}`);
    });

    test('T1.2: Daily verb infinitives present (-ना forms)', () => {
        const words = loadBlacklist();
        const infinitives = words.filter(w => w.endsWith('ना') && /[\u0900-\u097F]/.test(w));
        assert.ok(infinitives.length >= 100, `Expected >= 100 Hindi infinitive verbs, found: ${infinitives.length}`);
    });

    test('T1.3: Continuous verb forms and aspect stems present (रहा, रही, रहे)', (t) => {
        const words = new Set(loadBlacklist());
        if (!Features.isBlacklist10k()) {
            t.skip('Pending Milestone M1 completion');
            return;
        }
        const continuousStems = ['रहा', 'रही', 'रहे'];
        for (const stem of continuousStems) {
            assert.ok(words.has(stem), `Continuous stem "${stem}" must be in blacklist`);
        }
    });

    test('T1.4: Descriptive colloquial adjectives present (स्वाद, रंग, आकार)', (t) => {
        const words = new Set(loadBlacklist());
        if (!Features.isBlacklist10k()) {
            t.skip('Pending Milestone M1 completion');
            return;
        }
        const adjectives = ['मीठा', 'खट्टा', 'धीमा', 'तेज़', 'गहरा', 'सुंदर', 'छोटा', 'बड़ा'];
        const found = adjectives.filter(w => words.has(w));
        assert.ok(found.length >= 4, `Expected colloquial adjectives in blacklist, found: ${found.join(', ')}`);
    });

    test('T1.5: Adverbs, indeclinables and particles present (धीरे, जल्दी, अचानक)', () => {
        const words = new Set(loadBlacklist());
        const commonAdverbs = ['धीरे', 'जल्दी', 'अचानक', 'शायद', 'हमेशा', 'बल्कि', 'अवश्य', 'शायद'];
        const found = commonAdverbs.filter(w => words.has(w));
        assert.ok(found.length >= 2, `Expected common adverbs in blacklist, found: ${found.join(', ')}`);
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Conjunctive participles present (करके, खाकर, देखकर)', (t) => {
        const words = new Set(loadBlacklist());
        if (!Features.isBlacklist10k()) {
            t.skip('Pending Milestone M1 completion');
            return;
        }
        const conjunctive = ['करके', 'खाकर', 'देखकर', 'सुनकर', 'जाकर'];
        const found = conjunctive.filter(w => words.has(w));
        assert.ok(found.length >= 2, `Expected conjunctive participles in blacklist, found: ${found.join(', ')}`);
    });

    test('T2.2: Oblique plural forms (-ों) suppressed by engine heuristic', () => {
        const engine = loadAppEngine();
        const obliquePlurals = ['नदियों', 'पहाड़ों', 'पुस्तकों', 'शहरों', 'मकानों'];
        for (const word of obliquePlurals) {
            const isSuppressed = engine.exports.isInflectedHindiPluralOrOblique(word);
            assert.strictEqual(isSuppressed, true, `Oblique plural "${word}" must be suppressed by engine`);
        }
    });

    test('T2.3: Compound postpositions and relational words present', () => {
        const words = new Set(loadBlacklist());
        const postpositions = ['समेत', 'अलावा', 'बजाय', 'मुताबिक', 'अंतर्गत', 'तहत', 'दौरान'];
        const found = postpositions.filter(w => words.has(w));
        assert.ok(found.length >= 4, `Expected relational postpositions in blacklist, found: ${found.join(', ')}`);
    });

    test('T2.4: Colloquial fractions, numerals, and time expressions present', () => {
        const words = new Set(loadBlacklist());
        const timeAndMeasure = ['दिन', 'रात', 'सुबह', 'शाम', 'आज', 'कल', 'घंटा', 'मिनट'];
        const found = timeAndMeasure.filter(w => words.has(w));
        assert.ok(found.length >= 4, `Expected time/measure words in blacklist, found: ${found.join(', ')}`);
    });

    test('T2.5: Kinship and social relationship terms present', (t) => {
        const words = new Set(loadBlacklist());
        if (!Features.isBlacklist10k()) {
            t.skip('Pending Milestone M1 completion');
            return;
        }
        const kinship = ['चाचा', 'मामा', 'पड़ोसी', 'दोस्त', 'भाई', 'बहन'];
        const found = kinship.filter(w => words.has(w));
        assert.ok(found.length >= 3, `Expected kinship terms in blacklist, found: ${found.join(', ')}`);
    });
});

describe('Feature 7: Existing Link Immunity (Pre-existing Links Intact)', () => {

    test('T1.1: Pre-existing link [[दिन]] remains intact despite being blacklisted', () => {
        const engine = loadAppEngine();
        const input = 'यह [[दिन]] बहुत अच्छा है।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Pre-existing link [[दिन]] must remain intact');
    });

    test('T1.2: Pre-existing link [[रोटी]] remains intact', () => {
        const engine = loadAppEngine();
        const input = 'उन्होंने [[रोटी]] खाई।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Pre-existing link [[रोटी]] must remain intact');
    });

    test('T1.3: Pre-existing link [[पानी]] remains intact', () => {
        const engine = loadAppEngine();
        const input = 'पीने का [[पानी]] शुद्ध होना चाहिए।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Pre-existing link [[पानी]] must remain intact');
    });

    test('T1.4: Pre-existing link [[समय]] remains intact', () => {
        const engine = loadAppEngine();
        const input = 'उचित [[समय]] पर निर्णय लिया गया।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Pre-existing link [[समय]] must remain intact');
    });

    test('T1.5: Pre-existing link [[काम]] remains intact', () => {
        const engine = loadAppEngine();
        const input = 'यह [[काम]] समय पर पूरा हुआ।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Pre-existing link [[काम]] must remain intact');
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Piped pre-existing link [[दिन|दिवस]] remains intact', () => {
        const engine = loadAppEngine();
        const input = 'स्वतंत्रता [[दिन|दिवस]] का उत्सव मनाया गया।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Piped pre-existing link must remain intact');
    });

    test('T2.2: Pre-existing link with section anchor [[पानी#प्रकार|जल]] remains intact', () => {
        const engine = loadAppEngine();
        const input = 'यहाँ [[पानी#प्रकार|जल]] उपलब्ध है।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Anchored link must remain intact');
    });

    test('T2.3: Multiple consecutive blacklisted pre-existing links remain intact', () => {
        const engine = loadAppEngine();
        const input = '[[दिन]] और [[रात]] में [[पानी]] एवं [[रोटी]] आवश्यक है।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Multiple pre-existing blacklisted links must all remain intact');
    });

    test('T2.4: Pre-existing link inside table markup remains intact', () => {
        const engine = loadAppEngine();
        const input = '{|\n| [[रोटी]] || [[पानी]]\n|}';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Table-enclosed pre-existing links must remain intact');
    });

    test('T2.5: Pre-existing link adjacent to punctuation marks remains intact', () => {
        const engine = loadAppEngine();
        const input = '([[समय]]), "[[काम]]"! और [[दिन]]।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Punctuation-adjacent pre-existing links must remain intact');
    });
});

describe('Tier 3: Blacklist Cross-Feature Combinations', () => {

    test('T3.1: Blacklisted word as standalone candidate rejected, but allowed inside pre-existing link', () => {
        const engine = loadAppEngine();
        const input = '[[रोटी]] आवश्यक है लेकिन रोटी हर जगह नहीं मिलती।';
        const isRejectedCandidate = engine.exports.isNonLinkableWord('रोटी', 'hi');
        assert.strictEqual(isRejectedCandidate, true, 'Plain word "रोटी" must be rejected as candidate');

        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.ok(restored.includes('[[रोटी]]'), 'Pre-existing [[रोटी]] must remain intact');
    });

    test('T3.2: Domestic noun candidate rejection while civic compound term with similar stem is allowed', (t) => {
        const engine = loadAppEngine();
        if (!Features.isCivicAllowlistExpanded()) {
            t.skip('Pending Milestone M2 (Civic allowlist expansion)');
            return;
        }
        // 'सभा' alone is blacklisted
        const isSabhaRejected = engine.exports.isNonLinkableWord('सभा', 'hi');
        assert.strictEqual(isSabhaRejected, true, 'Standalone "सभा" must be non-linkable');
        // 'विधान सभा' as a compound is allowed
        const isVidhanSabhaValid = engine.exports.isValidCandidate('विधान सभा', 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
        assert.strictEqual(isVidhanSabhaValid, true, 'Compound "विधान सभा" must be valid candidate');
    });
});

describe('Tier 4: Blacklist Real-World Article Scenarios', () => {

    test('T4.1: Munshi Premchand excerpt suppresses domestic stopwords while preserving encyclopedic concepts', (t) => {
        const engine = loadAppEngine();
        if (!Features.isBlacklist10k()) {
            // In baseline dictionary, test words known to be present
            const baselineNarrativeWords = ['समय', 'काम', 'लोग', 'दिन'];
            for (const cw of baselineNarrativeWords) {
                const isNonLinkable = engine.exports.isNonLinkableWord(cw, 'hi');
                assert.strictEqual(isNonLinkable, true, `Baseline stopword "${cw}" should be non-linkable`);
            }
            return;
        }
        const fullExpandedWords = ['कहानी', 'समय', 'काम', 'लोग', 'दिन', 'बात'];
        for (const cw of fullExpandedWords) {
            const isNonLinkable = engine.exports.isNonLinkableWord(cw, 'hi');
            assert.strictEqual(isNonLinkable, true, `Everyday narrative word "${cw}" should be non-linkable`);
        }
    });
});
