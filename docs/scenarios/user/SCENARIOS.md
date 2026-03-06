# Domus — User Scenarios

What people actually do with Domus. This document sits alongside ARCHITECTURE.md and design-direction.md as the third founding document.

- **ARCHITECTURE.md** answers: *how does the system work?*
- **design-direction.md** answers: *how does it look and feel?*
- **scenarios.md** answers: *what do people actually do with it?*

These scenarios are behavioral — they describe real sessions from the user's perspective. What they see, what they say to the agent, what happens on screen. No implementation details, no architecture commentary. When a scenario describes something the architecture doesn't cover, that's a signal to update ARCHITECTURE.md — but this document stays clean.

Each scenario is a journey with key moments. Journeys expose workflow gaps. Moments expose interaction gaps.

---

## Onboarding & Navigation

### 1. First Session

A new visitor lands on Domus for the first time. No account, no context.

The screen loads into a sample space — a pre-built canvas with real entities. A welcome note card in the center explains what Domus is. Around it: a few image cards from a fictional project, a note with some writing, a calendar card with upcoming events. Enough to show the range, not so much it's overwhelming.

The prompt bar is visible at the bottom. The agent speaks first in the conversation panel:

> *"This is a sample space. Everything you see is something I created. Try moving things around, opening cards, or ask me to do something."*

The visitor taps an image card. A sheet slides up showing the full image. The canvas scales down and dims behind it. She closes the sheet, back to canvas. She drags a card to a different position. She opens the note — reads it in a sheet.

She tries the prompt bar:

> "Make me a note about things to try in Domus"

The agent creates a note card on the canvas with a list of things to explore. Agent glow. She's interacting with a real agent, not a demo script.

She keeps exploring — opens the calendar card, asks the agent a couple more questions, archives one of the sample images. After a handful of interactions, a gentle inline prompt appears in the chat flow:

> *"You've been exploring for a bit. Sign in with Google to keep your space and everything you create."*

Not a modal. Not a wall. A message in the conversation, with a sign-in button embedded as an inline action.

She signs in. The sample entities stay — they're hers now. She can keep them, archive them, ask the agent to clear them. The space transitions from guest to owned seamlessly.

> "Clear out the sample stuff. I want to start fresh."

The agent archives all the sample entities. The canvas is empty except for the prompt bar. The agent:

> *"Clean slate. What are you working on?"*

**If she doesn't sign in:** A few more interactions later, the agent's tone shifts:

> *"I can't create new things until you sign in — but feel free to keep exploring what's here."*

She tries the prompt bar again:

> "Make me a note about marketing ideas"

The agent: *"I'd need you to sign in for that. In the meantime, you can open any of the cards on canvas to see what Domus can do."*

She can still tap cards, open sheets, drag entities, read everything. The canvas is alive but frozen in terms of new content. The prompt bar stays active — the agent responds but redirects creation requests to the sign-in action.

Eventually she signs in. Everything unlocks — the agent picks up where it left off:

> *"Welcome back. Now, that marketing note — want me to create it?"*

#### Key Moments

- Landing into a pre-populated sample space (no auth required)
- Sample entities are real, interactive — not screenshots or demos
- Agent introduces itself with a first message (not a tutorial overlay)
- Guest can interact with entities: open sheets, drag, archive
- Guest can use the agent: prompt bar works, entities are created
- Auth prompt appears inline in chat after N interactions (not a modal gate)
- Feature gate: guest can browse but not create after the limit
- Agent communicates the gate conversationally, not as an error state
- Prompt bar stays active — agent responds but redirects creation requests
- Existing entities remain fully interactive (open, drag, read)
- Seamless transition: guest state persists after sign-in
- On sign-in, agent resumes the last blocked request seamlessly
- User can keep or clear sample content
- "Start fresh" as explicit agent command

---

### 2. Space Switching

A user with multiple spaces — "Marketing," "Taxes," and "Personal" — needs to jump between them.

She's working in the Marketing space. A few chat windows open, image cards scattered from a recent campaign brainstorm. She needs to check something in Taxes.

She opens the space switcher — a small panel accessible from the App Dock bottom. Three spaces listed: Marketing (active), Taxes, Personal. She taps Taxes.

The canvas crossfades. Marketing entities fade out, Taxes entities fade in. Different layout, different entities — a spreadsheet-like note with deductions, a calendar card with tax deadlines, a few document cards from her accountant. The agent's personality subtly shifts — it was playful and creative in Marketing, now it's precise and factual.

> "When is my quarterly filing deadline?"

The agent: *"April 15th. You have a reminder set for April 10th. Want me to open the tax calendar?"*

She checks the calendar in a sheet, confirms the date, then switches back to Marketing. The canvas crossfades again. Everything is exactly where she left it — the chat windows, the image cards, the cursor position in the conversation panel. No state lost.

> "Where were we? I was working on the ad headline options."

The agent picks up the Marketing conversation context: *"You were deciding between three headline options. Alex preferred option 1, Jamie pushed for option 3. Want me to pull up the comparison note?"*

#### Key Moments

- Space switcher accessible from App Dock
- Full canvas crossfade between spaces
- Each space has its own entities, layout, conversation history
- Agent personality adapts to space context
- Agent queries space-specific entities (tax calendar, marketing notes)
- Switching back restores exact state — no loss
- Agent maintains per-space conversation continuity
- Agent can resume mid-conversation context after space switch

---

### 3. Returning After Time Away

A user who hasn't opened her "Climate Ventures" research space in two weeks.

She opens Domus, switches to Climate Ventures. The canvas loads — eight research cards from her last session, the executive summary note, a few edge-linked entities. Everything is where she left it.

The agent greets her in the conversation panel:

> *"Welcome back. Last time you were building a carbon credit market overview. You finished an executive summary and were about to dig into pricing models for nature-based removal. Want to pick up there?"*

She doesn't remember the details. She taps the executive summary card — a sheet slides up with the synthesis she and the agent built together. It jogs her memory.

> "Right. Actually, I had a meeting yesterday where someone mentioned REDD+ projects specifically. What do we have on that?"

The agent searches through the space's entities — fact entities, research notes, edges:

