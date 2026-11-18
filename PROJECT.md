# Project: wikilink-tool

## Architecture
Client-side Devanagari Hindi Wikilinking Tool (Wikipedia PWA) with offline-capable analysis, zero-login privacy, and rich administrative controls.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User & Admin Interfaces                         │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Main Workbench (index.html)       │ Admin Dashboard (logs.html)         │
│ - Immediate analyze button state │ - 4 Exclusive Admin Utilities       │
│ - Removed preset buttons         │ - Clean SVG vector icons (0 emojis) │
│ - Clean typography & SVG icons   │ - Offline localStorage persistence  │
└─────────────────┬────────────────┴──────────────────┬──────────────────┘
                  │                                   │
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Core Wikilinking Engine (app.js)                       │
├────────────────────────────────────────────────────────────────────────┤
│ - Recursive / ID-Map template protection & unprotection (no leaks)     │
│ - Longest-match compound terms & sub-token shielding                   │
│ - Civic compound allowlist ('राज्य सभा', 'विधान सभा', etc.)            │
│ - Exact existing link counter & accurate link density %                │
│ - Policy evaluation: WP:LINK, WP:NOTLINKED, WP:OVERLINKING, WP:DATELINK│
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Dictionary & Stopwords (words_blacklist.js)              │
├────────────────────────────────────────────────────────────────────────┤
│ - 10,000+ vetted colloquial Hindi words, verbs, nouns, and adverbs     │
│ - CommonJS / browser UMD bundle with backward compatibility            │
└────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Compound Longest-Match Priority | Prioritize longest multi-word n-grams over constituent sub-words | M2 (core_engine) | ORIGINAL_REQUEST §R1 |
| 2 | Sub-Word Span & Plain Shielding | Shield inner sub-words of compounds from being linked as isolated candidates | M2 (core_engine) | ORIGINAL_REQUEST §R1 |
| 3 | Civic Compound Allowlist Expansion | Add 'राज्य', 'सभा', 'विधान', 'नगर', 'निगम', 'ग्राम', 'पंचायत' to compound allowlist | M2 (core_engine) | Explorer 1 & Spec Miner 2 |
| 4 | Repeat & Unchecked Compound Shielding | Wrap repeat and user-unchecked multi-word terms with plain shield tokens | M2 (core_engine) | Spec Miner 2 |
| 5 | Blacklist Dictionary Expansion | Expand `words_blacklist.js` to 10,000+ words across 5 linguistic categories | M1 (dictionary_corpus) | ORIGINAL_REQUEST §R2 |
| 6 | Linguistic Categorization | Partition new blacklist entries into domestic nouns, verbs, adjectives, adverbs, and daily terms | M1 (dictionary_corpus) | Spec Miner 2 |
| 7 | Existing Link Immunity | Existing wikitext links remain intact; blacklist only applies to new suggestions | M2 (core_engine) | ORIGINAL_REQUEST §R2 |
| 8 | Link Inflation Bug Resolution | Decouple link lookup Set from exact integer counter `state.existingLinksCount` | M2 (core_engine) | ORIGINAL_REQUEST §R3 |
| 9 | Accurate Link Density Calculation | Calculate `statLinkDensity` accurately from exact canonical targets and word count | M2 (core_engine) | ORIGINAL_REQUEST §R3 |
| 10 | Immediate Analyze Button Feedback | Disable button and show active spinner banner on first click of 'Analyze & Detect' | M3 (main_workbench_ui) | ORIGINAL_REQUEST §R4 |
| 11 | Preset Buttons Removal | Completely remove 'त्वरित उदाहरण' preset buttons from `index.html` | M3 (main_workbench_ui) | ORIGINAL_REQUEST §R4 |
| 12 | Nested Template Protection | Reinforce `unprotectWikitext` to handle nested structures like `{{बन्द सिरा|date=...}}` | M2 (core_engine) | ORIGINAL_REQUEST §R5 |
| 13 | Zero Token Leakage | Guarantee 0 `PROTECTED_...` or `⟪...⟫` tokens remaining in unprotect output | M2 (core_engine) | ORIGINAL_REQUEST §R5 |
| 14 | Repository Zero Pictorial Emojis | Replace all 277+ pictorial emojis across the repo with clean text or SVG icons | M3, M4 | ORIGINAL_REQUEST §R6 |
| 15 | SVG Vector Icon System | Introduce accessible standard SVG vector icons and badge symbols | M3, M4 | Explorer 3 |
| 16 | Bulk Wikitext Health Diagnostic Tool | Batch analyze wikitext articles for token leaks, density, overlinks, and health grades | M4 (admin_dashboard) | ORIGINAL_REQUEST §R7 |
| 17 | Protected Whitelist Manager | Critical terms manager with importance ranking and automated blacklist conflict detection | M4 (admin_dashboard) | ORIGINAL_REQUEST §R7 |
| 18 | Dictionary JSON Export/Import | Backup rules and custom words with JSON schema validator and Merge/Replace modes | M4 (admin_dashboard) | ORIGINAL_REQUEST §R7 |
| 19 | Live Policy Sandbox & Simulator | Interactive in-memory wikitext sandbox with policy sliders and decision ledger | M4 (admin_dashboard) | ORIGINAL_REQUEST §R7 |
| 20 | Zero-Login Client-Side Privacy | 100% in-memory / localStorage client-side execution with offline stability | M4 (admin_dashboard) | ORIGINAL_REQUEST §R8 |
| 21 | Automated Test Suite & Quality | Node built-in test suite covering all tiers, syntax verification (`node --check`), 0 emojis | M5 (final_e2e_verification) | ORIGINAL_REQUEST §AC4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | `dictionary_corpus` | Expand `words_blacklist.js` to 10,000+ words across 5 categories; maintain UMD compatibility | none | DONE |
| M2 | `core_engine` | Longest-match compound terms, civic allowlist, link inflation fix, nested template unprotect fix | M1 | IN_PROGRESS |
| M3 | `main_workbench_ui` | Remove preset buttons, immediate analyze button spinner, purge emojis from index/login/about/css | none | DONE |
| M4 | `admin_dashboard` | 4 exclusive admin utilities in logs.html/app.js, purge admin emojis, zero-login localStorage | M2 | PLANNED |
| M5 | `final_e2e_verification` | Pass 100% of E2E tests (Tiers 1-4) published by Testing Track, then Tier 5 adversarial hardening | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### M1 (dictionary_corpus) ↔ M2 (core_engine)
- File: `words_blacklist.js`
- Export: `const COMMON_5000_WORDS = [ ... ];` (contains >= 10,000 unique Devanagari Hindi string entries)
- Export object: `{ COMMON_5000_WORDS }` in CommonJS / `window.COMMON_5000_WORDS` in browser.
- Guarantee: Elements are trimmed, non-empty, Devanagari strings; no syntax errors.

