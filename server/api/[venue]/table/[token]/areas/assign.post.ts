import { z } from 'zod';

import { requirePlayerForTable, requireTable } from '../../../../../utils/request';

const assignSchema = z.object( {
    playerId: z.string().uuid(),
    areaId: z.string().uuid().nullable(),
} );

// Assegna il giocatore corrente a un'area (o lo toglie con areaId null). Ognuno
// può spostare solo sé stesso: requirePlayerForTable verifica proprietà + tavolo.
export default defineEventHandler( async event => {

    const parsed = assignSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_ASSIGN_PAYLOAD',
            message: 'Richiesta non valida.',
        } );

    }

    const { client, table } = await requireTable( event )
        , { player, session } = await requirePlayerForTable( event, client, parsed.data.playerId, table.tableId );

    // L'area deve appartenere alla stessa sessione del giocatore.
    if( parsed.data.areaId ) {

        const { data: area } = await client
            .from( 'areas' )
            .select( 'id' )
            .eq( 'id', parsed.data.areaId )
            .eq( 'table_session_id', session.id )
            .maybeSingle();

        if( ! area ) {

            throw createError( {
                statusCode: 404,
                statusMessage: 'AREA_NOT_FOUND',
                message: 'Area non trovata in questa sessione.',
            } );

        }

    }

    const { error } = await client
        .from( 'player_sessions' )
        .update( { area_id: parsed.data.areaId } )
        .eq( 'id', player.id );

    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'AREA_ASSIGN_FAILED',
            message: 'Non sono riuscito ad aggiornare l\'area. Riprova.',
        } );

    }

    return {
        ok: true,
        areaId: parsed.data.areaId,
    };

} );
