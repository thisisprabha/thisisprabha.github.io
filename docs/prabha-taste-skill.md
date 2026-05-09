# Prabha-Taste Skill — Complete Documentation for External LLM

**Path:** `~/.hermes/skills/prabha-taste/`  
**Purpose:** Agent Tina's design taste rulebook. Loaded first before any design/UI work.  
**Owner:** Prabha (Lead PD @ SuperOps) — taste overrides rules.

---

## Folder Structure

```
prabha-taste/
├── SKILL.md                              ← ENTRY POINT. Must load this first.
├── README.md                             ← Quick start for new agents
├── CHANGELOG.md                          ← Taste evolution log (dated)
├── patterns/
│   ├── palettes.md                       ← Active color rotations + rules
│   ├── typography.md                     ← Font pairings + scales
│   └── layouts.md                        ← Spacing, grids, cards, z-index
└── references/
    ├── typeui-synthesis.md               ← Filtered design system consensus
    ├── good-bad-index.md                 ← Screenshot library index
    ├── feedback-loop.md                  ← How to capture new taste signals
    ├── bento-dashboard-pattern.md        ← Dashboard-only bento spec
    ├── nested-cards.md                   ← White-on-white card pattern
    ├── stakeholder-deliverable-checklist.md  ← PDF quality gates
    ├── good/                             ← Approved screenshot evidence (PNG)
    │   ├── Wise Web 0.png
    │   ├── Revolut Web 0.png
    │   ├── Sana AI Web 15.png
    │   └── ... (30+ files)
    └── bad/                              ← Rejected patterns (2 files, sparse)
        ├── Screenshot 2026-05-08 at 10.46.30 PM.png
        └── Screenshot 2026-05-08 at 10.46.38 PM.png
```

---

## File-by-File Breakdown

### 1. SKILL.md — The Manifest
**Role:** Entry point. Load this before any design task.

**Key sections:**
- **Related Skills Inventory** — Decision table for which skill to load next (`claude-design`, `pdf-premium-generation`, `sketch`, etc.)
- **Core Principles** (5 rules):
  1. Simplicity Over Decoration — flat 2D, no anime/3D, no heavy shadows
  2. Density First, Whitespace Second — compact layouts, whitespace earned
  3. Functional Color — semantic only, no decorative gradients
  4. Typography as Structure — max 2 fonts, weight/scale = hierarchy
  5. Stakeholder Deliverables Must Be Designed, Not Dumped — themed layout, Apple/Linear-like
- **Layout & Composition Rules** (NEW — just added):
  - No Equal-Height Bento Grids by Default
  - Content-Driven Sizing (blocks size to content, not grid cells)
- **Design Language Preferences** — Style/Icon/Border/Radius/Motion rules
- **Decision Framework** — 8-step checklist before generating UI
- **Verification** — Pre-shipping checklist

**Critical rule:** "When Prabha contradicts this file, they are right. Update the file."

---

### 2. patterns/palettes.md — Color System
**Role:** Active color rotations. Check date — preferences rotate per project.

