/**
 * Garantisce che l'utente corrente abbia una sessione Supabase disponibile
 * prima di chiamare API server che richiedono autenticazione (anche anonima).
 *
 * Restituisce `false` immediatamente (senza effettuare richieste) se Supabase
 * non è configurato (config placeholder), coerente con il comportamento del
 * plugin `supabase-anon.client.ts`.
 *
 * @returns {() => Promise<boolean>} Funzione async che verifica/crea la sessione anonima.
 */
export function useSupabaseAnonReady() {

    const client = useSupabaseClient()
        , user = useSupabaseUser()
        , config = useRuntimeConfig()
        , supabase = config.public.supabase as { url?: string; key?: string } | undefined
        , url = supabase?.url
        , key = supabase?.key;

    return async(): Promise<boolean> => {

        // Guard identico a supabase-anon.client.ts: evita request inutili con config placeholder.
        if( ! url || url.includes( 'placeholder.supabase.co' ) || ! key || key === 'placeholder-anon-key' ) return false;

        if( user.value ) return true;

        const { data: sessionData } = await client.auth.getSession();

        if( sessionData.session?.user ) return true;

        const { error } = await client.auth.signInAnonymously();

        if( error ) return false;

        const { data: currentUser } = await client.auth.getUser();

        return !! currentUser.user;

    };

}
