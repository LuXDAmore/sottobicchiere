import { z } from 'zod';

import {
    DATING_RATE_MAX,
    DATING_RATE_WINDOW_MS,
    DATING_SEND_COOLDOWN_MS,
    validateDatingContent,
} from '../../../../../utils/dating';
import { requirePlayerForTable, requireTable } from '../../../../../utils/request';

const payloadSchema = z.object( {
    playerId: z.string().uuid(),
    toTableSessionId: z.string().uuid(),
    body: z.string().min( 1 ).max( 240 ),
} );

export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_PAYLOAD',
            message: 'Messaggio non valido.',
        } );

    }

    const { client, table } = await requireTable( event )
        , { playerId, toTableSessionId, body } = parsed.data
        , { player } = await requirePlayerForTable( event, client, playerId, table.tableId )
        , fromTableSessionId = player.table_session_id;

    if( toTableSessionId === fromTableSessionId ) {

        throw createError( {
            statusCode: 400,
            statusMessage: 'INVALID_TARGET',
            message: 'Non puoi scrivere al tuo stesso tavolo.',
        } );

    }

    const reason = validateDatingContent( body );

    if( reason ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'MESSAGE_REJECTED',
            message: reason,
        } );

    }

    const nowIso = new Date().toISOString()

        // Carica mittente e destinatario in parallelo.
        , [ { data: source }, { data: target } ] = await Promise.all( [

            // La sessione mittente deve avere dating attivo: evita che un tavolo
            // bypassi il toggle (o spammi) semplicemente conoscendo un playerId.
            client
                .from( 'table_sessions' )
                .select( 'id, dating_enabled' )
                .eq( 'id', fromTableSessionId )
                .gt( 'expires_at', nowIso )
                .maybeSingle(),

            // Il tavolo destinatario deve essere disponibile (dating attivo, non scaduto).
            client
                .from( 'table_sessions' )
                .select( 'id, dating_enabled' )
                .eq( 'id', toTableSessionId )
                .gt( 'expires_at', nowIso )
                .maybeSingle(),

        ] );

    if( ! source || ! source.dating_enabled ) {

        throw createError( {
            statusCode: 409,
            statusMessage: 'DATING_NOT_ENABLED',
            message: 'Il dating non è attivo per questo tavolo.',
        } );

    }

    if( ! target || ! target.dating_enabled ) {

        throw createError( {
            statusCode: 409,
            statusMessage: 'TARGET_UNAVAILABLE',
            message: 'Tavolo destinatario non disponibile.',
        } );

    }

    // Rate-limit basato su DB (robusto in ambiente serverless).
    const windowStart = new Date( Date.now() - DATING_RATE_WINDOW_MS ).toISOString()

        , { data: recent } = await client
            .from( 'dating_messages' )
            .select( 'created_at' )
            .eq( 'from_table_session_id', fromTableSessionId )
            .gte( 'created_at', windowStart )
            .order( 'created_at', { ascending: false } );

    if( ( recent?.length ?? 0 ) >= DATING_RATE_MAX ) {

        throw createError( {
            statusCode: 429,
            statusMessage: 'RATE_LIMITED',
            message: 'Rate limit raggiunto, attendi qualche secondo.',
        } );

    }

    const lastAt = recent?.[ 0 ]?.created_at ? new Date( recent[ 0 ].created_at ).getTime() : 0;

    if( lastAt && Date.now() - lastAt < DATING_SEND_COOLDOWN_MS ) {

        throw createError( {
            statusCode: 429,
            statusMessage: 'COOLDOWN',
            message: 'Attendi prima di inviare un altro messaggio.',
        } );

    }

    // L'INSERT viene consegnato a entrambi i tavoli dal trigger di broadcast.
    const { error } = await client
        .from( 'dating_messages' )
        .insert( {
            from_table_session_id: fromTableSessionId,
            to_table_session_id: toTableSessionId,
            body: body.trim(),
        } );

    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'MESSAGE_FAILED',
            message: 'Non è stato possibile inviare il messaggio. Riprova.',
        } );

    }

    return { ok: true };

} );
