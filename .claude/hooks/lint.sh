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

OUTPUT=$(cd "$CLAUDE_PROJECT_DIR" && npx biome check "$FILE_PATH" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "$OUTPUT" >&2
  exit 2
fi

exit 0