> *"You don't have a dedicated REDD+ card yet, but the 'Nature-Based vs. Tech-Based Removal' note mentions REDD+ briefly under forestry credits. Want me to do a deep dive on REDD+ specifically?"*

> "Yes. And connect it to everything else we've built."

New cards begin appearing — "REDD+ Overview," "REDD+ Criticisms," "REDD+ Project Economics." The agent creates edge entities linking them to existing research cards. The knowledge graph grows.

#### Key Moments

- Space loads with all entities from the previous session intact
- Agent proactively summarizes where the user left off
- Agent references specific entities and conversation context from weeks ago
- User opens existing entities to refresh their own memory
- Agent searches existing entities before creating new ones
- Agent connects new research to existing knowledge graph
- Memory system (compacted turns, facts, summaries) enables long-gap continuity
- Edge entities link new work to previous work automatically

---

## Research

### 4. Quick Factual Research

A founder preparing for a trip. Working in a "Lisbon Trip" space.

> "Find me the 5 best coworking spaces in Lisbon. I need fast wifi, not too expensive, and ideally near the city center."

The agent: *"Looking into it."*

Five cards appear on the canvas in a tiled row, all in loading state. They resolve quickly — each one is a note card with the coworking space name, a one-line summary, price range, and location. Agent glow across the row.

She scans the cards without opening any — the summaries are enough for a first pass.

> "The second and fourth look good. Open them side by side."

Two sheets? No — she wants to compare. The agent opens both as cards with a bit more detail, positioned next to each other on canvas. She reads them, taps one to open a full sheet for the address and reviews.

> "Book a day pass at this one. Actually wait — just create a note with the booking link and remind me tomorrow morning."

The agent creates a note card with the booking link and a calendar entity with a reminder for tomorrow 9 AM.

> *"Note created with the booking link. You'll get a reminder tomorrow at 9."*

#### Key Moments

- Short, single-intent research session
- Five entities created from one prompt, tiled
- Card summaries sufficient for initial evaluation without opening sheets
- User directing spatial arrangement ("side by side")
- Agent transitioning from research to action (note + calendar reminder)
- Cross-entity creation in one turn (note + calendar event)

---

### 5. Deep Topic Research

A founder researching carbon credit markets to evaluate a business opportunity. Working in a "Climate Ventures" space.

> "I need to understand how carbon credit markets work. Start from the basics and build up."

The agent: *"I'll start with the fundamentals and build a knowledge base for you. Give me a moment to research."*

The agent goes to work — a few seconds of activity. Three cards appear on the canvas, tiled: "What Are Carbon Credits," "Voluntary vs. Compliance Markets," "Key Players & Registries." Each is a note card with a structured summary. Agent glow across all three.

She taps "Key Players & Registries" — a sheet slides up with a detailed breakdown. Verra, Gold Standard, ACR, CAR. Each with a one-liner and market share. She closes the sheet.

> "Go deeper on Verra. What's their process for issuing credits, and what are the criticisms?"

Two more cards appear: "Verra Issuance Process" and "Verra Criticisms & Controversies." The agent creates edge entities linking both back to the "Key Players" note.

> "What about pricing? How are credits actually priced and traded?"

A "Carbon Credit Pricing" card appears. The agent's summary in chat:

> *"Prices vary wildly — $2 to $50+ per ton depending on project type, vintage, and registry. Voluntary market has no centralized exchange. I've added a pricing breakdown card. Want me to dig into a specific project type?"*

> "Nature-based vs. tech-based removal. Compare them."

A new card: "Nature-Based vs. Tech-Based Removal — Comparison." She opens the sheet — a structured comparison with costs, permanence, scalability, and criticism for each.

She's been building for 20 minutes now. Eight cards on canvas, interconnected through edge entities.

> "Step back. Give me a one-page summary of everything we've built here — as if I'm explaining this to my co-founder."

The agent creates a new note card, larger than the others, front and center: "Carbon Markets — Executive Summary." It synthesizes across all the research cards — the agent read each entity's state to compose it.

> "This is good. Remember everything in this space. I'll come back to it."

The agent: *"All here. I'll remember the full context when you return."*

#### Key Moments

- Progressive knowledge building: basics → depth → synthesis
- Agent creates structured note cards from web research
- Tiled card layout for research results
- Card → sheet flow for reading detail
- Follow-up prompts that deepen specific branches
- Agent creating edge entities to link related research cards
- Knowledge graph growing organically through the session
- Agent synthesizing across multiple entities into an executive summary
- Agent reading full state of multiple entities to compose the synthesis
- Memory commitment — agent confirms context will persist

---

### 6. Market Research

A startup founder evaluating competitors. Working in a "Competitive Intel" space.

> "I need a competitive analysis. My product is an AI writing assistant for legal teams. Find the top 5 competitors, their pricing, key features, and weaknesses."

The agent: *"Researching now. I'll build a comparison for you."*

Five cards appear in loading state. They resolve into competitor profile cards — each with company name, one-line description, pricing tier, and a key differentiator. Agent glow fades across the row.

She scans them. Recognizes three, two are new to her.

> "I didn't know about CaseText AI. Open that one."

Sheet slides up — detailed profile. Features, pricing breakdown, target market, recent funding, notable clients. She closes the sheet.

> "Now compare all five in a table. Columns: pricing, AI model, target firm size, integrations, biggest weakness."

The agent creates a new note card — wider than the others — with a structured comparison table. Five rows, five columns. Clean, scannable.

> "Add a row for us. Our pricing is $99/seat, we use Claude, target mid-size firms, integrate with Clio and NetDocuments. Our weakness is we're new — no brand recognition."

The agent updates the table in place. The note card gets the agent glow as the content changes. Her company now sits in the comparison alongside competitors.

> "Highlight where we win and where we lose."

The agent updates the table with annotations — strengths marked in each cell, gaps called out. In the chat:

> *"You win on pricing and AI model quality. You lose on integrations — three of the five have 10+ integrations compared to your two. Brand recognition is the biggest gap."*

> "Create a strategy note based on this. What should we prioritize?"

A new note card: "Go-To-Market Priorities." The agent synthesizes the competitive analysis into three recommended priorities with rationale. Linked via edge entity to the comparison table.

