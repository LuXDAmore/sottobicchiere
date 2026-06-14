/**
 * Helper per i toast delle azioni async. Centralizza il pattern ripetuto in lobby,
 * thumbs, index e new: estrarre `error.data.message` dalla risposta del server con
 * fallback su una chiave i18n, mostrandolo come toast d'errore. NON gestisce i toast
 * di "pending"/"success" (spesso legati agli ACK realtime), per non alterare cicli
 * di vita già calibrati: si limita alla costruzione del toast d'errore.
 */
export function useActionToast() {

    const toast = useToast()
        , { t } = useI18n()

        /**
         * Mostra un toast d'errore con il messaggio del server, se presente,
         * altrimenti il testo i18n di fallback.
         * @param exception - errore catturato (tipicamente di $fetch).
         * @param fallbackKey - chiave i18n usata se il server non fornisce un messaggio.
         */
        , errorToast = ( exception: unknown, fallbackKey: string ) => {

            const fetchError = exception as { data?: { message?: string } };

            toast.add( {
                color: 'error',
                description: fetchError.data?.message ?? t( fallbackKey ),
                duration: 4000,
                icon: 'i-lucide-circle-alert',
            } );

        };

    return { errorToast };

}
