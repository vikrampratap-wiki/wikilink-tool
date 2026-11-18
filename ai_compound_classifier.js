// ====================================================================
// विकीलिंक सहायक (WikiLink Assistant) — स्थानीय एआई संयुक्त पद विश्लेषक
// Local AI Compound Cohesion Classifier (Zero-Token, Client-Side Free NLP Engine)
// 100% Offline Machine Learning & Syntactic Cohesion Scoring
// Decides between Unified Compound Entities vs. Separate Individual Word Links
// ====================================================================

(function(global) {
    'use strict';

    // संस्थागत, प्रशासनिक एवं ज्ञानकोशीय अखंडित शीर्ष पद (Institutional & Compound Heads)
    const INSTITUTIONAL_HEADS = new Set([
        'मंत्रालय', 'मन्त्रालय', 'विभाग', 'आयोग', 'परिषद', 'परिषद्', 'परिषदें',
        'प्राधिकरण', 'न्यायालय', 'अधिकरण', 'न्यायाधिकरण', 'ट्रिब्यूनल', 'पीठ',
        'विश्वविद्यालय', 'महाविद्यालय', 'संस्थान', 'अकादमी', 'प्रयोगशाला', 'वेधशाला',
        'बोर्ड', 'निगम', 'संगठन', 'मुख्यालय', 'सचिवालय', 'निदेशालय', 'अस्पताल',
        'उद्यान', 'अभयारण्य', 'अभ्यारण्य', 'पर्वतमाला', 'पर्वत', 'पठार', 'घाटी', 'दर्रा',
        'द्वीपसमूह', 'द्वीप', 'प्रायद्वीप', 'महासागर', 'सागर', 'खाड़ी', 'झील', 'नहर',
        'जलप्रपात', 'हिमनद', 'मरुस्थल', 'रेगिस्तान', 'जैवमंडल', 'जीवमंडल', 'आरक्षित',
        'एक्सप्रेसवे', 'राजमार्ग', 'परियोजना', 'योजना', 'मिशन', 'अभियान', 'सत्याग्रह',
        'आंदोलन', 'आन्दोलन', 'विद्रोह', 'युद्ध', 'संधि', 'समझौता', 'अधिनियम', 'विधेयक',
        'संहिता', 'संविधान', 'सभा', 'सदन', 'संसद', 'विधानसभा', 'विधानपरिषद', 'लोकसभा', 'राज्यसभा', 'सरकार', 'बैंक', 'सेना', 'पुलिस', 'दल', 'पार्टी',
        'संघ', 'महासंघ', 'कोष', 'निधि', 'ट्रस्ट', 'फाउंडेशन', 'समिति', 'आयुक्त', 'महानिदेशक',
        'राष्ट्रपति', 'उपराष्ट्रपति', 'उप-राष्ट्रपति', 'प्रधानमंत्री', 'प्रधानमन्त्री', 'उपप्रधानमंत्री', 'उपप्रधानमन्त्री',
        'मुख्यमंत्री', 'मुख्यमन्त्री', 'उपमुख्यमंत्री', 'उपमुख्यमन्त्री', 'राज्यपाल', 'उपराज्यपाल', 'सांसद', 'विधायक',
        'न्यायाधीश', 'महान्यायवादी', 'महाधिवक्ता', 'महालेखापरीक्षक', 'नियंत्रक', 'लोकपाल', 'लोकायुक्त',
        'केन्द्र', 'केंद्र', 'अनुसंधान', 'पुस्तकालय', 'ग्रंथालय', 'ग्रन्थालय', 'संग्रहालय',
        'विद्यापीठ', 'गुरुकुल', 'प्रतिष्ठान', 'न्यास',
        'पुरस्कार', 'सम्मान', 'पदक', 'रत्न', 'विभूषण', 'भूषण', 'चक्र',
        'उपनिषद', 'उपनिषद्', 'पुराण', 'स्मृति', 'सूत्र', 'भाष्य', 'ग्रंथ', 'ग्रन्थ', 'महाकाव्य', 'काव्य', 'चरित', 'दर्पण',
        'घोषणा', 'उद्घोषणा', 'संकल्प',
        // मंदिर, दुर्ग, स्मारक व स्थापत्य शीर्ष (Monuments & Cultural Architecture)
        'मंदिर', 'मन्दिर', 'मस्जिद', 'गुरुद्वारा', 'गिरजाघर', 'गिरिजाघर', 'चर्च', 'स्तूप', 'मठ', 'किला', 'क़िला', 'महल', 'दुर्ग',
        // क्रांतियां, ऐतिहासिक युग व काल (Revolutions & Historical Epochs)
        'क्रांति', 'क्रान्ति', 'संग्राम', 'सदी', 'शताब्दी', 'दशक', 'युग', 'काल',
        // चुनाव, संसद व प्रशासनिक निकाय (Elections & Governance)
        'चुनाव', 'उपचुनाव', 'निर्वाचन', 'मंत्रिमंडल', 'मन्त्रिमण्डल', 'मंत्रिपरिषद', 'मन्त्रिपरिषद', 'नगरपालिका', 'नगरनिगम', 'पंचायत',
        // सम्मेलन, समारोह व आयोजन (Conventions & Events)
        'सम्मेलन', 'समारोह', 'महोत्सव', 'संगोष्ठी', 'अधिवेशन',
        // महामारी व स्वास्थ्य परिघटनाएं (Epidemics)
        'महामारी',
        // प्रमुख राष्ट्रीय संस्थान व परिवर्णी शब्द (Premier Institutes & Acronyms)
        'आईआईटी', 'आईआईएम', 'एनआईटी', 'एम्स', 'आईसर', 'आईआईएससी', 'IIT', 'IIM', 'NIT', 'AIIMS',
        // परिवहन व अवसंरचना शीर्ष (Transit & Infrastructure)
        'हवाईअड्डा', 'हवाई अड्डा', 'हवाईअड्डे', 'विमानक्षेत्र', 'स्टेशन', 'जंक्शन', 'सेतु', 'पुल',
        // विद्यालय, कॉलेज व शिक्षण संस्थान (Schools & Educational Institutes)
        'विद्यालय', 'कॉलेज', 'स्कूल', 'पाठशाला', 'मदरसा',
        // अन्वेषण, जांच व सुरक्षा एजेंसियां/ब्यूरो (Investigation & Intelligence Agencies)
        'ब्यूरो', 'एजेंसी', 'एजेन्सी', 'अन्वेषण',
        // पत्तन, बंदरगाह, क्रीड़ांगन व अन्य अवसंरचना (Ports, Stadiums & Observatories)
        'विमानपत्तन', 'पत्तन', 'बंदरगाह', 'बन्दरगाह', 'स्टेडियम', 'मैदान', 'चिड़ियाघर', 'तारामंडल', 'तारामण्डल'
    ]);

    // संबंधबोधक एवं सम्बद्ध योजक परसर्ग (Tatpurusha & Relational Postpositions)
    const TATPURUSHA_CONNECTORS = new Set(['का', 'के', 'की', 'से', 'में', 'पर', 'द्वारा', 'हेतु', 'सहित', 'युक्त']);

    // समुच्चयबोधक योजक (Coordinating Conjunctions)
    const COORDINATING_CONJUNCTIONS = new Set(['और', 'तथा', 'एवं', 'व', 'या', 'अथवा']);

    // उच्च-सम्बद्धता प्रशासनिक एवं ज्ञानकोशीय विशेषण / पूर्वपद (High-Affinity Modifiers)
    const COMPOUND_MODIFIERS = new Set([
        'भारतीय', 'राष्ट्रीय', 'अंतरराष्ट्रीय', 'केन्द्रीय', 'केंद्रीय', 'राज्य', 'लोक',
        'सर्वोच्च', 'उच्चतम', 'उच्च', 'प्रधान', 'मुख्य', 'सड़क', 'परिवहन', 'राजमार्ग',
        'औद्योगिक', 'वैज्ञानिक', 'अंतरिक्ष', 'पर्यावरण', 'वन', 'जलवायु', 'ऊर्जा',
        'परमाणु', 'विधि', 'न्याय', 'गृह', 'रक्षा', 'वित्त', 'मानव', 'स्वास्थ्य',
        'परिवार', 'कल्याण', 'रेल', 'वायु', 'जल', 'कृषि', 'ग्रामीण', 'विकास', 'नागरिक',
        'सामाजिक', 'न्यायिक', 'आर्थिक', 'सांस्कृतिक', 'ऐतिहासिक', 'आयुर्विज्ञान', 'चिकित्सा',
        'प्रौद्योगिकी', 'प्रबंधन', 'समुद्र', 'सूचना', 'संचार', 'सतर्कता', 'मानवाधिकार',
        'महिला', 'बाल', 'वाणिज्य', 'उद्योग', 'श्रम', 'रोजगार', 'शिक्षा', 'संसदीय', 'निर्वाचन',
        'विदेश', 'अखिल', 'संयुक्त', 'लोकसभा', 'राज्यसभा', 'क्रांतिकारी', 'मध्यकालीन',
        'प्राचीन', 'आधुनिक', 'धार्मिक', 'दार्शनिक', 'आम'
    ]);

    // भौगोलिक एवं भू-राजनीतिक समन्वित संयुक्त पद (Coordinated Geopolitical Entities)
    const COORDINATED_GEOPOLITICAL_ENTITIES = new Set([
        'जम्मू एवं कश्मीर', 'जम्मू और कश्मीर', 'जम्मू व कश्मीर', 'जम्मू तथा कश्मीर', 'जम्मू कश्मीर', 'जम्मू-कश्मीर',
        'दादरा एवं नगर हवेली', 'दादरा और नगर हवेली', 'दादरा व नगर हवेली', 'दादरा तथा नगर हवेली', 'दादरा नगर हवेली', 'दादरा-नगर हवेली',
        'दमन एवं दीव', 'दमन और दीव', 'दमन व दीव', 'दमन तथा दीव', 'दमन दीव', 'दमन-दीव',
        'अंडमान एवं निकोबार', 'अंडमान और निकोबार', 'अंडमान व निकोबार', 'अंडमान तथा निकोबार', 'अंडमान निकोबार', 'अंडमान-निकोबार',
        'अंडमान एवं निकोबार द्वीपसमूह', 'अंडमान और निकोबार द्वीपसमूह', 'अंडमान व निकोबार द्वीपसमूह', 'अंडमान तथा निकोबार द्वीपसमूह',
        'अंडमान निकोबार द्वीपसमूह', 'अंडमान-निकोबार द्वीपसमूह',
        'त्रिनिदाद एवं टोबैगो', 'त्रिनिदाद और टोबैगो', 'त्रिनिदाद व टोबैगो', 'त्रिनिदाद टोबैगो', 'त्रिनिदाद-टोबैगो',
        'एंटीगुआ एवं बारबुडा', 'एंटीगुआ और बारबुडा', 'एंटीगुआ व बारबुडा',
        'बॉस्निया एवं हर्ज़ेगोविना', 'बॉस्निया और हर्ज़ेगोविना', 'बॉस्निया व हर्ज़ेगोविना', 'बॉस्निया हर्ज़ेगोविना', 'बॉस्निया-हर्ज़ेगोविना',
        'साओ तोमे एवं प्रिंसीपे', 'साओ टोमे और प्रिंसिपे',
        'सेंट विंसेंट एवं ग्रेनेडाइंस', 'सेंट विंसेंट और ग्रेनेडाइंस',
        'सेंट किट्स एवं नेविस', 'सेंट किट्स और नेविस',
        'सर्बिया एवं मोंटेनेग्रो', 'सर्बिया और मोंटेनेग्रो'
    ]);

    // कला, साहित्यिक कृति व शीर्षक संदर्भ सूचक शब्द (Titular & Cultural Context Triggers)
    const TITULAR_CONTEXT_WORDS = new Set([
        'फिल्म', 'फ़िल्म', 'सिनेमा', 'चलचित्र', 'गीत', 'गाना', 'एलबम', 'एल्बम',
        'धारावाहिक', 'नाटक', 'एकांकी', 'पुस्तक', 'किताब', 'उपन्यास', 'कहानी',
        'कविता', 'काव्य', 'महाकाव्य', 'ग्रंथ', 'ग्रन्थ', 'रचना', 'कृति', 'पत्रिका',
        'समाचारपत्र', 'अखबार', 'अख़बार', 'नारा', 'शीर्षक', 'नामक', 'नामी'
    ]);

    /**
     * Detect if a candidate phrase is used in a titular creative work context.
     * @param {string} phrase - Candidate phrase.
     * @param {string} [context=''] - Surrounding text context.
     * @returns {boolean} True if titular context is detected.
     */
    function detectTitularContext(phrase, context = '') {
        if (!phrase || !context || typeof context !== 'string') return false;
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // उद्धरण चिह्नों में होना ('phrase' या "phrase" या ‘phrase’ या “phrase” या «phrase»)
        const quoteRegex = new RegExp(`['"‘“«]${escaped}['"’”»]`, 'u');
        if (quoteRegex.test(context)) return true;

        // संदर्भ में आसपास कला/साहित्यिक कृति सूचक शब्द होना
        const idx = context.indexOf(phrase);
        if (idx !== -1) {
            const windowText = context.substring(Math.max(0, idx - 45), Math.min(context.length, idx + phrase.length + 45));
            const words = windowText.split(/[\s,.'":;!?-]+/).filter(Boolean);
            if (words.some(w => TITULAR_CONTEXT_WORDS.has(w))) return true;
        }
        return false;
    }

    // प्रशासकीय एवं संस्थागत शासी शीर्ष पद जो पूरे संयुक्त पद को नियंत्रित करते हैं (Governing Institutional Heads)
    const GOVERNING_INSTITUTIONAL_HEADS = new Set([
        'मंत्रालय', 'मन्त्रालय', 'विभाग', 'आयोग', 'परिषद', 'परिषद्', 'परिषदें',
        'प्राधिकरण', 'न्यायालय', 'अधिकरण', 'न्यायाधिकरण', 'ट्रिब्यूनल', 'पीठ',
        'विश्वविद्यालय', 'महाविद्यालय', 'संस्थान', 'अकादमी', 'प्रयोगशाला', 'वेधशाला',
        'बोर्ड', 'निगम', 'संगठन', 'मुख्यालय', 'सचिवालय', 'निदेशालय', 'अस्पताल',
        'केंद्र', 'केन्द्र', 'समिति', 'आयुक्त', 'महानिदेशक', 'ट्रस्ट', 'फाउंडेशन',
        'दल', 'पार्टी', 'संघ', 'महासंघ', 'कोष', 'निधि', 'प्रतिष्ठान',
        'बैंक', 'एजेंसी', 'एजेन्सी', 'ब्यूरो', 'विद्यालय', 'कॉलेज'
    ]);

    // स्वतंत्र संस्थागत/प्रशासनिक शीर्ष पद जो किसी घटक को पूर्ण स्वायत्त इकाई बनाते हैं (Autonomous Entity Heads)
    const AUTONOMOUS_HEADS = new Set([
        ...GOVERNING_INSTITUTIONAL_HEADS,
        'सरकार', 'सेना', 'पुलिस', 'संसद', 'विधानसभा', 'विधानपरिषद', 'लोकसभा', 'राज्यसभा',
        'राष्ट्रपति', 'उपराष्ट्रपति', 'उप-राष्ट्रपति', 'प्रधानमंत्री', 'प्रधानमन्त्री',
        'उपप्रधानमंत्री', 'उपप्रधानमन्त्री', 'मुख्यमंत्री', 'मुख्यमन्त्री', 'उपमुख्यमंत्री', 'उपमुख्यमन्त्री',
        'राज्यपाल', 'उपराज्यपाल', 'सांसद', 'विधायक', 'न्यायाधीश', 'महान्यायवादी', 'महाधिवक्ता',
        'मंदिर', 'मन्दिर', 'मस्जिद', 'गुरुद्वारा', 'गिरजाघर', 'गिरिजाघर', 'चर्च', 'स्तूप', 'मठ',
        'किला', 'क़िला', 'महल', 'दुर्ग', 'महामारी', 'क्रांति', 'क्रान्ति', 'संग्राम', 'सदी', 'शताब्दी',
        'आईआईटी', 'आईआईएम', 'एनआईटी', 'एम्स', 'आईसर', 'आईआईएससी', 'IIT', 'IIM', 'NIT', 'AIIMS'
    ]);

    /**
     * Determines whether a phrase with an internal conjunction is a unified institutional entity
     * (e.g. 'सड़क परिवहन एवं राजमार्ग मंत्रालय', 'वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद')
     * as opposed to an accidental conjunction of two distinct nouns/institutions
     * (e.g. 'सेना और पुलिस', 'विश्वविद्यालय और महाविद्यालय', 'सर्वोच्च न्यायालय और उच्च न्यायालय', 'केंद्र सरकार और राज्य सरकार').
     * @param {string[]|string} words - Component words or phrase.
     * @returns {boolean}
     */
    function isCoordinatedInstitutionalCompound(words) {
        if (!words) return false;
        const list = Array.isArray(words)
            ? words
            : (typeof words === 'string' ? words.trim().split(/[\s\-–—]+/) : []);
        const cleanWords = list.map(w => (typeof w === 'string' ? w.replace(/^[,;'"‘“«»”’]+|[,;'"‘“«»”’]+$/g, '') : '')).filter(Boolean);
        if (cleanWords.length < 4) return false;

        const lastWord = cleanWords[cleanWords.length - 1];
        if (!GOVERNING_INSTITUTIONAL_HEADS.has(lastWord)) return false;

        const conjIdx = cleanWords.findIndex(w => COORDINATING_CONJUNCTIONS.has(w));
        if (conjIdx === -1) return false;

        // योजक शब्द प्रथम पद के बाद (conjIdx >= 1) तथा अंतिम शासी शीर्ष से कम-से-कम एक शब्द पूर्व होना चाहिए
        if (conjIdx < 1 || conjIdx >= cleanWords.length - 2) return false;

        // यदि योजक शब्द से पहले कोई स्वायत्त संस्थागत शीर्ष पद मौजूद है (उदा: 'सर्वोच्च न्यायालय और उच्च न्यायालय', 'केंद्र सरकार और राज्य सरकार'),
        // तो यह दो स्वतंत्र संस्थाओं का संयोजन है, न कि एक अखंड संस्थागत निकाय।
        const wordsBeforeConj = cleanWords.slice(0, conjIdx);
        if (wordsBeforeConj.some(w => AUTONOMOUS_HEADS.has(w))) return false;

        // यदि योजक शब्द और अंतिम शासी शीर्ष के बीच कोई अन्य स्वायत्त शीर्ष पद उपस्थित है, तो भी पृथक करें
        const wordsBetween = cleanWords.slice(conjIdx + 1, cleanWords.length - 1);
        if (wordsBetween.some(w => AUTONOMOUS_HEADS.has(w))) return false;

        return true;
    }

    /**
     * Compute Hindi/Sanskrit Samas Syntactic Features.
     * @param {string} phrase - Candidate phrase.
     * @returns {Object} Samas feature representation.
     */
    function computeSamasFeatures(phrase) {
        if (!phrase || typeof phrase !== 'string' || !phrase.trim() || !/[\p{L}\p{N}]/u.test(phrase)) {
            return { samasType: 'NONE', weight: 0.10, label: 'अमान्य पद' };
        }
        const clean = phrase.trim().replace(/\s+/g, ' ');
        const words = clean.split(/[\s\-–—]+/).filter(Boolean);

        if (words.length <= 1) {
            return { samasType: 'SINGLE_WORD', weight: 0.15, label: 'एकल शब्द' };
        }

        if (COORDINATED_GEOPOLITICAL_ENTITIES.has(clean)) {
            return {
                samasType: 'COORDINATED_GEOPOLITICAL_COMPOUND',
                weight: 0.95,
                label: 'भौगोलिक एवं भू-राजनीतिक संयुक्त अखंड पद'
            };
        }

        const hasInstitutionalHead = words.some(w => INSTITUTIONAL_HEADS.has(w));
        const hasConjunction = words.some(w => COORDINATING_CONJUNCTIONS.has(w));
        const hasTatpurusha = words.some(w => TATPURUSHA_CONNECTORS.has(w));
        const hasModifier = words.some(w => COMPOUND_MODIFIERS.has(w));

        if (hasConjunction) {
            if (isCoordinatedInstitutionalCompound(words)) {
                return {
                    samasType: 'COORDINATED_INSTITUTIONAL_DVANDVA',
                    weight: 0.95,
                    label: 'आंतरिक योजक युक्त संयुक्त संस्थागत नाम'
                };
            }
            return {
                samasType: 'ACCIDENTAL_DVANDVA',
                weight: 0.15,
                label: 'स्वतंत्र सामान्य संज्ञाओं का आकस्मिक योजक'
            };
        }

        if (hasTatpurusha) {
            if (hasInstitutionalHead) {
                return {
                    samasType: 'TATPURUSHA',
                    weight: 0.90,
                    label: 'संबंध कारक योजक युक्त तत्पुरुष समास'
                };
            }
            if (hasModifier) {
                return {
                    samasType: 'TATPURUSHA_MODIFIER',
                    weight: 0.80,
                    label: 'विशेषण सम्बद्ध तत्पुरुष समास'
                };
            }
            return {
                samasType: 'GENITIVE_COLLOCATION',
                weight: 0.35,
                label: 'सामान्य संबंध कारक पद'
            };
        }

        if (hasInstitutionalHead) {
            return {
                samasType: 'INSTITUTIONAL_KARMADHARAYA',
                weight: 0.90,
                label: 'संस्थागत/प्रशासनिक कर्मधारय समास'
            };
        }

        if (hasModifier) {
            return {
                samasType: 'MODIFIER_COMPOUND',
                weight: 0.75,
                label: 'विशेषण-विशेष्य सामासिक पद'
            };
        }

        return {
            samasType: 'GENERAL_COLLOCATION',
            weight: 0.35,
            label: 'सामान्य बहु-शब्द पद'
        };
    }

    /**
     * Compute local Pointwise Mutual Information (PMI) cohesion estimate.
     * @param {string} phrase - Candidate multi-word phrase.
     * @param {string} [context=''] - Surrounding context text.
     * @returns {number} Normalized PMI cohesion score between 0.05 and 0.98.
     */
    function computePmiCohesion(phrase, context = '') {
        if (!phrase || typeof phrase !== 'string' || !phrase.trim() || !/[\p{L}\p{N}]/u.test(phrase)) return 0.0;
        const clean = phrase.trim().replace(/\s+/g, ' ');
        const words = clean.split(/[\s\-–—]+/).filter(Boolean);
        if (words.length <= 1) return 0.15;

        if (COORDINATED_GEOPOLITICAL_ENTITIES.has(clean)) {
            return 0.95;
        }

        const hasInstitutionalHead = words.some(w => INSTITUTIONAL_HEADS.has(w));
        const hasConjunction = words.some(w => COORDINATING_CONJUNCTIONS.has(w));

        // यदि समुच्चयबोधक है: केवल तभी उच्च सम्बद्धता जब शासी संस्थागत शीर्ष हो अथवा कला/कृति संदर्भ हो
        if (hasConjunction) {
            if (isCoordinatedInstitutionalCompound(words)) {
                return 0.90;
            }
            if (detectTitularContext(clean, context)) {
                return 0.88;
            }
            return 0.15;
        }

        let pmi = 0.50; // तटस्थ आधार
        let bigramMatches = 0;

        for (let i = 0; i < words.length - 1; i++) {
            const w1 = words[i];
            const w2 = words[i + 1];

            if (COMPOUND_MODIFIERS.has(w1) && (INSTITUTIONAL_HEADS.has(w2) || COMPOUND_MODIFIERS.has(w2))) {
                bigramMatches += 1.5;
            } else if (TATPURUSHA_CONNECTORS.has(w1) && INSTITUTIONAL_HEADS.has(w2)) {
                bigramMatches += 1.5;
            } else if (INSTITUTIONAL_HEADS.has(w2)) {
                bigramMatches += 1.0;
            }
        }

        pmi += Math.min(0.40, bigramMatches * 0.15);

        // संदर्भ में सह-उपस्थिति संकेत
        if (context && typeof context === 'string') {
            const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const occurrences = (context.match(new RegExp(escaped, 'g')) || []).length;
            if (occurrences > 1) {
                pmi += 0.08;
            }
        }

        return parseFloat(Math.min(0.98, Math.max(0.05, pmi)).toFixed(2));
    }

    /**
     * Compute N-gram Transition Scoring across consecutive tokens.
     * @param {string} phrase - Candidate multi-word phrase.
     * @returns {number} Transition scoring probability between 0.05 and 0.98.
     */
    function computeNgramTransitions(phrase) {
        if (!phrase || typeof phrase !== 'string' || !phrase.trim() || !/[\p{L}\p{N}]/u.test(phrase)) return 0.0;
        const clean = phrase.trim().replace(/\s+/g, ' ');
        const words = clean.split(/[\s\-–—]+/).filter(Boolean);
        if (words.length <= 1) return 0.15;

        if (COORDINATED_GEOPOLITICAL_ENTITIES.has(clean)) {
            return 0.95;
        }

        const hasConjunction = words.some(w => COORDINATING_CONJUNCTIONS.has(w));
        if (hasConjunction && !isCoordinatedInstitutionalCompound(words)) {
            return 0.15;
        }

        let transitionsSum = 0;
        const transitionsCount = words.length - 1;

        for (let i = 0; i < transitionsCount; i++) {
            const w1 = words[i];
            const w2 = words[i + 1];

            if (COORDINATING_CONJUNCTIONS.has(w2)) {
                transitionsSum += isCoordinatedInstitutionalCompound(words) ? 0.85 : 0.15;
            } else if (TATPURUSHA_CONNECTORS.has(w2)) {
                transitionsSum += 0.85;
            } else if (TATPURUSHA_CONNECTORS.has(w1)) {
                transitionsSum += INSTITUTIONAL_HEADS.has(w2) ? 0.92 : 0.70;
            } else if (INSTITUTIONAL_HEADS.has(w2)) {
                transitionsSum += 0.90;
            } else if (COMPOUND_MODIFIERS.has(w1)) {
                transitionsSum += 0.82;
            } else {
                transitionsSum += 0.45;
            }
        }

        const avg = transitionsSum / transitionsCount;
        return parseFloat(Math.min(0.98, Math.max(0.05, avg)).toFixed(2));
    }

    /**
     * Compute cohesive binding score and classification for candidate phrase.
     * Zero-token, 100% offline client-side decision.
     * @param {string} phrase - Multi-word phrase to evaluate.
     * @param {string} [context=''] - Surrounding clause/sentence text.
     * @param {Object} [options={}] - Custom options (threshold, knownDictionarySet, verifiedTitlesMap).
     * @returns {Object} Analysis decision object.
     */
    function classifyCompoundCohesion(phrase, context = '', options = {}) {
        try {
            if (!phrase || typeof phrase !== 'string' || !phrase.trim() || !/[\p{L}\p{N}]/u.test(phrase)) {
                return {
                    phrase: typeof phrase === 'string' ? phrase.trim() : '',
                    decision: 'SEPARATE',
                    isCompound: false,
                    score: 0.0,
                    confidence: '0%',
                    compoundConfidence: '0%',
                    separationConfidence: '100%',
                    badgeText: '[AI: 100% पृथक]',
                    category: 'INVALID',
                    reason: 'अमान्य अथवा रिक्त इनपुट',
                    features: {
                        pmiCohesion: 0.0,
                        samasType: 'NONE',
                        ngramTransition: 0.0,
                        hasInstitutionalHead: false,
                        hasTatpurusha: false,
                        hasConjunction: false
                    }
                };
            }

            const cleanPhrase = phrase.trim().replace(/\s+/g, ' ');
            const words = cleanPhrase.split(/[\s\-–—]+/).filter(Boolean);

            const threshold = typeof options.threshold === 'number' ? options.threshold : 0.60;
            const root = (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null));
            const knownDictionary = options.knownDictionarySet || (root && root.COMPOUND_TERMS_SET ? root.COMPOUND_TERMS_SET : null);
            const verifiedTitles = options.verifiedTitlesMap || (root && root.OFFLINE_VERIFIED_WIKI_TITLES ? root.OFFLINE_VERIFIED_WIKI_TITLES : null);

            // 0. समन्वित भौगोलिक एवं भू-राजनीतिक संयुक्त पद (Coordinated Geopolitical Entities)
            if (COORDINATED_GEOPOLITICAL_ENTITIES.has(cleanPhrase)) {
                return {
                    phrase: cleanPhrase,
                    decision: 'COMPOUND',
                    isCompound: true,
                    score: 0.95,
                    confidence: '95%',
                    compoundConfidence: '95%',
                    separationConfidence: '5%',
                    badgeText: '[AI: 95% संयुक्त]',
                    category: 'COORDINATED_GEOPOLITICAL_COMPOUND',
                    reason: 'भौगोलिक एवं भू-राजनीतिक संयुक्त अखंड पद',
                    features: {
                        pmiCohesion: 0.95,
                        samasType: 'COORDINATED_GEOPOLITICAL_COMPOUND',
                        ngramTransition: 0.95,
                        hasInstitutionalHead: true,
                        hasTatpurusha: false,
                        hasConjunction: true
                    }
                };
            }

            // 0.5 शब्दकोष प्रत्यक्ष सत्यापन (Direct Dictionary Verification Signal)
            const cleanNoComma = cleanPhrase.replace(/,/g, '');
            if (
                (knownDictionary && (knownDictionary.has(cleanPhrase) || knownDictionary.has(cleanNoComma))) ||
                (verifiedTitles && (verifiedTitles.has(cleanPhrase) || verifiedTitles.has(cleanNoComma)))
            ) {
                return {
                    phrase: cleanPhrase,
                    decision: 'COMPOUND',
                    isCompound: true,
                    score: 0.98,
                    confidence: '98%',
                    compoundConfidence: '98%',
                    separationConfidence: '2%',
                    badgeText: '[AI: 98% संयुक्त]',
                    category: 'VERIFIED_COMPOUND_DICTIONARY',
                    reason: 'प्रमाणित विश्वकोशीय संयुक्त पद कोष से सत्यापित',
                    features: {
                        pmiCohesion: 0.95,
                        samasType: 'VERIFIED_DICTIONARY',
                        ngramTransition: 0.95,
                        hasInstitutionalHead: words.some(w => INSTITUTIONAL_HEADS.has(w)),
                        hasTatpurusha: words.some(w => TATPURUSHA_CONNECTORS.has(w)),
                        hasConjunction: words.some(w => COORDINATING_CONJUNCTIONS.has(w))
                    }
                };
            }

            if (words.length <= 1) {
                return {
                    phrase: cleanPhrase,
                    decision: 'SEPARATE',
                    isCompound: false,
                    score: 0.15,
                    confidence: '85%',
                    compoundConfidence: '15%',
                    separationConfidence: '85%',
                    badgeText: '[AI: 85% पृथक]',
                    category: 'SINGLE_WORD',
                    reason: 'एकल शब्द — स्वतंत्र कड़ी योग्य',
                    features: {
                        pmiCohesion: 0.15,
                        samasType: 'SINGLE_WORD',
                        ngramTransition: 0.15,
                        hasInstitutionalHead: INSTITUTIONAL_HEADS.has(cleanPhrase),
                        hasTatpurusha: false,
                        hasConjunction: false
                    }
                };
            }

            const hasInstitutionalHead = words.some(w => INSTITUTIONAL_HEADS.has(w));
            const hasConjunction = words.some(w => COORDINATING_CONJUNCTIONS.has(w));
            const hasTatpurusha = words.some(w => TATPURUSHA_CONNECTORS.has(w));

            // 2. सांख्यिकीय एवं व्याकरणिक घटक परिकलन
            const samas = computeSamasFeatures(cleanPhrase);
            const pmiScore = computePmiCohesion(cleanPhrase, context);
            const transitionScore = computeNgramTransitions(cleanPhrase);

            let score = 0.40;
            let category = 'COLLOCATION';
            let reason = samas.label;

            // 3. विशिष्ट श्रेणी नियम
            if (hasConjunction) {
                if (isCoordinatedInstitutionalCompound(words)) {
                    // उदा: 'सड़क परिवहन एवं राजमार्ग मंत्रालय', 'वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद'
                    score = 0.95;
                    category = 'COORDINATED_INSTITUTIONAL_COMPOUND';
                    reason = 'आंतरिक योजक युक्त संयुक्त संस्थागत नाम';
                } else if (detectTitularContext(cleanPhrase, context)) {
                    // उदा: फिल्म 'सीता और गीता', उपन्यास 'गोदान'
                    score = 0.92;
                    category = 'TITULAR_WORK_COMPOUND';
                    reason = 'संदर्भ में कला/साहित्यिक कृति अथवा विशिष्ट शीर्षक के रूप में प्रयुक्त';
                } else {
                    // उदा: 'राम और श्याम', 'नदी और पहाड़', 'गेहूं और चावल', 'सेना और पुलिस'
                    score = 0.15;
                    category = 'ACCIDENTAL_CONJUNCTION';
                    reason = 'स्वतंत्र संकल्पनाओं का आकस्मिक योजक — पृथक कड़ीकरण अनुशंसित';
                }
            } else if (hasTatpurusha) {
                if (hasInstitutionalHead) {
                    // उदा: 'भारत के राष्ट्रपति', 'संविधान की प्रस्तावना', 'बंगाल की खाड़ी', '1857 की क्रांति'
                    score = 0.95;
                    category = 'TATPURUSHA_COMPOUND';
                    reason = 'सम्बद्ध कारक योजक युक्त सामासिक पद';
                } else if (words.some(w => COMPOUND_MODIFIERS.has(w))) {
                    // उदा: 'केंद्रीय सरकार के कर्मचारी'
                    score = 0.85;
                    category = 'TATPURUSHA_COMPOUND';
                    reason = 'विशेषण सम्बद्ध कारक सामासिक पद';
                } else {
                    // सामान्य संबंध कारक पद (उदा: 'राम का घर', 'पेड़ की शाखा', 'नदी का किनारा')
                    score = (0.45 * samas.weight) + (0.35 * pmiScore) + (0.20 * transitionScore);
                    category = 'GENITIVE_COLLOCATION';
                    reason = samas.label;
                }
            } else if (hasInstitutionalHead) {
                // उदा: 'सर्वोच्च न्यायालय', 'लोक सभा', 'उत्तर प्रदेश सरकार', 'संसद पुस्तकालय', 'अनुसंधान केंद्र', 'स्वर्ण मंदिर', 'लाल किला'
                score = 0.92;
                category = 'INSTITUTIONAL_ENTITY';
                reason = 'संवैधानिक, प्रशासनिक अथवा ज्ञानकोशीय संस्थागत पद';
            } else {
                // सामान्य बहु-शब्द पद: सामासिक भार, PMI व N-gram का भारित औसत
                score = (0.45 * samas.weight) + (0.35 * pmiScore) + (0.20 * transitionScore);
                category = samas.samasType;
                reason = samas.label;
            }

            score = Math.min(0.98, Math.max(0.05, score));
            const isCompound = score >= threshold;
            const decision = isCompound ? 'COMPOUND' : 'SEPARATE';
            const compoundConfidence = Math.round(score * 100) + '%';
            const separationConfidence = isCompound ? (Math.round((1 - score) * 100) + '%') : (Math.max(50, Math.round((1 - score) * 100)) + '%');
            const confidence = isCompound ? compoundConfidence : separationConfidence;
            const badgeText = isCompound ? `[AI: ${compoundConfidence} संयुक्त]` : `[AI: ${separationConfidence} पृथक]`;

            return {
                phrase: cleanPhrase,
                decision: decision,
                isCompound: isCompound,
                score: parseFloat(score.toFixed(2)),
                confidence: confidence,
                compoundConfidence: compoundConfidence,
                separationConfidence: separationConfidence,
                badgeText: badgeText,
                category: category,
                reason: reason,
                features: {
                    pmiCohesion: pmiScore,
                    samasType: samas.samasType,
                    ngramTransition: transitionScore,
                    hasInstitutionalHead,
                    hasTatpurusha,
                    hasConjunction
                }
            };
        } catch (e) {
            // शून्य विफलता गारंटी: किसी भी त्रुटि की स्थिति में सुरक्षित फॉलबैक
            return {
                phrase: String(phrase || ''),
                decision: 'SEPARATE',
                isCompound: false,
                score: 0.15,
                confidence: '85%',
                compoundConfidence: '15%',
                separationConfidence: '85%',
                badgeText: '[AI: 85% पृथक]',
                category: 'FALLBACK',
                reason: 'त्रुटि-रहित सुरक्षित फॉलबैक',
                features: {
                    pmiCohesion: 0.15,
                    samasType: 'FALLBACK',
                    ngramTransition: 0.15,
                    hasInstitutionalHead: false,
                    hasTatpurusha: false,
                    hasConjunction: false
                }
            };
        }
    }

    const AiCompoundClassifier = {
        classify: classifyCompoundCohesion,
        computeSamasFeatures,
        computePmiCohesion,
        computeNgramTransitions,
        detectTitularContext,
        isCoordinatedInstitutionalCompound,
        AUTONOMOUS_HEADS,
        GOVERNING_INSTITUTIONAL_HEADS,
        INSTITUTIONAL_HEADS,
        TATPURUSHA_CONNECTORS,
        COORDINATING_CONJUNCTIONS,
        COMPOUND_MODIFIERS,
        COORDINATED_GEOPOLITICAL_ENTITIES,
        TITULAR_CONTEXT_WORDS
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AiCompoundClassifier;
    }
    if (typeof window !== 'undefined') {
        window.AiCompoundClassifier = AiCompoundClassifier;
    } else if (typeof global !== 'undefined') {
        global.AiCompoundClassifier = AiCompoundClassifier;
    }
})(typeof window !== 'undefined' ? window : this);
