// Genera supabase/bootstrap_all.sql concatenando, in ordine, tutte le migration
// in supabase/migrations/. NON è una migration: è uno snapshot per il path
// "SQL Editor → incolla → Run". Rigenerarlo dopo ogni nuova migration:
//   node scripts/build-bootstrap-sql.mjs
// (idealmente eseguito/verificato in CI per evitare drift — vedi audit B2/E8).

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname( fileURLToPath( import.meta.url ) )
    , migrationsDir = join( here, '..', 'supabase', 'migrations' )
    , outFile = join( here, '..', 'supabase', 'bootstrap_all.sql' )
    , rule = '═'.repeat( 76 )

    , header = `-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — BOOTSTRAP completo del database (tutte le migration)       ║
-- ║ NON è una migration: concatenazione (ordinata) di supabase/migrations/.     ║
-- ║ Idempotente. SQL Editor → incolla → Run. La via canonica resta db:push.     ║
-- ║ Dopo: Auth → Anonymous sign-ins ON; Realtime → no public access.            ║
-- ║                                                                            ║
-- ║ GENERATO — non modificare a mano: \`node scripts/build-bootstrap-sql.mjs\`.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
`

    , files = ( await readdir( migrationsDir ) )
        .filter( name => name.endsWith( '.sql' ) )
        .toSorted();

let out = header;

for( const name of files ) {

    const sql = await readFile( join( migrationsDir, name ), 'utf8' );

    out += `\n\n-- ${ rule }\n-- ▶ ${ name }\n-- ${ rule }\n\n${ sql.trimEnd() }\n`;

}

await writeFile( outFile, out );

console.info( `bootstrap_all.sql rigenerato da ${ files.length } migration.` );
