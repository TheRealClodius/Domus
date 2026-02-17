# S-SOUNDS — Step Sequencer

## S-SOUNDS-1: User creates a beat

**Given** the Sounds app is open in window mode
**When** the user clicks cells in the grid to toggle steps on/off
**And** adjusts BPM via the header slider
**And** presses Play
**Then** the sequencer loops through 16 steps, triggering drum samples on active cells
**And** the step indicator highlights the current column
**And** the user can mute individual voices or adjust their volume in real-time

## S-SOUNDS-2: Agent creates a beat

**Given** the Sounds entity exists in the space
**When** the agent writes a pattern to entity state (e.g. sets kick pattern, BPM, playing: true)
**Then** the sequencer UI reflects the new pattern immediately
**And** playback starts automatically if `playing` was set to true
**And** the user can further edit the agent-generated pattern

## S-SOUNDS-3: Card mode preview

**Given** the Sounds entity is displayed in card mode
**Then** a mini 6x16 dot grid shows which steps are active, colored per voice
**And** the current BPM and playing/stopped status are visible
**And** clicking the card opens the full window mode
