# Test Infrastructure Specification: wikilink-tool

**Author**: E2E Test Suite Writer (`teamwork_preview_test_writer`)  
**Project**: `wikilink-tool`  
**Test Framework**: Native Node.js `node:test` and `node:assert/strict` (Zero npm dependencies)  
**Node Version Supported**: Node v24+  

---

## 1. Test Architecture & Design Principles

The automated test infrastructure for `wikilink-tool` is designed with the following core principles:

1. **Zero External Dependencies**: All test suites execute natively using Node.js built-in modules (`node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:vm`, `node:child_process`). No external packages (such as Jest, Mocha, or Chai) are required.
2. **Browser Isolation via VM Sandbox (`tests/harness.js`)**: `app.js` is an IIFE designed for browser environments. The test harness provisions a lightweight, null-safe DOM and `window` mock inside a sandboxed V8 execution context (`node:vm`). Internal functions (`protectWikitextStructures`, `unprotectWikitext`, `isValidCandidate`, `isNonLinkableWord`, `applyReplacements`, etc.) are exposed directly to tests without altering source code on disk.
3. **Progressive Testability**: During parallel multi-agent milestone execution (M1 through M4), tests for unimplemented features cleanly detect milestone readiness and skip pending features with descriptive diagnostics. When milestone implementations are complete, tests automatically execute and assert compliance. Setting `STRICT=1` forces unconditional execution of all assertions.
4. **Authoritative Specification Derivation**: Every test case derives its expected behavior directly from Wikipedia Manual of Style guidelines (WP:LINK, WP:OVERLINKING, WP:NOTLINKED, WP:DISAMBIG, WP:DATELINK, WP:CIRCULAR) and explicit project contracts in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

---

## 2. The 4-Tier Test Methodology

The test suite enforces a rigorous 4-tier verification hierarchy across all **21 Features**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        4-Tier Test Methodology                         │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Feature Coverage (>=5 test cases per feature for all 21 feats) │
│ - Happy-path functional verification of core interface contracts       │
│ - Strict input/output assertion validation                             │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary & Corner Cases (>=5 test cases per feature)           │
│ - Zero, empty, single-character, and extreme scale inputs              │
│ - Oblique inflections, combining matras, and unicode edge cases       │
│ - Punctuation adjacency, unclosed tags, and malformed structures       │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Cross-Feature Combinations                                     │
│ - Pairwise feature interactions across pipeline stages                 │
│ - Nested templates + compound terms + sub-word shielding               │
│ - Whitelist priority over blacklist in simulation                     │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Real-World Wikipedia Application Scenarios                     │
│ - Full pipeline evaluation on authentic Wikipedia Hindi text:          │
│   1. Munshi Premchand (मुंशी प्रेमचंद) Literary Lead & Infobox          │
│   2. Constitution of India (भारत का संविधान) Legal & Civic Lead         │
│   3. Himalayas (हिमालय) Geography & Mountain Range Infobox             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Test Suites Directory Layout (`tests/`)

| Test File | Primary Features Covered | T1 Tests | T2 Tests | T3 Tests | T4 Tests | Total Tests |
|---|---|---|---|---|---|---|
| `tests/blacklist.test.js` | F5 (Blacklist 10k+), F6 (Linguistic Categories), F7 (Link Immunity) | 15 | 15 | 2 | 1 | 33 |
| `tests/compound_terms.test.js` | F1 (Longest-Match), F2 (Sub-Word Shielding), F3 (Civic Allowlist), F4 (Repeat/Unchecked Shielding) | 20 | 20 | 1 | 1 | 42 |
| `tests/link_density.test.js` | F8 (Link Inflation Bug), F9 (Accurate Density %) | 10 | 10 | 1 | 1 | 22 |
| `tests/nested_templates.test.js` | F12 (Nested Template Protection), F13 (Zero Token Leakage) | 10 | 10 | 1 | 1 | 22 |
| `tests/emoji_audit.test.js` | F14 (Zero Pictorial Emojis), F15 (SVG Icon System) | 12 | 10 | 1 | 1 | 24 |
| `tests/admin_utilities.test.js` | F16 (Bulk Diagnostic), F17 (Whitelist Manager), F18 (JSON Backup), F19 (Policy Sandbox), F20 (Zero-Login Privacy) | 25 | 25 | 1 | 1 | 52 |
| `tests/e2e_scenarios.test.js` | F10 (Immediate Feedback), F11 (Preset Removal), Full Pipeline Real-World Scenarios | 10 | 10 | 1 | 3 | 24 |
| `tests/syntax_audit.test.js` | F21 (Automated Test Suite & JavaScript/JSON Syntax Validation) | 10 | 5 | 1 | 1 | 17 |
| **Total** | **All 21 Features** | **112** | **95** | **9** | **10** | **236** |

