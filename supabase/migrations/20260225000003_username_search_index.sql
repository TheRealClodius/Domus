-- B-tree index with text_pattern_ops for efficient ILIKE 'prefix%' queries on username
create index users_username_search_idx
  on public.users (lower(username) text_pattern_ops);
