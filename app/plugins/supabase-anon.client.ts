// Garantisce che ogni visitatore abbia una sessione Supabase: se non è loggato
// crea un utente anonimo. Il JWT risultante autorizza i channel realtime privati
// e collega il giocatore alle proprie righe via RLS.

export default defineNuxtPlugin( async() => {

    const supabase = useSupabaseClient()
        , user = useSupabaseUser();

    if( user.value ) return;

    const { error } = await supabase.auth.signInAnonymously();

    if( error ) console.error( '[supabase-anon] accesso anonimo non riuscito:', error.message );

} );
