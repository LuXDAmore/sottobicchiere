import type { Database } from '../../shared/types/database';
import type { H3Event } from 'h3';

import { serverSupabaseServiceRole } from '#supabase/server';

/**
 * Client Supabase con privilegi di service role (bypassa RLS).
 *
 * Tutto l'accesso ai dati lato server passa da qui: le API sono la sola
 * autorità sullo stato di gioco, i client non scrivono mai direttamente le
 * tabelle. Tipizzato con lo schema del database per query type-safe.
 * @param event - evento H3 della request corrente.
 */
export function serviceClient( event: H3Event ) {

    return serverSupabaseServiceRole<Database>( event );

}

export type ServiceClient = ReturnType<typeof serviceClient>;