#### Key Moments

- Multi-entity competitive research from a single prompt
- Structured comparison table as a note entity
- User adding their own data to agent-created content
- Agent updating entity state in place (merge patch, not replacement)
- Agent annotating and analyzing structured data
- Synthesis from analysis to strategy (comparison → recommendations)
- Edge entities linking strategy note to source analysis
- Agent providing insight, not just information retrieval

---

### 7. Article Co-creation

A content marketer writing a long-form article. Working in a "Content" space.

> "I need to write a 2,000-word article about why small businesses should use AI for customer service. Help me build an outline first."

The agent creates a note card: "Article Outline — AI Customer Service for SMBs." Inside: a structured outline with five sections, each with bullet points for key arguments. Agent glow.

She opens the sheet and reads through it.

> "Good structure. But section 3 is weak — 'Cost Savings' needs real data. Find me some stats."

The agent: *"Looking for data."* A few seconds later, it updates the outline — section 3 now has three statistics with sources embedded. The sheet content refreshes in place.

> "OK, let's start writing. Open a proper document for this."

The agent creates a new entity — a document window. Not a card, not a sheet. A rich editing window with a title, the outline pulled in as a starting structure, and a cursor ready for writing. The outline card stays on canvas as reference.

She starts typing in the document window — the introduction. The agent watches but doesn't write. After she finishes the first paragraph:

> "How's that opening? Too formal?"

The agent: *"The opening is clear but reads a bit stiff. Consider leading with a specific scenario — 'A bakery owner spends three hours a day answering the same five questions.' That kind of hook. Want me to suggest a rewrite?"*

> "Suggest, don't replace."

The agent sends a suggestion in the chat — a rewritten opening paragraph. She reads it, likes the hook, but rewrites it in her own voice in the document window. She takes the bakery angle but uses different phrasing.

She moves to section 2. Gets stuck.

> "I don't know enough about chatbot platforms for small businesses. Research this for me — what are the top 3 options under $50/month?"

Three research cards appear on canvas next to the document window. She reads the summaries without leaving the document — cards are visible on canvas alongside the window. She pulls one stat from a card and types it into her paragraph.

> "This section is getting long. Should I split it?"

The agent: *"Section 2 is at 600 words. For a 2,000-word target, that's heavy. I'd split 'Platform Options' into its own section and keep 'Implementation' shorter. Want me to update the outline?"*

She agrees. The outline card updates. She continues writing.

#### Key Moments

- Agent creates article scaffolding (outline) as a note card
- Agent researches to fill gaps in the outline (stats, sources)
- Agent updates existing entity state with new research
- Transition from card/sheet to document window for long-form writing
- Rich document editing in a persistent window
- Agent as writing coach — suggests but doesn't replace user's voice
- Suggestions delivered in chat, user implements in their own words
- Research cards as reference alongside the document window
- Agent providing structural advice (word count, section balance)
- Outline entity updated to reflect structural changes
- Two entities in play simultaneously: outline card + document window

---

## Creative

### 8. Moodboard

A designer building a visual moodboard for a client project. Working in a "Brand Identity" space.

The canvas has a few entities already — a brief note from an earlier session, a color palette card the agent created last week. She opens the prompt bar.

> "I need 10 images for a moodboard. Think brutalist architecture, warm concrete, golden hour lighting. Mix of wide establishing shots and tight texture details."

The agent: *"Generating 10 images — 6 wide shots, 4 texture close-ups."*

Ten cards appear on the canvas at once, tiled in a grid, all showing warm shimmer placeholders. As each Gemini call returns, the shimmer cross-fades to the final image. The grid fills in over a few seconds — some faster than others, no guaranteed order. Agent glow on each card as it resolves.

She scans the grid. Most land well. She taps a texture shot — a bottom sheet slides up with the full-resolution image. The canvas scales down and dims behind it. Good. She closes the sheet, back to the canvas.

Two of the wide shots are too cold — blue tones, not the golden hour she asked for. She right-clicks one, archives it. The card scales down and fades. She archives the other.

The agent notices: *"I see you removed two. Want me to generate replacements with warmer tones — more sunset, less overcast?"*

> "Yes, do that."

Two new shimmer cards appear in the grid. They resolve into warmer shots. Better.

She taps one of the keepers to open the sheet — the concrete grain is right but the color is too desaturated.

> "Make this one warmer. More ochre in the highlights."

The sheet shows a shimmer as the agent sends the image to Gemini for editing. The updated image replaces the original. She closes the sheet — the card on canvas now shows the edited version, agent glow fading.

She drags the keeper cards into a cluster on the left side of the canvas.

> "Call this 'Approved — Round 1' and remember these are for the Morrison project."

The agent: *"Noted. I'll remember these are Morrison Round 1."*

#### Key Moments

- Bulk generation: 10 parallel Gemini calls, 10 cards in loading state simultaneously
- Tiled grid layout for batch results
- Progressive reveal: shimmer → image as each call returns independently
- Card as preview surface — sufficient for visual scanning without opening
- Card → sheet → card flow for detail inspection
- Archiving rejected cards (right-click → archive, scale-down animation)
- Agent proactively offering to replace archived images
- Image editing within sheet view — shimmer → updated content
- Edited image reflected on card when sheet closes
- Manual spatial clustering (drag cards into groups)
- Agent creating memory from user instruction (fact + edge entities)

---

### 9. Image Editing

A user iterating on a generated image. Working in the same "Brand Identity" space from the moodboard session.

She taps one of the moodboard images from Round 1 — a wide shot of a brutalist building at golden hour. The sheet opens.

> "Remove the people in the foreground. Keep everything else exactly the same."

The sheet shows a shimmer. A few seconds later, the image updates — people gone, background intact. Agent glow on the sheet border. She inspects it. Clean removal.

> "Now crop tighter on the building entrance. Make it feel more imposing."

Shimmer again. The image reframes — tighter crop, the entrance dominates. The sense of scale increases.

> "Good. Now give me three variations of this: one in black and white, one with a blue steel tone, and one pushing the golden hour even harder."

Three new image cards appear on the canvas behind the sheet. She closes the sheet to see them. Three variations, tiled next to the original. She scans — the blue steel version has an interesting mood.

