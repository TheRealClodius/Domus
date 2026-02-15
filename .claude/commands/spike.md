Run a time-boxed technical exploration to answer a specific feasibility question.

## Steps

1. If $ARGUMENTS is provided, treat it as the spike question. Otherwise, ask for a specific question to answer (e.g., "Can we animate entity cards with Framer Motion layout animations?" or "Does Supabase RLS support row-level filtering by user metadata?")
2. Define the exit criteria: what answer or artifact will mark this spike as done
3. Create a throwaway branch: `spike/<short-description>`
4. Explore — write quick, ugly, minimal code to answer the question. No tests, no polish, no abstractions.
5. Summarize findings in a brief message:
   - **Question**: what you set out to answer
   - **Answer**: yes/no/partially, with specifics
   - **Implications**: what this means for the design or plan
   - **Gotchas**: anything surprising discovered along the way
6. Switch back to the previous branch. The spike branch can be deleted or kept for reference.

## Rules

- One question per spike. If you discover more questions, note them — don't chase them.
- Spike code is throwaway. Do not refactor it, test it, or carry it into production.
- If the question can be answered by reading docs or source code alone, do that instead of writing code.
- Stop when you have enough information to decide, not when the prototype is "complete."

$ARGUMENTS
