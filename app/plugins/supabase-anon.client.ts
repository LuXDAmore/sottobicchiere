// Garantisce che ogni visitatore abbia una sessione Supabase: se non è loggato
// crea un utente anonimo. Il JWT risultante autorizza i channel realtime privati
// e collega il giocatore alle proprie righe via RLS.

export default defineNuxtPlugin( async() => {

    const config = useRuntimeConfig()
        , supabase = config.public.supabase as { url?: string; key?: string } | undefined
        , url = supabase?.url
        , key = supabase?.key;

    // Se Supabase non è ancora configurato (placeholder di nuxt.config), non tentare
    // l'accesso anonimo: eviti una request che fallirebbe e rumore in console. Le
    // pagine statiche (homepage compresa) restano comunque navigabili. Controlliamo
    // sia URL che key: con URL reale ma key placeholder/mancante il sign-in fallirebbe.
    if( ! url || url.includes( 'placeholder.supabase.co' ) || ! key || key === 'placeholder-anon-key' ) {

        console.warn( '[supabase-anon] Supabase non configurato: salto l\'accesso anonimo. Imposta NUXT_PUBLIC_SUPABASE_URL e NUXT_PUBLIC_SUPABASE_KEY.' );

        return;

    }

    const client = useSupabaseClient()
        , user = useSupabaseUser();

    if( user.value ) return;

    const { error } = await client.auth.signInAnonymously();

    if( error ) console.error( '[supabase-anon] accesso anonimo non riuscito:', error.message );

} );
