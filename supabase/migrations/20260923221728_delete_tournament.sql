begin;

create or replace function public.delete_tournament(p_tournament_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 delete from public.tournaments where id=p_tournament_id;
 if not found then raise exception 'NOT_FOUND'; end if;
end;
$$;

revoke all on function public.delete_tournament(uuid) from public,anon,authenticated;
grant execute on function public.delete_tournament(uuid) to authenticated;

commit;