### M2 (core_engine) ↔ M3 (main_workbench_ui)
- Function `handleAnalyze()`: Immediately disables `DOM.analyzeBtn`, displays active spinner, and sets status banner before any async fetches.
- State properties: `state.existingLinksCount` (integer), `state.uniqueExistingTargets` (Set), `state.originalWikitext` (string).
- Function `protectWikitextStructures(text)`: Returns `{ text, tokens, existingLinks, existingLinksCount, uniqueExistingTargets }`.
- Function `unprotectWikitext(text, tokens)`: Returns clean wikitext with 0 `PROTECTED_...` or `⟪...⟫` tokens.

### M2 (core_engine) ↔ M4 (admin_dashboard)
- Storage key for Whitelist: `localStorage['wikilink_admin_whitelist_v2']`
- Data structure for Whitelist term:
  `{ term: string, normalized: string, category: string, importance: 'critical'|'high'|'standard', notes: string, addedAt: string, active: boolean }`
- Whitelist precedence: Terms active in Whitelist take priority over `NEVER_LINK_WORDS.hi`.
- Diagnostic engine: `runBulkWikitextDiagnostic(corpusText, options)` returns `{ summary: {...}, articles: [...] }`.
- Sandbox engine: `simulateWikitextLinking(wikitext, options)` returns `{ resultWikitext: string, decisions: [...] }`.

### Testing Track ↔ All Milestones
- Test command: `node --test tests/*.test.js`
- All tests execute natively via Node `node:test` and `node:assert/strict` with zero external dependencies.

## Code Layout
- `words_blacklist.js`: Hindi stopwords & non-linkable dictionary (10,000+ words).
- `app.js`: Core linking engine, tokenizer, template protector, replacement engine, state manager, and admin logic.
- `index.html`: Main workbench UI (zero emojis, no preset buttons, immediate analyze spinner).
- `logs.html`: Admin dashboard UI (4 exclusive admin utilities, clean SVG icons, responsive layout).
- `login.html`, `about.html`: User management and about pages (zero emojis, SVG icons).
- `style.css`: UI styling, responsive grids, admin cards, modals, and vector icons.
- `tests/`: Automated test suite (`compound_terms.test.js`, `blacklist.test.js`, `link_density.test.js`, `nested_templates.test.js`, `emoji_audit.test.js`, `admin_utilities.test.js`).
