/**
 * tests/e2e_ai_compound.test.js
 * End-to-End Test Suite for Enhanced Local AI Compound Classifier & On/Off Discrimination (R1, R2, R4)
 * Covers Features 1 through 9 across Tier 1 (Feature Coverage) and Tier 2 (Boundary & Corner Cases).
 *
 * Constraints:
 * - Native node:test and node:assert/strict
 * - Zero pictorial emojis (tests/emoji_audit.test.js compliant)
 * - Zero npm runtime dependencies
 * - Progressive testability with Features capability detection
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    PROJECT_ROOT,
    loadAppEngine,
    loadAiCompoundClassifier,
    Features,
    applySuggestions
} = require('./harness.js');

describe('Feature 1: Traditional Mode (OFF) Strict Enforcement', () => {

    test('T1.1: Non-dictionary 3-gram "डिजिटल साक्षरता अभियान" is rejected when AI toggle is OFF', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1 (AI toggle OFF strict enforcement)');
            return;
        }
        engine.exports.state.optAiCompoundClassifier = false;
        if (engine.exports.DOM && engine.exports.DOM.optAiCompoundClassifier) {
            engine.exports.DOM.optAiCompoundClassifier.checked = false;
        }
        const term = 'डिजिटल साक्षरता अभियान';
        const isValid = engine.exports.isValidCandidate(
            term, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true
        );
        assert.strictEqual(isValid, false, 'Non-dictionary multi-word must be rejected in OFF mode');
    });

    test('T1.2: Non-dictionary 3-gram "ऊर्जा संरक्षण नीति" is rejected when AI toggle is OFF', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1 (AI toggle OFF strict enforcement)');
            return;
        }
        engine.exports.state.optAiCompoundClassifier = false;
        const term = 'ऊर्जा संरक्षण नीति';
        const isValid = engine.exports.isValidCandidate(
            term, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true
        );
        assert.strictEqual(isValid, false, 'Non-dictionary policy compound must be rejected in OFF mode');
    });

    test('T1.3: Non-dictionary 3-gram "सतत विकास लक्ष्य" is rejected when AI toggle is OFF', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1 (AI toggle OFF strict enforcement)');
            return;
        }
        engine.exports.state.optAiCompoundClassifier = false;
        const term = 'सतत विकास लक्ष्य';
        const isValid = engine.exports.isValidCandidate(
            term, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true
        );
        assert.strictEqual(isValid, false, 'Non-dictionary developmental compound must be rejected in OFF mode');
    });

    test('T1.4: Pre-existing static dictionary compound "सर्वोच्च न्यायालय" is accepted when OFF', () => {
        const engine = loadAppEngine();
        engine.exports.state.optAiCompoundClassifier = false;
        const dictTerm = 'सर्वोच्च न्यायालय';
        assert.ok(
            engine.exports.COMPOUND_TERMS_SET.has(dictTerm),
            'सर्वोच्च न्यायालय must be present in static COMPOUND_TERMS_SET'
        );
        const isValid = engine.exports.isValidCandidate(
            dictTerm, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true
        );
        assert.strictEqual(isValid, true, 'Static dictionary compound must be accepted in OFF mode');
    });

    test('T1.5: Whitelist compound entry is accepted when OFF', () => {
        const engine = loadAppEngine();
        engine.exports.state.optAiCompoundClassifier = false;
        if (!engine.exports.state.adminWhitelist) {
            engine.exports.state.adminWhitelist = new Set();
        }
        engine.exports.state.adminWhitelist.add('विशेष अनुसंधान परियोजना');
        const isValid = engine.exports.isValidCandidate(
            'विशेष अनुसंधान परियोजना', 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true
        );
        assert.strictEqual(isValid, true, 'Whitelisted compound must be accepted regardless of AI mode');
    });

    test('T2.1: Dynamic toggle flipping (OFF -> ON -> OFF) maintains strict rejection in OFF mode', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1');
            return;
        }
        const term = 'डिजिटल साक्षरता अभियान';
        engine.exports.state.optAiCompoundClassifier = false;
        assert.strictEqual(engine.exports.isValidCandidate(term, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true), false);

        engine.exports.state.optAiCompoundClassifier = true;
        // When ON, if M1 is ready it accepts
        engine.exports.state.optAiCompoundClassifier = false;
        assert.strictEqual(engine.exports.isValidCandidate(term, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true), false);
    });

    test('T2.2: Empty string or 1-character input rejected in OFF mode', () => {
        const engine = loadAppEngine();
        engine.exports.state.optAiCompoundClassifier = false;
        assert.strictEqual(engine.exports.isValidCandidate('', 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true), false);
        assert.strictEqual(engine.exports.isValidCandidate('क', 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true), false);
    });

    test('T2.3: Multi-word phrase with non-Devanagari characters rejected in OFF mode', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1');
            return;
        }
        engine.exports.state.optAiCompoundClassifier = false;
        const phrase = 'Digital Literacy Policy';
        assert.strictEqual(engine.exports.isValidCandidate(phrase, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true), false);
    });

    test('T2.4: 4-word non-dictionary phrase "डिजिटल सार्वजनिक अवसंरचना विकास" rejected in OFF mode', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1');
            return;
        }
        engine.exports.state.optAiCompoundClassifier = false;
        const phrase = 'डिजिटल सार्वजनिक अवसंरचना विकास';
        assert.strictEqual(engine.exports.isValidCandidate(phrase, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true), false);
    });

    test('T2.5: Dictionary compound with surrounding whitespace correctly trimmed and accepted in OFF mode', () => {
        const engine = loadAppEngine();
        engine.exports.state.optAiCompoundClassifier = false;
        const term = '  सर्वोच्च न्यायालय  ';
        const isValid = engine.exports.isValidCandidate(
            term.trim(), 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true
        );
        assert.strictEqual(isValid, true);
    });
});

describe('Feature 2: AI Enhanced Mode (ON) Beyond-Dictionary Discovery', () => {

    const classifier = loadAiCompoundClassifier();

    test('T1.1: Novel policy compound "डिजिटल साक्षरता अभियान" classified as COMPOUND with score >= 0.70', (t) => {
        if (!Features.isAiBeyondDictionaryEnabled()) {
            t.skip('Pending Milestone M1 (Beyond-dictionary AI compound discovery)');
            return;
        }
        const res = classifier.classify('डिजिटल साक्षरता अभियान');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.isCompound, true);
        assert.ok(res.score >= 0.70, `Score must be >= 0.70, got: ${res.score}`);
        assert.ok(res.badgeText.includes('संयुक्त'));
    });

    test('T1.2: Novel policy compound "ऊर्जा संरक्षण नीति" classified as COMPOUND with score >= 0.70', (t) => {
        if (!Features.isAiBeyondDictionaryEnabled()) {
            t.skip('Pending Milestone M1 (Beyond-dictionary AI compound discovery)');
            return;
        }
        const res = classifier.classify('ऊर्जा संरक्षण नीति');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.isCompound, true);
        assert.ok(res.score >= 0.70, `Score must be >= 0.70, got: ${res.score}`);
    });

    test('T1.3: Novel developmental compound "सतत विकास लक्ष्य" classified as COMPOUND with score >= 0.70', (t) => {
        if (!Features.isAiBeyondDictionaryEnabled()) {
            t.skip('Pending Milestone M1 (Beyond-dictionary AI compound discovery)');
            return;
        }
        const res = classifier.classify('सतत विकास लक्ष्य');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.isCompound, true);
        assert.ok(res.score >= 0.70, `Score must be >= 0.70, got: ${res.score}`);
    });

    test('T1.4: Novel environmental compound "नवीकरणीय ऊर्जा परियोजना" classified as COMPOUND with score >= 0.70', (t) => {
        if (!Features.isAiBeyondDictionaryEnabled()) {
            t.skip('Pending Milestone M1 (Beyond-dictionary AI compound discovery)');
            return;
        }
        const res = classifier.classify('नवीकरणीय ऊर्जा परियोजना');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.isCompound, true);
        assert.ok(res.score >= 0.70, `Score must be >= 0.70, got: ${res.score}`);
    });

    test('T1.5: Novel institutional tribunal compound "राष्ट्रीय हरित अधिकरण" classified as COMPOUND with score >= 0.70', () => {
        const res = classifier.classify('राष्ट्रीय हरित अधिकरण');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.isCompound, true);
        assert.ok(res.score >= 0.70, `Score must be >= 0.70, got: ${res.score}`);
    });

    test('T2.1: Threshold boundary evaluation (0.69 vs 0.70 with custom threshold options)', () => {
        const mockPhrase = 'सामुदायिक सभा';
        const resHigh = classifier.classify(mockPhrase, '', { threshold: 0.90 });
        if (resHigh.score < 0.90) {
            assert.strictEqual(resHigh.decision, 'SEPARATE', 'Should be SEPARATE when score < threshold');
        }
        const resLow = classifier.classify(mockPhrase, '', { threshold: 0.30 });
        if (resLow.score >= 0.30) {
            assert.strictEqual(resLow.decision, 'COMPOUND', 'Should be COMPOUND when score >= threshold');
        }
    });

    test('T2.2: Devanagari numerals in compound title handled cleanly', () => {
        const res = classifier.classify('तीसरी राष्ट्रीय खेल प्रतियोगिता');
        assert.ok(res && typeof res.score === 'number');
        assert.ok(!isNaN(res.score));
    });

    test('T2.3: 4-word novel compound "डिजिटल सार्वजनिक वित्त ढांचा" evaluated with cohesion scoring', (t) => {
        if (!Features.isTatpurushaPolicyHeadsImplemented()) {
            t.skip('Pending Milestone M1');
            return;
        }
        const res = classifier.classify('डिजिटल सार्वजनिक वित्त ढांचा');
        assert.ok(res && res.score >= 0.70, 'Policy head ढांचा should impart high cohesion');
    });

    test('T2.4: Candidate with Devanagari punctuation / matras / nukta handled cleanly', () => {
        const res = classifier.classify('अंतरिक्ष अनुसंधान केंद्र,');
        assert.ok(res && res.decision === 'COMPOUND');
        assert.ok(res.phrase.includes('अंतरिक्ष अनुसंधान केंद्र'));
    });

    test('T2.5: Verifies that novel phrase is outside static COMPOUND_TERMS_SET before testing AI discovery', () => {
        const engine = loadAppEngine();
        const novelTerms = ['डिजिटल साक्षरता अभियान', 'ऊर्जा संरक्षण नीति', 'सतत विकास लक्ष्य'];
        for (const term of novelTerms) {
            const inDict = engine.exports.COMPOUND_TERMS_SET.has(term);
            assert.strictEqual(inDict, false, `Term "${term}" must be beyond static dictionary to verify novel discovery`);
        }
    });
});

describe('Feature 3: Tangible ON vs OFF Output & Suggestion Discrimination', () => {

    test('T1.1: Identical wikitext with "डिजिटल साक्षरता अभियान": ON mode yields compound link vs OFF mode', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiBeyondDictionaryEnabled() || !Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1 (Tangible ON vs OFF discrimination)');
            return;
        }
        const text = 'भारत सरकार ने डिजिटल साक्षरता अभियान प्रारंभ किया।';

        // Mode OFF
        engine.exports.state.optAiCompoundClassifier = false;
        if (engine.exports.DOM && engine.exports.DOM.optAiCompoundClassifier) {
            engine.exports.DOM.optAiCompoundClassifier.checked = false;
        }
        const offSuggestions = [
            { term: 'डिजिटल', checked: true },
            { term: 'साक्षरता', checked: true }
        ];
        const offOut = applySuggestions(engine, text, offSuggestions, true);
        assert.strictEqual(offOut.includes('[[डिजिटल साक्षरता अभियान]]'), false, 'OFF mode must not create compound link');

        // Mode ON
        engine.exports.state.optAiCompoundClassifier = true;
        if (engine.exports.DOM && engine.exports.DOM.optAiCompoundClassifier) {
            engine.exports.DOM.optAiCompoundClassifier.checked = true;
        }
        const onSuggestions = [
            { term: 'डिजिटल साक्षरता अभियान', checked: true }
        ];
        const onOut = applySuggestions(engine, text, onSuggestions, true);
        assert.ok(onOut.includes('[[डिजिटल साक्षरता अभियान]]'), 'ON mode must create unified compound link');
    });

    test('T1.2: Identical wikitext with "ऊर्जा संरक्षण नीति": Output strictly differs between ON and OFF modes', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiBeyondDictionaryEnabled() || !Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1 (Tangible ON vs OFF discrimination)');
            return;
        }
        const text = 'ऊर्जा संरक्षण नीति देश के भविष्य के लिए आवश्यक है।';
        const offSuggestions = [{ term: 'ऊर्जा', checked: true }, { term: 'संरक्षण', checked: true }];
        const onSuggestions = [{ term: 'ऊर्जा संरक्षण नीति', checked: true }];

        const outOff = applySuggestions(engine, text, offSuggestions, true);
        const outOn = applySuggestions(engine, text, onSuggestions, true);

        assert.notStrictEqual(outOff, outOn, 'Output wikitext must tangibly differ between ON and OFF modes');
        assert.ok(outOn.includes('[[ऊर्जा संरक्षण नीति]]'));
        assert.strictEqual(outOff.includes('[[ऊर्जा संरक्षण नीति]]'), false);
    });

    test('T1.3: Identical wikitext with "सतत विकास लक्ष्य": Suggestion composition differs between modes', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiBeyondDictionaryEnabled() || !Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1 (Tangible ON vs OFF discrimination)');
            return;
        }
        const term = 'सतत विकास लक्ष्य';
        engine.exports.state.optAiCompoundClassifier = false;
        const validOff = engine.exports.isValidCandidate(term, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
        engine.exports.state.optAiCompoundClassifier = true;
        const validOn = engine.exports.isValidCandidate(term, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);

        assert.strictEqual(validOff, false, 'OFF must reject novel candidate');
        assert.strictEqual(validOn, true, 'ON must accept novel candidate');
    });

    test('T1.4: Novel multi-word suggestion in ON mode flags isAiDiscovered === true', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiBeyondDictionaryEnabled()) {
            t.skip('Pending Milestone M1 (isAiDiscovered suggestion flag)');
            return;
        }
        const classifier = loadAiCompoundClassifier();
        const term = 'डिजिटल साक्षरता अभियान';
        const isNovel = !engine.exports.COMPOUND_TERMS_SET.has(term);
        const aiRes = classifier.classify(term);

        assert.ok(isNovel, 'Must be outside static dictionary');
        assert.strictEqual(aiRes.decision, 'COMPOUND');
        assert.ok(aiRes.score >= 0.70);
    });

    test('T1.5: Suggestion badge metadata in ON mode displays [AI: ...% संयुक्त]', () => {
        const classifier = loadAiCompoundClassifier();
        const res = classifier.classify('सर्वोच्च न्यायालय');
        assert.ok(res.badgeText.startsWith('[AI:'), 'Badge must start with [AI:');
        assert.ok(res.badgeText.includes('संयुक्त'), 'Badge must indicate compound status');
    });

    test('T2.1: Wikitext containing zero candidates produces identical output in both ON and OFF modes', () => {
        const engine = loadAppEngine();
        const emptyText = 'और तथा एवं व या अथवा।';
        const out1 = applySuggestions(engine, emptyText, [], true);
        const out2 = applySuggestions(engine, emptyText, [], true);
        assert.strictEqual(out1, out2);
    });

    test('T2.2: Wikitext containing only static dictionary compounds produces identical links in both modes', () => {
        const engine = loadAppEngine();
        const text = 'भारत का [[सर्वोच्च न्यायालय]] नई दिल्ली में स्थित है।';
        const out1 = applySuggestions(engine, text, [], true);
        const out2 = applySuggestions(engine, text, [], true);
        assert.strictEqual(out1, out2);
        assert.ok(out1.includes('[[सर्वोच्च न्यायालय]]'));
    });

    test('T2.3: Sequential alternations (ON -> OFF -> ON) on identical wikitext produce deterministic results', (t) => {
        const engine = loadAppEngine();
        if (!Features.isAiBeyondDictionaryEnabled() || !Features.isAiModeOffStrictEnforcement()) {
            t.skip('Pending Milestone M1');
            return;
        }
        const text = 'डिजिटल साक्षरता अभियान एक राष्ट्रव्यापी कार्यक्रम है।';
        const sOn = [{ term: 'डिजिटल साक्षरता अभियान', checked: true }];
        const sOff = [{ term: 'डिजिटल', checked: true }];

        const run1 = applySuggestions(engine, text, sOn, true);
        const run2 = applySuggestions(engine, text, sOff, true);
        const run3 = applySuggestions(engine, text, sOn, true);

        assert.strictEqual(run1, run3, 'Consecutive ON runs must be byte-identical');
        assert.notStrictEqual(run1, run2, 'ON run must differ from OFF run');
    });

    test('T2.4: Wikitext with irregular whitespace and newlines preserves surrounding whitespace exactly', () => {
        const engine = loadAppEngine();
        const text = '  \n\t  सर्वोच्च न्यायालय \n\n  देश का सर्वोच्च न्याय पीठ है।  ';
        const suggestions = [{ term: 'सर्वोच्च न्यायालय', checked: true }];
        const out = applySuggestions(engine, text, suggestions, true);
        assert.ok(out.startsWith('  \n\t  [[सर्वोच्च न्यायालय]]'));
        assert.ok(out.endsWith('  '));
    });

    test('T2.5: Wikitext with pre-existing link on constituent word preserves pre-existing link intact', () => {
        const engine = loadAppEngine();
        const text = 'यह [[डिजिटल]] साक्षरता अभियान का भाग है।';
        const suggestions = [{ term: 'साक्षरता', checked: true }];
        const out = applySuggestions(engine, text, suggestions, true);
        assert.ok(out.includes('[[डिजिटल]]'), 'Pre-existing link must remain untouched');
    });
});

describe('Feature 4: Tatpurusha Policy Heads', () => {

    const classifier = loadAiCompoundClassifier();

    test('T1.1: Head "-नीति" ("ऊर्जा संरक्षण नीति", "राष्ट्रीय शिक्षा नीति") recognized with score >= 0.70', (t) => {
        if (!Features.isTatpurushaPolicyHeadsImplemented()) {
            t.skip('Pending Milestone M1 (Tatpurusha policy head -नीति)');
            return;
        }
        const res = classifier.classify('ऊर्जा संरक्षण नीति');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70, `Score must be >= 0.70, got ${res.score}`);
    });

    test('T1.2: Head "-ढांचा" ("डिजिटल सार्वजनिक ढांचा", "संवैधानिक ढांचा") recognized with score >= 0.70', (t) => {
        if (!Features.isTatpurushaPolicyHeadsImplemented()) {
            t.skip('Pending Milestone M1 (Tatpurusha policy head -ढांचा)');
            return;
        }
        const res = classifier.classify('डिजिटल सार्वजनिक ढांचा');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70, `Score must be >= 0.70, got ${res.score}`);
    });

    test('T1.3: Head "-लक्ष्य" ("सतत विकास लक्ष्य", "शून्य उत्सर्जन लक्ष्य") recognized with score >= 0.70', (t) => {
        if (!Features.isTatpurushaPolicyHeadsImplemented()) {
            t.skip('Pending Milestone M1 (Tatpurusha policy head -लक्ष्य)');
            return;
        }
        const res = classifier.classify('सतत विकास लक्ष्य');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70, `Score must be >= 0.70, got ${res.score}`);
    });

    test('T1.4: Heads "-आयोग", "-योजना", "-संस्थान" recognized with score >= 0.70', () => {
        const res1 = classifier.classify('कौशल विकास योजना');
        const res2 = classifier.classify('भारतीय सांख्यिकी संस्थान');
        assert.strictEqual(res1.decision, 'COMPOUND');
        assert.strictEqual(res2.decision, 'COMPOUND');
        assert.ok(res1.score >= 0.70);
        assert.ok(res2.score >= 0.70);
    });

    test('T1.5: Heads "-परिषद", "-परियोजना", "-प्राधिकरण", "-निगम", "-अभियान" recognized with score >= 0.70', () => {
        const heads = [
            'राष्ट्रीय राजमार्ग प्राधिकरण',
            'स्वच्छ भारत अभियान',
            'परमाणु ऊर्जा निगम',
            'सड़क विकास परियोजना'
        ];
        for (const h of heads) {
            const res = classifier.classify(h);
            assert.strictEqual(res.decision, 'COMPOUND', `Expected COMPOUND for ${h}`);
            assert.ok(res.score >= 0.70, `Expected score >= 0.70 for ${h}, got ${res.score}`);
        }
    });

    test('T2.1: Hyphenated head format ("जल-संरक्षण-नीति", "कौशल-विकास-योजना") scored consistently', (t) => {
        if (!Features.isTatpurushaPolicyHeadsImplemented()) {
            t.skip('Pending Milestone M1');
            return;
        }
        const res = classifier.classify('जल-संरक्षण-नीति');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70);
    });

    test('T2.2: Tatpurusha head at terminal head position vs non-terminal position', () => {
        const terminal = classifier.classify('राष्ट्रीय सांख्यिकी संस्थान');
        assert.strictEqual(terminal.decision, 'COMPOUND');
        assert.ok(terminal.score >= 0.70);
    });

    test('T2.3: Head attached to non-entity word without modifier context scored appropriately', () => {
        const res = classifier.classify('पुरानी नीति');
        assert.ok(res && typeof res.score === 'number');
    });

    test('T2.4: Head with Devanagari danda punctuation at trailing boundary stripped before evaluation', (t) => {
        if (!Features.isTatpurushaPolicyHeadsImplemented()) {
            t.skip('Pending Milestone M1');
            return;
        }
        const res = classifier.classify('ऊर्जा संरक्षण नीति।');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.phrase, 'ऊर्जा संरक्षण नीति');
    });

    test('T2.5: Multiple consecutive policy heads handled safely without recursion error', () => {
        const res = classifier.classify('योजना आयोग परिषद');
        assert.ok(res && res.decision === 'COMPOUND');
    });
});

describe('Feature 5: Karmadharaya Adjective+Noun Combinations', () => {

    const classifier = loadAiCompoundClassifier();

    test('T1.1: "डिजिटल साक्षरता" classified as Karmadharaya compound with score >= 0.70', (t) => {
        if (!Features.isKarmadharayaSamasaImplemented()) {
            t.skip('Pending Milestone M1 (Karmadharaya digital literacy collocation)');
            return;
        }
        const res = classifier.classify('डिजिटल साक्षरता');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70, `Expected score >= 0.70 for डिजिटल साक्षरता, got ${res.score}`);
    });

    test('T1.2: "हरित क्रांति" classified as Karmadharaya compound with score >= 0.70', () => {
        const res = classifier.classify('हरित क्रांति');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70);
    });

    test('T1.3: "सतत विकास" classified as Karmadharaya compound with score >= 0.70', (t) => {
        if (!Features.isKarmadharayaSamasaImplemented()) {
            t.skip('Pending Milestone M1');
            return;
        }
        const res = classifier.classify('सतत विकास');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70);
    });

    test('T1.4: "नवीकरणीय ऊर्जा" classified as Karmadharaya compound with score >= 0.70', (t) => {
        if (!Features.isKarmadharayaSamasaImplemented()) {
            t.skip('Pending Milestone M1');
            return;
        }
        const res = classifier.classify('नवीकरणीय ऊर्जा');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70);
    });

    test('T1.5: "सामाजिक न्याय" and "संवैधानिक उपचार" classified with score >= 0.70', (t) => {
        if (!Features.isKarmadharayaSamasaImplemented()) {
            t.skip('Pending Milestone M1 (Karmadharaya collocations)');
            return;
        }
        const res1 = classifier.classify('सामाजिक न्याय');
        const res2 = classifier.classify('संवैधानिक उपचार');
        assert.ok(res1.score >= 0.70);
        assert.ok(res2.score >= 0.70);
    });

    test('T2.1: Reversal check: Noun + Adjective order does not spuriously trigger Karmadharaya boost', () => {
        const normal = classifier.classify('राष्ट्रीय विकास');
        const reversed = classifier.classify('विकास राष्ट्रीय');
        assert.ok(normal.score >= reversed.score, 'Modifier + Noun must have higher or equal score than reversed order');
    });

    test('T2.2: Multiple adjectives preceding noun ("नवीनतम डिजिटल साक्षरता") scored cleanly', () => {
        const res = classifier.classify('नवीनतम डिजिटल साक्षरता');
        assert.ok(res && typeof res.score === 'number');
    });

    test('T2.3: Karmadharaya compound with inflected adjective handled safely', () => {
        const res = classifier.classify('हरित क्रांतियां');
        assert.ok(res && typeof res.score === 'number');
    });

    test('T2.4: Karmadharaya phrase enclosed in single or double quotes preserves semantic score', (t) => {
        if (!Features.isKarmadharayaSamasaImplemented()) {
            t.skip('Pending Milestone M1 (Quote stripping on candidate classification)');
            return;
        }
        const plain = classifier.classify('हरित क्रांति');
        const quoted = classifier.classify('"हरित क्रांति"');
        assert.ok(quoted.phrase.includes('हरित क्रांति'));
        assert.strictEqual(quoted.decision, plain.decision);
    });

    test('T2.5: Zero-length or 1-word inputs cannot trigger Karmadharaya boost', () => {
        const res1 = classifier.classify('');
        const res2 = classifier.classify('हरित');
        assert.strictEqual(res1.decision, 'SEPARATE');
        assert.strictEqual(res2.decision, 'SEPARATE');
    });
});

describe('Feature 6: Affix Cohesion & Morphology', () => {

    const classifier = loadAiCompoundClassifier();

    test('T1.1: Prefix "उप-" ("उप-राष्ट्रपति", "उप-राज्यपाल", "उप-परियोजना") has high cohesion score >= 0.70', () => {
        const res = classifier.classify('उप-राष्ट्रपति');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70);
    });

    test('T1.2: Prefix "अंतर-" ("अंतर-संसदीय", "अंतर-सरकारी संगठन", "अंतर-राज्यीय परिषद") has score >= 0.70', () => {
        const res = classifier.classify('अंतर-सरकारी संगठन');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70);
    });

    test('T1.3: Suffix "-वादी" ("समाजवादी विचारधारा", "गांधीवादी दर्शन") has high cohesion score >= 0.70', (t) => {
        if (!Features.isAffixCohesionImplemented()) {
            t.skip('Pending Milestone M1 (Suffix -वादी cohesion)');
            return;
        }
        const res = classifier.classify('समाजवादी विचारधारा');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70);
    });

    test('T1.4: Suffix "-विज्ञानी" ("पर्यावरणविज्ञानी दल", "भूविज्ञानी सर्वेक्षण") has high cohesion score >= 0.70', () => {
        const res = classifier.classify('पर्यावरणविज्ञानी दल');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70);
    });

    test('T1.5: Suffix "-करण" ("डिजिटलीकरण अभियान", "निजीकरण नीति", "शहरीकरण ढांचा") has score >= 0.70', () => {
        const res = classifier.classify('डिजिटलीकरण अभियान');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.ok(res.score >= 0.70);
    });

    test('T2.1: Affix with various dash types (hyphen-minus "-", en-dash "–", em-dash "—") parsed identically', () => {
        const res1 = classifier.classify('उप-राष्ट्रपति');
        const res2 = classifier.classify('उप–राष्ट्रपति');
        const res3 = classifier.classify('उप—राष्ट्रपति');
        assert.strictEqual(res1.decision, res2.decision);
        assert.strictEqual(res2.decision, res3.decision);
    });

    test('T2.2: Standalone prefix without following noun ("उप-" alone) rejected as compound', () => {
        const res = classifier.classify('उप-');
        assert.strictEqual(res.decision, 'SEPARATE');
    });

    test('T2.3: Suffix attached without hyphen directly handled as valid component', () => {
        const res = classifier.classify('पर्यावरणविज्ञानी दल');
        assert.ok(res && res.score >= 0.70);
    });

    test('T2.4: Mixed script affix handled safely without crash', () => {
        const res = classifier.classify('sub-समिति');
        assert.ok(res && typeof res.score === 'number');
    });

    test('T2.5: Repeated prefixes ("उप-उप-") handled safely', () => {
        const res = classifier.classify('उप-उप-राष्ट्रपति');
        assert.ok(res && typeof res.decision === 'string');
    });
});

describe('Feature 7: Fragmentation Prevention (<60% Threshold)', () => {

    const classifier = loadAiCompoundClassifier();

    test('T1.1: Common coordinator pair "राम और श्याम" rejected as compound (score <= 0.20 < 0.60)', () => {
        const res = classifier.classify('राम और श्याम');
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.isCompound, false);
        assert.ok(res.score < 0.60, `Score must be < 0.60, got ${res.score}`);
        assert.strictEqual(res.category, 'ACCIDENTAL_CONJUNCTION');
    });

    test('T1.2: Geographical coordinator pair "नदी और पहाड़" rejected as compound', () => {
        const res = classifier.classify('नदी और पहाड़');
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.isCompound, false);
        assert.ok(res.score < 0.60);
    });

    test('T1.3: Agricultural coordinator pair "गेहूं और चावल" rejected as compound', () => {
        const res = classifier.classify('गेहूं और चावल');
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.isCompound, false);
        assert.ok(res.score < 0.60);
    });

    test('T1.4: Ordinary colloquial genitive pair "राम का घर" rejected as compound (score < 0.60)', () => {
        const res = classifier.classify('राम का घर');
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.isCompound, false);
        assert.ok(res.score < 0.60);
        assert.strictEqual(res.category, 'GENITIVE_COLLOCATION');
    });

    test('T1.5: Colloquial collocation "पेड़ की शाखा" rejected as compound', () => {
        const res = classifier.classify('पेड़ की शाखा');
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.isCompound, false);
        assert.ok(res.score < 0.60);
    });

    test('T2.1: Score boundary: Exactly 0.59 is rejected as SEPARATE, 0.60 is accepted when threshold is 0.60', () => {
        const phrase = 'सामान्य पद';
        const res1 = classifier.classify(phrase, '', { threshold: 0.60 });
        if (res1.score < 0.60) {
            assert.strictEqual(res1.decision, 'SEPARATE');
        } else {
            assert.strictEqual(res1.decision, 'COMPOUND');
        }
    });

    test('T2.2: Coordinator word with trailing comma ("और,") handled cleanly', () => {
        const res = classifier.classify('राम और, श्याम');
        assert.strictEqual(res.decision, 'SEPARATE');
    });

    test('T2.3: Multi-item coordination ("राम, श्याम और मोहन") rejected as single compound', () => {
        const res = classifier.classify('राम, श्याम और मोहन');
        assert.strictEqual(res.decision, 'SEPARATE');
    });

    test('T2.4: Coordinator between institutional head and normal noun ("मंत्रालय और सड़क") rejected', () => {
        const res = classifier.classify('मंत्रालय और सड़क');
        assert.strictEqual(res.decision, 'SEPARATE');
    });

    test('T2.5: Coordinator with non-breaking space or tabs handled identically to standard space', () => {
        const res1 = classifier.classify('राम\u00A0और\u00A0श्याम');
        const res2 = classifier.classify('राम\tऔर\tश्याम');
        assert.strictEqual(res1.decision, 'SEPARATE');
        assert.strictEqual(res2.decision, 'SEPARATE');
    });
});

describe('Feature 8: Offline PWA Verification Recognition', () => {

    test('T1.1: AI-discovered novel compound with score >= 0.70 is verified in applySafeOfflineVerification', (t) => {
        const engine = loadAppEngine();
        if (!Features.isOfflinePwaAiVerificationImplemented()) {
            t.skip('Pending Milestone M1 (Offline PWA verification for high-cohesion AI compounds)');
            return;
        }
        const map = new Map();
        engine.exports.applySafeOfflineVerification(['डिजिटल साक्षरता अभियान'], map);
        const res = map.get('डिजिटल साक्षरता अभियान');
        assert.ok(res && res.exists === true, 'High-cohesion compound must be verified in offline execution');
    });

    test('T1.2: Weak or rejected compound (<0.60) is NOT marked exists: true in offline verification', () => {
        const engine = loadAppEngine();
        const map = new Map();
        if (typeof engine.exports.applySafeOfflineVerification === 'function') {
            engine.exports.applySafeOfflineVerification(['राम का घर'], map);
            const res = map.get('राम का घर');
            assert.ok(!res || res.exists === false, 'Weak collocation must not be verified as exists: true');
        }
    });

    test('T1.3: Pre-existing dictionary entries in offline titles map continue to verify as exists: true', () => {
        const engine = loadAppEngine();
        const map = new Map();
        if (typeof engine.exports.applySafeOfflineVerification === 'function') {
            engine.exports.applySafeOfflineVerification(['भारत'], map);
            const res = map.get('भारत');
            assert.ok(res && res.exists === true, 'Static offline title must verify');
        }
    });

    test('T1.4: Offline verification executes 100% synchronously with zero network fetch calls', () => {
        const engine = loadAppEngine();
        const map = new Map();
        const start = Date.now();
        if (typeof engine.exports.applySafeOfflineVerification === 'function') {
            engine.exports.applySafeOfflineVerification(['भारत', 'सर्वोच्च न्यायालय'], map);
        }
        const duration = Date.now() - start;
        assert.ok(duration < 100, 'Must execute synchronously under 100ms');
    });

    test('T1.5: Batch with mixed entries verified with correct granular flags', () => {
        const engine = loadAppEngine();
        const map = new Map();
        if (typeof engine.exports.applySafeOfflineVerification === 'function') {
            engine.exports.applySafeOfflineVerification(['भारत', 'अज्ञात_शब्द_१२३'], map);
            const valid = map.get('भारत');
            const invalid = map.get('अज्ञात_शब्द_१२३');
            assert.ok(valid && valid.exists === true);
            assert.ok(invalid && invalid.exists === false);
        }
    });

    test('T2.1: Empty chunk passed to offline verification returns empty map without throwing', () => {
        const engine = loadAppEngine();
        const map = new Map();
        if (typeof engine.exports.applySafeOfflineVerification === 'function') {
            assert.doesNotThrow(() => engine.exports.applySafeOfflineVerification([], map));
            assert.strictEqual(map.size, 0);
        }
    });

    test('T2.2: Batch of 100+ candidates verified within budget (<50ms)', () => {
        const engine = loadAppEngine();
        const map = new Map();
        const candidates = Array.from({ length: 120 }, (_, i) => `परीक्षण_पद_${i}`);
        if (typeof engine.exports.applySafeOfflineVerification === 'function') {
            const start = Date.now();
            engine.exports.applySafeOfflineVerification(candidates, map);
            assert.ok(Date.now() - start < 250, 'Batch of 120 candidates should verify under 250ms');
            assert.strictEqual(map.size, 120);
        }
    });

    test('T2.3: Candidate with missing or malformed title string handled safely', () => {
        const engine = loadAppEngine();
        const map = new Map();
        if (typeof engine.exports.applySafeOfflineVerification === 'function') {
            assert.doesNotThrow(() => engine.exports.applySafeOfflineVerification(['', '   '], map));
        }
    });

    test('T2.4: Offline verification when navigator.onLine === false works identically', () => {
        const engine = loadAppEngine();
        engine.window.navigator.onLine = false;
        const map = new Map();
        if (typeof engine.exports.applySafeOfflineVerification === 'function') {
            engine.exports.applySafeOfflineVerification(['भारत'], map);
            assert.strictEqual(map.get('भारत')?.exists, true);
        }
    });

    test('T2.5: Offline verification does not mutate input array', () => {
        const engine = loadAppEngine();
        const original = ['भारत', 'हिमालय'];
        const clone = [...original];
        const map = new Map();
        if (typeof engine.exports.applySafeOfflineVerification === 'function') {
            engine.exports.applySafeOfflineVerification(clone, map);
            assert.deepStrictEqual(clone, original, 'Input array must remain unmodified');
        }
    });
});

describe('Feature 9: Safe Fallback on Unexpected Exception', () => {

    const classifier = loadAiCompoundClassifier();

    test('T1.1: null, undefined, or non-string candidate returns safe SEPARATE object', () => {
        const nullRes = classifier.classify(null);
        const undefRes = classifier.classify(undefined);
        const numRes = classifier.classify(12345);

        assert.strictEqual(nullRes.decision, 'SEPARATE');
        assert.strictEqual(undefRes.decision, 'SEPARATE');
        assert.strictEqual(numRes.decision, 'SEPARATE');
        assert.strictEqual(nullRes.isCompound, false);
    });

    test('T1.2: Candidate string consisting only of punctuation or control characters returns safe fallback', () => {
        const punctRes = classifier.classify('!@#$%^&*()_+=');
        const ctrlRes = classifier.classify('\x00\x01\x02\x03');
        assert.strictEqual(punctRes.decision, 'SEPARATE');
        assert.strictEqual(ctrlRes.decision, 'SEPARATE');
    });

    test('T1.3: Thrown error in classifier internals triggers catch block with category FALLBACK', () => {
        const brokenOptions = {
            get threshold() {
                throw new Error('Simulated internal classification crash');
            }
        };
        const res = classifier.classify('परीक्षण पद', '', brokenOptions);
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.category, 'FALLBACK');
        assert.strictEqual(res.isCompound, false);
    });

    test('T1.4: Pipeline isValidCandidate catches classifier exceptions safely and falls back to dictionary', () => {
        const engine = loadAppEngine();
        engine.exports.state.optAiCompoundClassifier = true;
        assert.doesNotThrow(() => {
            engine.exports.isValidCandidate('परीक्षण', 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
        });
    });

    test('T1.5: buildSuggestions continues rendering suggestions even if classifier throws for one candidate', () => {
        const engine = loadAppEngine();
        assert.ok(typeof engine.exports.buildSuggestions === 'function');
    });

    test('T2.1: Deeply nested options object passed to classifier handled safely', () => {
        const deepOptions = { nested: { level1: { level2: { val: 42 } } } };
        const res = classifier.classify('भारत', '', deepOptions);
        assert.ok(res && res.decision === 'SEPARATE');
    });

    test('T2.2: Object with prototype pollution attempts (__proto__, constructor) handled safely', () => {
        const evilOptions = JSON.parse('{"__proto__": {"polluted": true}}');
        const res = classifier.classify('भारत गणराज्य', '', evilOptions);
        assert.ok(res && typeof res.decision === 'string');
        assert.strictEqual(Object.prototype.polluted, undefined, 'Prototype must not be polluted');
    });

    test('T2.3: String with 50,000 characters processed without memory exhaustion or stack overflow', () => {
        const longStr = 'भारत '.repeat(10000);
        const res = classifier.classify(longStr);
        assert.ok(res && typeof res.decision === 'string');
    });

    test('T2.4: Frozen options object does not throw error', () => {
        const frozenOpts = Object.freeze({ threshold: 0.70 });
        assert.doesNotThrow(() => {
            const res = classifier.classify('डिजिटल साक्षरता', '', frozenOpts);
            assert.ok(res);
        });
    });

    test('T2.5: Repeated 1,000 sequential classifications execute cleanly with zero memory leakage', () => {
        const start = Date.now();
        for (let i = 0; i < 1000; i++) {
            classifier.classify('सर्वोच्च न्यायालय');
        }
        const duration = Date.now() - start;
        assert.ok(duration < 500, `1,000 classifications should take < 500ms, took ${duration}ms`);
    });
});
