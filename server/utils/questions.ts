export interface Question {
    it: string;
    en: string;
}

export const THUMBS_QUESTIONS: Question[] = [
    {
        en: 'Have you ever eaten pizza with pineapple?',
        it: 'Hai mai mangiato la pizza con l\'ananas?',
    },
    {
        en: 'Would you rather live without coffee or without wine?',
        it: 'Preferiresti vivere senza caffè o senza vino?',
    },
    {
        en: 'Do you always read the terms and conditions?',
        it: 'Leggi sempre termini e condizioni?',
    },
    {
        en: 'Have you ever fallen asleep at the cinema?',
        it: 'Ti sei mai addormentato al cinema?',
    },
    {
        en: 'Would you rather never use social media again or never watch TV again?',
        it: 'Preferiresti non usare mai più i social o non guardare mai più la TV?',
    },
    {
        en: 'Have you ever lied about having read a book?',
        it: 'Hai mai mentito di aver letto un libro?',
    },
    {
        en: 'Do you think pineapple belongs on pizza?',
        it: 'Pensi che l\'ananas sulla pizza abbia senso?',
    },
    {
        en: 'Have you ever sent a message to the wrong person?',
        it: 'Hai mai mandato un messaggio alla persona sbagliata?',
    },
    {
        en: 'Would you rather be always 10 minutes early or always 10 minutes late?',
        it: 'Preferiresti essere sempre 10 minuti in anticipo o sempre 10 minuti in ritardo?',
    },
    {
        en: 'Have you ever skipped a workout you had planned?',
        it: 'Hai mai saltato un allenamento che avevi pianificato?',
    },
    {
        en: 'Would you rather only eat pasta or only eat rice for the rest of your life?',
        it: 'Preferiresti mangiare solo pasta o solo riso per il resto della vita?',
    },
    {
        en: 'Have you ever pretended not to see someone to avoid a conversation?',
        it: 'Hai mai finto di non vedere qualcuno per evitare una conversazione?',
    },
    {
        en: 'Do you think you could survive a week without your smartphone?',
        it: 'Pensi di riuscire a sopravvivere una settimana senza smartphone?',
    },
    {
        en: 'Have you ever laughed out loud while reading something alone?',
        it: 'Ti sei mai messo a ridere da solo leggendo qualcosa?',
    },
    {
        en: 'Would you rather always speak the truth or always know the truth?',
        it: 'Preferiresti dire sempre la verità o sapere sempre la verità?',
    },
    {
        en: 'Have you ever eaten something expired and said nothing?',
        it: 'Hai mai mangiato qualcosa di scaduto e non hai detto niente?',
    },
    {
        en: 'Would you rather have more money or more free time?',
        it: 'Preferiresti avere più soldi o più tempo libero?',
    },
    {
        en: 'Have you ever gone back to sleep after setting an alarm?',
        it: 'Hai mai rimesso a dormire la sveglia più di tre volte di fila?',
    },
    {
        en: 'Do you think you sing well in the shower?',
        it: 'Pensi di cantare bene sotto la doccia?',
    },
    {
        en: 'Would you rather spend a week without the internet or without electricity?',
        it: 'Preferiresti passare una settimana senza internet o senza elettricità?',
    },
];

/**
 *
 * @param questions
 */
export function shuffleQuestions( questions: Question[] ): Question[] {

    const shuffled = [ ... questions ];

    for( let index = shuffled.length - 1; index > 0; index -- ) {

        const randomIndex = Math.floor( Math.random() * ( index + 1 ) );

        [ shuffled[ index ], shuffled[ randomIndex ] ] = [ shuffled[ randomIndex ]!, shuffled[ index ]! ];

    }
    return shuffled;

}
