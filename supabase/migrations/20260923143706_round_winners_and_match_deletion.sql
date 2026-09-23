begin;

alter table public.match_sets add column if not exists winner_team integer;
do $$
begin
 if exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='match_sets' and column_name='team1_score'
 ) then
  update public.match_sets
  set winner_team = case
   when team1_score is null or team2_score is null then null
   when team1_score > team2_score then 1
   else 2
  end;
 end if;
 if not exists (
  select 1 from pg_constraint
  where conrelid='public.match_sets'::regclass and conname='match_sets_winner_team_check'
 ) then
  alter table public.match_sets
   add constraint match_sets_winner_team_check check (winner_team is null or winner_team in (1,2));
 end if;
end $$;

drop function if exists public.save_match_scores(uuid,integer,jsonb);
alter table public.match_sets drop column if exists team1_score, drop column if exists team2_score;

create or replace function public.recalculate_tournament_standings(p_tournament_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform 1 from public.tournaments where id=p_tournament_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if exists(select 1 from public.tournaments where id=p_tournament_id and status='completed') then raise exception 'TOURNAMENT_LOCKED'; end if;
 with round_stats as (
 select tp.player_id,tp.slot,
 count(s.id) filter(where s.winner_team is not null and ((s.winner_team=1 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (s.winner_team=2 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer sets_won,
 count(s.id) filter(where s.winner_team is not null and ((s.winner_team=2 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (s.winner_team=1 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer sets_lost
 from public.tournament_players tp
 left join public.matches m on m.tournament_id=tp.tournament_id and tp.player_id in(m.team1_player1_id,m.team1_player2_id,m.team2_player1_id,m.team2_player2_id)
 left join public.match_sets s on s.match_id=m.id
 where tp.tournament_id=p_tournament_id group by tp.player_id,tp.slot
 ), match_stats as (
 select tp.player_id,
 count(m.id) filter(where m.winner_team is not null and ((m.winner_team=1 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (m.winner_team=2 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer matches_won,
 count(m.id) filter(where m.winner_team is not null and ((m.winner_team=2 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (m.winner_team=1 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer matches_lost
 from public.tournament_players tp left join public.matches m on m.tournament_id=tp.tournament_id and tp.player_id in(m.team1_player1_id,m.team1_player2_id,m.team2_player1_id,m.team2_player2_id)
 where tp.tournament_id=p_tournament_id group by tp.player_id
 )
 insert into public.tournament_results(tournament_id,player_id,total_points,sets_won,sets_lost,point_difference,matches_won,matches_lost,rank)
 select p_tournament_id,r.player_id,m.matches_won,r.sets_won,r.sets_lost,r.sets_won-r.sets_lost,m.matches_won,m.matches_lost,
 row_number() over(order by m.matches_won desc,r.sets_won desc,(r.sets_won-r.sets_lost) desc,r.slot)::integer
 from round_stats r join match_stats m using(player_id)
 on conflict(tournament_id,player_id) do update set total_points=excluded.total_points,sets_won=excluded.sets_won,sets_lost=excluded.sets_lost,point_difference=excluded.point_difference,matches_won=excluded.matches_won,matches_lost=excluded.matches_lost,rank=excluded.rank;
end; $$;

create or replace function public.save_match_round_winners(p_match_id uuid,p_version integer,p_rounds jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare tid uuid; m public.matches; state text; completed integer; won integer;
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 select tournament_id into tid from public.matches where id=p_match_id;
 if tid is null then raise exception 'NOT_FOUND'; end if;
 select status into state from public.tournaments where id=tid for update;
 if state<>'active' then raise exception 'TOURNAMENT_NOT_ACTIVE'; end if;
 select * into m from public.matches where id=p_match_id for update;
 if p_version is null or m.version<>p_version then raise exception 'SCORE_CONFLICT'; end if;
 if p_rounds is null or jsonb_typeof(p_rounds)<>'array' then raise exception 'INVALID_ROUNDS'; end if;
 if jsonb_array_length(p_rounds)<>3 then raise exception 'INVALID_ROUNDS'; end if;
 if (select count(distinct x.set_number) from jsonb_to_recordset(p_rounds) as x(set_number integer))<>3 then raise exception 'INVALID_ROUNDS'; end if;
 if exists(select 1 from jsonb_to_recordset(p_rounds) as x(set_number integer,winner_team integer) where x.set_number is null or x.set_number not between 1 and 3 or (x.winner_team is not null and x.winner_team not in (1,2))) then raise exception 'INVALID_ROUNDS'; end if;
 insert into public.match_sets(match_id,set_number,winner_team)
 select p_match_id,x.set_number,x.winner_team from jsonb_to_recordset(p_rounds) as x(set_number integer,winner_team integer)
 on conflict(match_id,set_number) do update set winner_team=excluded.winner_team;
 select count(*) filter(where winner_team is not null),count(*) filter(where winner_team=1) into completed,won from public.match_sets where match_id=p_match_id;
 update public.matches set winner_team=case when completed=3 then case when won>=2 then 1 else 2 end else null end,version=version+1 where id=p_match_id;
 perform public.recalculate_tournament_standings(tid);
end; $$;

create or replace function public.delete_match(p_match_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare tid uuid; state text;
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 select m.tournament_id,t.status into tid,state from public.matches m join public.tournaments t on t.id=m.tournament_id where m.id=p_match_id for update of t;
 if tid is null then raise exception 'NOT_FOUND'; end if;
 if state='completed' then raise exception 'TOURNAMENT_LOCKED'; end if;
 delete from public.matches where id=p_match_id;
 perform public.recalculate_tournament_standings(tid);
end; $$;

create or replace function public.finish_tournament(p_tournament_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare state text;
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 select status into state from public.tournaments where id=p_tournament_id for update;
 if state is distinct from 'active' then raise exception 'INVALID_STATUS'; end if;
 if not exists(select 1 from public.matches where tournament_id=p_tournament_id) or exists(select 1 from public.matches where tournament_id=p_tournament_id and winner_team is null) then raise exception 'INCOMPLETE_MATCHES'; end if;
 perform public.recalculate_tournament_standings(p_tournament_id);
 update public.tournaments set status='completed' where id=p_tournament_id;
end; $$;

-- Rebuild existing draft, active and completed standings under the new win-based model.
with round_stats as (
 select tp.tournament_id,tp.player_id,tp.slot,
 count(s.id) filter(where s.winner_team is not null and ((s.winner_team=1 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (s.winner_team=2 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer sets_won,
 count(s.id) filter(where s.winner_team is not null and ((s.winner_team=2 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (s.winner_team=1 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer sets_lost
 from public.tournament_players tp
 left join public.matches m on m.tournament_id=tp.tournament_id and tp.player_id in(m.team1_player1_id,m.team1_player2_id,m.team2_player1_id,m.team2_player2_id)
 left join public.match_sets s on s.match_id=m.id
 group by tp.tournament_id,tp.player_id,tp.slot
), match_stats as (
 select tp.tournament_id,tp.player_id,
 count(m.id) filter(where m.winner_team is not null and ((m.winner_team=1 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (m.winner_team=2 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer matches_won,
 count(m.id) filter(where m.winner_team is not null and ((m.winner_team=2 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (m.winner_team=1 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer matches_lost
 from public.tournament_players tp left join public.matches m on m.tournament_id=tp.tournament_id and tp.player_id in(m.team1_player1_id,m.team1_player2_id,m.team2_player1_id,m.team2_player2_id)
 group by tp.tournament_id,tp.player_id
), ranked as (
 select r.tournament_id,r.player_id,m.matches_won total_points,r.sets_won,r.sets_lost,r.sets_won-r.sets_lost point_difference,m.matches_won,m.matches_lost,
 row_number() over(partition by r.tournament_id order by m.matches_won desc,r.sets_won desc,(r.sets_won-r.sets_lost) desc,r.slot)::integer rank
 from round_stats r join match_stats m using(tournament_id,player_id)
)
insert into public.tournament_results(tournament_id,player_id,total_points,sets_won,sets_lost,point_difference,matches_won,matches_lost,rank)
select tournament_id,player_id,total_points,sets_won,sets_lost,point_difference,matches_won,matches_lost,rank from ranked
on conflict(tournament_id,player_id) do update set total_points=excluded.total_points,sets_won=excluded.sets_won,sets_lost=excluded.sets_lost,point_difference=excluded.point_difference,matches_won=excluded.matches_won,matches_lost=excluded.matches_lost,rank=excluded.rank;

revoke all on function public.save_match_round_winners(uuid,integer,jsonb),public.delete_match(uuid) from public,anon,authenticated;
grant execute on function public.save_match_round_winners(uuid,integer,jsonb),public.delete_match(uuid) to authenticated;

commit;
