/**
 * tests/harness.js
 * Test harness and browser sandbox environment for wikilink-tool test suites.
 * Uses native Node.js vm module to execute app.js with zero external dependencies.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const STRICT_MODE = process.env.STRICT === '1';

/**
 * Standard Unicode regex covering pictorial emojis across blocks:
 * - Miscellaneous Symbols and Pictographs (\u{1F300}-\u{1F5FF})
 * - Supplemental Symbols and Pictographs (\u{1F900}-\u{1F9FF})
 * - Symbols and Pictographs Extended-A (\u{1FA70}-\u{1FAFF})
 * - Emoticons (\u{1F600}-\u{1F64F})
 * - Transport and Map Symbols (\u{1F680}-\u{1F6FF})
 * - Dingbats (\u{2700}-\u{27BF})
 * - Miscellaneous Symbols (\u{2600}-\u{26FF})
 * - Miscellaneous Technical (\u{2300}-\u{23FF})
 */
const PICTORIAL_EMOJI_REGEX = /(?:[\u{1F300}-\u{1FAFF}]|[\u{2700}-\u{27BF}]|[\u{2600}-\u{26FF}]|[\u{2300}-\u{23FF}])/gu;

/**
 * Loads the words_blacklist.js dictionary.
 * Supports both CommonJS exports and global variable fallback.
 */
function loadBlacklist() {
    const blacklistPath = path.join(PROJECT_ROOT, 'words_blacklist.js');
    delete require.cache[require.resolve(blacklistPath)];
    const exported = require(blacklistPath);
    if (Array.isArray(exported)) {
        return exported;
    }
    if (exported && Array.isArray(exported.COMMON_5000_WORDS)) {
        return exported.COMMON_5000_WORDS;
    }
    throw new Error('Unable to resolve COMMON_5000_WORDS array from words_blacklist.js');
}

/**
 * Loads the compound_dictionary.js dictionary.
 * Supports both CommonJS exports and global variable fallback.
 */
function loadCompoundDictionary() {
    const dictPath = path.join(PROJECT_ROOT, 'compound_dictionary.js');
    delete require.cache[require.resolve(dictPath)];
    const exported = require(dictPath);
    if (Array.isArray(exported)) {
        return exported;
    }
    if (exported && Array.isArray(exported.COMPOUND_20K_TERMS)) {
        return exported.COMPOUND_20K_TERMS;
    }
    throw new Error('Unable to resolve COMPOUND_20K_TERMS array from compound_dictionary.js');
}

/**
 * Loads the ai_compound_classifier.js engine.
 * Supports both CommonJS exports and global variable fallback.
 */
function loadAiCompoundClassifier() {
    const aiPath = path.join(PROJECT_ROOT, 'ai_compound_classifier.js');
    delete require.cache[require.resolve(aiPath)];
    const exported = require(aiPath);
    if (exported && typeof exported.classify === 'function') {
        return exported;
    }
    throw new Error('Unable to resolve AiCompoundClassifier from ai_compound_classifier.js');
}

/**
 * Creates a mock DOM and Window environment and evaluates app.js.
 * Exposes core functions and internal state objects for direct, opaque-box testing.
 */
