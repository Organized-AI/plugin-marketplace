-- Append-only QA archives, isolated by the signed-in Supabase user.
create table public.skill_loop_history (
 sequence bigint generated always as identity primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 record_hash text not null check (record_hash ~ '^[a-f0-9]{64}$'),
 project text not null check (project ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$'),
 skill_id text not null check (skill_id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$'),
 kind text not null check (kind in ('run','baseline','proposal','assessment','review')),
 document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 750000),
 summary jsonb not null default '{}'::jsonb check (octet_length(summary::text)<=4000),
 saved_at timestamptz not null default now(),
 unique(owner_id,record_hash)
);
create index skill_loop_history_lookup on public.skill_loop_history(owner_id,project,skill_id,sequence);
alter table public.skill_loop_history enable row level security;
create policy own_history_read on public.skill_loop_history for select to authenticated using (owner_id = (select auth.uid()));
create policy own_history_insert on public.skill_loop_history for insert to authenticated with check (owner_id = (select auth.uid()));
grant select,insert on public.skill_loop_history to authenticated;
grant usage on sequence public.skill_loop_history_sequence_seq to authenticated;
revoke all on public.skill_loop_history from anon;

create table public.skill_loop_findings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 record_hash text not null,
 finding_key text not null check (char_length(finding_key) between 1 and 120),
 finding text not null check (char_length(trim(finding)) between 1 and 4000),
 status text not null default 'pending' check (status in ('pending','accepted','dismissed')),
 note text not null default '' check (char_length(note) <= 4000),
 revision integer not null default 0 check (revision >= 0),
 updated_at timestamptz not null default now(),
 foreign key(owner_id,record_hash) references public.skill_loop_history(owner_id,record_hash),
 unique(owner_id,record_hash,finding_key)
);
alter table public.skill_loop_findings enable row level security;
create policy own_finding_read on public.skill_loop_findings for select to authenticated using (owner_id = (select auth.uid()));
-- All mutations go through the revision-checked routines below.
grant select on public.skill_loop_findings to authenticated;
revoke all on public.skill_loop_findings from anon;

create table public.skill_loop_review_events (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 finding_id uuid not null references public.skill_loop_findings(id),
 revision integer not null,
 status text not null,
 note text not null,
 created_at timestamptz not null default now(),
 unique(finding_id,revision)
);
alter table public.skill_loop_review_events enable row level security;
create policy own_review_event_read on public.skill_loop_review_events for select to authenticated using (owner_id = (select auth.uid()));
grant select on public.skill_loop_review_events to authenticated;
revoke all on public.skill_loop_review_events from anon;

create function public.skill_loop_add_finding(p_record_hash text,p_key text,p_finding text)
returns public.skill_loop_findings language plpgsql security definer set search_path='' as $$
declare result public.skill_loop_findings; who uuid := auth.uid();
begin
 if who is null then raise exception 'History not found'; end if;
 perform 1 from public.skill_loop_history where owner_id=who and record_hash=p_record_hash for update;
 if not found then raise exception 'History not found'; end if;
 if not exists(select 1 from public.skill_loop_findings where owner_id=who and record_hash=p_record_hash and finding_key=p_key) and (select count(*) from public.skill_loop_findings where owner_id=who and record_hash=p_record_hash)>=100 then raise exception 'Review limit reached (100 findings per record)'; end if;
 insert into public.skill_loop_findings(owner_id,record_hash,finding_key,finding) values(who,p_record_hash,p_key,trim(p_finding)) on conflict(owner_id,record_hash,finding_key) do nothing;
 select * into result from public.skill_loop_findings where owner_id=who and record_hash=p_record_hash and finding_key=p_key;
 if result.finding <> trim(p_finding) then raise exception 'Finding key already describes different evidence'; end if;
 return result;
end; $$;
create function public.skill_loop_decide_finding(p_id uuid,p_revision integer,p_status text,p_note text)
returns public.skill_loop_findings language plpgsql security definer set search_path='' as $$
declare result public.skill_loop_findings; who uuid := auth.uid();
begin
 if who is null or p_status not in ('pending','accepted','dismissed') or p_status is null or p_note is null or char_length(p_note)>4000 then raise exception 'Invalid review decision'; end if;
 if p_status='dismissed' and p_note !~ '[^[:space:]]' then raise exception 'A dismissal reason is required'; end if;
 select * into result from public.skill_loop_findings where id=p_id and owner_id=who for update;
 if not found then raise exception 'Finding not found'; end if;
 if result.revision<>p_revision or p_revision is null then raise exception 'Review changed; refresh before deciding'; end if;
 update public.skill_loop_findings set status=p_status,note=trim(p_note),revision=revision+1,updated_at=now() where id=p_id and owner_id=who returning * into result;
 insert into public.skill_loop_review_events(owner_id,finding_id,revision,status,note) values(who,p_id,result.revision,result.status,result.note);
 return result;
end; $$;
revoke all on function public.skill_loop_add_finding(text,text,text) from public,anon;
revoke all on function public.skill_loop_decide_finding(uuid,integer,text,text) from public,anon;
grant execute on function public.skill_loop_add_finding(text,text,text) to authenticated;
grant execute on function public.skill_loop_decide_finding(uuid,integer,text,text) to authenticated;
