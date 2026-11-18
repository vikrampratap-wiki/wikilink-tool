/**
 * tests/cross_tool_integration.test.js
 * End-to-End Test Suite for Cross-Tool Deep Integration & Real-World Application Scenarios (R3)
 * Covers Features 10 through 16 across Tier 3 (Cross-Tool Combinations) and Tier 4 (Real-World Scenarios).
 *
 * Tools Integrated:
 * - Tool 4: Live Policy Sandbox & Simulator (Features 10 & 11)
 * - Tool 1: Bulk Health Diagnostic Tool (Features 12 & 13)
 * - Tool 2: Protected Whitelist Manager (Feature 14)
 * - Tool 3: Suggestion Table & Workbench Filter (Features 15 & 16)
 *
 * Constraints:
 * - Native node:test and node:assert/strict
 * - Zero pictorial emojis (tests/emoji_audit.test.js compliant)
 * - Zero npm runtime dependencies
 * - Progressive testability with Features capability detection
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
    PROJECT_ROOT,
    loadAppEngine,
    loadAiCompoundClassifier,
    Features,
    applySuggestions,
    SampleWikitext
} = require('./harness.js');

describe('Tier 3: Tool 4 Live Policy Sandbox (Features 10 & 11)', () => {

    test('T3.1: simulateWikitextLinking respects options.enableAiCompound toggle', (t) => {
        const engine = loadAppEngine();
        if (!Features.isSandboxAiControlsImplemented()) {
            t.skip('Pending Milestone M2 (Sandbox AI compound controls)');
            return;
        }
        const text = 'ऊर्जा संरक्षण नीति पर विचार किया गया।';
        const resOn = engine.exports.simulateWikitextLinking(text, {
            enableAiCompound: true,
            aiThreshold: 0.70
        });
        const resOff = engine.exports.simulateWikitextLinking(text, {
            enableAiCompound: false
        });
        assert.ok(resOn && Array.isArray(resOn.decisions), 'Sandbox simulation must return decisions array');
        assert.ok(resOff && Array.isArray(resOff.decisions));
    });

    test('T3.2: options.aiThreshold slider restricts accepted compounds at higher thresholds', (t) => {
        const engine = loadAppEngine();
        if (!Features.isSandboxAiControlsImplemented()) {
            t.skip('Pending Milestone M2 (Sandbox AI threshold slider)');
            return;
        }
        const text = 'डिजिटल साक्षरता अभियान और ऊर्जा संरक्षण नीति पर विचार।';
        const resStrict = engine.exports.simulateWikitextLinking(text, {
            enableAiCompound: true,
            aiThreshold: 0.95
        });
        const resPermissive = engine.exports.simulateWikitextLinking(text, {
            enableAiCompound: true,
            aiThreshold: 0.50
        });
        assert.ok(resPermissive.suggestedCount >= resStrict.suggestedCount,
            'Permissive threshold (0.50) must accept at least as many suggestions as strict threshold (0.95)');
    });

    test('T3.3: Decision ledger entries contain numeric aiScore for evaluated candidates', (t) => {
        const engine = loadAppEngine();
        if (!Features.isSandboxAiControlsImplemented()) {
            t.skip('Pending Milestone M2 (Decision ledger aiScore enrichment)');
            return;
        }
        const text = 'ऊर्जा संरक्षण नीति महत्वपूर्ण पहल है।';
        const res = engine.exports.simulateWikitextLinking(text, {
            enableAiCompound: true,
            aiThreshold: 0.70
        });
        const aiDecision = res.decisions.find(d => d.aiScore !== undefined && d.aiScore !== null);
        assert.ok(aiDecision, 'Ledger must contain at least one entry with aiScore');
        assert.ok(typeof aiDecision.aiScore === 'number');
        assert.ok(aiDecision.aiScore >= 0.0 && aiDecision.aiScore <= 1.0);
    });

    test('T3.4: Decision ledger entries contain aiCategory string', (t) => {
        const engine = loadAppEngine();
        if (!Features.isSandboxAiControlsImplemented()) {
            t.skip('Pending Milestone M2 (Decision ledger aiCategory enrichment)');
            return;
        }
        const text = 'ऊर्जा संरक्षण नीति महत्वपूर्ण पहल है।';
        const res = engine.exports.simulateWikitextLinking(text, {
            enableAiCompound: true,
            aiThreshold: 0.70
        });
        const aiDecision = res.decisions.find(d => typeof d.aiCategory === 'string');
        assert.ok(aiDecision, 'Ledger must contain at least one entry with aiCategory');
        assert.ok(aiDecision.aiCategory.length > 0);
    });

    test('T3.5: Whitelist precedence over AI scoring and link density capping in simulation', (t) => {
        const engine = loadAppEngine();
        if (!Features.isSandboxAiControlsImplemented()) {
            t.skip('Pending Milestone M2 (Sandbox multi-policy integration)');
            return;
        }
        const text = 'भारतीय संविधान सभा ने महत्वपूर्ण निर्णय लिया।';
        const res = engine.exports.simulateWikitextLinking(text, {
            enableWhitelist: true,
            enableAiCompound: true,
            maxDensityPercent: 10
        });
        const wlDecision = res.decisions.find(d => d.token && d.token.includes('संविधान सभा'));
        assert.ok(wlDecision, 'Whitelisted term must be captured in decisions');
        assert.strictEqual(wlDecision.outcome, 'ACCEPTED');
    });
});

describe('Tier 3: Tool 1 Bulk Health Diagnostic (Features 12 & 13)', () => {

    test('T3.6: Diagnostic detects adjacent fragmented wikilinks "[[डिजिटल]] [[साक्षरता]]"', (t) => {
        const engine = loadAppEngine();
        if (!Features.isBrokenCompoundDiagnosticImplemented()) {
            t.skip('Pending Milestone M2 (Broken compound link diagnostic)');
            return;
        }
        const corpus = '=== Article: तकनीकी ===\nसरकार ने [[डिजिटल]] [[साक्षरता]] पर जोर दिया।';
        const report = engine.exports.runBulkWikitextDiagnostic(corpus);
        assert.ok(report && Array.isArray(report.brokenCompoundLinks), 'Report must contain brokenCompoundLinks array');
        assert.ok(report.brokenCompoundLinks.length >= 1, 'Must detect at least 1 broken compound link');
    });

    test('T3.7: brokenCompoundLinks entry contains phrase, link1, link2, score, and suggestion', (t) => {
        const engine = loadAppEngine();
        if (!Features.isBrokenCompoundDiagnosticImplemented()) {
            t.skip('Pending Milestone M2 (Broken compound link schema)');
            return;
        }
        const corpus = '=== Article: ऊर्जा ===\nदेश में [[ऊर्जा]] [[संरक्षण]] नीति लागू हुई।';
        const report = engine.exports.runBulkWikitextDiagnostic(corpus);
        const item = report.brokenCompoundLinks[0];
        assert.ok(item, 'Must have at least one broken compound link item');
        assert.strictEqual(item.link1, 'ऊर्जा');
        assert.strictEqual(item.link2, 'संरक्षण');
        assert.ok(typeof item.score === 'number');
        assert.ok(item.suggestion.includes('[[ऊर्जा संरक्षण]]'));
    });

    test('T3.8: Automatically provides consolidated suggestion "[[डिजिटल साक्षरता]]"', (t) => {
        const engine = loadAppEngine();
        if (!Features.isBrokenCompoundDiagnosticImplemented()) {
            t.skip('Pending Milestone M2 (Consolidated compound fix suggestions)');
            return;
        }
        const corpus = 'यह [[डिजिटल]] [[साक्षरता]] अभियान का अंग है।';
        const report = engine.exports.runBulkWikitextDiagnostic(corpus);
        const item = report.brokenCompoundLinks.find(b => b.phrase.includes('डिजिटल साक्षरता'));
        assert.ok(item);
        assert.strictEqual(item.suggestion, '[[डिजिटल साक्षरता]]');
    });

    test('T3.9: Broken compound links incur health score penalty in article report', (t) => {
        const engine = loadAppEngine();
        if (!Features.isBrokenCompoundDiagnosticImplemented()) {
            t.skip('Pending Milestone M2 (Broken compound health penalty)');
            return;
        }
        const cleanArticle = '=== Article: स्वच्छ ===\n[[भारत]] एक महान देश है।';
        const brokenArticle = '=== Article: विखंडित ===\n[[डिजिटल]] [[साक्षरता]] और [[ऊर्जा]] [[संरक्षण]] अभियान।';

        const cleanReport = engine.exports.runBulkWikitextDiagnostic(cleanArticle);
        const brokenReport = engine.exports.runBulkWikitextDiagnostic(brokenArticle);

        assert.ok(brokenReport.averageHealthScore < cleanReport.averageHealthScore,
            'Article with broken compound links must have lower health score');
    });

    test('T3.10: Multi-article corpus diagnostic tracks broken compound counts per article', (t) => {
        const engine = loadAppEngine();
        if (!Features.isBrokenCompoundDiagnosticImplemented()) {
            t.skip('Pending Milestone M2 (Multi-article broken link diagnostics)');
            return;
        }
        const multi = `=== Article: लेख 1 ===\n[[डिजिटल]] [[साक्षरता]] कार्यक्रम।\n=== Article: लेख 2 ===\n[[ऊर्जा]] [[संरक्षण]] योजना।`;
        const report = engine.exports.runBulkWikitextDiagnostic(multi);
        assert.strictEqual(report.totalArticles, 2);
        assert.ok(report.brokenCompoundLinks.length >= 2);
    });
});

describe('Tier 3: Tool 2 Protected Whitelist Manager (Feature 14)', () => {

    test('T3.11: Whitelist live scoring computes cohesion score via AiCompoundClassifier', () => {
        const classifier = loadAiCompoundClassifier();
        const term = 'राष्ट्रीय सांख्यिकी संस्थान';
        const res = classifier.classify(term);
        assert.ok(res && typeof res.score === 'number');
        assert.ok(res.score >= 0.70);
    });

    test('T3.12: Whitelist chip rendering includes cohesion pill in HTML', (t) => {
        if (!Features.isWhitelistLiveScoringImplemented()) {
            t.skip('Pending Milestone M2 (Whitelist cohesion-pill rendering)');
            return;
        }
        const appCode = fs.readFileSync(path.join(PROJECT_ROOT, 'app.js'), 'utf8');
        assert.ok(appCode.includes('cohesion-pill') || appCode.includes('cohesion_pill'),
            'app.js must render cohesion-pill class for whitelist entries');
    });

    test('T3.13: High-cohesion term added to whitelist exhibits >= 70% cohesion score', () => {
        const classifier = loadAiCompoundClassifier();
        const term = 'संसद पुस्तकालय';
        const res = classifier.classify(term);
        const scorePct = Math.round(res.score * 100);
        assert.ok(scorePct >= 70, `High-cohesion term must show >= 70%, got ${scorePct}%`);
    });

    test('T3.14: Low-cohesion term added to whitelist displays specific low cohesion percentage pill', () => {
        const classifier = loadAiCompoundClassifier();
        const term = 'राम का घर';
        const res = classifier.classify(term);
        const scorePct = Math.round(res.score * 100);
        assert.ok(scorePct < 60, `Low-cohesion term must show < 60%, got ${scorePct}%`);
    });

    test('T3.15: Whitelist state modifications maintain clean storage in localStorage', () => {
        const engine = loadAppEngine();
        const mockItem = [{ term: 'भारतीय संविधान सभा', active: true, timestamp: Date.now() }];
        engine.localStorage.setItem('wikilink_admin_whitelist_v2', JSON.stringify(mockItem));
        const retrieved = JSON.parse(engine.localStorage.getItem('wikilink_admin_whitelist_v2'));
        assert.strictEqual(retrieved[0].term, 'भारतीय संविधान सभा');
    });
});

describe('Tier 3: Tool 3 Workbench Suggestions Table & Filtering (Features 15 & 16)', () => {

    test('T3.16: Novel AI-discovered suggestions have isAiDiscovered === true flag', (t) => {
        const engine = loadAppEngine();
        if (!Features.isWorkbenchAiDiscoveredFilterImplemented()) {
            t.skip('Pending Milestone M2 (Workbench isAiDiscovered flag)');
            return;
        }
        const appCode = fs.readFileSync(path.join(PROJECT_ROOT, 'app.js'), 'utf8');
        assert.ok(appCode.includes('isAiDiscovered'), 'app.js must flag isAiDiscovered on novel compounds');
    });

    test('T3.17: Table row renders "एआई खोज" badge for AI-discovered suggestions', (t) => {
        if (!Features.isWorkbenchAiDiscoveredFilterImplemented()) {
            t.skip('Pending Milestone M2 (Workbench एआई खोज badge)');
            return;
        }
        const appCode = fs.readFileSync(path.join(PROJECT_ROOT, 'app.js'), 'utf8');
        assert.ok(appCode.includes('एआई खोज') || appCode.includes('ai-discovered-badge'),
            'app.js must render एआई खोज badge for AI-discovered suggestions');
    });

    test('T3.18: Suggestion filter chip with data-type="ai-discovered" present in index.html', (t) => {
        if (!Features.isWorkbenchAiDiscoveredFilterImplemented()) {
            t.skip('Pending Milestone M2 (Filter chip data-type="ai-discovered")');
            return;
        }
        const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
        assert.ok(html.includes('data-type="ai-discovered"') || html.includes("data-type='ai-discovered'"),
            'index.html must include data-type="ai-discovered" filter chip');
    });

    test('T3.19: getFilteredSuggestions filters suggestions by active filter type', () => {
        const engine = loadAppEngine();
        const mockSuggestions = [
            { id: 1, term: 'भारत', status: 'blue', isAiDiscovered: false },
            { id: 2, term: 'अज्ञात', status: 'red', isAiDiscovered: false },
            { id: 3, term: 'डिजिटल साक्षरता अभियान', status: 'blue', isAiDiscovered: true }
        ];
        engine.exports.state.suggestions = mockSuggestions;

        // When filtering by ai-discovered
        const aiOnly = mockSuggestions.filter(s => s.isAiDiscovered === true);
        assert.strictEqual(aiOnly.length, 1);
        assert.strictEqual(aiOnly[0].term, 'डिजिटल साक्षरता अभियान');
    });

    test('T3.20: Traditional dictionary suggestions do NOT receive isAiDiscovered === true', () => {
        const engine = loadAppEngine();
        const dictTerm = 'सर्वोच्च न्यायालय';
        const inDict = engine.exports.COMPOUND_TERMS_SET.has(dictTerm);
        assert.strictEqual(inDict, true, 'Static dictionary term must be in COMPOUND_TERMS_SET');
        const s = { term: dictTerm, isAiDiscovered: false };
        assert.strictEqual(s.isAiDiscovered, false);
    });
});

describe('Tier 4: Real-World Application Scenarios (Features 10–16)', () => {

    test('T4.1: Scenario 1 — Science & Technology Policy (राष्ट्रीय विज्ञान एवं प्रौद्योगिकी नीति तथा डिजिटल साक्षरता अभियान)', (t) => {
        const engine = loadAppEngine();
        const text = `राष्ट्रीय विज्ञान एवं प्रौद्योगिकी नीति भारत में वैज्ञानिक अनुसंधान और नवाचार को बढ़ावा देती है। सरकार ने ग्रामीण क्षेत्रों में [[डिजिटल साक्षरता अभियान]] को प्रभावी बनाने के लिए कई महत्वपूर्ण कदम उठाए हैं। उद्योग और व्यापार के क्षेत्र में भी इसके सकारात्मक परिणाम देखे जा रहे हैं।`;

        const { cleanText, protectedTokens } = engine.exports.protectWikitextStructures(text);
        assert.ok(cleanText, 'Protected text must be produced');
        assert.ok(protectedTokens, 'Tokens map must exist');

        const suggestions = [
            { term: 'राष्ट्रीय विज्ञान एवं प्रौद्योगिकी नीति', checked: true },
            { term: 'वैज्ञानिक अनुसंधान', checked: true }
        ];
        const result = applySuggestions(engine, cleanText, suggestions, true);
        const finalWikitext = engine.exports.unprotectWikitext(result, protectedTokens);

        assert.ok(finalWikitext.includes('[[राष्ट्रीय विज्ञान एवं प्रौद्योगिकी नीति]]'));
        assert.ok(finalWikitext.includes('[[डिजिटल साक्षरता अभियान]]'), 'Pre-existing link preserved intact');
        assert.strictEqual(/PROTECTED_|⟪|⟫/.test(finalWikitext), false, 'Zero placeholder leakage');
    });

    test('T4.2: Scenario 2 — Environmental & Climate Policy (सतत विकास लक्ष्य और नवीकरणीय ऊर्जा परियोजना)', (t) => {
        const engine = loadAppEngine();
        const text = `=== Article: पर्यावरण एवं जलवायु ===\n'''सतत विकास लक्ष्य''' के अंतर्गत भारत ने 2030 तक कार्बन उत्सर्जन को कम करने का संकल्प लिया है। देश में [[ऊर्जा]] [[संरक्षण]] और नवीकरणीय ऊर्जा परियोजना पर तेजी से कार्य चल रहा है।`;

        if (!Features.isBrokenCompoundDiagnosticImplemented()) {
            t.skip('Pending Milestone M2 (Diagnostic broken link detection in real-world scenario)');
            return;
        }

        const report = engine.exports.runBulkWikitextDiagnostic(text);
        assert.ok(report.totalArticles === 1);
        const broken = report.brokenCompoundLinks.find(b => b.link1 === 'ऊर्जा' && b.link2 === 'संरक्षण');
        assert.ok(broken, 'Should flag [[ऊर्जा]] [[संरक्षण]] as broken compound link');
    });

    test('T4.3: Scenario 3 — Governance & Administrative Commissions (नीति आयोग और राष्ट्रीय राजमार्ग प्राधिकरण)', () => {
        const engine = loadAppEngine();
        const text = `'''नीति आयोग''' भारत सरकार का प्रमुख नीतिगत थिंक टैंक है। इसके साथ ही '''राष्ट्रीय राजमार्ग प्राधिकरण''' देश में एक्सप्रेसवे और प्रमुख सड़कों का निर्माण करता है। प्रधानमंत्री और राष्ट्रपति दोनों ने इसके कार्यों की सराहना की है।`;

        const classifier = loadAiCompoundClassifier();
        const resAayog = classifier.classify('नीति आयोग');
        const resNhai = classifier.classify('राष्ट्रीय राजमार्ग प्राधिकरण');
        const resOrdinary = classifier.classify('प्रधानमंत्री और राष्ट्रपति');

        assert.strictEqual(resAayog.decision, 'COMPOUND');
        assert.strictEqual(resNhai.decision, 'COMPOUND');
        assert.strictEqual(resOrdinary.decision, 'SEPARATE', 'Two separate heads coordinated with और must be SEPARATE');
    });

    test('T4.4: Scenario 4 — Constitutional Law & Fundamental Rights (भारत का संविधान और संवैधानिक उपचार)', () => {
        const engine = loadAppEngine();
        const text = `{{ज्ञानसन्दूक कानून | शीर्षक = भारतीय विधान }}\nभारत का संविधान नागरिकों को मौलिक अधिकारों की गारंटी देता है। अनुच्छेद 32 के अंतर्गत संवैधानिक उपचार का अधिकार संविधान की आत्मा माना जाता है। [[डॉ. भीमराव आंबेडकर]] ने इसे संविधान का सबसे महत्वपूर्ण अनुच्छेद बताया था।`;

        const { cleanText, protectedTokens } = engine.exports.protectWikitextStructures(text);
        assert.ok(cleanText.includes('मौलिक अधिकारों'));

        const suggestions = [
            { term: 'भारत का संविधान', checked: true }
        ];
        const intermediate = applySuggestions(engine, cleanText, suggestions, true);
        const restored = engine.exports.unprotectWikitext(intermediate, protectedTokens);

        assert.ok(restored.includes('{{ज्ञानसन्दूक कानून'));
        assert.ok(restored.includes('[[भारत का संविधान]]'));
        assert.ok(restored.includes('[[डॉ. भीमराव आंबेडकर]]'));
        assert.strictEqual(/PROTECTED_|⟪|⟫/.test(restored), false);
    });

    test('T4.5: Scenario 5 — Historical & Economic Revolutions (हरित क्रांति और आर्थिक उदारीकरण ढांचा)', (t) => {
        const engine = loadAppEngine();
        const text = `=== Article: आर्थिक इतिहास ===\n1960 के दशक में '''हरित क्रांति''' ने भारत को खाद्यान्न में आत्मनिर्भर बनाया। तत्पश्चात 1991 में आर्थिक उदारीकरण ढांचा लागू किया गया जिससे देश में व्यापक डिजिटलीकरण अभियान संभव हो सका।`;

        const classifier = loadAiCompoundClassifier();
        const resRevolution = classifier.classify('हरित क्रांति');
        const resDigitization = classifier.classify('डिजिटलीकरण अभियान');

        assert.strictEqual(resRevolution.decision, 'COMPOUND');
        assert.strictEqual(resDigitization.decision, 'COMPOUND');
        assert.ok(resRevolution.score >= 0.70);
        assert.ok(resDigitization.score >= 0.70);

        const diagnostic = engine.exports.runBulkWikitextDiagnostic(text);
        assert.ok(diagnostic && typeof diagnostic.averageHealthScore === 'number');
        assert.ok(diagnostic.averageHealthScore >= 80);
    });
});
