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

    function animateStatValue(idOrEl, targetVal, options = {}) {
        const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
        if (!el) return;
        const prefix = options.prefix || '';
        const suffix = options.suffix || '';
        const decimals = options.decimals || 0;
        const locale = options.locale || null;
        const numTarget = Number(targetVal);

        if (isNaN(numTarget)) {
            el.textContent = `${prefix}${targetVal}${suffix}`;
            return;
        }

        const prevRaw = parseFloat(el.dataset.numericVal || '0');
        const startVal = isNaN(prevRaw) ? 0 : prevRaw;
        el.dataset.numericVal = String(numTarget);

        el.classList.remove('stat-pop');
        void el.offsetWidth;
        el.classList.add('stat-pop');

        if (startVal === numTarget) {
            const formatted = decimals > 0
                ? numTarget.toFixed(decimals)
                : (locale ? Math.round(numTarget).toLocaleString(locale) : String(Math.round(numTarget)));
            el.textContent = `${prefix}${formatted}${suffix}`;
            return;
        }

        const duration = 420;
        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = startVal + (numTarget - startVal) * eased;

            const formatted = decimals > 0
                ? current.toFixed(decimals)
                : (locale ? Math.round(current).toLocaleString(locale) : String(Math.round(current)));
            el.textContent = `${prefix}${formatted}${suffix}`;

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    function setupInteractiveRipples() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn, .filter-chip-toggle');
            if (!btn || btn.disabled) return;
            const rect = btn.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'btn-ripple';
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
            btn.appendChild(ripple);
            setTimeout(() => {
                if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
            }, 600);
        });
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

    // ================== शब्द जिनकी आंतरिक कड़ी नहीं बनाई जाती (WP:NOTLINKED / WP:COMMONWORDS) ==================
    const NEVER_LINK_WORDS = {
        hi: new Set([
            // सामान्य दैनिक संज्ञाएँ (Everyday Common Nouns)
            'दिन', 'रात', 'सुबह', 'शाम', 'दोपहर', 'समय', 'काल', 'घंटा', 'घंटे', 'मिनट', 'सेकंड', 'वर्ष', 'साल', 'महीना', 'माह',
            'आज', 'कल', 'परसों', 'अब', 'तब', 'कब', 'कभी', 'हमेशा', 'सदा',
            'मनुष्य', 'मानव', 'व्यक्ति', 'लोग', 'आदमी', 'औरत', 'स्त्री', 'पुरुष', 'बच्चा', 'बच्चे', 'बालक', 'लड़का', 'लड़की',
            'परिवार', 'माता', 'पिता', 'माँ', 'बाप', 'भाई', 'बहन', 'बेटा', 'बेटी', 'दोस्त', 'मित्र', 'शत्रु',
            'घर', 'मकान', 'कमरा', 'दरवाजा', 'खिड़की', 'दीवार', 'छत', 'जमीन', 'भूमि', 'रास्ता', 'सड़क', 'गली',
            'पानी', 'जल', 'हवा', 'वायु', 'आग', 'अग्नि', 'रोशनी', 'प्रकाश', 'अंधेरा', 'छाया', 'धूप',
            'भोजन', 'खाना', 'रोटी', 'चावल', 'दूध', 'फल', 'सब्जी', 'अनाज', 'भूख', 'प्यास',
            'जीवन', 'मृत्यु', 'मौत', 'जन्म', 'आयु', 'उम्र', 'स्वास्थ्य', 'बीमारी', 'रोग',
            'काम', 'कार्य', 'नौकरी', 'धंधा', 'मेहनत', 'मदद', 'सहायता', 'सहयोग',
            'नाम', 'बात', 'चीज', 'वस्तु', 'भाग', 'हिंसा', 'शांति', 'युद्ध',
            'देश', 'विदेश', 'शहर', 'गाँव', 'स्थान', 'जगह', 'संसार', 'दुनिया', 'विश्व', 'धरती', 'पृथ्वी', 'आकाश', 'समुद्र', 'नदी', 'पहाड़', 'पेड़', 'जंगल', 'पशु', 'पक्षी', 'जानवर',
            'पुस्तक', 'किताब', 'पत्र', 'अखबार', 'कागज', 'कलम',
            'भाषा', 'शब्द', 'अर्थ', 'वाक्य', 'बातचीत', 'विचार', 'सोच', 'ज्ञान', 'शिक्षा',
            'रूप', 'रंग', 'आकार', 'प्रकार', 'तरह', 'विधि', 'तरीका', 'नियम', 'कारण', 'प्रभाव', 'उद्देश्य', 'लक्ष्य',
            'सभा', 'दल', 'समूह', 'मंडल', 'संस्था', 'विभाग', 'आयोग', 'समिति', 'बैठक', 'सम्मेलन',
            
            // सामान्य पदवी / भूमिका (Generic Roles/Occupations)
            'राजा', 'रानी', 'मंत्री', 'शिक्षक', 'गुरु', 'छात्र', 'विद्यार्थी', 'लेखक', 'कवि', 'वैज्ञानिक', 'खिलाड़ी', 'नेता', 'अभिनेता', 'डॉक्टर', 'वैद्य', 'सिपाही', 'सैनिक', 'पुलिस', 'व्यापारी', 'किसान', 'मजदूर',
            
            // दिशाएँ (Cardinal Directions)
            'उत्तर', 'दक्षिण', 'पूर्व', 'पश्चिम', 'दिशा', 'दायें', 'बायें', 'ऊपर', 'नीचे',
            
            // सामान्य विशेषण (Generic Descriptive Adjectives)
            'बड़ा', 'बड़ी', 'बड़े', 'छोटा', 'छोटी', 'छोटे', 'अच्छा', 'अच्छी', 'अच्छे', 'बुरा', 'बुरी', 'बुरे',
            'नया', 'नई', 'नए', 'पुराना', 'पुरानी', 'पुराने', 'सुंदर', 'महत्वपूर्ण', 'प्रसिद्ध', 'प्रमुख', 'विशेष',
            'सत्य', 'झूठ', 'सही', 'गलत', 'कठिन', 'सरल', 'आसान', 'भारी', 'हल्का', 'गहरा', 'ऊँचा', 'नीचा',
            'गर्म', 'ठंडा', 'मीठा', 'कड़वा', 'सफेद', 'काला', 'लाल', 'नीला', 'हरा', 'पीला',
            
            // संख्याएँ व क्रम (Numbers & Ordinals)
            'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
            'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस',
            'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे', 'सौ', 'हजार', 'लाख', 'करोड़', 'अरब',
            'पहला', 'पहली', 'पहले', 'दूसरा', 'दूसरी', 'दूसरे', 'तीसरा', 'तीसरी', 'तीसरे', 'चौथा', 'चौथी', 'चौथे', 'अंतिम', 'आखिरी',
            
            // दिन व महीने (Days & Months)
            'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार',
            'जनवरी', 'फ़रवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'सितम्बर', 'अक्टूबर', 'नवंबर', 'नवम्बर', 'दिसंबर', 'दिसम्बर',
            
            // सामान्य क्रिया पद व क्रियार्थक रूप
            'होना', 'करना', 'कहना', 'पाना', 'देना', 'लेना', 'जाना', 'आना', 'रहना', 'बैठना', 'देखना', 'सुनना', 'बोलना', 'चलना', 'लिखना', 'पढ़ना', 'सीखना', 'बनाना', 'रखना', 'दिखाना',
            
            // अव्यय व संबंधबोधक
            'आदि', 'इत्यादि', 'वगैरह', 'सहित', 'रहित', 'बिना', 'समान', 'जैसा', 'वैसा', 'जैसे', 'वैसे',

            // राजनीतिक, प्रशासनिक एवं सामान्य संज्ञा पद जिनकी अकेले कड़ी नहीं बननी चाहिए
            'जनता', 'दल', 'पार्टी', 'सरकार', 'प्रशासन', 'सदस्य', 'अध्यक्ष', 'उपाध्यक्ष', 'सचिव', 'महासचिव',
            'प्रवक्ता', 'चुनाव', 'मतदान', 'क्षेत्र', 'प्रदेश', 'राज्य', 'जिला', 'तहसील', 'विकास', 'योजना',
            'कार्यक्रम', 'अभियान', 'समिति', 'संगठन', 'संघ', 'परिषद', 'मंच', 'मोर्चा', 'गठबंधन', 'विपक्ष',
            'सत्ता', 'नेतृत्व', 'प्रतिनिधि', 'उम्मीदवार', 'मतदाता', 'सीट', 'बहुमत', 'अल्पमत', 'सत्र', 'सदन',
            'विधेयक', 'प्रस्ताव', 'संशोधन', 'रिपोर्ट', 'समझौता', 'घोषणा', 'निर्णय', 'फैसला', 'आदेश', 'निर्देश',
            'सूचना', 'जानकारी', 'विवरण', 'उल्लेख', 'संदर्भ', 'अध्याय', 'अनुच्छेद', 'धारा', 'खंड', 'स्तर',
            'आधार', 'माध्यम', 'अवसर', 'मौका', 'संभावना', 'क्षमता', 'व्यवस्था', 'प्रणाली', 'पद्धति', 'प्रक्रिया',
            'गतिविधि', 'घटना', 'मामला', 'मुद्दा', 'विषय', 'समस्या', 'समाधान', 'सुधार', 'परिवर्तन', 'बदलाव',
            'वृद्धि', 'कमी', 'अभाव', 'उपयोग', 'प्रयोग', 'इस्तेमाल', 'निर्माण', 'स्थापना', 'गठन', 'शुरुआत',
            'प्रारंभ', 'आरंभ', 'समापन', 'अंत', 'परिणाम', 'नतीजा', 'सफलता', 'असफलता', 'प्रयास', 'कोशिश',
            'समर्थन', 'विरोध', 'आलोचना', 'प्रशंसा', 'सम्मान', 'पुरस्कार', 'पद', 'पदभार', 'कार्यकाल', 'अवधि',
            'दशक', 'शताब्दी', 'सदी', 'युग', 'दौर', 'चरण', 'कार्यालय', 'मुख्यालय', 'केंद्र', 'शाखा', 'इकाई',
            'प्रभाग', 'निगम', 'बोर्ड', 'प्राधिकरण', 'संस्थान', 'महाविद्यालय', 'विद्यालय', 'अस्पताल', 'न्यायालय',
            'अदालत', 'थाना', 'बैंक', 'बाजार', 'कंपनी', 'उद्योग', 'व्यापार', 'व्यवसाय', 'सेवा', 'सुविधा',
            'अधिकार', 'कर्तव्य', 'दायित्व', 'नियम', 'कानून', 'नीति', 'सिद्धांत', 'विचारधारा', 'परंपरा', 'संस्कृति',
            'समाज', 'समुदाय', 'वर्ग', 'जाति', 'धर्म', 'संप्रदाय', 'पंथ', 'मत', 'आंदोलन', 'क्रांति', 'संघर्ष',
            'प्रदर्शन', 'हड़ताल', 'बहिष्कार', 'समर्थक', 'कार्यकर्ता', 'पदाधिकारी', 'नागरिक', 'निवासी', 'ग्रामीण', 'शहरी'
        ]),
        en: new Set([
            'day', 'days', 'night', 'morning', 'evening', 'year', 'years', 'month', 'months', 'time', 'today', 'yesterday', 'tomorrow',
            'man', 'men', 'woman', 'women', 'child', 'children', 'person', 'people', 'human', 'life', 'death', 'birth',
            'home', 'house', 'room', 'door', 'water', 'air', 'fire', 'light', 'food', 'bread',
            'city', 'town', 'village', 'country', 'world', 'earth', 'land', 'river', 'mountain', 'tree',
            'book', 'paper', 'word', 'language', 'letter',
            'king', 'queen', 'teacher', 'student', 'writer', 'player', 'doctor', 'soldier',
            'north', 'south', 'east', 'west',
            'big', 'small', 'good', 'bad', 'new', 'old', 'great', 'important', 'famous',
            'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'hundred', 'thousand', 'million', 'billion',
            'first', 'second', 'third', 'last',
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
            'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
            'public', 'party', 'government', 'member', 'president', 'chairman', 'secretary', 'election', 'state', 'district', 'committee'
        ]),
        sa: new Set([
            'दिनम्', 'रात्रिः', 'समयः', 'कालः', 'वर्षम्', 'मासः', 'जलम्', 'वायुः', 'अग्निः', 'गृहम्',
            'मनुष्यः', 'मानवः', 'जनः', 'बालकः', 'बालिका', 'माता', 'पिता', 'भ्राता', 'मित्रम्',
            'जीवनम्', 'मृत्युः', 'जन्म', 'कार्यम्', 'कर्म', 'नाम', 'वचनम्', 'पुस्तकम्', 'भाषा',
            'एकम्', 'द्वे', 'त्रीणि', 'चत्वारि', 'पञ्च', 'दश', 'शतम्', 'सहस्रम्',
            'प्रथमः', 'द्वितीया', 'तृतीयः', 'अन्तिमः'
        ])
    };

    // विलंबित लोडिंग (Lazy initialization) द्वारा 7,479+ शब्दों की बहिष्कार सूची लोड करें ताकि मोबाइल PageSpeed LCP/TBT बाधित न हो
    let extendedBlacklistLoaded = false;
    let blacklistScriptPromise = null;

    function ingestExtendedBlacklistArray(extList) {
        if (!Array.isArray(extList) || extendedBlacklistLoaded) return;
        extendedBlacklistLoaded = true;
        for (let i = 0; i < extList.length; i++) {
            const w = extList[i];
            if (w && typeof w === 'string') {
                const clean = w.trim().toLowerCase();
                const code = clean.charCodeAt(0);
                if (code >= 0x0900 && code <= 0x097F) {
                    NEVER_LINK_WORDS.hi.add(clean);
                } else if (code >= 97 && code <= 122) {
                    NEVER_LINK_WORDS.en.add(clean);
                } else {
                    NEVER_LINK_WORDS.hi.add(clean);
                }
            }
        }
    }

    function ensureExtendedBlacklistLoaded() {
        if (extendedBlacklistLoaded) return;
        try {
            let extList = null;
            if (typeof COMMON_5000_WORDS !== 'undefined' && Array.isArray(COMMON_5000_WORDS)) {
                extList = COMMON_5000_WORDS;
            } else if (typeof window !== 'undefined' && Array.isArray(window.COMMON_5000_WORDS)) {
                extList = window.COMMON_5000_WORDS;
            } else if (typeof global !== 'undefined' && Array.isArray(global.COMMON_5000_WORDS)) {
                extList = global.COMMON_5000_WORDS;
            } else if (typeof require !== 'undefined') {
                try {
                    extList = require('./words_blacklist.js');
                } catch (e) { }
            }
            if (Array.isArray(extList)) {
                ingestExtendedBlacklistArray(extList);
            }
        } catch (e) {
            console.warn('विस्तारित बहिष्कार सूची लोड करने में त्रुटि:', e);
        }
    }

    function fetchExtendedBlacklistScriptIfNeeded() {
        if (extendedBlacklistLoaded) return Promise.resolve();
        ensureExtendedBlacklistLoaded();
        if (extendedBlacklistLoaded) return Promise.resolve();
        if (typeof document === 'undefined') return Promise.resolve();
        if (!blacklistScriptPromise) {
            blacklistScriptPromise = new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = './words_blacklist.js';
                script.async = true;
                script.onload = () => {
                    ensureExtendedBlacklistLoaded();
                    resolve();
                };
                script.onerror = () => resolve();
                document.head.appendChild(script);
            });
        }
        return blacklistScriptPromise;
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            setTimeout(() => {
                if ('requestIdleCallback' in window) {
                    window.requestIdleCallback(() => fetchExtendedBlacklistScriptIfNeeded(), { timeout: 6000 });
                } else {
                    fetchExtendedBlacklistScriptIfNeeded();
                }
            }, 4000);
        }, { once: true });
    } else {
        ensureExtendedBlacklistLoaded();
    }

    // सम्मानसूचक उपसर्ग (Honorific Prefixes) — इन्हें अकेले 1-शब्द की कड़ी कभी न बनाएं (ताकि '[[महर्षि]] वाल्मीकि' जैसी अधूरी कड़ी न बने)
    const HONORIFIC_PREFIXES = new Set([
        'महर्षि', 'गोस्वामी', 'सन्त', 'संत', 'मुंशी', 'पंडित', 'सरदार', 'नेताजी', 'आचार्य', 'सम्राट',
        'महात्मा', 'भगवान', 'स्वामी', 'गुरु', 'श्री', 'श्रीमती', 'सुश्री', 'डॉ', 'डॉ.', 'डॉ॰', 'डॉक्टर',
        'प्रोफेसर', 'प्रो', 'प्रो.', 'जनरल', 'कर्नल', 'मेजर', 'कैप्टन', 'बाबा', 'ठाकुर', 'सेठ', 'मौलाना',
        'हज़रत', 'हजरत', 'शेख', 'सुल्तान', 'बादशाह', 'नवाब', 'राजा', 'रानी', 'महाराजा', 'महारानी', 'युवराज'
    ]);

    // वाक्य-खंड विभाजक पद (Phrase-Breaker Words) — यदि बहु-शब्द N-gram में इनमें से कोई भी पद हो तो वह संयुक्त संज्ञा नहीं बल्कि अधूरा वाक्य-खंड है
    const STRICT_PHRASE_BREAKER_WORDS = new Set([
        // परसर्ग व कारक चिह्न (Postpositions)
        'में', 'से', 'ने', 'को', 'पर', 'का', 'की', 'के', 'द्वारा', 'लिए', 'हेतु', 'तक', 'साथ', 'बाद', 'पहले',
        'अनुसार', 'अंतर्गत', 'दौरान', 'बजाय', 'बिना', 'सहित', 'रहित', 'प्रति', 'ओर', 'तरफ', 'कारण', 'माध्यम',
        'सामने', 'पीछे', 'ऊपर', 'नीचे', 'अंदर', 'बाहर', 'बीच', 'पास', 'निकट', 'समीप', 'दूर',
        // समुच्चयबोधक व निपात (Conjunctions & Particles)
        'तथा', 'एवं', 'और', 'या', 'अथवा', 'कि', 'जो', 'तो', 'भी', 'ही', 'नहीं', 'मत', 'ना', 'जब', 'तब',
        'यदि', 'अगर', 'मगर', 'लेकिन', 'किंतु', 'परंतु', 'क्योंकि', 'इसलिए', 'अतः', 'फलस्वरूप', 'यद्यपि', 'तथापि',
        'जैसे', 'वैसे', 'मानो', 'अर्थात', 'अर्थात्', 'यानी', 'लगभग', 'करीब', 'केवल', 'सिर्फ', 'मात्र',
        // सर्वनाम (Pronouns)
        'यह', 'वह', 'ये', 'वे', 'इस', 'उस', 'इन', 'उन', 'उन्हें', 'उन्होंने', 'इन्हें', 'इन्होंने', 'जिन्हें', 'जिन्होंने',
        'जिसने', 'जिसको', 'जिससे', 'जिसमें', 'जिसका', 'जिसकी', 'जिसके', 'जिनका', 'जिनकी', 'जिनके',
        'अपना', 'अपनी', 'अपने', 'उनका', 'उनकी', 'उनके', 'इसका', 'इसकी', 'इसके', 'हमारा', 'हमारी', 'हमारे',
        'मेरा', 'मेरी', 'मेरे', 'आपका', 'आपकी', 'आपके', 'स्वयं', 'खुद', 'कोई', 'किसी', 'कुछ', 'सब', 'सभी', 'प्रत्येक', 'हर',
        // सामान्य विशेषण व संख्यावाचक जो संज्ञा पद के साथ जुड़कर गलत N-gram बनाते हैं
        'महान', 'प्रमुख', 'प्रसिद्ध', 'विशाल', 'समृद्ध', 'ऐतिहासिक', 'प्राचीन', 'आधुनिक', 'मुख्य', 'विशेष',
        'सामान्य', 'विभिन्न', 'अनेक', 'कई', 'अधिक', 'कम', 'बहुत', 'अत्यंत', 'अति', 'काफी', 'पर्याप्त',
        'बड़ा', 'बड़ी', 'बड़े', 'छोटा', 'छोटी', 'छोटे', 'अच्छा', 'अच्छी', 'अच्छे', 'नया', 'नई', 'नए',
        'पुराना', 'पुरानी', 'पुराने', 'सुंदर', 'महत्वपूर्ण', 'अमूल्य', 'संपूर्ण', 'समस्त', 'प्रथम', 'द्वितीय', 'तृतीय', 'अंतिम',
        'स्थित', 'शामिल', 'संबंधित', 'आधारित', 'प्रचलित', 'उपलब्ध', 'निर्मित', 'स्थापित', 'संचालित', 'विभाजित', 'समर्पित',
        'जाना', 'जानी', 'जाने', 'माना', 'मानी', 'माने', 'कहा', 'कही', 'कहे', 'रखा', 'रखी', 'रखे', 'बना', 'बनी', 'बने',
        'नामक', 'रचयिता', 'अवतार', 'नेतृत्व', 'मार्ग', 'चलकर', 'पैदल', 'चले', 'किया', 'किए', 'हुआ', 'हुई', 'हुए',
        'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'सौ', 'हजार', 'लाख', 'करोड़'
    ]);

    // ऑफ़लाइन मोड के लिए सत्यापित विकिपीडिया शीर्षक कोष (ताकि ऑफ़लाइन/त्रुटि स्थिति में कभी भी अधूरे वाक्य-खंडों की गलत कड़ी न बने)
    const OFFLINE_VERIFIED_WIKI_TITLES = new Map([
        ['भारत', 'भारत'],
        ['भारत गणराज्य', 'भारत'],
        ['दक्षिण एशिया', 'दक्षिण एशिया'],
        ['एशिया', 'एशिया'],
        ['नई दिल्ली', 'नई दिल्ली'],
        ['हिमालय', 'हिमालय'],
        ['हिन्द महासागर', 'हिन्द महासागर'],
        ['गंगा', 'गंगा नदी'],
        ['यमुना', 'यमुना नदी'],
        ['ब्रह्मपुत्र', 'ब्रह्मपुत्र नदी'],
        ['नर्मदा', 'नर्मदा नदी'],
        ['गोदावरी', 'गोदावरी नदी'],
        ['भारतीय संविधान', 'भारतीय संविधान'],
        ['हिन्दी', 'हिन्दी'],
        ['संस्कृत', 'संस्कृत'],
        ['महात्मा गांधी', 'महात्मा गांधी'],
        ['मोहनदास करमचन्द गांधी', 'महात्मा गांधी'],
        ['राष्ट्रपिता', 'राष्ट्रपिता'],
        ['सत्य', 'सत्य'],
        ['अहिंसा', 'अहिंसा'],
        ['भारतीय राष्ट्रीय कांग्रेस', 'भारतीय राष्ट्रीय कांग्रेस'],
        ['दांडी मार्च', 'दांडी मार्च'],
        ['असहयोग आंदोलन', 'असहयोग आन्दोलन'],
        ['भारत छोड़ो आंदोलन', 'भारत छोड़ो आन्दोलन'],
        ['गुजरात', 'गुजरात'],
        ['पोरबंदर', 'पोरबंदर'],
        ['हिन्दी साहित्य', 'हिन्दी साहित्य'],
        ['भारतीय साहित्य', 'भारतीय साहित्य'],
        ['आदिकाल', 'आदिकाल'],
        ['भक्तिकाल', 'भक्तिकाल'],
        ['रीतिकाल', 'रीतिकाल'],
        ['आधुनिक काल', 'आधुनिक काल'],
        ['तुलसीदास', 'तुलसीदास'],
        ['कबीरदास', 'कबीर'],
        ['सूरदास', 'सूरदास'],
        ['मीराबाई', 'मीराबाई'],
        ['भारतेंदु हरिश्चंद्र', 'भारतेन्दु हरिश्चन्द्र'],
        ['मुंशी प्रेमचंद', 'प्रेमचंद'],
        ['प्रेमचंद', 'प्रेमचंद'],
        ['जयशंकर प्रसाद', 'जयशंकर प्रसाद'],
        ['सूर्यकांत त्रिपाठी निराला', 'सूर्यकान्त त्रिपाठी \'निराला\''],
        ['महादेवी वर्मा', 'महादेवी वर्मा'],
        ['गद्य', 'गद्य'],
        ['पद्य', 'पद्य'],
        ['अंतरिक्ष विज्ञान', 'अंतरिक्ष विज्ञान'],
        ['ब्रह्मांड', 'ब्रह्माण्ड'],
        ['भारतीय अंतरिक्ष अनुसंधान संगठन', 'भारतीय अंतरिक्ष अनुसंधान संगठन'],
        ['इसरो', 'भारतीय अंतरिक्ष अनुसंधान संगठन'],
        ['आर्यभट्ट', 'आर्यभट्ट'],
        ['चंद्रयान', 'चन्द्रयान'],
        ['मंगलयान', 'मंगलयान'],
        ['पृथ्वी', 'पृथ्वी'],
        ['कृत्रिम उपग्रह', 'कृत्रिम उपग्रह'],
        ['मौसम विज्ञान', 'मौसम विज्ञान'],
        ['राजापुर', 'राजापुर'],
        ['रामायण', 'रामायण'],
        ['महर्षि वाल्मीकि', 'वाल्मीकि'],
        ['वाल्मीकि', 'वाल्मीकि'],
        ['रामचरितमानस', 'रामचरितमानस'],
        ['रत्नावली', 'रत्नावली']
    ]);

    function isInflectedHindiPluralOrOblique(word) {
        if (!word || word.length < 4) return false;
        // देवनागरी बहुवचन या तिर्यक रूप (जैसे: ग्रन्थों, नदियों, भाषाएँ, पिंडों, उपग्रहों, कवियों, रचनाएँ, श्रृंखला, राज्यों)
        if (/(?:ियों|ओं|ों|एँ|एं|इयाँ|ाइयाँ)$/u.test(word)) {
            return true;
        }
        return false;
    }

    function isNonLinkableWord(term, lang = 'hi') {
        if (!term) return false;
        ensureExtendedBlacklistLoaded();
        const clean = term.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
        const langSet = NEVER_LINK_WORDS[lang] || NEVER_LINK_WORDS.hi;

        // एडमिन द्वारा स्वीकृत वैश्विक बहिष्कार सूची जाँचें
        if (state.approvedGlobalBlacklist && state.approvedGlobalBlacklist.has(clean)) {
            return true;
        }

        const hiStop = STOPWORDS.hi || new Set();
        const enStop = STOPWORDS.en || new Set();
        const rawParts = clean.split(' ').filter(Boolean);

        if (rawParts.length === 1) {
            const w = rawParts[0];
            if (langSet.has(w) || hiStop.has(w) || enStop.has(w)) return true;
            if (HONORIFIC_PREFIXES.has(w) || STRICT_PHRASE_BREAKER_WORDS.has(w)) return true;
            if (lang === 'hi' && isInflectedHindiPluralOrOblique(w)) return true;
            return false;
        }

        // यदि पूरा बहु-शब्द पद स्वयं बहिष्कार सूची में है
        if (langSet.has(clean)) return true;

        // यदि बहु-शब्द पद में केवल स्टॉपवर्ड्स या सामान्य शब्द हैं तो कड़ी न बनाएं
        if (rawParts.every(p => hiStop.has(p) || enStop.has(p) || langSet.has(p))) return true;

        return false;
    }

    function isSelfLink(term, pageTitle) {
        if (!term) return false;
        const normTerm = term.trim().toLowerCase().replace(/[_\s\-–—'"`]/g, '');
        if (!normTerm) return false;

        if (pageTitle) {
            const normTitle = pageTitle.trim().toLowerCase().replace(/[_\s\-–—'"`]/g, '');
            if (normTerm === normTitle) return true;
        }

        if (state.selfTitleAliases && state.selfTitleAliases.size > 0) {
            for (const alias of state.selfTitleAliases) {
                const normAlias = String(alias).trim().toLowerCase().replace(/[_\s\-–—'"`]/g, '');
                if (normAlias && normTerm === normAlias) return true;
            }
        }
        return false;
    }

    // ================== अनुप्रयोग स्थिति (State) ==================
    const state = {
        lang: 'hi',
        pageTitle: '',
        originalWikitext: '',
        contaminatedWikitext: '',
        sanitizedWikitext: '',
        processedWikitext: '',
        existingLinks: new Set(),
        selfTitleAliases: new Set(),
        suggestions: [],
        customBlacklist: new Set(),
        approvedGlobalBlacklist: new Set(),
        approvedGlobalBlacklistList: [],
        blacklistRequestsList: [],
        activeTab: 'tab-input-wiki',
        activeViewTab: 'tab-view-diff',
        diffMode: window.innerWidth < 768 ? 'unified' : 'side-by-side',
        editingSuggestionId: null,

        // छन्नी
        filterStatus: 'all',
        filterType: 'all',
        filterLengthBucket: null,
        searchQuery: '',
        adminReqStatusFilter: 'all',
        adminReqSearchQuery: '',
        adminApprovedSearchQuery: '',
        adminApprovedLangFilter: 'all',

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
        DOM.analyzeStatusBanner = $('analyze-status-banner');
        DOM.analyzeStatusText = $('analyze-status-text');
        DOM.themeToggleBtn = $('theme-toggle-btn');

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
        DOM.optFilterCommonWords = $('opt-filter-common-words');
        DOM.optPreventSelfLink = $('opt-prevent-self-link');
        DOM.optLinkScope = $('opt-link-scope');
        DOM.optMinLength = $('opt-min-length');

        // सहायक उपकरण
        DOM.btnOpenDuplicateCleaner = $('btn-open-duplicate-cleaner');
        DOM.btnOpenBlacklistMgr = $('btn-open-blacklist-mgr');
        DOM.btnDownloadStandaloneHtml = $('btn-download-standalone-html');
        DOM.btnToggleAuxGuide = $('btn-toggle-aux-guide');
        DOM.auxGuideDetails = $('aux-guide-details');

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

        // तार्किक शब्द परीक्षक एवं नीति निर्देशिका
        DOM.wordTesterInput = $('word-tester-input');
        DOM.wordTesterBtn = $('word-tester-btn');
        DOM.wordTesterResultWrap = $('word-tester-result-wrap');
        DOM.wordTesterVerdictCard = $('word-tester-verdict-card');
        DOM.wordTesterRulesGrid = $('word-tester-rules-grid');
        DOM.policyWordsSearch = $('policy-words-search');
        DOM.policyChipsContainer = $('policy-chips-container');
        DOM.policyWordsCount = $('policy-words-count');

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
            setupInteractiveRipples();
            loadSavedBlacklist();
            bindEvents();
            initAnimeSkinAndStudio();
            initCuteAuthAndUserLogs();
            initServiceWorkerAndOfflineMode();
            updateCharCount();
            updateDiffModeButtons();
        } catch (err) {
            console.error('Initialization error:', err);
        }
    }

    // ================== सर्विस वर्कर एवं ऑफ़लाइन कार्यपटल ==================
    const OFFLINE_PRESET_ARTICLES = {
        'भारत': `'''भारत''' (आधिकारिक नाम: '''भारत गणराज्य''') दक्षिण एशिया में स्थित एक विशाल देश है। इसकी राजधानी [[नई दिल्ली]] है। भारत के उत्तर में हिमालय पर्वत श्रृंखला और दक्षिण में हिन्द महासागर स्थित है। भारत की प्रमुख नदियों में गंगा, यमुना, ब्रह्मपुत्र, नर्मदा और गोदावरी शामिल हैं। भारतीय संविधान विश्व का सबसे बड़ा लिखित संविधान है। भारत में अनेक भाषाएँ बोली जाती हैं जिनमें हिन्दी और संस्कृत प्रमुख हैं।`,
        'महात्मा गांधी': `'''मोहनदास करमचन्द गांधी''' (२ अक्टूबर १८६९ - ३० जनवरी १९४८) भारत के स्वतंत्रता संग्राम के प्रमुख राजनीतिक एवं आध्यात्मिक नेता थे। उन्हें '''महात्मा गांधी''' और राष्ट्रपिता के नाम से जाना जाता है। उन्होंने सत्य और अहिंसा के मार्ग पर चलकर भारतीय राष्ट्रीय कांग्रेस के नेतृत्व में दांडी मार्च, असहयोग आंदोलन और भारत छोड़ो आंदोलन चलाया। उनका जन्म गुजरात के पोरबंदर में हुआ था।`,
        'हिन्दी साहित्य': `'''हिन्दी साहित्य''' भारतीय साहित्य की एक समृद्ध परंपरा है। इसे आदिकाल, भक्तिकाल, रीतिकाल और आधुनिक काल में विभाजित किया गया है। भक्तिकाल में तुलसीदास, कबीरदास, सूरदास और मीराबाई ने अमूल्य रचनाएँ कीं। आधुनिक काल में भारतेंदु हरिश्चंद्र, मुंशी प्रेमचंद, जयशंकर प्रसाद, सूर्यकांत त्रिपाठी निराला और महादेवी वर्मा ने गद्य व पद्य को नई दिशा दी।`,
        'अंतरिक्ष विज्ञान': `'''अंतरिक्ष विज्ञान''' ब्रह्मांड, खगोलीय पिंडों, उपग्रहों और ग्रहों के अध्ययन से संबंधित विज्ञान है। भारत में भारतीय अंतरिक्ष अनुसंधान संगठन (इसरो) ने आर्यभट्ट, चंद्रयान और मंगलयान जैसे ऐतिहासिक अभियान संचालित किए हैं। पृथ्वी की कक्षा में कृत्रिम उपग्रह संचार, मौसम विज्ञान और वैज्ञानिक अनुसंधान में सहायता करते हैं।`,
        'तुलसीदास': `'''तुलसीदास''' (१५३२ - १६२३) हिन्दी साहित्य के महान कवि और सन्त थे। उनका जन्म [[राजापुर]] में हुआ था। उन्हें आदि काव्य [[रामायण]] के रचयिता महर्षि वाल्मीकि का अवतार माना जाता है। तुलसीदास ने अनेक ग्रन्थों की रचना की जिनमें [[रामचरितमानस]] सर्वोपरि है। तुलसीदास का विवाह रत्नावली से हुआ था।`
    };

    function initServiceWorkerAndOfflineMode() {
        const offlineBanner = $('offline-connectivity-banner');

        function updateOnlineStatusUI() {
            const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
            if (offlineBanner) {
                offlineBanner.style.display = isOffline ? 'flex' : 'none';
            }
        }

        updateOnlineStatusUI();
        window.addEventListener('online', () => {
            updateOnlineStatusUI();
            showToast('इंटरनेट कनेक्शन पुनः जुड़ गया (ऑनलाइन मोड सक्रिय)');
        });
        window.addEventListener('offline', () => {
            updateOnlineStatusUI();
            showToast('ऑफ़लाइन मोड सक्रिय: मुख्य कार्यपटल बिना इंटरनेट के कार्यशील है');
        });

        // Service Worker पंजीकरण (./sw.js?v=12 को अपडेट करें ताकि पुराना कैश तुरंत हटे)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    navigator.serviceWorker.register('./sw.js?v=12', { scope: './' }).then((reg) => {
                        reg.update().catch(() => {});
                        if (reg.waiting) {
                            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }
                    }).catch((err) => {
                        console.warn('Service Worker registration warning:', err);
                    });
                }, 1200);
            }, { once: true });
        }
    }

    function setupTheme() {
        const savedTheme = localStorage.getItem('wikilink_user_theme_v3') || 'light';

        function applyThemeState(theme, notify = false) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('wikilink_theme', theme);
            if (notify) {
                localStorage.setItem('wikilink_user_theme_v3', theme);
            }

            const iconEl = $('theme-toggle-icon');
            const labelEl = $('theme-toggle-label');
            if (iconEl && labelEl) {
                if (theme === 'dark') {
                    iconEl.textContent = '☀️';
                    labelEl.textContent = 'लाइट मोड';
                } else {
                    iconEl.textContent = '🌙';
                    labelEl.textContent = 'डार्क मोड';
                }
            } else if (DOM.themeToggleBtn) {
                DOM.themeToggleBtn.textContent = theme === 'dark' ? '☀️ लाइट मोड' : '🌙 डार्क मोड';
            }

            if (notify) {
                showToast(theme === 'dark' ? '🌙 डार्क मोड सक्रिय किया गया' : '☀️ लाइट मोड सक्रिय किया गया');
            }
        }

        applyThemeState(savedTheme, false);

        safeAddListener(DOM.themeToggleBtn, 'click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            applyThemeState(next, true);
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
        function updateLanguageHeaderIndicator() {
            const langCode = getSelectedLanguage();
            safeSetText('workbench-active-lang-indicator', `${langCode}.wikipedia.org`);
        }

        // भाषा चयन
        safeAddListener(DOM.langSelect, 'change', () => {
            if (DOM.langSelect && DOM.langSelect.value === 'custom') {
                safeSetDisplay(DOM.customLangWrap, 'block');
                if (DOM.customLangInput) DOM.customLangInput.focus();
            } else {
                safeSetDisplay(DOM.customLangWrap, 'none');
            }
            state.lang = getSelectedLanguage();
            updateLanguageHeaderIndicator();
        });

        safeAddListener(DOM.customLangInput, 'input', () => {
            state.lang = getSelectedLanguage();
            updateLanguageHeaderIndicator();
        });

        // त्वरित उदाहरण
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget || e.target;
                const lang = target.dataset.lang || 'hi';
                const title = target.dataset.title || '';
                if (DOM.langSelect) DOM.langSelect.value = lang;
                safeSetDisplay(DOM.customLangWrap, 'none');
                state.lang = lang;
                updateLanguageHeaderIndicator();
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
        safeAddListener(DOM.categoryInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchCategory();
            }
        });
        safeAddListener(DOM.pageInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLoadArticle();
            }
        });

        // फ़ाइल अपलोड
        safeAddListener(DOM.fileUploadInput, 'change', handleFileUpload);

        // सेटिंग्स टॉगल: केवल 'विस्तृत नियम व विवरण' पर क्लिक करने पर ही क. शब्द पात्रता व आवृत्ति तथा ख. लक्ष्य सत्यापन व सिंटेक्स और विस्तृत नियम दिखाएँ
        safeAddListener(DOM.toggleSettingsBtn, 'click', () => {
            const body = $('settings-body');
            const filterGroups = $('logical-filter-groups');
            if (body) {
                const isHidden = (body.style.display === 'none' || !body.style.display);
                body.style.display = isHidden ? 'block' : 'none';
                if (filterGroups) {
                    filterGroups.style.display = isHidden ? 'grid' : 'none';
                }
                if (DOM.toggleSettingsBtn) {
                    DOM.toggleSettingsBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
                }
                const arrow = DOM.toggleSettingsBtn ? DOM.toggleSettingsBtn.querySelector('.accordion-arrow') : null;
                if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
            }
        });

        const filterSyncIds = [
            'opt-first-only',
            'opt-filter-common-words',
            'opt-prevent-self-link',
            'opt-skip-disambig',
            'opt-skip-dates',
            'opt-skip-units',
            'opt-clean-pipes',
            'opt-blue-only'
        ];

        function updateActiveFilterCountBadge() {
            let activeCount = 0;
            filterSyncIds.forEach(id => {
                const cb = $(id);
                if (cb && cb.checked) activeCount++;
            });
            safeSetText('active-filter-count-badge', `${activeCount}/${filterSyncIds.length} मुख्य नियम सक्रिय`);
        }

        // बॉक्स 1: सक्रिय तार्किक छन्नी चिप्स
        document.querySelectorAll('.filter-chip-toggle').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetId = chip.dataset.target;
                const checkbox = $(targetId);
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    chip.classList.toggle('active', checkbox.checked);
                    updateActiveFilterCountBadge();
                    const name = chip.textContent.replace('✓', '').trim();
                    showToast(`${name}: ${checkbox.checked ? 'सक्रिय' : 'निष्क्रिय'}`);
                }
            });
        });

        // सेटिंग्स चेकबॉक्स से चिप्स को सिंक करना
        filterSyncIds.forEach(id => {
            const cb = $(id);
            if (cb) {
                cb.addEventListener('change', () => {
                    const chip = document.querySelector(`.filter-chip-toggle[data-target="${id}"]`);
                    if (chip) chip.classList.toggle('active', cb.checked);
                    updateActiveFilterCountBadge();
                });
            }
        });

        // सभी मुख्य नियम एक-क्लिक में सक्रिय करें
        safeAddListener('btn-enable-all-filters', 'click', () => {
            [...filterSyncIds, 'opt-resolve-redirects', 'opt-protect-structures', 'opt-filter-stopwords'].forEach(id => {
                const cb = $(id);
                if (cb) cb.checked = true;
            });
            document.querySelectorAll('.filter-chip-toggle').forEach(chip => chip.classList.add('active'));
            updateActiveFilterCountBadge();
            showToast('सभी तार्किक छन्नी नियम सक्रिय किए गए');
        });

        updateLanguageHeaderIndicator();
        updateActiveFilterCountBadge();

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
            state.originalWikitext = '';
            state.contaminatedWikitext = '';
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

        if (DOM.btnToggleAuxGuide && DOM.auxGuideDetails) {
            DOM.btnToggleAuxGuide.addEventListener('click', () => {
                const isHidden = DOM.auxGuideDetails.style.display === 'none';
                DOM.auxGuideDetails.style.display = isHidden ? 'block' : 'none';
                const auxCard = DOM.auxGuideDetails.closest('.aux-tools-card');
                if (auxCard) auxCard.classList.toggle('mobile-guide-expanded', isHidden);
                DOM.btnToggleAuxGuide.textContent = isHidden ? 'निर्देश छिपाएं' : 'उपयोग विधि निर्देश देखें';
            });
        }

        const btnResetD3LengthFilter = $('btn-reset-d3-length-filter');
        if (btnResetD3LengthFilter) {
            btnResetD3LengthFilter.addEventListener('click', () => {
                state.filterLengthBucket = null;
                btnResetD3LengthFilter.style.display = 'none';
                renderSuggestionsTable();
                renderD3WordLengthChart();
                showToast('शब्द लंबाई छन्नी हटाई गई');
            });
        }

        safeAddListener(DOM.blacklistAddBtn, 'click', addBlacklistWord);
        safeAddListener(DOM.blacklistNewInput, 'keypress', (e) => {
            if (e.key === 'Enter') addBlacklistWord();
        });
        safeAddListener(DOM.blacklistClearBtn, 'click', clearBlacklist);

        // तार्किक शब्द परीक्षक
        safeAddListener(DOM.wordTesterBtn, 'click', handleTestWordLinkability);
        safeAddListener(DOM.wordTesterInput, 'keypress', (e) => {
            if (e.key === 'Enter') handleTestWordLinkability();
        });

        // नीतिगत सामान्य शब्द खोज
        safeAddListener(DOM.policyWordsSearch, 'input', (e) => {
            renderPolicyWords(e.target.value);
        });

        // मोडल टैब्स स्विचिंग (Blacklist & Verifier Modal Tabs)
        document.querySelectorAll('[data-bl-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.blTab;
                document.querySelectorAll('[data-bl-tab]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.bl-tab-content').forEach(c => c.style.display = 'none');
                const targetContent = $(targetTab);
                if (targetContent) targetContent.style.display = 'block';

                if (DOM.blacklistClearBtn) {
                    DOM.blacklistClearBtn.style.display = (targetTab === 'bl-tab-custom') ? 'inline-block' : 'none';
                }

                if (targetTab === 'bl-tab-policy') {
                    renderPolicyWords();
                }
            });
        });

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
        const normalizedStep = stepNum >= 2 ? 2 : 1;
        ['flow-step-1', 'flow-step-2'].forEach((id, idx) => {
            const el = $(id);
            if (el) el.classList.toggle('active', idx + 1 <= normalizedStep);
        });
        const progressFill = $('flow-progress-fill');
        if (progressFill) {
            const pct = normalizedStep === 1 ? 50 : 100;
            progressFill.style.width = `${pct}%`;
        }
    }

    function toggleInputControlCard() {
        const container = $('dual-workbench-container') || DOM.inputControlCard;
        if (!container) return;
        const isHidden = (container.style.display === 'none');
        container.style.display = isHidden ? 'grid' : 'none';
        safeSetText(DOM.btnToggleInputCard, isHidden ? 'मुख्य कार्यपटल छिपाएं' : 'मुख्य कार्यपटल दिखाएं');
        if (isHidden) {
            container.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function handleGlobalKeydown(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
            closeSummaryCard();
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
        if (el) {
            el.classList.remove('modal-closing');
            el.style.display = 'flex';
        }
    }

    function closeModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
            el.classList.add('modal-closing');
            setTimeout(() => {
                el.style.display = 'none';
                el.classList.remove('modal-closing');
            }, 170);
        }
        state.editingSuggestionId = null;
    }

    function updateCharCount() {
        const text = safeGetValue(DOM.rawWikitextInput) || state.originalWikitext || '';
        const charCount = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const titleLabel = state.pageTitle ? `'${state.pageTitle}' — ` : '';
        safeSetText(DOM.rawCharCount, `✓ लोड किया गया लेख: ${titleLabel}${charCount.toLocaleString('hi-IN')} अक्षर | ${words.toLocaleString('hi-IN')} शब्द`);
        const statusBar = $('loaded-article-status-bar');
        if (statusBar) {
            statusBar.style.display = charCount > 0 ? 'flex' : 'none';
        }
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

    function applySafeOfflineVerification(chunk, resultsMap) {
        chunk.forEach(t => {
            const clean = t.trim();
            const verifiedTarget = OFFLINE_VERIFIED_WIKI_TITLES.get(clean);
            if (verifiedTarget) {
                resultsMap.set(t, {
                    exists: true,
                    isRedirect: verifiedTarget !== clean,
                    isDisambig: false,
                    target: verifiedTarget,
                    originalTerm: t,
                    offlineVerified: true
                });
            } else {
                // कभी भी असत्यापित वाक्य-खंडों को अंधाधुंध exists: true न मानें!
                resultsMap.set(t, {
                    exists: false,
                    isRedirect: false,
                    isDisambig: false,
                    target: t,
                    originalTerm: t,
                    offlineVerified: true
                });
            }
        });
    }

    async function verifyBatchTitles(lang, titles) {
        // MediaWiki API POST के माध्यम से 50 शीर्षकों के बैच और समानांतर (Parallel) सत्यापन का उपयोग करें
        const BATCH_SIZE = 50;
        const CONCURRENCY = 4;
        const results = new Map();

        if (!Array.isArray(titles) || titles.length === 0) {
            return results;
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            applySafeOfflineVerification(titles, results);
            return results;
        }

        const endpoint = `https://${lang}.wikipedia.org/w/api.php`;
        const chunks = [];
        for (let i = 0; i < titles.length; i += BATCH_SIZE) {
            chunks.push(titles.slice(i, i + BATCH_SIZE));
        }

        let completedCount = 0;

        async function processChunk(chunk) {
            const bodyParams = new URLSearchParams({
                action: 'query',
                titles: chunk.join('|'),
                prop: 'pageprops',
                ppprop: 'disambiguation',
                redirects: '1',
                format: 'json',
                formatversion: '2',
                origin: '*'
            });

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Api-User-Agent': 'WikiLinkAssistant/2.5'
                    },
                    body: bodyParams.toString()
                });
                const data = await response.json();

                if (data && data.offline) {
                    applySafeOfflineVerification(chunk, results);
                    return;
                }

                const query = data.query || {};

                const normalMap = new Map();
                (query.normalized || []).forEach(n => {
                    normalMap.set(n.from, n.to);
                    normalMap.set(n.from.toLowerCase(), n.to);
                });

                const redirectMap = new Map();
                (query.redirects || []).forEach(r => {
                    redirectMap.set(r.from, r.to);
                    redirectMap.set(r.from.toLowerCase(), r.to);
                });

                const pagesList = Array.isArray(query.pages) ? query.pages : Object.values(query.pages || {});
                const pageInfoMap = new Map();
                const pageInfoLowerMap = new Map();

                pagesList.forEach(p => {
                    const isMissing = p.missing === true || p.missing === '';
                    const isMainNs = p.ns === undefined || p.ns === 0;
                    if (p && !isMissing && isMainNs && (p.pageid === undefined || p.pageid > 0)) {
                        const isDisambig = !!(p.pageprops && 'disambiguation' in p.pageprops) ||
                                           p.title.includes('(बहुविकल्पी)') ||
                                           p.title.includes('(disambiguation)');
                        const infoObj = {
                            title: p.title,
                            pageid: p.pageid,
                            isDisambig: isDisambig
                        };
                        pageInfoMap.set(p.title, infoObj);
                        pageInfoLowerMap.set(p.title.toLowerCase(), infoObj);
                    }
                });

                chunk.forEach(originalTerm => {
                    const cleanOriginal = originalTerm.trim().replace(/_/g, ' ');
                    let norm = normalMap.get(cleanOriginal) || normalMap.get(cleanOriginal.toLowerCase()) || cleanOriginal;
                    let redirectedTo = redirectMap.get(norm) || redirectMap.get(norm.toLowerCase()) || redirectMap.get(cleanOriginal) || redirectMap.get(cleanOriginal.toLowerCase());
                    let finalTarget = redirectedTo || norm;

                    // बहु-स्तरीय रीडायरेक्ट श्रृंखला को सुलझाएँ
                    let hops = 0;
                    while ((redirectMap.has(finalTarget) || redirectMap.has(finalTarget.toLowerCase())) && hops++ < 5) {
                        finalTarget = redirectMap.get(finalTarget) || redirectMap.get(finalTarget.toLowerCase());
                        redirectedTo = finalTarget;
                    }

                    const pageData = pageInfoMap.get(finalTarget) || pageInfoLowerMap.get(finalTarget.toLowerCase());
                    const exists = !!pageData;
                    const isDisambig = pageData ? pageData.isDisambig : false;
                    const resolvedTitle = pageData ? pageData.title : finalTarget;
                    const isActualRedirect = !!redirectedTo || (exists && resolvedTitle.toLowerCase() !== cleanOriginal.toLowerCase());

                    results.set(originalTerm, {
                        exists: exists,
                        isRedirect: isActualRedirect,
                        isDisambig: isDisambig,
                        target: resolvedTitle,
                        originalTerm: originalTerm
                    });
                });
            } catch (err) {
                console.warn('Batch verification fallback:', err);
                applySafeOfflineVerification(chunk, results);
            } finally {
                completedCount += chunk.length;
                const pct = Math.min(88, 50 + Math.round((completedCount / Math.max(1, titles.length)) * 38));
                safeSetText('analyze-status-text', `परीक्षण प्रक्रिया (चरण 3/4): विकिपीडिया पर ${completedCount}/${titles.length} उम्मीदवार पदों का सत्यापन...`);
                updateProgress('चरण 3/4: कड़ियों का सत्यापन...', `${completedCount} / ${titles.length} उम्मीदवार पदों की जाँच पूर्ण...`, pct);
            }
        }

        for (let i = 0; i < chunks.length; i += CONCURRENCY) {
            const batchGroup = chunks.slice(i, i + CONCURRENCY);
            await Promise.all(batchGroup.map(chunk => processChunk(chunk)));
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
            safeSetText(DOM.summaryExtract, 'ऑफ़लाइन या नेटवर्क अनुपलब्धता के कारण लाइव सारांश प्राप्त नहीं हो सका।');
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
            updateCharCount();

            updateProgress('लेख सफलतापूर्वक लोड हुआ!', `${article.wikitext.length.toLocaleString('hi-IN')} अक्षर प्राप्त हुए`, 100, `शीर्षक: ${article.title}`);
            showToast(`'${article.title}' सफलतापूर्वक लोड हुआ`);
            logUserActivity('लेख लोड किया', {
                title: article.title,
                lang: state.lang,
                wikitext: article.wikitext,
                newLinks: 0,
                contaminationsFixed: 0,
                note: `${article.wikitext.length.toLocaleString('hi-IN')} अक्षर प्राप्त`
            });
            setTimeout(() => showProgress(false), 800);
        } catch (err) {
            // ऑफ़लाइन फ़ॉलबैक: स्थानीय लॉग इतिहास या अंतर्निर्मित ऑफ़लाइन लेखों में खोजें
            const savedLogMatch = userActivityLogs.find(
                l => l.wikitext && l.title && l.title.toLowerCase() === title.toLowerCase()
            );
            const presetText = OFFLINE_PRESET_ARTICLES[title] || (savedLogMatch ? savedLogMatch.wikitext : null);

            if (presetText) {
                state.pageTitle = title;
                state.originalWikitext = presetText;
                state.contaminatedWikitext = presetText;
                safeSetValue(DOM.pageInput, title);
                safeSetValue(DOM.rawWikitextInput, presetText);
                updateCharCount();
                showProgress(false);
                showToast(`ऑफ़लाइन कैश से '${title}' लोड किया गया`);
                return;
            }

            alert(`त्रुटि: ${err.message}`);
            showProgress(false);
        }
    }

    // ================== मुख्य विश्लेषण एल्गोरिदम ==================
    async function handleAnalyze() {
        await fetchExtendedBlacklistScriptIfNeeded();
        ensureExtendedBlacklistLoaded();
        const typedTitle = cleanWikiTitleFromInput(safeGetValue(DOM.pageInput));
        let wikitext = safeGetValue(DOM.rawWikitextInput).trim() || state.originalWikitext.trim();

        if (state.activeTab === 'tab-input-wiki' && typedTitle && (!wikitext || typedTitle !== state.pageTitle)) {
            await handleLoadArticle();
            wikitext = state.originalWikitext.trim() || safeGetValue(DOM.rawWikitextInput).trim();
        }

        if (!wikitext) {
            alert('कृपया विश्लेषण हेतु विकिपीडिया लेख का शीर्षक दर्ज कर लोड करें।');
            return;
        }

        state.originalWikitext = wikitext;
        state.contaminatedWikitext = wikitext;
        state.lang = getSelectedLanguage();
        state.pageTitle = cleanWikiTitleFromInput(safeGetValue(DOM.pageInput)) || 'अशीर्षक लेख';

        showProgress(true);
        safeSetDisplay(DOM.resultsCard, 'none');

        // सक्रिय परीक्षण संकेत एवं संदेश (Immediate active testing indicator)
        if (DOM.analyzeBtn) {
            DOM.analyzeBtn.disabled = true;
            DOM.analyzeBtn.innerHTML = '<span class="analyze-spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: #fff; margin-right: 8px;"></span> परीक्षण प्रक्रिया शुरू हो गई है... विश्लेषण जारी है';
        }
        safeSetDisplay('analyze-status-banner', 'flex');
        safeSetText('analyze-status-text', 'परीक्षण प्रक्रिया शुरू हो गई है: विकिटेक्स्ट विश्लेषण एवं कड़ियों की सुरक्षा...');
        setWorkflowStep(2);

        try {
            // चरण 1: संरचनात्मक सुरक्षा
            safeSetText('analyze-status-text', 'परीक्षण प्रक्रिया (चरण 1/4): विकिटेक्स्ट संरचनाओं व साँचों की सुरक्षा...');
            updateProgress('चरण 1/4: विकिटेक्स्ट संरचनाओं का विश्लेषण...', 'टेम्पलेट, संदर्भ, मौजूदा कड़ियों की सुरक्षा...', 20, 'विकिटेक्स्ट पार्सिंग आरंभ...');
            const { cleanText, protectedTokens, existingLinks } = protectWikitextStructures(wikitext);
            state.existingLinks = existingLinks;

            // चरण 2: तार्किक उम्मीदवार निष्कासन
            safeSetText('analyze-status-text', 'परीक्षण प्रक्रिया (चरण 2/4): उम्मीदवार शब्दों की तार्किक पहचान...');
            updateProgress('चरण 2/4: उम्मीदवार शब्दों की तार्किक पहचान...', 'n-gram, तिथियाँ व मात्रक फिल्टर...', 45, `संरक्षित मौजूदा कड़ियाँ: ${existingLinks.size}`);
            const candidates = extractCandidates(cleanText, state.lang);

            // चरण 3: विकिपीडिया API बैच सत्यापन (अथवा ऑफ़लाइन स्थानीय सत्यापन)
            const isOfflineNow = typeof navigator !== 'undefined' && navigator.onLine === false;
            safeSetText('analyze-status-text', isOfflineNow
                ? `ऑफ़लाइन विश्लेषण (चरण 3/4): ${candidates.length} उम्मीदवार पदों का स्थानीय सत्यापन...`
                : `परीक्षण प्रक्रिया (चरण 3/4): विकिपीडिया पर ${candidates.length} उम्मीदवार पदों का सत्यापन...`
            );
            updateProgress('चरण 3/4: कड़ियों का सत्यापन...', `${candidates.length} उम्मीदवार पदों का सत्यापन...`, 70, `सत्यापन उम्मीदवार: ${candidates.length}`);
            const candidateMap = await verifyBatchTitles(state.lang, candidates);

            // चरण 4: सुझाव तालिका व डिफ़ निर्माण
            safeSetText('analyze-status-text', 'परीक्षण प्रक्रिया (चरण 4/4): सुझाव तालिका व विकिपीडिया डिफ़ तैयार किया जा रहा है...');
            updateProgress('चरण 4/4: तार्किक कड़ियाँ एवं विकिपीडिया डिफ़ तैयार किया जा रहा है...', 'सुझाव तालिका और डिफ़ का निर्माण...', 90, 'फ़िल्टर एवं सत्यापन पूर्ण');
            buildSuggestions(cleanText, candidateMap);

            // परिणाम प्रदर्शित करना
            safeSetDisplay(DOM.resultsCard, 'block');
            renderSuggestionsTable();
            recalculateModifiedWikitext();

            // कॉम्पैक्ट बार सूचना अद्यतन
            safeSetText(DOM.compactTitleText, state.pageTitle);
            safeSetText(DOM.compactLangText, state.lang);

            updateProgress('विश्लेषण पूर्ण हुआ!', 'परिणाम नीचे प्रदर्शित हैं।', 100, `कुल सुझाई गई कड़ियाँ: ${state.suggestions.length}`);
            const activeSuggestedCount = state.suggestions.filter(s => s.checked).length;
            logUserActivity('तार्किक विश्लेषण', {
                title: state.pageTitle,
                lang: state.lang,
                wikitext: state.processedWikitext || state.originalWikitext,
                newLinks: activeSuggestedCount,
                contaminationsFixed: 0,
                note: `${activeSuggestedCount} नई कड़ियाँ सुझाई गईं${isOfflineNow ? ' (ऑफ़लाइन मोड)' : ''}`
            });
            setTimeout(() => {
                showProgress(false);
                if (DOM.resultsCard) DOM.resultsCard.scrollIntoView({ behavior: 'smooth' });
            }, 400);

        } catch (err) {
            console.error('Analysis error:', err);
            alert(`विश्लेषण में त्रुटि: ${err.message}`);
            showProgress(false);
        } finally {
            if (DOM.analyzeBtn) {
                DOM.analyzeBtn.disabled = false;
                DOM.analyzeBtn.textContent = 'तार्किक आंतरिक कड़ियाँ खोजें एवं विश्लेषण करें (Analyze & Suggest Links)';
            }
            safeSetDisplay('analyze-status-banner', 'none');
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
            commonWordIssues: [],
            selfLinkIssues: [],
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

        // 2. तर्क: सामान्य दैनिक शब्द (WP:NOTLINKED / WP:COMMONWORDS)
        // यदि लेख में पहले से ये 7,479 शब्द उपलब्ध हों तो उन्हें यथावत रखा जाता है (उन्हें दोष नहीं माना जाता)।
        // यह नियम केवल नए शब्दों की कड़ीकरण प्रक्रिया पर लागू होता है।
        const commonWordIssues = [];
        existingLinksList.forEach(item => {
            if (isNonLinkableWord(item.target, lang)) {
                commonWordIssues.push(item);
                result.commonWordIssues.push(item);
                // नोट: लेख में पहले से मौजूद होने के कारण इसे दोष (result.total) में नहीं गिना जाता
            }
        });

        if (commonWordIssues.length > 0) {
            const examples = Array.from(new Set(commonWordIssues.map(c => `[[${c.target}]]`))).slice(0, 4).join(', ');
            result.arguments.push({
                type: 'common-word',
                title: 'तर्क 2: सामान्य दैनिक शब्द (पूर्व-मौजूद कड़ियाँ सुरक्षित)',
                desc: `लेख में पूर्व से उपलब्ध शब्द (उदा: ${examples}) 7,479 नीतिगत सामान्य शब्दों में आते हैं। नीति अनुसार ये पहले से उपलब्ध कड़ियाँ यथावत सुरक्षित रखी गई हैं; इन्हें हटाया नहीं जाएगा। यह नियम केवल नए शब्दों की कड़ीकरण प्रक्रिया पर लागू रहेगा।`
            });
        }

        // 3. तर्क: स्व-कड़ीकरण दोष (WP:CIRCULAR / WP:SELFREF)
        const selfLinkIssues = [];
        existingLinksList.forEach(item => {
            if (state.pageTitle && isSelfLink(item.target, state.pageTitle)) {
                selfLinkIssues.push(item);
                result.selfLinkIssues.push(item);
                result.total++;
            }
        });

        if (selfLinkIssues.length > 0) {
            result.arguments.push({
                type: 'self-link',
                title: 'तर्क 3: स्व-कड़ीकरण दोष (WP:CIRCULAR / WP:SELFREF)',
                desc: `वर्तमान लेख में स्वयं इसी लेख के शीर्षक ([[${state.pageTitle}]]) की आंतरिक कड़ी पाई गई है। विकिपीडिया नीति अनुसार कोई लेख स्वयं अपने शीर्षक को लिंक नहीं कर सकता।`
            });
        }

        // 4. तर्क: व्यर्थ पाइप सिंटेक्स (Redundant Pipes)
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
                title: 'तर्क 4: व्यर्थ पाइप सिंटेक्स (Redundant Pipes)',
                desc: `जब लक्ष्य पृष्ठ और प्रदर्शित शब्द समरूप हों (उदा: [[${redundantPipes[0].target}|${redundantPipes[0].text}]]), तो पाइप सिंटेक्स अनावश्यक भार बढ़ाता है। इसे स्वच्छ सिंटेक्स [[${redundantPipes[0].target}]] में बदलना तार्किक है।`
            });
        }

        // 5. तर्क: सामान्य वर्ष एवं मात्रक (WP:DATELINK & Units)
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
                title: 'तर्क 5: सामान्य वर्ष व मात्रक (WP:DATELINK)',
                desc: `विकिपीडिया नियमावली अनुसार अकेले 4-अंकीय वर्ष (उदा: 1947, 2024) या माप की इकाइयों (किमी, मीटर, किग्रा) को सामान्यतः आंतरिक कड़ी नहीं बनाना चाहिए जब तक कि वे किसी विशिष्ट प्रसंग से न जुड़े हों।`
            });
        }

        // 6. तर्क: बहुविकल्पी पृष्ठ (WP:DISAMBIG)
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
                title: 'तर्क 6: बहुविकल्पी कड़ियाँ (WP:DISAMBIG)',
                desc: `बहुविकल्पी पृष्ठ (उदा: ${disambigIssues.slice(0, 3).map(d => `[[${d}]]`).join(', ')}) सीधे लिंक होने से पाठक विशिष्ट लेख के बजाय विकल्पों की सूची पर पहुँचता है। ऐसे पदों को अचयनित करना अथवा विशिष्ट लक्ष्य से बदलना चाहिए।`
            });
        }

        // 7. तर्क: अस्तित्वहीन लाल कड़ियाँ (Red Links)
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
                title: 'तर्क 7: अस्तित्वहीन लाल कड़ियाँ (Red Links)',
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

        const syntaxCount = report.syntaxIssues.length + report.dateUnitIssues.length + report.commonWordIssues.length + report.selfLinkIssues.length;
        animateStatValue('stat-total-contaminations', report.total);
        animateStatValue('stat-overlinks', report.overlinks.length);
        animateStatValue('stat-disambigs', report.disambigs.length);
        animateStatValue('stat-red-links', report.redLinks.length);
        animateStatValue('stat-syntax-issues', syntaxCount);
        safeSetText('logic-rule-count', `${report.arguments.length} तार्किक नियम सक्रिय`);

        const badge = $('box2-status-badge');
        if (badge) {
            badge.className = 'workbench-badge ' + (report.total > 0 ? 'badge-contaminated' : 'badge-sanitized');
            badge.textContent = report.total > 0 ? `${report.total} दूषित तत्व चिह्नित` : 'स्वच्छ लेख';
        }

        const card = $('contaminated-box-card');
        if (card) {
            card.classList.remove('is-sanitized', 'has-contaminations');
            if (report.total > 0) {
                void card.offsetWidth;
                card.classList.add('has-contaminations');
            }
        }

        const sanitizeBtn = $('btn-sanitize-contaminated');
        if (sanitizeBtn) {
            sanitizeBtn.disabled = (report.total === 0);
            sanitizeBtn.textContent = report.total > 0 ? `तार्किक रूप से दूषित लेख शुद्ध करें (${report.total} सुधार)` : 'लेख पूर्व से ही शुद्ध है';
        }

        const container = $('contamination-arguments-container');
        if (container) {
            container.innerHTML = report.arguments.map((arg, idx) => `
                <div class="logic-argument-item logic-${arg.type}" style="animation-delay: ${Math.min(idx * 55, 300)}ms;">
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
                if (report.commonWordIssues.length > 0) {
                    const uniqCommon = Array.from(new Set(report.commonWordIssues.map(c => c.target)));
                    html += `
                        <div class="defect-group">
                            <div class="defect-group-title" style="color: #8b5cf6;">
                                <span>पूर्व-मौजूद सामान्य शब्द (यथावत सुरक्षित)</span>
                                <span class="badge badge-tool">${report.commonWordIssues.length} पद सुरक्षित</span>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
                                ये शब्द लेख में पहले से जुड़े हैं अतः इन्हें यथावत रखा गया है। केवल नए शब्दों पर यह रोक लागू होगी:
                            </div>
                            <div class="defect-tags-list">
                                ${uniqCommon.map(t => `<span class="defect-tag" style="border-color: #8b5cf6;">[[${escapeHtml(t)}]]</span>`).join('')}
                            </div>
                        </div>
                    `;
                }
                if (report.selfLinkIssues.length > 0) {
                    html += `
                        <div class="defect-group">
                            <div class="defect-group-title" style="color: #ec4899;">
                                <span>स्व-कड़ीकरण (WP:CIRCULAR)</span>
                                <span class="badge badge-tool">${report.selfLinkIssues.length} पद</span>
                            </div>
                            <div class="defect-tags-list">
                                ${report.selfLinkIssues.map(s => `<span class="defect-tag">[[${escapeHtml(s.target)}]]</span>`).join('')}
                            </div>
                        </div>
                    `;
                }
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
                                ${synAll.map(s => `<span class="defect-tag">${escapeHtml(s.target || s)}</span>`).join('')}
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

        // 1. स्व-कड़ीकरण हटाएं (WP:CIRCULAR / WP:SELFREF)
        if (state.pageTitle) {
            const escapedTitle = escapeRegex(state.pageTitle.trim());
            const selfRegex = new RegExp(`\\[\\[(${escapedTitle})(?:#[^\\]|]*)?(?:\\|([^\\]]+))?\\]\\]`, 'gi');
            text = text.replace(selfRegex, (match, target, display) => display || target);
        }

        // नोट: यदि लेख में पहले से 7,479 सामान्य शब्द उपलब्ध हों तो उन्हें यथावत रखा जाता है (उन्हें नहीं हटाया जाता)।
        // 7,479 बहिष्कार सूची केवल नए शब्दों पर लागू होती है।

        // 2. दोहराई गई कड़ियाँ साफ करें (WP:OVERLINKING)
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

        // 4. व्यर्थ पाइप हटाएं [[X|X]] -> [[X]]
        text = text.replace(/\[\[([^\]|#]+)\|([^\]]+)\]\]/g, (match, target, display) => {
            if (target.trim().toLowerCase() === display.trim().toLowerCase()) {
                return `[[${display.trim()}]]`;
            }
            return match;
        });

        // 5. अकेले 4-अंकीय वर्ष हटाएं [[1947]] -> 1947
        text = text.replace(/\[\[([0-9]{4}|[०-९]{4})\]\]/g, '$1');

        // 6. मात्रक कड़ियाँ हटाएं [[किमी]] -> किमी
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

        animateStatValue('stat-total-contaminations', 0);
        animateStatValue('stat-overlinks', 0);
        animateStatValue('stat-disambigs', 0);
        animateStatValue('stat-red-links', 0);
        animateStatValue('stat-syntax-issues', 0);

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
        logUserActivity('दूषित लेख शुद्धिकरण', {
            title: state.pageTitle || 'अशीर्षक लेख',
            lang: state.lang,
            wikitext: cleanedText,
            newLinks: state.suggestions ? state.suggestions.filter(s => s.checked).length : 0,
            contaminationsFixed: state.contaminations ? state.contaminations.total : 1,
            note: 'WP:OVERLINKING व सिंटेक्स शुद्धिकरण'
        });
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
        const existingLinksLower = new Set();
        const selfTitleAliases = new Set();
        let tokenIndex = 0;

        if (state.pageTitle && state.pageTitle !== 'अशीर्षक लेख') {
            selfTitleAliases.add(state.pageTitle.trim());
        }

        function saveToken(match) {
            const placeholder = `\x01⟪${tokenIndex++}⟫\x02`;
            protectedTokens.push({ placeholder, original: match });
            return placeholder;
        }

        let text = rawText;

        // टिप्पणियाँ
        text = text.replace(/<!--[\s\S]*?-->/g, saveToken);

        // टैग्स
        text = text.replace(/<(nowiki|code|pre|syntaxhighlight|math|gallery|timeline|score)[\s\S]*?<\/\1>/gi, saveToken);

        // संदर्भ
        text = text.replace(/<ref[\s\S]*?<\/ref>/gi, saveToken);
        text = text.replace(/<ref[^>]*\/>/gi, saveToken);

        // विकि तालिकाएँ {| ... |}
        text = text.replace(/\{\|[\s\S]*?\|\}/g, saveToken);

        // टेम्पलेट्स {{ ... }} (बहु-स्तरीय नेस्टेड साँचों की पूर्ण सुरक्षा)
        let templateLoop = 0;
        while (/\{\{[^{}]*\}\}/.test(text) && templateLoop++ < 25) {
            text = text.replace(/\{\{[^{}]*\}\}/g, saveToken);
        }

        // श्रेणियाँ व चित्र (नेस्टेड कड़ियों सहित पूर्ण सुरक्षा)
        text = text.replace(/\[\[(?:Category|श्रेणी|File|Image|चित्र|फ़ाइल):(?:[^\]]|\[\[[^\]]*\]\])+\]\]/gi, saveToken);

        // पूर्व-मौजूदा आंतरिक कड़ियाँ: लक्ष्य (target) और प्रदर्शित पाठ (display) दोनों को existingLinks में जोड़ें
        text = text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
            const normTarget = target.trim().replace(/_/g, ' ');
            if (normTarget) {
                existingLinks.add(normTarget.charAt(0).toUpperCase() + normTarget.slice(1));
                existingLinks.add(normTarget);
                existingLinksLower.add(normTarget.toLowerCase());
            }
            if (display && display.trim()) {
                const normDisplay = display.trim().replace(/_/g, ' ');
                existingLinks.add(normDisplay.charAt(0).toUpperCase() + normDisplay.slice(1));
                existingLinks.add(normDisplay);
                existingLinksLower.add(normDisplay.toLowerCase());
            }
            return saveToken(match);
        });

        // प्रथम अनुभाग (Lead Section) की सीमा ज्ञात करें ताकि केवल भूमिका के बोल्ड मुख्य शीर्षक पद ही स्व-शीर्षक बनें
        const firstHeadingMatch = text.search(/^==+[^=]+==+/m);
        const leadLimit = firstHeadingMatch !== -1 ? firstHeadingMatch : Math.min(text.length, 900);

        // अनुभाग शीर्षक
        text = text.replace(/^==+[^=]+==+\s*$/gm, saveToken);

        // बोल्ड मुख्य शीर्षक पद '''...''' (WP:MOSBOLD / WP:CIRCULAR):
        // केवल भूमिका (Lead) के बोल्ड पदों को स्व-शीर्षक उपनाम (selfTitleAliases) में जोड़ें और सुरक्षित करें
        text = text.replace(/'''([^'\n]{2,80})'''/g, (match, boldInner, offset) => {
            const cleanBold = boldInner.trim();
            if (offset < leadLimit && cleanBold && !cleanBold.includes('\x01')) {
                selfTitleAliases.add(cleanBold);
                if (!state.pageTitle || state.pageTitle === 'अशीर्षक लेख') {
                    state.pageTitle = cleanBold;
                }
                return saveToken(match);
            }
            return match;
        });

        // शेष बोल्ड/इटैलिक कोट चिह्नों (''' व '') को टोकन के रूप में सुरक्षित करें ताकि उनके भीतर के योग्य शब्दों की कड़ी बन सके
        text = text.replace(/'''|''/g, saveToken);

        // बाहरी कड़ियाँ [https://... ...] एवं सीधे URLs
        text = text.replace(/\[https?:\/\/[^\]]+\]/g, saveToken);
        text = text.replace(/https?:\/\/[^\s\]]+/g, saveToken);

        state.selfTitleAliases = selfTitleAliases;
        state.existingLinksLower = existingLinksLower;
        return { cleanText: text, protectedTokens, existingLinks };
    }

    // ================== सुरक्षित विकिटेक्स्ट पुनर्बहाली (Unprotect) ==================
    function unprotectWikitext(text, protectedTokens) {
        if (!text || !protectedTokens || protectedTokens.length === 0) return text;

        let result = text;

        // 1. उल्टे क्रम में (Reverse order) प्रतिस्थापन: बाहरी टोकन पहले सुलझेंगे ताकि नेस्टेड साँचे न छूटें
        for (let i = protectedTokens.length - 1; i >= 0; i--) {
            const t = protectedTokens[i];
            if (result.includes(t.placeholder)) {
                result = result.split(t.placeholder).join(t.original);
            }
        }

        // 2. सुरक्षा चक्र: यदि बहु-स्तरीय नेस्टिंग या बिना नियंत्रण वर्णों वाला टोकन शेष हो
        let safetyPasses = 0;
        while ((/[\x01\x02]?⟪\d+⟫[\x01\x02]?/.test(result) || /[\x01\x02]?PROTECTED_\d+[\x01\x02]?/.test(result)) && safetyPasses++ < 15) {
            let changed = false;
            for (let i = protectedTokens.length - 1; i >= 0; i--) {
                const t = protectedTokens[i];
                if (result.includes(t.placeholder)) {
                    result = result.split(t.placeholder).join(t.original);
                    changed = true;
                }
                const stripped = t.placeholder.replace(/[\x01\x02]/g, '');
                if (result.includes(stripped)) {
                    result = result.split(stripped).join(t.original);
                    changed = true;
                }
            }
            if (!changed) break;
        }

        return result;
    }

    // ================== उम्मीदवार निष्कासन (Clause-aware Multi-word & Single-word Extraction) ==================
    const HINDI_VERB_AND_PARTICLE_BOUNDARIES = new Set([
        'है', 'हैं', 'था', 'थी', 'थे', 'गा', 'गी', 'गे', 'रहा', 'रही', 'रहे', 'गया', 'गई', 'गए',
        'किया', 'किए', 'कीं', 'हुआ', 'हुई', 'हुए', 'दिया', 'दिए', 'लिया', 'लिए', 'जाता', 'जाती', 'जाते',
        'करता', 'करती', 'करते', 'होता', 'होती', 'होते', 'सकता', 'सकती', 'सकते', 'चुका', 'चुकी', 'चुके',
        'कर', 'करके', 'होकर', 'जाकर', 'आकर', 'देकर', 'लेकर', 'वाला', 'वाली', 'वाले', 'तथा', 'एवं', 'और', 'या', 'अथवा',
        'बोली', 'बोले', 'जातीं', 'कहते', 'कहलाता', 'कहलाती', 'कहलाते', 'माना', 'मानी', 'माने', 'चलाया', 'चलाई', 'चले'
    ]);

    // ज्ञानकोशीय संयुक्त संज्ञाओं (Compound Titles) के वैध शीर्ष/विशेषण घटक
    const COMPOUND_HEAD_OR_MODIFIER_ALLOWLIST = new Set([
        'साहित्य', 'विज्ञान', 'आंदोलन', 'आन्दोलन', 'संविधान', 'महासागर', 'सागर', 'उपग्रह', 'कांग्रेस', 'संगठन',
        'काल', 'युग', 'नदी', 'पर्वत', 'पठार', 'घाटी', 'द्वीप', 'प्रायद्वीप', 'खाड़ी', 'संधि', 'विश्वविद्यालय',
        'महाविद्यालय', 'संस्थान', 'अकादमी', 'परिषद', 'आयोग', 'मंत्रालय', 'मन्त्रालय', 'विभाग', 'सरकार', 'पुरस्कार',
        'सम्मान', 'युद्ध', 'संग्राम', 'विद्रोह', 'क्रांति', 'क्रान्ति', 'साम्राज्य', 'राजवंश', 'वंश', 'गणराज्य',
        'संघ', 'पार्टी', 'दल', 'मंदिर', 'मन्दिर', 'मस्जिद', 'गिरजाघर', 'गुरुद्वारा', 'किला', 'दुर्ग', 'महल',
        'उद्यान', 'अभयारण्य', 'योजना', 'मिशन', 'अभियान', 'प्रणाली', 'पद्धति', 'सिद्धांत', 'सिद्धान्त', 'दर्शन',
        'धर्म', 'संस्कृति', 'कला', 'संगीत', 'नृत्य', 'शैली', 'भाषा', 'लिपि', 'व्याकरण', 'काव्य', 'महाकाव्य',
        'पुराण', 'उपनिषद', 'संहिता', 'शास्त्र', 'चिकित्सा', 'प्रौद्योगिकी', 'अर्थव्यवस्था', 'बैंक', 'रेलवे',
        'राष्ट्रीय', 'भारतीय', 'अंतरराष्ट्रीय', 'अन्तरराष्ट्रीय', 'अखिल', 'संयुक्त', 'केंद्रीय', 'केन्द्रीय', 'सर्वोच्च',
        'उच्च', 'दक्षिण', 'उत्तर', 'पूर्व', 'पश्चिम', 'मध्य', 'प्राचीन', 'मध्यकालीन', 'आधुनिक', 'कृत्रिम', 'परमाणु',
        'सौर', 'अंतरिक्ष', 'अन्तरिक्ष', 'मौसम', 'भौतिक', 'रसायन', 'जीव', 'सामाजिक', 'राजनीतिक', 'आर्थिक', 'मानव',
        'लोक', 'शास्त्रीय', 'बौद्ध', 'जैन', 'हिन्दू', 'इस्लाम', 'सिख', 'ईसाई', 'छोड़ो', 'अनुसंधान', 'असहयोग'
    ]);

    function extractCandidates(cleanText, lang) {
        const minLength = DOM.optMinLength ? parseInt(DOM.optMinLength.value, 10) || 3 : 3;
        const skipDates = DOM.optSkipDates ? DOM.optSkipDates.checked : true;
        const skipUnits = DOM.optSkipUnits ? DOM.optSkipUnits.checked : true;
        const filterStopwords = DOM.optFilterStopwords ? DOM.optFilterStopwords.checked : true;
        const filterCommonWords = DOM.optFilterCommonWords ? DOM.optFilterCommonWords.checked : true;
        const preventSelfLink = DOM.optPreventSelfLink ? DOM.optPreventSelfLink.checked : true;

        const stopwordSet = STOPWORDS[lang] || STOPWORDS.hi;
        const oneAndTwoGrams = new Set();
        const threeAndFourGrams = new Set();

        // विराम चिह्नों और संरक्षित टोकनों पर उपवाक्य विभाजित करें ताकि N-gram कभी विराम चिह्न के पार न बने
        const clauses = cleanText.split(/[\x01\x02]?⟪\d+⟫[\x01\x02]?|[\x01\x02]?PROTECTED_\d+[\x01\x02]?|[।.!?,;:\n\r()\[\]{}"'«»“”‘’—–|\/#*]+/g);

        for (let c = 0; c < clauses.length; c++) {
            const clause = clauses[c];
            if (!clause || !clause.trim()) continue;

            const words = [];
            const wordRegex = /[\p{L}\p{M}\d_॰\-]+/gu;
            let m;
            while ((m = wordRegex.exec(clause)) !== null) {
                const token = m[0].replace(/^[\-_॰]+|[\-_]+$/g, '');
                if (token) words.push(token);
            }

            // पूरे लेख के सभी वैध 1-शब्द, 2-शब्द, 3-शब्द और 4-शब्द उम्मीदवारों का निष्कासन (बिना 220 की कृत्रिम सीमा के)
            for (let i = 0; i < words.length; i++) {
                for (let n = 1; n <= 4; n++) {
                    if (i + n <= words.length) {
                        const slice = words.slice(i, i + n);
                        const phrase = slice.join(' ').trim();
                        if (isValidCandidate(phrase, minLength, skipDates, skipUnits, filterStopwords, stopwordSet, lang, filterCommonWords, preventSelfLink)) {
                            if (n <= 2) {
                                oneAndTwoGrams.add(phrase);
                            } else {
                                threeAndFourGrams.add(phrase);
                            }
                        }
                    }
                }
            }
        }

        // सभी 1-शब्द और 2-शब्द उम्मीदवारों तथा वैध 3/4-शब्द संयुक्त पदों को एक साथ लौटाएँ (ताकि कोई भी शब्द न छूटे)
        return [...Array.from(oneAndTwoGrams), ...Array.from(threeAndFourGrams)];
    }

    function isValidCandidate(phrase, minLength, skipDates, skipUnits, filterStopwords, stopwordSet, lang = 'hi', filterCommonWords = true, preventSelfLink = true) {
        if (!phrase || phrase.length < minLength) return false;
        if (/^[\d०-९\s\-.,॰]+$/.test(phrase)) return false;

        const lower = phrase.toLowerCase().trim();

        // 0. पहले से ही लेख में कड़ीबद्ध शब्दों को दोबारा सत्यापन में न भेजें
        if (state.existingLinks && state.existingLinks.has(phrase)) return false;
        if (state.existingLinksLower && state.existingLinksLower.has(lower)) return false;

        // 1. उपयोगकर्ता कस्टम बहिष्कार सूची एवं एडमिन द्वारा स्वीकृत वैश्विक बहिष्कार सूची
        if (state.customBlacklist && state.customBlacklist.has(lower)) return false;
        if (state.approvedGlobalBlacklist && state.approvedGlobalBlacklist.has(lower)) return false;

        // 2. स्व-कड़ीकरण रोकें (WP:CIRCULAR / WP:SELFREF)
        if (preventSelfLink && isSelfLink(phrase, state.pageTitle)) {
            return false;
        }

        // 3. सामान्य तिथियाँ व 4-अंकीय वर्ष (WP:DATELINK)
        if (skipDates && (DATE_WORDS.has(lower) || /^\d{4}$/.test(phrase) || /^[०-९]{4}$/.test(phrase))) return false;

        // 4. माप व इकाइयाँ
        if (skipUnits && UNITS_OF_MEASURE.has(lower)) return false;

        // 5. शब्द-स्तरीय एवं संयुक्त संज्ञा (Compound Noun) तार्किक नियम
        const parts = lower.split(/\s+/).filter(Boolean);

        // किसी भी घटक में यदि केवल अंक हों तो छोड़ें
        if (parts.some(p => /^\d+$/.test(p) || /^[०-९]+$/.test(p))) return false;

        const langSet = NEVER_LINK_WORDS[lang] || NEVER_LINK_WORDS.hi;

        if (parts.length > 1) {
            if (OFFLINE_VERIFIED_WIKI_TITLES.has(phrase)) return true;

            const lastWord = parts[parts.length - 1];

            // बहु-शब्द पद में कोई भी शब्द परसर्ग, क्रिया, सर्वनाम, तिथि, मात्रक या सामान्य विशेषण नहीं होना चाहिए
            if (parts.some(p =>
                stopwordSet.has(p) ||
                HINDI_VERB_AND_PARTICLE_BOUNDARIES.has(p) ||
                STRICT_PHRASE_BREAKER_WORDS.has(p) ||
                DATE_WORDS.has(p) ||
                UNITS_OF_MEASURE.has(p) ||
                (state.customBlacklist && state.customBlacklist.has(p)) ||
                (state.approvedGlobalBlacklist && state.approvedGlobalBlacklist.has(p))
            )) {
                return false;
            }

            // बहु-शब्द पद का अंतिम शब्द कभी भी सम्मानसूचक उपसर्ग ('महर्षि', 'मुंशी', 'पंडित') नहीं हो सकता
            if (HONORIFIC_PREFIXES.has(lastWord)) return false;

            // बहु-शब्द पद के किसी भी घटक में यदि बहुवचन तिर्यक रूप (जैसे 'ग्रन्थों', 'नदियों', 'अभियानों') हो तो छोड़ें
            if (lang === 'hi' && parts.some(p => isInflectedHindiPluralOrOblique(p))) return false;

            // यदि कोई घटक बहुत छोटा (1 अक्षर) है तो छोड़ें
            if (parts.some(p => p.length < 2)) return false;

            if (filterCommonWords) {
                if (isNonLinkableWord(phrase, lang)) return false;

                // बहु-शब्द पद का प्रत्येक घटक या तो विशिष्ट संज्ञा हो (NEVER_LINK_WORDS से बाहर), या वैध संयुक्त संज्ञा घटक/सम्मानसूचक हो
                const hasInvalidCommonPart = parts.some((p, idx) => {
                    if (!langSet.has(p)) return false;
                    if (COMPOUND_HEAD_OR_MODIFIER_ALLOWLIST.has(p)) return false;
                    if (idx === 0 && HONORIFIC_PREFIXES.has(p)) return false;
                    return true;
                });
                if (hasInvalidCommonPart) return false;

                // 3 या 4 शब्दों के पद तभी स्वीकार्य हैं जब उनमें कोई ज्ञानकोशीय संयुक्त सूचक हो अथवा सभी शब्द विशिष्ट नाम हों
                if (parts.length >= 3) {
                    const hasCompoundMarker = parts.some(p => COMPOUND_HEAD_OR_MODIFIER_ALLOWLIST.has(p));
                    const allProperWords = parts.every(p => !langSet.has(p));
                    if (!hasCompoundMarker && !allProperWords) return false;
                }
            }
        } else {
            const singleWord = parts[0];
            if (filterStopwords && (stopwordSet.has(singleWord) || HINDI_VERB_AND_PARTICLE_BOUNDARIES.has(singleWord))) {
                return false;
            }
            if (HONORIFIC_PREFIXES.has(singleWord) || STRICT_PHRASE_BREAKER_WORDS.has(singleWord)) {
                return false;
            }
            if (lang === 'hi' && isInflectedHindiPluralOrOblique(singleWord)) {
                return false;
            }
            if (filterCommonWords && isNonLinkableWord(singleWord, lang)) {
                return false;
            }
        }

        return true;
    }

    // ================== सुझाव तालिका निर्माण (Full Compound Span Protection) ==================
    function buildSuggestions(cleanText, candidateMap) {
        const suggestions = [];
        const seenTerms = new Set();
        const seenTargets = new Set();
        let idCounter = 1;

        const skipDisambig = DOM.optSkipDisambig ? DOM.optSkipDisambig.checked : true;
        const skipRed = DOM.optBlueOnly ? DOM.optBlueOnly.checked : true;
        const resolveRedirects = DOM.optResolveRedirects ? DOM.optResolveRedirects.checked : true;
        const filterCommonWords = DOM.optFilterCommonWords ? DOM.optFilterCommonWords.checked : true;
        const preventSelfLink = DOM.optPreventSelfLink ? DOM.optPreventSelfLink.checked : true;

        // 1. पहले शब्द-संख्या (4-gram -> 3-gram -> 2-gram -> 1-gram) और फिर अक्षर लंबाई के अनुसार अवरोही क्रम
        const candidateArray = Array.from(candidateMap.keys());
        candidateArray.sort((a, b) => {
            const wordsA = a.trim().split(/\s+/).length;
            const wordsB = b.trim().split(/\s+/).length;
            if (wordsB !== wordsA) return wordsB - wordsA;
            return b.length - a.length;
        });

        // अधिग्रहित अंतरालों की सूची (Claimed non-overlapping character spans)
        const claimedIntervals = [];

        function isSpanOverlapping(start, end) {
            return claimedIntervals.some(span => Math.max(start, span.start) < Math.min(end, span.end));
        }

        function claimAllOccurrencesInText(phrase) {
            if (!phrase || phrase.length < 2) return;
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rgx = new RegExp(`(^|[^\\p{L}\\p{M}\\d_\\-॰'])(${escaped})(?=$|[^\\p{L}\\p{M}\\d_\\-॰'])`, 'gu');
            let m;
            while ((m = rgx.exec(cleanText)) !== null) {
                const pfx = m[1] || '';
                const sIdx = m.index + pfx.length;
                const eIdx = sIdx + phrase.length;
                if (!isSpanOverlapping(sIdx, eIdx)) {
                    claimedIntervals.push({ start: sIdx, end: eIdx, term: phrase });
                }
            }
        }

        // स्व-शीर्षक उपनामों (Self-title aliases जैसे 'तुलसीदास', 'महात्मा गांधी') के सभी स्थानों को पहले ही सुरक्षित करें
        if (state.selfTitleAliases && state.selfTitleAliases.size > 0) {
            state.selfTitleAliases.forEach(alias => {
                seenTargets.add(alias.trim().toLowerCase());
                claimAllOccurrencesInText(alias);
            });
        }

        // पहले से मौजूद कड़ियों (Existing Links) के लक्ष्यों व पदों को सुरक्षित करें
        if (state.existingLinks && state.existingLinks.size > 0) {
            state.existingLinks.forEach(existingTarget => {
                seenTargets.add(existingTarget.trim().toLowerCase());
                claimAllOccurrencesInText(existingTarget);
            });
        }

        for (const term of candidateArray) {
            const info = candidateMap.get(term);
            if (!info) continue;

            const resolvedWikiTarget = (info.target || term).trim();

            // यदि कोई पद या उसका रीडायरेक्ट लक्ष्य स्वयं वर्तमान लेख का शीर्षक है (WP:CIRCULAR)
            if (preventSelfLink && (isSelfLink(term, state.pageTitle) || isSelfLink(resolvedWikiTarget, state.pageTitle))) {
                claimAllOccurrencesInText(term);
                continue;
            }

            if (filterCommonWords && isNonLinkableWord(term, state.lang)) {
                continue;
            }
            if (state.customBlacklist && state.customBlacklist.has(term.toLowerCase())) {
                continue;
            }
            if (state.approvedGlobalBlacklist && state.approvedGlobalBlacklist.has(term.toLowerCase())) {
                continue;
            }

            const exists = info.exists;
            const isRedirect = info.isRedirect;
            const isDisambig = info.isDisambig;
            let target = resolveRedirects && isRedirect ? resolvedWikiTarget : term;

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

            // यदि इस लक्ष्य पृष्ठ (या रीडायरेक्ट लक्ष्य) की कड़ी पहले ही लेख में या सुझावों में चुनी जा चुकी है (WP:OVERLINKING)
            const normTargetKey = (target || term).trim().toLowerCase();
            const normResolvedKey = resolvedWikiTarget.toLowerCase();
            if (seenTargets.has(normTargetKey) || seenTargets.has(normResolvedKey)) {
                if (exists) claimAllOccurrencesInText(term);
                continue;
            }

            // पाठ में इस पद की सभी स्वतंत्र अनाच्छादित आवृत्तियाँ खोजें (Lookahead सीमा ताकि <ref> या एकल स्पेस के पास के शब्द भी सटीक मिलें)
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(^|[^\\p{L}\\p{M}\\d_\\-॰'])(${escaped})(?=$|[^\\p{L}\\p{M}\\d_\\-॰'])`, 'gu');
            let match;
            let standaloneMatch = null;
            const allTermSpans = [];

            while ((match = regex.exec(cleanText)) !== null) {
                const prefix = match[1] || '';
                const termStart = match.index + prefix.length;
                const termEnd = termStart + term.length;

                if (!isSpanOverlapping(termStart, termEnd)) {
                    if (!standaloneMatch) {
                        standaloneMatch = { start: termStart, end: termEnd, matchIndex: match.index };
                    }
                    allTermSpans.push({ start: termStart, end: termEnd, term: term });
                }
            }

            if (standaloneMatch && !seenTerms.has(term.toLowerCase())) {
                seenTerms.add(term.toLowerCase());
                seenTargets.add(normTargetKey);
                seenTargets.add(normResolvedKey);

                // केवल सत्यापित अस्तित्वमान कड़ियों के अंतराल को ही claimedIntervals में लॉक करें
                if (exists) {
                    allTermSpans.forEach(sp => claimedIntervals.push(sp));
                }

                const index = standaloneMatch.matchIndex;
                const start = Math.max(0, index - 35);
                const end = Math.min(cleanText.length, index + term.length + 35);
                let context = cleanText.substring(start, end).replace(/[\x01\x02]?⟪\d+⟫[\x01\x02]?|[\x01\x02]?PROTECTED_\d+[\x01\x02]?/g, '...');

                suggestions.push({
                    id: idCounter++,
                    term: term,
                    target: target,
                    resolvedTarget: resolvedWikiTarget,
                    status: status,
                    isDisambig: isDisambig,
                    isMultiWord: isMulti,
                    context: context,
                    checked: (status === 'blue' || status === 'redirect')
                });
            }
        }

        state.suggestions = suggestions;
    }

    function createTermRegex(term) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^\\p{L}\\p{M}\\d_\\-॰'])(${escaped})([^\\p{L}\\p{M}\\d_\\-॰']|$)`, 'u');
    }

    // ================== छन्नी एवं तालिका रेंडरिंग ==================
    function getWordLengthBucketKey(term) {
        const cleanLen = Array.from(String(term || '').replace(/\s+/g, '')).length;
        if (cleanLen <= 3) return '2-3';
        if (cleanLen <= 5) return '4-5';
        if (cleanLen <= 7) return '6-7';
        if (cleanLen <= 9) return '8-9';
        if (cleanLen <= 12) return '10-12';
        return '13+';
    }

    function getFilteredSuggestions() {
        return state.suggestions.filter(s => {
            if (state.filterStatus === 'blue' && s.status !== 'blue') return false;
            if (state.filterStatus === 'redirect' && s.status !== 'redirect') return false;
            if (state.filterStatus === 'disambig' && s.status !== 'disambig') return false;
            if (state.filterStatus === 'red' && s.status !== 'red') return false;

            if (state.filterType === 'multi' && !s.isMultiWord) return false;
            if (state.filterType === 'single' && s.isMultiWord) return false;

            if (state.filterLengthBucket && getWordLengthBucketKey(s.term) !== state.filterLengthBucket) {
                return false;
            }

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
        const isLoggedIn = Boolean(currentUser && currentUser.email);
        const isUserAdmin = Boolean(
            currentUser &&
            currentUser.email &&
            currentUser.email.trim().toLowerCase() === 'amankumar.wikimedian@gmail.com' &&
            currentUser.name &&
            (currentUser.name.trim() === 'विक्रम प्रताप' || currentUser.name.trim().includes('विक्रम प्रताप'))
        );

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

        visibleList.forEach((s, idx) => {
            const tr = document.createElement('tr');
            tr.style.animationDelay = `${Math.min(idx * 24, 320)}ms`;
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

            const globalBlBtnLabel = isUserAdmin
                ? '🚫 बहिष्कार सूची में जोड़ें'
                : '📩 बहिष्कार हेतु अनुरोध करें';
            const globalBlBtnTitle = isUserAdmin
                ? 'एडमिन अधिकार: इस शब्द को सीधे वैश्विक बहिष्कार सूची में जोड़ें'
                : 'इस शब्द को वैश्विक बहिष्कार सूची में जोड़ने हेतु एडमिन (विक्रम प्रताप) को अनुरोध भेजें';

            tr.innerHTML = `
                <td class="td-checkbox-cell" data-label="चयन">
                    <input type="checkbox" class="suggestion-checkbox" data-id="${s.id}" ${s.checked ? 'checked' : ''} aria-label="${escapeHtml(s.term)} चुनें">
                </td>
                <td data-label="मूल शब्द">
                    <span class="term-tag">${escapeHtml(s.term)}</span>
                    ${s.isMultiWord ? '<span class="multiword-pill" title="संयुक्त बहु-शब्द पद">संयुक्त पद</span>' : ''}
                </td>
                <td data-label="लक्ष्य पृष्ठ">
                    <div class="target-link">
                        <button type="button" class="btn btn-text btn-sm preview-target-btn" data-target="${escapeHtml(s.target)}" title="त्वरित सारांश देखें">[सारांश]</button>
                        <a href="https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(s.target)}" target="_blank" rel="noopener" title="विकिपीडिया पर पृष्ठ खोलें">
                            ${escapeHtml(s.target)}
                        </a>
                    </div>
                </td>
                <td data-label="स्थिति">${statusBadge}</td>
                <td data-label="संदर्भ वाक्य">
                    <div class="context-snippet" title="${escapeHtml(s.context)}">
                        ${highlightedContext}
                    </div>
                </td>
                <td class="td-actions-cell" data-label="क्रियाएँ">
                    <div class="review-action-btns">
                        <button type="button" class="btn btn-outline btn-sm edit-target-btn" data-id="${s.id}" title="लक्ष्य पृष्ठ संशोधित करें">संशोधन</button>
                        <button type="button" class="btn btn-outline btn-sm blacklist-term-btn text-danger" data-term="${escapeHtml(s.term)}" title="इस शब्द को केवल अपनी स्थानीय सूची में अनदेखा करें">अनदेखा</button>
                        ${isLoggedIn ? `
                            <button type="button" class="btn btn-warning-soft btn-sm request-global-bl-btn" data-term="${escapeHtml(s.term)}" title="${globalBlBtnTitle}">
                                ${globalBlBtnLabel}
                            </button>
                        ` : ''}
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
                    state.customBlacklist.add(s.term.toLowerCase());
                    saveBlacklist();
                    state.suggestions = state.suggestions.filter(item => item.term.toLowerCase() !== s.term.toLowerCase());
                    renderSuggestionsTable();
                    recalculateModifiedWikitext();
                    showToast(`'${s.term}' स्थानीय बहिष्कार सूची में जोड़ा गया`);
                });
            }

            const reqGlobalBlBtn = tr.querySelector('.request-global-bl-btn');
            if (reqGlobalBlBtn) {
                reqGlobalBlBtn.addEventListener('click', async () => {
                    if (!currentUser || !currentUser.email) {
                        showToast('कृपया बहिष्कार अनुरोध भेजने के लिए पहले लॉगिन करें।');
                        return;
                    }
                    reqGlobalBlBtn.disabled = true;
                    reqGlobalBlBtn.textContent = isUserAdmin ? '⏳ जोड़ा जा रहा है...' : '⏳ अनुरोध भेजा जा रहा है...';
                    try {
                        let reqResult = null;
                        if (window.WikiFirebase && window.WikiFirebase.submitBlacklistRequestToFirestore) {
                            reqResult = await window.WikiFirebase.submitBlacklistRequestToFirestore({
                                term: s.term,
                                word: s.term,
                                lang: state.lang || 'hi',
                                articleTitle: state.pageTitle || 'अशीर्षक लेख',
                                reason: s.context || 'कड़ियों की समीक्षा एवं डिफ़ अनुभाग से अनुरोधित',
                                requestedByEmail: currentUser.email,
                                requestedByName: currentUser.name
                            });
                        }

                        if (isUserAdmin || (reqResult && reqResult.isAdmin)) {
                            addWordToLocalApprovedBlacklist({
                                word: s.term.toLowerCase(),
                                lang: state.lang || 'hi',
                                approvedBy: 'amankumar.wikimedian@gmail.com'
                            });
                        }

                        // वर्तमान सत्र से भी तुरंत हटाएँ ताकि उपयोगकर्ता को तत्काल लाभ मिले
                        state.customBlacklist.add(s.term.toLowerCase());
                        saveBlacklist();
                        state.suggestions = state.suggestions.filter(item => item.term.toLowerCase() !== s.term.toLowerCase());
                        renderSuggestionsTable();
                        recalculateModifiedWikitext();

                        logUserActivity(isUserAdmin ? 'वैश्विक बहिष्कार शब्द जोड़ा' : 'बहिष्कार हेतु अनुरोध भेजा', {
                            title: state.pageTitle || 'अशीर्षक लेख',
                            lang: state.lang || 'hi',
                            note: `शब्द: '${s.term}' (${isUserAdmin ? 'एडमिन द्वारा सीधे स्वीकृत' : 'एडमिन सहमति हेतु लंबित'})`
                        });

                        if (isUserAdmin) {
                            showToast(`✓ '${s.term}' को एडमिन द्वारा वैश्विक बहिष्कार सूची में सीधे जोड़ दिया गया है!`);
                        } else {
                            showToast(`✓ '${s.term}' के लिए बहिष्कार अनुरोध एडमिन (विक्रम प्रताप) की सहमति हेतु भेज दिया गया है!`);
                        }

                        if (typeof refreshAdminAndApprovedBlacklist === 'function') {
                            refreshAdminAndApprovedBlacklist();
                        }
                    } catch (err) {
                        console.warn('Blacklist request error:', err);
                        showToast(`'${s.term}' अनुरोध सहेजने में त्रुटि: ${err.message || 'कृपया पुनः प्रयास करें।'}`);
                        reqGlobalBlBtn.disabled = false;
                        reqGlobalBlBtn.textContent = globalBlBtnLabel;
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
        const densityNum = words > 0 ? ((totalLinks / words) * 100) : 0;

        animateStatValue(DOM.statTotalWords, words, { locale: 'hi-IN' });
        animateStatValue(DOM.statExistingLinks, existingCount, { locale: 'hi-IN' });
        animateStatValue(DOM.statNewLinks, activeCount, { prefix: '+' });
        animateStatValue(DOM.statLinkDensity, densityNum, { decimals: 1, suffix: '%' });

        const densityMeterFill = $('density-meter-fill');
        if (densityMeterFill) {
            const barWidth = Math.min(100, Math.max(0, (densityNum / 8) * 100));
            densityMeterFill.style.width = `${barWidth.toFixed(1)}%`;
            densityMeterFill.classList.toggle('density-warning', densityNum > 5.5);
        }

        if (DOM.densityRating) {
            if (densityNum < 1.5) {
                DOM.densityRating.textContent = 'अपेक्षाकृत कम कड़ियाँ';
                DOM.densityRating.className = 'density-rating badge-total';
            } else if (densityNum <= 5.5) {
                DOM.densityRating.textContent = 'संतुलित घनत्व';
                DOM.densityRating.className = 'density-rating badge-blue';
            } else {
                DOM.densityRating.textContent = 'अति-कड़ीकरण चेतावनी';
                DOM.densityRating.className = 'density-rating badge-red';
            }
        }

        renderD3WordLengthChart();
    }

    // ================== D3.js शब्द लंबाई बनाम जोड़ी गई कड़ियाँ चार्ट (Over-Linking Pattern Visualizer) ==================
    function renderD3WordLengthChart() {
        const container = $('d3-word-length-chart');
        const insightBadge = $('d3-overlink-insight-badge');
        const resetBtn = $('btn-reset-d3-length-filter');
        if (!container) return;

        const buckets = [
            { key: '2-3', label: '2–3 अक्षर', shortDesc: 'अति-लघु शब्द', added: 0, skipped: 0, isWarningZone: true },
            { key: '4-5', label: '4–5 अक्षर', shortDesc: 'लघु शब्द', added: 0, skipped: 0, isWarningZone: false },
            { key: '6-7', label: '6–7 अक्षर', shortDesc: 'मध्यम पद', added: 0, skipped: 0, isWarningZone: false },
            { key: '8-9', label: '8–9 अक्षर', shortDesc: 'विशिष्ट पद', added: 0, skipped: 0, isWarningZone: false },
            { key: '10-12', label: '10–12 अक्षर', shortDesc: 'संयुक्त पद', added: 0, skipped: 0, isWarningZone: false },
            { key: '13+', label: '13+ अक्षर', shortDesc: 'दीर्घ वाक्यांश', added: 0, skipped: 0, isWarningZone: false }
        ];
        const bucketMap = new Map(buckets.map(b => [b.key, b]));

        (state.suggestions || []).forEach(s => {
            const bKey = getWordLengthBucketKey(s.term);
            const bucket = bucketMap.get(bKey);
            if (bucket) {
                if (s.checked) bucket.added++;
                else bucket.skipped++;
            }
        });

        buckets.forEach(b => {
            b.total = b.added + b.skipped;
        });

        const totalAdded = buckets.reduce((acc, b) => acc + b.added, 0);
        const shortAdded = buckets[0].added;
        const shortRatio = totalAdded > 0 ? (shortAdded / totalAdded) : 0;

        if (insightBadge) {
            if (totalAdded === 0) {
                insightBadge.textContent = 'कोई कड़ी चयनित नहीं';
                insightBadge.className = 'badge badge-total';
            } else if (shortAdded >= 4 && shortRatio > 0.32) {
                insightBadge.textContent = `⚠️ छोटे शब्दों में अधिक कड़ियाँ (${Math.round(shortRatio * 100)}%) — जाँच करें`;
                insightBadge.className = 'badge badge-disambig';
            } else {
                insightBadge.textContent = '✓ संतुलित शब्द-लंबाई वितरण';
                insightBadge.className = 'badge badge-blue';
            }
        }

        if (resetBtn) {
            resetBtn.style.display = state.filterLengthBucket ? 'inline-flex' : 'none';
        }

        container.innerHTML = '';

        const width = Math.max(container.clientWidth || 640, 300);
        const height = 220;
        const margin = { top: 24, right: 18, bottom: 44, left: 40 };
        const innerW = Math.max(width - margin.left - margin.right, 200);
        const innerH = height - margin.top - margin.bottom;
        const maxVal = Math.max(4, ...buckets.map(b => b.total));

        if (typeof window.d3 !== 'undefined') {
            const d3 = window.d3;
            const svg = d3.select(container)
                .append('svg')
                .attr('viewBox', `0 0 ${width} ${height}`)
                .attr('width', '100%')
                .attr('height', height)
                .style('overflow', 'visible');

            const g = svg.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const x = d3.scaleBand()
                .domain(buckets.map(d => d.key))
                .range([0, innerW])
                .padding(0.28);

            const y = d3.scaleLinear()
                .domain([0, maxVal])
                .nice()
                .range([innerH, 0]);

            // क्षैतिज ग्रिड रेखाएँ
            g.append('g')
                .attr('class', 'd3-grid-lines')
                .selectAll('line')
                .data(y.ticks(4))
                .join('line')
                .attr('x1', 0)
                .attr('x2', innerW)
                .attr('y1', d => y(d))
                .attr('y2', d => y(d))
                .attr('stroke', 'var(--border-light)')
                .attr('stroke-dasharray', '3,3');

            // Y-अक्ष
            g.append('g')
                .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')))
                .call(axis => axis.select('.domain').attr('stroke', 'var(--border-color)'))
                .call(axis => axis.selectAll('text').attr('fill', 'var(--text-secondary)').style('font-size', '11px'));

            // X-अक्ष
            g.append('g')
                .attr('transform', `translate(0,${innerH})`)
                .call(d3.axisBottom(x).tickFormat(key => {
                    const found = bucketMap.get(key);
                    return found ? found.label : key;
                }))
                .call(axis => axis.select('.domain').attr('stroke', 'var(--border-color)'))
                .call(axis => axis.selectAll('text')
                    .attr('fill', 'var(--text-primary)')
                    .style('font-size', '11.5px')
                    .style('font-weight', '600'));

            // बार समूह (Stacked: Added + Skipped)
            const barGroups = g.selectAll('.d3-bucket-group')
                .data(buckets)
                .join('g')
                .attr('class', 'd3-bucket-group')
                .attr('transform', d => `translate(${x(d.key)},0)`)
                .style('cursor', 'pointer')
                .on('click', (event, d) => {
                    if (state.filterLengthBucket === d.key) {
                        state.filterLengthBucket = null;
                        showToast('शब्द लंबाई छन्नी हटाई गई');
                    } else {
                        state.filterLengthBucket = d.key;
                        showToast(`'${d.label}' लंबाई के शब्द छाँटे गए`);
                    }
                    renderSuggestionsTable();
                    renderD3WordLengthChart();
                });

            // कुल उम्मीदवार पृष्ठभूमि बार (Skipped/Unchecked)
            barGroups.append('rect')
                .attr('x', 0)
                .attr('y', d => y(d.total))
                .attr('width', x.bandwidth())
                .attr('height', d => Math.max(0, innerH - y(d.total)))
                .attr('rx', 5)
                .attr('fill', 'var(--border-color)')
                .attr('opacity', d => (state.filterLengthBucket && state.filterLengthBucket !== d.key) ? 0.35 : 0.65);

            // जोड़ी गई कड़ियाँ (Added Links Bar)
            barGroups.append('rect')
                .attr('x', 0)
                .attr('y', d => y(d.added))
                .attr('width', x.bandwidth())
                .attr('height', d => Math.max(0, innerH - y(d.added)))
                .attr('rx', 5)
                .attr('fill', d => {
                    if (d.isWarningZone && d.added > 0) return 'var(--accent-orange)';
                    return 'var(--primary-color)';
                })
                .attr('stroke', d => state.filterLengthBucket === d.key ? 'var(--text-primary)' : 'none')
                .attr('stroke-width', 2)
                .attr('opacity', d => (state.filterLengthBucket && state.filterLengthBucket !== d.key) ? 0.45 : 1);

            // बार के ऊपर संख्या लेबल
            barGroups.append('text')
                .attr('x', x.bandwidth() / 2)
                .attr('y', d => y(d.total) - 6)
                .attr('text-anchor', 'middle')
                .attr('fill', 'var(--text-primary)')
                .style('font-size', '11px')
                .style('font-weight', '700')
                .text(d => d.total > 0 ? `+${d.added}${d.skipped > 0 ? `/${d.total}` : ''}` : '0');
        } else {
            // यदि ऑफ़लाइन मोड में D3 स्क्रिप्ट उपलब्ध न हो तो स्वच्छ SVG बार चार्ट फ़ॉलबैक
            const barW = Math.floor(innerW / buckets.length) - 14;
            const svgParts = [`<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">`];
            buckets.forEach((b, idx) => {
                const bx = margin.left + idx * (barW + 14) + 6;
                const totalH = Math.round((b.total / maxVal) * innerH);
                const addedH = Math.round((b.added / maxVal) * innerH);
                const byTotal = margin.top + (innerH - totalH);
                const byAdded = margin.top + (innerH - addedH);
                const fillCol = (b.isWarningZone && b.added > 0) ? 'var(--accent-orange)' : 'var(--primary-color)';
                svgParts.push(`
                    <g class="d3-fallback-bar" data-bucket="${b.key}" style="cursor:pointer">
                        <rect x="${bx}" y="${byTotal}" width="${barW}" height="${totalH}" rx="5" fill="var(--border-color)" opacity="0.55"></rect>
                        <rect x="${bx}" y="${byAdded}" width="${barW}" height="${addedH}" rx="5" fill="${fillCol}"></rect>
                        <text x="${bx + barW / 2}" y="${byTotal - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-primary)">+${b.added}</text>
                        <text x="${bx + barW / 2}" y="${margin.top + innerH + 18}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-primary)">${b.label}</text>
                    </g>
                `);
            });
            svgParts.push('</svg>');
            container.innerHTML = svgParts.join('');
            container.querySelectorAll('.d3-fallback-bar').forEach(el => {
                el.addEventListener('click', () => {
                    const key = el.getAttribute('data-bucket');
                    state.filterLengthBucket = (state.filterLengthBucket === key) ? null : key;
                    renderSuggestionsTable();
                    renderD3WordLengthChart();
                });
            });
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

        // सुरक्षित टोकनों की पूर्ण व सुरक्षित पुनर्बहाली
        modifiedText = unprotectWikitext(modifiedText, protectedTokens);

        state.processedWikitext = modifiedText;
        safeSetValue(DOM.finalWikitextOutput, modifiedText);

        renderMediaWikiDiff(state.originalWikitext, modifiedText, state.diffMode);
        generateRenderedPreview(modifiedText);
        updateCounters();
    }

    function applyReplacements(text, activeSuggestions, firstOnly, cleanPipes) {
        let result = text;
        // पहले बहु-शब्द संयुक्त पदों को शब्द-संख्या व लंबाई के अवरोही क्रम में क्रमबद्ध करें
        const sorted = [...activeSuggestions].sort((a, b) => {
            const wordsA = a.term.trim().split(/\s+/).length;
            const wordsB = b.term.trim().split(/\s+/).length;
            if (wordsB !== wordsA) return wordsB - wordsA;
            return b.term.length - a.term.length;
        });

        const linkTokens = [];
        const keepPlainTokens = [];
        let tokenIndex = 0;
        let plainIndex = 0;

        // 0. पहले से मौजूद बहु-शब्द कड़ियों (जैसे [[जनता दल]]) तथा लेख के स्वयं के शीर्षक उपनामों (selfTitleAliases) के अन्य उल्लेखों को सुरक्षित करें
        const phrasesToKeepIntact = new Set();
        if (state.existingLinks && state.existingLinks.size > 0) {
            state.existingLinks.forEach(p => {
                if (p && p.includes(' ') && p.length >= 4) phrasesToKeepIntact.add(p);
            });
        }
        if (state.selfTitleAliases && state.selfTitleAliases.size > 0) {
            state.selfTitleAliases.forEach(p => {
                if (p && p.length >= 3) phrasesToKeepIntact.add(p);
            });
        }
        // सभी पहचाने गए बहु-शब्द सुझावों (चाहे वे अचयनित भी किए गए हों) को भी आधी कड़ी में टूटने से बचाएं
        if (Array.isArray(state.suggestions)) {
            state.suggestions.forEach(sug => {
                if (!sug.checked && sug.term && sug.term.includes(' ') && sug.term.length >= 4) {
                    phrasesToKeepIntact.add(sug.term);
                }
            });
        }

        phrasesToKeepIntact.forEach(existingPhrase => {
            const esc = existingPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rgx = new RegExp(`(^|[^\\p{L}\\p{M}\\d_\\-॰'])(${esc})(?=$|[^\\p{L}\\p{M}\\d_\\-॰'])`, 'giu');
            result = result.replace(rgx, (m, pfx, matchedTerm) => {
                const ph = `\x01〘${plainIndex++}〙\x02`;
                keepPlainTokens.push({ placeholder: ph, original: matchedTerm });
                return `${pfx}${ph}`;
            });
        });

        sorted.forEach(s => {
            const escaped = s.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // हमेशा 'gu' फ्लैग और Lookahead शब्द-सीमा का प्रयोग करें ताकि <ref> या एकल स्पेस के पास के शब्द भी सटीक जुड़ें
            const pattern = new RegExp(`(^|[^\\p{L}\\p{M}\\d_\\-॰'])(${escaped})(?=$|[^\\p{L}\\p{M}\\d_\\-॰'])`, 'gu');

            let wikilink = '';
            if (cleanPipes && s.target.toLowerCase() === s.term.toLowerCase()) {
                wikilink = `[[${s.term}]]`;
            } else if (s.target === s.term) {
                wikilink = `[[${s.term}]]`;
            } else {
                wikilink = `[[${s.target}|${s.term}]]`;
            }

            let replaced = false;
            const isMultiWord = s.term.trim().includes(' ');

            result = result.replace(pattern, (match, prefix, termMatch) => {
                if (firstOnly && replaced) {
                    // यदि यह संयुक्त पद दूसरी या तीसरी बार आया है, तो इसे सादा (Plain) सुरक्षित रखें
                    // ताकि बाद में कोई एकल शब्द इसे तोड़कर आधी कड़ी न बना सके
                    if (isMultiWord) {
                        const plainPh = `\x01〘${plainIndex++}〙\x02`;
                        keepPlainTokens.push({ placeholder: plainPh, original: termMatch });
                        return `${prefix}${plainPh}`;
                    }
                    return match;
                }
                replaced = true;
                const placeholder = `\x01⟬${tokenIndex++}⟭\x02`;
                linkTokens.push({ placeholder, wikilink });
                return `${prefix}${placeholder}`;
            });
        });

        // सभी सादे सुरक्षित बहु-शब्द पदों को पुनर्स्थापित करें
        keepPlainTokens.forEach(t => {
            result = result.split(t.placeholder).join(t.original);
        });

        // सभी नई कड़ियों को सुरक्षित रूप से पुनर्स्थापित करें
        linkTokens.forEach(t => {
            result = result.split(t.placeholder).join(t.wikilink);
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

    // ================== प्रामाणिक विकिपीडिया पूर्वावलोकन जनरेटर (Wikipedia Vector-2022 Article Preview) ==================
    function generateRenderedPreview(wikitext) {
        if (!DOM.articlePreviewContainer) return;
        const raw = (wikitext || '').trim();
        if (!raw) {
            DOM.articlePreviewContainer.innerHTML = '<div class="diff-empty-msg">पूर्वावलोकन हेतु कोई विकिटेक्स्ट उपलब्ध नहीं है।</div>';
            return;
        }

        const lang = state.lang || 'hi';
        const articleTitle = state.pageTitle || 'विकिपीडिया लेख पूर्वावलोकन';
        const highlightNew = $('opt-highlight-new-preview-links') ? $('opt-highlight-new-preview-links').checked : true;

        // 1. नई जोड़ी गई कड़ियों का सेट पहचानें ताकि उन्हें वैकल्पिक रूप से हाइलाइट किया जा सके
        const newlyAddedTargets = new Set(
            (state.suggestions || [])
                .filter(s => s.checked)
                .map(s => (s.target || s.term || '').trim().toLowerCase())
        );

        let working = raw;

        // 2. HTML टिप्पणियाँ हटाएँ
        working = working.replace(/<!--[\s\S]*?-->/g, '');

        // 3. श्रेणियाँ ([[श्रेणी:...]] / [[Category:...]]) निकालें
        const categories = [];
        working = working.replace(/\[\[\s*(?:श्रेणी|Category)\s*:\s*([^\]|]+)(?:\|[^\]]*)?\]\]/gi, (m, catName) => {
            const cleanCat = catName.trim();
            if (cleanCat && !categories.includes(cleanCat)) {
                categories.push(cleanCat);
            }
            return '';
        });

        // 4. ज्ञानसन्दूक / Infobox साँचा पार्स करें ({{ज्ञानसन्दूक ...}} या {{Infobox ...}})
        let infoboxHtml = '';
        const infoboxStartRegex = /\{\{\s*(?:ज्ञानसन्दूक|Infobox|सूचनापेटिका)([^\n|]*)/i;
        const ibMatch = infoboxStartRegex.exec(working);
        if (ibMatch) {
            const startIdx = ibMatch.index;
            let depth = 0;
            let endIdx = -1;
            for (let i = startIdx; i < working.length - 1; i++) {
                if (working[i] === '{' && working[i + 1] === '{') {
                    depth++;
                    i++;
                } else if (working[i] === '}' && working[i + 1] === '}') {
                    depth--;
                    i++;
                    if (depth === 0) {
                        endIdx = i + 1;
                        break;
                    }
                }
            }
            if (endIdx > startIdx) {
                const infoboxRaw = working.slice(startIdx, endIdx);
                working = working.slice(0, startIdx) + working.slice(endIdx);
                infoboxHtml = renderWikipediaInfobox(infoboxRaw, articleTitle, lang, newlyAddedTargets, highlightNew);
            }
        }

        // 5. शेष अन्य जटिल बहु-पंक्ति या इनलाइन साँचों ({{...}}) को स्वच्छ रूप दें
        let tplPass = 0;
        while (/\{\{[^{}]*\}\}/.test(working) && tplPass++ < 15) {
            working = working.replace(/\{\{([^{}]*)\}\}/g, (m, inner) => {
                const parts = inner.split('|').map(p => p.trim());
                const tplName = (parts[0] || '').toLowerCase();
                if (/^(आधार|stub|प्रमाणीकरण|authority control|coord|अंग्रेज़ी में|उद्धरण|cite|citation|reflist|सन्दर्भ|संदर्भ|टिप्पणीसूची|main|मुख्य|see also|इन्हें भी देखें)/i.test(tplName)) {
                    if (/^(main|मुख्य)\b/i.test(tplName) && parts[1]) {
                        return `<div class="mw-hatnote"><em>मुख्य लेख: <a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(parts[1])}" target="_blank" class="mw-wikilink">${escapeHtml(parts[1])}</a></em></div>`;
                    }
                    return '';
                }
                return '';
            });
        }

        // 6. चित्र / मीडिया फ़ाइलें ([[चित्र:...]] / [[File:...]] / [[Image:...]]) को विकिपीडिया थंबनेल में बदलें
        const figureTokens = [];
        working = working.replace(/\[\[\s*(?:चित्र|फ़ाइल|File|Image)\s*:([^\]]+)\]\]/gi, (m, inner) => {
            // नेस्टेड कड़ियों को सुरक्षित रखते हुए पाइप विभाजित करें
            const segments = [];
            let cur = '';
            let bracketDepth = 0;
            for (let i = 0; i < inner.length; i++) {
                if (inner[i] === '[' && inner[i + 1] === '[') {
                    bracketDepth++;
                    cur += '[[';
                    i++;
                } else if (inner[i] === ']' && inner[i + 1] === ']') {
                    bracketDepth = Math.max(0, bracketDepth - 1);
                    cur += ']]';
                    i++;
                } else if (inner[i] === '|' && bracketDepth === 0) {
                    segments.push(cur.trim());
                    cur = '';
                } else {
                    cur += inner[i];
                }
            }
            if (cur.trim()) segments.push(cur.trim());

            const fileName = (segments[0] || '').trim();
            if (!fileName) return '';

            let align = 'tright';
            let caption = '';
            const optionRegex = /^(thumb|thumbnail|अंगूठाकार|frame|framed|frameless|border|right|दाएँ|दाएं|left|बाएँ|बाएं|center|मध्य|none|\d+x?\d*px|upright.*|alt=.*)$/i;

            for (let i = 1; i < segments.length; i++) {
                const seg = segments[i];
                if (/^(left|बाएँ|बाएं)$/i.test(seg)) align = 'tleft';
                else if (/^(center|मध्य)$/i.test(seg)) align = 'tnone';
                else if (!optionRegex.test(seg)) {
                    caption = seg;
                }
            }

            const imgUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName.replace(/\s+/g, '_'))}?width=260`;
            const captionHtml = caption ? renderInlineWikitext(caption, lang, newlyAddedTargets, highlightNew) : escapeHtml(fileName);
            const figHtml = `
                <figure class="mw-default-size thumb ${align}">
                    <div class="thumbinner">
                        <a href="https://${lang}.wikipedia.org/wiki/File:${encodeURIComponent(fileName)}" target="_blank" class="mw-file-description">
                            <img src="${imgUrl}" alt="${escapeHtml(fileName)}" class="mw-file-element" loading="lazy" onerror="this.parentElement.style.display='none'">
                        </a>
                        <figcaption class="thumbcaption">${captionHtml}</figcaption>
                    </div>
                </figure>
            `;
            const token = `\x01WIKIFIG_${figureTokens.length}\x02`;
            figureTokens.push({ token, html: figHtml });
            return token;
        });

        // 7. संदर्भ (<ref>...</ref>) को क्रमांकित [१], [२] या [1], [2] फुटनोट में बदलें
        const references = [];
        const refTokens = [];
        working = working.replace(/<ref[^>]*>([\s\S]*?)<\/ref>/gi, (m, refContent) => {
            const cleanRef = refContent.trim();
            let refIdx = references.indexOf(cleanRef);
            if (refIdx === -1) {
                references.push(cleanRef);
                refIdx = references.length;
            } else {
                refIdx = refIdx + 1;
            }
            const supHtml = `<sup id="cite_ref-${refIdx}" class="reference"><a href="#cite_note-${refIdx}" title="${escapeHtml(cleanRef.replace(/<[^>]+>/g, ''))}">[${refIdx}]</a></sup>`;
            const token = `\x01WIKIREF_${refTokens.length}\x02`;
            refTokens.push({ token, html: supHtml });
            return token;
        });
        working = working.replace(/<ref[^>]*\/>/gi, '');

        // 8. अनुभाग शीर्षक (== ... ==) और अनुक्रमणी (Table of Contents) तैयार करें
        const tocEntries = [];
        const lines = working.split('\n');
        const processedBlocks = [];
        let listBuffer = [];
        let listType = null; // 'ul' | 'ol'

        function flushListBuffer() {
            if (listBuffer.length > 0 && listType) {
                processedBlocks.push(`<${listType} class="mw-list">${listBuffer.join('')}</${listType}>`);
                listBuffer = [];
                listType = null;
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                flushListBuffer();
                processedBlocks.push('');
                continue;
            }

            // अनुभाग शीर्षक जाँचें
            const headingMatch = line.match(/^(=+)\s*(.+?)\s*\1$/);
            if (headingMatch) {
                flushListBuffer();
                const level = Math.min(6, Math.max(2, headingMatch[1].length));
                const rawHeadingText = headingMatch[2].trim();
                const cleanHeadingText = rawHeadingText.replace(/'''|''|\[\[|\]\]/g, '');
                const anchorId = `mw-sec-${tocEntries.length + 1}`;
                tocEntries.push({ level, text: cleanHeadingText, id: anchorId });
                const renderedHeading = renderInlineWikitext(rawHeadingText, lang, newlyAddedTargets, highlightNew);
                processedBlocks.push(`
                    <div class="mw-heading mw-heading${level}" id="${anchorId}">
                        <h${level}>${renderedHeading}</h${level}>
                        <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(articleTitle)}&action=edit" target="_blank">संपादित करें</a><span class="mw-editsection-bracket">]</span></span>
                    </div>
                `);
                continue;
            }

            // बुलेट सूची (*)
            if (line.startsWith('*')) {
                if (listType && listType !== 'ul') flushListBuffer();
                listType = 'ul';
                const itemText = line.replace(/^\*+\s*/, '');
                listBuffer.push(`<li>${renderInlineWikitext(itemText, lang, newlyAddedTargets, highlightNew)}</li>`);
                continue;
            }

            // क्रमांकित सूची (#)
            if (line.startsWith('#')) {
                if (listType && listType !== 'ol') flushListBuffer();
                listType = 'ol';
                const itemText = line.replace(/^#+\s*/, '');
                listBuffer.push(`<li>${renderInlineWikitext(itemText, lang, newlyAddedTargets, highlightNew)}</li>`);
                continue;
            }

            // इंडेंटेड / उद्धरण पंक्ति (:)
            if (line.startsWith(':')) {
                flushListBuffer();
                const indentText = line.replace(/^:+\s*/, '');
                processedBlocks.push(`<dl class="mw-indent"><dd>${renderInlineWikitext(indentText, lang, newlyAddedTargets, highlightNew)}</dd></dl>`);
                continue;
            }

            flushListBuffer();
            processedBlocks.push(renderInlineWikitext(line, lang, newlyAddedTargets, highlightNew));
        }
        flushListBuffer();

        // पैराग्राफ संयोजन
        const finalParagraphs = [];
        let paraLines = [];
        let firstHeadingInserted = false;

        // अनुक्रमणी (TOC) HTML
        let tocHtml = '';
        if (tocEntries.length >= 2) {
            let h2Count = 0;
            let h3Count = 0;
            const tocItemsHtml = tocEntries.map(entry => {
                if (entry.level === 2) {
                    h2Count++;
                    h3Count = 0;
                    return `<li class="toclevel-1"><a href="#${entry.id}"><span class="tocnumber">${h2Count}</span> <span class="toctext">${escapeHtml(entry.text)}</span></a></li>`;
                } else {
                    h3Count++;
                    return `<li class="toclevel-2"><a href="#${entry.id}"><span class="tocnumber">${h2Count}.${h3Count}</span> <span class="toctext">${escapeHtml(entry.text)}</span></a></li>`;
                }
            }).join('');

            tocHtml = `
                <div id="toc" class="toc" role="navigation" aria-labelledby="mw-toc-heading">
                    <div class="toctitle">
                        <h2 id="mw-toc-heading">अनुक्रमणी</h2>
                    </div>
                    <ul>${tocItemsHtml}</ul>
                </div>
            `;
        }

        function flushPara() {
            if (paraLines.length > 0) {
                const joined = paraLines.join(' ').trim();
                if (joined) {
                    finalParagraphs.push(`<p>${joined}</p>`);
                }
                paraLines = [];
            }
        }

        for (let i = 0; i < processedBlocks.length; i++) {
            const blk = processedBlocks[i];
            if (!blk) {
                flushPara();
                continue;
            }
            if (
                blk.startsWith('<div class="mw-heading') ||
                blk.startsWith('<ul ') ||
                blk.startsWith('<ol ') ||
                blk.startsWith('<dl ') ||
                blk.startsWith('\x01WIKIFIG_')
            ) {
                flushPara();
                if (blk.startsWith('<div class="mw-heading') && !firstHeadingInserted && tocHtml) {
                    firstHeadingInserted = true;
                    finalParagraphs.push(tocHtml);
                }
                finalParagraphs.push(blk);
            } else {
                paraLines.push(blk);
            }
        }
        flushPara();

        let bodyHtml = finalParagraphs.join('\n');

        // 9. चित्र और संदर्भ टोकन पुनर्स्थापित करें
        figureTokens.forEach(ft => {
            bodyHtml = bodyHtml.split(ft.token).join(ft.html);
        });
        refTokens.forEach(rt => {
            bodyHtml = bodyHtml.split(rt.token).join(rt.html);
        });

        // 10. यदि लेख में संदर्भ हैं और कोई सन्दर्भ अनुभाग नहीं है या है, तो नीचे संदर्भ सूची जोड़ें
        let referencesSectionHtml = '';
        if (references.length > 0) {
            const refItems = references.map((r, idx) => {
                const num = idx + 1;
                const cleanRefHtml = renderInlineWikitext(r.replace(/\{\{[^{}]*\}\}/g, ''), lang, newlyAddedTargets, false);
                return `<li id="cite_note-${num}"><span class="mw-cite-backlink"><a href="#cite_ref-${num}">↑</a></span> <span class="reference-text">${cleanRefHtml || escapeHtml(r)}</span></li>`;
            }).join('');
            referencesSectionHtml = `
                <div class="mw-references-wrap">
                    <div class="mw-heading mw-heading2">
                        <h2>सन्दर्भ</h2>
                    </div>
                    <ol class="references">${refItems}</ol>
                </div>
            `;
        }

        // 11. श्रेणियाँ पट्टी (Wikipedia Category Bar at bottom)
        let categoriesHtml = '';
        if (categories.length > 0) {
            const catLinks = categories.map(c =>
                `<li><a href="https://${lang}.wikipedia.org/wiki/Category:${encodeURIComponent(c)}" target="_blank" title="श्रेणी:${escapeHtml(c)}">${escapeHtml(c)}</a></li>`
            ).join('');
            categoriesHtml = `
                <div id="catlinks" class="catlinks">
                    <div class="mw-normal-catlinks">
                        <a href="https://${lang}.wikipedia.org/wiki/Special:Categories" target="_blank">श्रेणियाँ</a>:
                        <ul>${catLinks}</ul>
                    </div>
                </div>
            `;
        }

        // 12. संपूर्ण विकिपीडिया Vector-2022 लेख शेल तैयार करें
        DOM.articlePreviewContainer.innerHTML = `
            <div class="mw-page-container-inner">
                <header class="mw-body-header">
                    <div class="mw-article-toolbar-tabs">
                        <div class="mw-tabs-left">
                            <span class="mw-tab active">लेख</span>
                            <a href="https://${lang}.wikipedia.org/wiki/Talk:${encodeURIComponent(articleTitle)}" target="_blank" class="mw-tab">संवाद</a>
                        </div>
                        <div class="mw-tabs-right">
                            <span class="mw-tab active">पढ़ें</span>
                            <a href="https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(articleTitle)}&action=edit" target="_blank" class="mw-tab">स्रोत संपादित करें</a>
                            <a href="https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(articleTitle)}&action=history" target="_blank" class="mw-tab">इतिहास देखें</a>
                        </div>
                    </div>
                    <h1 id="firstHeading" class="firstHeading mw-first-heading">${escapeHtml(articleTitle)}</h1>
                    <div id="siteSub" class="noprint">मुक्त ज्ञानकोश विकिपीडिया से</div>
                </header>
                <div id="mw-content-text" class="mw-body-content mw-parser-output">
                    ${infoboxHtml}
                    ${bodyHtml}
                    ${referencesSectionHtml}
                    <div style="clear: both;"></div>
                </div>
                ${categoriesHtml}
            </div>
        `;
    }

    function renderInlineWikitext(text, lang, newlyAddedTargets, highlightNew) {
        if (!text) return '';
        let html = escapeHtml(text);

        // बोल्ड एवं इटैलिक
        html = html.replace(/'''''([^']+)'''''/g, '<strong><em>$1</em></strong>');
        html = html.replace(/'''([^']+)'''/g, '<strong>$1</strong>');
        html = html.replace(/''([^']+)''/g, '<em>$1</em>');

        // आंतरिक कड़ियाँ [[लक्ष्य|प्रदर्शित]] और [[लक्ष्य]] (ट्रेल प्रत्यय जैसे [[भारत]]ीय -> भारतीय सहित)
        html = html.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?\|([^\]]+)\]\](\p{L}+)?/gu, (m, target, display, trail) => {
            const cleanTarget = target.trim();
            const isNew = highlightNew && newlyAddedTargets && newlyAddedTargets.has(cleanTarget.toLowerCase());
            const cls = isNew ? 'mw-wikilink mw-wikilink-added' : 'mw-wikilink';
            const label = display.trim() + (trail || '');
            return `<a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(cleanTarget)}" target="_blank" class="${cls}" title="${cleanTarget}">${label}</a>`;
        });

        html = html.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?\]\](\p{L}+)?/gu, (m, target, trail) => {
            const cleanTarget = target.trim();
            const isNew = highlightNew && newlyAddedTargets && newlyAddedTargets.has(cleanTarget.toLowerCase());
            const cls = isNew ? 'mw-wikilink mw-wikilink-added' : 'mw-wikilink';
            const label = cleanTarget + (trail || '');
            return `<a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(cleanTarget)}" target="_blank" class="${cls}" title="${cleanTarget}">${label}</a>`;
        });

        // बाहरी कड़ियाँ [https://... शीर्षक]
        html = html.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, (m, url, label) => {
            return `<a href="${url}" target="_blank" rel="noopener" class="mw-extlink">${label} ↗</a>`;
        });

        return html;
    }

    function renderWikipediaInfobox(infoboxRaw, fallbackTitle, lang, newlyAddedTargets, highlightNew) {
        try {
            const inner = infoboxRaw.replace(/^\{\{\s*(?:ज्ञानसन्दूक|Infobox|सूचनापेटिका)[^\n|]*/i, '').replace(/\}\}\s*$/, '');
            const lines = inner.split('\n');
            const fields = [];
            let currentKey = '';
            let currentVal = '';

            for (let i = 0; i < lines.length; i++) {
                const ln = lines[i].trim();
                if (ln.startsWith('|')) {
                    if (currentKey && currentVal.trim()) {
                        fields.push({ key: currentKey, val: currentVal.trim() });
                    }
                    const eqIdx = ln.indexOf('=');
                    if (eqIdx > 1) {
                        currentKey = ln.slice(1, eqIdx).trim();
                        currentVal = ln.slice(eqIdx + 1).trim();
                    } else {
                        currentKey = '';
                        currentVal = '';
                    }
                } else if (currentKey) {
                    currentVal += ' ' + ln;
                }
            }
            if (currentKey && currentVal.trim()) {
                fields.push({ key: currentKey, val: currentVal.trim() });
            }

            if (fields.length === 0) return '';

            let boxTitle = fallbackTitle;
            let boxImage = '';
            let boxCaption = '';
            const rowsHtml = [];

            const labelMap = {
                name: 'नाम', title: 'शीर्षक', birth_date: 'जन्म तिथि', birth_place: 'जन्म स्थान',
                death_date: 'मृत्यु तिथि', death_place: 'मृत्यु स्थान', nationality: 'राष्ट्रीयता',
                occupation: 'पेशा / कर्मभूमि', party: 'राजनीतिक दल', spouse: 'जीवनसाथी',
                founder: 'संस्थापक', founded: 'स्थापना', headquarters: 'मुख्यालय',
                leader: 'नेता', president: 'अध्यक्ष', chairperson: 'अध्यक्ष',
                ideology: 'विचारधारा', capital: 'राजधानी', official_languages: 'राजभाषा',
                population: 'जनसंख्या', area: 'क्षेत्रफल', currency: 'मुद्रा', country: 'देश',
                state: 'राज्य', district: 'ज़िला', language: 'भाषा', genre: 'विधा', author: 'लेखक'
            };

            fields.forEach(({ key, val }) => {
                const cleanVal = val.replace(/\{\{[^{}]*\}\}/g, '').replace(/<ref[\s\S]*?<\/ref>/gi, '').replace(/<ref[^>]*\/>/gi, '').trim();
                if (!cleanVal) return;
                const kLower = key.toLowerCase();
                if (kLower === 'name' || kLower === 'title' || kLower === 'नाम' || kLower === 'शीर्षक') {
                    boxTitle = cleanVal.replace(/'''|''|\[\[|\]\]/g, '');
                    return;
                }
                if (kLower === 'image' || kLower === 'चित्र' || kLower === 'छवि' || kLower === 'logo' || kLower === 'प्रतीक') {
                    const cleanedImg = cleanVal.replace(/^\[\[(?:चित्र|फ़ाइल|File|Image):/i, '').replace(/\|.*$/, '').replace(/\]\]$/, '').trim();
                    if (cleanedImg && /\.(jpg|jpeg|png|svg|webp|gif)$/i.test(cleanedImg)) {
                        boxImage = cleanedImg;
                    }
                    return;
                }
                if (kLower === 'caption' || kLower === 'चित्र_शीर्षक' || kLower === 'image_caption') {
                    boxCaption = cleanVal;
                    return;
                }
                if (rowsHtml.length < 14 && !/^(image_size|alt|width|map|coordinates|footnotes|module|signature)/i.test(kLower)) {
                    const displayKey = labelMap[kLower] || key.replace(/_/g, ' ');
                    const renderedVal = renderInlineWikitext(cleanVal, lang, newlyAddedTargets, highlightNew);
                    if (renderedVal) {
                        rowsHtml.push(`
                            <tr>
                                <th scope="row" class="infobox-label">${escapeHtml(displayKey)}</th>
                                <td class="infobox-data">${renderedVal}</td>
                            </tr>
                        `);
                    }
                }
            });

            if (rowsHtml.length === 0 && !boxImage) return '';

            const imgRow = boxImage ? `
                <tr>
                    <td colspan="2" class="infobox-image">
                        <img src="https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(boxImage.replace(/\s+/g, '_'))}?width=240" alt="${escapeHtml(boxTitle)}" loading="lazy" onerror="this.closest('tr').style.display='none'">
                        ${boxCaption ? `<div class="infobox-caption">${renderInlineWikitext(boxCaption, lang, newlyAddedTargets, highlightNew)}</div>` : ''}
                    </td>
                </tr>
            ` : '';

            return `
                <table class="infobox vcard">
                    <tbody>
                        <tr>
                            <th colspan="2" class="infobox-above">${escapeHtml(boxTitle)}</th>
                        </tr>
                        ${imgRow}
                        ${rowsHtml.join('')}
                    </tbody>
                </table>
            `;
        } catch (e) {
            return '';
        }
    }

    async function fetchLiveWikipediaParsedPreview() {
        const wikitext = (state.processedWikitext || state.originalWikitext || '').trim();
        if (!wikitext || !DOM.articlePreviewContainer) {
            showToast('पूर्वावलोकन हेतु पहले कोई लेख लोड करें।');
            return;
        }
        const btn = $('btn-fetch-live-wiki-parse');
        const lang = state.lang || 'hi';
        const title = state.pageTitle || 'विकिपीडिया लेख';

        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ विकिपीडिया सर्वर से लोड हो रहा है...';
        }

        try {
            const params = new URLSearchParams({
                action: 'parse',
                format: 'json',
                origin: '*',
                title: title,
                text: wikitext,
                prop: 'text|categorieshtml',
                pst: '1',
                disableeditsection: '0'
            });
            const resp = await fetch(`https://${lang}.wikipedia.org/w/api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body: params.toString()
            });
            const data = await resp.json();
            const parsedHtml = data?.parse?.text?.['*'];
            if (parsedHtml) {
                const fixedHtml = parsedHtml
                    .replace(/href="\/wiki\//g, ` target="_blank" href="https://${lang}.wikipedia.org/wiki/`)
                    .replace(/href="\/w\//g, ` target="_blank" href="https://${lang}.wikipedia.org/w/`)
                    .replace(/src="\/\//g, 'src="https://');
                DOM.articlePreviewContainer.innerHTML = `
                    <div class="mw-page-container-inner">
                        <header class="mw-body-header">
                            <h1 id="firstHeading" class="firstHeading mw-first-heading">${escapeHtml(title)}</h1>
                            <div id="siteSub" class="noprint">मुक्त ज्ञानकोश विकिपीडिया से (आधिकारिक MediaWiki API रेंडर)</div>
                        </header>
                        <div id="mw-content-text" class="mw-body-content mw-parser-output">
                            ${fixedHtml}
                            <div style="clear: both;"></div>
                        </div>
                    </div>
                `;
                showToast('आधिकारिक विकिपीडिया सर्वर पूर्वावलोकन लोड हो गया!');
            } else {
                generateRenderedPreview(wikitext);
            }
        } catch (err) {
            console.warn('Live wiki parse fallback:', err);
            generateRenderedPreview(wikitext);
            showToast('ऑफ़लाइन/स्थानीय Vector-2022 पूर्वावलोकन रेंडर किया गया');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🔄 लाइव विकिपीडिया सर्वर रेंडर';
            }
        }
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

    // ================== तार्किक शब्द परीक्षक एवं कस्टम ब्लैकलिस्ट ==================
    function openBlacklistModal() {
        renderBlacklistTags();
        const tabTester = $('btn-tab-bl-tester');
        if (tabTester) tabTester.click();
        openModal('blacklist-modal');
    }

    function renderBlacklistTags() {
        if (!DOM.blacklistTagsContainer) return;
        DOM.blacklistTagsContainer.innerHTML = '';
        if (state.customBlacklist.size === 0) {
            DOM.blacklistTagsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">कोई कस्टम शब्द बहिष्कृत नहीं है।</span>';
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
                showToast(`'${word}' बहिष्कार सूची से हटाया गया`);
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
            if (state.suggestions && state.suggestions.length > 0) {
                state.suggestions = state.suggestions.filter(item => item.term.toLowerCase() !== val);
                renderSuggestionsTable();
                recalculateModifiedWikitext();
            }
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

    // ================== तार्किक शब्द योग्यता एवं नीति ऑडिट इंजन ==================
    async function auditWordLinkability(rawWord, lang = state.lang, pageTitle = state.pageTitle) {
        const word = (rawWord || '').trim();
        if (!word) return null;

        const lower = word.toLowerCase();
        const rules = [];
        let isProhibited = false;
        let primaryReason = '';

        // नियम 1: कस्टम बहिष्कार सूची (Custom Blacklist)
        const isBlacklisted = state.customBlacklist && state.customBlacklist.has(lower);
        rules.push({
            ruleId: 'custom-blacklist',
            name: '1. कस्टम बहिष्कार सूची (User Blacklist)',
            passed: !isBlacklisted,
            desc: isBlacklisted ? `'${word}' आपकी व्यक्तिगत बहिष्कार सूची में मौजूद है।` : 'यह शब्द आपकी कस्टम बहिष्कार सूची में नहीं है।'
        });
        if (isBlacklisted) {
            isProhibited = true;
            if (!primaryReason) primaryReason = `यह शब्द आपकी कस्टम बहिष्कार सूची में शामिल है।`;
        }

        // नियम 2: सामान्य दैनिक शब्द (WP:NOTLINKED / WP:COMMONWORDS)
        const isCommon = isNonLinkableWord(word, lang);
        rules.push({
            ruleId: 'common-word',
            name: '2. सामान्य दैनिक शब्द (WP:NOTLINKED)',
            passed: !isCommon,
            desc: isCommon ? `'${word}' 7,479 नीतिगत सामान्य शब्दों (WP:NOTLINKED) में शामिल है। नए शब्दों के लिए इसकी आंतरिक कड़ी नहीं बनाई जाएगी (यद्यपि लेख में पहले से मौजूद होने पर यथावत सुरक्षित रखी जाती है)।` : 'यह कोई सामान्य दैनिक सर्वविदित शब्द नहीं है।'
        });
        if (isCommon) {
            isProhibited = true;
            if (!primaryReason) primaryReason = `WP:NOTLINKED: 7,479 नीतिगत सामान्य शब्दों में शामिल होने के कारण नए शब्दों के लिए इसकी कड़ी नहीं बनाई जाएगी (पहले से उपलब्ध होने पर यथावत सुरक्षित रहेगी)।`;
        }

        // नियम 3: स्व-कड़ीकरण दोष (WP:CIRCULAR / WP:SELFREF)
        const isCircular = pageTitle ? isSelfLink(word, pageTitle) : false;
        rules.push({
            ruleId: 'circular-link',
            name: '3. स्व-कड़ीकरण दोष (WP:CIRCULAR)',
            passed: !isCircular,
            desc: isCircular ? `यह शब्द वर्तमान लेख शीर्षक ('${pageTitle}') से मेल खाता है। लेख अपने ही शीर्षक को लिंक नहीं कर सकता।` : 'यह वर्तमान लेख के शीर्षक से भिन्न है।'
        });
        if (isCircular) {
            isProhibited = true;
            if (!primaryReason) primaryReason = `WP:CIRCULAR: लेख अपने स्वयं के शीर्षक को आंतरिक कड़ी नहीं बना सकता।`;
        }

        // नियम 4: वर्ष व दिनांक छन्नी (WP:DATELINK)
        const isDateWord = DATE_WORDS.has(lower) || /^\d{4}$/.test(word) || /^[०-९]{4}$/.test(word);
        rules.push({
            ruleId: 'date-link',
            name: '4. वर्ष व दिनांक छन्नी (WP:DATELINK)',
            passed: !isDateWord,
            desc: isDateWord ? `'${word}' अकेला वर्ष अथवा सामान्य तिथि है। विकिपीडिया नीति अनुसार अकेले वर्षों को लिंक नहीं किया जाता।` : 'यह कोई अकेला वर्ष अथवा साधारण तिथि नहीं है।'
        });
        if (isDateWord) {
            isProhibited = true;
            if (!primaryReason) primaryReason = `WP:DATELINK: विकिपीडिया नियमानुसार अकेले 4-अंकीय वर्षों या साधारण तिथियों को लिंक नहीं किया जाता।`;
        }

        // नियम 5: माप व मात्रक इकाइयाँ (Units of Measure)
        const isUnit = UNITS_OF_MEASURE.has(lower);
        rules.push({
            ruleId: 'unit-measure',
            name: '5. माप व मात्रक इकाइयाँ (Units)',
            passed: !isUnit,
            desc: isUnit ? `'${word}' एक वैज्ञानिक अथवा दैनिक मापन इकाई है। मात्रकों को आंतरिक कड़ी नहीं बनाया जाता।` : 'यह कोई मापन इकाई नहीं है।'
        });
        if (isUnit) {
            isProhibited = true;
            if (!primaryReason) primaryReason = `माप व मात्रक इकाइयाँ (किमी, किग्रा आदि) विकिपीडिया नीति अनुसार लिंक नहीं की जातीं।`;
        }

        // नियम 6: व्याकरणिक पद व स्टॉपवर्ड्स (Stopwords)
        const stopSet = STOPWORDS[lang] || STOPWORDS.hi;
        const isStop = stopSet.has(lower);
        rules.push({
            ruleId: 'stopword',
            name: '6. व्याकरणिक पद व स्टॉपवर्ड्स',
            passed: !isStop,
            desc: isStop ? `'${word}' सामान्य सहायक क्रिया, सर्वनाम अथवा व्याकरणिक संयोजक पद है।` : 'यह कोई स्टॉपवर्ड नहीं है।'
        });
        if (isStop) {
            isProhibited = true;
            if (!primaryReason) primaryReason = `व्याकरणिक पद (सर्वनाम, सहायक क्रियाएँ) आंतरिक कड़ी के योग्य नहीं होते।`;
        }

        // नियम 7: विकिपीडिया सर्वर स्थिति (Action API)
        let liveWikiStatus = { exists: false, isRedirect: false, isDisambig: false, target: word };
        try {
            const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=pageprops&ppprop=disambiguation&redirects=1&format=json&origin=*`;
            const res = await fetch(endpoint, {
                headers: { 'Api-User-Agent': 'WikiLinkAssistant/2.0' }
            });
            if (res.ok) {
                const data = await res.json();
                const pages = data.query?.pages || {};
                const pageList = Object.values(pages);
                if (pageList.length > 0 && !pageList[0].missing) {
                    const p = pageList[0];
                    const isDis = !!(p.pageprops && 'disambiguation' in p.pageprops) || p.title.includes('(बहुविकल्पी)');
                    const redirects = data.query?.redirects || [];
                    const isRedir = redirects.length > 0;
                    liveWikiStatus = {
                        exists: true,
                        isRedirect: isRedir,
                        isDisambig: isDis,
                        target: p.title
                    };
                }
            }
        } catch (e) {
            console.warn('Live API check failed:', e);
        }

        let wikiRulePassed = liveWikiStatus.exists && !liveWikiStatus.isDisambig;
        let wikiDesc = '';
        if (!liveWikiStatus.exists) {
            wikiDesc = `विकिपीडिया पर '${word}' नाम का कोई प्रमाणित पृष्ठ नहीं मिला (लाल कड़ी)।`;
        } else if (liveWikiStatus.isDisambig) {
            wikiDesc = `विकिपीडिया पर '${liveWikiStatus.target}' एक बहुविकल्पी पृष्ठ (WP:DISAMBIG) है। सीधी कड़ी निषेध है।`;
            isProhibited = true;
            if (!primaryReason) primaryReason = `WP:DISAMBIG: बहुविकल्पी पृष्ठों की सीधी कड़ी नहीं बनाई जाती, विशिष्ट लक्ष्य चुना जाना चाहिए।`;
        } else if (liveWikiStatus.isRedirect) {
            wikiDesc = `विकिपीडिया पर यह प्रमाणित पुनर्निर्देशन (Redirect) है जो मूल पृष्ठ '${liveWikiStatus.target}' पर ले जाता है।`;
        } else {
            wikiDesc = `विकिपीडिया पर '${liveWikiStatus.target}' शीर्षक से प्रमाणित पृष्ठ मौजूद है (नीली कड़ी)।`;
        }

        rules.push({
            ruleId: 'wiki-live',
            name: '7. विकिपीडिया सर्वर स्थिति (Live Action API)',
            passed: wikiRulePassed,
            desc: wikiDesc
        });

        const isLinkable = !isProhibited && liveWikiStatus.exists && !liveWikiStatus.isDisambig;

        return {
            term: word,
            isLinkable: isLinkable,
            isBlacklisted: isBlacklisted,
            primaryReason: primaryReason || (isLinkable ? 'यह पद विकिपीडिया के सभी 7 तार्किक कड़ीकरण मानकों पर खरा उतरता है।' : 'यह पद विकिपीडिया पर मौजूद नहीं है।'),
            rules: rules,
            liveWikiStatus: liveWikiStatus
        };
    }

    async function handleTestWordLinkability() {
        const inputVal = safeGetValue(DOM.wordTesterInput).trim();
        if (!inputVal) {
            alert('कृपया जाँच हेतु कोई शब्द या पद लिखें।');
            return;
        }

        if (DOM.wordTesterBtn) {
            DOM.wordTesterBtn.disabled = true;
            DOM.wordTesterBtn.textContent = 'जाँच हो रही है...';
        }

        try {
            const data = await auditWordLinkability(inputVal, state.lang, state.pageTitle);
            if (!data) return;

            safeSetDisplay(DOM.wordTesterResultWrap, 'block');

            // 1. निर्णय कार्ड रेंडरिंग
            const cardClass = data.isLinkable ? 'verdict-approved' : 'verdict-rejected';
            const badgeClass = data.isLinkable ? 'badge-success' : 'badge-danger';
            const badgeText = data.isLinkable ? '✓ तार्किक आंतरिक कड़ी (स्वीकृत)' : 'कड़ीकरण निषेध (अस्वीकृत)';

            if (DOM.wordTesterVerdictCard) {
                DOM.wordTesterVerdictCard.className = `verdict-card ${cardClass}`;
                DOM.wordTesterVerdictCard.innerHTML = `
                    <div class="verdict-header">
                        <span class="verdict-term">[[${escapeHtml(data.term)}]]</span>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="verdict-desc">${escapeHtml(data.primaryReason)}</div>
                    <div class="verdict-actions">
                        <button type="button" class="btn btn-sm ${data.isBlacklisted ? 'btn-outline text-danger' : 'btn-secondary'}" id="btn-toggle-word-blacklist">
                            ${data.isBlacklisted ? 'बहिष्कार सूची से निकालें' : 'कस्टम बहिष्कार सूची में जोड़ें'}
                        </button>
                        ${data.liveWikiStatus.exists ? `
                            <a href="https://${state.lang}.wikipedia.org/wiki/${encodeURIComponent(data.liveWikiStatus.target)}" target="_blank" class="btn btn-outline btn-sm">
                                विकिपीडिया पर लेख देखें
                            </a>
                        ` : ''}
                    </div>
                `;

                const toggleBlBtn = $('btn-toggle-word-blacklist');
                if (toggleBlBtn) {
                    toggleBlBtn.addEventListener('click', () => {
                        const termLower = data.term.toLowerCase();
                        if (state.customBlacklist.has(termLower)) {
                            state.customBlacklist.delete(termLower);
                            saveBlacklist();
                            renderBlacklistTags();
                            showToast(`'${data.term}' बहिष्कार सूची से हटाया गया`);
                        } else {
                            state.customBlacklist.add(termLower);
                            saveBlacklist();
                            renderBlacklistTags();
                            if (state.suggestions && state.suggestions.length > 0) {
                                state.suggestions = state.suggestions.filter(item => item.term.toLowerCase() !== termLower);
                                renderSuggestionsTable();
                                recalculateModifiedWikitext();
                            }
                            showToast(`'${data.term}' बहिष्कार सूची में जोड़ा गया`);
                        }
                        handleTestWordLinkability();
                    });
                }
            }

            // 2. 7-नियम ऑडिट सूची रेंडरिंग
            if (DOM.wordTesterRulesGrid) {
                DOM.wordTesterRulesGrid.innerHTML = data.rules.map(r => `
                    <div class="rule-audit-item">
                        <div class="rule-audit-meta">
                            <div class="rule-audit-title">${escapeHtml(r.name)}</div>
                            <div class="rule-audit-desc">${escapeHtml(r.desc)}</div>
                        </div>
                        <span class="badge ${r.passed ? 'badge-success' : 'badge-danger'}" style="font-size: 0.76rem;">
                            ${r.passed ? '✓ मान्य' : 'अस्वीकृत'}
                        </span>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('Word test error:', err);
            alert(`जाँच में त्रुटि: ${err.message}`);
        } finally {
            if (DOM.wordTesterBtn) {
                DOM.wordTesterBtn.disabled = false;
                DOM.wordTesterBtn.textContent = 'तार्किक नियम जाँचें';
            }
        }
    }

    function renderPolicyWords(filterQuery = '') {
        if (!DOM.policyChipsContainer) return;

        const langSet = NEVER_LINK_WORDS[state.lang] || NEVER_LINK_WORDS.hi;
        const wordsArray = Array.from(langSet);
        const q = (filterQuery || '').trim().toLowerCase();

        const filtered = q ? wordsArray.filter(w => w.toLowerCase().includes(q)) : wordsArray;

        const totalFormatted = wordsArray.length.toLocaleString('hi-IN');
        const filteredFormatted = filtered.length.toLocaleString('hi-IN');

        if (q) {
            safeSetText(DOM.policyWordsCount, `खोज परिणाम: ${filteredFormatted} शब्द (कुल ${totalFormatted} सुरक्षित शब्दों में से)`);
        } else {
            safeSetText(DOM.policyWordsCount, `कुल ${totalFormatted} सामान्य शब्द सुरक्षित (WP:NOTLINKED)`);
        }

        if (filtered.length === 0) {
            DOM.policyChipsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.82rem; padding: 10px;">कोई मिलान नहीं मिला।</span>';
            return;
        }

        // ब्राउज़र गति बनाए रखने के लिए अधिकतम 250 चिप्स प्रदर्शित करें
        const maxDisplay = 250;
        const displayList = filtered.slice(0, maxDisplay);

        let html = displayList.map(w => `
            <span class="policy-chip" title="क्लिक कर नियम जाँचें" style="cursor: pointer;" data-word="${escapeHtml(w)}">
                ${escapeHtml(w)}
            </span>
        `).join('');

        if (filtered.length > maxDisplay) {
            html += `
                <div style="width: 100%; text-align: center; color: var(--text-muted); font-size: 0.82rem; margin-top: 12px; padding: 8px; border-top: 1px dashed var(--border-color);">
                    प्रारंभिक ${maxDisplay} शब्द प्रदर्शित (कुल ${filteredFormatted} में से)। अन्य शब्द देखने के लिए ऊपर खोज बॉक्स में टाइप करें...
                </div>
            `;
        }

        DOM.policyChipsContainer.innerHTML = html;

        // एकल इवेंट डेलिगेशन द्वारा तेज़ क्लिक हैंडलिंग
        if (!DOM.policyChipsContainer._delegatedClick) {
            DOM.policyChipsContainer.addEventListener('click', (e) => {
                const chip = e.target.closest('.policy-chip');
                if (!chip) return;
                const w = chip.dataset.word;
                const tabTester = $('btn-tab-bl-tester');
                if (tabTester) tabTester.click();
                safeSetValue(DOM.wordTesterInput, w);
                handleTestWordLinkability();
            });
            DOM.policyChipsContainer._delegatedClick = true;
        }
    }

    // ================== ऑफ़लाइन ऑल-इन-वन HTML ==================
    async function generateStandaloneHtml() {
        showToast('ऑफ़लाइन फ़ाइल तैयार हो रही है...');
        try {
            const cssRes = await fetch('style.css');
            const cssText = await cssRes.text();

            let blacklistText = '';
            try {
                const blRes = await fetch('words_blacklist.js');
                blacklistText = await blRes.text();
            } catch (e) {
                console.warn('words_blacklist.js fetch error for offline bundle', e);
            }

            const jsRes = await fetch('app.js');
            const jsText = await jsRes.text();

            const htmlRes = await fetch('index.html');
            let htmlText = await htmlRes.text();

            htmlText = htmlText.replace('<link rel="stylesheet" href="style.css">', `<style>\n${cssText}\n</style>`);
            if (blacklistText) {
                htmlText = htmlText.replace('<script src="words_blacklist.js"></script>', `<script>\n${blacklistText}\n</script>`);
            }
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
        logUserActivity('विकिटेक्स्ट कॉपी', {
            title: state.pageTitle || 'अशीर्षक लेख',
            lang: state.lang,
            wikitext: text,
            newLinks: state.suggestions ? state.suggestions.filter(s => s.checked).length : 0,
            contaminationsFixed: 0,
            note: 'संशोधित विकिटेक्स्ट क्लिपबोर्ड पर कॉपी'
        });
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

        const modifiedText = safeGetValue(DOM.finalWikitextOutput) || state.processedWikitext || state.originalWikitext;
        if (!modifiedText) {
            alert('संशोधित विकिटेक्स्ट उपलब्ध नहीं है। कृपया पहले लेख का विश्लेषण करें।');
            return;
        }

        // 1. संशोधित विकिटेक्स्ट क्लिपबोर्ड पर भी कॉपी करें (अतिरिक्त सुरक्षा व बैकअप)
        copyModifiedWikitext();

        // 2. विकिपीडिया POST फॉर्म सबमिट करें ताकि विकिपीडिया पर पुराना लेख न दिखकर नया सुधारा गया लेख व डिफ़ सीधे खुले
        try {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `https://${state.lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=submit`;
            form.target = '_blank';

            // नया सुधारा गया लेख विकिटेक्स्ट
            const textarea = document.createElement('textarea');
            textarea.name = 'wpTextbox1';
            textarea.value = modifiedText;
            textarea.style.display = 'none';
            form.appendChild(textarea);

            // डिफ़/अंतर सक्रिय करना ताकि विकिपीडिया पर भी किए गए सुधार सीधे दिखें
            const diffInput = document.createElement('input');
            diffInput.type = 'hidden';
            diffInput.name = 'wpDiff';
            diffInput.value = 'अंतर दिखाएँ';
            form.appendChild(diffInput);

            // संपादन सारांश (Edit Summary)
            const summaryInput = document.createElement('input');
            summaryInput.type = 'hidden';
            summaryInput.name = 'wpSummary';
            summaryInput.value = 'तार्किक आंतरिक कड़ियाँ जोड़ी गईं (विकिपीडिया दिशानिर्देश अनुसार)';
            form.appendChild(summaryInput);

            document.body.appendChild(form);
            form.submit();
            setTimeout(() => {
                if (form.parentNode) form.parentNode.removeChild(form);
            }, 1000);

            showToast('नया सुधारा गया लेख विकिपीडिया पर लोड किया जा रहा है...');
        } catch (e) {
            console.error('Form submission failed, fallback to direct url:', e);
            const editUrl = `https://${state.lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=edit`;
            window.open(editUrl, '_blank');
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
        logUserActivity('फ़ाइल डाउनलोड (.wiki)', {
            title: state.pageTitle || 'wikipedia_article',
            lang: state.lang,
            wikitext: text,
            newLinks: state.suggestions ? state.suggestions.filter(s => s.checked).length : 0,
            contaminationsFixed: 0,
            note: filename
        });
        showToast(`'${filename}' डाउनलोड हुआ`);
    }

    function resetTool() {
        if (confirm('क्या आप नया विश्लेषण आरंभ करना चाहते हैं? वर्तमान परिणाम रीसेट हो जाएँगे।')) {
            safeSetDisplay(DOM.resultsCard, 'none');
            safeSetDisplay(DOM.compactActiveBar, 'none');
            safeSetValue(DOM.pageInput, '');
            safeSetValue(DOM.rawWikitextInput, '');
            setWorkflowStep(1);

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

    // ==========================================================================
    // अध्याय 10: सरलीकृत 1-टच एनीमे (ANIME) स्किन एवं रंग स्टूडियो + कैनवास इंजन
    // ==========================================================================
    const SKIN_ORDER = [
        'wikimedia-classic',
        'anime-sakura',
        'anime-mecha',
        'anime-shinkai',
        'anime-forest',
        'anime-royal'
    ];

    const SKIN_LABELS = {
        'wikimedia-classic': 'विकिमीडिया क्लासिक (Light)',
        'sakura-day': 'साकुरा पेस्टल (Soft Light)',
        'anime-spirit': 'इंडिगो नाइट (Indigo Dark)',
        'cyber-shonen': 'मिडनाइट डार्क (Midnight)',
        'anime-sakura': 'साकुरा पेस्टल (Sakura)',
        'anime-mecha': 'साइबर इंडिगो (Indigo)',
        'anime-shinkai': 'शिनकाई स्काई (Sky)',
        'anime-forest': 'एमराल्ड फ़ॉरेस्ट (Forest)',
        'anime-royal': 'रॉयल वायलेट (Royal)'
    };

    const SKIN_PARTICLE_COLORS = {
        'wikimedia-classic': ['#3366cc', '#93c5fd', '#14866d', '#cbd5e1'],
        'sakura-day': ['#f472b6', '#fbcfe8', '#ec4899', '#fda4af'],
        'anime-spirit': ['#6366f1', '#38bdf8', '#a855f7', '#22d3ee'],
        'cyber-shonen': ['#38bdf8', '#22d3ee', '#818cf8', '#f43f5e'],
        'anime-sakura': ['#f472b6', '#fbcfe8', '#ec4899', '#fda4af'],
        'anime-mecha': ['#6366f1', '#38bdf8', '#a855f7', '#22d3ee'],
        'anime-shinkai': ['#38bdf8', '#bae6fd', '#818cf8', '#f43f5e'],
        'anime-forest': ['#34d399', '#a7f3d0', '#fbbf24', '#10b981'],
        'anime-royal': ['#a78bfa', '#f472b6', '#fbbf24', '#c084fc']
    };

    const CARD_STYLES = ['flat', 'glass', 'cel', 'minimal'];
    const CARD_STYLE_NAMES = {
        flat: 'समतल (Flat)',
        glass: 'ग्लास (Glass)',
        cel: 'उभरा (Elevated)',
        minimal: 'सूक्ष्म (Minimal)'
    };

    let animeParticlesEnabled = true;
    let currentSkinId = 'wikimedia-classic';
    let customOneTouchHex = null;

    function initAnimeSkinAndStudio() {
        const savedSkin = localStorage.getItem('wikilink_user_skin_v4') || 'wikimedia-classic';
        const savedCardStyle = localStorage.getItem('wikilink_card_style_v3') || 'flat';
        const savedOneTouch = JSON.parse(localStorage.getItem('wikilink_onetouch_palette_v3') || 'null');

        applySkinPreset(savedSkin, false);
        document.body.setAttribute('data-card-style', savedCardStyle);

        // हेडर डिफ़ॉल्ट थीम ड्रॉपडाउन (#header-skin-select) सिंक करें
        const headerSkinSelect = $('header-skin-select');
        if (headerSkinSelect) {
            headerSkinSelect.value = savedSkin;
            headerSkinSelect.addEventListener('change', (e) => {
                const chosenSkin = e.target.value || 'wikimedia-classic';
                clearCustomColorOverrides();
                applySkinPreset(chosenSkin, true);
            });
        }

        const cycleStyleBtn = $('card-style-cycle-btn');
        if (cycleStyleBtn) {
            cycleStyleBtn.textContent = CARD_STYLE_NAMES[savedCardStyle] || 'समतल (Flat)';
            cycleStyleBtn.addEventListener('click', () => {
                const cur = document.body.getAttribute('data-card-style') || 'flat';
                const nextIdx = (CARD_STYLES.indexOf(cur) + 1) % CARD_STYLES.length;
                const nextStyle = CARD_STYLES[nextIdx];
                document.body.setAttribute('data-card-style', nextStyle);
                localStorage.setItem('wikilink_card_style_v3', nextStyle);
                cycleStyleBtn.textContent = CARD_STYLE_NAMES[nextStyle];
                showToast(`कार्ड बॉर्डर शैली: ${CARD_STYLE_NAMES[nextStyle]}`);
            });
        }

        // 1. 1-टच रंग गोले एवं 8 एक्सेंट पैलेट स्वॉच
        const PALETTE_PRESET_MAP = {
            'default': null,
            'wiki-blue': { id: 'wiki-blue', color: '#2a4b8d', accent: '#3b82f6', bg: '#f8fafc', label: 'रॉयल ब्लू' },
            'sakura-pink': { id: 'sakura-pink', color: '#db2777', accent: '#f472b6', bg: '#fff5f9', label: 'साकुरा पिंक' },
            'emerald-mint': { id: 'emerald-mint', color: '#059669', accent: '#34d399', bg: '#f2fbf7', label: 'एमराल्ड ग्रीन' },
            'amethyst-violet': { id: 'amethyst-violet', color: '#7c3aed', accent: '#a78bfa', bg: '#f8f5ff', label: 'वायलेट' },
            'sunset-amber': { id: 'sunset-amber', color: '#d97706', accent: '#fbbf24', bg: '#fffbeb', label: 'अंबर गोल्ड' },
            'ocean-cyan': { id: 'ocean-cyan', color: '#0284c7', accent: '#22d3ee', bg: '#f0f9ff', label: 'ओशन सियान' },
            'crimson-coral': { id: 'crimson-coral', color: '#e11d48', accent: '#fb7185', bg: '#fff1f2', label: 'क्रिमसन' }
        };

        if (savedOneTouch && savedOneTouch.color) {
            applyOneTouchColorPalette(savedOneTouch.color, savedOneTouch.accent, savedOneTouch.bg, false);
            const badgeEl = $('active-palette-name-badge');
            if (badgeEl && savedOneTouch.label) {
                badgeEl.textContent = savedOneTouch.label;
            }
            document.querySelectorAll('.palette-swatch-btn[data-palette-id]').forEach(b => {
                const matchId = savedOneTouch.id || Object.keys(PALETTE_PRESET_MAP).find(k => PALETTE_PRESET_MAP[k]?.color === savedOneTouch.color);
                b.classList.toggle('active', b.dataset.paletteId === (matchId || 'default'));
            });
        }

        document.querySelectorAll('.color-bubble[data-onetouch-color]').forEach(bubble => {
            bubble.addEventListener('click', () => {
                const color = bubble.dataset.onetouchColor;
                const accent = bubble.dataset.onetouchAccent || color;
                const bg = bubble.dataset.onetouchBg || '#fff9fc';

                document.querySelectorAll('.color-bubble').forEach(b => b.classList.remove('active'));
                bubble.classList.add('active');

                applyOneTouchColorPalette(color, accent, bg, true);
                localStorage.setItem('wikilink_onetouch_palette_v3', JSON.stringify({ color, accent, bg }));
                localStorage.setItem('wikilink_onetouch_color_v3', color);
            });
        });

        document.querySelectorAll('.palette-swatch-btn[data-palette-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const pId = btn.dataset.paletteId;
                document.querySelectorAll('.palette-swatch-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const badgeEl = $('active-palette-name-badge');
                if (pId === 'default' || !PALETTE_PRESET_MAP[pId]) {
                    clearCustomColorOverrides();
                    if (badgeEl) badgeEl.textContent = 'डिफ़ॉल्ट थीम रंग';
                    showToast('डिफ़ॉल्ट थीम रंग लागू किया गया');
                    return;
                }
                const info = PALETTE_PRESET_MAP[pId];
                if (badgeEl) badgeEl.textContent = info.label;
                applyOneTouchColorPalette(info.color, info.accent, info.bg, true);
                localStorage.setItem('wikilink_onetouch_palette_v3', JSON.stringify(info));
                localStorage.setItem('wikilink_onetouch_color_v3', info.color);
            });
        });

        const btnResetColorPalette = $('btn-reset-color-palette');
        if (btnResetColorPalette) {
            btnResetColorPalette.addEventListener('click', () => {
                clearCustomColorOverrides();
                document.body.setAttribute('data-card-style', 'flat');
                localStorage.setItem('wikilink_card_style_v3', 'flat');
                document.querySelectorAll('.card-style-chip[data-card-style-opt]').forEach(c => {
                    c.classList.toggle('active', c.dataset.cardStyleOpt === 'flat');
                });
                document.querySelectorAll('.palette-swatch-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.paletteId === 'default');
                });
                const badgeEl = $('active-palette-name-badge');
                if (badgeEl) badgeEl.textContent = 'डिफ़ॉल्ट थीम रंग';
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('wikilink_theme', 'light');
                const themeIcon = $('theme-toggle-icon');
                const themeLbl = $('theme-toggle-label');
                if (themeIcon) themeIcon.textContent = '🌙';
                if (themeLbl) themeLbl.textContent = 'डार्क मोड';
                applySkinPreset('wikimedia-classic', true);
                showToast('डिफ़ॉल्ट रंग व थीम रीसेट की गई');
            });
        }

        document.querySelectorAll('.card-style-chip[data-card-style-opt]').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.cardStyleOpt === savedCardStyle);
            chip.addEventListener('click', () => {
                const st = chip.dataset.cardStyleOpt || 'flat';
                document.body.setAttribute('data-card-style', st);
                localStorage.setItem('wikilink_card_style_v3', st);
                document.querySelectorAll('.card-style-chip[data-card-style-opt]').forEach(c => {
                    c.classList.toggle('active', c.dataset.cardStyleOpt === st);
                });
                showToast(`कार्ड बॉर्डर शैली बदली गई: ${CARD_STYLE_NAMES[st] || st}`);
            });
        });

        // 2. रेडीमेड थीम प्रीसेट ([data-skin-id] व [data-skin-preset] दोनों)
        document.querySelectorAll('[data-skin-id], [data-skin-preset]').forEach(btn => {
            const presetVal = btn.dataset.skinId || btn.dataset.skinPreset;
            btn.classList.toggle('active', presetVal === savedSkin);
            btn.addEventListener('click', () => {
                const skinId = btn.dataset.skinId || btn.dataset.skinPreset;
                document.querySelectorAll('[data-skin-id], [data-skin-preset]').forEach(b => {
                    const bVal = b.dataset.skinId || b.dataset.skinPreset;
                    b.classList.toggle('active', bVal === skinId);
                });
                const themeIcon = $('theme-toggle-icon');
                const themeLbl = $('theme-toggle-label');
                if (skinId === 'anime-spirit' || skinId === 'cyber-shonen') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    localStorage.setItem('wikilink_theme', 'dark');
                    localStorage.setItem('wikilink_user_theme_v3', 'dark');
                    if (themeIcon) themeIcon.textContent = '☀️';
                    if (themeLbl) themeLbl.textContent = 'लाइट मोड';
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                    localStorage.setItem('wikilink_theme', 'light');
                    localStorage.setItem('wikilink_user_theme_v3', 'light');
                    if (themeIcon) themeIcon.textContent = '🌙';
                    if (themeLbl) themeLbl.textContent = 'डार्क मोड';
                }
                clearCustomColorOverrides();
                applySkinPreset(skinId, true);
            });
        });

        // 3. हेडर व बैनर के स्किन बटन
        const studioBtn = $('skin-studio-toggle-btn');
        const bannerSkinBtn = $('banner-skin-btn');
        const studioPanel = $('skin-studio-panel');
        const closeStudioBtn = $('close-skin-studio-btn');
        const resetSkinBtn = $('reset-skin-btn');
        const mascotWrap = document.querySelector('.logo-area svg');

        if (studioBtn && studioPanel) {
            studioBtn.addEventListener('click', () => {
                const isHidden = studioPanel.style.display === 'none';
                studioPanel.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    studioPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }

        if (bannerSkinBtn) {
            bannerSkinBtn.addEventListener('click', () => {
                if (studioPanel) {
                    studioPanel.style.display = 'block';
                }
                clearCustomColorOverrides();
                const curIdx = SKIN_ORDER.indexOf(currentSkinId);
                const nextSkin = SKIN_ORDER[(curIdx + 1) % SKIN_ORDER.length];
                applySkinPreset(nextSkin, true);
                if (studioPanel) {
                    studioPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }

        if (mascotWrap && studioPanel) {
            mascotWrap.style.cursor = 'pointer';
            mascotWrap.addEventListener('click', () => {
                studioPanel.style.display = 'block';
                showToast('🎨 किसी भी रंग पर क्लिक करें!');
            });
        }

        if (closeStudioBtn && studioPanel) {
            closeStudioBtn.addEventListener('click', () => {
                studioPanel.style.display = 'none';
            });
        }

        if (resetSkinBtn) {
            resetSkinBtn.addEventListener('click', () => {
                clearCustomColorOverrides();
                document.body.setAttribute('data-card-style', 'flat');
                localStorage.setItem('wikilink_card_style_v3', 'flat');
                if (cycleStyleBtn) cycleStyleBtn.textContent = CARD_STYLE_NAMES.flat;
                applySkinPreset('wikimedia-classic', true);
            });
        }

        startAnimeParticleCanvas();
    }

    function applyOneTouchColorPalette(primary, accent, bg, notify = true) {
        customOneTouchHex = primary;
        const rootStyle = document.body.style;
        rootStyle.setProperty('--primary-color', primary);
        rootStyle.setProperty('--primary-hover', primary);
        rootStyle.setProperty('--border-focus', primary);
        rootStyle.setProperty('--accent-blue', accent || primary);
        rootStyle.setProperty('--border-color', `color-mix(in srgb, ${primary} 38%, #ffffff)`);
        rootStyle.setProperty('--primary-light', `color-mix(in srgb, ${primary} 12%, #ffffff)`);
        rootStyle.setProperty('--anime-cel-shadow', `0 8px 24px color-mix(in srgb, ${primary} 20%, transparent)`);
        rootStyle.setProperty('--anime-cel-shadow-hover', `0 12px 30px color-mix(in srgb, ${primary} 30%, transparent)`);

        if (bg && document.documentElement.getAttribute('data-theme') !== 'dark') {
            rootStyle.setProperty('--bg-main', bg);
        }

        const skinBadge = $('active-skin-badge');
        if (skinBadge) {
            skinBadge.textContent = `रंग: ${primary.toUpperCase()}`;
        }

        if (notify) {
            showToast(`✨ नया रंग लागू हुआ: ${primary}`);
        }
    }

    function applySkinPreset(skinId, notify = false) {
        currentSkinId = skinId;
        document.body.setAttribute('data-skin', skinId);
        localStorage.setItem('wikilink_skin_v3', skinId);
        if (notify) {
            localStorage.setItem('wikilink_user_skin_v4', skinId);
        }

        document.querySelectorAll('[data-skin-id], [data-skin-preset]').forEach(btn => {
            const bVal = btn.dataset.skinId || btn.dataset.skinPreset;
            btn.classList.toggle('active', bVal === skinId);
        });

        const headerSkinSelect = $('header-skin-select');
        if (headerSkinSelect && headerSkinSelect.value !== skinId) {
            headerSkinSelect.value = skinId;
        }

        const skinBadge = $('active-skin-badge');
        if (skinBadge) {
            skinBadge.textContent = SKIN_LABELS[skinId] || 'विकिमीडिया क्लासिक (Light)';
        }

        if (notify) {
            if (window.WikiFirebase && window.WikiFirebase.updateUserSkinInFirestore) {
                window.WikiFirebase.updateUserSkinInFirestore(skinId).catch(() => {});
            }
            showToast(`🎨 थीम लागू हुई: ${SKIN_LABELS[skinId] || skinId}`);
        }
    }

    function clearCustomColorOverrides() {
        customOneTouchHex = null;
        localStorage.removeItem('wikilink_onetouch_palette_v3');
        localStorage.removeItem('wikilink_onetouch_color_v3');
        const rootStyle = document.body.style;
        [
            '--primary-color',
            '--primary-hover',
            '--border-focus',
            '--accent-blue',
            '--border-color',
            '--primary-light',
            '--anime-cel-shadow',
            '--anime-cel-shadow-hover',
            '--bg-main'
        ].forEach(prop => rootStyle.removeProperty(prop));

        document.querySelectorAll('.color-bubble').forEach(b => b.classList.remove('active'));
    }

    function startAnimeParticleCanvas() {
        // मोबाइल PageSpeed Insights (LCP / TBT / CPU Idle) अनुकूलन:
        // मोबाइल उपकरणों (<= 768px) या reduced-motion पर भारी कैनवास लूप न चलाएँ
        if (window.innerWidth <= 768) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const canvas = $('anime-bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const pointer = { x: -9999, y: -9999, active: false };
        const ripples = [];
        let animFramesRemaining = 0;
        let rafId = null;

        function scheduleBurst(frames = 45) {
            animFramesRemaining = Math.max(animFramesRemaining, frames);
            if (!rafId && !document.hidden) {
                rafId = requestAnimationFrame(renderFrame);
            }
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            scheduleBurst(2);
        }, { passive: true });

        function updatePointer(x, y) {
            pointer.x = x;
            pointer.y = y;
            pointer.active = true;
            if (ripples.length < 12 && Math.random() < 0.3) {
                ripples.push({
                    x,
                    y,
                    r: 2,
                    maxR: 18 + Math.random() * 18,
                    alpha: 0.5
                });
            }
            scheduleBurst(30);
        }

        window.addEventListener('mousemove', (e) => updatePointer(e.clientX, e.clientY), { passive: true });

        // 1. तार्किक विकिलिंक ज्ञान-जाल नोड्स (Logical Wikilink Constellation Nodes)
        const WIKI_LABELS = ['[[कड़ी]]', '[[लेख]]', '[[WP:LINK]]', '[[ज्ञान]]', '[[संदर्भ]]', '[[इतिहास]]', '[[विज्ञान]]', '[[साहित्य]]', '[[संस्कृति]]', '[[डिफ़]]'];
        const NODE_COUNT = 10;
        const wikiNodes = Array.from({ length: NODE_COUNT }, (_, idx) => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.45,
            vy: (Math.random() - 0.5) * 0.45,
            r: 3.2,
            label: WIKI_LABELS[idx % WIKI_LABELS.length]
        }));

        // 2. एनीमे साकुरा पंखुड़ियाँ व चमकते तारे
        const PARTICLE_COUNT = 18;
        const particles = Array.from({ length: PARTICLE_COUNT }, (_, idx) => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 4 + Math.random() * 5,
            speedY: 0.32 + Math.random() * 0.6,
            speedX: -0.3 + Math.random() * 0.6,
            angle: Math.random() * Math.PI * 2,
            spin: -0.02 + Math.random() * 0.04,
            colorIndex: idx % 4,
            isStar: idx % 3 === 0,
            alpha: 0.25 + Math.random() * 0.35
        }));

        function drawStar(cx, cy, radius, color, alpha) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                ctx.lineTo(Math.cos((i * Math.PI) / 2) * radius, Math.sin((i * Math.PI) / 2) * radius);
                ctx.lineTo(
                    Math.cos(((i + 0.5) * Math.PI) / 2) * (radius * 0.32),
                    Math.sin(((i + 0.5) * Math.PI) / 2) * (radius * 0.32)
                );
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        function renderFrame() {
            rafId = null;
            if (!animeParticlesEnabled || document.hidden) return;

            ctx.clearRect(0, 0, width, height);
            const palette = customOneTouchHex
                ? [customOneTouchHex, '#f472b6', '#818cf8', '#38bdf8']
                : (SKIN_PARTICLE_COLORS[currentSkinId] || SKIN_PARTICLE_COLORS['anime-sakura']);
            const primaryTone = palette[0] || '#ec4899';

            for (let i = 0; i < wikiNodes.length; i++) {
                const n = wikiNodes[i];
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 10 || n.x > width - 10) n.vx *= -1;
                if (n.y < 10 || n.y > height - 10) n.vy *= -1;

                for (let j = i + 1; j < wikiNodes.length; j++) {
                    const m = wikiNodes[j];
                    const dist = Math.hypot(n.x - m.x, n.y - m.y);
                    if (dist < 190) {
                        ctx.save();
                        ctx.strokeStyle = primaryTone;
                        ctx.globalAlpha = (1 - dist / 190) * 0.14;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(m.x, m.y);
                        ctx.stroke();
                        ctx.restore();
                    }
                }

                if (pointer.active) {
                    const pd = Math.hypot(n.x - pointer.x, n.y - pointer.y);
                    if (pd < 180) {
                        ctx.save();
                        ctx.strokeStyle = palette[1] || primaryTone;
                        ctx.globalAlpha = (1 - pd / 180) * 0.24;
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(pointer.x, pointer.y);
                        ctx.stroke();
                        ctx.restore();
                    }
                }

                ctx.save();
                ctx.fillStyle = primaryTone;
                ctx.globalAlpha = 0.24;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = '600 10px "JetBrains Mono", monospace';
                ctx.fillText(n.label, n.x + 6, n.y + 3);
                ctx.restore();
            }

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.y += p.speedY;
                p.x += p.speedX + Math.sin(p.angle) * 0.3;
                p.angle += p.spin;

                if (p.y > height + 20) {
                    p.y = -15;
                    p.x = Math.random() * width;
                }
                if (p.x > width + 20) p.x = -15;
                if (p.x < -20) p.x = width + 15;

                const color = palette[p.colorIndex % palette.length];
                if (p.isStar) {
                    drawStar(p.x, p.y, p.size * 1.15, color, p.alpha);
                } else {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.angle);
                    ctx.globalAlpha = p.alpha;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(0, -p.size);
                    ctx.quadraticCurveTo(p.size * 0.85, -p.size * 0.3, 0, p.size);
                    ctx.quadraticCurveTo(-p.size * 0.85, -p.size * 0.3, 0, -p.size);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }

            for (let i = ripples.length - 1; i >= 0; i--) {
                const rp = ripples[i];
                rp.r += 0.8;
                rp.alpha -= 0.025;
                if (rp.alpha <= 0) {
                    ripples.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.strokeStyle = primaryTone;
                ctx.globalAlpha = rp.alpha;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            if (animFramesRemaining > 0) {
                animFramesRemaining--;
                rafId = requestAnimationFrame(renderFrame);
            }
        }

        // प्रारंभिक लोड पर केवल 1 स्थिर फ्रेम रेंडर करें ताकि CPU तुरंत Idle हो सके
        setTimeout(() => scheduleBurst(1), 300);
    }

    // ==========================================================================
    // अध्याय 11: पृथक पृष्ठ नेविगेशन, मोबाइल टॉगल मेन्यू, लॉगिन एवं यूज़र गतिविधि लॉग
    // ==========================================================================
    let currentUser = null;
    let userActivityLogs = [];
    let authMode = 'login';
    let isPasswordRevealed = false;

    function initMobileHeaderToggleMenu() {
        const mobileToggleBtn = $('mobile-menu-toggle-btn');
        const headerNav = $('header-nav-actions');
        const mobileMenuIcon = $('mobile-menu-icon');
        if (!mobileToggleBtn || !headerNav) return;

        mobileToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = headerNav.classList.toggle('mobile-menu-open');
            mobileToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (mobileMenuIcon) {
                mobileMenuIcon.textContent = isOpen ? '✕' : '☰';
            }
        });

        // मोबाइल मेन्यू के भीतर किसी विकल्प पर क्लिक होने पर मेन्यू बंद करें
        headerNav.querySelectorAll('a, button').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    headerNav.classList.remove('mobile-menu-open');
                    mobileToggleBtn.setAttribute('aria-expanded', 'false');
                    if (mobileMenuIcon) mobileMenuIcon.textContent = '☰';
                }
            });
        });

        // बाहर क्लिक करने पर मोबाइल मेन्यू बंद करें
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && headerNav.classList.contains('mobile-menu-open')) {
                if (!headerNav.contains(e.target) && !mobileToggleBtn.contains(e.target)) {
                    headerNav.classList.remove('mobile-menu-open');
                    mobileToggleBtn.setAttribute('aria-expanded', 'false');
                    if (mobileMenuIcon) mobileMenuIcon.textContent = '☰';
                }
            }
        });
    }

    // ================== उपयोगकर्ता प्रोफ़ाइल व पुराने लॉग्स का स्थायी संरक्षण (Persistent User Archive) ==================
    const PROFILE_ICON_OPTIONS = {
        '📚': 'ज्ञानकोश विद्वान',
        '🪶': 'संपादक कलम',
        '🌐': 'विकि ग्लोब',
        '🏛️': 'साहित्य स्तंभ',
        '🚀': 'नवप्रवर्तक'
    };

    function getEmailArchiveKey(email) {
        return String(email || 'guest')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9@._\-]/g, '_');
    }

    function getUserProfilesArchiveMap() {
        try {
            const raw = localStorage.getItem('wikilink_user_profiles_archive_v1');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    // प्रत्येक यूज़र को सख्ती से केवल उसी के खाते के लॉग दिखाने के लिए फ़िल्टर (Strict Per-User Log Isolation)
    function filterLogsStrictlyForUser(logsArray, userObj = currentUser) {
        if (!Array.isArray(logsArray)) return [];
        if (!userObj || !userObj.email) {
            // अतिथि (Guest) सत्र के लिए केवल guest लॉग रखें
            return logsArray.filter(item => {
                if (!item) return false;
                const itemEmail = String(item.userEmail || item.user || '').trim().toLowerCase();
                return !itemEmail || itemEmail === 'guest';
            });
        }
        const targetEmail = String(userObj.email).trim().toLowerCase();
        const targetUid = String(userObj.uid || '').trim();
        return logsArray.filter(item => {
            if (!item) return false;
            // प्रारंभिक उदाहरण (sample) लॉग किसी वास्तविक लॉगिन यूज़र के निजी लॉग में न मिलाएँ
            if (item.id === 'log_sample_tulsidas' || item.logId === 'log_sample_tulsidas') return false;
            const itemUid = String(item.ownerId || '').trim();
            const itemEmail = String(item.userEmail || item.user || '').trim().toLowerCase();
            if (targetUid && itemUid && itemUid === targetUid) return true;
            if (itemEmail && itemEmail === targetEmail) return true;
            return false;
        });
    }

    function saveUserAccountSnapshot(userObj, logsList) {
        try {
            if (userObj && userObj.email) {
                const normEmail = String(userObj.email).trim().toLowerCase();
                const emailKey = getEmailArchiveKey(normEmail);
                const archiveMap = getUserProfilesArchiveMap();
                const prev = archiveMap[emailKey] || {};
                const chosenIcon = userObj.avatarIcon || prev.avatarIcon || localStorage.getItem('wikilink_profile_icon') || '📚';
                archiveMap[emailKey] = {
                    email: normEmail,
                    name: String(userObj.name || prev.name || normEmail.split('@')[0]).trim(),
                    avatarIcon: chosenIcon,
                    role: userObj.role || prev.role || 'विकिपीडिया संपादक',
                    uid: userObj.uid || prev.uid || '',
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('wikilink_user_profiles_archive_v1', JSON.stringify(archiveMap));
                localStorage.setItem('wikilink_last_login_email', normEmail);

                if (Array.isArray(logsList)) {
                    const existingUserLogs = getSavedUserLogsByEmail(normEmail, userObj.uid);
                    const strictlyOwned = filterLogsStrictlyForUser(
                        mergeUniqueLogsList(logsList, existingUserLogs),
                        { email: normEmail, uid: userObj.uid || prev.uid || '' }
                    ).map(item => ({
                        ...item,
                        user: normEmail,
                        userEmail: normEmail,
                        ownerId: item.ownerId || userObj.uid || prev.uid || ''
                    }));
                    localStorage.setItem(`wikilink_user_logs_${emailKey}`, JSON.stringify(strictlyOwned.slice(0, 80)));
                }
            }
        } catch (e) {
            console.warn('Snapshot save warning:', e);
        }
    }

    function getSavedUserLogsByEmail(email, uid = '') {
        if (!email) return [];
        try {
            const normEmail = String(email).trim().toLowerCase();
            const emailKey = getEmailArchiveKey(normEmail);
            const raw = localStorage.getItem(`wikilink_user_logs_${emailKey}`);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];
            // यदि आर्काइव में पुराने समय के बिना टैग वाले लॉग हैं जो इसी ईमेल की कुंजी में थे, तो उन्हें इस ईमेल से संबद्ध मानें, परंतु किसी दूसरे ईमेल के लॉग को तुरंत हटाएँ
            return parsed.filter(item => {
                if (!item) return false;
                if (item.id === 'log_sample_tulsidas' || item.logId === 'log_sample_tulsidas') return false;
                const itemEmail = String(item.userEmail || item.user || '').trim().toLowerCase();
                const itemUid = String(item.ownerId || '').trim();
                if (uid && itemUid && itemUid !== uid && itemEmail && itemEmail !== normEmail) return false;
                if (itemEmail && itemEmail !== 'guest' && itemEmail !== normEmail) return false;
                return true;
            }).map(item => ({
                ...item,
                user: normEmail,
                userEmail: normEmail,
                ownerId: item.ownerId || uid || ''
            }));
        } catch (e) {
            return [];
        }
    }

    function mergeUniqueLogsList(...logArrays) {
        const map = new Map();
        logArrays.forEach(arr => {
            if (!Array.isArray(arr)) return;
            arr.forEach(item => {
                if (!item) return;
                const key = String(item.logId || item.id || `${item.timestamp}_${item.title}_${item.action}`);
                if (!map.has(key)) {
                    map.set(key, item);
                }
            });
        });
        return Array.from(map.values()).slice(0, 80);
    }

    async function performLogout() {
        const oldName = currentUser ? currentUser.name : 'सदस्य';
        // लॉगआउट से पहले वर्तमान यूज़र की संपूर्ण प्रोफ़ाइल जानकारी (नाम, आइकन) व केवल उसी के निजी लॉग सुरक्षित रूप से उसके ईमेल आर्काइव में सहेजें
        if (currentUser) {
            saveUserAccountSnapshot(currentUser, filterLogsStrictlyForUser(userActivityLogs, currentUser));
        }

        if (window.WikiFirebase && window.WikiFirebase.signOutFirebaseUser) {
            try {
                await window.WikiFirebase.signOutFirebaseUser();
            } catch (err) {
                console.warn('Firebase signOut error:', err);
            }
        }
        // सक्रिय सत्र और इन-मेमोरी लॉग्स साफ़ करें ताकि अगला लॉगिन करने वाला यूज़र कभी पिछले यूज़र के लॉग न देखे!
        currentUser = null;
        userActivityLogs = [];
        localStorage.removeItem('wikilink_current_user');
        localStorage.removeItem('wikilink_google_account');
        updateAuthHeaderUI();
        renderUserDashboard();
        const speech = $('stage-speech-bubble');
        if (speech) {
            speech.textContent = `${oldName} लॉगआउट हुए! आपकी प्रोफ़ाइल व पुराने लॉग सुरक्षित हैं 👋`;
        }
        showToast(`${oldName} लॉगआउट हुए — दोबारा लॉगिन करने पर आपके सभी पुराने लॉग व सेटिंग सुरक्षित मिलेंगे`);
        if ($('anime-profile-authenticated-shell')) {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 450);
        }
    }

    function switchProfileSection(sectionId) {
        if (!sectionId) return;
        if (sectionId === 'sec-profile-admin') {
            const isAdmin = Boolean(
                currentUser &&
                currentUser.email &&
                currentUser.email.trim().toLowerCase() === 'amankumar.wikimedian@gmail.com' &&
                currentUser.name &&
                (currentUser.name.trim() === 'विक्रम प्रताप' || currentUser.name.trim().includes('विक्रम प्रताप'))
            );
            if (!isAdmin) {
                sectionId = 'sec-profile-overview';
            }
        }

        document.querySelectorAll('.anime-vnav-btn[data-profile-section]').forEach(btn => {
            const isMatch = btn.dataset.profileSection === sectionId;
            btn.classList.toggle('active', isMatch);
            btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        });

        document.querySelectorAll('.anime-profile-pane').forEach(pane => {
            const isMatch = pane.id === sectionId;
            pane.classList.toggle('active', isMatch);
            pane.style.display = isMatch ? 'block' : 'none';
        });

        if (sectionId === 'sec-profile-admin') {
            refreshAdminAndApprovedBlacklist();
        }
    }

    function initProfileVerticalNav() {
        document.querySelectorAll('.anime-vnav-btn[data-profile-section]').forEach(btn => {
            btn.addEventListener('click', () => {
                switchProfileSection(btn.dataset.profileSection);
            });
        });

        document.querySelectorAll('[data-jump-profile-section]').forEach(btn => {
            btn.addEventListener('click', () => {
                switchProfileSection(btn.dataset.jumpProfileSection);
            });
        });

        const hash = (window.location.hash || '').replace('#', '');
        if (hash === 'profile-theme-studio' || hash === 'sec-profile-theme') {
            switchProfileSection('sec-profile-theme');
        } else if (hash === 'sec-profile-logs' || hash === 'logs') {
            switchProfileSection('sec-profile-logs');
        } else if (hash === 'sec-profile-admin' || hash === 'admin') {
            switchProfileSection('sec-profile-admin');
        }
    }

    function applySelectedProfileIconUI(iconChar, notify = false) {
        const validIcon = PROFILE_ICON_OPTIONS[iconChar] ? iconChar : '📚';
        const iconTitle = PROFILE_ICON_OPTIONS[validIcon] || 'ज्ञानकोश विद्वान';

        localStorage.setItem('wikilink_profile_icon', validIcon);
        if (currentUser) {
            currentUser.avatarIcon = validIcon;
            localStorage.setItem('wikilink_current_user', JSON.stringify(currentUser));
            saveUserAccountSnapshot(currentUser, userActivityLogs);
        }

        const mainAvatarIconEl = $('profile-main-avatar-icon');
        if (mainAvatarIconEl) mainAvatarIconEl.textContent = validIcon;

        const labelBadgeEl = $('selected-icon-label-badge');
        if (labelBadgeEl) labelBadgeEl.textContent = `चयनित: ${iconTitle}`;

        const bannerCrestEl = $('banner-selected-icon-crest');
        if (bannerCrestEl) bannerCrestEl.textContent = `${validIcon} ${iconTitle}`;

        document.querySelectorAll('.profile-icon-option-btn[data-profile-icon]').forEach(btn => {
            const isSelected = btn.dataset.profileIcon === validIcon;
            btn.classList.toggle('active', isSelected);
            btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        });

        updateAuthHeaderUI();
        if (notify) {
            showToast(`✨ प्रोफ़ाइल आइकन बदला गया: ${validIcon} ${iconTitle}`);
        }
    }

    function initProfileCustomizationControls() {
        const savedIcon = (currentUser && currentUser.avatarIcon) || localStorage.getItem('wikilink_profile_icon') || '📚';
        applySelectedProfileIconUI(savedIcon, false);

        // 1. 5 प्रोफ़ाइल आइकन विकल्प बटन
        document.querySelectorAll('.profile-icon-option-btn[data-profile-icon]').forEach(btn => {
            btn.addEventListener('click', () => {
                const chosenIcon = btn.dataset.profileIcon || '📚';
                applySelectedProfileIconUI(chosenIcon, true);
            });
        });

        // 2. प्रोफ़ाइल अनुभाग में यूज़रनेम बदलने का विकल्प
        const usernameInput = $('profile-username-input');
        const saveUsernameBtn = $('btn-save-profile-username');
        const focusEditBtn = $('btn-focus-username-edit');

        if (usernameInput && currentUser && currentUser.name) {
            usernameInput.value = currentUser.name;
        }

        if (focusEditBtn && usernameInput) {
            focusEditBtn.addEventListener('click', () => {
                switchProfileSection('sec-profile-overview');
                usernameInput.focus();
                usernameInput.select();
            });
        }

        const handleSaveUsername = async () => {
            if (!currentUser) {
                showToast('यूज़रनेम बदलने के लिए कृपया पहले अपने खाते में लॉगिन करें।');
                return;
            }
            const rawNewName = usernameInput ? usernameInput.value.trim() : '';
            if (!rawNewName) {
                showToast('कृपया वैध यूज़रनेम दर्ज करें।');
                if (usernameInput) usernameInput.focus();
                return;
            }
            const normEmail = String(currentUser.email || '').trim().toLowerCase();
            // सुरक्षा नियम: यदि ईमेल एडमिन ईमेल नहीं है, तो कोई अन्य व्यक्ति आरक्षित एडमिन नाम 'विक्रम प्रताप' नहीं रख सकता
            if (normEmail !== 'amankumar.wikimedian@gmail.com' && (rawNewName === 'विक्रम प्रताप' || rawNewName.includes('विक्रम प्रताप') || rawNewName.toLowerCase() === 'vikram pratap')) {
                showToast('⚠️ "विक्रम प्रताप" मुख्य प्रशासक का आरक्षित नाम है। कृपया अपना अन्य सदस्य नाम चुनें।');
                return;
            }

            currentUser.name = rawNewName;
            currentUser.isAdmin = (
                normEmail === 'amankumar.wikimedian@gmail.com' &&
                (rawNewName === 'विक्रम प्रताप' || rawNewName.includes('विक्रम प्रताप'))
            );
            localStorage.setItem('wikilink_current_user', JSON.stringify(currentUser));
            saveUserAccountSnapshot(currentUser, userActivityLogs);

            // स्थानीय ईमेल रजिस्ट्री में भी नाम अद्यतन करें
            try {
                const regMap = JSON.parse(localStorage.getItem('wikilink_registered_emails_v1') || '{}');
                if (regMap[normEmail]) {
                    regMap[normEmail].name = rawNewName;
                    localStorage.setItem('wikilink_registered_emails_v1', JSON.stringify(regMap));
                }
            } catch (e) {}

            updateAuthHeaderUI();
            renderUserDashboard();

            if (window.WikiFirebase && window.WikiFirebase.syncUserProfileToFirestore && currentUser.uid) {
                try {
                    await window.WikiFirebase.syncUserProfileToFirestore({
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: rawNewName
                    });
                } catch (e) {}
            }

            showToast(`✓ आपका नया यूज़रनेम "${rawNewName}" सफलतापूर्वक सुरक्षित हो गया!`);
        };

        if (saveUsernameBtn) {
            saveUsernameBtn.addEventListener('click', handleSaveUsername);
        }
        if (usernameInput) {
            usernameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveUsername();
                }
            });
        }
    }

    function trackCharactersToPoint(targetX, targetY) {
        const stage = $('cute-characters-stage');
        if (!stage || stage.classList.contains('is-covering-eyes')) return;

        stage.querySelectorAll('.char-pupil').forEach(pupil => {
            const rect = pupil.getBoundingClientRect();
            if (!rect.width) return;
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const angle = Math.atan2(targetY - cy, targetX - cx);
            const dx = Math.cos(angle) * 4.5;
            const dy = Math.sin(angle) * 4.5;
            pupil.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
        });

        stage.querySelectorAll('.cute-char').forEach((ch, idx) => {
            const rect = ch.getBoundingClientRect();
            if (!rect.width) return;
            const cx = rect.left + rect.width / 2;
            const deltaX = Math.max(-10, Math.min(10, (targetX - cx) * 0.02));
            const skewX = Math.max(-3.5, Math.min(3.5, (targetX - cx) * -0.008));
            ch.style.transform = `translateX(${(deltaX * (0.6 + idx * 0.12)).toFixed(1)}px) skewX(${skewX.toFixed(1)}deg)`;
        });
    }

    function initCuteAuthAndUserLogs() {
        initMobileHeaderToggleMenu();
        loadUserAndLogsFromStorage();
        updateAuthHeaderUI();
        checkPendingRestoredArticle();
        renderUserDashboard();
        initProfileVerticalNav();
        initProfileCustomizationControls();

        // जब यूज़र खाते में लॉगिन हो, तो शीर्ष पट्टी में यूज़रनेम (#auth-trigger-btn) या सक्रिय सत्र नाम (#auth-active-user-name) पर क्लिक करने से हमेशा विशेष प्रोफ़ाइल पेज (logs.html) ही खुले!
        const authTriggerBtn = $('auth-trigger-btn');
        if (authTriggerBtn) {
            authTriggerBtn.addEventListener('click', (e) => {
                let activeUser = currentUser;
                if (!activeUser) {
                    try {
                        activeUser = JSON.parse(localStorage.getItem('wikilink_current_user') || 'null');
                    } catch (err) {}
                }
                const dotEl = $('auth-status-dot');
                const lblEl = $('auth-btn-label');
                const isLoggedInNow = Boolean(
                    (activeUser && (activeUser.name || activeUser.email)) ||
                    (dotEl && dotEl.classList.contains('logged-in')) ||
                    (lblEl && lblEl.textContent && !lblEl.textContent.includes('लॉगिन'))
                );
                if (isLoggedInNow) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = 'logs.html';
                }
            });
        }

        const activeUserNameEl = $('auth-active-user-name');
        const activeSessionInfoEl = document.querySelector('.active-session-info');
        [activeUserNameEl, activeSessionInfoEl].forEach(el => {
            if (el) {
                el.style.cursor = 'pointer';
                el.setAttribute('title', 'अपने नाम पर क्लिक करके विशेष एनीमे प्रोफ़ाइल पेज खोलें');
                el.addEventListener('click', () => {
                    window.location.href = 'logs.html';
                });
            }
        });

        // सभी लॉगआउट बटनों को जोड़ें
        const logoutBtns = [
            $('header-logout-btn'),
            $('auth-form-logout-btn'),
            $('user-dash-logout-btn')
        ];
        logoutBtns.forEach(btn => {
            if (btn) btn.addEventListener('click', performLogout);
        });

        // 4-कैरेक्टर इंटरैक्शन और पासवर्ड आँख-बंद / आँख-खोल तर्क (लॉगिन पेज पर)
        const stage = $('cute-characters-stage');
        const speech = $('stage-speech-bubble');
        const nameGroup = $('auth-name-group');
        const nameInput = $('auth-name-input');
        const emailInput = $('auth-email-input');
        const passInput = $('auth-password-input');
        const passToggle = $('auth-pass-toggle-btn');
        const eyeIcon = $('auth-eye-icon');
        const eyeText = $('auth-eye-text');
        const passHint = $('pass-eye-status-hint');
        const btnOpenEyes = $('btn-char-open-eyes');
        const btnCoverEyes = $('btn-char-cover-eyes');
        const btnHappyJump = $('btn-char-happy-jump');
        const authForm = $('cute-auth-form');
        const switchModeBtn = $('auth-switch-mode-btn');

        function syncCharacterEyesWithPasswordState() {
            if (!stage) return;
            // नियम:
            // 1. जब पासवर्ड दिखता है (isPasswordRevealed = true, type="text") -> पात्र आँखें बंद कर लेते हैं (is-covering-eyes)!
            // 2. जब पासवर्ड नहीं दिखता / छुपा है (isPasswordRevealed = false, type="password") -> पात्र आँखें खोल लेते हैं!
            stage.classList.remove('is-peeking');
            if (isPasswordRevealed) {
                stage.classList.add('is-covering-eyes');
                if (eyeIcon) eyeIcon.textContent = '🙈';
                if (eyeText) eyeText.textContent = 'छुपाएँ';
                if (passHint) passHint.textContent = '🔓 पासवर्ड दिख रहा है → आँखें बंद 🙈';
                if (speech) speech.textContent = 'अरे! आपका पासवर्ड दिख रहा है, हमने आँखें बंद कर लीं! 🙈';
                if (btnCoverEyes) btnCoverEyes.classList.add('active');
                if (btnOpenEyes) btnOpenEyes.classList.remove('active');
            } else {
                stage.classList.remove('is-covering-eyes');
                if (eyeIcon) eyeIcon.textContent = '👁';
                if (eyeText) eyeText.textContent = 'दिखाएँ';
                if (passHint) passHint.textContent = '🔒 पासवर्ड छुपा है → आँखें खुली हैं 👀';
                if (speech) speech.textContent = 'पासवर्ड छुपा है (•••), इसलिए हमारी आँखें खुली हैं! 👀';
                if (btnOpenEyes) btnOpenEyes.classList.add('active');
                if (btnCoverEyes) btnCoverEyes.classList.remove('active');
            }
        }

        if (stage) {
            document.addEventListener('mousemove', (e) => {
                trackCharactersToPoint(e.clientX, e.clientY);
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches[0]) {
                    trackCharactersToPoint(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: true });

            document.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) {
                    trackCharactersToPoint(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: true });

            document.querySelectorAll('#cute-characters-stage .cute-char').forEach(ch => {
                ch.style.cursor = 'pointer';
                ch.addEventListener('click', () => {
                    const cname = ch.dataset.charName || 'मित्र';
                    ch.classList.remove('char-tap-bounce');
                    void ch.offsetWidth;
                    ch.classList.add('char-tap-bounce');
                    if (speech) {
                        speech.textContent = isPasswordRevealed
                            ? `${cname}: पासवर्ड छुपाओ तभी आँखें खोलूँगा! 🙈`
                            : `${cname}: नमस्ते! मैं आपकी मदद के लिए तैयार हूँ! ✨`;
                    }
                });
            });
        }

        if (btnOpenEyes) {
            btnOpenEyes.addEventListener('click', () => {
                isPasswordRevealed = false;
                if (passInput) passInput.type = 'password';
                syncCharacterEyesWithPasswordState();
            });
        }

        if (btnCoverEyes) {
            btnCoverEyes.addEventListener('click', () => {
                isPasswordRevealed = true;
                if (passInput) passInput.type = 'text';
                syncCharacterEyesWithPasswordState();
            });
        }

        if (btnHappyJump && stage) {
            btnHappyJump.addEventListener('click', () => {
                stage.classList.remove('is-happy-jump');
                void stage.offsetWidth;
                stage.classList.add('is-happy-jump');
                if (speech) speech.textContent = 'हुर्रे! विकिलिंक सहायक में आपका स्वागत है! 🎉';
                setTimeout(() => stage.classList.remove('is-happy-jump'), 1200);
            });
        }

        function setAuthModeUI(mode) {
            authMode = mode;
            document.querySelectorAll('[data-auth-mode]').forEach(b => {
                b.classList.toggle('active', b.dataset.authMode === mode);
            });
            if (mode === 'signup') {
                if (nameGroup) nameGroup.style.display = 'flex';
                safeSetText('auth-heading-title', 'Create Account!');
                safeSetText('auth-heading-sub', 'नया खाता बनाएं और अपने विकिलिंक लॉग्स व थीम सुरक्षित रखें');
                safeSetText('auth-submit-btn', 'साइन अप करें (Sign up)');
                safeSetText('auth-switch-prompt', 'पहले से खाता है?');
                if (switchModeBtn) switchModeBtn.textContent = 'लॉगिन करें (Log in)';
                if (speech && !isPasswordRevealed) speech.textContent = 'नया खाता बना रहे हैं? स्वागत है! 🎉';
            } else {
                if (nameGroup) nameGroup.style.display = 'none';
                safeSetText('auth-heading-title', 'Welcome back!');
                safeSetText('auth-heading-sub', 'अपने खाते में लॉगिन करें अथवा बिना लॉगिन सीधे कार्यपटल चलाएँ');
                safeSetText('auth-submit-btn', 'लॉगिन करें (Log in)');
                safeSetText('auth-switch-prompt', 'खाता नहीं है?');
                if (switchModeBtn) switchModeBtn.textContent = 'साइन अप करें (Sign up)';
                if (speech && !isPasswordRevealed) speech.textContent = 'नमस्ते! अपना विवरण दर्ज करें ✨';
            }
        }

        document.querySelectorAll('[data-auth-mode]').forEach(btn => {
            btn.addEventListener('click', () => setAuthModeUI(btn.dataset.authMode));
        });

        if (switchModeBtn) {
            switchModeBtn.addEventListener('click', () => {
                setAuthModeUI(authMode === 'login' ? 'signup' : 'login');
            });
        }

        [nameInput, emailInput].forEach(inp => {
            if (!inp) return;
            inp.addEventListener('focus', () => {
                if (!isPasswordRevealed && stage) {
                    stage.classList.remove('is-covering-eyes');
                }
                if (speech && !isPasswordRevealed) {
                    speech.textContent = inp === nameInput
                        ? 'वाह, कितना सुंदर नाम है! 😊'
                        : 'हम ध्यान से आपका ईमेल देख रहे हैं 👀';
                }
            });
            inp.addEventListener('input', () => {
                if (stage && stage.classList.contains('is-covering-eyes')) return;
                const rect = inp.getBoundingClientRect();
                const offset = Math.min(inp.value.length * 8, rect.width - 20);
                trackCharactersToPoint(rect.left + offset, rect.top + 15);
            });
        });

        if (passInput) {
            passInput.addEventListener('focus', () => {
                syncCharacterEyesWithPasswordState();
            });
            passInput.addEventListener('input', () => {
                if (!isPasswordRevealed) {
                    const rect = passInput.getBoundingClientRect();
                    const offset = Math.min(passInput.value.length * 9, rect.width - 30);
                    trackCharactersToPoint(rect.left + offset, rect.top + 15);
                }
            });
        }

        if (passToggle && passInput) {
            passToggle.addEventListener('click', () => {
                isPasswordRevealed = !isPasswordRevealed;
                passInput.type = isPasswordRevealed ? 'text' : 'password';
                syncCharacterEyesWithPasswordState();
                passInput.focus();
            });
        }

        // ================== ईमेल अद्वितीयता लॉक एवं एडमिन जाँच (Email Lock & Strict Admin Check) ==================
        const DESIGNATED_ADMIN_EMAIL = 'amankumar.wikimedian@gmail.com';
        const DESIGNATED_ADMIN_NAME = 'विक्रम प्रताप';

        function isCurrentUserDesignatedAdmin(userObj = currentUser) {
            if (!userObj || !userObj.email || !userObj.name) return false;
            const normEmail = String(userObj.email).trim().toLowerCase();
            const normName = String(userObj.name).trim();
            if (normEmail !== DESIGNATED_ADMIN_EMAIL) return false;
            return (
                normName === DESIGNATED_ADMIN_NAME ||
                normName.includes(DESIGNATED_ADMIN_NAME) ||
                normName.toLowerCase() === 'vikram pratap'
            );
        }

        function getLocalRegisteredEmailsMap() {
            try {
                const raw = localStorage.getItem('wikilink_registered_emails_v1');
                return raw ? JSON.parse(raw) : {};
            } catch (e) {
                return {};
            }
        }

        function recordLocalRegisteredEmail(email, name, uid = '') {
            if (!email) return;
            try {
                const map = getLocalRegisteredEmailsMap();
                const normEmail = email.trim().toLowerCase();
                if (!map[normEmail]) {
                    map[normEmail] = {
                        email: normEmail,
                        name: name || normEmail.split('@')[0],
                        uid: uid || '',
                        firstSignedInAt: new Date().toISOString()
                    };
                } else if (name) {
                    map[normEmail].name = name;
                }
                localStorage.setItem('wikilink_registered_emails_v1', JSON.stringify(map));
            } catch (e) {}
        }

        // यदि लॉगिन पेज पर हैं और पिछली बार का ईमेल उपलब्ध है तो सुविधा के लिए भर दें
        if (emailInput && !emailInput.value) {
            const lastEmail = localStorage.getItem('wikilink_last_login_email');
            if (lastEmail) emailInput.value = lastEmail;
        }

        function completeUserLogin(userObj) {
            const normEmail = String(userObj.email || '').trim().toLowerCase();
            const emailKey = getEmailArchiveKey(normEmail);
            const archiveMap = getUserProfilesArchiveMap();
            const archivedProfile = archiveMap[emailKey] || null;

            // पूर्व में सहेजा गया कस्टम यूज़रनेम और आइकन प्राथमिकता से पुनर्स्थापित करें
            let resolvedName = (userObj.name || '').trim();
            if ((!resolvedName || resolvedName === normEmail.split('@')[0]) && archivedProfile && archivedProfile.name) {
                resolvedName = archivedProfile.name;
            }
            if (normEmail === DESIGNATED_ADMIN_EMAIL && (!resolvedName || resolvedName.toLowerCase() === 'amankumar.wikimedian' || resolvedName.toLowerCase().includes('vikram'))) {
                resolvedName = DESIGNATED_ADMIN_NAME;
            }
            const resolvedIcon = userObj.avatarIcon || (archivedProfile && archivedProfile.avatarIcon) || localStorage.getItem('wikilink_profile_icon') || '📚';
            const isAdmin = isCurrentUserDesignatedAdmin({ email: normEmail, name: resolvedName });

            currentUser = {
                name: resolvedName || normEmail.split('@')[0],
                email: normEmail,
                uid: userObj.uid || (archivedProfile && archivedProfile.uid) || '',
                avatarIcon: resolvedIcon,
                role: isAdmin ? 'मुख्य प्रशासक (Admin — विक्रम प्रताप)' : (userObj.role || (archivedProfile && archivedProfile.role) || 'विकिपीडिया संपादक'),
                isAdmin: isAdmin,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('wikilink_current_user', JSON.stringify(currentUser));
            localStorage.setItem('wikilink_profile_icon', resolvedIcon);
            recordLocalRegisteredEmail(currentUser.email, currentUser.name, currentUser.uid);

            // सख्त नियम: केवल इसी यूज़र (normEmail / uid) के निजी लॉग लोड करें — किसी अन्य यूज़र के लॉग कभी न मिलाएँ!
            userActivityLogs = getSavedUserLogsByEmail(normEmail, currentUser.uid);

            logUserActivity('यूज़र लॉगिन', {
                title: currentUser.name,
                lang: state.lang || 'hi',
                note: `${currentUser.email} द्वारा लॉगिन`
            });

            saveUserAccountSnapshot(currentUser, userActivityLogs);

            if (window.WikiFirebase && window.WikiFirebase.fetchUserActivityLogsFromFirestore && currentUser.uid) {
                window.WikiFirebase.fetchUserActivityLogsFromFirestore(currentUser.uid).catch(() => {});
            }

            if (stage) {
                stage.classList.remove('is-covering-eyes', 'is-peeking');
                stage.classList.add('is-happy-jump');
                setTimeout(() => stage.classList.remove('is-happy-jump'), 1200);
            }
            if (speech) {
                speech.textContent = `स्वागत है, ${currentUser.name}! 🎉`;
            }

            updateAuthHeaderUI();
            renderUserDashboard();
            if (state.suggestions && state.suggestions.length > 0) {
                renderSuggestionsTable();
            }
            refreshAdminAndApprovedBlacklist();
            showToast(`स्वागत है, ${currentUser.name}! आपके निजी प्रोफ़ाइल व लॉग लोड किए जा रहे हैं...`);

            // लॉगिन करते ही यूज़र को उसके विशेष प्रोफ़ाइल पेज (logs.html) में ले जाएँ
            const isAlreadyOnProfilePage = Boolean($('anime-profile-authenticated-shell') || window.location.pathname.endsWith('logs.html'));
            if (!isAlreadyOnProfilePage) {
                setTimeout(() => {
                    window.location.href = 'logs.html';
                }, 480);
            }
        }

        const googleFirebaseBtn = $('auth-google-firebase-btn');
        const googleBtnText = $('auth-google-btn-text');

        if (googleFirebaseBtn) {
            googleFirebaseBtn.addEventListener('click', async () => {
                if (!window.WikiFirebase || !window.WikiFirebase.signInWithGooglePopup) {
                    showToast('Google साइन-इन मॉड्यूल तैयार हो रहा है, कृपया पुनः क्लिक करें।');
                    try {
                        await import('./firebase-client.js');
                    } catch (e) {
                        console.warn('Dynamic import firebase-client failed:', e);
                    }
                    return;
                }

                const defaultLabel = 'Google से साइन इन करें — विकीलिंक सहायक';
                if (googleBtnText) googleBtnText.textContent = 'Google खाता चयन विंडो खुली है...';
                googleFirebaseBtn.disabled = true;

                try {
                    const fbUser = await window.WikiFirebase.signInWithGooglePopup();
                    if (fbUser) {
                        const resolvedEmail = (fbUser.email || 'editor@wikipedia.org').trim().toLowerCase();
                        let resolvedName = fbUser.displayName || fbUser.name || (resolvedEmail ? resolvedEmail.split('@')[0] : 'Google संपादक');
                        if (resolvedEmail === DESIGNATED_ADMIN_EMAIL) {
                            resolvedName = DESIGNATED_ADMIN_NAME;
                        }
                        localStorage.setItem('wikilink_google_account', JSON.stringify({ name: resolvedName, email: resolvedEmail }));
                        completeUserLogin({
                            name: resolvedName,
                            email: resolvedEmail,
                            uid: fbUser.uid || '',
                            role: fbUser.role || 'विकीलिंक सहायक क्लाउड संपादक'
                        });
                    }
                } catch (err) {
                    const code = err && err.code ? String(err.code) : '';
                    if (code === 'auth/popup-blocked') {
                        showToast('ब्राउज़र ने पॉपअप रोक दिया है। कृपया पॉपअप की अनुमति दें और पुनः प्रयास करें।');
                    } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
                        showToast('Google खाता साइन-इन रद्द या बाधित हुआ। कृपया पुनः प्रयास करें।');
                    }
                } finally {
                    googleFirebaseBtn.disabled = false;
                    if (googleBtnText) googleBtnText.textContent = defaultLabel;
                }
            });
        }

        window.addEventListener('wikilink:firebase-auth', (e) => {
            const fbUser = e.detail?.user;
            if (fbUser && fbUser.email) {
                const normEmail = fbUser.email.trim().toLowerCase();
                const emailKey = getEmailArchiveKey(normEmail);
                const archivedProfile = getUserProfilesArchiveMap()[emailKey] || null;

                let resolvedName = (archivedProfile && archivedProfile.name) || fbUser.name || normEmail.split('@')[0];
                if (normEmail === DESIGNATED_ADMIN_EMAIL && (!resolvedName || resolvedName.toLowerCase().includes('vikram') || resolvedName.toLowerCase().includes('amankumar'))) {
                    resolvedName = DESIGNATED_ADMIN_NAME;
                }
                const resolvedIcon = (currentUser && currentUser.avatarIcon) || (archivedProfile && archivedProfile.avatarIcon) || localStorage.getItem('wikilink_profile_icon') || '📚';
                const isAdmin = isCurrentUserDesignatedAdmin({ email: normEmail, name: resolvedName });
                currentUser = {
                    name: resolvedName,
                    email: normEmail,
                    avatarIcon: resolvedIcon,
                    role: isAdmin ? 'मुख्य प्रशासक (Admin — विक्रम प्रताप)' : (fbUser.role || 'Firebase क्लाउड संपादक'),
                    isAdmin: isAdmin,
                    uid: fbUser.uid,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem('wikilink_current_user', JSON.stringify(currentUser));
                localStorage.setItem('wikilink_google_account', JSON.stringify({ name: resolvedName, email: normEmail, avatarIcon: resolvedIcon }));
                recordLocalRegisteredEmail(normEmail, resolvedName, fbUser.uid);

                // सख्त नियम: केवल इसी लॉगिन यूज़र के संग्रहीत लॉग्स लोड करें
                const oldUserLogs = getSavedUserLogsByEmail(normEmail, fbUser.uid);
                userActivityLogs = filterLogsStrictlyForUser(mergeUniqueLogsList(oldUserLogs, userActivityLogs), currentUser);
                saveUserAccountSnapshot(currentUser, userActivityLogs);

                if (fbUser.preferredSkin) {
                    applySkinPreset(fbUser.preferredSkin, false);
                }
                applySelectedProfileIconUI(resolvedIcon, false);
                updateAuthHeaderUI();
                renderUserDashboard();
                if (state.suggestions && state.suggestions.length > 0) {
                    renderSuggestionsTable();
                }
                refreshAdminAndApprovedBlacklist();
            }
        });

        window.addEventListener('wikilink:firebase-logs', (e) => {
            const cloudLogs = e.detail?.logs;
            const eventUid = e.detail?.uid || '';
            if (!currentUser || !currentUser.email) return;
            if (eventUid && currentUser.uid && eventUid !== currentUser.uid) return;
            if (Array.isArray(cloudLogs)) {
                const taggedCloudLogs = cloudLogs.map(l => ({
                    ...l,
                    user: currentUser.email,
                    userEmail: currentUser.email,
                    ownerId: l.ownerId || currentUser.uid || ''
                }));
                const oldUserLogs = getSavedUserLogsByEmail(currentUser.email, currentUser.uid);
                userActivityLogs = filterLogsStrictlyForUser(
                    mergeUniqueLogsList(taggedCloudLogs, oldUserLogs, userActivityLogs),
                    currentUser
                );
                saveLogsToStorage();
                updateAuthHeaderUI();
                renderUserDashboard();
            }
        });

        window.addEventListener('wikilink:approved-blacklist', (e) => {
            const words = e.detail?.words;
            if (Array.isArray(words)) {
                applyApprovedBlacklistArray(words);
            }
        });

        window.addEventListener('wikilink:blacklist-requests', (e) => {
            const requests = e.detail?.requests;
            if (Array.isArray(requests)) {
                state.blacklistRequestsList = requests;
                renderAdminPanelUI();
            }
        });

        if (authForm) {
            authForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const rawEmail = emailInput ? emailInput.value.trim() : '';
                const passwordVal = passInput ? passInput.value : '';
                if (!rawEmail) {
                    showToast('कृपया ईमेल पता दर्ज करें');
                    if (emailInput) emailInput.focus();
                    return;
                }
                const normEmail = rawEmail.toLowerCase();
                const enteredName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : '';
                const localRegistry = getLocalRegisteredEmailsMap();
                const existingLocalLock = localRegistry[normEmail];

                // सुरक्षा नियम: यदि किसी ने इस ईमेल से पहले साइन-इन कर लिया है, तो कोई अन्य उसी ईमेल से नया खाता (Sign up) न बना सके
                if (authMode === 'signup') {
                    if (existingLocalLock) {
                        showToast(`⚠️ इस ईमेल (${normEmail}) से पहले ही खाता पंजीकृत/साइन-इन हो चुका है! उसी ईमेल से नया खाता नहीं बनाया जा सकता। कृपया 'लॉगिन करें' विकल्प चुनें।`);
                        if (speech) speech.textContent = 'यह ईमेल पहले से पंजीकृत है! कृपया लॉगिन मोड चुनें 🔒';
                        setAuthModeUI('login');
                        return;
                    }
                    if (window.WikiFirebase && window.WikiFirebase.checkEmailAlreadyRegistered) {
                        try {
                            const cloudLock = await window.WikiFirebase.checkEmailAlreadyRegistered(normEmail);
                            if (cloudLock && cloudLock.registered) {
                                recordLocalRegisteredEmail(normEmail, cloudLock.displayName || cloudLock.memberName || '', cloudLock.ownerUid || '');
                                showToast(`⚠️ इस ईमेल (${normEmail}) से पहले ही साइन-इन किया जा चुका है। कोई अन्य उसी ईमेल से नया खाता नहीं बना सकता। कृपया 'लॉगिन करें' का उपयोग करें।`);
                                if (speech) speech.textContent = 'यह ईमेल पहले से पंजीकृत है! कृपया लॉगिन करें 🔒';
                                setAuthModeUI('login');
                                return;
                            }
                        } catch (checkErr) {
                            console.warn('Email lock check warning:', checkErr);
                        }
                    }
                } else {
                    // लॉगिन मोड में भी यदि ईमेल पहले से किसी सदस्य नाम के साथ लॉक है और कोई भिन्न नाम से प्रवेश का प्रयास करे
                    if (existingLocalLock && enteredName && existingLocalLock.name && existingLocalLock.name.toLowerCase() !== enteredName.toLowerCase()) {
                        showToast(`⚠️ यह ईमेल (${normEmail}) सदस्य '${existingLocalLock.name}' के खाते से जुड़ा है। किसी अन्य नाम से इस ईमेल का उपयोग नहीं किया जा सकता।`);
                        return;
                    }
                }

                // यदि पासवर्ड कम से कम 6 अक्षरों का है और Firebase उपलब्ध है, तो वास्तविक Firebase Auth + ईमेल लॉक का भी प्रयास करें
                const resolvedName = enteredName || (existingLocalLock ? existingLocalLock.name : (normEmail === DESIGNATED_ADMIN_EMAIL ? DESIGNATED_ADMIN_NAME : normEmail.split('@')[0]));

                if (window.WikiFirebase && passwordVal && passwordVal.length >= 6) {
                    try {
                        if (authMode === 'signup' && window.WikiFirebase.registerWithEmailAccount) {
                            const fbProfile = await window.WikiFirebase.registerWithEmailAccount(resolvedName, normEmail, passwordVal);
                            completeUserLogin({
                                name: fbProfile.name || resolvedName,
                                email: normEmail,
                                uid: fbProfile.uid || '',
                                role: fbProfile.role || 'नव-पंजीकृत विकिपीडिया संपादक'
                            });
                            return;
                        } else if (authMode === 'login' && window.WikiFirebase.signInWithEmailAccount) {
                            const fbProfile = await window.WikiFirebase.signInWithEmailAccount(normEmail, passwordVal, resolvedName);
                            completeUserLogin({
                                name: fbProfile.name || resolvedName,
                                email: normEmail,
                                uid: fbProfile.uid || '',
                                role: fbProfile.role || 'विकिपीडिया संपादक'
                            });
                            return;
                        }
                    } catch (fbAuthErr) {
                        const errCode = String(fbAuthErr?.code || '');
                        if (errCode === 'auth/email-already-in-use') {
                            recordLocalRegisteredEmail(normEmail, resolvedName);
                            showToast(`⚠️ इस ईमेल (${normEmail}) से पहले ही साइन-इन किया जा चुका है! कोई अन्य उसी ईमेल से नया खाता नहीं बना सकता।`);
                            setAuthModeUI('login');
                            return;
                        }
                        if (errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
                            showToast('⚠️ पासवर्ड गलत है अथवा यह ईमेल किसी अन्य खाते द्वारा सुरक्षित है।');
                            return;
                        }
                    }
                }

                completeUserLogin({
                    name: resolvedName,
                    email: normEmail,
                    role: authMode === 'signup' ? 'नव-पंजीकृत विकिपीडिया संपादक' : 'विकिपीडिया संपादक'
                });
            });
        }

        // पूर्वावलोकन टूलबार इवेंट्स
        const optHighlightNewPreview = $('opt-highlight-new-preview-links');
        if (optHighlightNewPreview) {
            optHighlightNewPreview.addEventListener('change', () => {
                generateRenderedPreview(state.processedWikitext || state.originalWikitext);
            });
        }
        const btnLiveWikiParse = $('btn-fetch-live-wiki-parse');
        if (btnLiveWikiParse) {
            btnLiveWikiParse.addEventListener('click', fetchLiveWikipediaParsedPreview);
        }

        // एडमिन पैनल बटन एवं नियंत्रण इवेंट्स
        const adminHeaderBtn = $('admin-header-btn');
        if (adminHeaderBtn) {
            adminHeaderBtn.addEventListener('click', () => {
                if (isCurrentUserDesignatedAdmin()) {
                    if ($('anime-profile-authenticated-shell')) {
                        switchProfileSection('sec-profile-admin');
                    } else {
                        window.location.href = 'logs.html#sec-profile-admin';
                    }
                }
            });
        }

        const btnRefreshAdmin = $('btn-refresh-admin-panel');
        if (btnRefreshAdmin) {
            btnRefreshAdmin.addEventListener('click', () => {
                refreshAdminAndApprovedBlacklist(true);
            });
        }

        const btnAdminTestWord = $('btn-admin-test-word');
        if (btnAdminTestWord) {
            btnAdminTestWord.addEventListener('click', () => {
                const wordInput = $('admin-direct-word-input');
                const langSel = $('admin-direct-lang-select');
                const diagBox = $('admin-word-diagnostic-box');
                const rawWord = wordInput ? wordInput.value.trim() : '';
                const langVal = langSel ? langSel.value : 'hi';
                if (!rawWord) {
                    showToast('कृपया नीति परीक्षण हेतु शब्द दर्ज करें');
                    if (wordInput) wordInput.focus();
                    return;
                }
                const diag = evaluateWordLogicalPolicyForAdmin(rawWord, langVal);
                if (diagBox) {
                    diagBox.style.display = 'block';
                    diagBox.innerHTML = `
                        <div class="admin-diag-header">
                            <strong>🔍 शब्द नीति निदान: "${escapeHtml(rawWord)}" (${escapeHtml(langVal)})</strong>
                            <span class="badge ${diag.shouldBlacklist ? 'badge-disambig' : 'badge-blue'}">${escapeHtml(diag.verdictLabel)}</span>
                        </div>
                        <p class="admin-diag-summary">${escapeHtml(diag.summary)}</p>
                        <div class="admin-diag-rules-row">
                            ${diag.rules.map(r => `<span class="admin-diag-chip ${r.passed ? 'chip-pass' : 'chip-fail'}">${r.passed ? '✓' : '✕'} ${escapeHtml(r.name)}</span>`).join('')}
                        </div>
                    `;
                }
            });
        }

        const btnAdminDirectAdd = $('btn-admin-direct-add');
        if (btnAdminDirectAdd) {
            btnAdminDirectAdd.addEventListener('click', async () => {
                if (!isCurrentUserDesignatedAdmin()) {
                    showToast('केवल एडमिन (विक्रम प्रताप) को यह अधिकार प्राप्त है।');
                    return;
                }
                const wordInput = $('admin-direct-word-input');
                const langSel = $('admin-direct-lang-select');
                const reasonSel = $('admin-direct-reason-select');
                const diagBox = $('admin-word-diagnostic-box');
                const rawWord = wordInput ? wordInput.value.trim() : '';
                const langVal = langSel ? langSel.value : 'hi';
                const policyReason = reasonSel ? reasonSel.value : 'WP:NOTLINKED (सामान्य दैनिक शब्द)';
                if (!rawWord) {
                    showToast('कृपया जोड़ने के लिए शब्द लिखें');
                    return;
                }
                btnAdminDirectAdd.disabled = true;
                try {
                    if (window.WikiFirebase && window.WikiFirebase.addApprovedBlacklistWordByAdmin) {
                        await window.WikiFirebase.addApprovedBlacklistWordByAdmin(rawWord, langVal);
                    }
                    addWordToLocalApprovedBlacklist({
                        word: rawWord.toLowerCase(),
                        lang: langVal,
                        reason: policyReason,
                        approvedBy: 'amankumar.wikimedian@gmail.com'
                    });
                    if (wordInput) wordInput.value = '';
                    if (diagBox) diagBox.style.display = 'none';
                    showToast(`'${rawWord}' (${policyReason}) को एडमिन द्वारा वैश्विक बहिष्कार सूची में जोड़ दिया गया!`);
                    await refreshAdminAndApprovedBlacklist();
                } catch (err) {
                    console.warn('Admin direct add error:', err);
                    addWordToLocalApprovedBlacklist({
                        word: rawWord.toLowerCase(),
                        lang: langVal,
                        reason: policyReason,
                        approvedBy: 'amankumar.wikimedian@gmail.com'
                    });
                    if (wordInput) wordInput.value = '';
                    if (diagBox) diagBox.style.display = 'none';
                    renderApprovedBlacklistStrip();
                    renderAdminPanelUI();
                    showToast(`'${rawWord}' बहिष्कार सूची में जोड़ा गया`);
                } finally {
                    btnAdminDirectAdd.disabled = false;
                }
            });
        }

        // एडमिन पैनल अनुरोध स्थिति फ़िल्टर चिप्स
        document.querySelectorAll('.admin-req-filter-chip[data-admin-req-status]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.admin-req-filter-chip[data-admin-req-status]').forEach(c => c.classList.remove('active-chip'));
                chip.classList.add('active-chip');
                state.adminReqStatusFilter = chip.dataset.adminReqStatus || 'all';
                renderAdminPanelUI();
            });
        });

        const adminReqSearchInput = $('admin-req-search-input');
        if (adminReqSearchInput) {
            adminReqSearchInput.addEventListener('input', (e) => {
                state.adminReqSearchQuery = (e.target.value || '').trim().toLowerCase();
                renderAdminPanelUI();
            });
        }

        // एडमिन सामूहिक सहमति / अस्वीकृति बटन
        const btnApproveAllPending = $('btn-admin-approve-all-pending');
        if (btnApproveAllPending) {
            btnApproveAllPending.addEventListener('click', async () => {
                if (!isCurrentUserDesignatedAdmin()) return;
                const pendingList = (state.blacklistRequestsList || []).filter(r => r.status === 'pending');
                if (pendingList.length === 0) {
                    showToast('कोई लंबित अनुरोध नहीं है');
                    return;
                }
                btnApproveAllPending.disabled = true;
                try {
                    for (const req of pendingList) {
                        const reqWord = String(req.word || req.term || '');
                        if (window.WikiFirebase && window.WikiFirebase.approveBlacklistRequestInFirestore) {
                            try { await window.WikiFirebase.approveBlacklistRequestInFirestore(req); } catch (e) {}
                        }
                        req.status = 'approved';
                        addWordToLocalApprovedBlacklist({
                            word: reqWord,
                            lang: req.lang || 'hi',
                            approvedBy: 'amankumar.wikimedian@gmail.com'
                        });
                    }
                    renderApprovedBlacklistStrip();
                    renderAdminPanelUI();
                    showToast(`✓ सभी ${pendingList.length} लंबित अनुरोध स्वीकृत किए गए!`);
                } finally {
                    btnApproveAllPending.disabled = false;
                }
            });
        }

        const btnRejectAllPending = $('btn-admin-reject-all-pending');
        if (btnRejectAllPending) {
            btnRejectAllPending.addEventListener('click', async () => {
                if (!isCurrentUserDesignatedAdmin()) return;
                const pendingList = (state.blacklistRequestsList || []).filter(r => r.status === 'pending');
                if (pendingList.length === 0) {
                    showToast('कोई लंबित अनुरोध नहीं है');
                    return;
                }
                btnRejectAllPending.disabled = true;
                try {
                    for (const req of pendingList) {
                        const rId = String(req.id || req.requestId || '');
                        if (rId && window.WikiFirebase && window.WikiFirebase.rejectBlacklistRequestInFirestore) {
                            try { await window.WikiFirebase.rejectBlacklistRequestInFirestore(rId); } catch (e) {}
                        }
                        req.status = 'rejected';
                    }
                    renderAdminPanelUI();
                    showToast(`सभी ${pendingList.length} लंबित अनुरोध अस्वीकृत किए गए`);
                } finally {
                    btnRejectAllPending.disabled = false;
                }
            });
        }

        // एडमिन स्वीकृत शब्द खोज, भाषा फ़िल्टर व JSON निर्यात
        const adminApprovedSearchInput = $('admin-approved-search-input');
        if (adminApprovedSearchInput) {
            adminApprovedSearchInput.addEventListener('input', (e) => {
                state.adminApprovedSearchQuery = (e.target.value || '').trim().toLowerCase();
                renderAdminPanelUI();
            });
        }

        const adminApprovedLangFilter = $('admin-approved-lang-filter');
        if (adminApprovedLangFilter) {
            adminApprovedLangFilter.addEventListener('change', (e) => {
                state.adminApprovedLangFilter = e.target.value || 'all';
                renderAdminPanelUI();
            });
        }

        const btnAdminExportBl = $('btn-admin-export-blacklist');
        if (btnAdminExportBl) {
            btnAdminExportBl.addEventListener('click', () => {
                const payload = {
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'विक्रम प्रताप (amankumar.wikimedian@gmail.com)',
                    totalApprovedCommunityWords: (state.approvedGlobalBlacklistList || []).length,
                    builtInPolicyWordsCount: (NEVER_LINK_WORDS.hi ? NEVER_LINK_WORDS.hi.size : 0) + (NEVER_LINK_WORDS.en ? NEVER_LINK_WORDS.en.size : 0),
                    words: state.approvedGlobalBlacklistList || []
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `wikilink_approved_blacklist_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('स्वीकृत वैश्विक बहिष्कार सूची JSON डाउनलोड हुई');
            });
        }

        loadLocalApprovedBlacklistCache();
        refreshAdminAndApprovedBlacklist();

        const exportLogsBtn = $('btn-export-user-logs');
        const clearLogsBtn = $('btn-clear-user-logs');
        const searchLogsInput = $('user-logs-search');

        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', exportUserLogsJson);
        }

        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', async () => {
                const logIds = userActivityLogs.map(l => String(l.logId || l.id)).filter(Boolean);
                userActivityLogs = [];
                saveLogsToStorage();
                if (window.WikiFirebase && window.WikiFirebase.clearUserActivityLogsInFirestore) {
                    try {
                        await window.WikiFirebase.clearUserActivityLogsInFirestore(logIds);
                    } catch (e) {}
                }
                updateAuthHeaderUI();
                renderUserDashboard();
                showToast('आपके सभी गतिविधि लॉग्स साफ़ किए गए');
            });
        }

        if (searchLogsInput) {
            searchLogsInput.addEventListener('input', (e) => {
                renderUserDashboard(e.target.value);
            });
        }
    }

    // ================== एडमिन पैनल एवं स्वीकृत सामुदायिक बहिष्कार सूची प्रबंधन ==================
    function evaluateWordLogicalPolicyForAdmin(rawWord, lang = 'hi') {
        const w = String(rawWord || '').trim();
        const lower = w.toLowerCase();
        const isStop = isStopword(w, lang) || STRICT_PHRASE_BREAKER_WORDS.has(lower);
        const isCommon = isNonLinkableWord(w, lang);
        const isDateOrNum = isDateOrYear(w) || /^\d+$/.test(w);
        const isUnit = isUnitOrMeasure(w);
        const isInflected = isInflectedHindiPluralOrOblique(w) || HONORIFIC_PREFIXES.has(lower);
        const isAlreadyApproved = state.approvedGlobalBlacklist && state.approvedGlobalBlacklist.has(lower);
        const lenOk = w.length >= 3;

        const rules = [
            { name: 'WP:STOP (अव्यय/कारक मुक्त)', passed: !isStop },
            { name: 'WP:NOTLINKED (सामान्य शब्द मुक्त)', passed: !isCommon },
            { name: 'WP:DATELINK (तिथि/अंक मुक्त)', passed: !isDateOrNum },
            { name: 'WP:UNITS (इकाई मुक्त)', passed: !isUnit },
            { name: 'व्याकरणिक एकवचन/मानक रूप', passed: !isInflected },
            { name: 'न्यूनतम लंबाई (≥3 अक्षर)', passed: lenOk },
            { name: 'पूर्व-बहिष्कार मुक्त', passed: !isAlreadyApproved }
        ];

        let verdictLabel = '✓ विश्वकोशीय पद (कड़ी योग्य)';
        let summary = 'यह पद विकिपीडिया के 7 प्राथमिक तार्किक नियमों में उत्तीर्ण है। केवल विशेष संपादकीय कारण होने पर ही बहिष्कृत करें।';
        let shouldBlacklist = false;
        let shortBadge = '✓ कड़ी योग्य पद';

        if (isAlreadyApproved) {
            verdictLabel = '🚫 पहले से वैश्विक बहिष्कृत';
            summary = 'यह शब्द पहले से ही स्वीकृत वैश्विक बहिष्कार सूची में शामिल है।';
            shouldBlacklist = true;
            shortBadge = '🚫 पूर्व-बहिष्कृत';
        } else if (isStop) {
            verdictLabel = '⚠️ बहिष्कार अनुशंसित (व्याकरणिक अव्यय)';
            summary = 'यह व्याकरणिक अव्यय/सहायक क्रिया है। इसकी आंतरिक कड़ी कभी नहीं बननी चाहिए।';
            shouldBlacklist = true;
            shortBadge = '⚠️ व्याकरणिक पद';
        } else if (isCommon) {
            verdictLabel = '⚠️ बहिष्कार अनुशंसित (WP:NOTLINKED)';
            summary = 'यह सामान्य बोलचाल/क्रियात्मक शब्द है। WP:OVERLINKING रोकने हेतु बहिष्कार उपयुक्त है।';
            shouldBlacklist = true;
            shortBadge = '⚠️ WP:NOTLINKED';
        } else if (isInflected) {
            verdictLabel = '⚠️ बहिष्कार अनुशंसित (तिर्यक बहुवचन/आदरसूचक)';
            summary = 'यह तिर्यक बहुवचन या आदरसूचक उपसर्ग है जो अधूरी कड़ी बना सकता है।';
            shouldBlacklist = true;
            shortBadge = '⚠️ तिर्यक/उपसर्ग';
        } else if (isDateOrNum || isUnit || !lenOk) {
            verdictLabel = '⚠️ बहिष्कार अनुशंसित (माप/तिथि/अति-लघु)';
            summary = 'यह तिथि, मात्रक या अति-लघु शब्द है। इसे बहिष्कृत करना तार्किक है।';
            shouldBlacklist = true;
            shortBadge = '⚠️ तिथि/माप/लघु';
        }

        return { shouldBlacklist, verdictLabel, summary, shortBadge, rules };
    }

    function loadLocalApprovedBlacklistCache() {
        try {
            const cached = JSON.parse(localStorage.getItem('wikilink_approved_global_blacklist_v1') || '[]');
            if (Array.isArray(cached) && cached.length > 0) {
                applyApprovedBlacklistArray(cached);
            }
        } catch (e) {}
    }

    function addWordToLocalApprovedBlacklist(wordObj) {
        if (!wordObj || !wordObj.word) return;
        const clean = wordObj.word.trim().toLowerCase();
        state.approvedGlobalBlacklist.add(clean);
        NEVER_LINK_WORDS.hi.add(clean);
        const exists = state.approvedGlobalBlacklistList.some(item => (item.word || '').toLowerCase() === clean);
        if (!exists) {
            state.approvedGlobalBlacklistList.unshift({
                id: `${wordObj.lang || 'hi'}_${clean}`,
                word: clean,
                lang: wordObj.lang || 'hi',
                reason: wordObj.reason || 'WP:NOTLINKED',
                approvedBy: wordObj.approvedBy || 'amankumar.wikimedian@gmail.com',
                approvedAt: new Date().toISOString()
            });
            try {
                localStorage.setItem('wikilink_approved_global_blacklist_v1', JSON.stringify(state.approvedGlobalBlacklistList));
            } catch (e) {}
        }
    }

    function applyApprovedBlacklistArray(wordsArray) {
        if (!Array.isArray(wordsArray)) return;
        const normalizedList = [];
        wordsArray.forEach(item => {
            const rawWord = String(item?.word || item?.term || '').trim();
            if (rawWord) {
                const clean = rawWord.toLowerCase();
                state.approvedGlobalBlacklist.add(clean);
                const langSet = NEVER_LINK_WORDS[item.lang] || NEVER_LINK_WORDS.hi;
                langSet.add(clean);
                normalizedList.push({
                    ...item,
                    id: item.id || item.wordId || `${item.lang || 'hi'}__${clean}`,
                    wordId: item.wordId || item.id || `${item.lang || 'hi'}__${clean}`,
                    word: rawWord,
                    term: rawWord,
                    lang: item.lang || 'hi'
                });
            }
        });
        state.approvedGlobalBlacklistList = normalizedList;
        try {
            localStorage.setItem('wikilink_approved_global_blacklist_v1', JSON.stringify(normalizedList));
        } catch (e) {}
        renderApprovedBlacklistStrip();
        renderAdminPanelUI();
    }

    function renderApprovedBlacklistStrip() {
        // उपयोगकर्ता के निर्देशानुसार 'एडमिन द्वारा स्वीकृत बहिष्कार शब्द सूची' पट्टी को पृष्ठ आकार बचाने हेतु कभी प्रदर्शित न करें
        const strip = $('approved-blacklist-strip');
        const chipsContainer = $('approved-blacklist-chips');
        if (strip) {
            strip.style.display = 'none';
        }
        if (chipsContainer) {
            chipsContainer.innerHTML = '';
        }
    }

    async function refreshAdminAndApprovedBlacklist(showNotification = false) {
        try {
            if (window.WikiFirebase && window.WikiFirebase.fetchApprovedBlacklistFromFirestore) {
                const approvedWords = await window.WikiFirebase.fetchApprovedBlacklistFromFirestore();
                if (Array.isArray(approvedWords) && approvedWords.length > 0) {
                    applyApprovedBlacklistArray(approvedWords);
                } else {
                    renderApprovedBlacklistStrip();
                }
            } else {
                renderApprovedBlacklistStrip();
            }

            if (window.WikiFirebase && window.WikiFirebase.fetchBlacklistRequestsFromFirestore) {
                const reqs = await window.WikiFirebase.fetchBlacklistRequestsFromFirestore();
                if (Array.isArray(reqs)) {
                    state.blacklistRequestsList = reqs;
                }
            }
            renderAdminPanelUI();
            if (showNotification) {
                showToast('एडमिन पैनल एवं स्वीकृत बहिष्कार सूची अद्यतन हो गई');
            }
        } catch (err) {
            console.warn('Refresh admin & blacklist warning:', err);
            renderApprovedBlacklistStrip();
            renderAdminPanelUI();
        }
    }

    function renderAdminPanelUI() {
        const adminHeaderBtn = $('admin-header-btn');
        const vnavAdminBtn = $('vnav-btn-admin');
        const overviewAdminQuickCard = $('overview-admin-quick-card');
        const adminPanelCard = $('admin-panel-card');
        const pendingBadge = $('admin-pending-badge');
        const pendingCountSpan = $('admin-pending-req-count');
        const requestsTbody = $('admin-requests-tbody');
        const approvedCountSpan = $('admin-approved-words-count');
        const approvedListEl = $('admin-approved-words-list');

        const isAdmin = Boolean(
            currentUser &&
            currentUser.email &&
            currentUser.email.trim().toLowerCase() === 'amankumar.wikimedian@gmail.com' &&
            currentUser.name &&
            (currentUser.name.trim() === 'विक्रम प्रताप' || currentUser.name.trim().includes('विक्रम प्रताप'))
        );

        // कठोर नियम: केवल सदस्य नाम 'विक्रम प्रताप' एवं ईमेल 'amankumar.wikimedian@gmail.com' के लिए ही प्रोफ़ाइल के अंदर प्रदर्शित करें
        if (!isAdmin) {
            if (adminHeaderBtn) adminHeaderBtn.style.display = 'none';
            if (vnavAdminBtn) vnavAdminBtn.style.display = 'none';
            if (overviewAdminQuickCard) overviewAdminQuickCard.style.display = 'none';
            if (adminPanelCard) adminPanelCard.style.display = 'none';
            return;
        }

        if (adminHeaderBtn) adminHeaderBtn.style.display = 'inline-flex';
        if (vnavAdminBtn) vnavAdminBtn.style.display = 'flex';
        if (overviewAdminQuickCard) overviewAdminQuickCard.style.display = 'flex';
        if (adminPanelCard) adminPanelCard.style.display = 'block';

        const requests = state.blacklistRequestsList || [];
        const pendingReqs = requests.filter(r => r.status === 'pending');
        const approvedReqs = requests.filter(r => r.status === 'approved');
        const rejectedReqs = requests.filter(r => r.status === 'rejected');
        const approvedList = state.approvedGlobalBlacklistList || [];

        if (pendingBadge) pendingBadge.textContent = String(pendingReqs.length);
        if (pendingCountSpan) pendingCountSpan.textContent = String(pendingReqs.length);

        // तार्किक सारांश KPI कार्ड अपडेट करें
        safeSetText('admin-stat-pending', String(pendingReqs.length));
        safeSetText('admin-stat-approved', String(approvedList.length || approvedReqs.length));
        safeSetText('admin-stat-rejected', String(rejectedReqs.length));
        const builtInCount = (NEVER_LINK_WORDS.hi ? NEVER_LINK_WORDS.hi.size : 7479) + approvedList.length;
        safeSetText('admin-stat-global-total', `${builtInCount.toLocaleString('hi-IN')}+`);

        // सामूहिक एक्शन बटन केवल तभी सक्रिय हों जब लंबित अनुरोध हों
        const btnApproveAll = $('btn-admin-approve-all-pending');
        const btnRejectAll = $('btn-admin-reject-all-pending');
        if (btnApproveAll) btnApproveAll.disabled = (pendingReqs.length === 0);
        if (btnRejectAll) btnRejectAll.disabled = (pendingReqs.length === 0);

        if (requestsTbody) {
            const statusFilter = state.adminReqStatusFilter || 'all';
            const reqQuery = (state.adminReqSearchQuery || '').trim().toLowerCase();

            const filteredRequests = requests.filter(req => {
                if (statusFilter !== 'all' && req.status !== statusFilter) return false;
                if (reqQuery) {
                    const w = String(req.word || req.term || '').toLowerCase();
                    const art = String(req.articleTitle || '').toLowerCase();
                    const sender = String(req.requestedByName || '').toLowerCase();
                    const email = String(req.requestedByEmail || '').toLowerCase();
                    if (!w.includes(reqQuery) && !art.includes(reqQuery) && !sender.includes(reqQuery) && !email.includes(reqQuery)) {
                        return false;
                    }
                }
                return true;
            });

            if (filteredRequests.length === 0) {
                requestsTbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">
                            ${requests.length === 0
                                ? 'वर्तमान में सदस्यों द्वारा कोई बहिष्कार अनुरोध लंबित नहीं है।'
                                : 'चयनित स्थिति/खोज छन्नी के अंतर्गत कोई अनुरोध नहीं मिला।'}
                        </td>
                    </tr>
                `;
            } else {
                requestsTbody.innerHTML = filteredRequests.map(req => {
                    const reqId = escapeHtml(String(req.id || req.requestId || ''));
                    const wordDisplay = String(req.word || req.term || '');
                    const reqLang = req.lang || 'hi';
                    const policyDiag = evaluateWordLogicalPolicyForAdmin(wordDisplay, reqLang);

                    const statusPill = req.status === 'approved'
                        ? '<span class="status-pill status-pill-blue">✓ स्वीकृत</span>'
                        : req.status === 'rejected'
                            ? '<span class="status-pill status-pill-red">✕ अस्वीकृत</span>'
                            : '<span class="status-pill status-pill-disambig">⏳ लंबित (Pending)</span>';

                    return `
                        <tr>
                            <td data-label="शब्द"><strong>${escapeHtml(wordDisplay)}</strong></td>
                            <td data-label="भाषा"><span class="compact-lang-badge">${escapeHtml(reqLang)}</span></td>
                            <td data-label="तार्किक नीति निदान">
                                <span class="admin-policy-verdict-badge ${policyDiag.shouldBlacklist ? 'verdict-warn' : 'verdict-ok'}" title="${escapeHtml(policyDiag.summary)}">
                                    ${escapeHtml(policyDiag.shortBadge)}
                                </span>
                            </td>
                            <td data-label="लेख संदर्भ" style="font-size: 0.8rem;">
                                <strong>${escapeHtml(req.articleTitle || '-')}</strong>
                                ${req.reason ? `<div style="color: var(--text-muted); font-size: 0.76rem;">${escapeHtml(req.reason)}</div>` : ''}
                            </td>
                            <td data-label="अनुरोधकर्ता" style="font-size: 0.8rem;">
                                <strong>${escapeHtml(req.requestedByName || 'सदस्य')}</strong>
                                <div style="color: var(--text-muted); font-size: 0.74rem;">${escapeHtml(req.requestedByEmail || '')}</div>
                            </td>
                            <td data-label="स्थिति">${statusPill}</td>
                            <td class="td-actions-cell" data-label="एडमिन निर्णय">
                                ${req.status === 'pending' ? `
                                    <div class="review-action-btns">
                                        <button type="button" class="btn btn-success btn-sm admin-approve-req-btn" data-req-id="${reqId}">✓ सहमति दें</button>
                                        <button type="button" class="btn btn-outline text-danger btn-sm admin-reject-req-btn" data-req-id="${reqId}">✕ अस्वीकार</button>
                                    </div>
                                ` : `<span style="font-size: 0.78rem; color: var(--text-muted);">निर्णय पूर्ण</span>`}
                            </td>
                        </tr>
                    `;
                }).join('');

                requestsTbody.querySelectorAll('.admin-approve-req-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const rId = btn.dataset.reqId;
                        const targetReq = requests.find(item => String(item.id || item.requestId) === rId);
                        if (!targetReq) return;
                        const reqWord = String(targetReq.word || targetReq.term || '');
                        btn.disabled = true;
                        btn.textContent = 'स्वीकृत हो रहा...';
                        try {
                            if (window.WikiFirebase && window.WikiFirebase.approveBlacklistRequestInFirestore) {
                                await window.WikiFirebase.approveBlacklistRequestInFirestore(targetReq);
                            }
                            targetReq.status = 'approved';
                            addWordToLocalApprovedBlacklist({
                                word: reqWord,
                                lang: targetReq.lang || 'hi',
                                approvedBy: 'amankumar.wikimedian@gmail.com'
                            });
                            state.suggestions = state.suggestions.filter(s => s.term.toLowerCase() !== reqWord.toLowerCase());
                            renderSuggestionsTable();
                            if (state.originalWikitext) recalculateModifiedWikitext();
                            renderApprovedBlacklistStrip();
                            renderAdminPanelUI();
                            showToast(`✓ '${reqWord}' को एडमिन की सहमति से बहिष्कार सूची में जोड़ दिया गया!`);
                        } catch (err) {
                            console.warn('Approve error:', err);
                            showToast('स्वीकृत करने में त्रुटि हुई');
                            btn.disabled = false;
                            btn.textContent = '✓ सहमति दें';
                        }
                    });
                });

                requestsTbody.querySelectorAll('.admin-reject-req-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const rId = btn.dataset.reqId;
                        const targetReq = requests.find(item => String(item.id || item.requestId) === rId);
                        if (!targetReq) return;
                        const reqWord = String(targetReq.word || targetReq.term || '');
                        btn.disabled = true;
                        try {
                            if (window.WikiFirebase && window.WikiFirebase.rejectBlacklistRequestInFirestore) {
                                await window.WikiFirebase.rejectBlacklistRequestInFirestore(rId);
                            }
                            targetReq.status = 'rejected';
                            renderAdminPanelUI();
                            showToast(`'${reqWord}' का अनुरोध अस्वीकार किया गया`);
                        } catch (err) {
                            console.warn('Reject error:', err);
                            btn.disabled = false;
                        }
                    });
                });
            }
        }

        if (approvedCountSpan) approvedCountSpan.textContent = String(approvedList.length);
        if (approvedListEl) {
            approvedListEl.style.display = 'none';
            approvedListEl.innerHTML = '';
        }
    }

    function checkPendingRestoredArticle() {
        try {
            const raw = localStorage.getItem('wikilink_restore_article');
            if (!raw) return;
            // केवल तभी लोड करें जब हम कार्यपटल (index.html) पर हों
            if (!DOM.rawWikitextInput && !$('raw-wikitext-input')) return;
            localStorage.removeItem('wikilink_restore_article');
            const item = JSON.parse(raw);
            if (item && item.wikitext) {
                if (DOM.langSelect) DOM.langSelect.value = item.lang || 'hi';
                state.lang = item.lang || 'hi';
                state.pageTitle = item.title || 'अशीर्षक लेख';
                state.originalWikitext = item.wikitext;

                safeSetValue(DOM.pageInput, item.title);
                safeSetValue(DOM.rawWikitextInput, item.wikitext);
                safeSetValue('contaminated-wikitext-output', item.wikitext);
                updateCharCount();
                showToast(`'${item.title}' आपके लॉग इतिहास से कार्यपटल में लोड हो गया!`);
            }
        } catch (e) {
            console.warn('Restore article error:', e);
        }
    }

    function loadUserAndLogsFromStorage() {
        try {
            let savedUser = localStorage.getItem('wikilink_current_user');
            if (!savedUser) {
                const googleSaved = localStorage.getItem('wikilink_google_account');
                if (googleSaved) {
                    savedUser = googleSaved;
                }
            }
            if (savedUser) {
                const parsed = JSON.parse(savedUser);
                if (parsed && String(parsed.role || '').includes('Demo')) {
                    localStorage.removeItem('wikilink_current_user');
                    currentUser = null;
                } else if (parsed && (parsed.name || parsed.email)) {
                    const normEmail = String(parsed.email || '').trim().toLowerCase();
                    const emailKey = getEmailArchiveKey(normEmail);
                    const archivedProfile = getUserProfilesArchiveMap()[emailKey] || null;
                    const normName = String((archivedProfile && archivedProfile.name) || parsed.name || '').trim() || normEmail.split('@')[0];
                    parsed.name = normName;
                    parsed.email = normEmail;
                    parsed.uid = parsed.uid || (archivedProfile && archivedProfile.uid) || '';
                    parsed.avatarIcon = parsed.avatarIcon || (archivedProfile && archivedProfile.avatarIcon) || localStorage.getItem('wikilink_profile_icon') || '📚';
                    parsed.isAdmin = (
                        normEmail === 'amankumar.wikimedian@gmail.com' &&
                        (normName === 'विक्रम प्रताप' || normName.includes('विक्रम प्रताप'))
                    );
                    currentUser = parsed;
                }
            }
        } catch (e) {
            currentUser = null;
        }

        try {
            if (currentUser && currentUser.email) {
                // जब यूज़र लॉगिन हो, तो सख्ती से केवल उसी यूज़र के ईमेल/UID के लॉग लोड करें — किसी अन्य यूज़र या साझा लॉग को कदापि न दिखाएँ!
                userActivityLogs = getSavedUserLogsByEmail(currentUser.email, currentUser.uid);
            } else {
                // अतिथि (Guest) सत्र के लिए केवल अतिथि लॉग लोड करें
                const guestLogsRaw = localStorage.getItem('wikilink_guest_activity_logs');
                const guestLogs = guestLogsRaw ? JSON.parse(guestLogsRaw) : [];
                userActivityLogs = Array.isArray(guestLogs) ? filterLogsStrictlyForUser(guestLogs, null) : [];
            }
        } catch (e) {
            userActivityLogs = [];
        }
    }

    function saveLogsToStorage() {
        try {
            if (currentUser && currentUser.email) {
                const normEmail = String(currentUser.email).trim().toLowerCase();
                const emailKey = getEmailArchiveKey(normEmail);
                const strictlyOwned = filterLogsStrictlyForUser(userActivityLogs, currentUser).map(item => ({
                    ...item,
                    user: normEmail,
                    userEmail: normEmail,
                    ownerId: item.ownerId || currentUser.uid || ''
                }));
                localStorage.setItem(`wikilink_user_logs_${emailKey}`, JSON.stringify(strictlyOwned.slice(0, 80)));
            } else {
                const guestOnly = filterLogsStrictlyForUser(userActivityLogs, null);
                localStorage.setItem('wikilink_guest_activity_logs', JSON.stringify(guestOnly.slice(0, 50)));
            }
        } catch (e) {
            console.warn('Could not save activity logs:', e);
        }
    }

    function logUserActivity(actionType, details = {}) {
        const strId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const userEmail = currentUser && currentUser.email ? String(currentUser.email).trim().toLowerCase() : 'guest';
        const userUid = currentUser && currentUser.uid ? String(currentUser.uid).trim() : '';
        const entry = {
            id: strId,
            logId: strId,
            timestamp: new Date().toLocaleString('hi-IN'),
            user: userEmail,
            userEmail: userEmail,
            ownerId: userUid,
            action: actionType,
            title: details.title || state.pageTitle || 'अशीर्षक लेख',
            lang: details.lang || state.lang || 'hi',
            newLinks: typeof details.newLinks === 'number' ? details.newLinks : 0,
            contaminationsFixed: typeof details.contaminationsFixed === 'number' ? details.contaminationsFixed : 0,
            note: details.note || '',
            wikitext: details.wikitext || ''
        };

        userActivityLogs.unshift(entry);
        userActivityLogs = filterLogsStrictlyForUser(userActivityLogs, currentUser);
        if (userActivityLogs.length > 80) userActivityLogs.pop();
        saveLogsToStorage();
        updateAuthHeaderUI();

        if (currentUser && window.WikiFirebase && window.WikiFirebase.saveActivityLogToFirestore) {
            window.WikiFirebase.saveActivityLogToFirestore(entry).catch((err) => {
                console.warn('Firestore log sync warning:', err);
            });
        }
    }

    function updateAuthHeaderUI() {
        const authTriggerBtn = $('auth-trigger-btn');
        const authLabel = $('auth-btn-label');
        const authDot = $('auth-status-dot');
        const logCountEl = $('header-log-count');
        const headerLogoutBtn = $('header-logout-btn');
        const activeSessionBox = $('auth-active-session-box');
        const activeUserName = $('auth-active-user-name');
        const activeUserEmail = $('auth-active-user-email');

        if (logCountEl) logCountEl.textContent = String(userActivityLogs.length);

        if (currentUser) {
            const userIcon = currentUser.avatarIcon || localStorage.getItem('wikilink_profile_icon') || '📚';
            // जब यूज़र खाते में लॉगिन हो तो उसके नाम पर क्लिक करके ही सीधे विशेष प्रोफ़ाइल (logs.html) खुल जाए
            if (authTriggerBtn) {
                authTriggerBtn.setAttribute('href', 'logs.html');
                authTriggerBtn.href = 'logs.html';
                authTriggerBtn.setAttribute('title', `${currentUser.name} — अपने नाम पर क्लिक करके प्रोफ़ाइल व लॉग खोलें`);
            }
            if (authLabel) authLabel.textContent = `${userIcon} ${currentUser.name}`;
            if (authDot) authDot.classList.add('logged-in');
            if (headerLogoutBtn) headerLogoutBtn.style.display = 'inline-flex';
            if (activeSessionBox) activeSessionBox.style.display = 'flex';
            if (activeUserName) activeUserName.textContent = `${userIcon} ${currentUser.name} (प्रोफ़ाइल खोलें ↗)`;
            if (activeUserEmail) activeUserEmail.textContent = currentUser.email;

            // केवल लॉग-इन यूज़र को ही प्रोफ़ाइल/लॉग संबंधी लिंक दिखाएँ
            document.querySelectorAll('[data-auth-only]').forEach(el => {
                el.style.display = '';
            });
        } else {
            // जब यूज़र लॉगिन नहीं है तो नाम की जगह लॉगिन बटन रहे और प्रोफ़ाइल व लॉग का विकल्प न दिया जाए
            if (authTriggerBtn) {
                authTriggerBtn.setAttribute('href', 'login.html');
                authTriggerBtn.href = 'login.html';
                authTriggerBtn.setAttribute('title', 'लॉगिन या साइन अप पेज खोलें');
            }
            if (authLabel) authLabel.textContent = 'लॉगिन / साइन अप';
            if (authDot) authDot.classList.remove('logged-in');
            if (headerLogoutBtn) headerLogoutBtn.style.display = 'none';
            if (activeSessionBox) activeSessionBox.style.display = 'none';

            // लॉग-आउट स्थिति में सभी प्रोफ़ाइल व लॉग विकल्प छुपा दें
            document.querySelectorAll('[data-auth-only]').forEach(el => {
                el.style.display = 'none';
            });
        }
        renderAdminPanelUI();
    }

    function renderUserDashboard(searchQuery = '') {
        const avatarEl = $('user-dash-avatar');
        const mainAvatarIconEl = $('profile-main-avatar-icon');
        const nameEl = $('user-dash-name');
        const bannerNameEl = $('anime-banner-user-name');
        const usernameInput = $('profile-username-input');
        const emailEl = $('user-dash-email');
        const badgeEl = $('user-dash-status-badge');
        const loginBtn = $('user-dash-login-btn');
        const logoutBtn = $('user-dash-logout-btn');
        const guestLockScreen = $('anime-guest-lock-screen');
        const authProfileShell = $('anime-profile-authenticated-shell');

        if (currentUser) {
            if (guestLockScreen) guestLockScreen.style.display = 'none';
            if (authProfileShell) authProfileShell.style.display = 'grid';

            const userIcon = currentUser.avatarIcon || localStorage.getItem('wikilink_profile_icon') || '📚';
            const iconTitle = PROFILE_ICON_OPTIONS[userIcon] || 'ज्ञानकोश विद्वान';

            if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
            if (mainAvatarIconEl) mainAvatarIconEl.textContent = userIcon;
            if (nameEl) nameEl.textContent = currentUser.name;
            if (bannerNameEl) bannerNameEl.textContent = currentUser.name;
            if (usernameInput && document.activeElement !== usernameInput) {
                usernameInput.value = currentUser.name;
            }
            const labelBadgeEl = $('selected-icon-label-badge');
            if (labelBadgeEl) labelBadgeEl.textContent = `चयनित: ${iconTitle}`;
            const bannerCrestEl = $('banner-selected-icon-crest');
            if (bannerCrestEl) bannerCrestEl.textContent = `${userIcon} ${iconTitle}`;
            document.querySelectorAll('.profile-icon-option-btn[data-profile-icon]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.profileIcon === userIcon);
            });

            if (emailEl) emailEl.textContent = `${currentUser.email} • ${currentUser.role || 'विकिपीडिया संपादक'}`;
            if (badgeEl) {
                badgeEl.className = 'badge badge-success';
                badgeEl.textContent = currentUser.isAdmin ? '🛡️ मुख्य प्रशासक (Admin सक्रिय)' : '✓ लॉगिन सक्रिय (डेटा सिंक)';
            }
            if (loginBtn) loginBtn.textContent = '🔑 खाता बदलें';
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        } else {
            // यदि यूज़र लॉगिन नहीं है और सीधे logs.html पर आता है तो प्रोफ़ाइल छुपाकर लॉक स्क्रीन दिखाएँ
            if (guestLockScreen) guestLockScreen.style.display = 'block';
            if (authProfileShell) authProfileShell.style.display = 'none';

            if (avatarEl) avatarEl.textContent = 'वि';
            if (nameEl) nameEl.textContent = 'लॉगिन आवश्यक';
            if (bannerNameEl) bannerNameEl.textContent = 'सदस्य';
            if (emailEl) emailEl.textContent = 'कृपया प्रोफ़ाइल व लॉग देखने हेतु अपने खाते में लॉगिन करें';
            if (badgeEl) {
                badgeEl.className = 'badge badge-tool';
                badgeEl.textContent = 'लॉगिन आवश्यक';
            }
            if (loginBtn) loginBtn.textContent = '🔑 लॉगिन / साइन अप पेज खोलें';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }

        const ownerTagEl = $('user-logs-owner-tag');
        const ownerSubEl = $('user-logs-owner-subtext');
        if (currentUser && currentUser.email) {
            if (ownerTagEl) ownerTagEl.textContent = `🔒 निजी लॉग: ${currentUser.name} (${currentUser.email})`;
            if (ownerSubEl) ownerSubEl.textContent = `${currentUser.name} द्वारा कार्यपटल में विश्लेषित लेखों एवं संशोधनों का व्यक्तिगत इतिहास (केवल आपके खाते हेतु दृश्यमान):`;
        } else {
            if (ownerTagEl) ownerTagEl.textContent = '🔒 केवल वर्तमान सत्र के लॉग';
            if (ownerSubEl) ownerSubEl.textContent = 'कार्यपटल में आपके द्वारा विश्लेषित लेखों का व्यक्तिगत इतिहास:';
        }

        const tbody = $('user-logs-tbody');
        if (!tbody) return;

        // सख्त सत्यापन: रेंडर करते समय भी केवल वर्तमान यूज़र के स्वामित्व वाले लॉग ही दिखाएँ
        const strictlyUserLogs = filterLogsStrictlyForUser(userActivityLogs, currentUser);
        const q = (searchQuery || '').trim().toLowerCase();
        const filtered = q
            ? strictlyUserLogs.filter(l =>
                (l.title || '').toLowerCase().includes(q) ||
                (l.action || '').toLowerCase().includes(q) ||
                (l.lang || '').toLowerCase().includes(q) ||
                (l.note || '').toLowerCase().includes(q)
            )
            : strictlyUserLogs;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
                        ${currentUser
                            ? `सदस्य <strong>${escapeHtml(currentUser.name)}</strong> (${escapeHtml(currentUser.email)}) के खाते में अभी कोई गतिविधि लॉग नहीं है। जब आप कार्यपटल में लेखों का विश्लेषण करेंगे, तो केवल आपके लॉग यहाँ सहेजे जाएंगे।`
                            : 'कोई गतिविधि लॉग नहीं मिला। जब आप कार्यपटल में लेखों का विश्लेषण करेंगे, तो उनका रिकॉर्ड यहाँ स्वतः सहेजा जाएगा।'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(log => {
            const safeId = escapeHtml(String(log.logId || log.id));
            return `
            <tr>
                <td data-label="समय" style="font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap;">${escapeHtml(log.timestamp)}</td>
                <td data-label="क्रिया"><span class="badge badge-tool">${escapeHtml(log.action)}</span></td>
                <td data-label="लेख एवं भाषा"><strong>${escapeHtml(log.title)}</strong> <span class="compact-lang-badge">${escapeHtml(log.lang || 'hi')}</span></td>
                <td data-label="परिणाम सारांश" style="font-size: 0.8rem;">
                    ${Number(log.newLinks) > 0 ? `<span style="color: var(--accent-green); font-weight: 700;">+${log.newLinks} कड़ियाँ</span> ` : ''}
                    ${Number(log.contaminationsFixed) > 0 ? `<span style="color: var(--accent-orange); font-weight: 600;">(${log.contaminationsFixed} दोष शुद्ध)</span> ` : ''}
                    <span style="color: var(--text-muted);">${escapeHtml(log.note || '')}</span>
                </td>
                <td class="td-actions-cell" data-label="क्रियाएँ">
                    <div class="log-row-actions">
                        ${log.wikitext ? `
                            <button type="button" class="btn btn-primary btn-sm restore-log-btn" data-log-id="${safeId}" title="इस लेख को मुख्य कार्यपटल में खोलें">
                                कार्यपटल में खोलें
                            </button>
                            <button type="button" class="btn btn-outline btn-sm copy-log-btn" data-log-id="${safeId}" title="विकिटेक्स्ट क्लिपबोर्ड पर कॉपी करें">
                                कॉपी
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-outline text-danger btn-sm delete-log-btn" data-log-id="${safeId}" title="यह लॉग प्रविष्टि हटाएँ">
                            ✕
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        // 1. कार्यपटल में खोलें (String-safe ID matching + Cross-page redirect to index.html)
        tbody.querySelectorAll('.restore-log-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rawLogId = String(btn.dataset.logId || '');
                const found = userActivityLogs.find(item => String(item.id) === rawLogId || String(item.logId) === rawLogId);
                if (!found || !found.wikitext) {
                    showToast('इस लॉग प्रविष्टि में विकिटेक्स्ट उपलब्ध नहीं है');
                    return;
                }

                localStorage.setItem('wikilink_restore_article', JSON.stringify(found));

                // यदि हम पहले से index.html पर हैं तो सीधे लोड करें, अन्यथा index.html पर जाएँ
                if (DOM.rawWikitextInput || $('raw-wikitext-input')) {
                    checkPendingRestoredArticle();
                    const wb = $('dual-workbench-container');
                    if (wb) wb.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    window.location.href = 'index.html';
                }
            });
        });

        // 2. विकिटेक्स्ट कॉपी करें
        tbody.querySelectorAll('.copy-log-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const rawLogId = String(btn.dataset.logId || '');
                const found = userActivityLogs.find(item => String(item.id) === rawLogId || String(item.logId) === rawLogId);
                if (!found || !found.wikitext) return;
                try {
                    await navigator.clipboard.writeText(found.wikitext);
                    showToast(`'${found.title}' का विकिटेक्स्ट क्लिपबोर्ड पर कॉपी हो गया!`);
                } catch (err) {
                    showToast('कॉपी करने में त्रुटि हुई');
                }
            });
        });

        // 3. एकल लॉग प्रविष्टि हटाएँ (Local + Firestore)
        tbody.querySelectorAll('.delete-log-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const rawLogId = String(btn.dataset.logId || '');
                userActivityLogs = userActivityLogs.filter(
                    item => String(item.id) !== rawLogId && String(item.logId) !== rawLogId
                );
                saveLogsToStorage();
                updateAuthHeaderUI();
                renderUserDashboard(searchQuery);
                if (window.WikiFirebase && window.WikiFirebase.deleteSingleActivityLogInFirestore) {
                    try {
                        await window.WikiFirebase.deleteSingleActivityLogInFirestore(rawLogId);
                    } catch (e) {}
                }
                showToast('लॉग प्रविष्टि हटा दी गई');
            });
        });
    }

    function exportUserLogsJson() {
        const payload = {
            exportedAt: new Date().toISOString(),
            user: currentUser || { mode: 'guest' },
            totalLogs: userActivityLogs.length,
            logs: userActivityLogs
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wikilink_user_logs_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('यूज़र लॉग्स JSON फ़ाइल डाउनलोड हुई');
    }

    // सुरक्षित रूप से DOM लोड होने पर आरंभ करें
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();


