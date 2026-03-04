-- All memory entity types must have presentation = 'hidden'.
-- These were corrupted to 'card' by the CDC coercion bug (presentationRules
-- treated them as unknown types → allowed=['card'] → coerced and written back).
UPDATE public.entities
SET    presentation = 'hidden',
       updated_at   = now()
WHERE  type IN ('conversation_turn', 'fact', 'personality_trait', 'conversation_summary', 'edge')
  AND  presentation != 'hidden'
  AND  archived = false;
