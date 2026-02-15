-- Add content column (markdown body) to entities
-- Decision 58: markdown-first entity model

alter table public.entities
  add column content text not null default '';

-- Replace old summary-only FTS index with one covering both content and summary
drop index if exists entities_summary_fts_idx;

create index entities_fts_idx on public.entities
  using gin (to_tsvector('english', coalesce(content, '') || ' ' || coalesce(summary, '')));