**Three active palettes:**
1. **Default: Fintech Professional** (Wise/Revolut inspired)
   - Primary: `#9FE870` (lime green)
   - Text: `#0B0D0E` (near-black, not pure #000)
   - Surface: `#FFFFFF` on `#F7F7F8` (cool gray)
   - Status: `#007AFF` blue positive, `#FF2D55` red negative

2. **Alternative: SuperOps MSP**
   - Primary: `#2563EB` (blue 600)
   - Surface: Slate grays `#F1F5F9`

3. **Experiment: Geist** (Vercel-inspired, April 2026)
   - Ultra-minimal monochrome
   - Status: blue `#0070F3`, purple `#7928CA`, green `#50E3C2`

**Rules:**
- Fintech → lime + forest green
- Professional SaaS → SuperOps blue
- Dev tools → Geist acceptable
- Never more than 3 semantic colors per view
- Never pure black (#000) on white — too harsh

---

### 3. patterns/typography.md — Font & Scale
**Role:** Active font pairings and type scales. Fluid — updates frequently.

**Primary: Geometric Sans (Fintech Standard)**
- Font: `Inter` — default for 90% of cases
- Weights enabled: 400, 500, 600, 700
- Scale: 12 / 13 / 14 / 15 / 16 / 18 / 20 / 24 / 32 / 48-56 / 64-72
- Mono: `JetBrains Mono` for code, paths, IDs

**Secondary: Editorial Serif Accent**
- Font: `Playfair Display` — premium/luxury landing pages ONLY
- Never pair serif with UI — sans handles all UI elements

**Tertiary: Geist (Experimental)**
- Ultra-minimal dev tools, testing since April 2026

**Hierarchy Rules:**
- Size over decoration
- Tracking-tight for large text
- Color for hierarchy (dark forest green for primary values)
- Weight: 600+ headers, 500 interactive, 400 body
- ALL CAPS: hero headlines ONLY (Wise style)

---

### 4. patterns/layouts.md — Structure & Spacing
**Role:** Spacing system, grid approaches, card patterns, component specs.

**Spacing:** 8px base unit → 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64

**Grid Approaches:**
1. Sidebar + Main (240-280px sidebar) — dashboard standard
2. Three-Column (sidebar + content + panel 320px) — detail views
3. Full-Width with Max (1200px) — landing pages
4. Card Grid (3-col, 16-24px gap) — Sana AI style

**Card Patterns:**
- Dashboard card: 20-24px padding, 12-16px radius, no border
- List item: 12-16px vertical padding, border-bottom separator
- Action card: 16px padding, 1px border, 8-12px radius
- Information card: 16-20px padding, icon + title + metadata

**Buttons:**
- Primary CTA: `#9FE870` bg, `#163300` text, 12px 24px padding, 8px radius
- Secondary: `#F2F2F7` bg, `#000` text
- Ghost: transparent bg, `#163300` text

**Z-Index:** 0 / 50 / 100 / 200 / 300 / 400 (dropdown/sticky/modal/tooltip/toast)

---

### 5. references/typeui-synthesis.md — Filtered Consensus
**Role:** Synthesized from 11 free TypeUI design skills, filtered through Prabha's taste.

**Source:** https://github.com/bergside/awesome-design-skills (MIT licensed)

**10 sections:**
1. Typography Consensus — Most-recommended pairings across skills
2. Color Token Consensus — Universal semantic palette + outliers
3. Spacing Scale — 4/8/12/16/24/32 universal
4. Visual Style Keywords — Words to keep vs. drop
5. Universal Do/Don't — Rules every skill agrees on
6. Accessibility Consensus — WCAG 2.2 AA baseline
7. Quality Gates — Copy-paste ready spec rules
8. Output Structure Template — For design system docs
9. Component State Checklist — Every component must define 7 states
10. Source Index — Which skill contributed what

**Prabha overrides in this file:**
- Inter for 90% of cases
- Max 2 fonts
- 4/8 structural, 12/16 component padding, 24/32 section separators
- No decorative gradients
- Bento peach/blue (#FAD4C0 / #80A1C1): dashboard-only
- ❌ Drop: "vibrant", "artistic", "cosmic", "dramatic", "colorful", "bento", "equal-height grid", "card grid"

---

### 6. references/good-bad-index.md — Screenshot Library
**Role:** Compact taste memory. Links/file paths + distilled pattern, not giant screenshots.

**Good Examples (10 entries):**
| Date | Source | Surface | Why it works | Reusable pattern |
|---|---|---|---|---|
| 2026-05-08 | Wise Web 0.png | Screenshot | Bold uppercase hero headline, lime green CTA | ALL CAPS hero only; lime + forest green fintech |
| 2026-05-08 | Wise Web 29.png | Screenshot | Dashboard sidebar + main, white cards on gray | Sidebar 240-280px; cool gray page bg |
| 2026-05-08 | Revolut Web 0.png | Screenshot | Lifestyle photography + UI mockup combo | Photography + UI mockup for landing |
| 2026-05-08 | Sana AI Web 15.png | Screenshot | Clean AI dashboard, 3-col card grid | Centered greeting; card grids for discovery |
| 2026-05-08 | Origin Web 0.png | Screenshot | Editorial serif italic on photography | Serif italic for premium landing |
| 2026-04-28 | jakub.kr article | Web | Micro-interactions for "feel" | Purposeful micro-interactions > decoration |

**Bad Examples:** Empty — needs population.
**Mixed / Needs Judgment:** Empty — needs population.

---

### 7. references/feedback-loop.md — Capture Process
**Role:** How to turn Prabha's "good/bad" reactions into permanent taste rules.

**3-step process:**
1. **Capture** — Record date, source, verdict, surface, what works/fails, reusable pattern, anti-pattern
2. **Distill** — After 3+ similar examples, update patterns/*.md + good-bad-index.md + CHANGELOG.md
3. **Design Workflow** — Start with job, search index, apply one good pattern, avoid one bad pattern, verify

**Token Discipline:**
- Never dump full Figma tree
- Prefer screenshots, node metadata, targeted component context
- Keep taste notes compressed: principle + examples

---

### 8. references/bento-dashboard-pattern.md — Dashboard Spec
**Role:** Reference for dashboard-style bento layouts. ONLY when user explicitly asks.

**Rules:**
- Use ONLY for system overviews, metrics, status boards
- NOT for documents, decks, landing pages
- CSS Grid with explicit spans, 4-col desktop / 2-col tablet / 1-col mobile
- Gap: 16px
- Content-driven heights — no forced equal height across unrelated cards

**Card Anatomy:**
```
[accent-bar] 36px×4px colored
[label] 11px uppercase muted
[headline/metric] 18px or 28-36px bold
[body/list] 13.5px muted
[pills/status] bottom
```

**Dashboard-Only Colors:**
- Peach `#FAD4C0` — primary model, iOS apps
- Blue `#80A1C1` — tool/agent cards
- Coral `#F2673C` — warnings (sparingly)
- Green `#16A34A` — online/synced

**Typography:** Inter 400/500/600/700, JetBrains Mono for code.

---

### 9. references/nested-cards.md — White-on-White Pattern
**Role:** Single pattern for nested form sections.

**Approach:**
- Main section + nested cards = same white background
- Differentiation via subtle border only
- Inverts "grey section, white card" pattern
- Works for grouped form fields, nested settings

**Reference:** Figma Product-Enhancement-2k26 → Client/Site Additional properties variation 3

---

### 10. references/stakeholder-deliverable-checklist.md — PDF Quality Gates
**Role:** Checklist before sending any report-style PDF to PM/leadership.

**Content Structure:**
- Title + date + audience
- Executive summary (5-8 bullets)
- Ranked insights with "why it matters"
- One deep dive
- Implications by org slice (Product/Design/GTM)
- Risks / confidence
- Next actions (3-5 max)

**Visual Quality:**
- No raw plain-text dump
- Single clean theme, minimal decoration
- Clear type hierarchy, compact spacing
- Semantic accents only
- 1-2 fonts max

**Export Workflow:**
Markdown → HTML template → PDF (print background on) → Verify on laptop + phone

**Fast Fail Signals:**
- Looks like terminal output
- No visual hierarchy
- Dense unbroken paragraphs
- Missing "so what"

---

### 11. CHANGELOG.md — Taste Evolution
**Role:** Dated log of preference changes.

**Three major entries:**
- **2026-05-08:** Fintech Professional patterns from 7 screenshots (Wise, Revolut, Sana AI, Origin)
- **2026-04-26:** Geist experiment (Vercel-style ultra-minimal)
- **2026-04-23:** SuperOps palette established (Slate grays, blue primary)

**Format for updates:**
```markdown
## YYYY-MM-DD
### Added
- New preference with context
### Changed
- Shift in preference (why?)
### Rejected / Moved to bad/
- What didn't work
### Reference
- Link to project/Figma/file
```

---

## How Files Connect (Decision Flow)

```
1. Load SKILL.md
   ↓
2. Read task → What skill do I need?
   (claude-design? pdf-premium-generation? sketch?)
   ↓
3. Check patterns/palettes.md → Which color rotation?
4. Check patterns/typography.md → Which font pairing?
5. Check patterns/layouts.md → Which grid/spacing?
   ↓
6. Need dashboard? → references/bento-dashboard-pattern.md
   Need stakeholder PDF? → references/stakeholder-deliverable-checklist.md
   Need white-on-white? → references/nested-cards.md
   Need design system spec? → references/typeui-synthesis.md (section 8)
   ↓
7. Verify against good-bad-index.md (avoid known bad patterns)
8. Follow feedback-loop.md (distill new observations)
9. Log changes in CHANGELOG.md
```

---

## Current State (May 9, 2026)

**Recent changes just made:**
1. Added **Layout & Composition Rules** to SKILL.md:
   - No Equal-Height Bento Grids by Default
   - Content-Driven Sizing
2. Scoped **Bento peach/blue (#FAD4C0 / #80A1C1)** to dashboard-only in typeui-synthesis.md
3. Added "bento", "equal-height grid", "card grid" to ❌ drop list in typeui-synthesis.md

**Gaps identified by Prabha:**
- `references/bad/` folder is nearly empty (only 2 files) — needs more rejected patterns
- `references/good-bad-index.md` Bad Examples section is empty
- No explicit rules for "sketchy" / hand-drawn style (was improvised, not from skill)
- No guidance for when to use HTML vs. PDF vs. Google Doc vs. Figma

---

## What Prabha Wants From Another LLM

**Goal:** Improve this skill. Make it better at generating designs that match Prabha's actual taste, not just generic "clean minimal."

**Known frustrations:**
1. Bento grids were being used as default — now fixed with explicit anti-bento rules
2. Equal-height cards create unnatural whitespace — fixed with content-driven sizing
3. Prabha says "my taste really sucks" — meaning the skill isn't capturing the nuance yet
4. Sketchy style was improvised today, not from the skill — should be documented as an approved variant or rejected

**Your task:**
1. Read all files above
2. Identify what's missing, contradictory, or under-specified
3. Propose improvements (new rules, new patterns, better organization)
4. This document is your map. The files are your source of truth.
5. Remember: "When Prabha contradicts this file, they are right. Update the file."

---

**Questions to answer for Prabha:**
- Should "sketchy" style be added as an approved variant, or was it a one-off improvisation?
- What's the missing guidance on HTML vs. PDF vs. Google Doc vs. Figma deliverables?
- How do we capture more "bad" examples when Prabha rejects something?
- Is the folder structure right, or should patterns/ and references/ be reorganized?
- What design decisions should be pre-made (color palette default) vs. per-task?
