-- 0002_images.sql — stored cover photos (Stage 2, R2)
--
-- One row per stored photo. `capture_type` anticipates grid capture (WO-13):
-- a grid photo will be one image row referenced by several books. Today every
-- image is a single cover and belongs to exactly one submission_book.
--
-- create_submission() is replaced to insert image rows in the same
-- transaction, from the optional `image_key` on each book.

create table public.images (
  id                  uuid primary key default gen_random_uuid(),
  submission_id       uuid not null references public.submissions (id) on delete cascade,
  submission_book_id  uuid references public.submission_books (id) on delete set null,
  r2_key              text not null unique
                        check (r2_key ~ '^uploads/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  capture_type        text not null default 'single'
                        check (capture_type in ('single', 'grid')),
  content_type        text not null default 'image/jpeg',
  created_at          timestamptz not null default now()
);

create index images_submission_idx on public.images (submission_id);

alter table public.images enable row level security;
revoke all on table public.images from anon, authenticated;

-- Add the key to the book row as well so a book's photo is one join away.
alter table public.submission_books add column image_key text
  check (image_key is null or image_key ~ '^uploads/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');

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
  v_book record;
  v_book_id uuid;
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

  for v_book in
    select b from jsonb_array_elements(p_books) as b
  loop
    insert into public.submission_books (
      submission_id, position, identification, condition, valuation,
      offer, adjusted_offer, flagged, image_key
    )
    values (
      v_id,
      (v_book.b ->> 'position')::integer,
      v_book.b -> 'identification',
      v_book.b -> 'condition',
      v_book.b -> 'valuation',
      v_book.b -> 'offer',
      v_book.b -> 'adjusted_offer',
      coalesce((v_book.b -> 'identification' ->> 'flagged_for_review')::boolean, false),
      nullif(v_book.b ->> 'image_key', '')
    )
    returning id into v_book_id;

    if nullif(v_book.b ->> 'image_key', '') is not null then
      insert into public.images (submission_id, submission_book_id, r2_key, capture_type)
      values (v_id, v_book_id, v_book.b ->> 'image_key', 'single');
    end if;
  end loop;

  return v_id;
end;
$$;

revoke all on function public.create_submission(jsonb, jsonb) from public, anon, authenticated;
