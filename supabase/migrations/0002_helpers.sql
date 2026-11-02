-- DATABASE.md §1 / §7 / §9.2 — shared trigger functions.

-- updated_at = server time on every write (the sync cursor), plus the last-write-wins guard:
-- an UPDATE whose incoming updated_at is older than the stored one is a stale offline edit and
-- is skipped (returning NULL from a BEFORE trigger leaves the row untouched, no error).
-- Writes that don't send updated_at keep the stored value, so they are never stale.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Child rows must belong to the same shop as their parents (DATABASE.md §7).
-- Arguments come in pairs: parent table, FK column on this row. NULL FKs are skipped.
-- Runs as the caller, so a parent hidden by RLS (another shop's row) also fails the check.
create or replace function public.assert_same_shop()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  row_json jsonb := to_jsonb(new);
  parent_table text;
  fk_column text;
  parent_id uuid;
  parent_shop uuid;
  i int := 0;
begin
  while i < tg_nargs loop
    parent_table := tg_argv[i];
    fk_column := tg_argv[i + 1];
    parent_id := (row_json ->> fk_column)::uuid;
    if parent_id is not null then
      execute format('select shop_id from public.%I where id = $1', parent_table)
        into parent_shop
        using parent_id;
      if parent_shop is distinct from new.shop_id then
        raise exception 'SHOP_MISMATCH'
          using errcode = '42501',
                detail = format('%s.%s does not belong to this shop', tg_table_name, fk_column);
      end if;
    end if;
    i := i + 2;
  end loop;
  return new;
end;
$$;

-- Trigger functions are never called directly.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.assert_same_shop() from public, anon, authenticated;