---

## 4. Feature-to-Suite Traceability Matrix

| Feature # | Feature Name | Primary Test Suite | Tier 1 | Tier 2 |
|---|---|---|---|---|
| F1 | Compound Longest-Match Priority | `tests/compound_terms.test.js` | 5 tests | 5 tests |
| F2 | Sub-Word Span & Plain Shielding | `tests/compound_terms.test.js` | 5 tests | 5 tests |
| F3 | Civic Compound Allowlist Expansion | `tests/compound_terms.test.js` | 5 tests | 5 tests |
| F4 | Repeat and Unchecked Compound Shielding | `tests/compound_terms.test.js` | 5 tests | 5 tests |
| F5 | Blacklist Dictionary Expansion | `tests/blacklist.test.js` | 5 tests | 5 tests |
| F6 | Linguistic Categorization | `tests/blacklist.test.js` | 5 tests | 5 tests |
| F7 | Existing Link Immunity | `tests/blacklist.test.js` | 5 tests | 5 tests |
| F8 | Link Inflation Bug Resolution | `tests/link_density.test.js` | 5 tests | 5 tests |
| F9 | Accurate Link Density Calculation | `tests/link_density.test.js` | 5 tests | 5 tests |
| F10 | Immediate Analyze Button Feedback | `tests/e2e_scenarios.test.js` | 5 tests | 5 tests |
| F11 | Preset Buttons Removal | `tests/e2e_scenarios.test.js` | 5 tests | 5 tests |
| F12 | Nested Template Protection | `tests/nested_templates.test.js` | 5 tests | 5 tests |
| F13 | Zero Token Leakage | `tests/nested_templates.test.js` | 5 tests | 5 tests |
| F14 | Repository Zero Pictorial Emojis | `tests/emoji_audit.test.js` | 7 tests | 5 tests |
| F15 | SVG Vector Icon System | `tests/emoji_audit.test.js` | 5 tests | 5 tests |
| F16 | Bulk Wikitext Health Diagnostic Tool | `tests/admin_utilities.test.js` | 5 tests | 5 tests |
| F17 | Protected Whitelist Manager | `tests/admin_utilities.test.js` | 5 tests | 5 tests |
| F18 | Dictionary JSON Export/Import | `tests/admin_utilities.test.js` | 5 tests | 5 tests |
| F19 | Live Policy Sandbox & Simulator | `tests/admin_utilities.test.js` | 5 tests | 5 tests |
| F20 | Zero-Login Client-Side Privacy | `tests/admin_utilities.test.js` | 5 tests | 5 tests |
| F21 | Automated Test Suite & Code Quality | `tests/syntax_audit.test.js` | 10 tests | 5 tests |

---

## 5. Execution Commands

### Run Full Test Suite (Progressive Mode)
```bash
npm test
# OR
node --test tests/*.test.js
```

### Run Full Test Suite in Strict Mode (Zero Skips Enforced)
```bash
STRICT=1 npm test
```

### Run Individual Test Suites
```bash
node --test tests/blacklist.test.js
node --test tests/compound_terms.test.js
node --test tests/link_density.test.js
node --test tests/nested_templates.test.js
node --test tests/emoji_audit.test.js
node --test tests/admin_utilities.test.js
node --test tests/e2e_scenarios.test.js
node --test tests/syntax_audit.test.js
```

### Build & Syntax Verification
```bash
npm run build
npm run lint
```