function loadAppEngine(customOptions = {}) {
    const words = customOptions.blacklist || loadBlacklist();
    const compounds = customOptions.compounds || loadCompoundDictionary();
    const aiClassifier = customOptions.aiClassifier || loadAiCompoundClassifier();

    const storageMap = new Map();
    const mockLocalStorage = {
        getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k),
        clear: () => storageMap.clear(),
        get length() { return storageMap.size; }
    };

    if (customOptions.localStorage) {
        for (const [k, v] of Object.entries(customOptions.localStorage)) {
            mockLocalStorage.setItem(k, v);
        }
    }

    const elementsMap = new Map();
    const createMockElement = (id = '') => ({
        id,
        tagName: 'DIV',
        value: '',
        textContent: '',
        innerHTML: '',
        disabled: false,
        style: {},
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); },
            toggle(c) { this.classes.has(c) ? this.classes.delete(c) : this.classes.add(c); }
        },
        dataset: {},
        attributes: {},
        setAttribute(k, v) { this.attributes[k] = String(v); },
        getAttribute(k) { return this.attributes[k] || null; },
        hasAttribute(k) { return k in this.attributes; },
        removeAttribute(k) { delete this.attributes[k]; },
        children: [],
        appendChild(child) { this.children.push(child); return child; },
        removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx >= 0) this.children.splice(idx, 1);
            return child;
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
    });

    const mockDocument = {
        readyState: 'loading',
        addEventListener: () => {},
        removeEventListener: () => {},
        getElementById: (id) => {
            if (!elementsMap.has(id)) {
                elementsMap.set(id, createMockElement(id));
            }
            return elementsMap.get(id);
        },
        querySelector: (sel) => null,
        querySelectorAll: (sel) => [],
        createElement: (tag) => createMockElement(),
        documentElement: createMockElement('html'),
        body: createMockElement('body')
    };

    const mockWindow = {
        document: mockDocument,
        localStorage: mockLocalStorage,
        sessionStorage: mockLocalStorage,
        location: { href: 'http://localhost:8085/', search: '', hash: '' },
        navigator: { userAgent: 'NodeTestRunner', onLine: true },
        addEventListener: () => {},
        removeEventListener: () => {},
        COMMON_5000_WORDS: words,
        COMPOUND_20K_TERMS: compounds,
        AiCompoundClassifier: aiClassifier,
        console: console,
        setTimeout: global.setTimeout,
        clearTimeout: global.clearTimeout,
        setInterval: global.setInterval,
        clearInterval: global.clearInterval
    };
    mockWindow.window = mockWindow;
    mockWindow.global = mockWindow;

    const appJsPath = path.join(PROJECT_ROOT, 'app.js');
    let code = fs.readFileSync(appJsPath, 'utf8');

    // Safe injection hook at the end of the IIFE to export internal symbols
    const hook = `
global.__TEST_EXPORTS__ = {
  protectWikitextStructures: typeof protectWikitextStructures !== 'undefined' ? protectWikitextStructures : null,
  unprotectWikitext: typeof unprotectWikitext !== 'undefined' ? unprotectWikitext : null,
  isValidCandidate: typeof isValidCandidate !== 'undefined' ? isValidCandidate : null,
  isNonLinkableWord: typeof isNonLinkableWord !== 'undefined' ? isNonLinkableWord : null,
  buildSuggestions: typeof buildSuggestions !== 'undefined' ? buildSuggestions : null,
  applyReplacements: typeof applyReplacements !== 'undefined' ? applyReplacements : null,
  isInflectedHindiPluralOrOblique: typeof isInflectedHindiPluralOrOblique !== 'undefined' ? isInflectedHindiPluralOrOblique : null,
  isSelfLink: typeof isSelfLink !== 'undefined' ? isSelfLink : null,
  calculateDensity: typeof calculateDensity !== 'undefined' ? calculateDensity : null,
  runBulkWikitextDiagnostic: typeof runBulkWikitextDiagnostic !== 'undefined' ? runBulkWikitextDiagnostic : null,
  simulateWikitextLinking: typeof simulateWikitextLinking !== 'undefined' ? simulateWikitextLinking : null,
  evaluateWordLogicalPolicyForAdmin: typeof evaluateWordLogicalPolicyForAdmin !== 'undefined' ? evaluateWordLogicalPolicyForAdmin : null,
  renderAdminAnalyticsGraph: typeof renderAdminAnalyticsGraph !== 'undefined' ? renderAdminAnalyticsGraph : null,
  parseWikitextForHealth: typeof parseWikitextForHealth !== 'undefined' ? parseWikitextForHealth : null,
  ensureExtendedBlacklistLoaded: typeof ensureExtendedBlacklistLoaded !== 'undefined' ? ensureExtendedBlacklistLoaded : null,
  ensureCompoundDictionaryLoaded: typeof ensureCompoundDictionaryLoaded !== 'undefined' ? ensureCompoundDictionaryLoaded : null,
  ensureAiClassifierLoaded: typeof ensureAiClassifierLoaded !== 'undefined' ? ensureAiClassifierLoaded : null,
  isAiCompoundClassifierActive: typeof isAiCompoundClassifierActive !== 'undefined' ? isAiCompoundClassifierActive : null,
  AiCompoundClassifier: typeof AiCompoundClassifier !== 'undefined' ? AiCompoundClassifier : null,
  COMPOUND_TERMS_SET: typeof COMPOUND_TERMS_SET !== 'undefined' ? COMPOUND_TERMS_SET : null,
  OFFLINE_VERIFIED_WIKI_TITLES: typeof OFFLINE_VERIFIED_WIKI_TITLES !== 'undefined' ? OFFLINE_VERIFIED_WIKI_TITLES : null,
  NEVER_LINK_WORDS: typeof NEVER_LINK_WORDS !== 'undefined' ? NEVER_LINK_WORDS : null,
  COMPOUND_HEAD_OR_MODIFIER_ALLOWLIST: typeof COMPOUND_HEAD_OR_MODIFIER_ALLOWLIST !== 'undefined' ? COMPOUND_HEAD_OR_MODIFIER_ALLOWLIST : null,
  STOPWORDS: typeof STOPWORDS !== 'undefined' ? STOPWORDS : null,
  UNITS_OF_MEASURE: typeof UNITS_OF_MEASURE !== 'undefined' ? UNITS_OF_MEASURE : null,
  DOM: typeof DOM !== 'undefined' ? DOM : null,
  state: typeof state !== 'undefined' ? state : null,
  currentUser: typeof currentUser !== 'undefined' ? currentUser : null,
  applySafeOfflineVerification: typeof applySafeOfflineVerification !== 'undefined' ? applySafeOfflineVerification : null,
  renderSuggestionsTable: typeof renderSuggestionsTable !== 'undefined' ? renderSuggestionsTable : null,
  renderAdminPanelUI: typeof renderAdminPanelUI !== 'undefined' ? renderAdminPanelUI : null,
  getFilteredSuggestions: typeof getFilteredSuggestions !== 'undefined' ? getFilteredSuggestions : null
};
})();`;

    code = code.replace(/\}\)\(\);[\s\r\n]*$/, hook);

    const ctx = vm.createContext(mockWindow);
    vm.runInContext(code, ctx, { filename: 'app.js' });
    if (ctx.__TEST_EXPORTS__ && ctx.__TEST_EXPORTS__.ensureExtendedBlacklistLoaded) {
        ctx.__TEST_EXPORTS__.ensureExtendedBlacklistLoaded();
    }
    if (ctx.__TEST_EXPORTS__ && ctx.__TEST_EXPORTS__.ensureCompoundDictionaryLoaded) {
        ctx.__TEST_EXPORTS__.ensureCompoundDictionaryLoaded();
    }

    return {
        context: ctx,
        window: mockWindow,
        document: mockDocument,
        exports: ctx.__TEST_EXPORTS__,
        localStorage: mockLocalStorage
    };
}

