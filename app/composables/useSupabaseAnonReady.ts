/**
 * Garantisce che l'utente corrente abbia una sessione Supabase disponibile
 * prima di chiamare API server che richiedono autenticazione (anche anonima).
 */
export function useSupabaseAnonReady() {

    const client = useSupabaseClient()
        , user = useSupabaseUser();

    return async function ensureSupabaseAnonReady(): Promise<boolean> {

        if( user.value ) return true;

        const { data: sessionData } = await client.auth.getSession();

        if( sessionData.session?.user ) return true;

        const { error } = await client.auth.signInAnonymously();

        if( error ) return false;

        const { data: currentUser } = await client.auth.getUser();

        return !! currentUser.user;

    };

}
