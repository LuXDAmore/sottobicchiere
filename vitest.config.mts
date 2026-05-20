import { defineVitestProject } from '@nuxt/test-utils/config';
import { defineConfig } from 'vitest/config';

// ?: N.B.: Da tenere altrimenti non vengono lette le env e dopo i test non vanno
import { config } from 'dotenv';

config();

// ?: N.B.: Rimuove rumore warning in console
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

// Configurazione di Vitest per il progetto, con specifiche per i test unitari, end-to-end e Nuxt
export default defineConfig(
    {
        test: {
            coverage: {
                exclude: [
                    'node_modules/**',
                    '.nuxt/**',
                    '.output/**',
                    'public/**',
                    'docs/**',
                    '**/*.d.ts',
                    '**/*.config.*',
                    '**/types/**',
                ],
                include: [
                    'shared/utils/**/*.{ts}',
                    'server/utils/{backoffice-users,deposit-stripe-release,dm25,ws-auction}.ts',
                    'server/utils/sources/astalegale-date.ts',
                ],
                provider: 'v8',
                reporter: [
                    'text',
                    'lcov',
                    'json',
                ],
                thresholds: {
                    branches: 60,
                    functions: 60,
                    lines: 60,
                    statements: 60,
                },
            },
            projects: [
                {
                    test: {
                        environment: 'node',
                        include: [ 'test/unit/*.{test,spec}.ts' ],
                        name: 'unit',
                    },
                },
                {
                    test: {
                        environment: 'node',
                        hookTimeout: 300_000,
                        include: [ 'test/e2e/*.{test,spec}.ts', 'test/e2e/*.vitest.{test,spec}.ts' ],
                        name: 'e2e',
                    },
                },
                await defineVitestProject(
                    {
                        test: {
                            environment: 'nuxt',
                            hookTimeout: 300_000,
                            include: [ 'test/nuxt/*.{test,spec}.ts' ],
                            name: 'nuxt',
                        },
                    }
                ),
            ],
        },
    }
);
