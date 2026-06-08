/**
 * Garantisce che l'utente corrente abbia una sessione Supabase disponibile
 * prima di chiamare API server che richiedono autenticazione (anche anonima).
 * @returns {() => Promise<boolean>} Funzione async che verifica/crea la sessione anonima.
 */
export function useSupabaseAnonReady() {

    const client = useSupabaseClient()
        , user = useSupabaseUser();

    return async(): Promise<boolean> => {

        if( user.value ) return true;

        const { data: sessionData } = await client.auth.getSession();

        if( sessionData.session?.user ) return true;

        const { error } = await client.auth.signInAnonymously();

        if( error ) return false;

        const { data: currentUser } = await client.auth.getUser();

        return !! currentUser.user;

    };

}
