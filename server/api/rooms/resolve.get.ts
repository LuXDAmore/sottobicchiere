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

    const { data } = await serviceClient( event )
        .from( 'tables' )
        .select( 'qr_token, venues!inner( slug, expires_at )' )
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

    const venue = data.venues as unknown as { slug: string; expires_at: string | null };

    if( venue.expires_at && new Date( venue.expires_at ) < new Date() ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'ROOM_EXPIRED',
            message: 'Questa stanza non è più disponibile.',
        } );

    }

    return {
        venueSlug: venue.slug,
        qrToken: data.qr_token,
    };

} );
