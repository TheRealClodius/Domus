# Entity Examples — Content / State Split

How real entities look in the database. Each example maps to a user scenario from `SCENARIOS.md`.

The pattern: `content` holds markdown (what humans read and edit). `state` holds structured data (what renderers need). Most entities are content-only.

---

## Content-Only Entities (state = `{}`)

### Research Card (Scenario 4: Quick Factual Research)

*"Find me 5 coworking spaces in Lisbon"* — agent creates 5 entities:

```
type: "research_card"
summary: "Coworking space: Outsite Lisbon, Cais do Sodré"
```

**content:**
```markdown
# Outsite Lisbon

Coliving + coworking space in Cais do Sodré, right on the waterfront.

## Details
- **Location:** Cais do Sodré, Lisbon
- **Price:** €250/month hot desk, €400/month dedicated
- **Wifi:** 200 Mbps symmetric
- **Hours:** 24/7 for members
- **Vibe:** Digital nomad crowd, rooftop with river views

## Notes
Strong community events. Weekly dinners. Can also book a room upstairs.

## Sources
- [outsite.co/lisbon](https://outsite.co/lisbon)
- Nomad List rating: 4.2/5
```

**state:** `{}`

---

### Article Outline (Scenario 7: Article Co-creation)

```
type: "note"
summary: "Article outline: Remote Work in 2026"
```

**content:**
```markdown
# Remote Work in 2026: What Changed

## 1. The Hybrid Mandate Backlash
- Companies that forced RTO saw 30% attrition
- "Hybrid" now means employee-chosen, not employer-scheduled

## 2. Async-First Became the Default
- Meeting hours dropped 40% across Fortune 500
- Documentation culture replaced sync standups

## 3. The Tooling Shift
- AI agents replaced most project management overhead
- Spatial interfaces emerging (Domus, etc.)

## 4. Geographic Arbitrage Matured
- Visa programs in 50+ countries
- Tax implications finally getting regulatory clarity

---
*Status: outline — ready for drafting*
```

**state:** `{}`

The user opens this in a sheet and edits with Tiptap. The agent can `read_entity` and see the full article — no JSON parsing.

---

### Book Chapter (Scenario 10: Book Writing)

```
type: "note"
summary: "Chapter 3: The protagonist discovers the letter"
```

**content:**
```markdown
# Chapter 3: The Letter

The house was quiet when Elena found it — a single envelope wedged between
the radiator and the wall, yellowed at the edges, addressed in handwriting
she'd never seen but somehow recognized.

She sat on the kitchen floor and read it twice.

> Dear M,
>
> I'm writing this knowing you'll never read it. That's what makes it
> possible to say what I need to say. The house was never mine to give.
> It belonged to someone before me, and someone before her, and the
> chain goes back further than the deed claims.

---

**Agent notes (not part of manuscript):**

- Elena's reaction feels understated — consider adding a physical detail
  (hands shaking, breath held)
- The letter's voice should contrast with Elena's POV. Right now they
  sound similar.
- Connects to the property dispute in Chapter 7 — make sure the language
  here echoes the legal documents later
```

**state:** `{}`

Agent coaching notes live right in the markdown.

---

### Competitive Analysis (Scenario 6: Market Research)

```
type: "note"
summary: "Competitive analysis: 5 project management tools"
```

**content:**
```markdown
# Competitive Analysis: Project Management

## Key Findings
- Linear is winning on speed and developer experience
- Notion is broadest but losing focus
- Height is the closest competitor on AI-native features
- All five charge $8-12/user/month — pricing is commoditized

## Detailed Comparison

| Tool | Price | AI Features | Strengths | Weaknesses |
|------|-------|-------------|-----------|------------|
| Linear | $8/user | Auto-triage, cycle reports | Speed, keyboard UX | No docs/wiki |
| Notion | $10/user | AI writing, Q&A | Breadth, flexibility | Slow, unfocused |
| Height | $8/user | Auto-assign, summaries | AI-native design | Small ecosystem |
| Asana | $11/user | Smart rules, goals | Enterprise features | Complex, dated UI |
| Monday | $12/user | AI automations | Visual workflows | Expensive, noisy |

## Recommendation
Height is the closest comp. Differentiation should come from the spatial
canvas + agent-first model — none of these have that.
```

**state:** `{}`

A markdown table IS the comparison. No JSON table needed.

---

### Memory — User Fact (Scenario 20: Memory)

```
type: "fact"
presentation: "hidden"
summary: "User is vegetarian"
```

**content:**
```markdown
User is vegetarian.
```

**state:** `{}`

---

## Content + State Entities

### Calendar Event (Scenario 12: Calendar)

*"Block out every Tuesday and Thursday 2-4pm for deep work for the next 6 weeks"* — agent creates 12 entities:

```
type: "calendar_event"
summary: "Deep Work — Tue Feb 17, 2:00–4:00 PM"
```

**content:**
```markdown
Deep work block. No meetings, no Slack, no interruptions.
```

**state:**
```json
{
  "start": "2026-02-17T14:00:00",
  "end": "2026-02-17T16:00:00",
  "all_day": false,
  "recurring": null,
  "color": "blue"
}
```

The calendar grid needs typed dates to position events. `content` holds the human-readable description.

---

### Image (Scenario 8: Moodboard)

*"Generate 10 images of brutalist architecture with warm lighting"*

```
type: "image"
summary: "Brutalist concrete tower, golden hour, warm shadows"
```

**content:**
```markdown
Brutalist concrete tower at golden hour. Warm light casting long shadows
across exposed aggregate surfaces. Geometric window pattern.
```

**state:**
```json
{
  "src": "https://xyz.supabase.co/storage/v1/object/public/images/abc123.png",
  "width": 1024,
  "height": 1024,
  "prompt": "brutalist concrete tower, golden hour lighting, warm shadows on exposed aggregate, geometric windows, architectural photography",
  "generation": 1
}
```

`content` is the caption/alt text. `state` holds what the image renderer needs: URL, dimensions, original prompt for regeneration.

---

### Chart (Scenario 11: Data Modeling)

*"Here's our revenue by quarter, make me a chart"*

```
type: "chart"
summary: "Quarterly revenue 2025 — line chart with trend"
```

**content:**
```markdown
Revenue has grown steadily through 2025, with Q3 showing the strongest
quarter-over-quarter gain (+18%). Q4 dipped slightly, likely seasonal.
The overall trend supports the growth narrative for the board.
```

**state:**
```json
{
  "chart_type": "line",
  "datasets": [
    {
      "label": "Revenue",
      "data": [
        { "x": "Q1 2025", "y": 420000 },
        { "x": "Q2 2025", "y": 465000 },
        { "x": "Q3 2025", "y": 549000 },
        { "x": "Q4 2025", "y": 510000 }
      ]
    }
  ],
  "trend_line": true
}
```

Agent's analysis in `content`. Recharts data in `state`.

---

### Folder (Scenario 21: Canvas Cleanup)

```
type: "folder"
summary: "Lisbon Research — 7 entities grouped"
```

**content:**
```markdown
# Lisbon Research

Grouped 7 research cards from the coworking space search and
neighborhood comparison.

Contains:
- Outsite Lisbon
- Heden Lisbon
- Second Home
- Cowork Central
- Selina Secret Garden
- Neighborhood comparison table
- Final recommendation
```

**state:**
```json
{
  "entity_ids": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5", "uuid6", "uuid7"]
}
```

`content` is what the user reads when they open the folder. `state` holds the structural reference to children.
