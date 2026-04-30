-- Keep raw vote rows private.
--
-- Public results are now computed by Next.js server routes using
-- SUPABASE_SECRET_KEY. Anonymous clients should not be able to query voter
-- names or raw rankings directly from Supabase.

drop policy if exists "Public can read votes" on public.votes;
