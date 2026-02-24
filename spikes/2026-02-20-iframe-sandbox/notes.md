# Spike Notes: Iframe Sandbox

## Learnings from Previous Spike (declarative approach)

### What worked
- Single `define_app` tool call — agent generates everything in one shot
- Entity-as-MCP protocol — agent interacts with generated apps same as built-in
- CDC sync — state changes push to all clients automatically
- Generic reducer — 7 action types covered most state mutations
- 82 tests covering the full stack

### What didn't work
- Expressiveness ceiling — no 2D layout, no grid, no columns
- Every new component needs catalog entry + renderer wrapper + builder prompt update
- Builder had to learn a custom vocabulary instead of using React/CSS knowledge
- Calculator: 26 components generated, all stacked vertically, interactions unclear

### Key insight
The "safety" argument for declarative over code-gen is weak in this context.
The agent is the user's own assistant, not an untrusted third party.
Real concern is robustness (crashes), which iframe isolation solves.

## Research Notes

(Add notes here as the spike progresses)
