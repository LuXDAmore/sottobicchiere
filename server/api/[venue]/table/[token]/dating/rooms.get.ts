import { z } from 'zod';

import { requirePlayerForTable, requireTable } from '../../../../../utils/request';

/**
 * Stato della lobby dating relativo alla sessione corrente:
 *  • available   → altri tavoli con dating attivo a cui si può scrivere.
 *  • unavailable → tavoli con cui si è già in conversazione ma ora offline/spenti.
 *
 * `self` è derivato dal giocatore autenticato (param ?player=<playerId>), NON da
 * un id di sessione passato dal client: senza questo vincolo chiunque conosca un
 * UUID di sessione potrebbe enumerare la rete di contatti di un tavolo terzo.
 */
export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , playerParsed = z.string().uuid().safeParse( getQuery( event ).player )
        , nowIso = new Date().toISOString();

    // `self` = sessione del giocatore autenticato proprietario di ?player.
    let self: string | undefined;

    if( playerParsed.success ) {

        const { session } = await requirePlayerForTable( event, client, playerParsed.data, table.tableId );

        self = session.id;

    }

    const { data: enabled } = await client
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