> "I like the blue steel one. Replace the original with this."

The agent archives the original and moves the blue steel card to where it was. The other two variations stay on canvas in case she wants them later.

> "How many edits has the original gone through?"

The agent: *"Four edits on this image: people removed, cropped tighter, then the blue steel tone. At this many edits, there's some quality loss from re-encoding. Want me to regenerate from scratch with a single comprehensive prompt?"*

> "Do it."

The agent constructs a prompt that captures everything — brutalist building, tight crop on entrance, blue steel tone, no people — and generates fresh. A shimmer card appears, resolves into a crisp result. Cleaner than the iterated version.

#### Key Moments

- Sequential image editing through natural language
- Each edit modifies the image in place within the sheet
- Agent tracking edit history on the image entity
- Multiple variations generated from a single edited image
- User choosing a variant and replacing the original
- Agent aware of quality degradation from cumulative edits
- Agent proactively suggesting regeneration at degradation threshold
- Single comprehensive prompt for fresh generation from accumulated edits
- Edit count tracked in entity state

---

## Productivity

### 10. Book Writing

A writer working on a novel. Working in a "Book — The Last Signal" space.

The canvas is organized: a chapter outline note pinned to the left, character profile cards along the top, and the current chapter document window in the center. She's 40,000 words in.

She opens the chapter document window — Chapter 14. She reads the last paragraph she wrote yesterday. Picks up typing from where she stopped. The agent doesn't interrupt — it watches but stays quiet during active writing.

She hits a block.

> "I'm stuck on the transition between the lab scene and the rooftop confrontation. How do I get Elena from the basement to the roof without it feeling rushed?"

The agent reads the current chapter state and the character profile for Elena:

> *"Elena's claustrophobia is established in Chapter 3. You could use the elevator — she forces herself in, the confined space heightens tension, and the doors open to the rooftop. The physical discomfort bridges the emotional shift from analytical (lab) to confrontational (roof). The elevator ride gives you 30 seconds for internal monologue."*

> "That's good. I'll use that."

She writes the transition. Doesn't ask the agent to write it — the idea was enough. After two paragraphs she wants a consistency check.

> "Does this contradict anything from earlier chapters? Elena's reaction to small spaces."

The agent searches through chapter entities and character notes:

> *"Chapter 3, page 12: 'Elena pressed her back against the far wall of the closet, counting breaths.' Chapter 8: she avoids the subway and takes a cab. Your new elevator scene is consistent — she'd hate it, which is the point. One note: in Chapter 8 she specifically says 'I don't do boxes.' You might callback to that line."*

> "Perfect. Update Elena's character card — add 'elevator scene, Chapter 14' to her fear/claustrophobia notes."

The character profile card on canvas gets the agent glow as it updates.

Later, she finishes the chapter.

> "Give me a summary of Chapter 14 for the outline."

The agent reads the full chapter and generates a one-paragraph summary. The chapter outline note updates with the new entry.

#### Key Moments

- Persistent document window for long-form writing (not a card/sheet)
- Agent silent during active writing — doesn't interrupt creative flow
- Agent as creative consultant: suggests ideas, doesn't write prose
- Agent reading entity state across multiple chapters for consistency checks
- Agent searching character profiles for continuity details
- Agent providing specific references (chapter, page, quote)
- User manually writing — agent provides scaffolding only
- Character profile entity updated with new plot references
- Chapter outline entity updated with summary
- Cross-entity awareness: agent connects chapter content to character notes

---

### 11. Data Modeling

> **Note:** The chart entities in this scenario are examples of **agent-generated apps** — the chart app is not a built-in app type in `apps/`. The agent creates the chart component, schema, and rendering logic on the fly when the user asks for data visualization. This is how Domus extends beyond its core app set.

An analyst building a visual trend analysis. Working in a "Q1 Performance" space.

> "I have our monthly revenue data for the last 12 months. Help me visualize the trend. January: $42K, February: $38K, March: $51K, April: $49K, May: $55K, June: $61K, July: $58K, August: $67K, September: $72K, October: $69K, November: $78K, December: $85K."

The agent creates a chart card on the canvas — a line chart showing revenue over 12 months. Clean, minimal, matching the Domus design language. Agent glow.

She taps the card — a sheet opens with the full chart, larger, with data labels visible.

> "Add a trend line. And mark the months where we beat our $60K target."

The chart updates in the sheet — a trend line appears, and months above $60K are highlighted. Seven out of twelve months beat target, all in the second half.

> "Now break this down by product line. We have three: Core, Enterprise, and API. I'll give you the split."

She types out the breakdown. The agent creates a stacked area chart — a new card next to the first one. Both are visible on canvas.

> "What's the story here? What should I tell the board?"

The agent analyzes the data across both charts:

> *"Revenue grew 102% year-over-year. Core is flattening — $30K to $33K, only 10% growth. Enterprise is the engine — $8K to $35K, 337% growth. API started in May and is already at $17K. The story: Enterprise is carrying growth, Core is mature, API is the bet. If API maintains its trajectory, it passes Core by March."*

> "Create a board summary note with that analysis and link it to both charts."

A note card appears: "Q1 Board Summary." Edge entities connect it to both chart cards. The summary includes the key narrative and projections.

#### Key Moments

- Data entry through natural language (no spreadsheet import needed for small datasets)
- Chart entity rendered as a card on canvas
- Chart editing through conversational prompts (trend line, highlights)
- Multiple chart entities for different views of the same data
- Agent performing analytical reasoning, not just visualization
- Agent synthesizing narrative from data ("the story for the board")
- Note entity with edge links to source chart entities
- Cross-entity reading: agent analyzes multiple charts to produce insight

---

### 12. Calendar

A user planning her week. Working in a "Personal" space.

> "Set up my week. I have a dentist appointment Tuesday at 2 PM, a team standup every morning at 9, and I need to block Friday afternoon for deep work."

The agent: *"Creating your events."*

A calendar window appears on the canvas — week view. Events populate: "Dentist" on Tuesday at 2 PM, "Standup" repeated Monday through Friday at 9 AM, "Deep Work" blocked on Friday 1-5 PM. Agent glow on the calendar window.

She scans the week.

