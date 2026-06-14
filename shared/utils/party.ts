// Contenuti dei giochi locali "pre-serata" (dares + categorie).
// Sono pass-the-phone: i testi puntano a bersagli generici ("chi è alla tua
// sinistra", "chi indossa più colori") così non serve la lista nomi e il gioco
// resta privacy-first e completamente client-side.

export interface LocalizedText {
    it: string;
    en: string;
}

export type DareKind = 'dare' | 'group' | 'rule' | 'sip' | 'truth';

export interface DareCard {
    kind: DareKind;
    text: LocalizedText;
}

// Mazzo del gioco "Pre-Serata" (stile Picolo): leggero, inclusivo, niente
// contenuti offensivi. "Bevi" è sempre sostituibile con un pegno per chi non beve.
export const PARTY_DARES: DareCard[] = [
    {
        kind: 'truth',
        text: {
            it: 'Racconta l\'ultima bugia che hai detto.',
            en: 'Tell the last lie you told.',
        },
    },
    {
        kind: 'truth',
        text: {
            it: 'Qual è la cosa più imbarazzante che hai nel telefono?',
            en: 'What\'s the most embarrassing thing on your phone?',
        },
    },
    {
        kind: 'truth',
        text: {
            it: 'Chi al tavolo chiameresti alle 3 di notte?',
            en: 'Who at this table would you call at 3 a.m.?',
        },
    },
    {
        kind: 'truth',
        text: {
            it: 'Qual è stata la tua peggiore serata?',
            en: 'What was your worst night out?',
        },
    },
    {
        kind: 'dare',
        text: {
            it: 'Parla con accento straniero fino al tuo prossimo turno.',
            en: 'Speak in a foreign accent until your next turn.',
        },
    },
    {
        kind: 'dare',
        text: {
            it: 'Fai il tuo miglior verso di animale, ad alta voce.',
            en: 'Do your best animal sound, out loud.',
        },
    },
    {
        kind: 'dare',
        text: {
            it: 'Manda un messaggio "ci sei?" al terzo contatto della tua chat.',
            en: 'Text "you there?" to your third chat contact.',
        },
    },
    {
        kind: 'dare',
        text: {
            it: 'Inventa un brindisi e fallo al tavolo.',
            en: 'Invent a toast and deliver it to the table.',
        },
    },
    {
        kind: 'dare',
        text: {
            it: 'Imita qualcuno al tavolo: gli altri indovinano chi è.',
            en: 'Imitate someone at the table: the others guess who.',
        },
    },
    {
        kind: 'sip',
        text: {
            it: 'Chi oggi ha controllato il telefono più di tutti beve.',
            en: 'Whoever checked their phone the most today drinks.',
        },
    },
    {
        kind: 'sip',
        text: {
            it: 'Chi è arrivato per ultimo beve un sorso.',
            en: 'The last one to arrive takes a sip.',
        },
    },
    {
        kind: 'sip',
        text: {
            it: 'Bevi se hai mai cantato a un karaoke.',
            en: 'Drink if you\'ve ever sung at karaoke.',
        },
    },
    {
        kind: 'sip',
        text: {
            it: 'Chi indossa meno colori beve.',
            en: 'Whoever wears the fewest colors drinks.',
        },
    },
    {
        kind: 'sip',
        text: {
            it: 'Il più giovane e il più grande del tavolo brindano insieme.',
            en: 'The youngest and the oldest at the table toast together.',
        },
    },
    {
        kind: 'rule',
        text: {
            it: 'Nuova regola: vietato dire "io". Chi sbaglia beve.',
            en: 'New rule: saying "I" is forbidden. Break it, drink.',
        },
    },
    {
        kind: 'rule',
        text: {
            it: 'Nuova regola: prima di bere tutti dicono "salute!".',
            en: 'New rule: everyone says "cheers!" before drinking.',
        },
    },
    {
        kind: 'rule',
        text: {
            it: 'Nuova regola: niente nomi propri fino a fine partita.',
            en: 'New rule: no first names until the game ends.',
        },
    },
    {
        kind: 'rule',
        text: {
            it: 'Scegli un compagno di sorsi: bevete sempre insieme.',
            en: 'Pick a drinking buddy: you always drink together.',
        },
    },
    {
        kind: 'group',
        text: {
            it: 'Pollice sul tavolo: l\'ultimo a farlo beve.',
            en: 'Thumb on the table: the last to do it drinks.',
        },
    },
    {
        kind: 'group',
        text: {
            it: 'Tutti indicano chi sparla di più: il più votato beve.',
            en: 'Everyone points at the biggest gossip: most votes drinks.',
        },
    },
    {
        kind: 'group',
        text: {
            it: 'A turno dite una parola per una storia: chi si blocca beve.',
            en: 'Build a story one word each: whoever freezes drinks.',
        },
    },
    {
        kind: 'group',
        text: {
            it: 'Mai dire mai: "Non ho mai…". Chi l\'ha fatto beve.',
            en: 'Never have I ever: whoever has, drinks.',
        },
    },
    {
        kind: 'group',
        text: {
            it: 'Sfida di sguardi col vicino di destra: chi ride beve.',
            en: 'Staring contest with the person on your right: who laughs drinks.',
        },
    },
    {
        kind: 'truth',
        text: {
            it: 'Qual è il tuo guilty pleasure musicale?',
            en: 'What\'s your guilty pleasure song?',
        },
    },
    {
        kind: 'dare',
        text: {
            it: 'Fai un selfie di gruppo con la posa più assurda.',
            en: 'Take a group selfie with the silliest pose.',
        },
    },
    {
        kind: 'dare',
        text: {
            it: 'Balla per 10 secondi senza musica.',
            en: 'Dance for 10 seconds with no music.',
        },
    },
    {
        kind: 'sip',
        text: {
            it: 'Chi ha l\'app più inutile sul telefono beve.',
            en: 'Whoever has the most useless app drinks.',
        },
    },
    {
        kind: 'truth',
        text: {
            it: 'Confessa un acquisto inutile dell\'ultimo mese.',
            en: 'Confess a useless purchase from the last month.',
        },
    },
    {
        kind: 'group',
        text: {
            it: 'Il prossimo che dice una parolaccia offre il prossimo giro.',
            en: 'The next one to swear buys the next round.',
        },
    },
    {
        kind: 'dare',
        text: {
            it: 'Racconta una barzelletta: se nessuno ride, bevi.',
            en: 'Tell a joke: if nobody laughs, drink.',
        },
    },
];

