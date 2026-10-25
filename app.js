/**
 * विकीलिंक सहायक (WikiLink Assistant) - कोर जावास्क्रिप्ट इंजन (v1.2)
 * =====================================================================
 * लेखक: सदस्य:विक्रम प्रताप (hi.wikipedia.org)
 * लाइसेंस: MIT / CC BY-SA 4.0
 * 
 * v1.2 नई विशेषताएँ:
 * 1. विकी तार्किक नियम (बहुविकल्पी WP:DISAMBIG, तिथियाँ WP:DATELINK, मात्रक/इकाइयाँ, स्वच्छ पाइप)
 * 2. उन्नत बहु-आयामी छन्नी (स्थिति, बहु-शब्द/एकल पद, अनुभाग दायरा एवं लाइव खोज)
 * 3. सहायक उपकरण: डुप्लिकेट कड़ी शोधक (Overlink Cleaner), लाइव सारांश कार्ड (REST API)
 * 4. संपादन सारांश जनरेटर, कड़ी घनत्व विश्लेषक, कस्टम ब्लैकलिस्ट, ऑफलाइन HTML एक्सपोर्ट व कीबोर्ड शॉर्टकट्स
 * =====================================================================
 */

(function () {
    'use strict';

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

    // ================== माप एवं मात्रक (Units of Measure to Skip) ==================
    const UNITS_OF_MEASURE = new Set([
        'किमी', 'कि.मी.', 'किमी.', 'मीटर', 'सेमी', 'मिमी', 'किग्रा', 'किलोग्राम', 'ग्राम', 'लीटर', 'मिली',
        'सेकंड', 'सेकेण्ड', 'मिनट', 'घंटे', 'घण्टे', 'दिन', 'माह', 'महीने', 'वर्ष', 'साल', 'दशक', 'सदी',
        'शताब्दी', 'वर्ग किमी', 'वर्ग मीटर', 'हेक्टेयर', 'एकड़', 'टन', 'मील', 'फुट', 'इंच',
        'km', 'm', 'cm', 'mm', 'kg', 'g', 'l', 'ml', 'sec', 'min', 'hr', 'hours', 'days', 'years', 'ton'
    ]);

    // ================== महीने व सामान्य तिथियों के शब्द (WP:DATELINK) ==================
    const DATE_WORDS = new Set([
        'जनवरी', 'फ़रवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'सितम्बर',
        'अक्टूबर', 'नवंबर', 'नवम्बर', 'दिसंबर', 'दिसम्बर', 'ईस्वी', 'ई.पू.', 'ईसा पूर्व', 'विक्रम संवत',
        'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'
    ]);

    // ================== अनुप्रयोग स्थिति (Application State) ==================
    const state = {
        lang: 'hi',
        pageTitle: '',
        originalWikitext: '',
        processedWikitext: '',
        existingLinks: new Set(),
        suggestions: [], // { id, term, target, resolvedTarget, status, isDisambig, isMultiWord, section, context, checked }
        customBlacklist: new Set(),
        activeTab: 'tab-input-wiki',
        activeViewTab: 'tab-view-diff',
        editingSuggestionId: null,

        // छन्नी (Filters)
        filterStatus: 'all', // 'all' | 'blue' | 'redirect' | 'disambig' | 'red'
        filterType: 'all',   // 'all' | 'multi' | 'single'
        searchQuery: ''
    };

    // ================== DOM तत्व संदर्भ ==================
    const DOM = {
        langSelect: document.getElementById('lang-select'),
        customLangWrap: document.getElementById('custom-lang-wrap'),
        customLangInput: document.getElementById('custom-lang-input'),
        pageInput: document.getElementById('page-input'),
        loadPageBtn: document.getElementById('load-page-btn'),
        rawWikitextInput: document.getElementById('raw-wikitext-input'),
        rawCharCount: document.getElementById('raw-char-count'),
        loadSampleBtn: document.getElementById('load-sample-btn'),
        clearRawBtn: document.getElementById('clear-raw-btn'),
        analyzeBtn: document.getElementById('analyze-btn'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        shortcutsBtn: document.getElementById('shortcuts-btn'),

        // सेटिंग्स
        toggleSettingsBtn: document.getElementById('toggle-settings-btn'),
        settingsAccordion: document.querySelector('.settings-accordion'),
        optFirstOnly: document.getElementById('opt-first-only'),
        optBlueOnly: document.getElementById('opt-blue-only'),
        optSkipDisambig: document.getElementById('opt-skip-disambig'),
        optSkipDates: document.getElementById('opt-skip-dates'),
        optSkipUnits: document.getElementById('opt-skip-units'),
        optResolveRedirects: document.getElementById('opt-resolve-redirects'),
        optCleanPipes: document.getElementById('opt-clean-pipes'),
        optProtectStructures: document.getElementById('opt-protect-structures'),
        optFilterStopwords: document.getElementById('opt-filter-stopwords'),
        optLinkScope: document.getElementById('opt-link-scope'),
        optMinLength: document.getElementById('opt-min-length'),

        // सहायक उपकरण बटन
        btnOpenDuplicateCleaner: document.getElementById('btn-open-duplicate-cleaner'),
        btnOpenBlacklistMgr: document.getElementById('btn-open-blacklist-mgr'),
        btnDownloadStandaloneHtml: document.getElementById('btn-download-standalone-html'),

        // प्रगति
        progressCard: document.getElementById('progress-card'),
        progressTitle: document.getElementById('progress-title'),
        progressDetail: document.getElementById('progress-detail'),
        progressBarFill: document.getElementById('progress-bar-fill'),
        progressLog: document.getElementById('progress-log'),

        // परिणाम व सांख्यिकी
        resultsCard: document.getElementById('results-card'),
        resultsSummaryText: document.getElementById('results-summary-text'),
        badgeTotal: document.getElementById('badge-total'),
        badgeBlue: document.getElementById('badge-blue'),
        badgeRedirect: document.getElementById('badge-redirect'),
        badgeDisambig: document.getElementById('badge-disambig'),
        badgeRed: document.getElementById('badge-red'),
        statTotalWords: document.getElementById('stat-total-words'),
        statExistingLinks: document.getElementById('stat-existing-links'),
        statNewLinks: document.getElementById('stat-new-links'),
        statLinkDensity: document.getElementById('stat-link-density'),
        densityRating: document.getElementById('density-rating'),

        // छन्नी (Filters)
        statusFilterChips: document.querySelectorAll('.filter-status-chip'),
        typeFilterChips: document.querySelectorAll('.filter-type-chip'),
        suggestionsTbody: document.getElementById('suggestions-tbody'),
        masterCheckbox: document.getElementById('master-suggestion-checkbox'),
        suggestionsFilterInput: document.getElementById('suggestions-filter-input'),
        btnSelectAll: document.getElementById('btn-select-all'),
        btnDeselectAll: document.getElementById('btn-deselect-all'),
        btnSelectBlueOnly: document.getElementById('btn-select-blue-only'),
        btnDeselectDisambig: document.getElementById('btn-deselect-disambig'),

        // दृश्य
        diffContainer: document.getElementById('diff-container'),
        articlePreviewContainer: document.getElementById('article-preview-container'),
        finalWikitextOutput: document.getElementById('final-wikitext-output'),
        finalStatsText: document.getElementById('final-stats-text'),

        // संपादन सारांश
        editSummaryInput: document.getElementById('edit-summary-input'),
        copySummaryBtn: document.getElementById('copy-summary-btn'),

        // बॉटम एक्शन
        copyWikitextBtn: document.getElementById('copy-wikitext-btn'),
        openWikiEditBtn: document.getElementById('open-wiki-edit-btn'),
        downloadWikiBtn: document.getElementById('download-wiki-btn'),
        resetToolBtn: document.getElementById('reset-tool-btn'),

        // मोडल्स
        editTargetModal: document.getElementById('edit-target-modal'),
        modalTermText: document.getElementById('modal-term-text'),
        modalTargetInput: document.getElementById('modal-target-input'),
        modalVerifyStatus: document.getElementById('modal-verify-status'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        modalSaveBtn: document.getElementById('modal-save-btn'),

        duplicateCleanerModal: document.getElementById('duplicate-cleaner-modal'),
        duplicateLinksContainer: document.getElementById('duplicate-links-container'),
        btnFixDuplicates: document.getElementById('btn-fix-duplicates'),

        blacklistModal: document.getElementById('blacklist-modal'),
        blacklistNewInput: document.getElementById('blacklist-new-input'),
        blacklistAddBtn: document.getElementById('blacklist-add-btn'),
        blacklistTagsContainer: document.getElementById('blacklist-tags-container'),
        blacklistClearBtn: document.getElementById('blacklist-clear-btn'),

        shortcutsModal: document.getElementById('shortcuts-modal'),

        // फ्लोटिंग सारांश कार्ड
        wikiSummaryCard: document.getElementById('wiki-summary-card'),
        summaryCardClose: document.getElementById('summary-card-close'),
        summaryImgWrap: document.getElementById('summary-img-wrap'),
        summaryImg: document.getElementById('summary-img'),
        summaryTitle: document.getElementById('summary-title'),
        summaryExtract: document.getElementById('summary-extract'),
        summaryLink: document.getElementById('summary-link'),

        // टोस्ट
        toast: document.getElementById('toast')
    };

    // ================== इनिशियलाइज़ेशन (Initialization) ==================
    function init() {
        setupTheme();
        loadSavedBlacklist();
        bindEvents();
        updateCharCount();
    }

    // ================== थीम एवं स्थानीय डेटा ==================
    function setupTheme() {
        const savedTheme = localStorage.getItem('wikilink_theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);

        DOM.themeToggleBtn.addEventListener('click', () => {
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
        DOM.langSelect.addEventListener('change', () => {
            if (DOM.langSelect.value === 'custom') {
                DOM.customLangWrap.style.display = 'block';
                DOM.customLangInput.focus();
            } else {
                DOM.customLangWrap.style.display = 'none';
            }
            state.lang = getSelectedLanguage();
        });

        DOM.customLangInput.addEventListener('input', () => {
            state.lang = getSelectedLanguage();
        });

        // त्वरित उदाहरण बटन
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                const title = e.target.dataset.title;
                DOM.langSelect.value = lang;
                DOM.customLangWrap.style.display = 'none';
                state.lang = lang;
                DOM.pageInput.value = title;
                switchTab('tab-input-wiki');
                DOM.loadPageBtn.click();
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

        // सेटिंग्स टॉगल
        DOM.toggleSettingsBtn.addEventListener('click', () => {
            DOM.settingsAccordion.classList.toggle('collapsed');
        });

        // विकिटेक्स्ट इनपुट काउंट
        DOM.rawWikitextInput.addEventListener('input', updateCharCount);

        // नमूना पाठ लोड / साफ़
        DOM.loadSampleBtn.addEventListener('click', loadSampleText);
        DOM.clearRawBtn.addEventListener('click', () => {
            DOM.rawWikitextInput.value = '';
            updateCharCount();
        });

        // लोड एवं विश्लेषण
        DOM.loadPageBtn.addEventListener('click', handleLoadArticle);
        DOM.analyzeBtn.addEventListener('click', handleAnalyze);

        // मास्टर चेकबॉक्स
        DOM.masterCheckbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            const visibleSuggestions = getFilteredSuggestions();
            visibleSuggestions.forEach(s => s.checked = checked);
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        // त्वरित चयन बटन
        DOM.btnSelectAll.addEventListener('click', () => {
            state.suggestions.forEach(s => s.checked = true);
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        DOM.btnDeselectAll.addEventListener('click', () => {
            state.suggestions.forEach(s => s.checked = false);
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        DOM.btnSelectBlueOnly.addEventListener('click', () => {
            state.suggestions.forEach(s => s.checked = (s.status === 'blue' && !s.isDisambig));
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        DOM.btnDeselectDisambig.addEventListener('click', () => {
            state.suggestions.forEach(s => {
                if (s.isDisambig || s.status === 'disambig') s.checked = false;
            });
            renderSuggestionsTable();
            recalculateModifiedWikitext();
            showToast('बहुविकल्पी कड़ियाँ अचयनित की गईं');
        });

        // स्थिति छन्नी चिप्स
        DOM.statusFilterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                DOM.statusFilterChips.forEach(c => c.classList.remove('active-chip'));
                chip.classList.add('active-chip');
                state.filterStatus = chip.dataset.status;
                renderSuggestionsTable();
            });
        });

        // प्रकार छन्नी चिप्स
        DOM.typeFilterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                DOM.typeFilterChips.forEach(c => c.classList.remove('active-chip'));
                chip.classList.add('active-chip');
                state.filterType = chip.dataset.type;
                renderSuggestionsTable();
            });
        });

        // लाइव खोज इनपुट
        DOM.suggestionsFilterInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            renderSuggestionsTable();
        });

        // सहायक उपकरण बटन
        DOM.btnOpenDuplicateCleaner.addEventListener('click', openDuplicateCleanerModal);
        DOM.btnFixDuplicates.addEventListener('click', fixDuplicateLinks);
        DOM.btnOpenBlacklistMgr.addEventListener('click', openBlacklistModal);
        DOM.btnDownloadStandaloneHtml.addEventListener('click', generateStandaloneHtml);
        DOM.shortcutsBtn.addEventListener('click', () => openModal('shortcuts-modal'));

        // ब्लैकलिस्ट मोडल घटनाएँ
        DOM.blacklistAddBtn.addEventListener('click', addBlacklistWord);
        DOM.blacklistNewInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addBlacklistWord();
        });
        DOM.blacklistClearBtn.addEventListener('click', clearBlacklist);

        // बॉटम बार एवं सारांश क्रियाएँ
        DOM.copyWikitextBtn.addEventListener('click', copyModifiedWikitext);
        DOM.copySummaryBtn.addEventListener('click', copyEditSummary);
        DOM.openWikiEditBtn.addEventListener('click', openWikipediaEditPage);
        DOM.downloadWikiBtn.addEventListener('click', downloadWikiFile);
        DOM.resetToolBtn.addEventListener('click', resetTool);

        // मोडल क्लोज बटन
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => closeModal(btn.dataset.modal));
        });
        DOM.modalCancelBtn.addEventListener('click', () => closeModal('edit-target-modal'));
        DOM.modalSaveBtn.addEventListener('click', saveModalEdit);
        DOM.summaryCardClose.addEventListener('click', closeSummaryCard);

        // कीबोर्ड शॉर्टकट्स (Keyboard shortcuts)
        document.addEventListener('keydown', handleGlobalKeydown);
    }

    // ================== कीबोर्ड शॉर्टकट हैंडलर ==================
    function handleGlobalKeydown(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
            closeSummaryCard();
            return;
        }

        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            DOM.analyzeBtn.click();
        } else if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
            e.preventDefault();
            copyModifiedWikitext();
        } else if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
            e.preventDefault();
            copyEditSummary();
        } else if (e.ctrlKey && (e.key === 'o' || e.key === 'O')) {
            e.preventDefault();
            openWikipediaEditPage();
        } else if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            openModal('shortcuts-modal');
        }
    }

    // ================== सहायक फ़ंक्शंस (Helper Utilities) ==================
    function getSelectedLanguage() {
        const val = DOM.langSelect.value;
        if (val === 'custom') {
            const customVal = DOM.customLangInput.value.trim().toLowerCase();
            return customVal || 'hi';
        }
        return val;
    }

    function switchTab(tabId) {
        state.activeTab = tabId;
        document.querySelectorAll('.input-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('#tab-input-wiki, #tab-input-raw').forEach(pane => {
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
        DOM.toast.textContent = message;
        DOM.toast.classList.add('show');
        setTimeout(() => DOM.toast.classList.remove('show'), 2600);
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
        const text = DOM.rawWikitextInput.value;
        const charCount = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        DOM.rawCharCount.textContent = `${charCount.toLocaleString('hi-IN')} अक्षर | ${words.toLocaleString('hi-IN')} शब्द`;
    }

    function cleanWikiTitleFromInput(input) {
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
        DOM.rawWikitextInput.value = `'''तुलसीदास''' (१५३२ - १६२३) हिन्दी साहित्य के महान कवि और सन्त थे। उनका जन्म राजापुर में हुआ था। उन्हें आदि काव्य रामायण के रचयिता महर्षि वाल्मीकि का अवतार माना जाता है।

श्रीरामचरितमानस तुलसीदास जी की सबसे प्रसिद्ध रचना है। उन्होंने विनय पत्रिका, दोहावली, कवितावली और हनुमान चालीसा की भी रचना की। गोस्वामी जी का जीवन वाराणसी और चित्रकूट में बीता। 

मुगल काल में सम्राट अकबर और अब्दुल रहीम खान-ए-खाना उनके समकालीन थे। काशी के अस्सी घाट पर उन्होंने अपना शरीर त्याग दिया।`;
        updateCharCount();
        showToast('नमूना पाठ लोड किया गया');
    }

    // ================== प्रगति बार ==================
    function showProgress(show = true) {
        DOM.progressCard.style.display = show ? 'block' : 'none';
        if (show) {
            DOM.progressLog.innerHTML = '';
            DOM.progressBarFill.style.width = '10%';
        }
    }

    function updateProgress(title, detail, percent, logMsg = null) {
        DOM.progressTitle.textContent = title;
        DOM.progressDetail.textContent = detail;
        DOM.progressBarFill.style.width = `${percent}%`;
        if (logMsg) {
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
            headers: { 'Api-User-Agent': 'WikiLinkAssistant/1.2 (Hindi Wikipedia Logical Wikilinker Tool)' }
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
            // prop=pageprops&ppprop=disambiguation से बहुविकल्पी पहचान
            const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${titlesParam}&prop=pageprops&ppprop=disambiguation&redirects=1&format=json&origin=*`;

            try {
                const response = await fetch(endpoint, {
                    headers: { 'Api-User-Agent': 'WikiLinkAssistant/1.2' }
                });
                const data = await response.json();
                const query = data.query || {};

                const normalMap = new Map();
                (query.normalized || []).forEach(n => normalMap.set(n.from, n.to));

                const redirectMap = new Map();
                (query.redirects || []).forEach(r => redirectMap.set(r.from, r.to));

                const pages = query.pages || {};
                const pageInfoMap = new Map(); // title -> { pageid, isDisambig }

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

    // ================== फ्लोटिंग सारांश पूर्वावलोकन कार्ड (REST Extract) ==================
    async function showArticleSummaryCard(targetTitle, x, y) {
        DOM.summaryTitle.textContent = targetTitle;
        DOM.summaryExtract.textContent = 'विकिपीडिया से सारांश लोड हो रहा है...';
        DOM.summaryImgWrap.style.display = 'none';
        DOM.summaryLink.href = `https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(targetTitle)}`;
        
        DOM.wikiSummaryCard.style.left = `${Math.min(window.innerWidth - 340, Math.max(10, x - 160))}px`;
        DOM.wikiSummaryCard.style.top = `${Math.min(window.innerHeight - 300, y + 20)}px`;
        DOM.wikiSummaryCard.style.display = 'block';

        try {
            const summaryUrl = `https://${state.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(targetTitle)}`;
            const res = await fetch(summaryUrl);
            if (!res.ok) throw new Error('Summary fetch failed');
            const data = await res.json();

            DOM.summaryTitle.textContent = data.title || targetTitle;
            DOM.summaryExtract.textContent = data.extract || 'कोई संक्षिप्त विवरण उपलब्ध नहीं है।';

            if (data.thumbnail && data.thumbnail.source) {
                DOM.summaryImg.src = data.thumbnail.source;
                DOM.summaryImgWrap.style.display = 'block';
            }
        } catch (e) {
            DOM.summaryExtract.textContent = 'इस लेख का सारांश प्राप्त नहीं हो सका।';
        }
    }

    function closeSummaryCard() {
        DOM.wikiSummaryCard.style.display = 'none';
    }

    // ================== लेख लोडिंग हैंडलर ==================
    async function handleLoadArticle() {
        const rawInput = DOM.pageInput.value.trim();
        if (!rawInput) {
            alert('कृपया विकिपीडिया लेख का शीर्षक अथवा URL दर्ज करें।');
            return;
        }

        const title = cleanWikiTitleFromInput(rawInput);
        state.lang = getSelectedLanguage();
        state.pageTitle = title;

        showProgress(true);
        updateProgress('विकिपीडिया से लेख प्राप्त किया जा रहा है...', `'${title}' (${state.lang}.wikipedia.org)...`, 25, `अनुरोध भेजा गया: ${title}`);

        try {
            const article = await fetchArticleWikitext(state.lang, title);
            state.pageTitle = article.title;
            state.originalWikitext = article.wikitext;

            DOM.pageInput.value = article.title;
            DOM.rawWikitextInput.value = article.wikitext;
            updateCharCount();

            updateProgress('लेख सफलतापूर्वक लोड हुआ!', `${article.wikitext.length.toLocaleString('hi-IN')} अक्षर प्राप्त हुए`, 100, `लेख शीर्षक: ${article.title}`);
            showToast(`'${article.title}' सफलतापूर्वक लोड हुआ!`);
            setTimeout(() => showProgress(false), 800);
        } catch (err) {
            alert(`त्रुटि: ${err.message}`);
            showProgress(false);
        }
    }

    // ================== मुख्य विश्लेषण एल्गोरिदम (Logical Linking Engine) ==================
    async function handleAnalyze() {
        let wikitext = '';
        if (state.activeTab === 'tab-input-wiki') {
            wikitext = DOM.rawWikitextInput.value.trim() || state.originalWikitext.trim();
            if (!wikitext && DOM.pageInput.value.trim()) {
                await handleLoadArticle();
                wikitext = state.originalWikitext.trim();
            }
        } else {
            wikitext = DOM.rawWikitextInput.value.trim();
        }

        if (!wikitext) {
            alert('कृपया विश्लेषण हेतु विकिपीडिया लेख लोड करें अथवा विकिटेक्स्ट दर्ज करें।');
            return;
        }

        state.originalWikitext = wikitext;
        state.lang = getSelectedLanguage();
        state.pageTitle = cleanWikiTitleFromInput(DOM.pageInput.value) || 'अशीर्षक लेख';

        showProgress(true);
        DOM.resultsCard.style.display = 'none';

        try {
            // चरण 1: संरचनात्मक सुरक्षा
            updateProgress('चरण 1/4: विकिटेक्स्ट संरचनाओं का विश्लेषण...', 'टेम्पलेट, संदर्भ, मौजूदा कड़ियों की सुरक्षा...', 20, 'विकिटेक्स्ट पार्सिंग आरंभ...');
            const { cleanText, protectedTokens, existingLinks } = protectWikitextStructures(wikitext);
            state.existingLinks = existingLinks;

            // चरण 2: तार्किक उम्मीदवार निष्कासन (नियम व छन्नी अनुसार)
            updateProgress('चरण 2/4: उम्मीदवार शब्दों की तार्किक पहचान...', 'n-gram, तिथियाँ व मात्रक फिल्टर...', 45, `संरक्षित मौजूदा कड़ियाँ: ${existingLinks.size}`);
            const candidates = extractCandidates(cleanText, state.lang);

            // चरण 3: विकिपीडिया API बैच सत्यापन (बहुविकल्पी सहित)
            updateProgress('चरण 3/4: विकिपीडिया पर सत्यापन...', `${candidates.length} उम्मीदवार पदों का सत्यापन (बहुविकल्पी सहित)...`, 70, `सत्यापन हेतु उम्मीदवार: ${candidates.length}`);
            const candidateMap = await verifyBatchTitles(state.lang, candidates);

            // चरण 4: सुझाव तालिका व डिफ़ निर्माण
            updateProgress('चरण 4/4: तार्किक कड़ियाँ एवं डिफ़ तैयार किया जा रहा है...', 'सुझाव तालिका और पूर्वावलोकन का निर्माण...', 90, 'फ़िल्टर एवं सत्यापन पूर्ण');
            buildSuggestions(cleanText, candidateMap);

            // परिणाम प्रदर्शित करना
            DOM.resultsCard.style.display = 'block';
            renderSuggestionsTable();
            recalculateModifiedWikitext();

            updateProgress('विश्लेषण पूर्ण हुआ!', 'परिणाम नीचे प्रदर्शित हैं।', 100, `कुल सुझाई गई कड़ियाँ: ${state.suggestions.length}`);
            setTimeout(() => {
                showProgress(false);
                DOM.resultsCard.scrollIntoView({ behavior: 'smooth' });
            }, 500);

        } catch (err) {
            console.error(err);
            alert(`विश्लेषण में त्रुटि: ${err.message}`);
            showProgress(false);
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

        // 1. टिप्पणियाँ
        text = text.replace(/<!--[\s\S]*?-->/g, saveToken);

        // 2. टैग्स
        text = text.replace(/<(nowiki|code|pre|syntaxhighlight|math|gallery)[\s\S]*?<\/\1>/gi, saveToken);

        // 3. संदर्भ टैग्स
        text = text.replace(/<ref[^>]*\/>/gi, saveToken);
        text = text.replace(/<ref[\s\S]*?<\/ref>/gi, saveToken);

        // 4. सामान्य HTML
        text = text.replace(/<[^>]+>/g, saveToken);

        // 5. श्रेणियाँ एवं चित्र
        text = text.replace(/\[\[(Category|श्रेणी|चित्र|फ़ाइल|File|Image):[^\]]+\]\]/gi, saveToken);

        // 6. मौजूदा कड़ियाँ
        text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
            const cleanTarget = target.trim().replace(/_/g, ' ');
            existingLinks.add(cleanTarget.toLowerCase());
            if (display) existingLinks.add(display.trim().toLowerCase());
            return saveToken(match);
        });

        // 7. टेम्पलेट्स
        let prev;
        do {
            prev = text;
            text = text.replace(/\{\{[^{}]*\}\}/g, saveToken);
        } while (text !== prev);

        // 8. शीर्षक
        text = text.replace(/^(=+)[^\n]+?\1\s*$/gm, saveToken);

        // 9. URL
        text = text.replace(/\[https?:\/\/[^\s\]]+(?:\s+[^\]]+)?\]/gi, saveToken);
        text = text.replace(/https?:\/\/[^\s"'<>]+/gi, saveToken);

        // 10. टेबल्स
        text = text.replace(/\{\|[\s\S]*?\|\}/g, saveToken);

        return { cleanText: text, protectedTokens, existingLinks };
    }

    // ================== उम्मीदवार पद निष्कासन (Rules & Filters) ==================
    function extractCandidates(cleanText, lang) {
        const minLength = parseInt(DOM.optMinLength.value, 10) || 3;
        const stopwords = STOPWORDS[lang] || STOPWORDS['hi'];
        const isStopwordFilter = DOM.optFilterStopwords.checked;
        const isSkipDates = DOM.optSkipDates.checked;
        const isSkipUnits = DOM.optSkipUnits.checked;

        const textWithoutTokens = cleanText.replace(/\x01PROTECTED_\d+\x02/g, ' ');
        const wordRegex = /[\p{L}\p{M}\d]+/gu;
        const matches = textWithoutTokens.match(wordRegex) || [];

        const candidateCounts = new Map();

        for (let i = 0; i < matches.length; i++) {
            // 3-ग्राम
            if (i + 2 < matches.length) {
                const phrase3 = `${matches[i]} ${matches[i + 1]} ${matches[i + 2]}`;
                if (isValidCandidate(phrase3, minLength, stopwords, isStopwordFilter, isSkipDates, isSkipUnits)) {
                    candidateCounts.set(phrase3, (candidateCounts.get(phrase3) || 0) + 1);
                }
            }
            // 2-ग्राम
            if (i + 1 < matches.length) {
                const phrase2 = `${matches[i]} ${matches[i + 1]}`;
                if (isValidCandidate(phrase2, minLength, stopwords, isStopwordFilter, isSkipDates, isSkipUnits)) {
                    candidateCounts.set(phrase2, (candidateCounts.get(phrase2) || 0) + 1);
                }
            }
            // 1-ग्राम
            const word = matches[i];
            if (isValidCandidate(word, minLength, stopwords, isStopwordFilter, isSkipDates, isSkipUnits)) {
                candidateCounts.set(word, (candidateCounts.get(word) || 0) + 1);
            }
        }

        const currentTitleLower = (state.pageTitle || '').toLowerCase();

        const filtered = Array.from(candidateCounts.keys()).filter(term => {
            const termLower = term.toLowerCase();
            if (termLower === currentTitleLower) return false;
            if (state.existingLinks.has(termLower)) return false;
            if (state.customBlacklist.has(termLower)) return false;
            return true;
        });

        filtered.sort((a, b) => b.length - a.length);
        return filtered.slice(0, 180);
    }

    function isValidCandidate(term, minLength, stopwords, isStopwordFilter, isSkipDates, isSkipUnits) {
        if (!term || term.length < minLength) return false;
        if (/^[\d\s.,:;।\-_]+$/.test(term)) return false;

        const lower = term.toLowerCase().trim();

        // कस्टम ब्लैकलिस्ट
        if (state.customBlacklist.has(lower)) return false;

        // स्टॉपवर्ड्स
        if (isStopwordFilter && stopwords.has(lower)) return false;

        // मात्रक व इकाइयाँ (Units of Measure)
        if (isSkipUnits && UNITS_OF_MEASURE.has(lower)) return false;

        // सामान्य तिथियाँ व वर्ष (WP:DATELINK)
        if (isSkipDates) {
            // ४-अंक वर्ष
            if (/^(?:1[0-9]{3}|20[0-9]{2}|१[०-९]{3}|२०[०-९]{2})$/.test(term)) return false;
            if (DATE_WORDS.has(lower)) return false;
            if (/^(?:\d{1,2}|[०-९]{1,2})\s+(?:जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)$/i.test(term)) return false;
        }

        return true;
    }

    // ================== सुझाव सूची निर्माण ==================
    function buildSuggestions(cleanText, candidateMap) {
        const suggestions = [];
        const skipRed = DOM.optBlueOnly.checked;
        const skipDisambig = DOM.optSkipDisambig.checked;
        const resolveRedirects = DOM.optResolveRedirects.checked;
        const seenTerms = new Set();
        let idCounter = 1;

        const sortedCandidates = Array.from(candidateMap.keys()).sort((a, b) => b.length - a.length);

        for (const term of sortedCandidates) {
            const info = candidateMap.get(term);
            if (!info) continue;

            const exists = info.exists;
            const isRedirect = info.isRedirect;
            const isDisambig = info.isDisambig;
            const target = resolveRedirects ? info.target : term;

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
                    checked: (status === 'blue' || status === 'redirect') // बहुविकल्पी व लाल कड़ियाँ डिफ़ॉल्ट रूप से अनचेक
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
            // 1. स्थिति छन्नी
            if (state.filterStatus === 'blue' && s.status !== 'blue') return false;
            if (state.filterStatus === 'redirect' && s.status !== 'redirect') return false;
            if (state.filterStatus === 'disambig' && s.status !== 'disambig') return false;
            if (state.filterStatus === 'red' && s.status !== 'red') return false;

            // 2. प्रकार छन्नी
            if (state.filterType === 'multi' && !s.isMultiWord) return false;
            if (state.filterType === 'single' && s.isMultiWord) return false;

            // 3. खोज क्वेरी
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
        DOM.suggestionsTbody.innerHTML = '';
        const visibleList = getFilteredSuggestions();

        if (visibleList.length === 0) {
            DOM.suggestionsTbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        वर्तमान छन्नी (Filters) के अंतर्गत कोई कड़ियाँ नहीं मिलीं। कृपया फ़िल्टर बदलें।
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
                statusBadge = `<span class="status-pill status-pill-blue" title="सत्यापित विकिपीडिया लेख">🔵 नीली कड़ी</span>`;
            } else if (s.status === 'redirect') {
                statusBadge = `<span class="status-pill status-pill-redirect" title="पुनर्निर्देशन -> ${escapeHtml(s.resolvedTarget)}">🟢 पुनर्निर्देशन</span>`;
            } else if (s.status === 'disambig') {
                statusBadge = `<span class="status-pill status-pill-disambig" title="चेतावनी: बहुविकल्पी पृष्ठ (WP:DISAMBIG)">⚠️ बहुविकल्पी</span>`;
            } else {
                statusBadge = `<span class="status-pill status-pill-red" title="अस्तित्वहीन पृष्ठ">🔴 लाल कड़ी</span>`;
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
                        <button type="button" class="btn btn-text btn-sm preview-target-btn" data-target="${escapeHtml(s.target)}" title="त्वरित सारांश देखें">👁️</button>
                        <a href="https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(s.target)}" target="_blank" title="विकिपीडिया पर पृष्ठ खोलें">
                            ${escapeHtml(s.target)} ↗
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
                        <button type="button" class="btn btn-outline btn-sm edit-target-btn" data-id="${s.id}" title="कड़ी लक्ष्य संशोधित करें">✏️ संपादन</button>
                        <button type="button" class="btn btn-outline btn-sm blacklist-term-btn text-danger" data-term="${escapeHtml(s.term)}" title="इस शब्द को भविष्य हेतु ब्लैकलिस्ट करें">🚫</button>
                    </div>
                </td>
            `;

            // चेकबॉक्स
            const cb = tr.querySelector('.suggestion-checkbox');
            cb.addEventListener('change', () => {
                s.checked = cb.checked;
                tr.classList.toggle('row-deselected', !s.checked);
                recalculateModifiedWikitext();
            });

            // संपादन
            tr.querySelector('.edit-target-btn').addEventListener('click', () => openEditModal(s.id));

            // ब्लैकलिस्ट
            tr.querySelector('.blacklist-term-btn').addEventListener('click', () => {
                if (confirm(`क्या आप '${s.term}' को हमेशा के लिए बहिष्कार सूची (Blacklist) में जोड़ना चाहते हैं?`)) {
                    state.customBlacklist.add(s.term.toLowerCase());
                    saveBlacklist();
                    state.suggestions = state.suggestions.filter(item => item.id !== s.id);
                    renderSuggestionsTable();
                    recalculateModifiedWikitext();
                    showToast(`'${s.term}' बहिष्कार सूची में जोड़ा गया`);
                }
            });

            // त्वरित सारांश
            tr.querySelector('.preview-target-btn').addEventListener('click', (e) => {
                const rect = e.target.getBoundingClientRect();
                showArticleSummaryCard(s.target, rect.left, rect.top);
            });

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

        DOM.badgeTotal.textContent = `${total} उम्मीदवार`;
        DOM.badgeBlue.textContent = `${blue} नीली कड़ियाँ`;
        DOM.badgeRedirect.textContent = `${redirect} पुनर्निर्देशन`;
        DOM.badgeDisambig.textContent = `${disambig} बहुविकल्पी`;
        DOM.badgeRed.textContent = `${red} लाल कड़ियाँ`;

        DOM.resultsSummaryText.textContent = `कुल ${total} उम्मीदवारों में से ${activeCount} कड़ियाँ शामिल की जा रही हैं।`;
        DOM.finalStatsText.textContent = `कुल ${activeCount} तार्किक कड़ियाँ चुनी गईं (कुल सुझाव: ${total})`;

        // कड़ी घनत्व सांख्यिकी (Link Density Stats)
        const words = state.originalWikitext.trim() ? state.originalWikitext.trim().split(/\s+/).length : 0;
        const existingCount = state.existingLinks.size;
        const totalLinks = existingCount + activeCount;
        const density = words > 0 ? ((totalLinks / words) * 100).toFixed(1) : '0.0';

        DOM.statTotalWords.textContent = words.toLocaleString('hi-IN');
        DOM.statExistingLinks.textContent = existingCount.toLocaleString('hi-IN');
        DOM.statNewLinks.textContent = `+${activeCount}`;
        DOM.statLinkDensity.textContent = `${density}%`;

        if (density < 1.5) {
            DOM.densityRating.textContent = 'अपेक्षाकृत कम कड़ियाँ';
            DOM.densityRating.className = 'density-rating badge-total';
        } else if (density <= 5.5) {
            DOM.densityRating.textContent = 'संतुलित घनत्व (WP:LINK)';
            DOM.densityRating.className = 'density-rating badge-blue';
        } else {
            DOM.densityRating.textContent = 'अति-कड़ीकरण चेतावनी';
            DOM.densityRating.className = 'density-rating badge-red';
        }

        // संपादन सारांश अपडेट
        updateEditSummary(activeCount);
    }

    function updateEditSummary(activeCount) {
        const active = state.suggestions.filter(s => s.checked);
        const topLinks = active.slice(0, 4).map(s => `[[${s.target}]]`).join(', ');
        const extraCount = active.length > 4 ? ` (+${active.length - 4} अन्य कड़ियाँ)` : '';
        const summary = `आंतरिक कड़ियाँ जोड़ीं: ${topLinks}${extraCount} (उपकरण: [[सदस्य:विक्रम प्रताप/wikilink-tool|विकीलिंक सहायक]])`;
        DOM.editSummaryInput.value = summary;
    }

    // ================== संशोधित विकिटेक्स्ट एवं डिफ़ का पुनः परिकलन ==================
    function recalculateModifiedWikitext() {
        const activeSuggestions = state.suggestions.filter(s => s.checked);
        const firstOnly = DOM.optFirstOnly.checked;
        const cleanPipes = DOM.optCleanPipes.checked;
        const linkScope = DOM.optLinkScope.value; // 'article' | 'section' | 'lead'

        const { cleanText, protectedTokens } = protectWikitextStructures(state.originalWikitext);

        let modifiedText = cleanText;

        if (linkScope === 'lead') {
            // केवल प्रथम शीर्षक से पूर्व
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
            // प्रति अनुभाग
            const sections = modifiedText.split(/(^==+[^=]+==+\s*$)/m);
            for (let i = 0; i < sections.length; i++) {
                if (!sections[i].startsWith('=')) {
                    sections[i] = applyReplacements(sections[i], activeSuggestions, true, cleanPipes);
                }
            }
            modifiedText = sections.join('');
        } else {
            // संपूर्ण लेख
            modifiedText = applyReplacements(modifiedText, activeSuggestions, firstOnly, cleanPipes);
        }

        // टोकन्स पुनर्स्थापित करें
        protectedTokens.forEach(t => {
            modifiedText = modifiedText.replace(t.placeholder, t.original);
        });

        state.processedWikitext = modifiedText;
        DOM.finalWikitextOutput.value = modifiedText;

        generateDiffView(state.originalWikitext, modifiedText);
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
            // स्वच्छ पाइप नियम (Clean Pipes)
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

    // ================== डिफ़ दृश्य जनरेटर ==================
    function generateDiffView(oldText, newText) {
        const oldLines = oldText.split('\n');
        const newLines = newText.split('\n');

        let diffHtml = '<table class="diff-table">';
        let changesCount = 0;
        const maxLines = Math.max(oldLines.length, newLines.length);

        for (let i = 0; i < maxLines; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];

            if (oldLine === newLine) {
                if (shouldShowContextLine(oldLines, newLines, i)) {
                    diffHtml += `
                        <tr class="diff-row-context">
                            <td class="diff-lineno">${i + 1}</td>
                            <td class="diff-marker"> </td>
                            <td class="diff-content">${escapeHtml(oldLine || '')}</td>
                        </tr>
                    `;
                }
            } else {
                changesCount++;
                if (oldLine !== undefined) {
                    diffHtml += `
                        <tr class="diff-row-deleted">
                            <td class="diff-lineno">${i + 1}</td>
                            <td class="diff-marker">−</td>
                            <td class="diff-content">${escapeHtml(oldLine)}</td>
                        </tr>
                    `;
                }
                if (newLine !== undefined) {
                    const highlightedAdd = escapeHtml(newLine).replace(/\[\[([^\]]+)\]\]/g, '<span class="diff-highlight-add">[[&nbsp;$1&nbsp;]]</span>');
                    diffHtml += `
                        <tr class="diff-row-added">
                            <td class="diff-lineno">${i + 1}</td>
                            <td class="diff-marker">+</td>
                            <td class="diff-content">${highlightedAdd}</td>
                        </tr>
                    `;
                }
            }
        }

        diffHtml += '</table>';
        DOM.diffContainer.innerHTML = changesCount === 0 
            ? '<div class="diff-empty-msg">कोई परिवर्तन नहीं हुआ। (मूल विकिटेक्स्ट और नया विकिटेक्स्ट समरूप हैं)</div>' 
            : diffHtml;
    }

    function shouldShowContextLine(oldLines, newLines, idx) {
        for (let j = Math.max(0, idx - 2); j <= Math.min(Math.max(oldLines.length, newLines.length) - 1, idx + 2); j++) {
            if (oldLines[j] !== newLines[j]) return true;
        }
        return false;
    }

    // ================== पूर्वावलोकन जनरेटर ==================
    function generateRenderedPreview(wikitext) {
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

    // ================== सहायक उपकरण: डुप्लिकेट कड़ी शोधक (Overlink Cleaner) ==================
    function openDuplicateCleanerModal() {
        const text = DOM.rawWikitextInput.value.trim() || state.originalWikitext.trim();
        if (!text) {
            alert('कृपया पहले कोई लेख लोड करें अथवा विकिटेक्स्ट दर्ज करें।');
            return;
        }

        const counts = new Map();
        const linkRegex = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
        let match;

        while ((match = linkRegex.exec(text)) !== null) {
            const target = match[1].trim().replace(/_/g, ' ');
            // श्रेणी या फ़ाइल छोड़ें
            if (/^(category|श्रेणी|file|image|चित्र|फ़ाइल):/i.test(target)) continue;
            const norm = target.charAt(0).toUpperCase() + target.slice(1);
            counts.set(norm, (counts.get(norm) || 0) + 1);
        }

        const duplicates = Array.from(counts.entries()).filter(([t, count]) => count > 1);

        if (duplicates.length === 0) {
            DOM.duplicateLinksContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--accent-green);">🎉 बहुत खूब! इस लेख में कोई भी डुप्लिकेट आंतरिक कड़ी नहीं पाई गई। (WP:OVERLINKING का पूरा पालन)</div>';
            DOM.btnFixDuplicates.style.display = 'none';
        } else {
            DOM.btnFixDuplicates.style.display = 'inline-block';
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
            DOM.duplicateLinksContainer.innerHTML = listHtml;
        }

        openModal('duplicate-cleaner-modal');
    }

    function fixDuplicateLinks() {
        let text = DOM.rawWikitextInput.value.trim() || state.originalWikitext.trim();
        if (!text) return;

        const seenTargets = new Set();
        let cleanedCount = 0;

        // केवल पहली बार कड़ी रखें, अगली बार केवल शब्द रहने दें
        text = text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
            if (/^(category|श्रेणी|file|image|चित्र|फ़ाइल):/i.test(target)) return match;
            const norm = target.trim().replace(/_/g, ' ');
            const canonical = norm.charAt(0).toUpperCase() + norm.slice(1);

            if (seenTargets.has(canonical)) {
                cleanedCount++;
                return display || target; // कड़ी हटाकर केवल शब्द रखें
            } else {
                seenTargets.add(canonical);
                return match;
            }
        });

        DOM.rawWikitextInput.value = text;
        state.originalWikitext = text;
        updateCharCount();
        closeModal('duplicate-cleaner-modal');
        showToast(`✨ ${cleanedCount} डुप्लिकेट कड़ियाँ सफलतापूर्वक साफ की गईं!`);
        handleAnalyze();
    }

    // ================== सहायक उपकरण: कस्टम ब्लैकलिस्ट ==================
    function openBlacklistModal() {
        renderBlacklistTags();
        openModal('blacklist-modal');
    }

    function renderBlacklistTags() {
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
        const val = DOM.blacklistNewInput.value.trim().toLowerCase();
        if (val) {
            state.customBlacklist.add(val);
            saveBlacklist();
            DOM.blacklistNewInput.value = '';
            renderBlacklistTags();
            showToast(`'${val}' बहिष्कार सूची में जोड़ा गया`);
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

    // ================== सहायक उपकरण: ऑफलाइन ऑल-इन-वन HTML ==================
    async function generateStandaloneHtml() {
        showToast('ऑफ़लाइन HTML बंडल तैयार हो रहा है...');
        try {
            const cssRes = await fetch('style.css');
            const cssText = await cssRes.text();

            const jsRes = await fetch('app.js');
            const jsText = await jsRes.text();

            const htmlRes = await fetch('index.html');
            let htmlText = await htmlRes.text();

            // बाहरी CSS को इनलाइन स्टाइल में बदलें
            htmlText = htmlText.replace('<link rel="stylesheet" href="style.css">', `<style>\n${cssText}\n</style>`);
            // बाहरी JS को इनलाइन स्क्रिप्ट में बदलें
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
            showToast('✅ एकल ऑफ़लाइन HTML फ़ाइल डाउनलोड हुई!');
        } catch (e) {
            alert('ऑफ़लाइन फ़ाइल जनरेट करने में त्रुटि: ' + e.message);
        }
    }

    // ================== लक्ष्य संपादन मोडल ==================
    function openEditModal(suggestionId) {
        const item = state.suggestions.find(s => s.id === suggestionId);
        if (!item) return;

        state.editingSuggestionId = suggestionId;
        DOM.modalTermText.textContent = item.term;
        DOM.modalTargetInput.value = item.target;
        DOM.modalVerifyStatus.style.display = 'none';
        openModal('edit-target-modal');
        DOM.modalTargetInput.focus();
    }

    async function saveModalEdit() {
        const item = state.suggestions.find(s => s.id === state.editingSuggestionId);
        if (!item) return;

        const newTarget = DOM.modalTargetInput.value.trim();
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

    // ================== बॉटम बार क्रियाएँ (Copy, Open Wiki, Download) ==================
    function copyModifiedWikitext() {
        const text = DOM.finalWikitextOutput.value;
        if (!text) {
            alert('कॉपी करने हेतु कोई विकिटेक्स्ट उपलब्ध नहीं है।');
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('✅ विकिटेक्स्ट क्लिपबोर्ड पर कॉपी हुआ!');
            }).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    function copyEditSummary() {
        const summary = DOM.editSummaryInput.value;
        if (!summary) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(summary).then(() => {
                showToast('✅ संपादन सारांश क्लिपबोर्ड पर कॉपी हुआ!');
            }).catch(() => fallbackCopy(summary));
        } else {
            fallbackCopy(summary);
        }
    }

    function fallbackCopy(text) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast('✅ क्लिपबोर्ड पर कॉपी हुआ!');
    }

    function openWikipediaEditPage() {
        const title = state.pageTitle || cleanWikiTitleFromInput(DOM.pageInput.value);
        if (!title || title === 'अशीर्षक लेख') {
            alert('कृपया पहले किसी विकिपीडिया लेख का विश्लेषण करें।');
            return;
        }

        const editUrl = `https://${state.lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=edit`;
        copyModifiedWikitext();

        const openWin = window.open(editUrl, '_blank');
        if (openWin) {
            alert(`विकिपीडिया संपादन पृष्ठ नई विंडो में खोला गया है!\n\nविकिटेक्स्ट क्लिपबोर्ड पर कॉपी हो चुका है।\nसंपादन बॉक्स में पेस्ट करें और संपादन सारांश में 'तार्किक कड़ियाँ जोड़ीं (विकीलिंक सहायक)' लिखें।`);
        } else {
            alert(`कृपया इस लिंक पर जाएँ: ${editUrl}`);
        }
    }

    function downloadWikiFile() {
        const text = DOM.finalWikitextOutput.value;
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
            DOM.resultsCard.style.display = 'none';
            DOM.pageInput.value = '';
            DOM.rawWikitextInput.value = '';
            state.originalWikitext = '';
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

    document.addEventListener('DOMContentLoaded', init);

})();
