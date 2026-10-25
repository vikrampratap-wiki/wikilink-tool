/**
 * विकीलिंक सहायक (WikiLink Assistant - v2.1)
 * =====================================================================
 * लेखक: सदस्य:विक्रम प्रताप (hi.wikipedia.org)
 * लाइसेंस: MIT / CC BY-SA 4.0
 * 
 * विशेषताएँ:
 * 1. दोहरे कार्यपटल (Dual-Box Workbench):
 *    - बॉक्स 1: मूल लेख एवं तार्किक छन्नी (Input Article & Filters)
 *    - बॉक्स 2: दूषित लेख एवं तार्किक निदान (Contaminated Article & Logic Arguments)
 * 2. तर्कों का प्रयोग (Wikipedia Policy Arguments Engine):
 *    - अति-कड़ीकरण (WP:OVERLINKING)
 *    - बहुविकल्पी पृष्ठ (WP:DISAMBIG)
 *    - सामान्य वर्ष व तिथियाँ (WP:DATELINK)
 *    - माप व मात्रक (Units of Measure)
 *    - व्यर्थ पाइप सिंटेक्स शुद्धि
 * 3. तार्किक शुद्धिकरण बटन (Sanitize & Fix Contaminated Wikitext)
 * 4. प्रामाणिक मीडियाविकी डिफ़ जनरेटर (4-Column Side-by-side एवं Unified Diff)
 * 5. पूर्णतः सुरक्षित DOM पहुँच (Null-Safe Architecture)
 * 6. पूर्णतः इमोजी-मुक्त, स्वच्छ विकिमीडिया टूल डिज़ाइन
 * =====================================================================
 */

