-- Run once in Supabase SQL Editor. All score and tournament writes go through RPCs.
begin;
create table public.admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admins where user_id = auth.uid());
$$;
create table public.players (
 id uuid primary key default gen_random_uuid(),
 first_name text not null check(char_length(trim(first_name)) between 1 and 50),
 last_name text not null check(char_length(trim(last_name)) between 1 and 50),
 phone text check(phone is null or phone ~ '^\+?[0-9]{7,15}$'),
 created_at timestamptz not null default now()
);
create table public.tournaments (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(trim(title)) between 2 and 100),
 date date not null, status text not null default 'draft' check(status in ('draft','active','completed')),
 court_count integer not null default 2 check(court_count=2), total_rounds integer not null default 7 check(total_rounds=7),
 created_at timestamptz not null default now()
);
create table public.tournament_players (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
 player_id uuid not null references public.players(id), slot text not null check(slot in ('A','B','C','D','E','F','G','H')),
 unique(tournament_id,player_id), unique(tournament_id,slot)
);
create table public.tournament_rounds (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
 round_number integer not null check(round_number between 1 and 7), unique(tournament_id,round_number), unique(tournament_id,id)
);
create table public.matches (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
 round_id uuid not null, court_number integer not null check(court_number in (1,2)),
 team1_player1_id uuid not null, team1_player2_id uuid not null, team2_player1_id uuid not null, team2_player2_id uuid not null,
 winner_team integer check(winner_team in (1,2)), version integer not null default 0,
 unique(round_id,court_number),
 foreign key(tournament_id,round_id) references public.tournament_rounds(tournament_id,id) on delete cascade,
 foreign key(tournament_id,team1_player1_id) references public.tournament_players(tournament_id,player_id),
 foreign key(tournament_id,team1_player2_id) references public.tournament_players(tournament_id,player_id),
 foreign key(tournament_id,team2_player1_id) references public.tournament_players(tournament_id,player_id),
 foreign key(tournament_id,team2_player2_id) references public.tournament_players(tournament_id,player_id),
 check(team1_player1_id<>team1_player2_id and team1_player1_id<>team2_player1_id and team1_player1_id<>team2_player2_id and team1_player2_id<>team2_player1_id and team1_player2_id<>team2_player2_id and team2_player1_id<>team2_player2_id)
);
create table public.match_sets (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 set_number integer not null check(set_number between 1 and 3), team1_score integer, team2_score integer,
 unique(match_id,set_number),
 check((team1_score is null and team2_score is null) or (team1_score is not null and team2_score is not null and team1_score between 0 and 99 and team2_score between 0 and 99 and team1_score<>team2_score))
);
create table public.tournament_results (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
 player_id uuid not null, total_points integer not null default 0, sets_won integer not null default 0,
 sets_lost integer not null default 0, matches_won integer not null default 0, matches_lost integer not null default 0,
 point_difference integer not null default 0, rank integer not null check(rank between 1 and 8),
 unique(tournament_id,player_id), foreign key(tournament_id,player_id) references public.tournament_players(tournament_id,player_id) on delete cascade
);
create index tournaments_status_date_idx on public.tournaments(status,date desc);
create index tournament_players_player_idx on public.tournament_players(player_id);
create index matches_tournament_idx on public.matches(tournament_id);
create index tournament_results_player_idx on public.tournament_results(player_id);
alter table public.admins enable row level security;
alter table public.players enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
alter table public.tournament_rounds enable row level security;
alter table public.matches enable row level security;
alter table public.match_sets enable row level security;
alter table public.tournament_results enable row level security;
create policy own_admin on public.admins for select to authenticated using(user_id=auth.uid());
create policy admin_players on public.players for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_read on public.tournaments for select to authenticated using(public.is_admin());
create policy admin_read on public.tournament_players for select to authenticated using(public.is_admin());
create policy admin_read on public.tournament_rounds for select to authenticated using(public.is_admin());
create policy admin_read on public.matches for select to authenticated using(public.is_admin());
create policy admin_read on public.match_sets for select to authenticated using(public.is_admin());
create policy admin_read on public.tournament_results for select to authenticated using(public.is_admin());
-- Explicit privileges: no direct writes to derived/schedule tables, even for admins.
revoke all on public.admins,public.players,public.tournaments,public.tournament_players,public.tournament_rounds,public.matches,public.match_sets,public.tournament_results from anon,authenticated;
grant select on public.admins,public.players,public.tournaments,public.tournament_players,public.tournament_rounds,public.matches,public.match_sets,public.tournament_results to authenticated;
grant insert,update,delete on public.players to authenticated;
create function public.recalculate_tournament_standings(p_tournament_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform 1 from public.tournaments where id=p_tournament_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if exists(select 1 from public.tournaments where id=p_tournament_id and status='completed') then raise exception 'TOURNAMENT_LOCKED'; end if;
 with scores as (
 select tp.player_id,tp.slot,
 coalesce(sum(case when tp.player_id in(m.team1_player1_id,m.team1_player2_id) then s.team1_score else s.team2_score end),0)::integer total_points,
 count(*) filter(where s.team1_score is not null and ((tp.player_id in(m.team1_player1_id,m.team1_player2_id) and s.team1_score>s.team2_score) or (tp.player_id in(m.team2_player1_id,m.team2_player2_id) and s.team2_score>s.team1_score)))::integer sets_won,
 count(*) filter(where s.team1_score is not null and ((tp.player_id in(m.team1_player1_id,m.team1_player2_id) and s.team1_score<s.team2_score) or (tp.player_id in(m.team2_player1_id,m.team2_player2_id) and s.team2_score<s.team1_score)))::integer sets_lost,
 coalesce(sum(case when tp.player_id in(m.team1_player1_id,m.team1_player2_id) then s.team1_score-s.team2_score else s.team2_score-s.team1_score end),0)::integer point_difference
 from public.tournament_players tp
 left join public.matches m on m.tournament_id=tp.tournament_id and tp.player_id in(m.team1_player1_id,m.team1_player2_id,m.team2_player1_id,m.team2_player2_id)
 left join public.match_sets s on s.match_id=m.id
 where tp.tournament_id=p_tournament_id group by tp.player_id,tp.slot
 ), wins as (
 select tp.player_id,
 count(m.id) filter(where m.winner_team is not null and ((m.winner_team=1 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (m.winner_team=2 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer matches_won,
 count(m.id) filter(where m.winner_team is not null and ((m.winner_team=2 and tp.player_id in(m.team1_player1_id,m.team1_player2_id)) or (m.winner_team=1 and tp.player_id in(m.team2_player1_id,m.team2_player2_id))))::integer matches_lost
 from public.tournament_players tp left join public.matches m on m.tournament_id=tp.tournament_id and tp.player_id in(m.team1_player1_id,m.team1_player2_id,m.team2_player1_id,m.team2_player2_id)
 where tp.tournament_id=p_tournament_id group by tp.player_id
 )
 insert into public.tournament_results(tournament_id,player_id,total_points,sets_won,sets_lost,point_difference,matches_won,matches_lost,rank)
 select p_tournament_id,s.player_id,s.total_points,s.sets_won,s.sets_lost,s.point_difference,w.matches_won,w.matches_lost,
 row_number() over(order by s.total_points desc,s.sets_won desc,s.point_difference desc,s.slot)::integer
 from scores s join wins w using(player_id)
 on conflict(tournament_id,player_id) do update set total_points=excluded.total_points,sets_won=excluded.sets_won,sets_lost=excluded.sets_lost,point_difference=excluded.point_difference,matches_won=excluded.matches_won,matches_lost=excluded.matches_lost,rank=excluded.rank;
end; $$;
create function public.create_tournament(p_title text,p_date date,p_player_ids uuid[]) returns uuid language plpgsql security definer set search_path = '' as $$
declare tid uuid; rid uuid; mid uuid; ids uuid[]; i integer; c integer; s integer; a integer[];
 schedule integer[][] := array[[1,8,2,7],[3,4,5,6],[1,2,3,6],[5,4,7,8],[3,5,4,6],[1,7,8,2],[2,6,5,7],[4,8,3,1],[7,4,6,1],[5,8,3,2],[3,8,2,5],[1,4,6,7],[5,1,4,2],[8,6,7,3]];
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if cardinality(p_player_ids)<>8 or (select count(distinct x) from unnest(p_player_ids) x)<>8 or (select count(*) from public.players where id=any(p_player_ids))<>8 then raise exception 'EIGHT_PLAYERS_REQUIRED'; end if;
 select array_agg(id order by random()) into ids from unnest(p_player_ids) id;
 insert into public.tournaments(title,date) values(trim(p_title),p_date) returning id into tid;
 for i in 1..8 loop insert into public.tournament_players(tournament_id,player_id,slot) values(tid,ids[i],chr(64+i)); end loop;
 for i in 1..7 loop
 insert into public.tournament_rounds(tournament_id,round_number) values(tid,i) returning id into rid;
 for c in 1..2 loop
 s:=(i-1)*2+c;
 a:=array[schedule[s][1],schedule[s][2],schedule[s][3],schedule[s][4]];
 insert into public.matches(tournament_id,round_id,court_number,team1_player1_id,team1_player2_id,team2_player1_id,team2_player2_id) values(tid,rid,c,ids[a[1]],ids[a[2]],ids[a[3]],ids[a[4]]) returning id into mid;
 insert into public.match_sets(match_id,set_number) select mid,generate_series(1,3);
 end loop; end loop;
 perform public.recalculate_tournament_standings(tid);
 return tid;
end; $$;
create function public.start_tournament(p_tournament_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 update public.tournaments set status='active' where id=p_tournament_id and status='draft';
 if not found then raise exception 'INVALID_STATUS'; end if;
end; $$;
create function public.save_match_scores(p_match_id uuid,p_version integer,p_sets jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare tid uuid; m public.matches; state text; completed integer; won integer;
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 select tournament_id into tid from public.matches where id=p_match_id;
 if tid is null then raise exception 'NOT_FOUND'; end if;
 -- Serialize all result writes per tournament, including finish and recalculation.
 select status into state from public.tournaments where id=tid for update;
 if state<>'active' then raise exception 'TOURNAMENT_NOT_ACTIVE'; end if;
 select * into m from public.matches where id=p_match_id for update;
 if p_version is null or m.version<>p_version then raise exception 'SCORE_CONFLICT'; end if;
 if p_sets is null or jsonb_typeof(p_sets)<>'array' then raise exception 'INVALID_SETS'; end if;
 if jsonb_array_length(p_sets)<>3 then raise exception 'INVALID_SETS'; end if;
 if (select count(distinct x.set_number) from jsonb_to_recordset(p_sets) as x(set_number integer))<>3 then raise exception 'INVALID_SETS'; end if;
 if exists(select 1 from jsonb_to_recordset(p_sets) as x(set_number integer) where x.set_number is null or x.set_number not between 1 and 3) then raise exception 'INVALID_SETS'; end if;
 -- Integer record conversion rejects decimals; table constraints reject ties and half-empty pairs.
 insert into public.match_sets(match_id,set_number,team1_score,team2_score)
 select p_match_id,x.set_number,x.team1_score,x.team2_score from jsonb_to_recordset(p_sets) as x(set_number integer,team1_score integer,team2_score integer)
 on conflict(match_id,set_number) do update set team1_score=excluded.team1_score,team2_score=excluded.team2_score;
 select count(*) filter(where team1_score is not null),count(*) filter(where team1_score>team2_score) into completed,won from public.match_sets where match_id=p_match_id;
 update public.matches set winner_team=case when completed=3 then case when won>=2 then 1 else 2 end else null end,version=version+1 where id=p_match_id;
 perform public.recalculate_tournament_standings(tid);
end; $$;
create function public.finish_tournament(p_tournament_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare state text;
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 select status into state from public.tournaments where id=p_tournament_id for update;
 if state is distinct from 'active' then raise exception 'INVALID_STATUS'; end if;
 if (select count(*) from public.matches where tournament_id=p_tournament_id and winner_team is not null)<>14 then raise exception 'INCOMPLETE_MATCHES'; end if;
 perform public.recalculate_tournament_standings(p_tournament_id);
 update public.tournaments set status='completed' where id=p_tournament_id;
end; $$;
-- These narrowly scoped owner-executed views intentionally bypass base-table RLS.
-- Public users see only completed tournaments and names/statistics, never phones.
create view public.public_results as
 select r.*,p.first_name,p.last_name,t.title,t.date from public.tournament_results r join public.players p on p.id=r.player_id join public.tournaments t on t.id=r.tournament_id where t.status='completed';
create view public.public_leaderboard as
 select player_id,first_name,last_name,count(*)::integer tournaments,sum(total_points)::integer total_points,
 sum(matches_won)::integer matches_won,sum(matches_lost)::integer matches_lost,
 count(*) filter(where rank=1)::integer crowns,round(avg(rank),2) average_rank,
 coalesce(round(100.0*sum(matches_won)/nullif(sum(matches_won+matches_lost),0),1),0) win_rate
 from public.public_results group by player_id,first_name,last_name;
revoke all on public.public_results,public.public_leaderboard from anon,authenticated;
grant select on public.public_results,public.public_leaderboard to anon,authenticated;
revoke all on function public.is_admin(),public.create_tournament(text,date,uuid[]),public.start_tournament(uuid),public.save_match_scores(uuid,integer,jsonb),public.finish_tournament(uuid),public.recalculate_tournament_standings(uuid) from public,anon,authenticated;
grant execute on function public.is_admin(),public.create_tournament(text,date,uuid[]),public.start_tournament(uuid),public.save_match_scores(uuid,integer,jsonb),public.finish_tournament(uuid),public.recalculate_tournament_standings(uuid) to authenticated;
commit;
