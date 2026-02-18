#!/bin/bash
# Runs Biome lint check on the edited file after every file edit.
# Receives JSON on stdin from Claude Code with tool_input.file_path.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only lint frontend files
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css)
    ;;
  *)
    exit 0
    ;;
esac

# Check if biome is available
if ! command -v npx &> /dev/null; then
  exit 0
fi

if [ ! -f "$CLAUDE_PROJECT_DIR/biome.json" ] && [ ! -f "$CLAUDE_PROJECT_DIR/biome.jsonc" ]; then
  exit 0
fi

# For worktree paths, run biome from the worktree root so biome.json includes apply
BIOME_CWD="$CLAUDE_PROJECT_DIR"
if [[ "$FILE_PATH" == *"/.worktrees/"* ]]; then
  # Extract worktree root: everything up to and including the worktree name dir
  WORKTREE_ROOT=$(echo "$FILE_PATH" | sed 's|\(.*/.worktrees/[^/]*\)/.*|\1|')
  if [ -d "$WORKTREE_ROOT" ]; then
    BIOME_CWD="$WORKTREE_ROOT"
  fi
fi

OUTPUT=$(cd "$BIOME_CWD" && npx biome check "$FILE_PATH" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "$OUTPUT" >&2
  exit 2
fi

exit 0