/**
 * Universal protect wrapper compatible with both baseline and M2 interface contracts.
 */
function protect(engine, text) {
    const res = engine.exports.protectWikitextStructures(text);
    return {
        raw: res,
        text: res.text !== undefined ? res.text : res.cleanText,
        tokens: res.tokens !== undefined ? res.tokens : res.protectedTokens,
        existingLinks: res.existingLinks,
        existingLinksCount: res.existingLinksCount !== undefined ? res.existingLinksCount : (res.existingLinks ? res.existingLinks.size : 0),
        uniqueExistingTargets: res.uniqueExistingTargets
    };
}

/**
 * Universal unprotect wrapper compatible with both baseline and M2 interface contracts.
 */
function unprotect(engine, textOrRes, maybeTokens) {
    let text = textOrRes;
    let tokens = maybeTokens;
    if (textOrRes && typeof textOrRes === 'object') {
        text = textOrRes.text !== undefined ? textOrRes.text : textOrRes.cleanText;
        tokens = textOrRes.tokens !== undefined ? textOrRes.tokens : textOrRes.protectedTokens;
    }
    return engine.exports.unprotectWikitext(text, tokens);
}

/**
 * Universal suggestions apply wrapper that configures state.suggestions and calls applyReplacements.
 */
function applySuggestions(engine, text, suggestions, firstOnly = true, cleanPipes = true) {
    const normalized = suggestions.map((s, idx) => ({
        id: s.id || `s_${idx}`,
        term: s.term || s.originalText || '',
        target: s.target || s.term || s.originalText || '',
        checked: s.checked !== undefined ? Boolean(s.checked) : (s.isChecked !== undefined ? Boolean(s.isChecked) : true)
    }));
    engine.exports.state.suggestions = normalized;
    const active = normalized.filter(s => s.checked);
    return engine.exports.applyReplacements(text, active, firstOnly, cleanPipes);
}

