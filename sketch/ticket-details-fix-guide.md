# Figma Artboard Fix Guide
## AI Service Desk — Ticket Details (Node 6745:91886)

**Prabha — duplicate the artboard (`Cmd+D` on the frame), then work through this list zone by zone.**
Estimated time: **8–12 minutes** for text fixes. UX structural changes (badges, action hierarchy) are design calls you'll make manually.

---

## A. TEXT FIXES — Quick Wins (Do These First)

### AI Summary Section
| # | Find (exact) | Replace with | Why |
|---|---|---|---|
| 1 | `Map this fields` | `Map these fields` | Subject-verb disagreement |
| 2 | `I will re propose a solution` | `I will repropose a solution` | "re propose" → "repropose" (one word) |
| 3 | `share your feedbacks` | `share your feedback` | "Feedback" is uncountable |
| 4 | `Use this space to share your feedback and inputs` | `Use this space to share your feedback and input` | "inputs" → "input" (uncountable) |

### Email Section
| # | Find (exact) | Replace with | Why |
|---|---|---|---|
| 5 | `Finally, Send this email` | `Finally, send this email` | Capitalization mid-sentence |
| 6 | `Next add this internal note` | `Next, add this internal note` | Missing comma after "Next" |
| 7 | `Hello Priya` (salutation line) | `Hello Javier,` | Data consistency: ticket is for Javier, not Priya |
| 8 | `This is Mike from Apex IT. I've picked up...` (email body) | Add line break after salutation, rewrite as: `This is Mike from Apex IT. I've picked up ticket #240820-0001 about your laptop running slow this morning.` | Punctuation + consistency |
| 9 | `Michael Scott` (To: field) | `Javier Rodriguez` | Match requester name |
| 10 | `VPN connectivity issues` (email subject/body) | `laptop performance / slowness` | Match ticket topic |

### Quick Fix / Root Cause Cards
| # | Find (exact) | Replace with | Why |
|---|---|---|---|
| 11 | `Michel jordan` | `Michael Jordan` | Spelling + proper noun caps |
| 12 | `at the across dallas site` | `at the Dallas site` | Garbled preposition |
| 13 | `Z_Cleanup-pro windows cleanup` | `Z_Cleanup-Pro Windows Cleanup` | Consistent title casing |
| 14 | `Removes unwanted data from the device to improve performance` | `Clears temporary files, browser cache, and logs to free RAM and improve responsiveness (~2 min)` | More specific, less vague |

### Internal Note Section
| # | Find (exact) | Replace with | Why |
|---|---|---|---|
| 15 | `Mallory Jenkins` | `Javier Rodriguez` | Wrong name — use ticket requester |
| 16 | `Aurora Z9000` | `Dell Latitude 5520` (or match the asset shown) | Wrong device name |

---

## B. DATA CONSISTENCY — Make the Scenario Coherent

**The ticket scenario should be ONE consistent story. Currently it's Frankenstein'ed from multiple scenarios.**

**Single coherent scenario:**
- **Requester:** Javier Rodriguez
- **Ticket:** #240820-0001 — "My laptop is slow this morning"
- **Asset:** Dell Latitude 5520 (not webcam)
- **Location:** Dallas site
- **Issue:** Chrome memory hogging after Aether Suite update → laptop sluggish
- **Email:** To Javier, from Mike at Apex IT, about his laptop slowness
- **Internal note:** About Javier's Dell, not Mallory's Aurora
- **Quick fix:** Kill Chrome processes, clear cache (-30 min)
- **Root cause:** Roll back Aether Suite update v3.2.1, patch Chrome (+40 min)

**Audit every text block:** If it says "Priya", "Michael Scott", "Mallory", "VPN", "Aurora Z9000", or "webcam" — fix or remove.

---

## C. UX STRUCTURAL CHANGES (Design Decisions)

### 1. Add "AI-Generated" Badge to Every AI Block
Add a small badge/pill to:
- AI Summary section
- Suggestion cards (Quick fix / Root cause)
- Generated email draft
- Generated internal note

**Suggested text:** `AI-generated` or `✨ AI-generated`
**Suggested style:** Subtle — 11px, muted text color, light background pill. Don't make it compete with content.

### 2. Rank Actions — One Primary, Rest Secondary
**Current:** Quick fix, Root cause fix, Map fields, Add note, Send email — all look equally important.

**Suggested:**
- Make **"Quick fix"** the primary action (largest button / filled style) with a `Recommended` badge
- Demote "Root cause fix" to secondary (outlined / smaller)
- "Add internal note" and "Send email" become tertiary (text-only or icon buttons)
- "Map these fields" stays as a link-style action within the field mapping card

### 3. Add Inline Feedback Per AI Block
Move the thumbs up/down from the page bottom to:
- Each suggestion card (Quick fix card, Root cause card)
- AI Summary block
- Email draft block

**Why:** Capture feedback at decision time, not after scrolling 2644px.

### 4. Script Run → Confirmation Step
**Current:** "Run script" button is prominent purple, no safety rail.

**Suggested:** Change to `Preview script →` (opens modal/panel showing:
- What files/registry keys will be touched
- Estimated runtime (~2 min)
- Rollback available? Yes/No
- `Run now` / `Cancel` buttons

---

## D. ASSET SIDEBAR FIX

**Current:** Shows "webcam HD - Sentinel" for a laptop ticket.

**Fix:** Change to a laptop asset that matches the ticket:
- Name: `Dell Latitude 5520`
- Type: `Laptop`
- Status icons: CPU/RAM/disk relevant to slowness issue

---

## E. OPTIONAL — Confidence Metadata on AI Claims

Where the AI states facts, add recency/confidence:

| Current | Suggested |
|---|---|
| `84 similar tickets` | `84 similar tickets (last 30 days, 92% match confidence)` |
| `13 requesters in 10 days` | `13 requesters in 10 days (confidence: high)` |
| `-30 min` | `Saves ~30 min (based on median resolution time)` |

These can be small 11px muted-text labels under the main stat.

---

## F. MISSING STATES (Document, Don't Build Yet)

These are **new artboards** you'd design separately:

1. **AI Loading State** — Skeleton placeholders while AI generates summary/suggestions
2. **AI Error / Low Confidence** — "AI insights unavailable — showing manual triage view"
3. **Long Title Overflow** — Test with: `Critical: Exchange server down affecting all Dallas office — 47 users unable to access email`
4. **Many Suggestion Steps** — Test with 8+ steps in a card (scroll or collapse)

---

**Done. Apply text fixes first (A+B), then make UX calls (C).**
