alter table public.calendar_connections
  drop constraint calendar_connections_source_check;

alter table public.calendar_connections
  add constraint calendar_connections_source_check
  check (source in ('guilan', 'sabaland', 'respina'));

insert into public.calendar_connections (source)
values ('respina')
on conflict (source) do nothing;
