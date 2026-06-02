import type { ServiceClient } from './supabase';

import { generateRoomCode, generateToken } from '../../shared/utils/room-code';

export interface CreatedRoom {
    venueSlug: string;
    qrToken: string;
    shortCode: string;
}

// TTL di una stanza creata al volo: come una table_session (8h). Alla scadenza la
// venue ad-hoc (e tutto ciò che ne dipende) viene rimossa dal cleanup pg_cron.
const ROOM_TTL_MS = 8 * 60 * 60 * 1000

    // Quante volte ritentare in caso di collisione su slug/qr_token/short_code.
    , MAX_RETRIES = 5;

// PostgREST/Postgres: violazione di vincolo unico.
/**
 *
 * @param error
 */
function isUniqueViolation( error: { code?: string } | null ): boolean {

    return error?.code === '23505';

}

/**
 * Crea una "stanza" dinamica: una venue `kind='adhoc'` con un tavolo generato
 * (qr_token + short_code condivisibili). Non crea sessione né giocatore: l'host
 * entra subito dopo dal normale flusso di join `/{venueSlug}/table/{qrToken}`,
 * riusando tutta la logica esistente.
 * @param client - client Supabase service role.
 * @param createdByUserId - id dell'utente anonimo che crea la stanza (auth.uid / claim sub),
 *   già validato dal chiamante.
 * @param name - nome opzionale della stanza.
 */
export async function createAdhocRoom( client: ServiceClient, createdByUserId: string, name?: string ): Promise<CreatedRoom> {

    const expiresAt = new Date( Date.now() + ROOM_TTL_MS ).toISOString()
        , roomName = name?.trim() || 'Stanza Sottobicchiere';

    let venue: { id: string; slug: string } | null = null;

    for( let index = 0; index < MAX_RETRIES; index ++ ) {

        const { data, error } = await client
            .from( 'venues' )
            .insert( {
                slug: `r-${ generateToken( 8 ) }`,
                name: roomName,
                kind: 'adhoc',
                created_by_user_id: createdByUserId,
                expires_at: expiresAt,
            } )
            .select( 'id, slug' )
            .single();

        if( data ) {

            venue = data; break;

        }
        if( ! isUniqueViolation( error ) ) break;

    }

    if( ! venue ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'ROOM_CREATE_FAILED',
            message: 'Non sono riuscito a creare la stanza. Riprova tra qualche secondo.',
        } );

    }

    for( let index = 0; index < MAX_RETRIES; index ++ ) {

        const { data, error } = await client
            .from( 'tables' )
            .insert( {
                venue_id: venue.id,
                table_number: 1,
                qr_token: generateToken( 12 ),
                short_code: generateRoomCode(),
                created_by_user_id: createdByUserId,
            } )
            .select( 'qr_token, short_code' )
            .single();

        if( data && data.short_code ) {

            return {
                venueSlug: venue.slug,
                qrToken: data.qr_token,
                shortCode: data.short_code,
            };

        }

        if( ! isUniqueViolation( error ) ) break;

    }

    // Il tavolo non è stato creato: rimuovi la venue orfana per non lasciare scorie.
    await client.from( 'venues' ).delete().eq( 'id', venue.id );

    throw createError( {
        statusCode: 500,
        statusMessage: 'ROOM_CREATE_FAILED',
        message: 'Non sono riuscito a creare la stanza. Riprova tra qualche secondo.',
    } );

}
