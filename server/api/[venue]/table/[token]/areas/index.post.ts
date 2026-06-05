import { z } from 'zod';

import { pickAvailableColor } from '../../../../../../shared/utils/colors';
import { requireHostSession, requireTable } from '../../../../../utils/request';

const createAreaSchema = z.object( {
    playerId: z.string().uuid(),
    name: z.string().min( 1 ).max( 30 ).trim(),
} );

// Crea un'area nella sessione. Solo l'host (decisione di prodotto: l'host
// organizza le zone; i giocatori poi si auto-assegnano).
export default defineEventHandler( async event => {

    const parsed = createAreaSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_AREA_PAYLOAD',
            message: 'Nome area non valido: usa da 1 a 30 caratteri.',
        } );

    }

    const { client, table } = await requireTable( event )
        , { session } = await requireHostSession( event, client, parsed.data.playerId )

        // requireHostSession non verifica che la sessione sia di QUESTO tavolo: controllalo.
        , { data: owner, error: ownerError } = await client
            .from( 'table_sessions' )
            .select( 'table_id' )
            .eq( 'id', session.id )
            .maybeSingle();

    // Errore DB ≠ mismatch di autorizzazione: 500 esplicito, non un 403 fuorviante.
    if( ownerError ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'SESSION_LOOKUP_FAILED',
            message: 'Non riesco a verificare la sessione ora. Riprova.',
        } );

    }

    if( ! owner || owner.table_id !== table.tableId ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'PLAYER_TABLE_MISMATCH',
            message: 'Questo giocatore non appartiene a questo tavolo o la sessione è scaduta.',
        } );

    }

    const { data: existing } = await client
            .from( 'areas' )
            .select( 'color, ordinal' )
            .eq( 'table_session_id', session.id )

        , areas = existing ?? []
        , color = pickAvailableColor( areas.map( a => a.color ) )
        , ordinal = areas.reduce( ( max, a ) => Math.max( max, a.ordinal ), - 1 ) + 1

        , { data: created, error } = await client
            .from( 'areas' )
            .insert( {
                table_session_id: session.id,
                name: parsed.data.name,
                color,
                ordinal,
            } )
            .select( 'id, name, color, ordinal' )
            .single();

    if( error || ! created ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'AREA_CREATE_FAILED',
            message: 'Non sono riuscito a creare l\'area. Riprova.',
        } );

    }

    return created;

} );
