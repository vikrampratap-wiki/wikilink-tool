/**
 * विकीलिंक सहायक (WikiLink Assistant) - कोर जावास्क्रिप्ट इंजन (v1.0)
 * =====================================================================
 * लेखक: सदस्य:विक्रम प्रताप (hi.wikipedia.org)
 * लाइसेंस: MIT / CC BY-SA 4.0
 * 
 * विशेषताएँ:
 * 1. बहुभाषी विकिपीडिया समर्थन (MediaWiki Action/REST API)
 * 2. सुरक्षित विकिटेक्स्ट पार्सिंग (संरक्षित संरचनाएँ: {{...}}, <ref>, == ==, [[...]] आदि)
 * 3. तार्किक आंतरिक कड़ी पहचान (n-gram, स्टॉपवर्ड निष्कासन, प्रथम उल्लेख नियम)
 * 4. बैच API सत्यापन (नीली कड़ियाँ, पुनर्निर्देशन, लाल कड़ियाँ)
 * 5. reFill-शैली संवादात्मक समीक्षा, डिफ़ एवं विकिटेक्स्ट जनरेटर
 * =====================================================================
 */

(function () {
    'use strict';

    // ================== भाषा-विशिष्ट आम स्टॉपवर्ड्स (बहिष्कार सूची) ==================
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
            'लिया', 'लिए', 'ली', 'कहा', 'कहे', 'कही', 'माना', 'माने', 'मानी', 'देखा', 'देखे', 'देखी'
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

    // ================== अनुप्रयोग स्थिति (Application State) ==================
    const state = {
        lang: 'hi',
        pageTitle: '',
        originalWikitext: '',
        processedWikitext: '',
        existingLinks: new Set(),
        suggestions: [], // Array of { id, term, target, status, resolvedTarget, context, checked }
        activeTab: 'tab-input-wiki',
        activeViewTab: 'tab-view-diff',
        editingSuggestionId: null
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

        // सेटिंग्स
        toggleSettingsBtn: document.getElementById('toggle-settings-btn'),
        settingsAccordion: document.querySelector('.settings-accordion'),
        optFirstOnly: document.getElementById('opt-first-only'),
        optBlueOnly: document.getElementById('opt-blue-only'),
        optResolveRedirects: document.getElementById('opt-resolve-redirects'),
        optProtectStructures: document.getElementById('opt-protect-structures'),
        optFilterStopwords: document.getElementById('opt-filter-stopwords'),
        optMinLength: document.getElementById('opt-min-length'),

        // प्रगति
        progressCard: document.getElementById('progress-card'),
        progressTitle: document.getElementById('progress-title'),
        progressDetail: document.getElementById('progress-detail'),
        progressBarFill: document.getElementById('progress-bar-fill'),
        progressLog: document.getElementById('progress-log'),

        // परिणाम
        resultsCard: document.getElementById('results-card'),
        resultsSummaryText: document.getElementById('results-summary-text'),
        badgeTotal: document.getElementById('badge-total'),
        badgeBlue: document.getElementById('badge-blue'),
        badgeRedirect: document.getElementById('badge-redirect'),
        badgeRed: document.getElementById('badge-red'),
        suggestionsTbody: document.getElementById('suggestions-tbody'),
        masterCheckbox: document.getElementById('master-suggestion-checkbox'),
        suggestionsFilterInput: document.getElementById('suggestions-filter-input'),

        // परिणाम क्रियाएँ
        btnSelectAll: document.getElementById('btn-select-all'),
        btnDeselectAll: document.getElementById('btn-deselect-all'),
        btnSelectBlueOnly: document.getElementById('btn-select-blue-only'),
        btnSelectRedirects: document.getElementById('btn-select-redirects'),

        // दृश्य
        diffContainer: document.getElementById('diff-container'),
        articlePreviewContainer: document.getElementById('article-preview-container'),
        finalWikitextOutput: document.getElementById('final-wikitext-output'),
        finalStatsText: document.getElementById('final-stats-text'),

        // बॉटम एक्शन
        copyWikitextBtn: document.getElementById('copy-wikitext-btn'),
        openWikiEditBtn: document.getElementById('open-wiki-edit-btn'),
        downloadWikiBtn: document.getElementById('download-wiki-btn'),
        resetToolBtn: document.getElementById('reset-tool-btn'),

        // मोडल
        editTargetModal: document.getElementById('edit-target-modal'),
        modalTermText: document.getElementById('modal-term-text'),
        modalTargetInput: document.getElementById('modal-target-input'),
        modalVerifyStatus: document.getElementById('modal-verify-status'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        modalSaveBtn: document.getElementById('modal-save-btn'),
        modalCloseBtn: document.getElementById('modal-close-btn'),

        // टोस्ट
        toast: document.getElementById('toast')
    };

    // ================== इनिशियलाइज़ेशन (Initialization) ==================
    function init() {
        setupTheme();
        bindEvents();
        updateCharCount();
    }

    // ================== थीम प्रबंधन ==================
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
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                switchTab(targetTab);
            });
        });

        // परिणाम दृश्य टैब्स
        document.querySelectorAll('.result-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                switchResultTab(targetTab);
            });
        });

        // सेटिंग्स टॉगल
        DOM.toggleSettingsBtn.addEventListener('click', () => {
            DOM.settingsAccordion.classList.toggle('collapsed');
        });

        // विकिटेक्स्ट इनपुट काउंट
        DOM.rawWikitextInput.addEventListener('input', updateCharCount);

        // नमूना पाठ लोड करें
        DOM.loadSampleBtn.addEventListener('click', loadSampleText);
        DOM.clearRawBtn.addEventListener('click', () => {
            DOM.rawWikitextInput.value = '';
            updateCharCount();
        });

        // लेख लोड करें बटन
        DOM.loadPageBtn.addEventListener('click', handleLoadArticle);

        // मुख्य विश्लेषण बटन
        DOM.analyzeBtn.addEventListener('click', handleAnalyze);

        // मास्टर चेकबॉक्स
        DOM.masterCheckbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            state.suggestions.forEach(s => s.checked = checked);
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        // फ़िल्टर बटन
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
            state.suggestions.forEach(s => s.checked = (s.status === 'blue'));
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        DOM.btnSelectRedirects.addEventListener('click', () => {
            state.suggestions.forEach(s => s.checked = (s.status === 'blue' || s.status === 'redirect'));
            renderSuggestionsTable();
            recalculateModifiedWikitext();
        });

        // सुझाई गई कड़ियों में त्वरित खोज
        DOM.suggestionsFilterInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const rows = DOM.suggestionsTbody.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });

        // बॉटम बार क्रियाएँ
        DOM.copyWikitextBtn.addEventListener('click', copyModifiedWikitext);
        DOM.openWikiEditBtn.addEventListener('click', openWikipediaEditPage);
        DOM.downloadWikiBtn.addEventListener('click', downloadWikiFile);
        DOM.resetToolBtn.addEventListener('click', resetTool);

        // मोडल क्रियाएँ
        DOM.modalCancelBtn.addEventListener('click', closeModal);
        DOM.modalCloseBtn.addEventListener('click', closeModal);
        DOM.modalSaveBtn.addEventListener('click', saveModalEdit);
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
        setTimeout(() => {
            DOM.toast.classList.remove('show');
        }, 2600);
    }

    function updateCharCount() {
        const text = DOM.rawWikitextInput.value;
        const charCount = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        DOM.rawCharCount.textContent = `${charCount.toLocaleString('hi-IN')} अक्षर | ${words.toLocaleString('hi-IN')} शब्द`;
    }

    function cleanWikiTitleFromInput(input) {
        let title = input.trim();
        // यदि URL है तो पार्स करें
        if (title.startsWith('http://') || title.startsWith('https://')) {
            try {
                const url = new URL(title);
                if (url.pathname.includes('/wiki/')) {
                    title = url.pathname.split('/wiki/')[1];
                } else if (url.searchParams.has('title')) {
                    title = url.searchParams.get('title');
                }
                title = decodeURIComponent(title).replace(/_/g, ' ');
            } catch (e) {
                // साधारण स्ट्रिंग के रूप में उपयोग करें
            }
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

    // ================== प्रगति बार अपडेटर ==================
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
            headers: {
                'Api-User-Agent': 'WikiLinkAssistant/1.0 (Hindi Wikipedia Logical Wikilinker Tool)'
            }
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
        const content = page.revisions?.[0]?.slots?.main?.content || '';
        return {
            title: page.title,
            wikitext: content
        };
    }

    async function verifyBatchTitles(lang, titles) {
        // विकिपीडिया एक्शन API एक बार में अधिकतम 50 शीर्षक स्वीकार करता है
        const BATCH_SIZE = 45;
        const results = new Map(); // title -> { exists: bool, isRedirect: bool, target: string, pageid: number }

        for (let i = 0; i < titles.length; i += BATCH_SIZE) {
            const chunk = titles.slice(i, i + BATCH_SIZE);
            const titlesParam = chunk.map(t => encodeURIComponent(t)).join('|');
            const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${titlesParam}&redirects=1&format=json&origin=*`;

            try {
                const response = await fetch(endpoint, {
                    headers: { 'Api-User-Agent': 'WikiLinkAssistant/1.0' }
                });
                const data = await response.json();
                const query = data.query || {};

                // नॉर्मलाइजेशन का नक्शा
                const normalMap = new Map();
                (query.normalized || []).forEach(n => normalMap.set(n.from, n.to));

                // पुनर्निर्देशन का नक्शा
                const redirectMap = new Map();
                (query.redirects || []).forEach(r => redirectMap.set(r.from, r.to));

                // पृष्ठ डेटा
                const pages = query.pages || {};
                const pageTitles = new Set();
                Object.values(pages).forEach(p => {
                    if (p.pageid && p.pageid > 0 && !p.missing) {
                        pageTitles.add(p.title);
                    }
                });

                chunk.forEach(originalTerm => {
                    let norm = normalMap.get(originalTerm) || originalTerm;
                    let redirectedTo = redirectMap.get(norm) || redirectMap.get(originalTerm);
                    
                    const finalTarget = redirectedTo || norm;
                    const exists = pageTitles.has(finalTarget);

                    results.set(originalTerm, {
                        exists: exists,
                        isRedirect: !!redirectedTo,
                        target: finalTarget,
                        originalTerm: originalTerm
                    });
                });
            } catch (err) {
                console.warn('Batch verification error for chunk:', chunk, err);
                chunk.forEach(t => {
                    results.set(t, { exists: false, isRedirect: false, target: t, originalTerm: t });
                });
            }
        }

        return results;
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

    // ================== मुख्य विश्लेषण एल्गोरिदम (Logical Wikilinking Engine) ==================
    async function handleAnalyze() {
        // विकिटेक्स्ट प्राप्त करें
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
            // चरण 1: संरक्षित संरचनाओं की पहचान और प्रतिस्थापन
            updateProgress('चरण 1/4: विकिटेक्स्ट संरचनाओं का विश्लेषण...', 'टेम्पलेट, संदर्भ, मौजूदा कड़ियों की सुरक्षा...', 20, 'विकिटेक्स्ट पार्सिंग आरंभ...');
            const { cleanText, protectedTokens, existingLinks } = protectWikitextStructures(wikitext);
            state.existingLinks = existingLinks;

            // चरण 2: उम्मीदवार शब्दों एवं वाक्यांशों की तार्किक पहचान
            updateProgress('चरण 2/4: उम्मीदवार शब्दों की तार्किक पहचान...', 'n-gram विश्लेषण एवं स्टॉपवर्ड्स निष्कासन...', 45, `संरक्षित मौजूदा कड़ियाँ: ${existingLinks.size}`);
            const candidates = extractCandidates(cleanText, state.lang);

            updateProgress('चरण 3/4: विकिपीडिया पर सत्यापन...', `${candidates.length} उम्मीदवार पदों का विकिपीडिया Action API द्वारा सत्यापन...`, 70, `कुल अद्वितीय उम्मीदवार: ${candidates.length}`);

            // चरण 3: विकिपीडिया Action API से बैच सत्यापन
            const candidateMap = await verifyBatchTitles(state.lang, candidates);

            // चरण 4: सुझाई गई कड़ियों की सूची निर्माण (कड़ीकरण)
            updateProgress('चरण 4/4: तार्किक कड़ियाँ एवं डिफ़ तैयार किया जा रहा है...', 'सुझाव तालिका और पूर्वावलोकन का निर्माण...', 90, 'फ़िल्टर एवं सत्यापन पूर्ण');
            
            buildSuggestions(cleanText, candidateMap);

            // परिणाम कार्ड दिखाना
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

        // 1. टिप्पणियाँ (Comments): <!-- ... -->
        text = text.replace(/<!--[\s\S]*?-->/g, saveToken);

        // 2. <nowiki>, <code>, <pre>, <syntaxhighlight>, <math> टैग्स
        text = text.replace(/<(nowiki|code|pre|syntaxhighlight|math|gallery)[\s\S]*?<\/\1>/gi, saveToken);

        // 3. संदर्भ टैग्स: <ref ...> ... </ref> एवं <ref ... />
        text = text.replace(/<ref[^>]*\/>/gi, saveToken);
        text = text.replace(/<ref[\s\S]*?<\/ref>/gi, saveToken);

        // 4. सामान्य HTML टैग्स
        text = text.replace(/<[^>]+>/g, saveToken);

        // 5. श्रेणियाँ (Categories) और फ़ाइलें/चित्र (Files/Images)
        text = text.replace(/\[\[(Category|श्रेणी|चित्र|फ़ाइल|File|Image):[^\]]+\]\]/gi, saveToken);

        // 6. मौजूदा आंतरिक कड़ियाँ (Existing Wikilinks) -> कड़ियों का लक्ष्य सहेजें ताकि पुनः लिंक न हो
        text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
            const cleanTarget = target.trim().replace(/_/g, ' ');
            existingLinks.add(cleanTarget.toLowerCase());
            if (display) {
                existingLinks.add(display.trim().toLowerCase());
            }
            return saveToken(match);
        });

        // 7. टेम्पलेट्स (Templates): {{ ... }}
        // नेस्टेड टेम्पलेट्स को सुरक्षित करने हेतु लूप
        let prev;
        do {
            prev = text;
            text = text.replace(/\{\{[^{}]*\}\}/g, saveToken);
        } while (text !== prev);

        // 8. अनुभाग शीर्षक: == ... ==
        text = text.replace(/^(=+)[^\n]+?\1\s*$/gm, saveToken);

        // 9. बाहरी कड़ियाँ: [http...] एवं सामान्य URL
        text = text.replace(/\[https?:\/\/[^\s\]]+(?:\s+[^\]]+)?\]/gi, saveToken);
        text = text.replace(/https?:\/\/[^\s"'<>]+/gi, saveToken);

        // 10. विकी टेबल सिंटेक्स: {| ... |}
        text = text.replace(/\{\|[\s\S]*?\|\}/g, saveToken);

        return {
            cleanText: text,
            protectedTokens,
            existingLinks
        };
    }

    // ================== उम्मीदवार पद निष्कासन (Candidate Extraction) ==================
    function extractCandidates(cleanText, lang) {
        const minLength = parseInt(DOM.optMinLength.value, 10) || 3;
        const stopwords = STOPWORDS[lang] || STOPWORDS['hi'];
        const isStopwordFilter = DOM.optFilterStopwords.checked;

        // केवल सुरक्षित टोकन्स रहित पाठ
        const textWithoutTokens = cleanText.replace(/\x01PROTECTED_\d+\x02/g, ' ');

        // शब्द टोकनाइज़ेशन (Unicode-aware शब्द)
        const wordRegex = /[\p{L}\p{M}\d]+/gu;
        const matches = textWithoutTokens.match(wordRegex) || [];

        const candidateCounts = new Map();

        // 1. बहु-शब्द वाक्यांश (3-grams और 2-grams)
        for (let i = 0; i < matches.length; i++) {
            // 3-ग्राम
            if (i + 2 < matches.length) {
                const phrase3 = `${matches[i]} ${matches[i + 1]} ${matches[i + 2]}`;
                if (!isPureNumeric(phrase3) && phrase3.length >= minLength) {
                    candidateCounts.set(phrase3, (candidateCounts.get(phrase3) || 0) + 1);
                }
            }
            // 2-ग्राम
            if (i + 1 < matches.length) {
                const phrase2 = `${matches[i]} ${matches[i + 1]}`;
                if (!isPureNumeric(phrase2) && phrase2.length >= minLength) {
                    candidateCounts.set(phrase2, (candidateCounts.get(phrase2) || 0) + 1);
                }
            }
            // 1-ग्राम (एकल शब्द)
            const word = matches[i];
            const lowerWord = word.toLowerCase();

            if (word.length >= minLength && !isPureNumeric(word)) {
                if (!isStopwordFilter || !stopwords.has(lowerWord)) {
                    candidateCounts.set(word, (candidateCounts.get(word) || 0) + 1);
                }
            }
        }

        // लेख का स्वयं का शीर्षक कड़ी नहीं होना चाहिए
        const currentTitleLower = (state.pageTitle || '').toLowerCase();

        // मौजूदा कड़ियों को छोड़ें और शीर्ष उम्मीदवार फ़िल्टर करें
        const filtered = Array.from(candidateCounts.keys()).filter(term => {
            const termLower = term.toLowerCase();
            if (termLower === currentTitleLower) return false;
            if (state.existingLinks.has(termLower)) return false;
            return true;
        });

        // अधिकतम 200 उम्मीदवार पदों की सीमा (तेज़ API सत्यापन हेतु)
        // बड़े वाक्यांशों को प्राथमिकता दें
        filtered.sort((a, b) => b.length - a.length);
        return filtered.slice(0, 180);
    }

    function isPureNumeric(str) {
        return /^[\d\s.,:;।\-_]+$/.test(str);
    }

    // ================== सुझाव सूची निर्माण ==================
    function buildSuggestions(cleanText, candidateMap) {
        const suggestions = [];
        const skipRed = DOM.optBlueOnly.checked;
        const resolveRedirects = DOM.optResolveRedirects.checked;
        const seenTerms = new Set();
        let idCounter = 1;

        // उम्मीदवारों को लंबाई के घटते क्रम में क्रमबद्ध करें (ताकि 'भारतीय राष्ट्रीय कांग्रेस' पहले मैच हो, फिर 'कांग्रेस')
        const sortedCandidates = Array.from(candidateMap.keys()).sort((a, b) => b.length - a.length);

        for (const term of sortedCandidates) {
            const info = candidateMap.get(term);
            if (!info) continue;

            const exists = info.exists;
            const isRedirect = info.isRedirect;
            const target = resolveRedirects ? info.target : term;

            let status = 'blue';
            if (!exists) {
                status = 'red';
            } else if (isRedirect) {
                status = 'redirect';
            }

            // यदि लाल कड़ियाँ छोड़नी हैं
            if (status === 'red' && skipRed) {
                continue;
            }

            // पाठ में शब्द की स्थिति खोजें
            const regex = createTermRegex(term);
            const match = regex.exec(cleanText);

            if (match && !seenTerms.has(term.toLowerCase())) {
                seenTerms.add(term.toLowerCase());

                // संदर्भ (Context snippet) निकालें
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
                    context: context,
                    checked: (status !== 'red') // लाल कड़ियाँ डिफ़ॉल्ट रूप से अनचेक्ड
                });
            }
        }

        state.suggestions = suggestions;
    }

    function createTermRegex(term) {
        // देवनागरी एवं लैटिन अक्षरों के लिए सुरक्षित सीमा (Word Boundary)
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^\\p{L}\\p{M}\\d_])(${escaped})([^\\p{L}\\p{M}\\d_]|$)`, 'u');
    }

    // ================== तालिका एवं परिणाम रेंडरिंग ==================
    function renderSuggestionsTable() {
        DOM.suggestionsTbody.innerHTML = '';

        if (state.suggestions.length === 0) {
            DOM.suggestionsTbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        इस लेख में कोई नई तार्किक कड़ियाँ नहीं मिलीं अथवा सभी प्रमुख पद पहले से ही जुड़े हुए हैं।
                    </td>
                </tr>
            `;
            updateCounters();
            return;
        }

        state.suggestions.forEach(s => {
            const tr = document.createElement('tr');
            if (!s.checked) tr.classList.add('row-deselected');

            let statusBadge = '';
            if (s.status === 'blue') {
                statusBadge = `<span class="status-pill status-pill-blue" title="सत्यापित विकिपीडिया लेख">🔵 नीली कड़ी</span>`;
            } else if (s.status === 'redirect') {
                statusBadge = `<span class="status-pill status-pill-redirect" title="पुनर्निर्देशन -> ${escapeHtml(s.resolvedTarget)}">🟢 पुनर्निर्देशन</span>`;
            } else {
                statusBadge = `<span class="status-pill status-pill-red" title="अस्तित्वहीन पृष्ठ">🔴 लाल कड़ी</span>`;
            }

            // संदर्भ में हाइलाइट करें
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
                        <a href="https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(s.target)}" target="_blank" title="विकिपीडिया पर पृष्ठ देखें">
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
                    <button type="button" class="btn btn-outline btn-sm edit-target-btn" data-id="${s.id}" title="कड़ी लक्ष्य संशोधित करें">
                        ✏️ संपादन
                    </button>
                </td>
            `;

            // चेकबॉक्स घटना
            const cb = tr.querySelector('.suggestion-checkbox');
            cb.addEventListener('change', () => {
                s.checked = cb.checked;
                tr.classList.toggle('row-deselected', !s.checked);
                recalculateModifiedWikitext();
            });

            // संपादन बटन घटना
            const editBtn = tr.querySelector('.edit-target-btn');
            editBtn.addEventListener('click', () => openEditModal(s.id));

            DOM.suggestionsTbody.appendChild(tr);
        });

        updateCounters();
    }

    function updateCounters() {
        const total = state.suggestions.length;
        const blue = state.suggestions.filter(s => s.status === 'blue').length;
        const redirect = state.suggestions.filter(s => s.status === 'redirect').length;
        const red = state.suggestions.filter(s => s.status === 'red').length;
        const activeCount = state.suggestions.filter(s => s.checked).length;

        DOM.badgeTotal.textContent = `${total} उम्मीदवार`;
        DOM.badgeBlue.textContent = `${blue} नीली कड़ियाँ`;
        DOM.badgeRedirect.textContent = `${redirect} पुनर्निर्देशन`;
        DOM.badgeRed.textContent = `${red} लाल कड़ियाँ`;

        DOM.resultsSummaryText.textContent = `कुल ${total} कड़ियों में से ${activeCount} कड़ियाँ शामिल की जा रही हैं।`;
        DOM.finalStatsText.textContent = `कुल ${activeCount} तार्किक कड़ियाँ चुनी गईं (कुल सुझाव: ${total})`;
    }

    // ================== संशोधित विकिटेक्स्ट एवं डिफ़ का पुनः परिकलन ==================
    function recalculateModifiedWikitext() {
        const activeSuggestions = state.suggestions.filter(s => s.checked);
        const firstOnly = DOM.optFirstOnly.checked;

        // मूल विकिटेक्स्ट को सुरक्षित टोकन्स में विभाजित करें
        const { cleanText, protectedTokens } = protectWikitextStructures(state.originalWikitext);

        let modifiedText = cleanText;

        // सक्रिय सुझावों को लंबाई के अनुसार क्रमबद्ध करें
        const sorted = [...activeSuggestions].sort((a, b) => b.term.length - a.term.length);

        sorted.forEach(s => {
            const escaped = s.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`(^|[^\\p{L}\\p{M}\\d_\x01\x02])(${escaped})([^\\p{L}\\p{M}\\d_\x01\x02]|$)`, firstOnly ? 'u' : 'gu');

            // विकिकड़ी का प्रारूप
            let wikilink = '';
            if (s.target === s.term) {
                wikilink = `[[${s.term}]]`;
            } else {
                wikilink = `[[${s.target}|${s.term}]]`;
            }

            let replaced = false;
            modifiedText = modifiedText.replace(pattern, (match, prefix, termMatch, suffix) => {
                if (firstOnly && replaced) return match;
                replaced = true;
                return `${prefix}${wikilink}${suffix}`;
            });
        });

        // सुरक्षित टोकन्स को मूल स्वरूप में पुनर्स्थापित करें
        protectedTokens.forEach(t => {
            modifiedText = modifiedText.replace(t.placeholder, t.original);
        });

        state.processedWikitext = modifiedText;
        DOM.finalWikitextOutput.value = modifiedText;

        // डिफ़ और पूर्वावलोकन अपडेट करें
        generateDiffView(state.originalWikitext, modifiedText);
        generateRenderedPreview(modifiedText);
        updateCounters();
    }

    // ================== डिफ़ दृश्य जनरेटर (reFill Style MediaWiki Diff) ==================
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
                // समान पंक्ति (संदर्भ)
                // अत्यधिक पंक्तियों को संक्षिप्त करें या केवल बदलाव के निकट दिखाएँ
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
                    const highlightedAdd = highlightWikilinksInLine(newLine);
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

        if (changesCount === 0) {
            DOM.diffContainer.innerHTML = '<div class="diff-empty-msg">कोई परिवर्तन नहीं हुआ। (मूल विकिटेक्स्ट और नया विकिटेक्स्ट समरूप हैं)</div>';
        } else {
            DOM.diffContainer.innerHTML = diffHtml;
        }
    }

    function shouldShowContextLine(oldLines, newLines, idx) {
        // बदलाव के 2 पंक्ति पहले या बाद का संदर्भ दिखाएं
        for (let j = Math.max(0, idx - 2); j <= Math.min(Math.max(oldLines.length, newLines.length) - 1, idx + 2); j++) {
            if (oldLines[j] !== newLines[j]) return true;
        }
        return false;
    }

    function highlightWikilinksInLine(line) {
        return escapeHtml(line).replace(/\[\[([^\]]+)\]\]/g, '<span class="diff-highlight-add">[[&nbsp;$1&nbsp;]]</span>');
    }

    // ================== पूर्वावलोकन जनरेटर (Rendered HTML Preview) ==================
    function generateRenderedPreview(wikitext) {
        let html = escapeHtml(wikitext);

        // शीर्षकों का रूपांतरण
        html = html.replace(/^====([^=]+)====/gm, '<h4>$1</h4>');
        html = html.replace(/^===([^=]+)===/gm, '<h3>$1</h3>');
        html = html.replace(/^==([^=]+)==/gm, '<h2>$1</h2>');

        // बोल्ड और इटैलिक्स
        html = html.replace(/'''''([^']+)'''''/g, '<strong><em>$1</em></strong>');
        html = html.replace(/'''([^']+)'''/g, '<strong>$1</strong>');
        html = html.replace(/''([^']+)''/g, '<em>$1</em>');

        // आंतरिक कड़ियाँ (Wikilinks)
        html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (m, target, text) => {
            return `<a href="https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(target)}" target="_blank" class="wiki-link wiki-link-new" title="${target}">${text}</a>`;
        });
        html = html.replace(/\[\[([^\]]+)\]\]/g, (m, target) => {
            return `<a href="https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(target)}" target="_blank" class="wiki-link wiki-link-new" title="${target}">${target}</a>`;
        });

        // पैराग्राफ़ और लाइन ब्रेक्स
        const paragraphs = html.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`);
        DOM.articlePreviewContainer.innerHTML = paragraphs.join('');
    }

    // ================== लक्ष्य संपादन मोडल (Edit Target Modal) ==================
    function openEditModal(suggestionId) {
        const item = state.suggestions.find(s => s.id === suggestionId);
        if (!item) return;

        state.editingSuggestionId = suggestionId;
        DOM.modalTermText.textContent = item.term;
        DOM.modalTargetInput.value = item.target;
        DOM.modalVerifyStatus.style.display = 'none';
        DOM.editTargetModal.style.display = 'flex';
        DOM.modalTargetInput.focus();
    }

    function closeModal() {
        DOM.editTargetModal.style.display = 'none';
        state.editingSuggestionId = null;
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

        // त्वरित सत्यापन
        try {
            const check = await verifyBatchTitles(state.lang, [newTarget]);
            const info = check.get(newTarget);
            if (info) {
                item.status = info.exists ? (info.isRedirect ? 'redirect' : 'blue') : 'red';
                item.resolvedTarget = info.target;
            }
        } catch (e) {
            console.warn(e);
        }

        closeModal();
        renderSuggestionsTable();
        recalculateModifiedWikitext();
        showToast('कड़ी लक्ष्य अद्यतन किया गया');
    }

    // ================== बॉटम बार क्रियान्वयन (Copy, Open Wiki, Download) ==================
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

    function fallbackCopy(text) {
        DOM.finalWikitextOutput.select();
        document.execCommand('copy');
        showToast('✅ विकिटेक्स्ट कॉपी हुआ!');
    }

    function openWikipediaEditPage() {
        const title = state.pageTitle || cleanWikiTitleFromInput(DOM.pageInput.value);
        if (!title || title === 'अशीर्षक लेख') {
            alert('कृपया पहले किसी विकिपीडिया लेख का विश्लेषण करें।');
            return;
        }

        const editUrl = `https://${state.lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=edit`;
        
        // पहले क्लिपबोर्ड पर कॉपी कर लें
        copyModifiedWikitext();

        const openWin = window.open(editUrl, '_blank');
        if (openWin) {
            alert(`विकिपीडिया संपादन पृष्ठ नई विंडो में खोला गया है!\n\nविकिटेक्स्ट पहले ही आपके क्लिपबोर्ड पर कॉपी हो चुका है।\nवहाँ संपादन बॉक्स में पेस्ट करें और संपादन सारांश में 'तार्किक कड़ियाँ जोड़ीं (विकीलिंक सहायक उपकरण)' लिखें।`);
        } else {
            alert(`कृपया पॉप-अप की अनुमति दें या सीधे इस लिंक पर जाएँ: ${editUrl}`);
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

    // ================== स्ट्रिंग व HTML स्वच्छता ==================
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

    // ================== ऐप लोड आरंभ ==================
    document.addEventListener('DOMContentLoaded', init);

})();
