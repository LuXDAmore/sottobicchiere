-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — Cleanup stanze ad-hoc: guardia sessioni attive            ║
-- ║                                                                            ║
-- ║ Correzione: una venue ad-hoc ha un TTL fisso (creazione + 8h), ma nel suo  ║
-- ║ tavolo può essere creata una sessione PIÙ TARDI (scadenza oltre il TTL     ║
-- ║ della venue). Eliminando la venue scaduta si farebbe cascade su una        ║
-- ║ sessione/partita ancora attiva. Ora la venue ad-hoc viene rimossa solo se  ║
-- ║ scaduta E senza sessioni ancora attive.                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function public.cleanup_expired_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    deleted_count integer;
begin
    delete from public.table_sessions where expires_at < now();
    get diagnostics deleted_count = row_count;

    -- Stanze create al volo: rimuovi la venue ad-hoc scaduta solo se non ha più
    -- sessioni attive, per non interrompere una partita ancora in corso.
    delete from public.venues v
    where v.kind = 'adhoc'
      and v.expires_at is not null
      and v.expires_at < now()
      and not exists (
          select 1
          from public.tables t
          join public.table_sessions s on s.table_id = t.id
          where t.venue_id = v.id
            and s.expires_at >= now()
      );

    return deleted_count;
end;
$$;