> "Move standup to 9:30 on Wednesday — I have a conflict."

The Wednesday standup shifts to 9:30 in the calendar. Agent glow on the changed event.

> "What does Thursday look like? I need to fit in a 2-hour strategy session."

The agent: *"Thursday has standup at 9, then nothing until end of day. You have a 6-hour open block from 10 AM to 4 PM. Want me to put the strategy session at 10?"*

> "Make it 1 PM. I'm not strategic in the morning."

The event appears. She opens the "Deep Work" block on Friday by tapping it — a small detail popover shows time, duration, and a notes field. She types "Finish Q1 report" in the notes directly.

Later in the week, she realizes she needs to reschedule the dentist.

> "Push the dentist to next Thursday, same time."

The event moves. The agent: *"Moved to next Thursday at 2 PM. Want me to set a reminder the day before?"*

> "Yes."

A reminder entity is created, linked to the dentist event via an edge.

#### Key Moments

- Batch event creation from natural language
- Calendar rendered as a persistent window (interactive app, not a card)
- Recurring events from a single prompt
- Agent moving events conversationally
- Agent aware of open time blocks — suggests optimal placement
- Direct user interaction with calendar (typing notes in event popover)
- Event rescheduling across weeks
- Agent proactively offering related actions (reminders)
- Reminder as a separate entity, linked to the event

---

### 13. File Ingestion

A user uploading documents for a tax preparation session. Working in a "Taxes 2025" space.

She drags a PDF onto the canvas — her W-2 from an employer.

The agent: *"I see a W-2 from Acme Corp. Want me to extract the key information?"*

> "Yes, pull out everything important."

The agent processes the PDF. A note card appears: "W-2 — Acme Corp" with extracted fields — employer name, wages, federal tax withheld, state tax withheld, Social Security wages. The original PDF is stored in Supabase Storage, linked to the note via an edge entity.

> "I have five more documents. Let me drop them all."

She drags five files onto the canvas — another W-2, a 1099-NEC, two 1099-INT forms, and a mortgage interest statement. Five cards appear in loading state. The agent processes them in parallel — each resolves into a structured note card with extracted data. Agent glow across the batch.

> "Summarize my total income and tax paid across all documents."

The agent reads all six note entities and creates a summary card: "2025 Tax Summary." Total wages, freelance income, interest income, total federal tax withheld, total state tax withheld. All computed from the extracted data.

> "Am I missing anything? What else do I typically need?"

The agent: *"Based on what you've uploaded: you have W-2s, a 1099-NEC for freelance work, 1099-INTs for interest, and a mortgage statement. Common missing items: charitable donation receipts, health insurance (1095-A/B/C), and any business expenses if the freelance work had costs. Want me to create a checklist?"*

A checklist card appears with the missing items. She checks off "no business expenses" and "no 1095 needed."

> **Note:** The checklist entity here is an example of an **agent-generated app** — the agent creates a checklist component with interactive checkboxes on the fly, not a built-in app type.

> "Remember that I file as single, standard deduction, in California."

The agent: *"Noted. I'll keep that in mind for this space."*

#### Key Moments

- File upload via drag-and-drop onto canvas
- Agent processing uploaded files into structured entity data
- Original files stored in Supabase Storage, linked to extracted entities
- Batch file upload — multiple files processed in parallel
- Agent extracting structured information from unstructured documents
- Agent synthesizing across multiple extracted entities (tax summary)
- Agent providing domain-specific guidance (missing documents)
- Checklist entity for tracking outstanding items
- Memory: agent stores filing status as a fact entity

---

## Communication

### 14. Chat

A user messaging a colleague. Working in a "Work" space.

> "Open a chat with Alex."

A chat window appears on the canvas — "Alex" in the title bar, empty message area, input field at the bottom. Agent glow on the window border.

She types directly in the chat window — this is app interaction, not agent interaction. Her message appears on the right side. A few moments later, Alex responds. Messages appear in real time on the left side.

The conversation flows — they discuss a project deadline, share a few links, Alex sends an image. The chat window behaves like a standalone messaging app. No avatars, timestamps on hover, minimal chrome.

She needs to reference something from the chat later. She highlights a message from Alex about the deadline.

> "Save Alex's message about the deadline as a note."

The agent creates a note card on canvas with the quoted message, attributed to Alex, with the date. Edge entity links the note back to the chat entity.

She gets busy and leaves the chat window open but stops reading. An hour later, 12 new messages from Alex.

She doesn't want to scroll through them all. She asks the agent through the prompt bar:

> "What did Alex say in the last hour?"

The agent reads the chat entity's recent messages:

> *"Alex confirmed the deadline is moved to Friday. Asked if you've reviewed the mockups. Shared a Figma link. Wants your feedback by end of day."*

She glances at the key messages in the chat window, then responds directly.

#### Key Moments

- Chat window created via agent prompt
- Chat as a persistent window (interactive app, not a card)
- Direct messaging in the chat window — not mediated by the agent
- Real-time message delivery
- Agent extracting content from a chat entity into a note entity
- Edge entity linking extracted note to source chat
- Agent summarizing unread messages from the chat entity's state
- Summary delivered in the conversation panel, not inside the chat window
- Two interaction layers: direct app interaction (typing in chat) and agent interaction (summarize, extract)

---

### 15. Chat Groups

A user managing team communication inside a "Marketing" space.

She already has a 1:1 chat window open with Alex. She wants to pull more people in.

> "Create a group chat with Alex, Jamie, and Sam. Call it 'Campaign Launch'."

A new chat window appears on the canvas — "Campaign Launch" in the title bar, three participant avatars in the header. Agent glow fades on the window border. The window is empty, waiting for the first message.

She types directly in the chat window — this is app interaction, not agent interaction. Messages appear in real time as other participants respond. The chat window behaves like a standalone messaging app embedded in the space.

Later, she's been away for an hour. 30 new messages in the group. She doesn't want to read them all.

> "Summarize what happened in Campaign Launch while I was gone."

The agent reads the chat entity's state — the message history — and responds in the conversation panel:

> *"Jamie shared three headline options for the ad. Alex pushed back on option 2 — too aggressive for the brand. Sam suggested A/B testing options 1 and 3. They're waiting on your call."*

