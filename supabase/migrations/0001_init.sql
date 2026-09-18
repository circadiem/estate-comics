-- 0001_init.sql — Estate Comics persistence (WO-04)
--
-- Two tables: one row per submission, one row per book in it. Status is a
-- text check constraint (the admin queue in WO-12 is built against these
-- values). Email-outcome booleans exist because /api/submit once returned
-- success while both notifications failed and the lead was unrecoverable.
--
-- Access model: row-level security is ENABLED on both tables and NO policies
-- are defined. Only the service role (server-side, SUPABASE_SERVICE_ROLE_KEY)
-- can read or write. The anon and authenticated roles get nothing, including
-- the create_submission() function below.
--
-- Apply from the Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------

create table public.submissions (
  id                  uuid primary key default gen_random_uuid(),
  reference_number    text not null unique
                        check (reference_number ~ '^EC-\d{8}-[0-9A-F]{4}$'),
  status              text not null default 'pending'
                        check (status in ('pending', 'reviewed', 'offer_sent',
                                          'scheduled', 'completed', 'declined')),
  seller              jsonb not null,   -- SellerQuestionnaire
  adjustment          jsonb not null,   -- GradeAdjustment
  summary             jsonb not null,   -- CollectionSummary (adjusted basis)
  below_minimum       boolean not null default false,
  seller_email_sent   boolean not null default false,
  internal_email_sent boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index submissions_status_created_idx
  on public.submissions (status, created_at desc);

-- ---------------------------------------------------------------------------
-- submission_books
-- ---------------------------------------------------------------------------

create table public.submission_books (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid not null references public.submissions (id) on delete cascade,
  position        integer not null,     -- 0-based order as submitted
  identification  jsonb not null,       -- IdentificationResult
  condition       jsonb not null,       -- ConditionResult
  valuation       jsonb not null,       -- ValuationResult
  offer           jsonb not null,       -- OfferResult (unadjusted)
  adjusted_offer  jsonb not null,       -- OfferResult (storage-adjusted)
  flagged         boolean not null default false,
  unique (submission_id, position)
);

create index submission_books_submission_idx
  on public.submission_books (submission_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger submissions_set_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: enabled, no policies. Service role only.
-- ---------------------------------------------------------------------------

alter table public.submissions      enable row level security;
alter table public.submission_books enable row level security;

revoke all on table public.submissions      from anon, authenticated;
revoke all on table public.submission_books from anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_submission(): insert a submission and all of its books atomically.
--
-- A single function call is a single transaction, so a failure on any book
-- rolls back the submission row too — no half-written leads. Raises 23505
-- (unique_violation) on a reference-number collision; the caller regenerates
-- the suffix and retries.
-- ---------------------------------------------------------------------------

create or replace function public.create_submission(
  p_submission jsonb,
  p_books      jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_books) <> 'array' or jsonb_array_length(p_books) = 0 then
    raise exception 'create_submission: p_books must be a non-empty array'
      using errcode = '22023';
  end if;

  insert into public.submissions (
    reference_number, seller, adjustment, summary, below_minimum
  )
  values (
    p_submission ->> 'reference_number',
    p_submission ->  'seller',
    p_submission ->  'adjustment',
    p_submission ->  'summary',
    coalesce((p_submission ->> 'below_minimum')::boolean, false)
  )
  returning id into v_id;

  insert into public.submission_books (
    submission_id, position, identification, condition, valuation,
    offer, adjusted_offer, flagged
  )
  select
    v_id,
    (b ->> 'position')::integer,
    b -> 'identification',
    b -> 'condition',
    b -> 'valuation',
    b -> 'offer',
    b -> 'adjusted_offer',
    coalesce((b -> 'identification' ->> 'flagged_for_review')::boolean, false)
  from jsonb_array_elements(p_books) as b;

  return v_id;
end;
$$;

-- Functions are executable by PUBLIC by default; PostgREST exposes them as
-- RPC. Lock this down to the service role.
revoke all on function public.create_submission(jsonb, jsonb) from public, anon, authenticated;
