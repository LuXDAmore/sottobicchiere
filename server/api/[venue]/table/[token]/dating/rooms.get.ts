import { z } from 'zod';

import { requireTable } from '../../../../../utils/request';

/**
 * Stato della lobby dating relativo alla sessione corrente:
 *  • available   → altri tavoli con dating attivo a cui si può scrivere.
 *  • unavailable → tavoli con cui si è già in conversazione ma ora offline/spenti.
 *
 * Query: ?self=<tableSessionId>
 */
export default defineEventHandler( async event => {

    const { client } = await requireTable( event )
        // Valida `self` come UUID: viene interpolato in .or(...), quindi va sanificato.
        , selfParsed = z.string().uuid().safeParse( getQuery( event ).self )
        , self = selfParsed.success ? selfParsed.data : undefined
        , nowIso = new Date().toISOString()

        , { data: enabled } = await client
            .from( 'table_sessions' )
            .select( 'id' )
            .eq( 'dating_enabled', true )
            .gt( 'expires_at', nowIso )

        , availableTableSessionIds = ( enabled ?? [] ).map( ( r: { id: string } ) => r.id ).filter( ( id: string ) => id !== self );

    let unavailableTableSessionIds: string[] = [];

    if( self ) {

        const { data: convos } = await client
                .from( 'dating_messages' )
                .select( 'from_table_session_id, to_table_session_id' )
                .or( `from_table_session_id.eq.${ self },to_table_session_id.eq.${ self }` )

            , partners = new Set<string>();

        for( const c of convos ?? [] ) {

            if( c.from_table_session_id !== self ) partners.add( c.from_table_session_id );
            if( c.to_table_session_id !== self ) partners.add( c.to_table_session_id );

        }

        unavailableTableSessionIds = [ ... partners ].filter( id => ! availableTableSessionIds.includes( id ) );

    }

    return {
        availableTableSessionIds,
        unavailableTableSessionIds,
    };

} );