She taps the chat window to read the key messages Jamie and Alex exchanged, then responds directly in the group.

> "Create a note summarizing the decision: we're A/B testing options 1 and 3. Link it to the Campaign Launch chat."

A note card appears on the canvas next to the chat window. The agent creates an edge entity connecting the note to the chat. The agent: *"Done. The note is linked to Campaign Launch."*

#### Key Moments

- Creating a group chat via agent prompt (entity creation with participants in state)
- Chat window as a persistent app window (not a card/sheet — interactive app)
- Direct typing in chat window — app interaction, not agent interaction
- Real-time messaging within the chat entity
- Agent summarizing unread messages from a chat entity's state
- Summary delivered in conversation panel, not inside the chat window
- Agent creating a note entity from a decision
- Knowledge graph: edge entity linking note to chat
- Agent and user interacting with the same entity through different paths

---

### 16. Agent Summarizes Chat Messages

A user with multiple active chats across spaces. Starting her day in the "Work" space.

She has four chat windows — Alex, Jamie, the Campaign Launch group, and a Client Updates group. All have unread messages from overnight.

> "Give me a morning briefing. Summarize all my unread chats."

The agent reads the message history of all four chat entities, identifies what's new since her last activity:

> *"Here's your morning briefing:*
>
> *Alex: Asked if the budget proposal is ready. Needs it by noon.*
>
> *Jamie: Shared the final ad creative. Wants your sign-off.*
>
> *Campaign Launch: The team decided on the tagline — 'Build faster, ship smarter.' Three thumbs up, no objections.*
>
> *Client Updates: Two new messages from the Acme account. They're requesting a timeline extension for Phase 2. Sarah responded that she'd discuss with you first."*

> "Create a task list from this. What do I need to act on?"

The agent creates a note card: "Morning Actions" with four items — send budget to Alex, review Jamie's creative, acknowledge tagline decision, discuss Acme extension with Sarah.

> "Start with Alex. Open his chat."

The Alex chat window comes to focus — moves to top z-index, elevated shadow. She reads his messages, types a response directly, and sends.

> "Done. What's next?"

The agent: *"Jamie's ad creative. Want me to open that chat?"*

#### Key Moments

- Agent summarizing across multiple chat entities in one response
- Cross-entity reading: agent processes four chat histories simultaneously
- Morning briefing as a workflow pattern
- Agent extracting action items from chat summaries
- Task list entity created from multi-chat synthesis
- Agent guiding the user through a task sequence
- Chat window focus management (z-index, elevation)
- Mix of agent interaction (briefing, task list) and direct app interaction (typing in chat)

---

## System & Agent

### 17. Settings

A user adjusting how the agent behaves. Working in any space.

> "When you create notes, always use bullet points instead of paragraphs."

The agent: *"Got it. I'll default to bullet-point formatting for new notes."*

This is a fact entity with a preference scope — it applies to how the agent creates note entities going forward. No settings panel, no form. A conversational preference.

> "Actually, make that only in my Work space. In Personal I prefer prose."

The agent: *"Updated. Bullet points in Work, prose in Personal."*

Two fact entities — one per space, scoped to each space's context.

Later, she wants to adjust something about the canvas.

> "Entities are spawning too close together. Space them out more."

The agent: *"I'll increase the default spacing between new entities when I create multiples. How does this feel?"*

It creates three test cards, more widely spaced than before. She looks at the layout.

> "A bit more."

The agent adjusts. Three more test cards, wider spacing.

> "Perfect. Clean up the test cards."

The agent archives the test cards.

> "Show me all my preferences."

The agent queries for fact entities of the preference type and lists them in the chat:

> *"Here's what I remember about your preferences:*
> *- Notes: bullet points (Work), prose (Personal)*
> *- Entity spacing: wider than default*
> *- Filing status: single, standard deduction, California (Taxes 2025 space)*
> *- Theme: dark mode, orange accent"*

#### Key Moments

- Settings as conversation, not a settings panel
- Preferences stored as fact entities
- Per-space preference scoping
- Agent adjusting spatial behavior from conversational feedback
- Live preview of changed settings (test cards)
- Cleanup of temporary entities
- Agent querying and displaying all stored preferences
- Preferences span spaces (theme) and per-space (note formatting)

---

### 18. Billing Dashboard

A paying user checking her usage mid-session. Working in any space.

She's been generating images for the moodboard and running several research queries. She wants to see where she stands.

> "How much have I used today?"

The agent: *"Today you've used 14 agent turns, generated 12 images, and processed 6 file uploads. You're at about 40% of your monthly allocation. Want me to open the full breakdown?"*

> "Yes."

A billing dashboard opens as a window — always accessible, doesn't disrupt the canvas. It shows:

- **This billing period:** usage bar with percentage, days remaining
- **By category:** agent turns, image generations, image edits, file processing — each with a count and cost
- **Daily trend:** a small sparkline showing usage over the past 14 days
- **Plan:** current plan name, renewal date, upgrade option

She scans it. Image generation is the biggest line item — 70% of her usage.

> "Image gen is expensive. Can I see how much each image costs?"

The agent: *"Each generation is approximately $0.04. Edits are $0.04 as well. Your 12 generations today cost about $0.48. At your current pace, you'll use about 60% of your monthly image budget."*

She decides to be more selective with generation — fewer speculative images, more deliberate prompts.

Later, she's approaching her limit toward the end of the month:

> "How much do I have left?"

The agent: *"You're at 92% of your monthly allocation. About 15 agent turns and 3 image generations remaining. Your plan renews in 4 days. Want to upgrade for the rest of the month?"*

> "No, I'll wait it out. Warn me when I hit 100%."

The agent: *"I'll let you know before you hit the limit."*

When she reaches the cap, the agent communicates it conversationally:

> *"You've reached your monthly limit. You can still browse and interact with everything on canvas, but I can't create new entities or generate images until your plan renews on March 1st. Want to upgrade?"*

Same feature-gate pattern as the guest flow — read and interact, but no new creation.

#### Key Moments

