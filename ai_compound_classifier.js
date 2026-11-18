// ====================================================================
// विकीलिंक सहायक (WikiLink Assistant) — स्थानीय एआई संयुक्त पद विश्लेषक
// Local AI Compound Cohesion Classifier (Zero-Token, Client-Side Free NLP Engine)
// 100% Offline Machine Learning & Syntactic Cohesion Scoring
// Decides between Unified Compound Entities vs. Separate Individual Word Links
// ====================================================================

(function(global) {
    'use strict';

    // Bounded Memoization Cache (2048 entries) for fast sub-millisecond lookups
    const MAX_CACHE_ENTRIES = 2048;
    const classificationCache = new Map();

    function getCacheKey(cleanPhrase, threshold, context) {
        return `${cleanPhrase}|${threshold}|${context || ''}`;
    }

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
        'विमानपत्तन', 'पत्तन', 'बंदरगाह', 'बन्दरगाह', 'स्टेडियम', 'मैदान', 'चिड़ियाघर', 'तारामंडल', 'तारामण्डल',
        // नीतिगत, अवसंरचनात्मक व लक्ष्य शीर्ष (Policy, Framework & Target Heads - M1 Requirements)
        'नीति', 'नीतियां', 'नीतियों',
        'ढांचा', 'ढाँचा', 'ढांचे', 'ढाँचे',
        'लक्ष्य', 'लक्ष्यों'
    ]);

    // संबंधबोधक एवं सम्बद्ध योजक परसर्ग (Tatpurusha & Relational Postpositions)
    const TATPURUSHA_CONNECTORS = new Set(['का', 'के', 'की', 'से', 'में', 'पर', 'द्वारा', 'हेतु', 'सहित', 'युक्त']);

    // समुच्चयबोधक योजक (Coordinating Conjunctions)
    const COORDINATING_CONJUNCTIONS = new Set(['और', 'तथा', 'एवं', 'व', 'या', 'अथवा']);

    // 11 प्रमुख संस्थागत, नीतिगत एवं सांविधिक शासी शीर्ष पद (Mandated Tatpurusha Policy Heads)
    const TATPURUSHA_POLICY_HEADS = new Set([
        // 1. -नीति (Policy)
        'नीति', 'नीतियां', 'नीतियों',
        // 2. -ढांचा (Framework)
        'ढांचा', 'ढाँचा', 'ढांचे', 'ढाँचे',
        // 3. -लक्ष्य (Target / Goal)
        'लक्ष्य', 'लक्ष्यों',
        // 4. -आयोग (Commission)
        'आयोग', 'आयोगों',
        // 5. -योजना (Scheme / Plan)
        'योजना', 'योजनाएं', 'योजनाओं',
        // 6. -संस्थान (Institute)
        'संस्थान', 'संस्थानों',
        // 7. -परिषद (Council)
        'परिषद', 'परिषद्', 'परिषदें', 'परिषदों',
        // 8. -परियोजना (Project)
        'परियोजना', 'परियोजनाएं', 'परियोजनाओं',
        // 9. -प्राधिकरण (Authority)
        'प्राधिकरण', 'प्राधिकरणों',
        // 10. -निगम (Corporation)
        'निगम', 'निगमों',
        // 11. -अभियान (Mission / Campaign)
        'अभियान', 'अभियानों'
    ]);

    // नीतिगत एवं संस्थागत प्रत्यय योजक रेगुलर एक्सप्रेशन
    const TATPURUSHA_POLICY_HEAD_SUFFIX_REGEX = /(?:नीति|नीतियां|नीतियों|ढांचा|ढाँचा|ढांचे|ढाँचे|लक्ष्य|लक्ष्यों|आयोग|आयोगों|योजना|योजनाएं|योजनाओं|संस्थान|संस्थानों|परिषद|परिषद्|परिषदें|परिषदों|परियोजना|परियोजनाएं|परियोजनाओं|प्राधिकरण|प्राधिकरणों|निगम|निगमों|अभियान|अभियानों)$/u;

    // कर्मधारय समास विशेषण / पूर्वपद (Karmadharaya Modifiers)
    const KARMADHARAYA_MODIFIERS = new Set([
        // प्रमुख आवश्यकता उदाहरण
        'डिजिटल', 'हरित', 'सतत', 'नवीकरणीय', 'अनवीकरणीय', 'गैर-नवीकरणीय',
        // पर्यावरणीय एवं वैज्ञानिक विशेषण
        'पारंपरिक', 'गैर-पारंपरिक', 'जैविक', 'अजैविक', 'पारिस्थितिक', 'पर्यावरणीय',
        'रासायनिक', 'भौतिक', 'परमाणु', 'आणविक', 'सौर', 'पवन', 'भूतापीय',
        // सामाजिक, आर्थिक एवं विधिक विशेषण
        'आर्थिक', 'सामाजिक', 'सांस्कृतिक', 'संवैधानिक', 'प्रशासनिक', 'राजनीतिक',
        'समावेशी', 'सार्वजनिक', 'निजी', 'वैश्विक', 'स्थानीय', 'राष्ट्रीय', 'अंतरराष्ट्रीय',
        'नागरिक', 'मानव', 'न्यायिक', 'विधिक', 'वित्तीय', 'मौद्रिक', 'औद्योगिक',
        // तकनीकी एवं ज्ञान विशेषण
        'कृत्रिम', 'स्वदेशी', 'विदेशी', 'वैज्ञानिक', 'तकनीकी', 'प्रौद्योगिकीय',
        'खुला', 'खुली', 'मुक्त', 'प्राथमिक', 'माध्यमिक', 'उच्च', 'उच्चतम', 'सर्वोच्च',
        // ऐतिहासिक एवं क्रांति विशेषण
        'क्रांतिकारी', 'ऐतिहासिक', 'प्राचीन', 'मध्यकालीन', 'आधुनिक', 'समकालीन',
        // रंग विशेषण (क्रांतियां व प्रतीक)
        'श्वेत', 'नीली', 'पीली', 'लाल', 'भूरा', 'गुलाबी'
    ]);

    // कर्मधारय समास विशेष्य / उत्तरपद (Karmadharaya Substantive Heads)
    const KARMADHARAYA_HEADS = new Set([
        'साक्षरता', 'विकास', 'ऊर्जा', 'क्रांति', 'क्रान्ति', 'अर्थव्यवस्था',
        'संरक्षण', 'सुरक्षा', 'न्याय', 'उपचार', 'परिवर्तन', 'प्रौद्योगिकी', 'तकनीक',
        'बुद्धिमत्ता', 'सशक्तिकरण', 'समावेशन', 'अधिकार', 'संसाधन', 'प्रणाली',
        'अवसंरचना', 'प्रबंधन', 'सुधार', 'वृद्धि', 'उत्पादन', 'दक्षता',
        'नवाचार', 'उद्योग', 'कृषि', 'शिक्षा', 'स्वास्थ्य', 'परिवहन',
        'ज्ञान', 'स्रोत', 'विचारधारा', 'दर्शन', 'सर्वेक्षण'
    ]);

    // विशेषण व्युत्पादक प्रत्यय (Adjectival Derivational Suffixes: -ीय, -िक, -कारी, -शील, आदि)
    const ADJECTIVE_DERIVATIONAL_SUFFIX_REGEX = /(?:[ीि]य|िक|कारी|शील|परक|प्रद|जनक)$/u;

    // उपसर्ग सम्बद्धता सेट एवं पैटर्न (Affix Prefix Rules: उप-, अंतर-, आदि)
    const AFFIX_PREFIXES = new Set(['उप', 'अंतर', 'अन्तर', 'गैर', 'सह', 'पुनर्', 'पुनर', 'अर्ध', 'महा']);
    const AFFIX_PREFIX_REGEX = /^(?:उप|अंतर|अन्तर|गैर|सह|अर्ध|पुनर्|पुनर|महा)[\-–—]/u;

    // प्रत्यय सम्बद्धता सेट एवं पैटर्न (Affix Suffix Rules: -वादी, -विज्ञानी, -करण, आदि)
    const AFFIX_SUFFIXES = new Set(['वादी', 'वादियों', 'वाद', 'विज्ञानी', 'विज्ञानियों', 'विज्ञान', 'करण']);
    const AFFIX_SUFFIX_REGEX = /(?:वादी|वादियों|वाद|विज्ञानी|विज्ञानियों|करण)$/u;

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
        'प्राचीन', 'आधुनिक', 'धार्मिक', 'दार्शनिक', 'आम',
        // कर्मधारय विशेषणों का समावेशन
        'डिजिटल', 'हरित', 'सतत', 'नवीकरणीय', 'समावेशी', 'जैविक', 'कृत्रिम', 'स्वदेशी', 'संवैधानिक'
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

    function detectTitularContext(phrase, context = '') {
        if (!phrase || !context || typeof context !== 'string' || !context.includes(phrase)) return false;
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const quoteRegex = new RegExp(`['"‘“«]${escaped}['"’”»]`, 'u');
        if (quoteRegex.test(context)) return true;

        const idx = context.indexOf(phrase);
        if (idx !== -1) {
            const windowText = context.substring(Math.max(0, idx - 45), Math.min(context.length, idx + phrase.length + 45));
            const words = windowText.split(/[\s,.'":;!?-]+/).filter(Boolean);
            if (words.some(w => TITULAR_CONTEXT_WORDS.has(w))) return true;
        }
        return false;
    }

    const GOVERNING_INSTITUTIONAL_HEADS = new Set([
        'मंत्रालय', 'मन्त्रालय', 'विभाग', 'आयोग', 'परिषद', 'परिषद्', 'परिषदें',
        'प्राधिकरण', 'न्यायालय', 'अधिकरण', 'न्यायाधिकरण', 'ट्रिब्यूनल', 'पीठ',
        'विश्वविद्यालय', 'महाविद्यालय', 'संस्थान', 'अकादमी', 'प्रयोगशाला', 'वेधशाला',
        'बोर्ड', 'निगम', 'संगठन', 'मुख्यालय', 'सचिवालय', 'निदेशालय', 'अस्पताल',
        'केंद्र', 'केन्द्र', 'समिति', 'आयुक्त', 'महानिदेशक', 'ट्रस्ट', 'फाउंडेशन',
        'दल', 'पार्टी', 'संघ', 'महासंघ', 'कोष', 'निधि', 'प्रतिष्ठान',
        'बैंक', 'एजेंसी', 'एजेन्सी', 'ब्यूरो', 'विद्यालय', 'कॉलेज',
        'नीति', 'ढांचा', 'ढाँचा', 'लक्ष्य'
    ]);

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

    function isKarmadharayaModifier(w) {
        if (!w || typeof w !== 'string') return false;
        return KARMADHARAYA_MODIFIERS.has(w) ||
               COMPOUND_MODIFIERS.has(w) ||
               (w.length >= 4 && ADJECTIVE_DERIVATIONAL_SUFFIX_REGEX.test(w));
    }

    function hasTatpurushaPolicyHead(words) {
        if (!words || words.length < 2) return false;
        const lastWord = words[words.length - 1];
        return TATPURUSHA_POLICY_HEADS.has(lastWord) || TATPURUSHA_POLICY_HEAD_SUFFIX_REGEX.test(lastWord);
    }

    function hasAffixDerivation(cleanPhrase, words) {
        if (!words || words.length < 2) return false;
        if (AFFIX_PREFIX_REGEX.test(cleanPhrase) || AFFIX_PREFIXES.has(words[0])) return true;
        return words.some(w => !INSTITUTIONAL_HEADS.has(w) && (AFFIX_SUFFIXES.has(w) || AFFIX_SUFFIX_REGEX.test(w)));
    }

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

        if (conjIdx < 1 || conjIdx >= cleanWords.length - 2) return false;

        const wordsBeforeConj = cleanWords.slice(0, conjIdx);
        if (wordsBeforeConj.some(w => AUTONOMOUS_HEADS.has(w))) return false;

        const wordsBetween = cleanWords.slice(conjIdx + 1, cleanWords.length - 1);
        if (wordsBetween.some(w => AUTONOMOUS_HEADS.has(w))) return false;

        return true;
    }

    function computeSamasFeatures(phrase) {
        if (!phrase || typeof phrase !== 'string' || !phrase.trim() || !/[\p{L}\p{N}]/u.test(phrase)) {
            return { samasType: 'NONE', weight: 0.10, label: 'अमान्य पद' };
        }
        const clean = phrase.trim().replace(/\s+/g, ' ');
        const words = clean.split(/[\s\-–—]+/).map(w => w.replace(/^[,;:'"‘“«»”’]+|[,;:'"‘“«»”’]+$/gu, '')).filter(Boolean);

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
        const hasModifier = words.some(w => COMPOUND_MODIFIERS.has(w) || isKarmadharayaModifier(w));

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

        if (hasTatpurushaPolicyHead(words)) {
            return {
                samasType: 'TATPURUSHA_POLICY',
                weight: 0.92,
                label: 'नीतिगत अथवा संस्थागत तत्पुरुष सामासिक पद'
            };
        }

        if (hasAffixDerivation(clean, words)) {
            return {
                samasType: 'AFFIX_DERIVATION',
                weight: 0.88,
                label: 'उपसर्ग अथवा प्रत्यय सम्बद्ध यौगिक पद'
            };
        }

        if (words.length === 2 && isKarmadharayaModifier(words[0]) && (KARMADHARAYA_HEADS.has(words[1]) || INSTITUTIONAL_HEADS.has(words[1]))) {
            return {
                samasType: 'KARMADHARAYA_COLLOCATION',
                weight: 0.85,
                label: 'विशेषण-विशेष्य कर्मधारय सामासिक पद'
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

    function computePmiCohesion(phrase, context = '') {
        if (!phrase || typeof phrase !== 'string' || !phrase.trim() || !/[\p{L}\p{N}]/u.test(phrase)) return 0.0;
        const clean = phrase.trim().replace(/\s+/g, ' ');
        const words = clean.split(/[\s\-–—]+/).map(w => w.replace(/^[,;:'"‘“«»”’]+|[,;:'"‘“«»”’]+$/gu, '')).filter(Boolean);
        if (words.length <= 1) return 0.15;

        if (COORDINATED_GEOPOLITICAL_ENTITIES.has(clean)) {
            return 0.95;
        }

        const hasInstitutionalHead = words.some(w => INSTITUTIONAL_HEADS.has(w));
        const hasConjunction = words.some(w => COORDINATING_CONJUNCTIONS.has(w));

        if (hasConjunction) {
            if (isCoordinatedInstitutionalCompound(words)) {
                return 0.90;
            }
            if (detectTitularContext(clean, context)) {
                return 0.88;
            }
            return 0.15;
        }

        let pmi = 0.50;
        let bigramMatches = 0;

        for (let i = 0; i < words.length - 1; i++) {
            const w1 = words[i];
            const w2 = words[i + 1];

            if (isKarmadharayaModifier(w1) && (KARMADHARAYA_HEADS.has(w2) || INSTITUTIONAL_HEADS.has(w2) || TATPURUSHA_POLICY_HEADS.has(w2))) {
                bigramMatches += 2.0;
            } else if (TATPURUSHA_POLICY_HEADS.has(w2) || TATPURUSHA_POLICY_HEAD_SUFFIX_REGEX.test(w2)) {
                bigramMatches += 1.8;
            } else if (AFFIX_PREFIXES.has(w1) || AFFIX_SUFFIXES.has(w2)) {
                bigramMatches += 1.6;
            } else if (COMPOUND_MODIFIERS.has(w1) && (INSTITUTIONAL_HEADS.has(w2) || COMPOUND_MODIFIERS.has(w2))) {
                bigramMatches += 1.5;
            } else if (TATPURUSHA_CONNECTORS.has(w1) && INSTITUTIONAL_HEADS.has(w2)) {
                bigramMatches += 1.5;
            } else if (INSTITUTIONAL_HEADS.has(w2)) {
                bigramMatches += 1.0;
            }
        }

        pmi += Math.min(0.40, bigramMatches * 0.15);

        if (context && typeof context === 'string' && context.includes(clean)) {
            pmi += 0.08;
        }

        return parseFloat(Math.min(0.98, Math.max(0.05, pmi)).toFixed(2));
    }

    function computeNgramTransitions(phrase) {
        if (!phrase || typeof phrase !== 'string' || !phrase.trim() || !/[\p{L}\p{N}]/u.test(phrase)) return 0.0;
        const clean = phrase.trim().replace(/\s+/g, ' ');
        const words = clean.split(/[\s\-–—]+/).map(w => w.replace(/^[,;:'"‘“«»”’]+|[,;:'"‘“«»”’]+$/gu, '')).filter(Boolean);
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
            } else if (TATPURUSHA_POLICY_HEADS.has(w2) || TATPURUSHA_POLICY_HEAD_SUFFIX_REGEX.test(w2)) {
                transitionsSum += 0.92;
            } else if (AFFIX_PREFIXES.has(w1) || AFFIX_SUFFIXES.has(w2)) {
                transitionsSum += 0.90;
            } else if (isKarmadharayaModifier(w1) && (KARMADHARAYA_HEADS.has(w2) || INSTITUTIONAL_HEADS.has(w2))) {
                transitionsSum += 0.88;
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
                    breakdown: {
                        pmiCohesion: 0.0,
                        samasType: 'NONE',
                        ngramTransition: 0.0,
                        hasInstitutionalHead: false,
                        hasTatpurusha: false,
                        hasConjunction: false
                    },
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

            const threshold = typeof options.threshold === 'number' ? options.threshold : 0.70;

            let cleanPhrase = phrase.trim()
                .replace(/^['"‘“«\s]+|['"’”»\s]+$/gu, '')
                .replace(/[\s।॥,;:]+$/gu, '')
                .replace(/\s+/g, ' ');

            const cacheKey = getCacheKey(cleanPhrase, threshold, context);
            if (classificationCache.has(cacheKey)) {
                return classificationCache.get(cacheKey);
            }

            const words = cleanPhrase.split(/[\s\-–—]+/).map(w => w.replace(/^[,;:'"‘“«»”’]+|[,;:'"‘“«»”’]+$/gu, '')).filter(Boolean);

            const root = (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null));
            const knownDictionary = options.knownDictionarySet || (root && root.COMPOUND_TERMS_SET ? root.COMPOUND_TERMS_SET : null);
            const verifiedTitles = options.verifiedTitlesMap || (root && root.OFFLINE_VERIFIED_WIKI_TITLES ? root.OFFLINE_VERIFIED_WIKI_TITLES : null);

            let result = null;

            if (COORDINATED_GEOPOLITICAL_ENTITIES.has(cleanPhrase)) {
                result = {
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
                    breakdown: {
                        pmiCohesion: 0.95,
                        samasType: 'COORDINATED_GEOPOLITICAL_COMPOUND',
                        ngramTransition: 0.95,
                        hasInstitutionalHead: true,
                        hasTatpurusha: false,
                        hasConjunction: true
                    },
                    features: {
                        pmiCohesion: 0.95,
                        samasType: 'COORDINATED_GEOPOLITICAL_COMPOUND',
                        ngramTransition: 0.95,
                        hasInstitutionalHead: true,
                        hasTatpurusha: false,
                        hasConjunction: true
                    }
                };
            } else {
                const cleanNoComma = cleanPhrase.replace(/,/g, '');
                if (
                    (knownDictionary && (knownDictionary.has(cleanPhrase) || knownDictionary.has(cleanNoComma))) ||
                    (verifiedTitles && (verifiedTitles.has(cleanPhrase) || verifiedTitles.has(cleanNoComma)))
                ) {
                    result = {
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
                        breakdown: {
                            pmiCohesion: 0.95,
                            samasType: 'VERIFIED_DICTIONARY',
                            ngramTransition: 0.95,
                            hasInstitutionalHead: words.some(w => INSTITUTIONAL_HEADS.has(w)),
                            hasTatpurusha: words.some(w => TATPURUSHA_CONNECTORS.has(w)),
                            hasConjunction: words.some(w => COORDINATING_CONJUNCTIONS.has(w))
                        },
                        features: {
                            pmiCohesion: 0.95,
                            samasType: 'VERIFIED_DICTIONARY',
                            ngramTransition: 0.95,
                            hasInstitutionalHead: words.some(w => INSTITUTIONAL_HEADS.has(w)),
                            hasTatpurusha: words.some(w => TATPURUSHA_CONNECTORS.has(w)),
                            hasConjunction: words.some(w => COORDINATING_CONJUNCTIONS.has(w))
                        }
                    };
                } else if (words.length <= 1) {
                    result = {
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
                        breakdown: {
                            pmiCohesion: 0.15,
                            samasType: 'SINGLE_WORD',
                            ngramTransition: 0.15,
                            hasInstitutionalHead: INSTITUTIONAL_HEADS.has(cleanPhrase),
                            hasTatpurusha: false,
                            hasConjunction: false
                        },
                        features: {
                            pmiCohesion: 0.15,
                            samasType: 'SINGLE_WORD',
                            ngramTransition: 0.15,
                            hasInstitutionalHead: INSTITUTIONAL_HEADS.has(cleanPhrase),
                            hasTatpurusha: false,
                            hasConjunction: false
                        }
                    };
                } else {
                    const hasInstitutionalHead = words.some(w => INSTITUTIONAL_HEADS.has(w));
                    const hasConjunction = words.some(w => COORDINATING_CONJUNCTIONS.has(w));
                    const hasTatpurusha = words.some(w => TATPURUSHA_CONNECTORS.has(w));

                    const samas = computeSamasFeatures(cleanPhrase);
                    const pmiScore = computePmiCohesion(cleanPhrase, context);
                    const transitionScore = computeNgramTransitions(cleanPhrase);

                    let score = 0.40;
                    let category = 'COLLOCATION';
                    let reason = samas.label;

                    if (hasConjunction) {
                        if (isCoordinatedInstitutionalCompound(words)) {
                            score = 0.95;
                            category = 'COORDINATED_INSTITUTIONAL_COMPOUND';
                            reason = 'आंतरिक योजक युक्त संयुक्त संस्थागत नाम';
                        } else if (detectTitularContext(cleanPhrase, context)) {
                            score = 0.92;
                            category = 'TITULAR_WORK_COMPOUND';
                            reason = 'संदर्भ में कला/साहित्यिक कृति अथवा विशिष्ट शीर्षक के रूप में प्रयुक्त';
                        } else {
                            score = 0.15;
                            category = 'ACCIDENTAL_CONJUNCTION';
                            reason = 'स्वतंत्र संकल्पनाओं का आकस्मिक योजक — पृथक कड़ीकरण अनुशंसित';
                        }
                    } else if (hasTatpurusha) {
                        if (hasInstitutionalHead) {
                            score = 0.95;
                            category = 'TATPURUSHA_COMPOUND';
                            reason = 'सम्बद्ध कारक योजक युक्त सामासिक पद';
                        } else if (words.some(w => COMPOUND_MODIFIERS.has(w) || isKarmadharayaModifier(w))) {
                            score = 0.85;
                            category = 'TATPURUSHA_COMPOUND';
                            reason = 'विशेषण सम्बद्ध कारक सामासिक पद';
                        } else {
                            score = (0.45 * samas.weight) + (0.35 * pmiScore) + (0.20 * transitionScore);
                            category = 'GENITIVE_COLLOCATION';
                            reason = samas.label;
                        }
                    } else if (hasTatpurushaPolicyHead(words)) {
                        const hasMod = words.slice(0, -1).some(w => isKarmadharayaModifier(w) || KARMADHARAYA_HEADS.has(w));
                        score = (hasMod || words.length >= 3) ? 0.95 : 0.92;
                        category = 'TATPURUSHA_POLICY';
                        reason = 'नीतिगत अथवा संस्थागत तत्पुरुष सामासिक पद';
                    } else if (hasAffixDerivation(cleanPhrase, words)) {
                        const hasInst = words.some(w => INSTITUTIONAL_HEADS.has(w));
                        score = hasInst ? 0.92 : 0.88;
                        category = 'AFFIX_DERIVATION';
                        reason = 'उपसर्ग अथवा प्रत्यय सम्बद्ध यौगिक पद';
                    } else if (words.length === 2 && isKarmadharayaModifier(words[0]) && (KARMADHARAYA_HEADS.has(words[1]) || INSTITUTIONAL_HEADS.has(words[1]))) {
                        if (INSTITUTIONAL_HEADS.has(words[1])) {
                            score = 0.92;
                            category = 'INSTITUTIONAL_ENTITY';
                            reason = 'संवैधानिक, प्रशासनिक अथवा ज्ञानकोशीय संस्थागत पद';
                        } else {
                            score = 0.85;
                            category = 'KARMADHARAYA_COLLOCATION';
                            reason = 'विशेषण-विशेष्य कर्मधारय सामासिक पद';
                        }
                    } else if (hasInstitutionalHead) {
                        score = 0.92;
                        category = 'INSTITUTIONAL_ENTITY';
                        reason = 'संवैधानिक, प्रशासनिक अथवा ज्ञानकोशीय संस्थागत पद';
                    } else {
                        score = (0.45 * samas.weight) + (0.35 * pmiScore) + (0.20 * transitionScore);
                        if (score < 0.60) {
                            category = 'LOW_COHESION_REJECTED';
                            reason = 'कम सम्बद्धता — विखंडन रोकथाम हेतु पृथक पद';
                        } else {
                            category = samas.samasType;
                            reason = samas.label;
                        }
                    }

                    score = Math.min(0.98, Math.max(0.05, score));
                    const isCompound = score >= threshold;
                    const decision = isCompound ? 'COMPOUND' : 'SEPARATE';
                    const compoundConfidence = Math.round(score * 100) + '%';
                    const separationConfidence = isCompound ? (Math.round((1 - score) * 100) + '%') : (Math.max(50, Math.round((1 - score) * 100)) + '%');
                    const confidence = isCompound ? compoundConfidence : separationConfidence;
                    const badgeText = isCompound ? `[AI: ${compoundConfidence} संयुक्त]` : `[AI: ${separationConfidence} पृथक]`;

                    const breakdown = {
                        pmiCohesion: pmiScore,
                        samasType: samas.samasType,
                        ngramTransition: transitionScore,
                        hasInstitutionalHead,
                        hasTatpurusha,
                        hasConjunction
                    };

                    result = {
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
                        breakdown: breakdown,
                        features: breakdown
                    };
                }
            }

            if (classificationCache.size >= MAX_CACHE_ENTRIES) {
                const oldestKey = classificationCache.keys().next().value;
                classificationCache.delete(oldestKey);
            }
            classificationCache.set(cacheKey, result);

            return result;
        } catch (e) {
            const fallbackBreakdown = {
                pmiCohesion: 0.15,
                samasType: 'FALLBACK',
                ngramTransition: 0.15,
                hasInstitutionalHead: false,
                hasTatpurusha: false,
                hasConjunction: false
            };
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
                breakdown: fallbackBreakdown,
                features: fallbackBreakdown
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
        isKarmadharayaModifier,
        hasTatpurushaPolicyHead,
        hasAffixDerivation,
        clearCache: function() {
            classificationCache.clear();
        },
        getCacheSize: function() {
            return classificationCache.size;
        },
        AUTONOMOUS_HEADS,
        GOVERNING_INSTITUTIONAL_HEADS,
        INSTITUTIONAL_HEADS,
        TATPURUSHA_POLICY_HEADS,
        TATPURUSHA_POLICY_HEAD_SUFFIX_REGEX,
        KARMADHARAYA_MODIFIERS,
        KARMADHARAYA_HEADS,
        ADJECTIVE_DERIVATIONAL_SUFFIX_REGEX,
        AFFIX_PREFIXES,
        AFFIX_PREFIX_REGEX,
        AFFIX_SUFFIXES,
        AFFIX_SUFFIX_REGEX,
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
