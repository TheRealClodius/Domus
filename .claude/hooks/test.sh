#!/bin/bash
# Runs related tests after every file edit.
# Receives JSON on stdin from Claude Code with tool_input.file_path.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Frontend files → Vitest
case "$FILE_PATH" in
  *.ts|*.tsx)
    if [ -f "$CLAUDE_PROJECT_DIR/vitest.config.ts" ] || [ -f "$CLAUDE_PROJECT_DIR/vitest.config.js" ]; then
      # Find matching test file for the edited source
      BASENAME=$(basename "$FILE_PATH" .tsx)
      BASENAME=$(basename "$BASENAME" .ts)
      DIRPATH=$(dirname "$FILE_PATH")
      TEST_FILE=""
      # Check __tests__ directory for matching test
      for ext in test.tsx test.ts; do
        if [ -f "$DIRPATH/__tests__/${BASENAME}.${ext}" ]; then
          TEST_FILE="$DIRPATH/__tests__/${BASENAME}.${ext}"
          break
        fi
      done
      # If editing a test file directly, run it
      case "$FILE_PATH" in *.test.ts|*.test.tsx) TEST_FILE="$FILE_PATH" ;; esac
      if [ -z "$TEST_FILE" ]; then exit 0; fi
      OUTPUT=$(cd "$CLAUDE_PROJECT_DIR" && npx vitest run "$TEST_FILE" 2>&1)
      EXIT_CODE=$?
      if [ $EXIT_CODE -ne 0 ]; then
        echo "$OUTPUT" >&2
        exit 2
      fi
    fi
    ;;
  # Python files → pytest
  *.py)
    if command -v pytest &> /dev/null; then
      # Find test file matching the source file
      BASENAME=$(basename "$FILE_PATH" .py)
      DIR=$(dirname "$FILE_PATH")
      TEST_FILE="$DIR/test_${BASENAME}.py"
      if [ ! -f "$TEST_FILE" ]; then
        TEST_FILE="$DIR/tests/test_${BASENAME}.py"
      fi
      if [ -f "$TEST_FILE" ]; then
        OUTPUT=$(cd "$CLAUDE_PROJECT_DIR" && pytest "$TEST_FILE" -x -q 2>&1)
        EXIT_CODE=$?
        if [ $EXIT_CODE -ne 0 ]; then
          echo "$OUTPUT" >&2
          exit 2
        fi
      fi
    fi
    ;;
esac

exit 0
