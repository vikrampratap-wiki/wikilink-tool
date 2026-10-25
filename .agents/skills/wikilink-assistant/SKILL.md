---
name: wikilink-assistant
description: >-
  Provides automated logical internal linking (WP:LINK), overlinking cleanup (WP:OVERLINKING),
  disambiguation resolution (WP:DISAMBIG), date/unit suppression (WP:DATELINK), and wikitext
  contamination sanitization for Wikipedia articles across Hindi, Sanskrit, and other languages.
---

# विकीलिंक सहायक (WikiLink Assistant Skill)

This skill enables Antigravity and AI coding assistants to logically wikilink Wikipedia articles, clean contaminated or overlinked wikitext, and prepare clean edits adhering strictly to Wikimedia Manual of Style guidelines.

Official Antigravity Skills Documentation: [https://antigravity.google/docs/skills/](https://antigravity.google/docs/skills/)

## Core Capabilities

1. **Dual-Box Workbench Operation**:
   - **Box 1 (Source / Clean Input)**: Receives source wikitext or loads it from Wikipedia Action API with configurable filter criteria.
   - **Box 2 (Contaminated / Flagged Text)**: Automatically isolates overlinks, ambiguous links, red links, and broken syntax with detailed logical diagnostic arguments.
2. **Wikipedia Logical Policies Enforced**:
   - **Everyday Common Words Suppression (WP:NOTLINKED / WP:COMMONWORDS)**: Suppress wikilinking plain, everyday words (e.g., दिन, पानी, घर, लोग, बड़ा, काम) without special context.
   - **Circular Self-Link Prevention (WP:CIRCULAR / WP:SELFREF)**: Suppress and strip circular links pointing to the current article's title.
   - **First Occurrence Rule (WP:OVERLINKING)**: Only link a concept once per article/section.
   - **Disambiguation Page Prevention (WP:DISAMBIG)**: Check Wikimedia Action API (`pageprops.disambiguation`) and avoid linking directly to disambiguation pages.
   - **Date and Unit Suppression (WP:DATELINK)**: Never link standalone 4-digit years (e.g. 1947, 2024) or standard units of measure (km, kg, m, s).
   - **Redundant Pipe Cleanup**: Transform `[[Title|Title]]` into clean `[[Title]]`.
   - **Structural Protection**: Preserve headings (`== ==`), templates (`{{...}}`), references (`<ref>`), file embeds, and existing links.
3. **Contamination Diagnosis & Sanitization**:
   - Run logical sanitization to automatically strip duplicates and redundant syntax while leaving primary links intact.

## Workflow

### Step 1: Article Ingestion & Structure Isolation
- Fetch article content using `https://<lang>.wikipedia.org/w/api.php?action=query&prop=revisions&titles=<TITLE>&rvslots=*&rvprop=content&formatversion=2&format=json`.
- Protect wikitext structures (templates, references, headers) using internal placeholder tokens.

### Step 2: Candidate Extraction & Wikimedia Batch Verification
- Extract candidate n-grams (1 to 3 words) excluding language-specific stopwords.
- Verify candidates against Wikimedia Action API in batches of up to 50:
  `action=query&titles=<TITLES>&prop=pageprops&ppprop=disambiguation&redirects=1&format=json`

### Step 3: Contamination Analysis & Logical Arguments
- Scan existing wikitext for:
  - Duplicate links (count > 1).
  - Target terms pointing to disambiguation pages.
  - Links containing identical pipe syntax `[[Term|Term]]`.
  - Standalone year and measurement unit links.
- Report specific policy rationale for each detected issue.

### Step 4: Sanitization & MediaWiki Diff Rendering
- Apply automated sanitization to clean defects.
- Render 4-column side-by-side MediaWiki diff with `.diff-lineno`, `.diff-deletedline`, `.diff-addedline`, and inline `.diffchange` highlights.
- Copy modified clean wikitext for 1-click submission to Wikipedia edit interface.

## Local Execution

Run the standalone local web interface:
```bash
python3 server.py
# Server starts on http://localhost:8085
```
