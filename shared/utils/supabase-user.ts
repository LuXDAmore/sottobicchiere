// Identificatore stabile dell'utente Supabase ricavato da `serverSupabaseUser`.
//
// Con @nuxtjs/supabase v2 `serverSupabaseUser` restituisce i CLAIMS del JWT
// (via `auth.getClaims()`), dove l'id utente è il claim `sub` (lo stesso valore
// di `auth.uid()` lato Postgres, usato dalle policy RLS). Manteniamo un fallback
// a `id` per robustezza nel caso una versione/forma diversa restituisse un
// oggetto User invece dei claims.
/**
 *
 * @param user
 */
export function supabaseUserId( user: { sub?: string; id?: string } | null | undefined ): string | undefined {

    return user?.sub ?? user?.id;

}
