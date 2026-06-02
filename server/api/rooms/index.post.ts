import { z } from 'zod';

import { supabaseUserId } from '../../../shared/utils/supabase-user';
import { createAdhocRoom } from '../../utils/room';
import { serviceClient } from '../../utils/supabase';

import { serverSupabaseUser } from '#supabase/server';

const createRoomSchema = z.object( { name: z.string().max( 40 ).trim().optional() } );

export default defineEventHandler( async event => {

    const parsed = createRoomSchema.safeParse( await readBody( event ).catch( () => ( {} ) ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_ROOM_PAYLOAD',
            message: 'Nome stanza non valido: massimo 40 caratteri.',
        } );

    }

    // Serve l'utente anonimo: il suo id (claim `sub`, fallback `id`) registra la
    // paternità della stanza ed è ciò che autorizzerà il channel realtime quando
    // entrerà come host. Richiediamo che l'id esista (come in join/requirePlayer).
    const user = await serverSupabaseUser( event ).catch( () => null )
        , userId = supabaseUserId( user );

    if( ! userId ) {

        throw createError( {
            statusCode: 401,
            statusMessage: 'NOT_AUTHENTICATED',
            message: 'Sessione non pronta. Aggiorna la pagina e riprova.',
        } );

    }

    const room = await createAdhocRoom( serviceClient( event ), userId, parsed.data.name );

    return {
        ... room,
        joinPath: `/${ room.venueSlug }/table/${ room.qrToken }`,
    };

} );
