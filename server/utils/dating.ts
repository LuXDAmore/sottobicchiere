// Validazione e moderazione dei messaggi dating.
// L'availability dei tavoli e lo storico messaggi vivono ora nel database
// (table_sessions.dating_enabled / dating_messages); qui resta solo la logica
// pura di contenuto. Il rate-limit è applicato a livello DB nella route.

const BANNED_WORDS = [
    'idiota',
    'stupido',
    'stronzo',
];

export const DATING_MAX_MESSAGE_LENGTH = 240;
export const DATING_SEND_COOLDOWN_MS = 2500;
export const DATING_RATE_WINDOW_MS = 12_000;
export const DATING_RATE_MAX = 6;

/**
 * Valida il contenuto di un messaggio dating.
 * @param body - testo del messaggio.
 * @returns motivo di rifiuto (stringa) oppure null se valido.
 */
export function validateDatingContent( body: string ): string | null {

    const text = body.trim().toLowerCase();

    if( ! text ) return 'Messaggio vuoto';
    if( text.length > DATING_MAX_MESSAGE_LENGTH ) return `Messaggio troppo lungo (max ${ DATING_MAX_MESSAGE_LENGTH })`;
    if( BANNED_WORDS.some( word => text.includes( word ) ) ) return 'Messaggio bloccato dalla moderazione';

    return null;

}
