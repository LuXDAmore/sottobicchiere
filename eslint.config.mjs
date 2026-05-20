import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';

import { withNuxt } from './.nuxt/eslint.config.mjs';

import tsEslint from 'typescript-eslint';
import * as dependPlugin from 'eslint-plugin-depend';
import importPlugin from 'eslint-plugin-import-x';
import nodePlugin from 'eslint-plugin-n';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import unicornPlugin from 'eslint-plugin-unicorn';
import compatPlugin from 'eslint-plugin-compat';
import globals from 'globals';

import jestPlugin from 'eslint-plugin-jest';
import vitestPlugin from '@vitest/eslint-plugin';
import playwrightPlugin from 'eslint-plugin-playwright';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import babelParser from '@babel/eslint-parser';

import promisePlugin from 'eslint-plugin-promise';
import importNewlinesPlugin from 'eslint-plugin-import-newlines';
import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments';
import prettierPlugin from 'eslint-plugin-prettier';
import stylisticEslintPlugin from '@stylistic/eslint-plugin';

import {
    sharedRules,
    typescriptRules,
    vueAndNuxtGlobals,
    vueAndNuxtRules,
} from './eslint.constants.mjs';

const myConfig = defineConfig(

    {
        plugins: {
            '@stylistic': stylisticEslintPlugin,
            'eslint-comments': eslintCommentsPlugin,
            import: importPlugin,
            'import-newlines': importNewlinesPlugin,
            jsdoc: jsdocPlugin,
            prettier: prettierPlugin,
            promise: promisePlugin,
        },
    },

    { files: [ '**/*.{ts,tsx,cts,mts,js,cjs,mjs,vue}' ] },

    // ?: config with just ignores is the replacement for `.eslintignore`
    {
        ignores: [

            '**/node_modules/**',
            '**/vendor/**',
            '**/bower_components/**',

            '**/__snapshots__/**',

            '**/*.md',
            '**/*.json',
            '**/*.yaml',

            '**/.github/**',
            '**/build/**',
            '**/.nx/**',
            '**/.yarn/**',
            '**/.agents/**',
            '**/.data/**',

            '**/coverage/**',
            '**/release/**',

            '**/public/**',
            '**/docs/**',
            '**/design/**',
            '**/.nuxt/**',
            '**/.next/**',

            '**/configurations/**',
            '**/dist/**',
            '**/.dist/**',
            '**/.output/**',
            '**/.vscode/**',

            '**/.agents/**',
            '**/.continue/**',
            '**/.augment/**',
            '**/.claude/**',
            '**/skills/**',

            '**/*.min.*',

            '**/sw.js',

            'components.d.ts',
            '**/generated/**',
            '__typed-router.ts',

        ],
    },

    // ?: extends
    eslint.configs.recommended,
    dependPlugin.configs[ 'flat/recommended' ],
    importPlugin.flatConfigs.recommended, // eslint-disable-line import-x/no-named-as-default-member
    jsdocPlugin.configs[ 'flat/recommended' ],
    unicornPlugin.configs.recommended,
    compatPlugin.configs[ 'flat/recommended' ],
    nodePlugin.configs[ 'flat/recommended-script' ],

    // ?: base config
    {
        languageOptions: {
            ecmaVersion: 'latest',
            globals: {
                ... globals.browser,
                ... globals.es2022,
                ... globals.node,
                ... vueAndNuxtGlobals, // FIXME: Da rivedere per i progetti non con Nuxt, però al momento non ho tempo per filtrare per i progetti nel monorepo
            },
            parserOptions: {
                ecmaVersion: 'latest',
                parser: babelParser,
                sourceType: 'module',
            },
            sourceType: 'module',
        },
        linterOptions: { reportUnusedDisableDirectives: 'warn' },
        rules: { ... sharedRules },
        settings: {
            'import-x/parsers': { '@typescript-eslint/parser': [ '.ts', '.tsx' ] },
            polyfills: [
                'Promise',
                'fetch',
                'Array.from',
            ],
        },
    },

    {
        files: [ '**/*.cjs' ],
        languageOptions: { sourceType: 'commonjs' },
    },

    // ?: Override the recommended config
    {
        // ?: Test files
        extends: [
            ... tsEslint.configs.strict, // 'plugin:@typescript-eslint/recommended'
            ... tsEslint.configs.stylistic, // 'plugin:@typescript-eslint/recommended'
            jestPlugin.configs[ 'flat/style' ], // 'plugin:jest/style'
            jestPlugin.configs[ 'flat/recommended' ], // 'plugin:jest/recommended'
            importPlugin.flatConfigs.typescript, // eslint-disable-line import-x/no-named-as-default-member
            vitestPlugin.configs.recommended.rules, // 'plugin:vitest/recommended',
            playwrightPlugin.configs[ 'flat/recommended' ], // 'plugin:playwright/recommended',
        ],
        files: [ './tests/**/*.{test,spec}.{j,t}s?(x)' ],
        languageOptions: {
            globals: { ... jestPlugin.environments.globals.globals },
            parser: tsEslint.parser,
        },
        plugins: {
            '@typescript-eslint': tsEslint.plugin,
            jestPlugin,
            playwrightPlugin,
            vitestPlugin,
        },
        rules: {
            'playwright/no-skipped-test': 'off',
            'vitest/valid-describe-callback': 'warn',
        },
    },
    {
        // ?: Vue and TS files
        extends: [
            importPlugin.flatConfigs.typescript, // eslint-disable-line import-x/no-named-as-default-member
            ... vuePlugin.configs[ 'flat/strongly-recommended' ], // 'plugin:vue/vue3-strongly-recommended'
            ... tsEslint.configs.strict, // 'plugin:@typescript-eslint/recommended'
            ... tsEslint.configs.stylistic, // 'plugin:@typescript-eslint/stylistic',
        ],
        files: [ '**/*.vue', '**/*.ts' ],
        languageOptions: {
            globals: { ... vueAndNuxtGlobals },
            parser: vueParser,
            parserOptions: {
                ecmaVersion: 'latest',
                extraFileExtensions: [ '.vue' ],
                parser: tsEslint.parser,
                sourceType: 'module',
            },
        },
        plugins: { '@typescript-eslint': tsEslint.plugin },
        rules: {
            ... sharedRules,
            ... typescriptRules,
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            indent: 'off',
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-param-type': 'off',
            'max-statements-per-line': 'off',
            'no-await-in-loop': 'off',
            'sort-keys': 'off',
            'unicorn/no-await-expression-member': 'off',
            ... vueAndNuxtRules,
        },
    },
    {
        // ?: TS files
        extends: [
            importPlugin.flatConfigs.typescript, // eslint-disable-line import-x/no-named-as-default-member
            ... tsEslint.configs.strict, // 'plugin:@typescript-eslint/recommended'
            ... tsEslint.configs.stylistic, // 'plugin:@typescript-eslint/stylistic',
        ],
        files: [ '**/*.ts' ],
        languageOptions: {
            globals: { ... vueAndNuxtGlobals },
            parser: tsEslint.parser,
        },
        plugins: { '@typescript-eslint': tsEslint.plugin },
        rules: {
            ... sharedRules,
            ... typescriptRules,
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-param-type': 'off',
            'max-statements-per-line': 'off',
            'no-await-in-loop': 'off',
            'sort-keys': 'off',
            'unicorn/no-await-expression-member': 'off',
        },
    }

);

export default withNuxt( myConfig );
