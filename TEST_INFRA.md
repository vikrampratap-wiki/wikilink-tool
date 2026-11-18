# Test Infrastructure Specification: wikilink-tool

**Project**: `wikilink-tool` — Enhanced Local AI Compound Classifier & Deep Tool Integration  
**Framework**: Native Node.js `node:test` and `node:assert/strict` (v24.22.2+)  
**Runtime Dependencies**: Exactly 0 (Zero npm dependencies, 100% offline client-side JS)  
**Emoji Policy**: Strict 0 pictorial emojis across all files (enforced by `tests/emoji_audit.test.js`)  

---

## 1. Test Architecture & Design Principles

The automated test infrastructure for `wikilink-tool` is architected around four core pillars:

1. **Zero External Runtime Dependencies**:
   All test suites execute natively using Node.js built-in modules (`node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:vm`, `node:child_process`). No external test packages or test runners are installed or required.

2. **Browser Sandbox Isolation via `tests/harness.js`**:
   `app.js` is an IIFE engineered for client-side browser environments. The test harness provisions a lightweight, null-safe DOM and `window` mock inside a sandboxed V8 execution context (`node:vm`). Internal functions (`protectWikitextStructures`, `unprotectWikitext`, `isValidCandidate`, `isNonLinkableWord`, `applyReplacements`, `simulateWikitextLinking`, `runBulkWikitextDiagnostic`, `applySafeOfflineVerification`, etc.) are exposed directly to tests without altering source code on disk.

3. **Progressive Testability with Capability Detection (`Features`)**:
   During parallel multi-agent milestone execution (Milestone E2E in parallel with M1 and M2), tests for unimplemented features cleanly detect milestone readiness via `tests/harness.js`'s `Features` detection methods. Unimplemented features skip gracefully with descriptive diagnostics (e.g. `# Pending Milestone M1`, `# Pending Milestone M2`). When milestone implementations land, tests automatically execute and assert compliance. Setting `STRICT=1` disables feature skips and forces unconditional execution of all assertions.

4. **Authoritative Specification Derivation**:
   Every test case derives its expected behavior directly from:
   - Wikipedia Manual of Style guidelines: WP:LINK, WP:OVERLINKING, WP:COMMONWORDS, WP:NOTLINKED, WP:DISAMBIG, WP:DATELINK, WP:CIRCULAR, WP:MOSBOLD.
   - Project specifications in `PROJECT.md` and user requirements in `ORIGINAL_REQUEST.md`.
   - Sanskrit and Hindi Samasa grammar rules: Tatpurusha institutional heads, Karmadharaya collocations, Dvandva coordinator separation, and affix morphology.

---

## 2. The 4-Tier Test Methodology

The test suite enforces a rigorous 4-tier verification hierarchy across all features:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        4-Tier Test Methodology                         │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Feature Coverage (>=5 test cases per feature for F1–F9)        │
│ - Strict verification of core engine contracts in ON and OFF modes     │
│ - Primary behavior verification for each Samasa rule and affix         │
│ - Offline PWA verification and safe fallback behavior                  │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary & Corner Cases (>=5 test cases per feature for F1–F9) │
│ - Threshold boundary values (0.69 vs 0.70, 0.59 vs 0.60)              │
│ - Multi-word Devanagari numerals, punctuation, quotation marks         │
│ - Empty strings, whitespace variations, and exception resistance       │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Cross-Tool Combinations (Features 10–16)                       │
│ - Tool 4 Live Policy Sandbox (toggle, threshold slider, decision ledger)│
│ - Tool 1 Bulk Health Diagnostic (broken compound link detection & fix) │
│ - Tool 2 Protected Whitelist Manager (real-time cohesion score preview)│
│ - Tool 3 Workbench Suggestions Table (filter chips & एआई खोज badges)   │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Real-World Application Scenarios (>=5 Realistic Paragraphs)    │
│ - Authentic Hindi Wikipedia articles covering Science & Tech, Climate, │
│   Governance, Constitutional Law, and Economic Revolutions             │
│ - Full pipeline evaluation ensuring 0 token leaks and clean diffs      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Test Suites Directory Layout (`tests/`)

