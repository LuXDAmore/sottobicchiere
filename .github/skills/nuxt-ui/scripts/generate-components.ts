#!/usr/bin/env npx tsx
/**
 * Generates nuxt-ui component docs from Nuxt UI repo (cloned to /tmp)
 * Run: npx tsx skills/nuxt-ui/scripts/generate-components.ts
 *
 * Creates:
 *   - references/components.md (index with version column for Other category)
 *   - components/<name>.md (per-component details)
 */

import { execSync } from 'node:child_process';
import {
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TMP_DIR = join( tmpdir(), 'nuxt-ui-docs-gen' )
    , REPO_URL = 'https://github.com/nuxt/ui.git'
    , DOCS_PATH = 'docs/content/docs/2.components';

interface ComponentMeta {
  name: string
  description: string
  category: string
  rekaLink?: string
  version?: string
}

// Category groupings for better organization
const CATEGORIES: Record<string, string> = {
    data: 'Data',
    element: 'Element',
    form: 'Form',
    layout: 'Layout',
    navigation: 'Navigation',
    overlay: 'Overlay',
}

    // Version mapping for components introduced after v4.0
    , VERSION_MAP: Record<string, string> = {
        editor: 'v4.3+',
        'editor-drag-handle': 'v4.3+',
        'editor-emoji-menu': 'v4.3+',
        'editor-mention-menu': 'v4.3+',
        'editor-suggestion-menu': 'v4.3+',
        empty: 'v4.1+',
        'editor-toolbar': 'v4.3+',
        'input-date': 'v4.2+',
        'input-time': 'v4.2+',
        'scroll-area': 'v4.3+',
    };

/**
 *
 * @param content
 */
function parseYamlFrontmatter( content: string ): { frontmatter: Record<string, unknown>, body: string } {

    const match = content.match( /^---\n([\s\S]*?)\n---\n([\s\S]*)$/ );

    if( ! match ) {

        return {
            body: content,
            frontmatter: {},
        };

    }

    const frontmatter: Record<string, unknown> = {}
        , yamlContent = match[ 1 ];

    // Simple YAML parsing for our needs
    for( const line of yamlContent.split( '\n' ) ) {

        const colonIndex = line.indexOf( ':' );

        if( colonIndex > 0 && ! line.startsWith( ' ' ) && ! line.startsWith( '-' ) ) {

            const key = line.slice( 0, colonIndex ).trim()
                , value = line.slice( colonIndex + 1 ).trim();

            frontmatter[ key ] = value.replaceAll( /^['"]|['"]$/g, '' );

        }

    }

    // Parse links for Reka UI reference
    if( yamlContent.includes( 'reka-ui.com' ) ) {

        const rekaMatch = yamlContent.match( /to:\s*(https:\/\/reka-ui\.com[^\n]+)/ );

        if( rekaMatch )
            frontmatter.rekaLink = rekaMatch[ 1 ];

    }

    return {
        body: match[ 2 ],
        frontmatter,
    };

}

/**
 *
 * @param name
 * @param meta
 * @param body
 */
function generateComponentFile( name: string, meta: ComponentMeta, body: string ): string {

    const lines: string[] = []
        , displayName = name.split( '-' ).map( w => w.charAt( 0 ).toUpperCase() + w.slice( 1 ) ).join( '' );

    lines.push( `# ${ displayName }`, '', meta.description, '' );

    if( meta.rekaLink )

        lines.push( `> Based on [Reka UI ${ displayName }](${ meta.rekaLink })`, '' );

    // Extract key props from body text
    const propertyMentions = body.match( /Use the `(\w+)` prop/g );

    if( propertyMentions && propertyMentions.length > 0 ) {

        lines.push( '## Key Props', '' );
        const uniqueProperties = [ ... new Set( propertyMentions.map( m => m.match( /`(\w+)`/ )?.[ 1 ] ).filter( Boolean ) ) ];

        for( const property of uniqueProperties.slice( 0, 10 ) ) {

            // Find the description after the prop mention
            const propertyRegex = new RegExp( `Use the \`${ property }\` prop ([^.]+\\.?)` )
                , desc = body.match( propertyRegex )?.[ 1 ] || '';

            lines.push( `- \`${ property }\`: ${ desc.replace( /to\s+$/, '' ).trim() }` );

        }
        lines.push( '' );

    }

    // Add basic usage
    lines.push( '## Usage', '', '```vue', `<U${ displayName }`, `  <!-- props here -->`, `/>`, '```', '' );

    // Add slot info if present - look for slot mentions in text
    const slotPattern = /`#(\w+)`{?/g
        , slotMatches = [ ... body.matchAll( slotPattern ) ];

    if( slotMatches.length > 0 ) {

        const validSlots = new Set( [
                'default',
                'content',
                'header',
                'body',
                'footer',
                'title',
                'description',
                'leading',
                'trailing',
                'icon',
                'label',
                'close',
                'trigger',
                'actions',
                'item',
                'empty',
            ] )
            , uniqueSlots = [ ... new Set( slotMatches.map( m => m[ 1 ] ) ) ]
                .filter( s => validSlots.has( s ) );

        if( uniqueSlots.length > 0 ) {

            lines.push( '## Slots', '' );
            for( const slot of uniqueSlots.slice( 0, 8 ) )
                lines.push( `- \`#${ slot }\`` );

            lines.push( '' );

        }

    }

    return lines.join( '\n' );

}

/**
 *
 */
async function main() {

    const __dirname = dirname( fileURLToPath( import.meta.url ) )
        , baseDir = join( __dirname, '..' )
        , componentsDir = join( baseDir, 'components' );

    // Clean previous run and clone fresh
    rmSync( TMP_DIR, {
        force: true,
        recursive: true,
    } );
    console.log( 'Cloning nuxt/ui (sparse checkout)...' );
    try {

        execSync( `git clone --depth 1 --filter=blob:none --sparse ${ REPO_URL } ${ TMP_DIR }`, { stdio: 'inherit' } );
        execSync( `git sparse-checkout set ${ DOCS_PATH }`, {
            cwd: TMP_DIR,
            stdio: 'inherit',
        } );

    } catch{

        console.error( `\nFailed to clone ${ REPO_URL }. Check network/GitHub status.` );
        process.exit( 1 );

    }

    const NUXT_UI_DOCS = join( TMP_DIR, DOCS_PATH );

    mkdirSync( componentsDir, { recursive: true } );

    console.log( 'Generating Nuxt UI component docs...' );

    const files = readdirSync( NUXT_UI_DOCS ).filter( f => f.endsWith( '.md' ) && f !== '0.index.md' )
        , components: ComponentMeta[] = [];

    for( const file of files ) {

        const name = basename( file, '.md' )
            , content = readFileSync( join( NUXT_UI_DOCS, file ), 'utf-8' )
            , { frontmatter, body } = parseYamlFrontmatter( content )

            , meta: ComponentMeta = {
                category: frontmatter.category || 'other',
                description: frontmatter.description || '',
                name,
                rekaLink: frontmatter.rekaLink,
                version: VERSION_MAP[ name ],
            };

        components.push( meta );

        // Generate component file
        const componentContent = generateComponentFile( name, meta, body );

        writeFileSync( join( componentsDir, `${ name }.md` ), componentContent );
        console.log( `✓ Generated components/${ name }.md` );

    }

    // Generate index
    const index: string[] = [
        '# Components',
        '',
        '> Auto-generated from Nuxt UI docs. Run `npx tsx skills/nuxt-ui/scripts/generate-components.ts` to update.'
        , '',
        '> **For headless primitives (API, accessibility):** see `reka-ui` skill',
        '',
    ]
        // Group by category
        , byCategory: Record<string, ComponentMeta[]> = {};

    for( const comp of components ) {

        const cat = CATEGORIES[ comp.category ] || 'Other';

        if( ! byCategory[ cat ] )
            byCategory[ cat ] = [];
        byCategory[ cat ].push( comp );

    }

    // Calculate column widths for alignment
    /**
     *
     * @param comps
     * @param hasVersionCol
     */
    function getMaxLengths( comps: ComponentMeta[], hasVersionCol: boolean ) {

        let maxComp = 'Component'.length
            , maxDesc = 'Description'.length;

        for( const comp of comps ) {

            const displayName = comp.name.split( '-' ).map( w => w.charAt( 0 ).toUpperCase() + w.slice( 1 ) ).join( '' )
                , link = `[${ displayName }](components/${ comp.name }.md)`;

            if( link.length > maxComp )
                maxComp = link.length;
            const desc = hasVersionCol ? comp.description : ( comp.version ? `${ comp.description } (${ comp.version })` : comp.description );

            if( desc.length > maxDesc )
                maxDesc = desc.length;

        }
        return {
            maxComp,
            maxDesc,
        };

    }

    for( const [ cat, comps ] of Object.entries( byCategory ).sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) ) ) {

        index.push( `## ${ cat }`, '' );
        const hasVersionCol = cat === 'Other'
            , { maxComp, maxDesc } = getMaxLengths( comps, hasVersionCol );

        if( hasVersionCol ) {

            index.push( `| ${ 'Component'.padEnd( maxComp ) } | ${ 'Description'.padEnd( maxDesc ) } | Version |` );
            index.push( `| ${ '-'.repeat( maxComp ) } | ${ '-'.repeat( maxDesc ) } | ------- |` );

        } else {

            index.push( `| ${ 'Component'.padEnd( maxComp ) } | ${ 'Description'.padEnd( maxDesc ) } |` );
            index.push( `| ${ '-'.repeat( maxComp ) } | ${ '-'.repeat( maxDesc ) } |` );

        }

        for( const comp of comps.sort( ( a, b ) => a.name.localeCompare( b.name ) ) ) {

            const displayName = comp.name.split( '-' ).map( w => w.charAt( 0 ).toUpperCase() + w.slice( 1 ) ).join( '' )
                , link = `[${ displayName }](components/${ comp.name }.md)`;

            if( hasVersionCol ) {

                const desc = comp.version ? `${ comp.description } (${ comp.version })` : comp.description;

                index.push( `| ${ link.padEnd( maxComp ) } | ${ desc.padEnd( maxDesc ) } | ${ ( comp.version || '' ).padEnd( 7 ) } |` );

            } else {

                const desc = comp.version ? `${ comp.description } (${ comp.version })` : comp.description;

                index.push( `| ${ link.padEnd( maxComp ) } | ${ desc.padEnd( maxDesc ) } |` );

            }

        }
        index.push( '' );

    }

    writeFileSync( join( baseDir, 'references', 'components.md' ), index.join( '\n' ) );
    console.log( '✓ Generated references/components.md (index)' );

    console.log( `\nDone! Generated ${ components.length + 1 } files.` );

}

main().catch( console.error );