- Usage check through natural language ("how much have I used?")
- Agent provides quick summary before opening full dashboard
- Billing dashboard as a window (non-disruptive)
- Usage broken down by category (turns, images, files)
- Per-item cost transparency on request
- Agent projecting future usage from current pace
- Proactive warning as limit approaches
- Conversational limit communication (not an error modal)
- Feature gate at limit — same pattern as guest flow
- Upgrade offered inline, never forced

---

### 19. Quota Limit — Inline Error & Profile Usage Tab

A free-plan user is chatting with the agent to create content. After a few turns, she hits her 10-turn monthly limit. In the ConversationPanel, an inline error appears beside a warning icon:

> *"You've used all your agent turns for this period."*

Next to it, a **View usage** button. She clicks it — the profile panel opens directly to the Usage tab. Three progress bars appear: Messages (10/10), Images (0/0), Web Searches (3/5). A "Resets April 1" label shows when limits reset.

Below the bars, an upgrade prompt: *"You're on the free plan. Upgrade to Domus Citizen for more agent turns, image generation, and web search."*

She reads it and decides to wait for the reset. She can still open entity sheets, drag cards, and interact with existing content — the canvas is fully usable; only new agent creation is paused.

---

A Domus Citizen user hitting her monthly limit sees the same inline error and "View usage" deeplink. When she opens the Usage tab, real bars are shown at 100%: Messages (200/200), Images (20/20), Web Searches (50/50). She upgrades to Domus Extra from the Billing section.

---

A user who sends messages too quickly (short-window rate limit, not a quota issue) sees a different inline message:

> *"Too many requests — please wait a moment."*

No "View usage" button appears — this is a transient back-off, not a quota problem. The ConversationPanel clears the error automatically on the next successful turn.

#### Key Moments

- Quota error appears inline in chat, not as a modal interrupt
- "View usage" deeplinks directly to the Usage tab — one click, no navigation
- Free plan shows upgrade CTA instead of bars
- Paid plans show exact `used / limit` counts with a reset date
- Rate-limit errors (short-window) show no deeplink — wrong error type
- Canvas remains fully interactive after hitting quota

---

### 20. Theme

A user who wants to switch to dark mode and tweak the accent color. Working in any space.

> "Switch to dark mode."

The canvas transitions — surfaces shift from warm off-white to deep warm gray. The crossfade uses the View Transitions API, smooth and quick. Agent glow is still visible, maybe even more striking against the darker surfaces.

The agent: *"Done. Want to adjust anything else — accent color, or the overall warmth?"*

> "Make the accent more orange. Less pink."

The agent updates the primary hue. Focused borders, hover states, and the agent glow all shift toward orange. The change is immediate — tokens update, everything downstream follows.

> "That's good. Remember this for all my spaces."

The agent: *"Saved as your default. New spaces will use this theme."*

#### Key Moments

- Voice-driven theme switching (no settings panel needed)
- View Transitions API crossfade between light/dark
- Accent color adjustment through natural language
- Token pipeline responds immediately — all surfaces update in real time
- Agent saves preference as a persistent fact across spaces

---

### 20. Memory

A user telling the agent to remember things at various points throughout a session. Working across multiple spaces.

In the Marketing space, mid-conversation about a campaign:

> "Remember that our brand voice is casual but never sarcastic. We dropped sarcasm after the Q3 focus groups."

The agent: *"Noted. Casual but never sarcastic — I'll keep that in mind for this space."*

She switches to the Personal space to plan a birthday party.

> "Remember that Mom is allergic to shellfish and Dad doesn't drink red wine."

The agent: *"Got it. I'll remember that for any food or event planning."*

Later, back in Marketing:

> "We're planning a team dinner. Any dietary restrictions I should know about?"

The agent: *"I don't have dietary information for your team yet. Want to tell me, or should I create a note where everyone can add theirs?"*

It doesn't surface Mom's shellfish allergy — that's in the Personal space. Space isolation works.

She then tests recall:

> "What do you know about our brand voice?"

The agent: *"Your brand voice is casual but never sarcastic. You dropped sarcasm after the Q3 focus groups."*

> "Add to that: we use first-person plural — 'we' not 'I' — in all external comms."

The agent: *"Updated. Casual, never sarcastic, first-person plural for external communications."*

The fact entity is updated in place, not duplicated.

> "What have I told you to remember in this space?"

The agent queries all fact entities in the Marketing space:

> *"Here's everything I'm remembering in this space:*
> *- Brand voice: casual, never sarcastic, first-person plural for external comms*
> *- Target audience for Q1: mid-market SaaS, 50-200 employees*
> *- Campaign Launch tagline: 'Build faster, ship smarter'*
> *- Morrison project moodboard: Round 1 approved"*

> "Forget the target audience one. That's outdated."

The agent archives the fact entity: *"Removed."*

#### Key Moments

- User storing memories at arbitrary points in conversation
- Fact entities created from natural language
- Space-scoped memory — Personal facts don't leak into Marketing
- Agent recalls stored facts when relevant
- Agent updates existing fact entities (merge, not duplicate)
- User querying all stored memories in a space
- User deleting outdated memories
- Memory as entity lifecycle: create, update, archive

---

### 21. Canvas Cleanup

A user whose canvas has become cluttered after weeks of work. Working in a "Marketing" space with 30+ entities scattered across the canvas.

> "This is a mess. Clean it up."

The agent surveys the entities — reads types, summaries, edges, creation dates, and spatial positions:

> *"You have 34 entities on canvas. I see a few natural groupings:*
> *- Campaign Launch content (12 entities — ads, headlines, moodboard images)*
> *- Competitive research (6 entities — competitor profiles, comparison table)*
> *- Meeting notes (8 entities — various dates)*
> *- Miscellaneous (8 entities — one-off notes, orphaned images)*
>
> *Want me to organize them into clusters? I can group related entities together and archive anything that looks stale."*

> "Group them. But don't archive anything without asking me first."

The entities begin moving — spring animations as they rearrange. Campaign content glides to the upper left, research clusters in the upper right, meeting notes line up along the bottom. Orphaned items gather in the center.

Agent glow on every moved entity, fading as they settle.

> "What's in miscellaneous?"

The agent: *"A note from January about a logo idea, two images that aren't linked to any project, a quick note that just says 'call Sarah,' and three empty notes with no content."*

