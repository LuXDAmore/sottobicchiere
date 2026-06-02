import { isValidRoomCode, normalizeRoomCode } from '../../../shared/utils/room-code';
import { serviceClient } from '../../utils/supabase';

export default defineEventHandler( async event => {

    const code = normalizeRoomCode( String( getQuery( event ).code ?? '' ) );

    if( ! isValidRoomCode( code ) ) {

        throw createError( {
            statusCode: 400,
            statusMessage: 'INVALID_CODE',
            message: 'Codice non valido. Controlla i sei caratteri e riprova.',
        } );

    }

    // Equivalente a QR/link: risolve finché la riga esiste. NON filtriamo su
    // `venues.expires_at` perché il cleanup conserva le venue ad-hoc scadute che
    // hanno ancora una sessione attiva (per non interrompere una partita in corso);
    // controllare la scadenza qui renderebbe il codice non equivalente al QR (che
    // passa da `resolveTableRow`, senza check di scadenza). Le venue davvero morte
    // vengono rimosse dal pg_cron e qui diventano naturalmente 404.
    const { data } = await serviceClient( event )
        .from( 'tables' )
        .select( 'qr_token, venues!inner( slug )' )
        .eq( 'short_code', code )
        .limit( 1 )
        .maybeSingle();

    if( ! data ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'CODE_NOT_FOUND',
            message: 'Stanza non trovata: il codice potrebbe essere errato o scaduto.',
        } );

    }

    const venue = data.venues as unknown as { slug: string };

    return {
        venueSlug: venue.slug,
        qrToken: data.qr_token,
    };

} );