/**
 * Feature Detection Helpers for Progressive Testability.
 * In STRICT_MODE, these all return true to enforce full verification.
 */
const Features = {
    isStrict() {
        return STRICT_MODE;
    },

    isBlacklist10k() {
        if (STRICT_MODE) return true;
        try {
            const words = loadBlacklist();
            return new Set(words).size >= 10000;
        } catch {
            return false;
        }
    },

    isCompoundDictionary20k() {
        if (STRICT_MODE) return true;
        try {
            const terms = loadCompoundDictionary();
            return new Set(terms).size >= 20000;
        } catch {
            return false;
        }
    },

    isCivicAllowlistExpanded() {
        if (STRICT_MODE) return true;
        try {
            const engine = loadAppEngine();
            const set = engine.exports.COMPOUND_HEAD_OR_MODIFIER_ALLOWLIST;
            return set && set.has('राज्य') && set.has('सभा') && set.has('विधान') && set.has('नगर');
        } catch {
            return false;
        }
    },

    isLinkInflationFixed() {
        if (STRICT_MODE) return true;
        try {
            const engine = loadAppEngine();
            const text = '[[भारत|भारतीय गणराज्य]] एवं [[हिमालय|हिमालय पर्वत]]';
            const res = engine.exports.protectWikitextStructures(text);
            return res && (res.existingLinksCount === 2);
        } catch {
            return false;
        }
    },

    isNestedTemplateUnprotectFixed() {
        if (STRICT_MODE) return true;
        try {
            const engine = loadAppEngine();
            const sample = '{{ज्ञानसन्दूक | नाम = X | कार्य = {{बन्द सिरा|date=2020}} }}';
            const res = protect(engine, sample);
            const restored = unprotect(engine, res);
            const hasLeak = /PROTECTED_|⟪|⟫/.test(restored);
            return !hasLeak && restored.includes('{{बन्द सिरा|date=2020}}');
        } catch {
            return false;
        }
    },

    arePresetButtonsRemoved() {
        if (STRICT_MODE) return true;
        try {
            const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
            return !html.includes('preset-examples') && !html.includes('तुलसीदास') && !html.includes('प्रेमचंद');
        } catch {
            return false;
        }
    },

    isAdminDiagnosticImplemented() {
        if (STRICT_MODE) return true;
        try {
            const engine = loadAppEngine();
            return typeof engine.exports.runBulkWikitextDiagnostic === 'function';
        } catch {
            return false;
        }
    },

    isAdminSandboxImplemented() {
        if (STRICT_MODE) return true;
        try {
            const engine = loadAppEngine();
            return typeof engine.exports.simulateWikitextLinking === 'function';
        } catch {
            return false;
        }
    },

    areEmojisPurgedInFile(relPath) {
        if (STRICT_MODE) return true;
        try {
            const content = fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
            const matches = content.match(PICTORIAL_EMOJI_REGEX);
            return !matches || matches.length === 0;
        } catch {
            return false;
        }
    },

    isAiModeOffStrictEnforcement() {
        if (STRICT_MODE) return true;
        try {
            const engine = loadAppEngine();
            engine.exports.state.optAiCompoundClassifier = false;
            if (engine.exports.DOM && engine.exports.DOM.optAiCompoundClassifier) {
                engine.exports.DOM.optAiCompoundClassifier.checked = false;
            }
            const nonDict = 'डिजिटल साक्षरता अभियान';
            const inDict = engine.exports.COMPOUND_TERMS_SET && engine.exports.COMPOUND_TERMS_SET.has(nonDict);
            if (inDict) return true;
            const valid = engine.exports.isValidCandidate(nonDict, 3, true, true, true, engine.exports.STOPWORDS.hi, 'hi', true, true);
            return !valid;
        } catch {
            return false;
        }
    },

    isAiBeyondDictionaryEnabled() {
        if (STRICT_MODE) return true;
        try {
            const classifier = loadAiCompoundClassifier();
            const res1 = classifier.classify('ऊर्जा संरक्षण नीति');
            const res2 = classifier.classify('सतत विकास लक्ष्य');
            return Boolean(res1 && res1.score >= 0.70 && res2 && res2.score >= 0.70);
        } catch {
            return false;
        }
    },

    isTatpurushaPolicyHeadsImplemented() {
        if (STRICT_MODE) return true;
        try {
            const classifier = loadAiCompoundClassifier();
            const res1 = classifier.classify('राष्ट्रीय शिक्षा नीति');
            const res2 = classifier.classify('डिजिटल सार्वजनिक ढांचा');
            return Boolean(res1 && res1.score >= 0.70 && res2 && res2.score >= 0.70);
        } catch {
            return false;
        }
    },

    isKarmadharayaSamasaImplemented() {
        if (STRICT_MODE) return true;
        try {
            const classifier = loadAiCompoundClassifier();
            const res = classifier.classify('डिजिटल साक्षरता');
            return Boolean(res && res.score >= 0.70);
        } catch {
            return false;
        }
    },

    isAffixCohesionImplemented() {
        if (STRICT_MODE) return true;
        try {
            const classifier = loadAiCompoundClassifier();
            const res = classifier.classify('समाजवादी विचारधारा');
            return Boolean(res && res.score >= 0.70);
        } catch {
            return false;
        }
    },

    isOfflinePwaAiVerificationImplemented() {
        if (STRICT_MODE) return true;
        try {
            const engine = loadAppEngine();
            if (typeof engine.exports.applySafeOfflineVerification !== 'function') return false;
            const map = new Map();
            engine.exports.applySafeOfflineVerification(['डिजिटल साक्षरता अभियान'], map);
            const entry = map.get('डिजिटल साक्षरता अभियान');
            return Boolean(entry && entry.exists === true);
        } catch {
            return false;
        }
    },

    isSandboxAiControlsImplemented() {
        if (STRICT_MODE) return true;
        try {
            const engine = loadAppEngine();
            if (typeof engine.exports.simulateWikitextLinking !== 'function') return false;
            const sim = engine.exports.simulateWikitextLinking('ऊर्जा संरक्षण नीति पर विचार किया गया।', {
                enableAiCompound: true,
                aiThreshold: 0.70
            });
            return Boolean(sim && Array.isArray(sim.decisions) && sim.decisions.some(d => d.aiScore !== undefined));
        } catch {
            return false;
        }
    },

    isBrokenCompoundDiagnosticImplemented() {
        if (STRICT_MODE) return true;
        try {
            const engine = loadAppEngine();
            if (typeof engine.exports.runBulkWikitextDiagnostic !== 'function') return false;
            const diag = engine.exports.runBulkWikitextDiagnostic('[[डिजिटल]] [[साक्षरता]] एक महत्वपूर्ण पहल है।');
            return Boolean(diag && Array.isArray(diag.brokenCompoundLinks));
        } catch {
            return false;
        }
    },

    isWhitelistLiveScoringImplemented() {
        if (STRICT_MODE) return true;
        try {
            const appCode = fs.readFileSync(path.join(PROJECT_ROOT, 'app.js'), 'utf8');
            return appCode.includes('cohesion-pill') || appCode.includes('cohesion_pill');
        } catch {
            return false;
        }
    },

    isWorkbenchAiDiscoveredFilterImplemented() {
        if (STRICT_MODE) return true;
        try {
            const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
            const appCode = fs.readFileSync(path.join(PROJECT_ROOT, 'app.js'), 'utf8');
            return html.includes('ai-discovered') && appCode.includes('isAiDiscovered');
        } catch {
            return false;
        }
    }
};