| Test File | Primary Scope | T1 Tests | T2 Tests | T3 Tests | T4 Tests | Total Tests |
|---|---|---|---|---|---|---|
| `tests/e2e_ai_compound.test.js` | F1–F9 (ON/OFF mode, Samasa rules, affix cohesion, offline PWA, safe fallback) | 45 | 45 | — | — | 90 |
| `tests/cross_tool_integration.test.js` | F10–F16 (Sandbox, Bulk diagnostic, Whitelist, Workbench, Real-World scenarios) | — | — | 20 | 5 | 25 |
| `tests/ai_compound_classifier.test.js` | AI Compound Classifier unit & grammar test suite | 16 | 15 | 3 | 2 | 36 |
| `tests/compound_terms.test.js` | Compound longest-match, sub-word shielding, repeat shielding | 20 | 20 | 1 | 1 | 42 |
| `tests/admin_utilities.test.js` | Bulk diagnostic baseline, Whitelist, JSON Backup, Policy Sandbox | 25 | 25 | 1 | 1 | 52 |
| `tests/blacklist.test.js` | Blacklist dictionary expansion, linguistic categories, immunity | 15 | 15 | 2 | 1 | 33 |
| `tests/link_density.test.js` | Exact existingLinksCount, accurate density calculation | 10 | 10 | 1 | 1 | 22 |
| `tests/nested_templates.test.js` | Multi-level template protection, zero token leakage | 10 | 10 | 1 | 1 | 22 |
| `tests/emoji_audit.test.js` | Zero pictorial emojis, SVG vector icon system | 12 | 10 | 1 | 1 | 24 |
| `tests/e2e_scenarios.test.js` | Workbench analyze feedback, preset removal, pipeline lead scenarios | 10 | 10 | 1 | 3 | 24 |
| `tests/syntax_audit.test.js` | JavaScript syntax, JSON parsing, ES module & bash validation | 10 | 5 | 1 | 1 | 17 |
| `tests/adversarial_challenger_m2.test.js` | Adversarial probes on compound shielding & density | 12 | 10 | 2 | 2 | 26 |
| `tests/adversarial_challenger_m2_rep.test.js` | Multi-word sub-token carving stress & template stress | 12 | 10 | 2 | 2 | 26 |
| `tests/challenger_m2_rep_stress.test.js` | Deep nested unprotect & boundary stress testing | 12 | 10 | 2 | 2 | 26 |
| **Total** | **All 18 Features** | **187** | **175** | **35** | **19** | **465** |

---

## 4. Feature-to-Suite Traceability Matrix

| Feature # | Feature Name | Primary Test Suite | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|---|---|
| F1 | Traditional Mode (OFF) Strict Enforcement | `tests/e2e_ai_compound.test.js` | 5 | 5 | — | — |
| F2 | AI Enhanced Mode (ON) Beyond-Dictionary Discovery | `tests/e2e_ai_compound.test.js` | 5 | 5 | — | — |
| F3 | Tangible ON vs OFF Output & Suggestion Discrimination | `tests/e2e_ai_compound.test.js` | 5 | 5 | — | — |
| F4 | Tatpurusha Policy Heads (`-नीति`, `-ढांचा`, `-लक्ष्य`, etc.) | `tests/e2e_ai_compound.test.js` | 5 | 5 | — | — |
| F5 | Karmadharaya Adjective+Noun Combinations | `tests/e2e_ai_compound.test.js` | 5 | 5 | — | — |
| F6 | Affix Cohesion & Morphology (`उप-`, `अंतर-`, `-वादी`, etc.) | `tests/e2e_ai_compound.test.js` | 5 | 5 | — | — |
| F7 | Fragmentation Prevention (<60% Threshold) | `tests/e2e_ai_compound.test.js` | 5 | 5 | — | — |
| F8 | Offline PWA Verification Recognition | `tests/e2e_ai_compound.test.js` | 5 | 5 | — | — |
| F9 | Safe Fallback on Unexpected Exception | `tests/e2e_ai_compound.test.js` | 5 | 5 | — | — |
| F10 | Tool 4: Live Policy Sandbox AI Controls | `tests/cross_tool_integration.test.js` | — | — | 3 | — |
| F11 | Tool 4: Decision Ledger AI Enrichment | `tests/cross_tool_integration.test.js` | — | — | 2 | — |
| F12 | Tool 1: Bulk Diagnostic Broken Compound Detection | `tests/cross_tool_integration.test.js` | — | — | 3 | — |
| F13 | Tool 1: Bulk Diagnostic Fix Suggestions | `tests/cross_tool_integration.test.js` | — | — | 2 | — |
| F14 | Tool 2: Whitelist Real-time Cohesion Scoring | `tests/cross_tool_integration.test.js` | — | — | 5 | — |
| F15 | Tool 3: Workbench Filter Chip 'AI Discovered' | `tests/cross_tool_integration.test.js` | — | — | 3 | — |
| F16 | Tool 3: Workbench Table 'AI Discovered' Badge | `tests/cross_tool_integration.test.js` | — | — | 2 | — |
| R3 | Real-World Application Scenarios (5 Paragraphs) | `tests/cross_tool_integration.test.js` | — | — | — | 5 |
| F17 | Zero Pictorial Emojis Compliance | `tests/emoji_audit.test.js` | 7 | 5 | 1 | 1 |
| F18 | Full Test, Syntax, Build & Lint Suite Pass | `tests/syntax_audit.test.js` | 10 | 5 | 1 | 1 |

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

### Run Individual E2E Test Suites
```bash
# E2E Track: Core AI Compound Classifier & On/Off Mode (Features 1–9)
node --test tests/e2e_ai_compound.test.js

# E2E Track: Cross-Tool Integration & Real-World Scenarios (Features 10–16)
node --test tests/cross_tool_integration.test.js
```

### Run Specialized Audits
```bash
# Zero Pictorial Emoji Audit
node --test tests/emoji_audit.test.js

# Syntax, Build & Code Quality Audit
node --test tests/syntax_audit.test.js

# Admin Utilities & Sandbox Simulation
node --test tests/admin_utilities.test.js
```

### Lint and Build Verification
```bash
npm run lint
npm run build
```
