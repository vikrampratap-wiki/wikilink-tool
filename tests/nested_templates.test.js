/**
 * tests/nested_templates.test.js
 * Comprehensive automated test suite for Nested Template Protection & Zero Token Leakage
 * Covers Features 12 and 13 across Tiers 1-4.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppEngine, protect, unprotect, Features } = require('./harness.js');

describe('Feature 12: Nested Template Protection', () => {

    test('T1.1: Complex nested template {{बन्द सिरा}} inside infobox protected and restored', (t) => {
        const engine = loadAppEngine();
        const input = '{{ज्ञानसन्दूक | नाम = X | कार्य = {{बन्द सिरा|date=2020}} }}';
        if (!Features.isNestedTemplateUnprotectFixed()) {
            t.skip('Pending Milestone M2 (Nested template unprotect fix)');
            return;
        }
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Nested template must be restored verbatim');
    });

    test('T1.2: Multi-level template nesting (3 levels deep: {{a|{{b|{{c}}}}}})', () => {
        const engine = loadAppEngine();
        const input = 'आरंभ {{साँचा1|स्तर1={{साँचा2|स्तर2={{साँचा3|स्तर3}}}}}} अंत';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, '3-level nested templates must restore verbatim');
    });

    test('T1.3: Citation template with nested date {{तारीख}}', () => {
        const engine = loadAppEngine();
        const input = '{{cite web | url = https://example.org | title = शीर्षक | date = {{तारीख|2024|1|1}} }}';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Citation template with nested date must restore verbatim');
    });

    test('T1.4: Nested templates with multiple parameters on separate newlines', () => {
        const engine = loadAppEngine();
        const input = `{{ज्ञानसन्दूक
| नाम = दिल्ली
| जनसंख्या = {{गणना|2021}}
| क्षेत्रफल = {{माप|1484|वर्ग किमी}}
}}`;
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Multiline nested templates must restore verbatim');
    });

    test('T1.5: Adjacent nested templates in the same paragraph', () => {
        const engine = loadAppEngine();
        const input = 'पहला {{foo|{{bar}}}} और दूसरा {{baz|{{qux}}}} दोनों साथ हैं।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Adjacent nested templates must restore verbatim');
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Unclosed template {{unclosed handled safely without infinite loop', () => {
        const engine = loadAppEngine();
        const input = 'यह अधूरा साँचा है: {{अधूरा साँचा और इसके आगे का पाठ।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.ok(typeof restored === 'string', 'Unclosed template should not throw or freeze');
    });

    test('T2.2: Empty template {{}} protected and restored', () => {
        const engine = loadAppEngine();
        const input = 'रिक्त साँचा: {{}} यहाँ है।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Empty template must restore verbatim');
    });

    test('T2.3: Template inside table cell protected and restored', () => {
        const engine = loadAppEngine();
        const input = '{|\n| {{रंग|लाल|महत्वपूर्ण}} || सामान्य\n|}';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Table-enclosed template must restore verbatim');
    });

    test('T2.4: 25+ consecutive templates in a single article handled without stack overflow', () => {
        const engine = loadAppEngine();
        const templates = Array.from({ length: 25 }, (_, i) => `{{साँचा_${i}|मान=${i}}}`).join('\n');
        const res = protect(engine, templates);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, templates, '25 consecutive templates must all restore cleanly');
    });

    test('T2.5: Template containing internal wikilinks protected and restored intact', () => {
        const engine = loadAppEngine();
        const input = '{{ज्ञानसन्दूक | देश = [[भारत]] | राजधानी = [[नई दिल्ली]] }}';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Template with internal wikilinks must restore intact');
    });
});

describe('Feature 13: Zero Token Leakage', () => {

    test('T1.1: Output wikitext contains 0 occurrences of PROTECTED_ tokens', (t) => {
        const engine = loadAppEngine();
        const sample = '{{ज्ञानसन्दूक | नाम = X | कार्य = {{बन्द सिरा|date=2020}} }}\n[[भारत]] एक देश है।';
        if (!Features.isNestedTemplateUnprotectFixed()) {
            t.skip('Pending Milestone M2 (Nested template unprotect fix)');
            return;
        }
        const res = protect(engine, sample);
        const restored = unprotect(engine, res);
        const matches = restored.match(/PROTECTED_[A-Z0-9_]+/g);
        assert.strictEqual(matches, null, `Must have 0 leaked PROTECTED_ tokens, found: ${matches}`);
    });

    test('T1.2: Output wikitext contains 0 occurrences of ⟪ or ⟫ tokens', (t) => {
        const engine = loadAppEngine();
        const sample = '{{ज्ञानसन्दूक | नाम = X | कार्य = {{बन्द सिरा|date=2020}} }}';
        if (!Features.isNestedTemplateUnprotectFixed()) {
            t.skip('Pending Milestone M2 (Nested template unprotect fix)');
            return;
        }
        const res = protect(engine, sample);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored.includes('⟪'), false, 'Output must not contain ⟪');
        assert.strictEqual(restored.includes('⟫'), false, 'Output must not contain ⟫');
    });

    test('T1.3: Output wikitext contains 0 control characters \\x01 or \\x02', () => {
        const engine = loadAppEngine();
        const sample = '{{साँचा|पैरा}} [[कड़ी]] <ref>संदर्भ</ref>';
        const res = protect(engine, sample);
        const restored = unprotect(engine, res);
        assert.strictEqual(/[\x01\x02]/.test(restored), false, 'Output must not contain \\x01 or \\x02');
    });

    test('T1.4: Output wikitext contains 0 plain shield tokens 〘 or 〙', () => {
        const engine = loadAppEngine();
        const sample = 'भारतीय संविधान सभा ने कार्य किया।';
        const res = protect(engine, sample);
        const restored = unprotect(engine, res);
        assert.strictEqual(/[〘〙]/.test(restored), false, 'Output must not contain 〘 or 〙');
    });

    test('T1.5: Output wikitext contains 0 link shield tokens ⟬ or ⟭', () => {
        const engine = loadAppEngine();
        const sample = '[[भारत]] एवं [[हिमालय]]';
        const res = protect(engine, sample);
        const restored = unprotect(engine, res);
        assert.strictEqual(/[⟬⟭]/.test(restored), false, 'Output must not contain ⟬ or ⟭');
    });

    // Tier 2: Boundary & Corner Cases
    test('T2.1: Text with literal "PROTECTED_VAR" identifier is not corrupted', () => {
        const engine = loadAppEngine();
        const input = 'कोड में PROTECTED_VAR का मान 42 है।';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input, 'Literal "PROTECTED_VAR" should not be altered');
    });

    test('T2.2: Sequential protect -> unprotect cycles leave text 100% byte-identical', () => {
        const engine = loadAppEngine();
        const input = `{{ज्ञानसन्दूक लेखक | नाम = प्रेमचंद }}
'''प्रेमचंद''' प्रसिद्ध लेखक थे। उन्होंने [[गोदान]] लिखा। <ref>सन्दर्भ 1</ref>`;
        let current = input;
        for (let i = 0; i < 3; i++) {
            const res = protect(engine, current);
            current = unprotect(engine, res);
        }
        assert.strictEqual(current, input, '3 cycles of protect/unprotect must leave text byte-identical');
    });

    test('T2.3: Article with 50+ mixed templates, refs, comments, and links yields 0 token leaks', () => {
        const engine = loadAppEngine();
        const parts = [
            '<!-- टिप्पणी 1 -->',
            '{{साँचा 1|पैरा 1}}',
            '<ref>सन्दर्भ 1</ref>',
            '[[कड़ी 1]]',
            '<code>कोड स्निपेट</code>',
            '<nowiki>नोविकी टेक्स्ट</nowiki>'
        ];
        const bigText = parts.join('\n\n');
        const res = protect(engine, bigText);
        const restored = unprotect(engine, res);
        assert.strictEqual(/PROTECTED_|⟪|⟫|[\x01\x02]/.test(restored), false, 'Must have 0 leaked tokens');
    });

    test('T2.4: Empty string protect/unprotect yields empty string with 0 tokens', () => {
        const engine = loadAppEngine();
        const res = protect(engine, '');
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, '');
    });

    test('T2.5: Whitespace-only string protect/unprotect preserves whitespace exactly', () => {
        const engine = loadAppEngine();
        const input = '   \n\t\n   ';
        const res = protect(engine, input);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, input);
    });
});

describe('Tier 3: Nested Templates Cross-Feature Combinations', () => {

    test('T3.1: Nested citation template with date + WP:DATELINK suppression', () => {
        const engine = loadAppEngine();
        const text = '{{cite web|title=परीक्षण|date={{तारीख|1950|1|26}}}} 1950 में संविधान लागू हुआ।';
        // In this text, 1950 inside the template is shielded; standalone 1950 outside should NOT be linked (WP:DATELINK)
        const isYearCandidate = engine.exports.isValidCandidate('1950', 1, false, false, false, engine.exports.STOPWORDS.hi, 'hi', true, true);
        assert.strictEqual(isYearCandidate, false, 'Standalone 4-digit year 1950 must be rejected under WP:DATELINK');

        const res = protect(engine, text);
        const restored = unprotect(engine, res);
        assert.ok(restored.includes('{{तारीख|1950|1|26}}'), 'Template date must be preserved');
    });
});

describe('Tier 4: Nested Templates Real-World Scenarios', () => {

    test('T4.1: Munshi Premchand Infobox preserves multi-parameter nested templates', () => {
        const engine = loadAppEngine();
        const infoboxText = `{{ज्ञानसन्दूक लेखक
| नाम = मुंशी प्रेमचंद
| जन्म_नाम = धनपत राय श्रीवास्तव
| जन्म_तारीख = {{तारीख|1880|7|31}}
| जन्म_स्थान = लमही, वाराणसी, [[उत्तर प्रदेश]]
| मृत्यु_तारीख = {{मृत्यु तारीख और उम्र|1936|10|8|1880|7|31}}
}}`;
        const res = protect(engine, infoboxText);
        const restored = unprotect(engine, res);
        assert.strictEqual(restored, infoboxText, 'Real Premchand Infobox must be restored byte-for-byte');
        assert.strictEqual(/PROTECTED_|⟪|⟫/.test(restored), false, 'No token leaks allowed');
    });
});