// Categorie del gioco "Categorie": si passa il telefono e si dice al volo
// qualcosa che rientra nella categoria prima dello scadere del timer.
export const CATEGORY_PROMPTS: LocalizedText[] = [
    {
        it: 'Marche di birra',
        en: 'Beer brands',
    },
    {
        it: 'Squadre di calcio',
        en: 'Football teams',
    },
    {
        it: 'Cocktail',
        en: 'Cocktails',
    },
    {
        it: 'Città italiane',
        en: 'Italian cities',
    },
    {
        it: 'Cantanti italiani',
        en: 'Italian singers',
    },
    {
        it: 'Film usciti al cinema',
        en: 'Movies shown in cinemas',
    },
    {
        it: 'Animali della savana',
        en: 'Savanna animals',
    },
    {
        it: 'Tipi di pasta',
        en: 'Types of pasta',
    },
    {
        it: 'Personaggi dei cartoni',
        en: 'Cartoon characters',
    },
    {
        it: 'Pizze',
        en: 'Pizza toppings',
    },
    {
        it: 'Capitali europee',
        en: 'European capitals',
    },
    {
        it: 'Marche di auto',
        en: 'Car brands',
    },
    {
        it: 'Cose che trovi in un bar',
        en: 'Things you find in a bar',
    },
    {
        it: 'Supereroi',
        en: 'Superheroes',
    },
    {
        it: 'Sport olimpici',
        en: 'Olympic sports',
    },
    {
        it: 'Frutti',
        en: 'Fruits',
    },
    {
        it: 'Social network',
        en: 'Social networks',
    },
    {
        it: 'Strumenti musicali',
        en: 'Musical instruments',
    },
    {
        it: 'Serie TV',
        en: 'TV series',
    },
    {
        it: 'Colori',
        en: 'Colors',
    },
    {
        it: 'Mestieri',
        en: 'Jobs',
    },
    {
        it: 'Regioni italiane',
        en: 'Italian regions',
    },
    {
        it: 'Marche di smartphone',
        en: 'Smartphone brands',
    },
    {
        it: 'Dolci italiani',
        en: 'Italian desserts',
    },
];

/**
 * Copia mescolata (Fisher-Yates) senza mutare l'input. Usata dai giochi locali
 * per pescare carte/categorie in ordine casuale senza ripetizioni nel giro.
 * @param items - elementi da mescolare.
 */
export function shuffle<T>( items: readonly T[] ): T[] {

    const shuffled = [ ... items ];

    for( let index = shuffled.length - 1; index > 0; index -- ) {

        const randomIndex = Math.floor( Math.random() * ( index + 1 ) );

        [ shuffled[ index ], shuffled[ randomIndex ] ] = [ shuffled[ randomIndex ]!, shuffled[ index ]! ];

    }

    return shuffled;

}