> "Archive the empty ones and 'call Sarah.' Keep the logo note and images."

Three cards scale down and fade. The agent moves the logo note and images into a small cluster.

> "Create a folder for each group. Label them."

The agent creates folder entities — "Campaign Launch," "Competitive Research," "Meeting Notes," "Ideas." Each folder is a card on canvas that visually groups its children. The entities tuck into their folders.

> "Much better. Do this automatically every couple of weeks."

The agent: *"I'll remember to suggest a cleanup when things get cluttered."*

#### Key Moments

- Agent surveying all entities and proposing organization
- Content-aware grouping (by type, edges, dates, summaries)
- Agent asks before archiving — doesn't delete unilaterally
- Spatial rearrangement with spring animations on all moved entities
- Agent glow across batch of moved entities
- User reviewing "miscellaneous" before deciding
- Selective archival from a presented list
- Folder entities as visual groupings on canvas
- Agent remembering a recurring preference (periodic cleanup)

---

### 22. Agent Proactivity

A user with a busy calendar. Working in a "Personal" space. She hasn't asked the agent for anything — this is the agent acting on its own.

She opted into proactive agent behavior in her settings — background agents wake up based on events.

**Morning:** Her calendar has a dentist appointment at 2 PM. At 8:30 AM, when she opens Domus, the agent has already left a message in the conversation panel:

> *"You have a dentist appointment at 2 PM today. It's a 25-minute drive from your office. You might want to leave by 1:30. Want me to block 1:30–1:45 as travel time?"*

> "Yes."

The calendar updates with a travel block.

**Mid-day:** She has a meeting with a client at 3:30 PM. The agent notices she created research notes about this client yesterday:

> *"Your meeting with Acme Corp is at 3:30. Yesterday you built research notes on their Q4 performance. Want me to pull those up before the meeting?"*

> "Open them."

The research cards from yesterday's session appear on canvas, arranged neatly.

**End of day:** The agent reviews what happened:

> *"End of day summary: 3 meetings completed, 2 notes created, 1 task still open (send budget to Alex — from this morning's briefing). Tomorrow you have 2 meetings and the Morrison project deadline."*

She didn't ask for any of this. The agent monitored calendar events, connected them to existing entities, and surfaced relevant context at the right moments.

**What if she hadn't opted in:** The agent stays silent. No proactive messages, no morning briefings. All the same information is available — she just has to ask. The agent is reactive only, responding when spoken to.

#### Key Moments

- Agent acting without user prompt (opt-in proactive mode)
- Calendar-triggered agent behavior (upcoming events)
- Agent connecting calendar events to existing entities (research notes for a client meeting)
- Contextual surfacing: right information at the right time
- Travel time awareness and calendar blocking
- End-of-day summary: synthesizing the day's activity
- Referencing cross-session entities (morning briefing task list)
- Clear opt-in/opt-out: proactivity is a user choice, not default
- Cost awareness: background agents consume resources, hence opt-in

---

### 23. Folder Grouping and Scatter

A user whose canvas has grown busy after a research session — 14 cards scattered from a project sprint. She wants the agent to organise them without losing anything.

> "Group these research notes together and the images separately."

The agent queries the visible entities, reads their types and summaries. It creates a folder entity ("Research Notes"), then calls `add_children` with the note entity IDs. Each note's card disappears from the canvas; a single folder card appears in its place. The agent does the same for the images — a second folder card, "Images," takes their place. The canvas goes from 14 visible cards to 4: two folders, a calendar, and a chat window.

> "What's in the research folder?"

The agent: *"Nine notes — competitor analysis, three market sizing breakdowns, two interview summaries, a pricing comparison, and two rough outlines."*

> "Open the research folder."

The folder card scatters — the nine notes spring back into a grid around where the folder was. The folder card itself stays visible but emptied.

> "I want to see the pricing comparison."

The agent opens that note in a full-screen sheet. She reads it, makes edits in the sheet, closes it.

> "Regroup everything."

The agent calls `add_children` on the research folder again with all nine note IDs. The cards fold back in. One folder card.

#### Key Moments

- Agent grouping by content type in response to a natural instruction
- Folder entity created with a meaningful summary label
- Child entities transition to `presentation: 'hidden'`; folder card appears in their place
- Agent can describe folder contents without scattering
- Click-to-scatter: user can tap the folder card to spread children back
- Re-grouping: agent adds entities back into an existing folder
- Folder state is agent-managed via `call_entity_tool` — no frontend-only workarounds
- Child patch side effects (presentation + `_folderId`) happen atomically after folder state write

---

### 24. Removing a Generated App

A user asked the agent to build a habit tracker app two weeks ago. It's been sitting in the dock unused. She right-clicks its icon.

A small context menu appears: **Open** / **Delete**.

She picks Delete. A confirm dialog: *"Delete Habit Tracker? This will remove the app permanently."* Two buttons: Cancel and Delete.

She clicks Delete. The icon disappears from the dock immediately.

#### Key Moments

- Right-click on a generated app dock icon reveals Open / Delete context menu
- Built-in app icons (Chat, Calendar, Settings) have no context menu — only generated apps
- Confirm dialog prevents accidental deletion
- Deletion is immediate and optimistic (no loading state); synced to DB in the background
- Refresh confirms the app is gone — archived in the DB, not visible on re-load

---

### 25. Canvas Yields to Agent Chat, Then Restores

A user with several cards and windows spread across the canvas. She opens the agent chat panel — the cards fluidly glide to the sides, making space. The canvas parts like a theater curtain.

While the chat is open, she decides to reposition one card manually — grabs it and drags it to a corner she finds more convenient. The card stays there.

She sends a message to the agent, gets a response. She closes the chat panel. The parted entities return to their original positions — except the one she moved manually. That card stays in its new corner. The canvas restores, but honors her intent.

She reopens the chat panel. The entities part again — including the moved card, which now parts from its new position.

#### Key Moments

- Entities part with a slow cinematic spring when the chat panel opens
- User can still interact with entities (drag, resize) while chat is open
- Manually moved or resized entities are excluded from restore on close
- Everything else springs back to original positions on close
- On next open, parting recalculates from current positions (including user-relocated entities)