(function () {
    'use strict';

    // ================== सुरक्षित DOM सहायक फ़ंक्शंस ==================
    function $(id) {
        return document.getElementById(id);
    }

    function safeSetText(idOrEl, text) {
        const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
        if (el) el.textContent = (text !== null && text !== undefined) ? String(text) : '';
    }

    function safeSetHTML(idOrEl, html) {
        const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
        if (el) el.innerHTML = (html !== null && html !== undefined) ? String(html) : '';
    }

    function safeSetValue(idOrEl, val) {
        const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
        if (el) el.value = (val !== null && val !== undefined) ? String(val) : '';
    }

    function safeGetValue(idOrEl, fallback = '') {
        const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
        return el ? el.value : fallback;
    }

    function safeSetDisplay(idOrEl, displayVal) {
        const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
        if (el) el.style.display = displayVal;
    }

    function safeAddListener(idOrEl, event, handler) {
        const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
        if (el) el.addEventListener(event, handler);
    }

    // ================== भाषा-विशिष्ट आम स्टॉपवर्ड्स ==================
    const STOPWORDS = {
        hi: new Set([
            'है', 'हैं', 'था', 'थी', 'थे', 'और', 'या', 'कि', 'की', 'के', 'का', 'को', 'से', 'में', 'पर',
            'ने', 'द्वारा', 'लिए', 'साथ', 'यह', 'वह', 'इस', 'उस', 'इन', 'उन', 'एक', 'दो', 'तीन', 'चार',
            'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'सभी', 'कुछ', 'बहुत', 'आदि', 'करने', 'करते', 'करता',
            'करती', 'किया', 'किए', 'जाता', 'जाती', 'जाते', 'गया', 'गई', 'गए', 'हुआ', 'हुई', 'हुए', 'सके',
            'सकता', 'सकती', 'सकते', 'चाहिए', 'तथा', 'एवं', 'अथवा', 'लेकिन', 'किंतु', 'परंतु', 'यदि', 'तो',
            'भी', 'ही', 'नहीं', 'मत', 'ना', 'कब', 'कहाँ', 'क्यों', 'कैसे', 'क्या', 'कौन', 'जिसे', 'जिसने',
            'जिससे', 'जिसमें', 'जहाँ', 'जब', 'जैसे', 'वैसे', 'अपना', 'अपनी', 'अपने', 'उनका', 'उनकी', 'उनके',
            'इसका', 'इसकी', 'इसके', 'जिसका', 'जिसकी', 'जिसके', 'कोई', 'किसी', 'हर', 'प्रत्येक', 'सिर्फ',
            'केवल', 'प्रति', 'लगभग', 'तरह', 'रूप', 'बाद', 'पहले', 'दौरान', 'बीच', 'अनुसार', 'कारण', 'मुख्य',
            'अन्य', 'अनेक', 'कई', 'कम', 'ज्यादा', 'अधिक', 'पूरा', 'पूरी', 'पूरे', 'नया', 'नई', 'नए',
            'पुराना', 'पुरानी', 'पुराने', 'होने', 'होता', 'होती', 'होते', 'रहा', 'रही', 'रहे', 'बारे',
            'पास', 'दूर', 'ऊपर', 'नीचे', 'आगे', 'पीछे', 'अंदर', 'बाहर', 'यहाँ', 'वहाँ', 'होगा', 'होगी',
            'होंगे', 'सकें', 'दें', 'लें', 'करें', 'हो', 'रहेगा', 'रहेगी', 'रहेंगे', 'दिया', 'दिए', 'दी',
            'लिया', 'लिए', 'ली', 'कहा', 'कहे', 'कही', 'माना', 'माने', 'मानी', 'देखा', 'देखे', 'देखी',
            'कहावत', 'नाम', 'स्थान', 'भाग', 'स्थिति', 'समय', 'प्रकार', 'बात', 'कार्य', 'काम'
        ]),
        en: new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
            'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
            'has', 'had', 'do', 'does', 'did', 'shall', 'will', 'should', 'would', 'can', 'could', 'may',
            'might', 'must', 'that', 'which', 'who', 'whom', 'this', 'these', 'those', 'am', 'it', 'its',
            'as', 'not', 'no', 'nor', 'so', 'yet', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
            'such', 'than', 'too', 'very', 'just', 'now', 'also', 'he', 'she', 'they', 'we', 'you', 'i',
            'his', 'her', 'their', 'our', 'your', 'my', 'him', 'them', 'us', 'me', 'then', 'there', 'here',
            'where', 'when', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
            'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
            'just', 'don', 'should', 'now'
        ]),
        sa: new Set([
            'च', 'वा', 'अपि', 'एव', 'इति', 'तथा', 'यथा', 'यदि', 'तर्हि', 'किम्', 'कथम्', 'कुत्र', 'कदा',
            'सः', 'सा', 'तत्', 'ते', 'ताः', 'तानि', 'अयम्', 'इयम्', 'इदम्', 'एषः', 'एषा', 'एतत्',
            'अस्ति', 'सन्ति', 'आसीत्', 'आसन्', 'भवति', 'भवन्ति', 'अभवत्', 'अभवन', 'कृतम्', 'कृत्वा'
        ])
    };

    // ================== माप एवं मात्रक ==================
    const UNITS_OF_MEASURE = new Set([
        'किमी', 'कि.मी.', 'किमी.', 'मीटर', 'सेमी', 'मिमी', 'किग्रा', 'किलोग्राम', 'ग्राम', 'लीटर', 'मिली',
        'सेकंड', 'सेकेण्ड', 'मिनट', 'घंटे', 'घण्टे', 'दिन', 'माह', 'महीने', 'वर्ष', 'साल', 'दशक', 'सदी',
        'शताब्दी', 'वर्ग किमी', 'वर्ग मीटर', 'हेक्टेयर', 'एकड़', 'टन', 'मील', 'फुट', 'इंच',
        'km', 'm', 'cm', 'mm', 'kg', 'g', 'l', 'ml', 'sec', 'min', 'hr', 'hours', 'days', 'years', 'ton'
    ]);

    // ================== तिथियाँ एवं वर्ष शब्द ==================
    const DATE_WORDS = new Set([
        'जनवरी', 'फ़रवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'सितम्बर',
        'अक्टूबर', 'नवंबर', 'नवम्बर', 'दिसंबर', 'दिसम्बर', 'ईस्वी', 'ई.पू.', 'ईसा पूर्व', 'विक्रम संवत',
        'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'
    ]);

    // ================== अनुप्रयोग स्थिति (State) ==================
    const state = {
        lang: 'hi',
        pageTitle: '',
        originalWikitext: '',
        contaminatedWikitext: '',
        sanitizedWikitext: '',
        processedWikitext: '',
        existingLinks: new Set(),
        suggestions: [],
        customBlacklist: new Set(),
        activeTab: 'tab-input-wiki',
        activeViewTab: 'tab-view-diff',
        diffMode: window.innerWidth < 768 ? 'unified' : 'side-by-side',
        editingSuggestionId: null,

        // छन्नी
        filterStatus: 'all',
        filterType: 'all',
        searchQuery: '',

        // दूषित लेख रिपोर्ट
        contaminations: {
            total: 0,
            overlinks: [],
            disambigs: [],
            redLinks: [],
            syntaxIssues: [],
            dateUnitIssues: [],
            arguments: []
        }
    };

    // DOM संदर्भ ऑब्जेक्ट (initDOM में सुरक्षित रूप से भरा जाएगा)
    const DOM = {};

    function initDOM() {
        DOM.langSelect = $('lang-select');
        DOM.customLangWrap = $('custom-lang-wrap');
        DOM.customLangInput = $('custom-lang-input');
        DOM.inputControlCard = $('input-control-card');
        DOM.compactActiveBar = $('compact-active-article-bar');
        DOM.compactTitleText = $('compact-title-text');
        DOM.compactLangText = $('compact-lang-text');
        DOM.btnToggleInputCard = $('btn-toggle-input-card');
        DOM.dualWorkbenchContainer = $('dual-workbench-container');
        DOM.workbenchFlowStrip = $('workbench-flow-strip');

        // बॉक्स 2 (दूषित लेख एवं तार्किक निदान)
        DOM.contaminatedBoxCard = $('contaminated-box-card');
        DOM.box2StatusBadge = $('box2-status-badge');
        DOM.statTotalContaminations = $('stat-total-contaminations');
        DOM.statOverlinks = $('stat-overlinks');
        DOM.statDisambigs = $('stat-disambigs');
        DOM.statRedLinks = $('stat-red-links');
        DOM.statSyntaxIssues = $('stat-syntax-issues');
        DOM.contaminatedWikitextOutput = $('contaminated-wikitext-output');
        DOM.btnCopyContaminated = $('btn-copy-contaminated');
        DOM.btnSanitizeContaminated = $('btn-sanitize-contaminated');
        DOM.contaminationArgumentsContainer = $('contamination-arguments-container');
        DOM.contaminationDetailsContainer = $('contamination-details-container');
        DOM.logicRuleCount = $('logic-rule-count');
        DOM.box2StatusText = $('box2-status-text');

        // लोडिंग विकल्प
        DOM.pageInput = $('page-input');
        DOM.loadPageBtn = $('load-page-btn');
        DOM.loadRandomBtn = $('load-random-btn');
        DOM.randomLoadingStatus = $('random-loading-status');
        DOM.categoryInput = $('category-input');
        DOM.loadCategoryBtn = $('load-category-btn');
        DOM.categoryPagesWrap = $('category-pages-wrap');
        DOM.categoryPagesSelect = $('category-pages-select');
        DOM.loadSelectedCatPageBtn = $('load-selected-cat-page-btn');
        DOM.fileUploadInput = $('file-upload-input');
        DOM.rawWikitextInput = $('raw-wikitext-input');
        DOM.rawCharCount = $('raw-char-count');
        DOM.loadSampleBtn = $('load-sample-btn');
        DOM.clearRawBtn = $('clear-raw-btn');
        DOM.analyzeBtn = $('analyze-btn');
        DOM.themeToggleBtn = $('theme-toggle-btn');
        DOM.shortcutsBtn = $('shortcuts-btn');

        // सेटिंग्स
        DOM.toggleSettingsBtn = $('toggle-settings-btn');
        DOM.settingsAccordion = document.querySelector('.settings-accordion');
        DOM.optFirstOnly = $('opt-first-only');
        DOM.optBlueOnly = $('opt-blue-only');
        DOM.optSkipDisambig = $('opt-skip-disambig');
        DOM.optSkipDates = $('opt-skip-dates');
        DOM.optSkipUnits = $('opt-skip-units');
        DOM.optResolveRedirects = $('opt-resolve-redirects');
        DOM.optCleanPipes = $('opt-clean-pipes');
        DOM.optProtectStructures = $('opt-protect-structures');
        DOM.optFilterStopwords = $('opt-filter-stopwords');
        DOM.optLinkScope = $('opt-link-scope');
        DOM.optMinLength = $('opt-min-length');

        // सहायक उपकरण
        DOM.btnOpenDuplicateCleaner = $('btn-open-duplicate-cleaner');
        DOM.btnOpenBlacklistMgr = $('btn-open-blacklist-mgr');
        DOM.btnDownloadStandaloneHtml = $('btn-download-standalone-html');
        DOM.btnToggleAuxGuide = $('btn-toggle-aux-guide');
        DOM.auxGuideDetails = $('aux-guide-details');
        DOM.btnShowAllShortcuts = $('btn-show-all-shortcuts');

        // प्रगति
        DOM.progressCard = $('progress-card');
        DOM.progressTitle = $('progress-title');
        DOM.progressDetail = $('progress-detail');
        DOM.progressBarFill = $('progress-bar-fill');
        DOM.progressLog = $('progress-log');

        // परिणाम व सांख्यिकी
        DOM.resultsCard = $('results-card');
        DOM.resultsSummaryText = $('results-summary-text');
        DOM.badgeTotal = $('badge-total');
        DOM.badgeBlue = $('badge-blue');
        DOM.badgeRedirect = $('badge-redirect');
        DOM.badgeDisambig = $('badge-disambig');
        DOM.badgeRed = $('badge-red');
        DOM.statTotalWords = $('stat-total-words');
        DOM.statExistingLinks = $('stat-existing-links');
        DOM.statNewLinks = $('stat-new-links');
        DOM.statLinkDensity = $('stat-link-density');
        DOM.densityRating = $('density-rating');

        // छन्नी
        DOM.statusFilterChips = document.querySelectorAll('.filter-status-chip');
        DOM.typeFilterChips = document.querySelectorAll('.filter-type-chip');
        DOM.suggestionsTbody = $('suggestions-tbody');
        DOM.masterCheckbox = $('master-suggestion-checkbox');
        DOM.suggestionsFilterInput = $('suggestions-filter-input');
        DOM.btnSelectAll = $('btn-select-all');
        DOM.btnDeselectAll = $('btn-deselect-all');
        DOM.btnSelectBlueOnly = $('btn-select-blue-only');
        DOM.btnDeselectDisambig = $('btn-deselect-disambig');

        // डिफ़ नियंत्रण
        DOM.btnDiffSideBySide = $('btn-diff-side-by-side');
        DOM.btnDiffUnified = $('btn-diff-unified');
        DOM.diffContainer = $('diff-container');
        DOM.articlePreviewContainer = $('article-preview-container');
        DOM.finalWikitextOutput = $('final-wikitext-output');
        DOM.finalStatsText = $('final-stats-text');

        // बॉटम एक्शन
        DOM.copyWikitextBtn = $('copy-wikitext-btn');
        DOM.openWikiEditBtn = $('open-wiki-edit-btn');
        DOM.downloadWikiBtn = $('download-wiki-btn');
        DOM.resetToolBtn = $('reset-tool-btn');

        // मोडल्स
        DOM.editTargetModal = $('edit-target-modal');
        DOM.modalTermText = $('modal-term-text');
        DOM.modalTargetInput = $('modal-target-input');
        DOM.modalVerifyStatus = $('modal-verify-status');
        DOM.modalCancelBtn = $('modal-cancel-btn');
        DOM.modalSaveBtn = $('modal-save-btn');

        DOM.duplicateCleanerModal = $('duplicate-cleaner-modal');
        DOM.duplicateLinksContainer = $('duplicate-links-container');
        DOM.btnFixDuplicates = $('btn-fix-duplicates');

        DOM.blacklistModal = $('blacklist-modal');
        DOM.blacklistNewInput = $('blacklist-new-input');
        DOM.blacklistAddBtn = $('blacklist-add-btn');
        DOM.blacklistTagsContainer = $('blacklist-tags-container');
        DOM.blacklistClearBtn = $('blacklist-clear-btn');

        DOM.shortcutsModal = $('shortcuts-modal');

        // फ्लोटिंग सारांश
        DOM.wikiSummaryCard = $('wiki-summary-card');
        DOM.summaryCardClose = $('summary-card-close');
        DOM.summaryImgWrap = $('summary-img-wrap');
        DOM.summaryImg = $('summary-img');
        DOM.summaryTitle = $('summary-title');
        DOM.summaryExtract = $('summary-extract');
        DOM.summaryLink = $('summary-link');

        DOM.toast = $('toast');
    }

    // ================== इनिशियलाइज़ेशन ==================
    function init() {
        try {
            initDOM();
            setupTheme();
            loadSavedBlacklist();
            bindEvents();
            updateCharCount();
            updateDiffModeButtons();
        } catch (err) {
            console.error('Initialization error:', err);
        }
    }

    function setupTheme() {
        const savedTheme = localStorage.getItem('wikilink_theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);

        safeAddListener(DOM.themeToggleBtn, 'click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('wikilink_theme', next);
        });
    }

    function loadSavedBlacklist() {
        try {
            const saved = JSON.parse(localStorage.getItem('wikilink_blacklist') || '[]');
            state.customBlacklist = new Set(saved);
        } catch (e) {
            state.customBlacklist = new Set();
        }
    }

    function saveBlacklist() {
        localStorage.setItem('wikilink_blacklist', JSON.stringify(Array.from(state.customBlacklist)));
    }

    // ================== घटना श्रोता (Event Listeners) ==================
    function bindEvents() {
        // भाषा चयन
        safeAddListener(DOM.langSelect, 'change', () => {
            if (DOM.langSelect && DOM.langSelect.value === 'custom') {
                safeSetDisplay(DOM.customLangWrap, 'block');
                if (DOM.customLangInput) DOM.customLangInput.focus();
            } else {
                safeSetDisplay(DOM.customLangWrap, 'none');
            }
            state.lang = getSelectedLanguage();
        });

        safeAddListener(DOM.customLangInput, 'input', () => {
            state.lang = getSelectedLanguage();
        });

        // त्वरित उदाहरण
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                const title = e.target.dataset.title;
                if (DOM.langSelect) DOM.langSelect.value = lang;
                safeSetDisplay(DOM.customLangWrap, 'none');
                state.lang = lang;
                safeSetValue(DOM.pageInput, title);
                switchTab('tab-input-wiki');
                if (DOM.loadPageBtn) DOM.loadPageBtn.click();
            });
        });

        // इनपुट टैब्स
        document.querySelectorAll('.input-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // परिणाम दृश्य टैब्स
        document.querySelectorAll('.result-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchResultTab(btn.dataset.tab));
        });

        // कॉम्पैक्ट बार टॉगल
        safeAddListener(DOM.btnToggleInputCard, 'click', toggleInputControlCard);

        // यादृच्छिक लेख लोडर
        safeAddListener(DOM.loadRandomBtn, 'click', handleLoadRandomArticle);

        // श्रेणी लोडर
        safeAddListener(DOM.loadCategoryBtn, 'click', handleSearchCategory);
        safeAddListener(DOM.loadSelectedCatPageBtn, 'click', handleLoadSelectedCatPage);

        // फ़ाइल अपलोड
        safeAddListener(DOM.fileUploadInput, 'change', handleFileUpload);

        // सेटिंग्स टॉगल
        safeAddListener(DOM.toggleSettingsBtn, 'click', () => {
            const body = $('settings-body');
            if (body) {
                const isHidden = (body.style.display === 'none' || !body.style.display);
                body.style.display = isHidden ? 'block' : 'none';
                const arrow = DOM.toggleSettingsBtn ? DOM.toggleSettingsBtn.querySelector('.accordion-arrow') : null;
                if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
            }
        });

        // बॉक्स 1: सक्रिय तार्किक छन्नी चिप्स
        document.querySelectorAll('.filter-chip-toggle').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetId = chip.dataset.target;
                const checkbox = $(targetId);
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    chip.classList.toggle('active', checkbox.checked);
                    const name = chip.textContent.replace('✓', '').trim();
                    showToast(`${name}: ${checkbox.checked ? 'सक्रिय' : 'निष्क्रिय'}`);
                }
            });
        });

        // सेटिंग्स चेकबॉक्स से चिप्स को सिंक करना
        const filterSyncIds = ['opt-first-only', 'opt-skip-disambig', 'opt-skip-dates', 'opt-skip-units', 'opt-clean-pipes', 'opt-blue-only'];
        filterSyncIds.forEach(id => {
            const cb = $(id);
            if (cb) {
                cb.addEventListener('change', () => {
                    const chip = document.querySelector(`.filter-chip-toggle[data-target="${id}"]`);
                    if (chip) chip.classList.toggle('active', cb.checked);
                });
            }
        });

        // बॉक्स 2: उप-टैब्स स्विचिंग
        document.querySelectorAll('.box2-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabKey = btn.dataset.box2Tab;
                document.querySelectorAll('.box2-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.box2-tab-pane').forEach(p => p.style.display = 'none');
                const activePane = $(`box2-pane-${tabKey}`);
                if (activePane) activePane.style.display = 'block';
            });
        });

        // विकिटेक्स्ट इनपुट काउंट
        safeAddListener(DOM.rawWikitextInput, 'input', updateCharCount);
        safeAddListener(DOM.loadSampleBtn, 'click', loadSampleText);
        safeAddListener(DOM.clearRawBtn, 'click', () => {
            safeSetValue(DOM.rawWikitextInput, '');
            updateCharCount();
        });

        // लोड एवं विश्लेषण
        safeAddListener(DOM.loadPageBtn, 'click', handleLoadArticle);
        safeAddListener(DOM.analyzeBtn, 'click', handleAnalyze);

        // बॉक्स 2 क्रियाएँ (दूषित लेख)
        safeAddListener(DOM.btnCopyContaminated, 'click', copyContaminatedWikitext);
        safeAddListener(DOM.btnSanitizeContaminated, 'click', handleSanitizeContaminatedArticle);

        // मास्टर चेकबॉक्स
        safeAddListener(DOM.masterCheckbox, 'change', (e) => {
            const checked = e.target.checked;
            const visible = getFilteredSuggestions();
            visible.forEach(s => s.checked = checked);
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        // त्वरित चयन बटन
        safeAddListener(DOM.btnSelectAll, 'click', () => {
            state.suggestions.forEach(s => s.checked = true);
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        safeAddListener(DOM.btnDeselectAll, 'click', () => {
            state.suggestions.forEach(s => s.checked = false);
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        safeAddListener(DOM.btnSelectBlueOnly, 'click', () => {
            state.suggestions.forEach(s => s.checked = (s.status === 'blue' && !s.isDisambig));
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        safeAddListener(DOM.btnDeselectDisambig, 'click', () => {
            state.suggestions.forEach(s => {
                if (s.isDisambig || s.status === 'disambig') s.checked = false;
            });
            renderSuggestionsTable();
            recalculateModifiedWikitext();
            showToast('बहुविकल्पी कड़ियाँ अचयनित की गईं');
        });

        // छन्नी चिप्स
        if (DOM.statusFilterChips) {
            DOM.statusFilterChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    DOM.statusFilterChips.forEach(c => c.classList.remove('active-chip'));
                    chip.classList.add('active-chip');
                    state.filterStatus = chip.dataset.status;
                    renderSuggestionsTable();
                });
            });
        }

        if (DOM.typeFilterChips) {
            DOM.typeFilterChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    DOM.typeFilterChips.forEach(c => c.classList.remove('active-chip'));
                    chip.classList.add('active-chip');
                    state.filterType = chip.dataset.type;
                    renderSuggestionsTable();
                });
            });
        }

        // खोज
        safeAddListener(DOM.suggestionsFilterInput, 'input', (e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            renderSuggestionsTable();
        });

        // डिफ़ मोड टॉगल
        safeAddListener(DOM.btnDiffSideBySide, 'click', () => {
            state.diffMode = 'side-by-side';
            updateDiffModeButtons();
            recalculateModifiedWikitext();
        });

        safeAddListener(DOM.btnDiffUnified, 'click', () => {
            state.diffMode = 'unified';
            updateDiffModeButtons();
            recalculateModifiedWikitext();
        });

        // सहायक उपकरण
        safeAddListener(DOM.btnOpenDuplicateCleaner, 'click', openDuplicateCleanerModal);
        safeAddListener(DOM.btnFixDuplicates, 'click', fixDuplicateLinks);
        safeAddListener(DOM.btnOpenBlacklistMgr, 'click', openBlacklistModal);
        safeAddListener(DOM.btnDownloadStandaloneHtml, 'click', generateStandaloneHtml);
        safeAddListener(DOM.shortcutsBtn, 'click', () => openModal('shortcuts-modal'));
        safeAddListener(DOM.btnShowAllShortcuts, 'click', () => openModal('shortcuts-modal'));

        if (DOM.btnToggleAuxGuide && DOM.auxGuideDetails) {
            DOM.btnToggleAuxGuide.addEventListener('click', () => {
                const isHidden = DOM.auxGuideDetails.style.display === 'none';
                DOM.auxGuideDetails.style.display = isHidden ? 'block' : 'none';
                DOM.btnToggleAuxGuide.textContent = isHidden ? 'निर्देश छिपाएं' : 'उपयोग विधि निर्देश देखें';
            });
        }

        safeAddListener(DOM.blacklistAddBtn, 'click', addBlacklistWord);
        safeAddListener(DOM.blacklistNewInput, 'keypress', (e) => {
            if (e.key === 'Enter') addBlacklistWord();
        });
        safeAddListener(DOM.blacklistClearBtn, 'click', clearBlacklist);

        // बॉटम बार
        safeAddListener(DOM.copyWikitextBtn, 'click', copyModifiedWikitext);
        safeAddListener(DOM.openWikiEditBtn, 'click', openWikipediaEditPage);
        safeAddListener(DOM.downloadWikiBtn, 'click', downloadWikiFile);
        safeAddListener(DOM.resetToolBtn, 'click', resetTool);

        // मोडल
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => closeModal(btn.dataset.modal));
        });
        safeAddListener(DOM.modalCancelBtn, 'click', () => closeModal('edit-target-modal'));
        safeAddListener(DOM.modalSaveBtn, 'click', saveModalEdit);
        safeAddListener(DOM.summaryCardClose, 'click', closeSummaryCard);

        document.addEventListener('keydown', handleGlobalKeydown);
    }

    function updateDiffModeButtons() {
        if (DOM.btnDiffSideBySide) DOM.btnDiffSideBySide.classList.toggle('active-chip', state.diffMode === 'side-by-side');
        if (DOM.btnDiffUnified) DOM.btnDiffUnified.classList.toggle('active-chip', state.diffMode === 'unified');
    }

    function setWorkflowStep(stepNum) {
        ['flow-step-1', 'flow-step-2', 'flow-step-3'].forEach((id, idx) => {
            const el = $(id);
            if (el) el.classList.toggle('active', idx + 1 <= stepNum);
        });
    }

    function toggleInputControlCard() {
        const container = $('dual-workbench-container') || DOM.inputControlCard;
        if (!container) return;
        const isHidden = (container.style.display === 'none');
        container.style.display = isHidden ? 'grid' : 'none';
        safeSetText(DOM.btnToggleInputCard, isHidden ? 'कार्यपटल (बॉक्स 1 व 2) छिपाएं' : 'कार्यपटल (बॉक्स 1 व 2) दिखाएं');
        if (isHidden) {
            container.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function handleGlobalKeydown(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
            closeSummaryCard();
            return;
        }

        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (DOM.analyzeBtn) DOM.analyzeBtn.click();
        } else if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
            e.preventDefault();
            copyModifiedWikitext();
        } else if (e.ctrlKey && (e.key === 'o' || e.key === 'O')) {
            e.preventDefault();
            openWikipediaEditPage();
        } else if ((e.ctrlKey && (e.key === '/' || e.key === '?')) || (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName))) {
            e.preventDefault();
            openModal('shortcuts-modal');
        }
    }

    // ================== सहायक फ़ंक्शंस ==================
    function getSelectedLanguage() {
        if (!DOM.langSelect) return 'hi';
        const val = DOM.langSelect.value;
        if (val === 'custom') {
            return safeGetValue(DOM.customLangInput).trim().toLowerCase() || 'hi';
        }
        return val;
    }

    function switchTab(tabId) {
        state.activeTab = tabId;
        document.querySelectorAll('.input-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('#tab-input-wiki, #tab-input-random, #tab-input-category, #tab-input-file, #tab-input-raw').forEach(pane => {
            pane.classList.toggle('active', pane.id === tabId);
        });
    }

    function switchResultTab(tabId) {
        state.activeViewTab = tabId;
        document.querySelectorAll('.result-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('#tab-view-diff, #tab-view-preview, #tab-view-wikitext').forEach(pane => {
            pane.classList.toggle('active', pane.id === tabId);
        });
    }

    function showToast(message) {
        if (!DOM.toast) return;
        DOM.toast.textContent = message;
        DOM.toast.classList.add('show');
        setTimeout(() => {
            if (DOM.toast) DOM.toast.classList.remove('show');
        }, 2600);
    }

    function openModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) el.style.display = 'flex';
    }

    function closeModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) el.style.display = 'none';
        state.editingSuggestionId = null;
    }

    function updateCharCount() {
        const text = safeGetValue(DOM.rawWikitextInput);
        const charCount = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        safeSetText(DOM.rawCharCount, `${charCount.toLocaleString('hi-IN')} अक्षर | ${words.toLocaleString('hi-IN')} शब्द`);
    }

    function cleanWikiTitleFromInput(input) {
        if (!input) return '';
        let title = input.trim();
        if (title.startsWith('http://') || title.startsWith('https://')) {
            try {
                const url = new URL(title);
                if (url.pathname.includes('/wiki/')) {
                    title = url.pathname.split('/wiki/')[1];
                } else if (url.searchParams.has('title')) {
                    title = url.searchParams.get('title');
                }
                title = decodeURIComponent(title).replace(/_/g, ' ');
            } catch (e) { }
        }
        return title.replace(/_/g, ' ').trim();
    }

    function loadSampleText() {
        const sample = `'''तुलसीदास''' (१५३२ - १६२३) हिन्दी साहित्य के महान कवि और सन्त थे। उनका जन्म [[राजापुर]] में हुआ था। उन्हें आदि काव्य [[रामायण]] के रचयिता महर्षि वाल्मीकि का अवतार माना जाता है। तुलसीदास ने अनेक ग्रन्थों की रचना की जिनमें [[रामचरितमानस]] सर्वोपरि है। [[राजापुर]] एक ऐतिहासिक स्थल है जहाँ तुलसीदास का जन्म हुआ था। तुलसीदास का विवाह रत्नावली से हुआ था। उन्होंने [[1947]] में कुछ नहीं किया क्योंकि वे उस समय नहीं थे। वे लगभग 50 [[किमी]] पैदल चले। [[भारत|भारत]] एक महान राष्ट्र है।`;
        safeSetValue(DOM.rawWikitextInput, sample);
        updateCharCount();
        showToast('नमूना लेख लोड हुआ');
    }

    function handleFileUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            safeSetValue(DOM.rawWikitextInput, content);
            safeSetValue(DOM.pageInput, file.name.replace(/\.[^/.]+$/, ''));
            updateCharCount();
            switchTab('tab-input-wiki');
            showToast(`'${file.name}' लोड हुई`);
        };
        reader.onerror = () => alert('फ़ाइल पढ़ने में त्रुटि हुई।');
        reader.readAsText(file);
    }

    // ================== यादृच्छिक लेख (Random Article) ==================
    async function handleLoadRandomArticle() {
        state.lang = getSelectedLanguage();
        safeSetText(DOM.randomLoadingStatus, 'यादृच्छिक लेख खोजा जा रहा है...');

        try {
            const endpoint = `https://${state.lang}.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`;
            const resp = await fetch(endpoint, {
                headers: { 'Api-User-Agent': 'WikiLinkAssistant/2.0' }
            });
            const data = await resp.json();
            const randomPage = data.query?.random?.[0];

            if (!randomPage || !randomPage.title) {
                throw new Error('कोई यादृच्छिक लेख प्राप्त नहीं हो सका।');
            }

            safeSetText(DOM.randomLoadingStatus, `प्राप्त लेख: ${randomPage.title}। लोड हो रहा है...`);
            safeSetValue(DOM.pageInput, randomPage.title);
            await handleLoadArticle();
            safeSetText(DOM.randomLoadingStatus, '');
        } catch (err) {
            safeSetText(DOM.randomLoadingStatus, '');
            alert('त्रुटि: ' + err.message);
        }
    }

    // ================== श्रेणी से लेख खोज (Category Members) ==================
    async function handleSearchCategory() {
        const cat = safeGetValue(DOM.categoryInput).trim();
        if (!cat) {
            alert('कृपया श्रेणी का नाम दर्ज करें।');
            return;
        }

        state.lang = getSelectedLanguage();
        showProgress(true);
        updateProgress('श्रेणी के लेख खोजे जा रहे हैं...', cat, 40);

        try {
            const normCat = cat.startsWith('श्रेणी:') || cat.startsWith('Category:') ? cat : `श्रेणी:${cat}`;
            const endpoint = `https://${state.lang}.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(normCat)}&cmnamespace=0&cmlimit=30&format=json&origin=*`;

            const resp = await fetch(endpoint, {
                headers: { 'Api-User-Agent': 'WikiLinkAssistant/2.0' }
            });
            const data = await resp.json();
            const members = data.query?.categorymembers || [];

            if (members.length === 0) {
                alert(`'${normCat}' में कोई लेख नहीं मिला। कृपया श्रेणी का नाम जाँचें।`);
                showProgress(false);
                return;
            }

            if (DOM.categoryPagesSelect) {
                DOM.categoryPagesSelect.innerHTML = '';
                members.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.title;
                    opt.textContent = m.title;
                    DOM.categoryPagesSelect.appendChild(opt);
                });
            }

            safeSetDisplay(DOM.categoryPagesWrap, 'block');
            showProgress(false);
            showToast(`${members.length} लेख श्रेणी में प्राप्त हुए`);
        } catch (err) {
            showProgress(false);
            alert('श्रेणी प्राप्त करने में त्रुटि: ' + err.message);
        }
    }

    async function handleLoadSelectedCatPage() {
        const selected = safeGetValue(DOM.categoryPagesSelect);
        if (!selected) return;
        safeSetValue(DOM.pageInput, selected);
        switchTab('tab-input-wiki');
        await handleLoadArticle();
    }

    // ================== प्रगति पटल नियंत्रण ==================
    function showProgress(show) {
        safeSetDisplay(DOM.progressCard, show ? 'block' : 'none');
        if (show) {
            safeSetHTML(DOM.progressLog, '');
            if (DOM.progressBarFill) DOM.progressBarFill.style.width = '10%';
        }
    }

    function updateProgress(title, detail, percent, logMsg = null) {
        safeSetText(DOM.progressTitle, title);
        safeSetText(DOM.progressDetail, detail);
        if (DOM.progressBarFill) DOM.progressBarFill.style.width = `${percent}%`;
        if (logMsg && DOM.progressLog) {
            const p = document.createElement('div');
            p.textContent = `[${new Date().toLocaleTimeString()}] ${logMsg}`;
            DOM.progressLog.appendChild(p);
            DOM.progressLog.scrollTop = DOM.progressLog.scrollHeight;
        }
    }

    // ================== विकिपीडिया API संचार ==================
    async function fetchArticleWikitext(lang, title) {
        const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvslots=*&rvprop=content&formatversion=2&format=json&origin=*`;
        
        const response = await fetch(endpoint, {
            headers: { 'Api-User-Agent': 'WikiLinkAssistant/2.0' }
        });

        if (!response.ok) {
            throw new Error(`विकिपीडिया सर्वर से त्रुटि: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const pages = data.query?.pages;

        if (!pages || pages.length === 0 || pages[0].missing) {
            throw new Error(`विकिपीडिया पर '${title}' नाम का लेख नहीं मिला। कृपया शीर्षक की वर्तनी जाँचें।`);
        }

        const page = pages[0];
        return {
            title: page.title,
            wikitext: page.revisions?.[0]?.slots?.main?.content || ''
        };
    }

    async function verifyBatchTitles(lang, titles) {
        const BATCH_SIZE = 40;
        const results = new Map();

        for (let i = 0; i < titles.length; i += BATCH_SIZE) {
            const chunk = titles.slice(i, i + BATCH_SIZE);
            const titlesParam = chunk.map(t => encodeURIComponent(t)).join('|');
            const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${titlesParam}&prop=pageprops&ppprop=disambiguation&redirects=1&format=json&origin=*`;

            try {
                const response = await fetch(endpoint, {
                    headers: { 'Api-User-Agent': 'WikiLinkAssistant/2.0' }
                });
                const data = await response.json();
                const query = data.query || {};

                const normalMap = new Map();
                (query.normalized || []).forEach(n => normalMap.set(n.from, n.to));

                const redirectMap = new Map();
                (query.redirects || []).forEach(r => redirectMap.set(r.from, r.to));

                const pages = query.pages || {};
                const pageInfoMap = new Map();

                Object.values(pages).forEach(p => {
                    if (p.pageid && p.pageid > 0 && !p.missing) {
                        const isDisambig = !!(p.pageprops && 'disambiguation' in p.pageprops) || 
                                           p.title.includes('(बहुविकल्पी)') || 
                                           p.title.includes('(disambiguation)');
                        pageInfoMap.set(p.title, {
                            pageid: p.pageid,
                            isDisambig: isDisambig
                        });
                    }
                });

                chunk.forEach(originalTerm => {
                    let norm = normalMap.get(originalTerm) || originalTerm;
                    let redirectedTo = redirectMap.get(norm) || redirectMap.get(originalTerm);
                    const finalTarget = redirectedTo || norm;

                    const pageData = pageInfoMap.get(finalTarget);
                    const exists = !!pageData;
                    const isDisambig = pageData ? pageData.isDisambig : false;

                    results.set(originalTerm, {
                        exists: exists,
                        isRedirect: !!redirectedTo,
                        isDisambig: isDisambig,
                        target: finalTarget,
                        originalTerm: originalTerm
                    });
                });
            } catch (err) {
                console.warn('Batch verification error:', err);
                chunk.forEach(t => {
                    results.set(t, { exists: false, isRedirect: false, isDisambig: false, target: t, originalTerm: t });
                });
            }
        }

        return results;
    }

    // ================== फ्लोटिंग सारांश पूर्वावलोकन कार्ड ==================
    async function showArticleSummaryCard(targetTitle, x, y) {
        if (!DOM.wikiSummaryCard) return;

        safeSetText(DOM.summaryTitle, targetTitle);
        safeSetText(DOM.summaryExtract, 'विकिपीडिया से सारांश लोड हो रहा है...');
        safeSetDisplay(DOM.summaryImgWrap, 'none');
        if (DOM.summaryLink) DOM.summaryLink.href = `https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(targetTitle)}`;
        
        DOM.wikiSummaryCard.style.left = `${Math.min(window.innerWidth - 340, Math.max(10, x - 160))}px`;
        DOM.wikiSummaryCard.style.top = `${Math.min(window.innerHeight - 300, y + 20)}px`;
        DOM.wikiSummaryCard.style.display = 'block';

        try {
            const summaryUrl = `https://${state.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(targetTitle)}`;
            const res = await fetch(summaryUrl);
            if (!res.ok) throw new Error('Summary fetch failed');
            const data = await res.json();

            safeSetText(DOM.summaryTitle, data.title || targetTitle);
            safeSetText(DOM.summaryExtract, data.extract || 'कोई संक्षिप्त विवरण उपलब्ध नहीं है।');

            if (data.thumbnail && data.thumbnail.source && DOM.summaryImg) {
                DOM.summaryImg.src = data.thumbnail.source;
                safeSetDisplay(DOM.summaryImgWrap, 'block');
            }
        } catch (e) {
            safeSetText(DOM.summaryExtract, 'इस लेख का सारांश प्राप्त नहीं हो सका।');
        }
    }

    function closeSummaryCard() {
        safeSetDisplay(DOM.wikiSummaryCard, 'none');
    }

    // ================== लेख लोडिंग हैंडलर ==================
    async function handleLoadArticle() {
        const rawInput = safeGetValue(DOM.pageInput).trim();
        if (!rawInput) {
            alert('कृपया विकिपीडिया लेख का शीर्षक अथवा URL दर्ज करें।');
            return;
        }

        const title = cleanWikiTitleFromInput(rawInput);
        state.lang = getSelectedLanguage();
        state.pageTitle = title;

        showProgress(true);
        updateProgress('विकिपीडिया से लेख प्राप्त किया जा रहा है...', `'${title}' (${state.lang}.wikipedia.org)...`, 25, `अनुरोध: ${title}`);

        try {
            const article = await fetchArticleWikitext(state.lang, title);
            state.pageTitle = article.title;
            state.originalWikitext = article.wikitext;
            state.contaminatedWikitext = article.wikitext;

            safeSetValue(DOM.pageInput, article.title);
            safeSetValue(DOM.rawWikitextInput, article.wikitext);
            safeSetValue(DOM.contaminatedWikitextOutput, article.wikitext);
            updateCharCount();

            updateProgress('लेख सफलतापूर्वक लोड हुआ!', `${article.wikitext.length.toLocaleString('hi-IN')} अक्षर प्राप्त हुए`, 100, `शीर्षक: ${article.title}`);
            showToast(`'${article.title}' सफलतापूर्वक लोड हुआ`);
            setTimeout(() => showProgress(false), 800);
        } catch (err) {
            alert(`त्रुटि: ${err.message}`);
            showProgress(false);
        }
    }

    // ================== मुख्य विश्लेषण एल्गोरिदम ==================
    async function handleAnalyze() {
        let wikitext = '';
        if (state.activeTab === 'tab-input-wiki') {
            wikitext = safeGetValue(DOM.rawWikitextInput).trim() || state.originalWikitext.trim();
            if (!wikitext && safeGetValue(DOM.pageInput).trim()) {
                await handleLoadArticle();
                wikitext = state.originalWikitext.trim();
            }
        } else {
            wikitext = safeGetValue(DOM.rawWikitextInput).trim();
        }

        if (!wikitext) {
            alert('कृपया विश्लेषण हेतु विकिपीडिया लेख लोड करें अथवा विकिटेक्स्ट दर्ज करें।');
            return;
        }

        state.originalWikitext = wikitext;
        state.contaminatedWikitext = wikitext;
        state.lang = getSelectedLanguage();
        state.pageTitle = cleanWikiTitleFromInput(safeGetValue(DOM.pageInput)) || 'अशीर्षक लेख';

        showProgress(true);
        safeSetDisplay(DOM.resultsCard, 'none');

        try {
            // चरण 1: संरचनात्मक सुरक्षा
            updateProgress('चरण 1/4: विकिटेक्स्ट संरचनाओं का विश्लेषण...', 'टेम्पलेट, संदर्भ, मौजूदा कड़ियों की सुरक्षा...', 20, 'विकिटेक्स्ट पार्सिंग आरंभ...');
            const { cleanText, protectedTokens, existingLinks } = protectWikitextStructures(wikitext);
            state.existingLinks = existingLinks;

            // चरण 2: तार्किक उम्मीदवार निष्कासन
            updateProgress('चरण 2/4: उम्मीदवार शब्दों की तार्किक पहचान...', 'n-gram, तिथियाँ व मात्रक फिल्टर...', 45, `संरक्षित मौजूदा कड़ियाँ: ${existingLinks.size}`);
            const candidates = extractCandidates(cleanText, state.lang);

            // चरण 3: विकिपीडिया API बैच सत्यापन
            updateProgress('चरण 3/4: विकिपीडिया पर सत्यापन...', `${candidates.length} उम्मीदवार पदों का सत्यापन...`, 70, `सत्यापन उम्मीदवार: ${candidates.length}`);
            const candidateMap = await verifyBatchTitles(state.lang, candidates);

            // चरण 4: सुझाव तालिका व डिफ़ निर्माण
            updateProgress('चरण 4/4: तार्किक कड़ियाँ एवं विकिपीडिया डिफ़ तैयार किया जा रहा है...', 'सुझाव तालिका और डिफ़ का निर्माण...', 90, 'फ़िल्टर एवं सत्यापन पूर्ण');
            buildSuggestions(cleanText, candidateMap);

            // बॉक्स 2: दूषित लेख विश्लेषण एवं तर्कों का प्रस्तुतीकरण
            const contaminationReport = analyzeContaminations(wikitext, state.lang, candidateMap);
            renderContaminationWorkbench(contaminationReport, wikitext);

            // परिणाम प्रदर्शित करना
            safeSetDisplay(DOM.resultsCard, 'block');
            renderSuggestionsTable();
            recalculateModifiedWikitext();

            // कॉम्पैक्ट बार सूचना अद्यतन (हटाए बिना)
            safeSetText(DOM.compactTitleText, state.pageTitle);
            safeSetText(DOM.compactLangText, state.lang);

            updateProgress('विश्लेषण पूर्ण हुआ!', 'परिणाम नीचे प्रदर्शित हैं।', 100, `कुल सुझाई गई कड़ियाँ: ${state.suggestions.length}`);
            setTimeout(() => {
                showProgress(false);
                if (DOM.resultsCard) DOM.resultsCard.scrollIntoView({ behavior: 'smooth' });
            }, 400);

        } catch (err) {
            console.error('Analysis error:', err);
            alert(`विश्लेषण में त्रुटि: ${err.message}`);
            showProgress(false);
        }
    }

    // ================== दूषित लेख एवं तार्किक निदान इंजन (Box 2) ==================
    function analyzeContaminations(wikitext, lang, candidateMap) {
        const result = {
            total: 0,
            overlinks: [],
            disambigs: [],
            redLinks: [],
            syntaxIssues: [],
            dateUnitIssues: [],
            arguments: []
        };

        const linkRegex = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
        const counts = new Map();
        const existingLinksList = [];
        let match;

        while ((match = linkRegex.exec(wikitext)) !== null) {
            const rawTarget = match[1].trim().replace(/_/g, ' ');
            const displayText = match[2] ? match[2].trim() : '';

            if (/^(category|श्रेणी|file|image|चित्र|फ़ाइल):/i.test(rawTarget)) continue;

            const canonical = rawTarget.charAt(0).toUpperCase() + rawTarget.slice(1);
            existingLinksList.push({ target: rawTarget, canonical: canonical, text: displayText, fullMatch: match[0] });
            counts.set(canonical, (counts.get(canonical) || 0) + 1);
        }

        // 1. तर्क: अति-कड़ीकरण (WP:OVERLINKING)
        const duplicateTerms = [];
        counts.forEach((count, canonical) => {
            if (count > 1) {
                duplicateTerms.push({ canonical, count });
                result.overlinks.push({ canonical, count });
                result.total += (count - 1);
            }
        });

        if (duplicateTerms.length > 0) {
            result.arguments.push({
                type: 'overlink',
                title: 'तर्क 1: अति-कड़ीकरण (WP:OVERLINKING)',
                desc: `विकिपीडिया नीति अनुसार पाठक के सुगम अध्ययन हेतु किसी भी पद को केवल उसके प्रथम उल्लेख पर लिंक किया जाना चाहिए। इस लेख में ${duplicateTerms.length} पद बार-बार दोहराए गए हैं (उदा: ${duplicateTerms.slice(0, 3).map(d => `[[${d.canonical}]] (${d.count} बार)`).join(', ')})। अतिरिक्त कड़ियों को हटाकर केवल पहले उल्लेख को रखा जाना चाहिए।`
            });
        }

        // 2. तर्क: व्यर्थ पाइप सिंटेक्स (Redundant Pipes)
        const redundantPipes = [];
        existingLinksList.forEach(item => {
            if (item.text && item.target.toLowerCase() === item.text.toLowerCase()) {
                redundantPipes.push(item);
                result.syntaxIssues.push(item);
                result.total++;
            }
        });

        if (redundantPipes.length > 0) {
            result.arguments.push({
                type: 'syntax',
                title: 'तर्क 2: व्यर्थ पाइप सिंटेक्स (Redundant Pipes)',
                desc: `जब लक्ष्य पृष्ठ और प्रदर्शित शब्द समरूप हों (उदा: [[${redundantPipes[0].target}|${redundantPipes[0].text}]]), तो पाइप सिंटेक्स अनावश्यक भार बढ़ाता है। इसे स्वच्छ सिंटेक्स [[${redundantPipes[0].target}]] में बदलना तार्किक है।`
            });
        }

        // 3. तर्क: सामान्य वर्ष एवं मात्रक (WP:DATELINK & Units)
        const dateUnitIssues = [];
        existingLinksList.forEach(item => {
            if (/^\d{4}$/.test(item.target) || /^[०-९]{4}$/.test(item.target)) {
                dateUnitIssues.push({ target: item.target, reason: 'सामान्य वर्ष' });
                result.dateUnitIssues.push(item);
                result.total++;
            } else if (UNITS_OF_MEASURE.has(item.target.toLowerCase())) {
                dateUnitIssues.push({ target: item.target, reason: 'माप की इकाई' });
                result.dateUnitIssues.push(item);
                result.total++;
            }
        });

        if (dateUnitIssues.length > 0) {
            result.arguments.push({
                type: 'date-unit',
                title: 'तर्क 3: सामान्य वर्ष व मात्रक (WP:DATELINK)',
                desc: `विकिपीडिया नियमावली अनुसार अकेले 4-अंकीय वर्ष (उदा: 1947, 2024) या माप की इकाइयों (किमी, मीटर, किग्रा) को सामान्यतः आंतरिक कड़ी नहीं बनाना चाहिए जब तक कि वे किसी विशिष्ट प्रसंग से न जुड़े हों।`
            });
        }

        // 4. तर्क: बहुविकल्पी पृष्ठ (WP:DISAMBIG)
        const disambigIssues = [];
        if (candidateMap) {
            candidateMap.forEach((info, term) => {
                if (info.isDisambig) {
                    disambigIssues.push(term);
                    result.disambigs.push({ term, target: info.target });
                    result.total++;
                }
            });
        }

        if (disambigIssues.length > 0) {
            result.arguments.push({
                type: 'disambig',
                title: 'तर्क 4: बहुविकल्पी कड़ियाँ (WP:DISAMBIG)',
                desc: `बहुविकल्पी पृष्ठ (उदा: ${disambigIssues.slice(0, 3).map(d => `[[${d}]]`).join(', ')}) सीधे लिंक होने से पाठक विशिष्ट लेख के बजाय विकल्पों की सूची पर पहुँचता है। ऐसे पदों को अचयनित करना अथवा विशिष्ट लक्ष्य से बदलना चाहिए।`
            });
        }

        // 5. तर्क: अस्तित्वहीन लाल कड़ियाँ (Red Links)
        const redLinkIssues = [];
        if (candidateMap) {
            candidateMap.forEach((info, term) => {
                if (!info.exists) {
                    redLinkIssues.push(term);
                    result.redLinks.push({ term, target: info.target });
                    result.total++;
                }
            });
        }

        if (redLinkIssues.length > 0) {
            result.arguments.push({
                type: 'redlink',
                title: 'तर्क 5: अस्तित्वहीन लाल कड़ियाँ (Red Links)',
                desc: `विश्लेषण में ${redLinkIssues.length} शब्द विकिपीडिया पर अनुपलब्ध पाए गए हैं (उदा: ${redLinkIssues.slice(0, 3).map(r => `[[${r}]]`).join(', ')})। अस्तित्वहीन लाल कड़ियों को तब तक शामिल नहीं किया जाना चाहिए जब तक कि वे भविष्य के महत्वपूर्ण लेख न हों।`
            });
        }

        if (result.arguments.length === 0) {
            result.arguments.push({
                type: 'clean',
                title: 'तार्किक निष्कर्ष: कोई गंभीर दोष नहीं',
                desc: 'वर्तमान विकिटेक्स्ट में कोई अति-कड़ीकरण, व्यर्थ पाइप अथवा सामान्य वर्ष दोष नहीं मिले। लेख स्वच्छ अवस्था में है।'
            });
        }

        return result;
    }

    function renderContaminationWorkbench(report, wikitext) {
        state.contaminations = report;
        safeSetValue('contaminated-wikitext-output', wikitext);

        safeSetText('stat-total-contaminations', report.total);
        safeSetText('stat-overlinks', report.overlinks.length);
        safeSetText('stat-disambigs', report.disambigs.length);
        safeSetText('stat-red-links', report.redLinks.length);
        safeSetText('stat-syntax-issues', report.syntaxIssues.length + report.dateUnitIssues.length);
        safeSetText('logic-rule-count', `${report.arguments.length} तार्किक नियम सक्रिय`);

        const badge = $('box2-status-badge');
        if (badge) {
            badge.className = 'workbench-badge ' + (report.total > 0 ? 'badge-contaminated' : 'badge-sanitized');
            badge.textContent = report.total > 0 ? `${report.total} दूषित तत्व चिह्नित` : 'स्वच्छ लेख';
        }

        const card = $('contaminated-box-card');
        if (card) {
            card.classList.remove('is-sanitized');
        }

        const sanitizeBtn = $('btn-sanitize-contaminated');
        if (sanitizeBtn) {
            sanitizeBtn.disabled = (report.total === 0);
            sanitizeBtn.textContent = report.total > 0 ? `तार्किक रूप से दूषित लेख शुद्ध करें (${report.total} सुधार)` : 'लेख पूर्व से ही शुद्ध है';
        }

        const container = $('contamination-arguments-container');
        if (container) {
            container.innerHTML = report.arguments.map(arg => `
                <div class="logic-argument-item logic-${arg.type}">
                    <div class="logic-argument-title">${escapeHtml(arg.title)}</div>
                    <div class="logic-argument-desc">${escapeHtml(arg.desc)}</div>
                </div>
            `).join('');
        }

        // विस्तृत दोष सूची (Contamination Details Container)
        const detailsContainer = $('contamination-details-container');
        if (detailsContainer) {
            if (report.total === 0) {
                detailsContainer.innerHTML = `
                    <div style="color: var(--accent-green); font-size: 0.85rem; padding: 16px; text-align: center; font-weight: 600;">
                        ✓ विकिटेक्स्ट में कोई अति-कड़ीकरण, बहुविकल्पी पद अथवा सिंटेक्स दोष नहीं मिला। लेख पूरी तरह शुद्ध है।
                    </div>
                `;
            } else {
                let html = '';
                if (report.overlinks.length > 0) {
                    html += `
                        <div class="defect-group">
                            <div class="defect-group-title" style="color: var(--accent-orange);">
                                <span>अति-कड़ीकरण (WP:OVERLINKING)</span>
                                <span class="badge badge-tool">${report.overlinks.length} पद</span>
                            </div>
                            <div class="defect-tags-list">
                                ${report.overlinks.map(o => `<span class="defect-tag">[[${escapeHtml(o.term)}]] × ${o.count}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }
                if (report.disambigs.length > 0) {
                    html += `
                        <div class="defect-group">
                            <div class="defect-group-title" style="color: var(--accent-red);">
                                <span>बहुविकल्पी कड़ियाँ (WP:DISAMBIG)</span>
                                <span class="badge badge-tool">${report.disambigs.length} पद</span>
                            </div>
                            <div class="defect-tags-list">
                                ${report.disambigs.map(d => `<span class="defect-tag">[[${escapeHtml(d.term)}]]</span>`).join('')}
                            </div>
                        </div>
                    `;
                }
                if (report.redLinks.length > 0) {
                    html += `
                        <div class="defect-group">
                            <div class="defect-group-title" style="color: #ef4444;">
                                <span>अस्तित्वहीन लाल कड़ियाँ</span>
                                <span class="badge badge-tool">${report.redLinks.length} पद</span>
                            </div>
                            <div class="defect-tags-list">
                                ${report.redLinks.map(r => `<span class="defect-tag">[[${escapeHtml(r.term)}]]</span>`).join('')}
                            </div>
                        </div>
                    `;
                }
                if (report.syntaxIssues.length > 0 || report.dateUnitIssues.length > 0) {
                    const synAll = [...report.syntaxIssues, ...report.dateUnitIssues];
                    html += `
                        <div class="defect-group">
                            <div class="defect-group-title" style="color: var(--text-secondary);">
                                <span>व्यर्थ पाइप / सामान्य तिथियाँ / मात्रक</span>
                                <span class="badge badge-tool">${synAll.length} पद</span>
                            </div>
                            <div class="defect-tags-list">
                                ${synAll.map(s => `<span class="defect-tag">${escapeHtml(s)}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }
                detailsContainer.innerHTML = html;
            }
        }

        // टैब लेबल्स में काउंट अद्यतन
        safeSetText('tab-box2-logic-btn', `तार्किक निदान (${report.arguments.length})`);
        safeSetText('tab-box2-details-btn', `दोष सूची (${report.total})`);

        const statusText = $('box2-status-text');
        if (statusText) {
            statusText.textContent = report.total > 0 
                ? `${report.total} संभावित दोष चिह्नित: WP:OVERLINKING, WP:DISAMBIG, WP:DATELINK तार्किक आधार पर जाँचें`
                : 'तार्किक नीति: कोई दोष नहीं मिला। लेख पूरी तरह शुद्ध है।';
        }

        setWorkflowStep(2);
    }

    function sanitizeContaminatedWikitext(rawText, contaminations) {
        let text = rawText;

        // 1. दोहराई गई कड़ियाँ साफ करें (WP:OVERLINKING)
        const seenTargets = new Set();
        text = text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
            if (/^(category|श्रेणी|file|image|चित्र|फ़ाइल):/i.test(target)) return match;
            const norm = target.trim().replace(/_/g, ' ');
            const canonical = norm.charAt(0).toUpperCase() + norm.slice(1);

            if (seenTargets.has(canonical)) {
                return display || target;
            } else {
                seenTargets.add(canonical);
                return match;
            }
        });

        // 2. व्यर्थ पाइप हटाएं [[X|X]] -> [[X]]
        text = text.replace(/\[\[([^\]|#]+)\|([^\]]+)\]\]/g, (match, target, display) => {
            if (target.trim().toLowerCase() === display.trim().toLowerCase()) {
                return `[[${display.trim()}]]`;
            }
            return match;
        });

        // 3. अकेले 4-अंकीय वर्ष हटाएं [[1947]] -> 1947
        text = text.replace(/\[\[([0-9]{4}|[०-९]{4})\]\]/g, '$1');

        // 4. मात्रक कड़ियाँ हटाएं [[किमी]] -> किमी
        UNITS_OF_MEASURE.forEach(unit => {
            const escaped = escapeRegex(unit);
            const regex = new RegExp(`\\[\\[(${escaped})\\]\\]`, 'gi');
            text = text.replace(regex, '$1');
        });

        return text;
    }

    function handleSanitizeContaminatedArticle() {
        const rawText = safeGetValue('contaminated-wikitext-output') || state.originalWikitext;
        if (!rawText) return;

        const cleanedText = sanitizeContaminatedWikitext(rawText, state.contaminations);
        state.sanitizedWikitext = cleanedText;
        state.originalWikitext = cleanedText;

        // बॉक्स 1 अद्यतन
        safeSetValue(DOM.rawWikitextInput, cleanedText);
        updateCharCount();

        // बॉक्स 2 विकिटेक्स्ट अद्यतन
        safeSetValue('contaminated-wikitext-output', cleanedText);

        // बॉक्स 2 स्थिति अद्यतन
        const badge = $('box2-status-badge');
        if (badge) {
            badge.className = 'workbench-badge badge-sanitized';
            badge.textContent = 'तार्किक शुद्धिकरण पूर्ण';
        }

        const card = $('contaminated-box-card');
        if (card) {
            card.classList.add('is-sanitized');
        }

        const sanitizeBtn = $('btn-sanitize-contaminated');
        if (sanitizeBtn) {
            sanitizeBtn.disabled = true;
            sanitizeBtn.textContent = 'तार्किक शुद्धिकरण पूर्ण हुआ';
        }

        safeSetText('stat-total-contaminations', '0');
        safeSetText('stat-overlinks', '0');
        safeSetText('stat-disambigs', '0');
        safeSetText('stat-red-links', '0');
        safeSetText('stat-syntax-issues', '0');

        const statusText = $('box2-status-text');
        if (statusText) {
            statusText.textContent = 'तार्किक शुद्धिकरण सफल: 0 दोष शेष। स्वच्छ एवं संतुलित विकिटेक्स्ट तैयार है।';
        }

        const detailsContainer = $('contamination-details-container');
        if (detailsContainer) {
            detailsContainer.innerHTML = `
                <div style="color: var(--accent-green); font-size: 0.85rem; padding: 16px; text-align: center; font-weight: 600;">
                    ✓ सभी पहचाने गए दूषित तत्व सफलतापूर्वक शुद्ध कर दिए गए हैं। विकिटेक्स्ट अब विकिपीडिया नीति अनुरूप है।
                </div>
            `;
        }

        const container = $('contamination-arguments-container');
        if (container) {
            const successNote = document.createElement('div');
            successNote.className = 'logic-argument-item logic-clean';
            successNote.innerHTML = `
                <div class="logic-argument-title" style="color: var(--accent-green);">तार्किक शुद्धिकरण सफलतापूर्वक लागू हुआ</div>
                <div class="logic-argument-desc">अति-कड़ीकरण (WP:OVERLINKING), व्यर्थ पाइप सिंटेक्स तथा मात्रक कड़ियाँ तार्किक नियमों अनुसार शुद्ध कर दी गई हैं। नीचे मीडियाविकी डिफ़ में परिवर्तन देखें।</div>
            `;
            container.prepend(successNote);
        }

        safeSetText('tab-box2-details-btn', 'दोष सूची (0)');

        setWorkflowStep(3);
        recalculateModifiedWikitext();
        showToast('दूषित लेख तार्किक नियमों द्वारा शुद्ध कर दिया गया');
    }

    function copyContaminatedWikitext() {
        const text = safeGetValue('contaminated-wikitext-output');
        if (!text) {
            alert('कॉपी करने हेतु कोई दूषित विकिटेक्स्ट उपलब्ध नहीं है।');
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('दूषित विकिटेक्स्ट कॉपी हुआ');
            }).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    // ================== विकिटेक्स्ट संरचना सुरक्षा ==================
    function protectWikitextStructures(rawText) {
        const protectedTokens = [];
        const existingLinks = new Set();
        let tokenIndex = 0;

        function saveToken(match) {
            const placeholder = `\x01PROTECTED_${tokenIndex++}\x02`;
            protectedTokens.push({ placeholder, original: match });
            return placeholder;
        }

        let text = rawText;

        // टिप्पणियाँ
        text = text.replace(/<!--[\s\S]*?-->/g, saveToken);

        // टैग्स
        text = text.replace(/<(nowiki|code|pre|syntaxhighlight|math|gallery)[\s\S]*?<\/\1>/gi, saveToken);

        // संदर्भ
        text = text.replace(/<ref[\s\S]*?<\/ref>/gi, saveToken);
        text = text.replace(/<ref[^>]*\/>/gi, saveToken);

        // टेम्पलेट्स {{ ... }}
        text = text.replace(/\{\{[^{}]*\}\}/g, saveToken);
        text = text.replace(/\{\{[^{}]*\}\}/g, saveToken);

        // अनुभाग शीर्षक
        text = text.replace(/^==+[^=]+==+\s*$/gm, saveToken);

        // श्रेणियाँ व चित्र
        text = text.replace(/\[\[(Category|श्रेणी|File|Image|चित्र|फ़ाइल):[^\]]+\]\]/gi, saveToken);

        // पूर्व-मौजूदा आंतरिक कड़ियाँ
        text = text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (match, target) => {
            const norm = target.trim().replace(/_/g, ' ');
            existingLinks.add(norm.charAt(0).toUpperCase() + norm.slice(1));
            return saveToken(match);
        });

        // URL लिंक्स
        text = text.replace(/https?:\/\/[^\s\]]+/g, saveToken);

        return { cleanText: text, protectedTokens, existingLinks };
    }

    // ================== उम्मीदवार निष्कासन ==================
    function extractCandidates(cleanText, lang) {
        const minLength = DOM.optMinLength ? parseInt(DOM.optMinLength.value, 10) || 3 : 3;
        const skipDates = DOM.optSkipDates ? DOM.optSkipDates.checked : true;
        const skipUnits = DOM.optSkipUnits ? DOM.optSkipUnits.checked : true;
        const filterStopwords = DOM.optFilterStopwords ? DOM.optFilterStopwords.checked : true;

        const stopwordSet = STOPWORDS[lang] || STOPWORDS.hi;
        const textWithoutTokens = cleanText.replace(/\x01PROTECTED_\d+\x02/g, ' ');

        const words = [];
        const wordRegex = /[\p{L}\p{M}\d_]+/gu;
        let m;
        while ((m = wordRegex.exec(textWithoutTokens)) !== null) {
            words.push(m[0]);
        }

        const candidates = new Set();

        // N-grams (1, 2, 3 शब्द)
        for (let i = 0; i < words.length; i++) {
            for (let n = 3; n >= 1; n--) {
                if (i + n <= words.length) {
                    const phrase = words.slice(i, i + n).join(' ').trim();
                    if (isValidCandidate(phrase, minLength, skipDates, skipUnits, filterStopwords, stopwordSet)) {
                        candidates.add(phrase);
                    }
                }
            }
        }

        return Array.from(candidates);
    }

    function isValidCandidate(phrase, minLength, skipDates, skipUnits, filterStopwords, stopwordSet) {
        if (!phrase || phrase.length < minLength) return false;
        if (/^\d+$/.test(phrase)) return false;

        const lower = phrase.toLowerCase();

        if (state.customBlacklist && state.customBlacklist.has(lower)) return false;
        if (skipDates && (DATE_WORDS.has(lower) || /^\d{4}$/.test(phrase) || /^[०-९]{4}$/.test(phrase))) return false;
        if (skipUnits && UNITS_OF_MEASURE.has(lower)) return false;

        if (filterStopwords) {
            if (stopwordSet.has(lower)) return false;
            const parts = lower.split(' ');
            if (parts.length > 1 && parts.every(p => stopwordSet.has(p))) return false;
        }

        return true;
    }

    // ================== सुझाव तालिका निर्माण ==================
    function buildSuggestions(cleanText, candidateMap) {
        const suggestions = [];
        const seenTerms = new Set();
        let idCounter = 1;

        const skipDisambig = DOM.optSkipDisambig ? DOM.optSkipDisambig.checked : true;
        const skipRed = DOM.optBlueOnly ? DOM.optBlueOnly.checked : true;
        const resolveRedirects = DOM.optResolveRedirects ? DOM.optResolveRedirects.checked : true;

        const candidateArray = Array.from(candidateMap.keys());
        candidateArray.sort((a, b) => b.length - a.length);

        for (const term of candidateArray) {
            const info = candidateMap.get(term);
            if (!info) continue;

            const exists = info.exists;
            const isRedirect = info.isRedirect;
            const isDisambig = info.isDisambig;
            let target = resolveRedirects && isRedirect ? info.target : term;

            let status = 'blue';
            if (!exists) {
                status = 'red';
            } else if (isDisambig) {
                status = 'disambig';
            } else if (isRedirect) {
                status = 'redirect';
            }

            if (status === 'red' && skipRed) continue;
            if (status === 'disambig' && skipDisambig) continue;

            const regex = createTermRegex(term);
            const match = regex.exec(cleanText);

            if (match && !seenTerms.has(term.toLowerCase())) {
                seenTerms.add(term.toLowerCase());

                const index = match.index;
                const start = Math.max(0, index - 35);
                const end = Math.min(cleanText.length, index + term.length + 35);
                let context = cleanText.substring(start, end).replace(/\x01PROTECTED_\d+\x02/g, '...');

                suggestions.push({
                    id: idCounter++,
                    term: term,
                    target: target,
                    resolvedTarget: info.target,
                    status: status,
                    isDisambig: isDisambig,
                    isMultiWord: term.includes(' '),
                    context: context,
                    checked: (status === 'blue' || status === 'redirect')
                });
            }
        }

        state.suggestions = suggestions;
    }

    function createTermRegex(term) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^\\p{L}\\p{M}\\d_])(${escaped})([^\\p{L}\\p{M}\\d_]|$)`, 'u');
    }

    // ================== छन्नी एवं तालिका रेंडरिंग ==================
    function getFilteredSuggestions() {
        return state.suggestions.filter(s => {
            if (state.filterStatus === 'blue' && s.status !== 'blue') return false;
            if (state.filterStatus === 'redirect' && s.status !== 'redirect') return false;
            if (state.filterStatus === 'disambig' && s.status !== 'disambig') return false;
            if (state.filterStatus === 'red' && s.status !== 'red') return false;

            if (state.filterType === 'multi' && !s.isMultiWord) return false;
            if (state.filterType === 'single' && s.isMultiWord) return false;

            if (state.searchQuery) {
                const q = state.searchQuery;
                const matchTerm = s.term.toLowerCase().includes(q);
                const matchTarget = s.target.toLowerCase().includes(q);
                const matchContext = s.context.toLowerCase().includes(q);
                if (!matchTerm && !matchTarget && !matchContext) return false;
            }

            return true;
        });
    }

    function renderSuggestionsTable() {
        if (!DOM.suggestionsTbody) return;
        DOM.suggestionsTbody.innerHTML = '';
        const visibleList = getFilteredSuggestions();

        if (visibleList.length === 0) {
            DOM.suggestionsTbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 26px; color: var(--text-muted);">
                        वर्तमान छन्नी के अंतर्गत कोई कड़ियाँ नहीं मिलीं।
                    </td>
                </tr>
            `;
            updateCounters();
            return;
        }

        visibleList.forEach(s => {
            const tr = document.createElement('tr');
            if (!s.checked) tr.classList.add('row-deselected');

            let statusBadge = '';
            if (s.status === 'blue') {
                statusBadge = `<span class="status-pill status-pill-blue" title="सत्यापित विकिपीडिया लेख">नीली कड़ी</span>`;
            } else if (s.status === 'redirect') {
                statusBadge = `<span class="status-pill status-pill-redirect" title="पुनर्निर्देशन -> ${escapeHtml(s.resolvedTarget)}">पुनर्निर्देशन</span>`;
            } else if (s.status === 'disambig') {
                statusBadge = `<span class="status-pill status-pill-disambig" title="चेतावनी: बहुविकल्पी पृष्ठ (WP:DISAMBIG)">बहुविकल्पी</span>`;
            } else {
                statusBadge = `<span class="status-pill status-pill-red" title="अस्तित्वहीन पृष्ठ">लाल कड़ी</span>`;
            }

            const highlightedContext = escapeHtml(s.context).replace(
                new RegExp(escapeRegex(s.term), 'g'),
                `<span class="context-highlight">${escapeHtml(s.term)}</span>`
            );

            tr.innerHTML = `
                <td>
                    <input type="checkbox" class="suggestion-checkbox" data-id="${s.id}" ${s.checked ? 'checked' : ''}>
                </td>
                <td>
                    <span class="term-tag">${escapeHtml(s.term)}</span>
                </td>
                <td>
                    <div class="target-link">
                        <button type="button" class="btn btn-text btn-sm preview-target-btn" data-target="${escapeHtml(s.target)}" title="त्वरित सारांश देखें">[सारांश]</button>
                        <a href="https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(s.target)}" target="_blank" title="विकिपीडिया पर पृष्ठ खोलें">
                            ${escapeHtml(s.target)}
                        </a>
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="context-snippet" title="${escapeHtml(s.context)}">
                        ${highlightedContext}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button type="button" class="btn btn-outline btn-sm edit-target-btn" data-id="${s.id}">संशोधन</button>
                        <button type="button" class="btn btn-outline btn-sm blacklist-term-btn text-danger" data-term="${escapeHtml(s.term)}" title="इस शब्द को ब्लैकलिस्ट करें">अनदेखा</button>
                    </div>
                </td>
            `;

            const cb = tr.querySelector('.suggestion-checkbox');
            if (cb) {
                cb.addEventListener('change', () => {
                    s.checked = cb.checked;
                    tr.classList.toggle('row-deselected', !s.checked);
                    recalculateModifiedWikitext();
                });
            }

            const editBtn = tr.querySelector('.edit-target-btn');
            if (editBtn) editBtn.addEventListener('click', () => openEditModal(s.id));

            const blBtn = tr.querySelector('.blacklist-term-btn');
            if (blBtn) {
                blBtn.addEventListener('click', () => {
                    if (confirm(`क्या आप '${s.term}' को हमेशा के लिए बहिष्कार सूची (Blacklist) में जोड़ना चाहते हैं?`)) {
                        state.customBlacklist.add(s.term.toLowerCase());
                        saveBlacklist();
                        state.suggestions = state.suggestions.filter(item => item.id !== s.id);
                        renderSuggestionsTable();
                        recalculateModifiedWikitext();
                        showToast(`'${s.term}' बहिष्कार सूची में जोड़ा गया`);
                    }
                });
            }

            const prevBtn = tr.querySelector('.preview-target-btn');
            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    const rect = e.target.getBoundingClientRect();
                    showArticleSummaryCard(s.target, rect.left, rect.top);
                });
            }

            DOM.suggestionsTbody.appendChild(tr);
        });

        updateCounters();
    }

    function updateCounters() {
        const total = state.suggestions.length;
        const blue = state.suggestions.filter(s => s.status === 'blue').length;
        const redirect = state.suggestions.filter(s => s.status === 'redirect').length;
        const disambig = state.suggestions.filter(s => s.status === 'disambig').length;
        const red = state.suggestions.filter(s => s.status === 'red').length;
        const activeCount = state.suggestions.filter(s => s.checked).length;

        safeSetText(DOM.badgeTotal, `${total} उम्मीदवार`);
        safeSetText(DOM.badgeBlue, `${blue} नीली कड़ियाँ`);
        safeSetText(DOM.badgeRedirect, `${redirect} पुनर्निर्देशन`);
        safeSetText(DOM.badgeDisambig, `${disambig} बहुविकल्पी`);
        safeSetText(DOM.badgeRed, `${red} लाल कड़ियाँ`);

        safeSetText(DOM.resultsSummaryText, `कुल ${total} उम्मीदवारों में से ${activeCount} कड़ियाँ शामिल की जा रही हैं।`);
        safeSetText(DOM.finalStatsText, `कुल ${activeCount} तार्किक कड़ियाँ चुनी गईं (कुल सुझाव: ${total})`);

        const words = state.originalWikitext.trim() ? state.originalWikitext.trim().split(/\s+/).length : 0;
        const existingCount = state.existingLinks.size;
        const totalLinks = existingCount + activeCount;
        const density = words > 0 ? ((totalLinks / words) * 100).toFixed(1) : '0.0';

        safeSetText(DOM.statTotalWords, words.toLocaleString('hi-IN'));
        safeSetText(DOM.statExistingLinks, existingCount.toLocaleString('hi-IN'));
        safeSetText(DOM.statNewLinks, `+${activeCount}`);
        safeSetText(DOM.statLinkDensity, `${density}%`);

        if (DOM.densityRating) {
            if (density < 1.5) {
                DOM.densityRating.textContent = 'अपेक्षाकृत कम कड़ियाँ';
                DOM.densityRating.className = 'density-rating badge-total';
            } else if (density <= 5.5) {
                DOM.densityRating.textContent = 'संतुलित घनत्व';
                DOM.densityRating.className = 'density-rating badge-blue';
            } else {
                DOM.densityRating.textContent = 'अति-कड़ीकरण चेतावनी';
                DOM.densityRating.className = 'density-rating badge-red';
            }
        }
    }

    // ================== संशोधित विकिटेक्स्ट एवं डिफ़ का पुनः परिकलन ==================
    function recalculateModifiedWikitext() {
        const activeSuggestions = state.suggestions.filter(s => s.checked);
        const firstOnly = DOM.optFirstOnly ? DOM.optFirstOnly.checked : true;
        const cleanPipes = DOM.optCleanPipes ? DOM.optCleanPipes.checked : true;
        const linkScope = DOM.optLinkScope ? DOM.optLinkScope.value : 'article';

        const { cleanText, protectedTokens } = protectWikitextStructures(state.originalWikitext);
        let modifiedText = cleanText;

        if (linkScope === 'lead') {
            const headingMatch = modifiedText.match(/^==+[^=]+==+\s*$/m);
            if (headingMatch) {
                const leadPart = modifiedText.substring(0, headingMatch.index);
                const restPart = modifiedText.substring(headingMatch.index);
                const processedLead = applyReplacements(leadPart, activeSuggestions, firstOnly, cleanPipes);
                modifiedText = processedLead + restPart;
            } else {
                modifiedText = applyReplacements(modifiedText, activeSuggestions, firstOnly, cleanPipes);
            }
        } else if (linkScope === 'section') {
            const sections = modifiedText.split(/(^==+[^=]+==+\s*$)/m);
            for (let i = 0; i < sections.length; i++) {
                if (!sections[i].startsWith('=')) {
                    sections[i] = applyReplacements(sections[i], activeSuggestions, true, cleanPipes);
                }
            }
            modifiedText = sections.join('');
        } else {
            modifiedText = applyReplacements(modifiedText, activeSuggestions, firstOnly, cleanPipes);
        }

        protectedTokens.forEach(t => {
            modifiedText = modifiedText.replace(t.placeholder, t.original);
        });

        state.processedWikitext = modifiedText;
        safeSetValue(DOM.finalWikitextOutput, modifiedText);

        renderMediaWikiDiff(state.originalWikitext, modifiedText, state.diffMode);
        generateRenderedPreview(modifiedText);
        updateCounters();
    }

    function applyReplacements(text, activeSuggestions, firstOnly, cleanPipes) {
        let result = text;
        const sorted = [...activeSuggestions].sort((a, b) => b.term.length - a.term.length);

        sorted.forEach(s => {
            const escaped = s.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`(^|[^\\p{L}\\p{M}\\d_\x01\x02])(${escaped})([^\\p{L}\\p{M}\\d_\x01\x02]|$)`, firstOnly ? 'u' : 'gu');

            let wikilink = '';
            if (cleanPipes && s.target.toLowerCase() === s.term.toLowerCase()) {
                wikilink = `[[${s.term}]]`;
            } else if (s.target === s.term) {
                wikilink = `[[${s.term}]]`;
            } else {
                wikilink = `[[${s.target}|${s.term}]]`;
            }

            let replaced = false;
            result = result.replace(pattern, (match, prefix, termMatch, suffix) => {
                if (firstOnly && replaced) return match;
                replaced = true;
                return `${prefix}${wikilink}${suffix}`;
            });
        });

        return result;
    }

    // ================== प्रामाणिक विकिपीडिया मीडियाविकी डिफ़ जनरेटर ==================
    function renderMediaWikiDiff(oldText, newText, mode = 'side-by-side') {
        if (!DOM.diffContainer) return;

        const oldLines = (oldText || '').split('\n');
        const newLines = (newText || '').split('\n');

        if (oldText === newText) {
            DOM.diffContainer.innerHTML = '<div class="diff-empty-msg">कोई परिवर्तन नहीं हुआ। (मूल विकिटेक्स्ट और नया विकिटेक्स्ट समरूप हैं)</div>';
            return;
        }

        const max = Math.max(oldLines.length, newLines.length);

        if (mode === 'unified') {
            // एकीकृत डिफ़ (Unified Diff)
            let html = '<table class="diff diff-contentalign-left"><tbody>';
            html += `
                <tr class="diff-title">
                    <td class="diff-marker"> </td>
                    <td class="diff-lineno"><strong>एकीकृत संशोधन दृश्य</strong></td>
                </tr>
            `;

            for (let i = 0; i < max; i++) {
                const oldLine = oldLines[i];
                const newLine = newLines[i];

                if (oldLine === newLine) {
                    if (isNearDiff(oldLines, newLines, i)) {
                        html += `
                            <tr class="diff-context">
                                <td class="diff-marker"> </td>
                                <td>${escapeHtml(oldLine || '')}</td>
                            </tr>
                        `;
                    }
                } else {
                    if (oldLine !== undefined) {
                        html += `
                            <tr>
                                <td class="diff-marker">−</td>
                                <td class="diff-deletedline">${escapeHtml(oldLine)}</td>
                            </tr>
                        `;
                    }
                    if (newLine !== undefined) {
                        const intra = highlightIntraLineAdded(oldLine || '', newLine);
                        html += `
                            <tr>
                                <td class="diff-marker">+</td>
                                <td class="diff-addedline">${intra}</td>
                            </tr>
                        `;
                    }
                }
            }

            html += '</tbody></table>';
            DOM.diffContainer.innerHTML = html;
        } else {
            // पार्श्व-दर-पार्श्व ४-कॉलम मीडियाविकी डिफ़ (4-Column Side-by-side MediaWiki Diff)
            let html = '<table class="diff diff-contentalign-left">';
            html += `
                <colgroup>
                    <col class="diff-marker" style="width: 2%;">
                    <col class="diff-content" style="width: 48%;">
                    <col class="diff-marker" style="width: 2%;">
                    <col class="diff-content" style="width: 48%;">
                </colgroup>
                <thead>
                    <tr class="diff-title">
                        <td colspan="2" class="diff-otitle"><strong>मूल / दूषित विकिटेक्स्ट</strong></td>
                        <td colspan="2" class="diff-ntitle"><strong>संशोधित विकिटेक्स्ट (तार्किक कड़ियों सहित)</strong></td>
                    </tr>
                </thead>
                <tbody>
            `;

            let inDiffBlock = false;

            for (let i = 0; i < max; i++) {
                const oldLine = oldLines[i];
                const newLine = newLines[i];

                if (oldLine === newLine) {
                    if (isNearDiff(oldLines, newLines, i)) {
                        inDiffBlock = false;
                        html += `
                            <tr class="diff-context">
                                <td class="diff-marker"> </td>
                                <td>${escapeHtml(oldLine || '')}</td>
                                <td class="diff-marker"> </td>
                                <td>${escapeHtml(newLine || '')}</td>
                            </tr>
                        `;
                    }
                } else {
                    if (!inDiffBlock) {
                        inDiffBlock = true;
                        html += `
                            <tr>
                                <td colspan="2" class="diff-lineno">पंक्ति ${i + 1}:</td>
                                <td colspan="2" class="diff-lineno">पंक्ति ${i + 1}:</td>
                            </tr>
                        `;
                    }

                    const intraAdded = highlightIntraLineAdded(oldLine || '', newLine || '');

                    html += `
                        <tr>
                            <td class="diff-marker">−</td>
                            <td class="diff-deletedline"><div>${escapeHtml(oldLine || '')}</div></td>
                            <td class="diff-marker">+</td>
                            <td class="diff-addedline"><div>${intraAdded}</div></td>
                        </tr>
                    `;
                }
            }

            html += '</tbody></table>';
            DOM.diffContainer.innerHTML = html;
        }
    }

    function isNearDiff(oldLines, newLines, idx) {
        for (let j = Math.max(0, idx - 2); j <= Math.min(Math.max(oldLines.length, newLines.length) - 1, idx + 2); j++) {
            if (oldLines[j] !== newLines[j]) return true;
        }
        return false;
    }

    function highlightIntraLineAdded(oldLine, newLine) {
        let escapedNew = escapeHtml(newLine);
        return escapedNew.replace(/\[\[([^\]]+)\]\]/g, '<ins class="diffchange diffchange-inline">[[&nbsp;$1&nbsp;]]</ins>');
    }

    // ================== पूर्वावलोकन जनरेटर ==================
    function generateRenderedPreview(wikitext) {
        if (!DOM.articlePreviewContainer) return;
        let html = escapeHtml(wikitext);

        html = html.replace(/^====([^=]+)====/gm, '<h4>$1</h4>');
        html = html.replace(/^===([^=]+)===/gm, '<h3>$1</h3>');
        html = html.replace(/^==([^=]+)==/gm, '<h2>$1</h2>');

        html = html.replace(/'''''([^']+)'''''/g, '<strong><em>$1</em></strong>');
        html = html.replace(/'''([^']+)'''/g, '<strong>$1</strong>');
        html = html.replace(/''([^']+)''/g, '<em>$1</em>');

        html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (m, target, text) => {
            return `<a href="https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(target)}" target="_blank" class="wiki-link wiki-link-new" title="${target}">${text}</a>`;
        });
        html = html.replace(/\[\[([^\]]+)\]\]/g, (m, target) => {
            return `<a href="https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(target)}" target="_blank" class="wiki-link wiki-link-new" title="${target}">${target}</a>`;
        });

        const paragraphs = html.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`);
        DOM.articlePreviewContainer.innerHTML = paragraphs.join('');
    }

    // ================== डुप्लिकेट कड़ी शोधक (Overlink Cleaner Modal) ==================
    function openDuplicateCleanerModal() {
        const text = safeGetValue(DOM.rawWikitextInput).trim() || state.originalWikitext.trim();
        if (!text) {
            alert('कृपया पहले कोई लेख लोड करें अथवा विकिटेक्स्ट दर्ज करें।');
            return;
        }

        const counts = new Map();
        const linkRegex = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
        let match;

        while ((match = linkRegex.exec(text)) !== null) {
            const target = match[1].trim().replace(/_/g, ' ');
            if (/^(category|श्रेणी|file|image|चित्र|फ़ाइल):/i.test(target)) continue;
            const norm = target.charAt(0).toUpperCase() + target.slice(1);
            counts.set(norm, (counts.get(norm) || 0) + 1);
        }

        const duplicates = Array.from(counts.entries()).filter(([t, count]) => count > 1);

        if (duplicates.length === 0) {
            safeSetHTML(DOM.duplicateLinksContainer, '<div style="padding: 18px; text-align: center; color: var(--accent-green);">इस लेख में कोई भी डुप्लिकेट आंतरिक कड़ी नहीं पाई गई। (WP:OVERLINKING का पूरा पालन)</div>');
            safeSetDisplay(DOM.btnFixDuplicates, 'none');
        } else {
            safeSetDisplay(DOM.btnFixDuplicates, 'inline-block');
            let listHtml = '';
            duplicates.sort((a, b) => b[1] - a[1]);
            duplicates.forEach(([title, count]) => {
                listHtml += `
                    <div class="duplicate-item">
                        <span><strong>[[${escapeHtml(title)}]]</strong></span>
                        <span class="duplicate-count">${count} बार लिंक</span>
                    </div>
                `;
            });
            safeSetHTML(DOM.duplicateLinksContainer, listHtml);
        }

        openModal('duplicate-cleaner-modal');
    }

    function fixDuplicateLinks() {
        let text = safeGetValue(DOM.rawWikitextInput).trim() || state.originalWikitext.trim();
        if (!text) return;

        const seenTargets = new Set();
        let cleanedCount = 0;

        text = text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
            if (/^(category|श्रेणी|file|image|चित्र|फ़ाइल):/i.test(target)) return match;
            const norm = target.trim().replace(/_/g, ' ');
            const canonical = norm.charAt(0).toUpperCase() + norm.slice(1);

            if (seenTargets.has(canonical)) {
                cleanedCount++;
                return display || target;
            } else {
                seenTargets.add(canonical);
                return match;
            }
        });

        safeSetValue(DOM.rawWikitextInput, text);
        state.originalWikitext = text;
        updateCharCount();
        closeModal('duplicate-cleaner-modal');
        showToast(`${cleanedCount} डुप्लिकेट कड़ियाँ साफ की गईं`);
        handleAnalyze();
    }

    // ================== कस्टम ब्लैकलिस्ट ==================
    function openBlacklistModal() {
        renderBlacklistTags();
        openModal('blacklist-modal');
    }

    function renderBlacklistTags() {
        if (!DOM.blacklistTagsContainer) return;
        DOM.blacklistTagsContainer.innerHTML = '';
        if (state.customBlacklist.size === 0) {
            DOM.blacklistTagsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">कोई शब्द बहिष्कृत नहीं है।</span>';
            return;
        }

        state.customBlacklist.forEach(word => {
            const chip = document.createElement('span');
            chip.className = 'blacklist-chip';
            chip.innerHTML = `${escapeHtml(word)} <span class="blacklist-remove-btn" data-word="${escapeHtml(word)}">&times;</span>`;
            chip.querySelector('.blacklist-remove-btn').addEventListener('click', () => {
                state.customBlacklist.delete(word);
                saveBlacklist();
                renderBlacklistTags();
            });
            DOM.blacklistTagsContainer.appendChild(chip);
        });
    }

    function addBlacklistWord() {
        const val = safeGetValue(DOM.blacklistNewInput).trim().toLowerCase();
        if (val) {
            state.customBlacklist.add(val);
            saveBlacklist();
            safeSetValue(DOM.blacklistNewInput, '');
            renderBlacklistTags();
            showToast(`'${val}' जोड़ा गया`);
        }
    }

    function clearBlacklist() {
        if (confirm('क्या आप पूरी कस्टम बहिष्कार सूची साफ़ करना चाहते हैं?')) {
            state.customBlacklist.clear();
            saveBlacklist();
            renderBlacklistTags();
            showToast('बहिष्कार सूची साफ़ की गई');
        }
    }

    // ================== ऑफ़लाइन ऑल-इन-वन HTML ==================
    async function generateStandaloneHtml() {
        showToast('ऑफ़लाइन फ़ाइल तैयार हो रही है...');
        try {
            const cssRes = await fetch('style.css');
            const cssText = await cssRes.text();

            const jsRes = await fetch('app.js');
            const jsText = await jsRes.text();

            const htmlRes = await fetch('index.html');
            let htmlText = await htmlRes.text();

            htmlText = htmlText.replace('<link rel="stylesheet" href="style.css">', `<style>\n${cssText}\n</style>`);
            htmlText = htmlText.replace('<script src="app.js"></script>', `<script>\n${jsText}\n</script>`);

            const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wikilink-assistant-offline.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('एकल ऑफ़लाइन HTML फ़ाइल डाउनलोड हुई');
        } catch (e) {
            alert('फ़ाइल तैयार करने में त्रुटि: ' + e.message);
        }
    }

    // ================== लक्ष्य संपादन मोडल ==================
    function openEditModal(suggestionId) {
        const item = state.suggestions.find(s => s.id === suggestionId);
        if (!item) return;

        state.editingSuggestionId = suggestionId;
        safeSetText(DOM.modalTermText, item.term);
        safeSetValue(DOM.modalTargetInput, item.target);
        safeSetDisplay(DOM.modalVerifyStatus, 'none');
        openModal('edit-target-modal');
        if (DOM.modalTargetInput) DOM.modalTargetInput.focus();
    }

    async function saveModalEdit() {
        const item = state.suggestions.find(s => s.id === state.editingSuggestionId);
        if (!item) return;

        const newTarget = safeGetValue(DOM.modalTargetInput).trim();
        if (!newTarget) {
            alert('कृपया वैध लक्ष्य पृष्ठ दर्ज करें।');
            return;
        }

        item.target = newTarget;

        try {
            const check = await verifyBatchTitles(state.lang, [newTarget]);
            const info = check.get(newTarget);
            if (info) {
                item.status = info.exists ? (info.isDisambig ? 'disambig' : (info.isRedirect ? 'redirect' : 'blue')) : 'red';
                item.resolvedTarget = info.target;
                item.isDisambig = info.isDisambig;
            }
        } catch (e) { }

        closeModal('edit-target-modal');
        renderSuggestionsTable();
        recalculateModifiedWikitext();
        showToast('कड़ी लक्ष्य अद्यतन किया गया');
    }

    // ================== बॉटम बार क्रियाएँ ==================
    function copyModifiedWikitext() {
        const text = safeGetValue(DOM.finalWikitextOutput);
        if (!text) {
            alert('कॉपी करने हेतु कोई विकिटेक्स्ट उपलब्ध नहीं है।');
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('विकिटेक्स्ट क्लिपबोर्ड पर कॉपी हुआ');
            }).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast('क्लिपबोर्ड पर कॉपी हुआ');
    }

    function openWikipediaEditPage() {
        const title = state.pageTitle || cleanWikiTitleFromInput(safeGetValue(DOM.pageInput));
        if (!title || title === 'अशीर्षक लेख') {
            alert('कृपया पहले किसी विकिपीडिया लेख का विश्लेषण करें।');
            return;
        }

        const editUrl = `https://${state.lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=edit`;
        copyModifiedWikitext();

        const openWin = window.open(editUrl, '_blank');
        if (openWin) {
            alert(`विकिपीडिया संपादन पृष्ठ खोला गया है।\nसंशोधित विकिटेक्स्ट क्लिपबोर्ड पर कॉपी हो चुका है, वहाँ पेस्ट कर सुरक्षित करें।`);
        } else {
            alert(`कृपया इस लिंक पर जाएँ: ${editUrl}`);
        }
    }

    function downloadWikiFile() {
        const text = safeGetValue(DOM.finalWikitextOutput);
        if (!text) {
            alert('डाउनलोड हेतु कोई विकिटेक्स्ट उपलब्ध नहीं है।');
            return;
        }

        const filename = `${(state.pageTitle || 'wikipedia_article').replace(/\s+/g, '_')}_wikilinked.wiki`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`'${filename}' डाउनलोड हुआ`);
    }

    function resetTool() {
        if (confirm('क्या आप नया विश्लेषण आरंभ करना चाहते हैं? वर्तमान परिणाम रीसेट हो जाएँगे।')) {
            safeSetDisplay(DOM.resultsCard, 'none');
            safeSetDisplay(DOM.compactActiveBar, 'none');
            safeSetValue(DOM.pageInput, '');
            safeSetValue(DOM.rawWikitextInput, '');
            safeSetValue(DOM.contaminatedWikitextOutput, '');
            safeSetText('stat-total-contaminations', '0');
            safeSetText('stat-overlinks', '0');
            safeSetText('stat-disambigs', '0');
            safeSetText('stat-red-links', '0');
            safeSetText('stat-syntax-issues', '0');

            const badge = $('box2-status-badge');
            if (badge) {
                badge.className = 'workbench-badge badge-waiting';
                badge.textContent = 'प्रतीक्षारत';
            }

            const sanitizeBtn = $('btn-sanitize-contaminated');
            if (sanitizeBtn) {
                sanitizeBtn.disabled = true;
                sanitizeBtn.textContent = 'तार्किक रूप से दूषित लेख शुद्ध करें';
            }

            setWorkflowStep(1);
            safeSetText('tab-box2-logic-btn', 'तार्किक निदान व नीतियां');
            safeSetText('tab-box2-details-btn', 'दोष सूची विवरण');
            const card = $('contaminated-box-card');
            if (card) card.classList.remove('is-sanitized');
            const statusText = $('box2-status-text');
            if (statusText) statusText.textContent = 'तार्किक नीति: WP:OVERLINKING, WP:DISAMBIG, WP:DATELINK एवं WP:PIPE का सत्यापन';
            const detailsContainer = $('contamination-details-container');
            if (detailsContainer) {
                detailsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 16px; text-align: center;">पहचाने गए अति-कड़ीकृत शब्दों, बहुविकल्पी पदों एवं सिंटेक्स दोषों का पदवार विवरण यहाँ दिखेगा।</div>';
            }

            state.originalWikitext = '';
            state.contaminatedWikitext = '';
            state.sanitizedWikitext = '';
            state.processedWikitext = '';
            state.suggestions = [];
            updateCharCount();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // सुरक्षित रूप से DOM लोड होने पर आरंभ करें
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
