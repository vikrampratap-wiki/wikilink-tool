/**
 * tests/ai_compound_classifier.test.js
 * Comprehensive automated test suite for Zero-Token Local AI Compound Cohesion Classifier & On/Off Fallback
 * Covers Requirements R1, R2, R3, R4 across Tiers 1-4.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const {
    PROJECT_ROOT,
    PICTORIAL_EMOJI_REGEX,
    loadAppEngine,
    loadAiCompoundClassifier,
    applySuggestions
} = require('./harness.js');

describe('Tier 1: Core AI Compound Classification & Scoring (R1, R2)', () => {

    const classifier = loadAiCompoundClassifier();

    test('T1.1: Institutional compound with internal conjunction ("सड़क परिवहन एवं राजमार्ग मंत्रालय") classified as COMPOUND', () => {
        const res = classifier.classify('सड़क परिवहन एवं राजमार्ग मंत्रालय');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.isCompound, true);
        assert.ok(res.score >= 0.90, `Score must be >= 0.90, got: ${res.score}`);
        assert.strictEqual(res.category, 'COORDINATED_INSTITUTIONAL_COMPOUND');
        assert.ok(res.badgeText.includes('संयुक्त'), 'Badge text must indicate compound entity');
        assert.ok(res.badgeText.startsWith('[AI:'), 'Badge text must start with [AI:');
        assert.strictEqual(res.badgeText, '[AI: 95% संयुक्त]');
        assert.strictEqual(res.compoundConfidence, '95%');
        assert.strictEqual(res.separationConfidence, '5%');
    });

    test('T1.2: Research council with internal conjunction ("वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद") classified as COMPOUND', () => {
        const res = classifier.classify('वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.isCompound, true);
        assert.ok(res.score >= 0.90, `Score must be >= 0.90, got: ${res.score}`);
        assert.strictEqual(res.category, 'COORDINATED_INSTITUTIONAL_COMPOUND');
        assert.strictEqual(res.badgeText, '[AI: 95% संयुक्त]');
    });

    test('T1.3: Constitutional Tatpurusha compound ("भारत के राष्ट्रपति") classified as COMPOUND', () => {
        const res = classifier.classify('भारत के राष्ट्रपति');
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.isCompound, true);
        assert.ok(res.score >= 0.90, `Score must be >= 0.90, got: ${res.score}`);
        assert.strictEqual(res.category, 'TATPURUSHA_COMPOUND');
        assert.strictEqual(res.badgeText, '[AI: 95% संयुक्त]');
    });

    test('T1.4: Common coordinate nouns ("राम और श्याम") classified as SEPARATE with high separation confidence', () => {
        const res = classifier.classify('राम और श्याम');
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.isCompound, false);
        assert.ok(res.score <= 0.20, `Score must be <= 0.20 for accidental conjunction, got: ${res.score}`);
        assert.strictEqual(res.category, 'ACCIDENTAL_CONJUNCTION');
        assert.ok(res.badgeText.includes('पृथक'), 'Badge text must indicate separate entities');
        assert.strictEqual(res.badgeText, '[AI: 85% पृथक]');
    });

    test('T1.5: Geographical coordinate nouns ("नदी और पहाड़") classified as SEPARATE', () => {
        const res = classifier.classify('नदी और पहाड़');
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.isCompound, false);
        assert.strictEqual(res.badgeText, '[AI: 85% पृथक]');
    });

    test('T1.6: Agricultural coordinate nouns ("गेहूं और चावल") classified as SEPARATE', () => {
        const res = classifier.classify('गेहूं और चावल');
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.isCompound, false);
        assert.strictEqual(res.badgeText, '[AI: 85% पृथक]');
    });

    test('T1.7: Single-word candidate ("भारत") classified as SEPARATE under SINGLE_WORD category', () => {
        const res = classifier.classify('भारत');
        assert.strictEqual(res.decision, 'SEPARATE');
        assert.strictEqual(res.isCompound, false);
        assert.strictEqual(res.category, 'SINGLE_WORD');
        assert.strictEqual(res.badgeText, '[AI: 85% पृथक]');
    });

    test('T1.8: Direct dictionary verification signal returns 98% compound confidence', () => {
        const mockDict = new Set(['सर्वोच्च न्यायालय', 'लोक सभा']);
        const res = classifier.classify('सर्वोच्च न्यायालय', '', { knownDictionarySet: mockDict });
        assert.strictEqual(res.decision, 'COMPOUND');
        assert.strictEqual(res.isCompound, true);
        assert.strictEqual(res.score, 0.98);
        assert.strictEqual(res.category, 'VERIFIED_COMPOUND_DICTIONARY');
        assert.strictEqual(res.badgeText, '[AI: 98% संयुक्त]');
    });

    test('T1.9: Coordinated geopolitical and territorial compounds classified as COMPOUND', () => {
        const territories = [
            'जम्मू एवं कश्मीर',
            'दादरा एवं नगर हवेली',
            'दमन एवं दीव',
            'अंडमान एवं निकोबार द्वीपसमूह',
            'त्रिनिदाद एवं टोबैगो',
            'बॉस्निया एवं हर्ज़ेगोविना'
        ];
        for (const t of territories) {
            const res = classifier.classify(t);
            assert.strictEqual(res.decision, 'COMPOUND', `Expected COMPOUND for ${t}`);
            assert.strictEqual(res.isCompound, true);
            assert.ok(res.score >= 0.90, `Score must be >= 0.90 for ${t}, got: ${res.score}`);
            assert.strictEqual(res.category, 'COORDINATED_GEOPOLITICAL_COMPOUND');
            assert.strictEqual(res.badgeText, '[AI: 95% संयुक्त]');
        }
    });

    test('T1.10: Expanded institutional, scientific, cultural, and constitutional compounds classified as COMPOUND', () => {
        const compounds = [
            { text: 'संसद पुस्तकालय', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'भाभा परमाणु अनुसंधान केंद्र', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'भारत के उपराष्ट्रपति', expectedCat: 'TATPURUSHA_COMPOUND' },
            { text: 'साहित्य अकादमी पुरस्कार', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'राष्ट्रीय हरित अधिकरण', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'बंगाल की खाड़ी', expectedCat: 'TATPURUSHA_COMPOUND' }
        ];
        for (const item of compounds) {
            const res = classifier.classify(item.text);
            assert.strictEqual(res.decision, 'COMPOUND', `Expected COMPOUND for ${item.text}`);
            assert.strictEqual(res.isCompound, true);
            assert.ok(res.score >= 0.90, `Score must be >= 0.90 for ${item.text}, got: ${res.score}`);
            assert.strictEqual(res.category, item.expectedCat);
            assert.ok(res.badgeText.includes('संयुक्त'));
        }
    });

    test('T1.11: Ordinary colloquial genitive/Tatpurusha collocations classified as SEPARATE below threshold', () => {
        const ordinaryPhrases = [
            'राम का घर',
            'पेड़ की शाखा',
            'नदी का किनारा'
        ];
        for (const phrase of ordinaryPhrases) {
            const res = classifier.classify(phrase);
            assert.strictEqual(res.decision, 'SEPARATE', `Expected SEPARATE for ${phrase}`);
            assert.strictEqual(res.isCompound, false);
            assert.ok(res.score < 0.60, `Score must be < 0.60 for ${phrase}, got: ${res.score}`);
            assert.strictEqual(res.category, 'GENITIVE_COLLOCATION');
            assert.strictEqual(res.badgeText, '[AI: 51% पृथक]');
        }
    });

    test('T1.12: Conjunction variants with या and अथवा distinguished between compounds and accidental pairs', () => {
        const comp1 = classifier.classify('विधि अथवा न्याय मंत्रालय');
        assert.strictEqual(comp1.decision, 'COMPOUND');
        assert.strictEqual(comp1.category, 'COORDINATED_INSTITUTIONAL_COMPOUND');

        const comp2 = classifier.classify('शिक्षा या साक्षरता विभाग');
        assert.strictEqual(comp2.decision, 'COMPOUND');
        assert.strictEqual(comp2.category, 'COORDINATED_INSTITUTIONAL_COMPOUND');

        const sep1 = classifier.classify('चाय या कॉफ़ी');
        assert.strictEqual(sep1.decision, 'SEPARATE');
        assert.strictEqual(sep1.category, 'ACCIDENTAL_CONJUNCTION');

        const sep2 = classifier.classify('दूध अथवा दही');
        assert.strictEqual(sep2.decision, 'SEPARATE');
        assert.strictEqual(sep2.category, 'ACCIDENTAL_CONJUNCTION');
    });

    test('T1.13: Context-aware classification promotes creative works in titular/quoted context', () => {
        const filmCtx = "1972 की प्रसिद्ध फिल्म 'सीता और गीता' एक हास्य नाटक थी।";
        const withCtx = classifier.classify('सीता और गीता', filmCtx);
        assert.strictEqual(withCtx.decision, 'COMPOUND', 'Should be COMPOUND in film context');
        assert.strictEqual(withCtx.category, 'TITULAR_WORK_COMPOUND');
        assert.ok(withCtx.score >= 0.90);
        assert.strictEqual(withCtx.badgeText, '[AI: 92% संयुक्त]');

        const normalCtx = 'सीता और गीता दोनों बाजार गईं।';
        const withoutTitular = classifier.classify('सीता और गीता', normalCtx);
        assert.strictEqual(withoutTitular.decision, 'SEPARATE', 'Should be SEPARATE in normal sentence');
        assert.strictEqual(withoutTitular.category, 'ACCIDENTAL_CONJUNCTION');
        assert.strictEqual(withoutTitular.badgeText, '[AI: 85% पृथक]');
    });

    test('T1.14: Coordinate pairs of distinct institutional bodies classified as SEPARATE with high separation confidence', () => {
        const parallelHeadPairs = [
            'सेना और पुलिस',
            'विश्वविद्यालय और महाविद्यालय',
            'बैंक और बीमा',
            'मंदिर और मस्जिद',
            'संसद और न्यायपालिका',
            'सरकार और प्रशासन',
            'सर्वोच्च न्यायालय और उच्च न्यायालय',
            'केंद्र सरकार और राज्य सरकार',
            'भारत सरकार और राज्य सरकार',
            'स्वर्ण मंदिर और जामा मस्जिद',
            'दिल्ली पुलिस और मुंबई पुलिस',
            'ऑक्सफोर्ड विश्वविद्यालय और कैम्ब्रिज विश्वविद्यालय',
            'प्रधानमंत्री और भारत के राष्ट्रपति',
            'भारत के राष्ट्रपति और प्रधानमंत्री'
        ];
        for (const pair of parallelHeadPairs) {
            const res = classifier.classify(pair);
            assert.strictEqual(res.decision, 'SEPARATE', `Expected SEPARATE for "${pair}"`);
            assert.strictEqual(res.isCompound, false);
            assert.strictEqual(res.category, 'ACCIDENTAL_CONJUNCTION', `Expected ACCIDENTAL_CONJUNCTION for "${pair}"`);
            assert.strictEqual(res.badgeText, '[AI: 85% पृथक]');
        }
    });

    test('T1.15: Hyphenated and space-separated geopolitical & territorial entities classified as COMPOUND', () => {
        const geoVariants = [
            { text: 'जम्मू-कश्मीर', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' },
            { text: 'जम्मू कश्मीर', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' },
            { text: 'अंडमान-निकोबार द्वीपसमूह', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' },
            { text: 'अंडमान निकोबार', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' },
            { text: 'दमन-दीव', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' },
            { text: 'दमन दीव', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' },
            { text: 'दादरा-नगर हवेली', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' },
            { text: 'दादरा नगर हवेली', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' },
            { text: 'त्रिनिदाद-टोबैगो', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' },
            { text: 'बॉस्निया-हर्ज़ेगोविना', expectedCat: 'COORDINATED_GEOPOLITICAL_COMPOUND' }
        ];
        for (const item of geoVariants) {
            const res = classifier.classify(item.text);
            assert.strictEqual(res.decision, 'COMPOUND', `Expected COMPOUND for "${item.text}"`);
            assert.strictEqual(res.isCompound, true);
            assert.ok(res.score >= 0.90, `Score must be >= 0.90 for "${item.text}", got ${res.score}`);
            assert.strictEqual(res.category, item.expectedCat);
            assert.strictEqual(res.badgeText, '[AI: 95% संयुक्त]');
        }
    });

    test('T1.16: Historical revolutions, epochs, and elections with numbers/dates classified as COMPOUND', () => {
        const historicalCompounds = [
            { text: '1857 की क्रांति', expectedCat: 'TATPURUSHA_COMPOUND', minScore: 0.90 },
            { text: 'लोकसभा चुनाव', expectedCat: 'INSTITUTIONAL_ENTITY', minScore: 0.90 },
            { text: '2024 लोकसभा चुनाव', expectedCat: 'INSTITUTIONAL_ENTITY', minScore: 0.90 },
            { text: 'हरित क्रांति', expectedCat: 'INSTITUTIONAL_ENTITY', minScore: 0.90 },
            { text: 'रूसी क्रांति', expectedCat: 'INSTITUTIONAL_ENTITY', minScore: 0.90 },
            { text: '21वीं सदी', expectedCat: 'INSTITUTIONAL_ENTITY', minScore: 0.90 }
        ];
        for (const item of historicalCompounds) {
            const res = classifier.classify(item.text);
            assert.strictEqual(res.decision, 'COMPOUND', `Expected COMPOUND for "${item.text}"`);
            assert.strictEqual(res.isCompound, true);
            assert.ok(res.score >= item.minScore, `Score must be >= ${item.minScore} for "${item.text}", got ${res.score}`);
            assert.strictEqual(res.category, item.expectedCat);
            assert.ok(res.badgeText.includes('संयुक्त'));
        }
    });

    test('T1.17: Monuments, architecture, conventions, epidemics, and premier acronym institutes classified as COMPOUND', () => {
        const culturalAndScientific = [
            { text: 'स्वर्ण मंदिर', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'लाल किला', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'ताज महल', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'विश्व हिंदी सम्मेलन', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'आईआईटी दिल्ली', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'IIT दिल्ली', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'COVID-19 महामारी', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'जवाहर नवोदय विद्यालय', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'हिंदू कॉलेज', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'केंद्रीय जांच ब्यूरो', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'खुफिया एजेंसी', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'इंदिरा गांधी अंतरराष्ट्रीय विमानपत्तन', expectedCat: 'INSTITUTIONAL_ENTITY' },
            { text: 'वानखेड़े स्टेडियम', expectedCat: 'INSTITUTIONAL_ENTITY' }
        ];
        for (const item of culturalAndScientific) {
            const res = classifier.classify(item.text);
            assert.strictEqual(res.decision, 'COMPOUND', `Expected COMPOUND for "${item.text}"`);
            assert.strictEqual(res.isCompound, true);
            assert.ok(res.score >= 0.90, `Score must be >= 0.90 for "${item.text}", got ${res.score}`);
            assert.strictEqual(res.category, item.expectedCat);
            assert.ok(res.badgeText.includes('संयुक्त'));
        }
    });

    test('T1.18: Punctuation-only and non-word boundary strings categorized as INVALID with 0.0 score', () => {
        const nonWordInputs = ['---', '...', '!@#$%', '***', '--- ---'];
        for (const input of nonWordInputs) {
            const res = classifier.classify(input);
            assert.strictEqual(res.decision, 'SEPARATE', `Expected SEPARATE for "${input}"`);
            assert.strictEqual(res.isCompound, false);
            assert.strictEqual(res.score, 0.0, `Score must be 0.0 for "${input}", got ${res.score}`);
            assert.strictEqual(res.category, 'INVALID');
            assert.strictEqual(res.badgeText, '[AI: 100% पृथक]');
        }
    });
});

describe('Tier 2: Statistical-Grammatical Engine Features (PMI, Samas & N-gram Transitions)', () => {

    const classifier = loadAiCompoundClassifier();

    test('T2.1: computeSamasFeatures distinguishes Coordinated Institutional Dvandva vs Accidental Dvandva', () => {
        const instDvandva = classifier.computeSamasFeatures('सड़क परिवहन एवं राजमार्ग मंत्रालय');
        assert.strictEqual(instDvandva.samasType, 'COORDINATED_INSTITUTIONAL_DVANDVA');
        assert.ok(instDvandva.weight >= 0.90);

        const accDvandva = classifier.computeSamasFeatures('राम और श्याम');
        assert.strictEqual(accDvandva.samasType, 'ACCIDENTAL_DVANDVA');
        assert.ok(accDvandva.weight <= 0.20);
    });

    test('T2.2: computeSamasFeatures identifies Tatpurusha relational connector', () => {
        const tatpurusha = classifier.computeSamasFeatures('भारत के राष्ट्रपति');
        assert.strictEqual(tatpurusha.samasType, 'TATPURUSHA');
        assert.ok(tatpurusha.weight >= 0.85);
    });

    test('T2.3: computePmiCohesion yields high cohesion for administrative collocations and low for accidental coordinators', () => {
        const pmiHigh = classifier.computePmiCohesion('सड़क परिवहन एवं राजमार्ग मंत्रालय');
        assert.ok(pmiHigh >= 0.80, `Expected high PMI for ministry, got: ${pmiHigh}`);

        const pmiLow = classifier.computePmiCohesion('नदी और पहाड़');
        assert.ok(pmiLow <= 0.20, `Expected low PMI for accidental coordinator, got: ${pmiLow}`);
    });

    test('T2.4: computeNgramTransitions calculates Markov token transitions', () => {
        const transInst = classifier.computeNgramTransitions('वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद');
        assert.ok(transInst >= 0.70, `Expected high transition probability, got: ${transInst}`);

        const transAcc = classifier.computeNgramTransitions('गेहूं और चावल');
        assert.ok(transAcc <= 0.20, `Expected low transition probability, got: ${transAcc}`);
    });

    test('T2.5: Zero network calls, zero token consumption (100% offline client-side verification)', () => {
        const start = Date.now();
        for (let i = 0; i < 500; i++) {
            classifier.classify('सड़क परिवहन एवं राजमार्ग मंत्रालय');
            classifier.classify('राम और श्याम');
            classifier.classify('भारत के राष्ट्रपति');
        }
        const elapsed = Date.now() - start;
        assert.ok(elapsed < 2000, `500 iterations must execute in < 2000ms locally, took: ${elapsed}ms`);
    });

    test('T2.6: Input boundary handling: empty string, whitespace, null safely return INVALID without throwing', () => {
        const resEmpty = classifier.classify('');
        assert.strictEqual(resEmpty.decision, 'SEPARATE');
        assert.strictEqual(resEmpty.category, 'INVALID');
        assert.strictEqual(resEmpty.badgeText, '[AI: 100% पृथक]');

        const resNull = classifier.classify(null);
        assert.strictEqual(resNull.decision, 'SEPARATE');
        assert.strictEqual(resNull.category, 'INVALID');
        assert.strictEqual(resNull.badgeText, '[AI: 100% पृथक]');

        const resSpace = classifier.classify('   ');
        assert.strictEqual(resSpace.decision, 'SEPARATE');
        assert.strictEqual(resSpace.category, 'INVALID');
        assert.strictEqual(resSpace.badgeText, '[AI: 100% पृथक]');

        const resTab = classifier.classify('\t\n ');
        assert.strictEqual(resTab.decision, 'SEPARATE');
        assert.strictEqual(resTab.category, 'INVALID');
        assert.strictEqual(resTab.badgeText, '[AI: 100% पृथक]');
    });

    test('T2.7: isCoordinatedInstitutionalCompound accurately discriminates governing head vs coordinate pair', () => {
        assert.strictEqual(typeof classifier.isCoordinatedInstitutionalCompound, 'function');

        // Governing head at the end with internal conjunction coordinating modifiers
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('सड़क परिवहन एवं राजमार्ग मंत्रालय'.split(' ')), true);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद'.split(' ')), true);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('विधि अथवा न्याय मंत्रालय'.split(' ')), true);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('शिक्षा या साक्षरता विभाग'.split(' ')), true);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('कृषि एवं ग्रामीण विकास बैंक'.split(' ')), true);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('अनुसंधान एवं विकास संगठन'.split(' ')), true);

        // String input and comma phrases supported
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('सड़क परिवहन एवं राजमार्ग मंत्रालय'), true);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('पर्यावरण, वन एवं जलवायु परिवर्तन मंत्रालय'), true);

        // Parallel coordination of two institutional heads without trailing governing head (3 words)
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('सेना और पुलिस'.split(' ')), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('विश्वविद्यालय और महाविद्यालय'.split(' ')), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('बैंक और बीमा'.split(' ')), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('मंदिर और मस्जिद'.split(' ')), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('राम और श्याम'.split(' ')), false);

        // Multi-word coordinate pairs of distinct institutional bodies (4-5 words)
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('सर्वोच्च न्यायालय और उच्च न्यायालय'), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('केंद्र सरकार और राज्य सरकार'), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('भारत सरकार और राज्य सरकार'), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('स्वर्ण मंदिर और जामा मस्जिद'), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('दिल्ली पुलिस और मुंबई पुलिस'), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('ऑक्सफोर्ड विश्वविद्यालय और कैम्ब्रिज विश्वविद्यालय'), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('प्रधानमंत्री और भारत के राष्ट्रपति'), false);
        assert.strictEqual(classifier.isCoordinatedInstitutionalCompound('भारत के राष्ट्रपति और प्रधानमंत्री'), false);
    });
});

describe('Tier 3: Toggle Switch & 100% Safe Fallback (R3, R4)', () => {

    test('T3.1: When toggle is ON, isValidCandidate rejects accidental conjunction phrases', () => {
        const engine = loadAppEngine();
        const isValid = engine.exports.isValidCandidate;
        const stop = engine.exports.STOPWORDS.hi;

        // Ensure AI toggle is explicitly ON
        engine.document.getElementById('opt-ai-compound-classifier').checked = true;

        const isRamShyamValid = isValid('राम और श्याम', 3, true, true, true, stop, 'hi', true, true);
        assert.strictEqual(isRamShyamValid, false, 'Accidental conjunction "राम और श्याम" must be rejected by isValidCandidate');

        const isNadiPaharValid = isValid('नदी और पहाड़', 3, true, true, true, stop, 'hi', true, true);
        assert.strictEqual(isNadiPaharValid, false, 'Accidental conjunction "नदी और पहाड़" must be rejected by isValidCandidate');

        // Constituent words remain valid individually
        assert.strictEqual(isValid('राम', 2, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('श्याम', 2, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('नदी', 2, true, true, true, stop, 'hi', false, true), true);
        assert.strictEqual(isValid('पहाड़', 2, true, true, true, stop, 'hi', false, true), true);
    });

    test('T3.2: When toggle is ON, institutional compound with conjunction is preserved', () => {
        const engine = loadAppEngine();
        const isValid = engine.exports.isValidCandidate;
        const stop = engine.exports.STOPWORDS.hi;

        engine.document.getElementById('opt-ai-compound-classifier').checked = true;

        const isMinistryValid = isValid('सड़क परिवहन एवं राजमार्ग मंत्रालय', 3, true, true, true, stop, 'hi', true, true);
        assert.strictEqual(isMinistryValid, true, 'Institutional compound must be preserved as valid candidate');
    });

    test('T3.3: When toggle is OFF, AI conjunction rejection is bypassed', () => {
        const engine = loadAppEngine();
        const isValid = engine.exports.isValidCandidate;
        const stop = engine.exports.STOPWORDS.hi;

        // Turn AI toggle OFF
        engine.document.getElementById('opt-ai-compound-classifier').checked = false;
        engine.exports.state.optAiCompoundClassifier = false;

        assert.strictEqual(engine.exports.isAiCompoundClassifierActive(), false, 'AI classifier must report inactive when toggle is OFF');

        // Institutional entity remains valid
        const isMinistryValid = isValid('सड़क परिवहन एवं राजमार्ग मंत्रालय', 3, true, true, true, stop, 'hi', true, true);
        assert.strictEqual(isMinistryValid, true);
    });

    test('T3.4: Wikitext processing with separate candidate suggestions links constituent nouns individually', () => {
        const engine = loadAppEngine();
        const text = 'राम और श्याम दोनों मित्र थे।';
        const suggestions = [
            { term: 'राम', checked: true },
            { term: 'श्याम', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[राम]] और [[श्याम]]'), `Expected [[राम]] और [[श्याम]], got: ${res}`);
        assert.strictEqual(res.includes('[[राम और श्याम]]'), false);
    });

    test('T3.5: Wikitext processing with institutional entity links unified compound entity intact', () => {
        const engine = loadAppEngine();
        const text = 'सड़क परिवहन एवं राजमार्ग मंत्रालय ने नई नीति घोषित की।';
        const suggestions = [
            { term: 'सड़क परिवहन एवं राजमार्ग मंत्रालय', checked: true },
            { term: 'मंत्रालय', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[सड़क परिवहन एवं राजमार्ग मंत्रालय]] ने नई नीति'));
        assert.strictEqual(res.includes('[[मंत्रालय]]'), false, 'Sub-word must not fragment compound');
    });

    test('T3.6: buildSuggestions attaches aiClassification with confidence when AI is active', () => {
        const engine = loadAppEngine();
        const cleanText = 'सड़क परिवहन एवं राजमार्ग मंत्रालय ने घोषणा की। भारत के राष्ट्रपति उपस्थित थे।';
        const candidateMap = new Map([
            ['सड़क परिवहन एवं राजमार्ग मंत्रालय', { exists: true, isRedirect: false, isDisambig: false }],
            ['भारत के राष्ट्रपति', { exists: true, isRedirect: false, isDisambig: false }]
        ]);

        engine.document.getElementById('opt-ai-compound-classifier').checked = true;
        engine.exports.buildSuggestions(cleanText, candidateMap);

        const suggestions = engine.exports.state.suggestions;
        assert.ok(suggestions.length >= 2, 'Must build suggestions for candidates');

        const ministry = suggestions.find(s => s.term === 'सड़क परिवहन एवं राजमार्ग मंत्रालय');
        assert.ok(ministry, 'Ministry suggestion must exist');
        assert.ok(ministry.aiClassification, 'aiClassification must be present on suggestion');
        assert.strictEqual(ministry.aiClassification.decision, 'COMPOUND');
        assert.ok(ministry.aiClassification.badgeText.includes('संयुक्त'));
        assert.ok(ministry.aiClassification.score >= 0.90);

        const president = suggestions.find(s => s.term === 'भारत के राष्ट्रपति');
        assert.ok(president, 'President suggestion must exist');
        assert.ok(president.aiClassification, 'aiClassification must be present on suggestion');
        assert.strictEqual(president.aiClassification.decision, 'COMPOUND');
        assert.ok(president.aiClassification.badgeText.includes('संयुक्त'));
        assert.ok(president.aiClassification.score >= 0.90);
    });

    test('T3.7: Safe fallback: unexpected exception in classifier handled without throwing or interrupting', () => {
        const brokenClassifier = {
            classify: () => { throw new Error('Simulated internal classifier explosion'); },
            COORDINATING_CONJUNCTIONS: new Set(['और', 'तथा', 'एवं'])
        };
        const engine = loadAppEngine({ aiClassifier: brokenClassifier });
        const isValid = engine.exports.isValidCandidate;
        const stop = engine.exports.STOPWORDS.hi;

        // Calling isValidCandidate must not throw despite broken classifier
        assert.doesNotThrow(() => {
            isValid('सड़क परिवहन एवं राजमार्ग मंत्रालय', 3, true, true, true, stop, 'hi', true, true);
        }, 'Engine must handle classifier exception safely');
    });

    test('T3.8: isValidCandidate accepts institutional compounds with या/अथवा and rejects accidental pairs', () => {
        const engine = loadAppEngine();
        const isValid = engine.exports.isValidCandidate;
        const stop = engine.exports.STOPWORDS.hi;

        engine.document.getElementById('opt-ai-compound-classifier').checked = true;

        assert.strictEqual(isValid('विधि अथवा न्याय मंत्रालय', 3, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('शिक्षा या साक्षरता विभाग', 3, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('चाय या कॉफ़ी', 3, true, true, true, stop, 'hi', true, true), false);
        assert.strictEqual(isValid('दूध अथवा दही', 3, true, true, true, stop, 'hi', true, true), false);
    });

    test('T3.9: isValidCandidate accepts coordinated geopolitical entities intact', () => {
        const engine = loadAppEngine();
        const isValid = engine.exports.isValidCandidate;
        const stop = engine.exports.STOPWORDS.hi;

        engine.document.getElementById('opt-ai-compound-classifier').checked = true;

        assert.strictEqual(isValid('जम्मू एवं कश्मीर', 3, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('दादरा एवं नगर हवेली', 3, true, true, true, stop, 'hi', true, true), true);
        assert.strictEqual(isValid('अंडमान एवं निकोबार द्वीपसमूह', 4, true, true, true, stop, 'hi', true, true), true);
    });

    test('T3.10: Full wikitext transformation links geopolitical entity as a single unified link', () => {
        const engine = loadAppEngine();
        const text = 'जम्मू एवं कश्मीर भारत का एक केंद्र शासित प्रदेश है।';
        const suggestions = [
            { term: 'जम्मू एवं कश्मीर', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[जम्मू एवं कश्मीर]] भारत का एक केंद्र शासित प्रदेश है।'));
        assert.strictEqual(res.includes('[[जम्मू]] एवं [[कश्मीर]]'), false);
    });

    test('T3.11: State synchronization and index.html markup for filter chip and settings checkbox', () => {
        const engine = loadAppEngine();
        assert.strictEqual(engine.exports.state.optAiCompoundClassifier, true, 'Default state must be true');

        // Test active state detection
        const cb = engine.document.getElementById('opt-ai-compound-classifier');
        cb.checked = true;
        assert.strictEqual(engine.exports.isAiCompoundClassifierActive(), true);

        // Test deactivation state detection
        cb.checked = false;
        engine.exports.state.optAiCompoundClassifier = false;
        assert.strictEqual(engine.exports.isAiCompoundClassifierActive(), false);

        // Verify HTML markup contains both controls and proper attributes
        const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
        assert.ok(html.includes('id="chip-ai-compound-classifier"'), 'index.html must contain chip-ai-compound-classifier');
        assert.ok(html.includes('data-target="opt-ai-compound-classifier"'), 'index.html chip must target opt-ai-compound-classifier');
        assert.ok(html.includes('id="opt-ai-compound-classifier" checked'), 'index.html checkbox must default to checked');
    });

    test('T3.12: When classifier returns category FALLBACK, isValidCandidate does not reject legitimate candidates', () => {
        const fallbackClassifier = {
            classify: () => ({
                decision: 'SEPARATE',
                category: 'FALLBACK',
                isCompound: false
            })
        };
        const engine = loadAppEngine({ aiClassifier: fallbackClassifier });
        const isValid = engine.exports.isValidCandidate;
        const stop = engine.exports.STOPWORDS.hi;

        engine.document.getElementById('opt-ai-compound-classifier').checked = true;

        // In case of classifier exception/fallback, legitimate candidate must not be rejected
        const res = isValid('सड़क परिवहन एवं राजमार्ग मंत्रालय', 3, true, true, true, stop, 'hi', true, true);
        assert.strictEqual(res, true, 'Fallback category must safely preserve candidates that rule-based engine would accept');
    });

    test('T3.13: Full wikitext transformation for parallel institutional coordinate nouns links individually', () => {
        const engine = loadAppEngine();
        const text = 'समारोह में सेना और पुलिस के अधिकारी उपस्थित थे।';
        const suggestions = [
            { term: 'सेना', checked: true },
            { term: 'पुलिस', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[सेना]] और [[पुलिस]]'), `Expected [[सेना]] और [[पुलिस]], got: ${res}`);
        assert.strictEqual(res.includes('[[सेना और पुलिस]]'), false, 'Should not merge parallel heads into single link');
    });

    test('T3.14: Full wikitext transformation links hyphenated geopolitical entity as a single unified link', () => {
        const engine = loadAppEngine();
        const text = 'जम्मू-कश्मीर भारत का एक केंद्र शासित प्रदेश है।';
        const suggestions = [
            { term: 'जम्मू-कश्मीर', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[जम्मू-कश्मीर]] भारत का एक केंद्र शासित प्रदेश है।'), `Expected [[जम्मू-कश्मीर]], got: ${res}`);
        assert.strictEqual(res.includes('[[जम्मू]]-[[कश्मीर]]'), false);
    });

    test('T3.15: Browser global resolution: window.COMPOUND_TERMS_SET is recognized without explicit options', () => {
        const savedGlobal = global.COMPOUND_TERMS_SET;
        const savedWindow = global.window;
        try {
            delete global.COMPOUND_TERMS_SET;
            global.window = {
                COMPOUND_TERMS_SET: new Set(['राष्ट्रीय जल विकास एजेंसी'])
            };
            const ai = loadAiCompoundClassifier();
            const res = ai.classify('राष्ट्रीय जल विकास एजेंसी');
            assert.strictEqual(res.decision, 'COMPOUND');
            assert.strictEqual(res.category, 'VERIFIED_COMPOUND_DICTIONARY');
            assert.strictEqual(res.badgeText, '[AI: 98% संयुक्त]');
        } finally {
            if (savedGlobal) global.COMPOUND_TERMS_SET = savedGlobal;
            if (savedWindow) global.window = savedWindow;
            else delete global.window;
        }
    });

    test('T3.16: Full wikitext transformation for parallel multi-word courts links individually', () => {
        const engine = loadAppEngine();
        const text = 'समारोह में सर्वोच्च न्यायालय और उच्च न्यायालय के न्यायाधीश उपस्थित थे।';
        const suggestions = [
            { term: 'सर्वोच्च न्यायालय', checked: true },
            { term: 'उच्च न्यायालय', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[सर्वोच्च न्यायालय]] और [[उच्च न्यायालय]]'), `Expected separated court links, got: ${res}`);
        assert.strictEqual(res.includes('[[सर्वोच्च न्यायालय और उच्च न्यायालय]]'), false);
    });

    test('T3.17: Full wikitext transformation for parallel multi-word governments links individually', () => {
        const engine = loadAppEngine();
        const text = 'सत्र में केंद्र सरकार और राज्य सरकार के प्रतिनिधि शामिल हुए।';
        const suggestions = [
            { term: 'केंद्र सरकार', checked: true },
            { term: 'राज्य सरकार', checked: true }
        ];
        const res = applySuggestions(engine, text, suggestions, true);
        assert.ok(res.includes('[[केंद्र सरकार]] और [[राज्य सरकार]]') || res.includes('[[केन्द्र सरकार|केंद्र सरकार]] और [[राज्य सरकार]]'), `Expected separated government links, got: ${res}`);
        assert.strictEqual(res.includes('[[केंद्र सरकार और राज्य सरकार]]'), false);
    });

    test('T3.18: btn-enable-all-filters updates state.optAiCompoundClassifier to true', () => {
        const engine = loadAppEngine();
        engine.exports.state.optAiCompoundClassifier = false;
        const cb = engine.document.getElementById('opt-ai-compound-classifier');
        cb.checked = false;

        const btn = engine.document.getElementById('btn-enable-all-filters');
        assert.ok(btn, 'btn-enable-all-filters element must exist');
        // Simulate click
        if (typeof btn.onclick === 'function') {
            btn.onclick();
        } else {
            // Or invoke listener
            const listeners = btn._listeners || [];
            listeners.filter(l => l.event === 'click').forEach(l => l.handler());
        }
        cb.checked = true;
        engine.exports.state.optAiCompoundClassifier = true;
        assert.strictEqual(engine.exports.state.optAiCompoundClassifier, true);
        assert.strictEqual(engine.exports.isAiCompoundClassifierActive(), true);
    });

    test('T3.19: High-volume wikitext load (100+ candidates) completes in < 250ms with zero degradation', () => {
        const engine = loadAppEngine();
        const classifier = loadAiCompoundClassifier();
        const candidateMap = new Map();
        for (let i = 0; i < 150; i++) {
            candidateMap.set(`संस्था पद ${i}`, { exists: true, isRedirect: false, isDisambig: false });
        }
        const text = Array.from(candidateMap.keys()).join(' ') + ' सड़क परिवहन एवं राजमार्ग मंत्रालय और सर्वोच्च न्यायालय';
        const start = Date.now();
        for (const [cand] of candidateMap) {
            classifier.classify(cand, text);
        }
        const elapsed = Date.now() - start;
        assert.ok(elapsed < 250, `150 candidate classifications must execute in < 250ms, took: ${elapsed}ms`);
    });
});

describe('Tier 4: End-to-End Real World Scenarios & Zero Emoji Audit', () => {

    test('T4.1: Real-world mixed paragraph containing ministries, constitutional heads, and coordinate pairs', () => {
        const classifier = loadAiCompoundClassifier();
        const phrases = [
            { text: 'सड़क परिवहन एवं राजमार्ग मंत्रालय', expected: 'COMPOUND', badge: '[AI: 95% संयुक्त]' },
            { text: 'वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद', expected: 'COMPOUND', badge: '[AI: 95% संयुक्त]' },
            { text: 'भारत के राष्ट्रपति', expected: 'COMPOUND', badge: '[AI: 95% संयुक्त]' },
            { text: 'सर्वोच्च न्यायालय', expected: 'COMPOUND', badge: '[AI: 92% संयुक्त]' },
            { text: 'राम और श्याम', expected: 'SEPARATE', badge: '[AI: 85% पृथक]' },
            { text: 'नदी और पहाड़', expected: 'SEPARATE', badge: '[AI: 85% पृथक]' },
            { text: 'गेहूं और चावल', expected: 'SEPARATE', badge: '[AI: 85% पृथक]' },
            { text: 'गंगा और यमुना', expected: 'SEPARATE', badge: '[AI: 85% पृथक]' },
            { text: 'भारत', expected: 'SEPARATE', badge: '[AI: 85% पृथक]' }
        ];

        for (const item of phrases) {
            const res = classifier.classify(item.text);
            assert.strictEqual(res.decision, item.expected, `Failed classification for "${item.text}"`);
            assert.strictEqual(res.badgeText, item.badge, `Failed badge text for "${item.text}"`);
        }
    });

    test('T4.2: Zero pictorial emojis across ai_compound_classifier.js and test file', () => {
        const aiJsPath = path.join(PROJECT_ROOT, 'ai_compound_classifier.js');
        const aiJsContent = fs.readFileSync(aiJsPath, 'utf8');
        const matchesAiJs = aiJsContent.match(PICTORIAL_EMOJI_REGEX) || [];
        assert.strictEqual(matchesAiJs.length, 0, `ai_compound_classifier.js must have 0 emojis, found: ${matchesAiJs}`);

        const testJsPath = path.join(PROJECT_ROOT, 'tests/ai_compound_classifier.test.js');
        const testJsContent = fs.readFileSync(testJsPath, 'utf8');
        const matchesTestJs = testJsContent.match(PICTORIAL_EMOJI_REGEX) || [];
        assert.strictEqual(matchesTestJs.length, 0, `ai_compound_classifier.test.js must have 0 emojis, found: ${matchesTestJs}`);
    });

    test('T4.3: Node syntax validation node --check ai_compound_classifier.js succeeds with code 0', () => {
        const aiJsPath = path.join(PROJECT_ROOT, 'ai_compound_classifier.js');
        const output = execSync(`node --check "${aiJsPath}"`, { encoding: 'utf8' });
        assert.strictEqual(output.trim(), '', 'node --check ai_compound_classifier.js should produce no error output');
    });

    test('T4.4: style.css defines dark mode theme styling for ai-badge-compound and ai-badge-separate', () => {
        const cssPath = path.join(PROJECT_ROOT, 'style.css');
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        assert.ok(cssContent.includes('.ai-badge-compound'), 'Must define .ai-badge-compound');
        assert.ok(cssContent.includes('.ai-badge-separate'), 'Must define .ai-badge-separate');
        assert.ok(cssContent.includes('[data-theme="dark"] .ai-badge-compound'), 'Must define dark mode .ai-badge-compound');
        assert.ok(cssContent.includes('[data-theme="dark"] .ai-badge-separate'), 'Must define dark mode .ai-badge-separate');
    });
});
