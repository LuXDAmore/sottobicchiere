import { z } from 'zod';

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

    // Serve l'utente anonimo: ne registra la paternità della stanza ed è ciò che
    // autorizzerà il channel realtime una volta che entrerà come host.
    const user = await serverSupabaseUser( event ).catch( () => null );

    if( ! user ) {

        throw createError( {
            statusCode: 401,
            statusMessage: 'NOT_AUTHENTICATED',
            message: 'Sessione non pronta. Aggiorna la pagina e riprova.',
        } );

    }

    const room = await createAdhocRoom( serviceClient( event ), user, parsed.data.name );

    return {
        ... room,
        joinPath: `/${ room.venueSlug }/table/${ room.qrToken }`,
    };

} );
