\set ON_ERROR_STOP on
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into public.skill_loop_history(record_hash,project,skill_id,kind,document) values (repeat('a',64),'workshop','humanizer','run','{}');
select public.skill_loop_add_finding(repeat('a',64),'first','A review finding');
do $$ declare item public.skill_loop_findings; begin
 select * into item from public.skill_loop_findings;
 perform public.skill_loop_decide_finding(item.id,0,'accepted','fix this');
 begin perform public.skill_loop_decide_finding(item.id,0,'dismissed','stale');raise exception 'FAILED stale accepted';exception when others then if sqlerrm='FAILED stale accepted' then raise;end if;end;
 begin perform public.skill_loop_decide_finding(item.id,1,'dismissed',E'\t\n');raise exception 'FAILED whitespace accepted';exception when others then if sqlerrm='FAILED whitespace accepted' then raise;end if;end;
 perform public.skill_loop_decide_finding(item.id,1,'dismissed','Reviewed; not relevant');
 perform public.skill_loop_decide_finding(item.id,2,'pending','Reopened');
 if(select count(*) from public.skill_loop_review_events)<>3 then raise exception 'Missing review audit events';end if;
 for i in 2..100 loop perform public.skill_loop_add_finding(repeat('a',64),'finding-'||i,'Finding '||i);end loop;
 begin perform public.skill_loop_add_finding(repeat('a',64),'overflow','Too many');raise exception 'FAILED overflow accepted';exception when others then if sqlerrm='FAILED overflow accepted' then raise;end if;end;
 perform public.skill_loop_add_finding(repeat('a',64),'first','A review finding');
 begin update public.skill_loop_history set kind='baseline';raise exception 'FAILED history mutated';exception when insufficient_privilege then null;end;
 begin update public.skill_loop_findings set status='accepted';raise exception 'FAILED direct decision';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
 if exists(select 1 from public.skill_loop_history) or exists(select 1 from public.skill_loop_findings) or exists(select 1 from public.skill_loop_review_events) then raise exception 'Cross-user data visible';end if;
 begin perform public.skill_loop_add_finding(repeat('a',64),'foreign','Not mine');raise exception 'FAILED foreign finding';exception when others then if sqlerrm='FAILED foreign finding' then raise;end if;end;
 begin insert into public.skill_loop_history(owner_id,record_hash,project,skill_id,kind,document)values('11111111-1111-4111-8111-111111111111',repeat('b',64),'workshop','humanizer','run','{}');raise exception 'FAILED owner spoof';exception when insufficient_privilege then null;end;
end $$;
insert into public.skill_loop_history(record_hash,project,skill_id,kind,document)values(repeat('a',64),'workshop','humanizer','run','{}');
reset role;
select 'Database checks passed: isolation, append-only history, atomic decisions, stale rejection, whitespace validation and cap.' as result;