/**
 * Standard Wikipedia Sample Articles for Testing
 */
const SampleWikitext = {
    // 1. Munshi Premchand wikitext fixture
    PREMCHAND: `{{ज्ञानसन्दूक लेखक
| नाम = मुंशी प्रेमचंद
| जन्म_नाम = धनपत राय श्रीवास्तव
| जन्म_तारीख = {{तारीख|1880|7|31}}
| जन्म_स्थान = लमही, वाराणसी, [[उत्तर प्रदेश]]
| मृत्यु_तारीख = {{मृत्यु तारीख और उम्र|1936|10|8|1880|7|31}}
| व्यवसाय = [[उपन्यासकार]], कहानीकार
}}
'''मुंशी प्रेमचंद''' (31 जुलाई 1880 – 8 अक्टूबर 1936) हिन्दी और [[उर्दू]] के महानतम भारतीय लेखकों में से एक हैं। उन्हें [[उपन्यास सम्राट]] भी कहा जाता है। उन्होंने [[गोदान (उपन्यास)|गोदान]], गबन और कर्मभूमि जैसे प्रसिद्ध उपन्यासों की रचना की। वे समाज के निर्धन और वंचित वर्ग की समस्याओं को सजीव रूप में प्रस्तुत करते थे।`,

    // 2. Constitution of India wikitext fixture
    CONSTITUTION: `{{ज्ञानसन्दूक कानून
| शीर्षक = भारत का संविधान
| मूल_अधिनियम = भारतीय संविधान
| क्षेत्राधिकार = [[भारत गणराज्य]]
| पारित_दिनांक = 26 नवम्बर 1949
| प्रभावी_दिनांक = 26 जनवरी 1950
}}
'''भारत का संविधान''' भारत का सर्वोच्च विधान है जो संविधान सभा द्वारा 26 नवम्बर 1949 को पारित हुआ तथा 26 जनवरी 1950 से प्रभावी हुआ। भारतीय संविधान सभा ने भारत का संविधान तैयार करने में 2 वर्ष 11 माह और 18 दिन का समय लिया। संविधान सभा की पहली बैठक 9 दिसम्बर 1946 को हुई थी। [[डॉ. भीमराव आंबेडकर]] को संविधान का जनक माना जाता है। [[राज्य सभा]] और [[लोक सभा]] भारतीय संसद के दो प्रमुख सदन हैं।`,

    // 3. Himalayas Geography wikitext fixture
    HIMALAYAS: `{{ज्ञानसन्दूक पर्वतमाला
| नाम = हिमालय
| सर्वोच्च_शिखर = [[माउंट एवरेस्ट]]
| ऊंचाई = 8848.86 मीटर
| देश = [[भारत]], [[नेपाल]], [[भूटान]], [[चीन]]
}}
'''हिमालय''' दक्षिण एशिया में स्थित एक विशाल पर्वतमाला है जो भारतीय उपमहाद्वीप को तिब्बत के पठार से अलग करती है। [[गंगा नदी]], [[सिंधु नदी]] और [[ब्रह्मपुत्र नदी]] का उद्गम हिमालय से ही होता है। हिमालय की पर्वत श्रृंखलाएं जलवायु को नियंत्रित करने में महत्वपूर्ण भूमिका निभाती हैं।`,

    // 4. Complex Nested Templates fixture
    NESTED_TEMPLATES: `{{ज्ञानसन्दूक संस्थान
| नाम = भारतीय प्रौद्योगिकी संस्थान
| स्थापना = {{तारीख|1950|8|18}}
| संदर्भ = {{cite web|url=https://example.org|title=इतिहास|archive-url={{wayback|url=https://example.org|date=20200101}}}}
| स्थिति = {{बन्द सिरा|date=2024}}
}}`
};

module.exports = {
    PROJECT_ROOT,
    PICTORIAL_EMOJI_REGEX,
    loadBlacklist,
    loadCompoundDictionary,
    loadAiCompoundClassifier,
    loadAppEngine,
    protect,
    unprotect,
    applySuggestions,
    Features,
    SampleWikitext
};
