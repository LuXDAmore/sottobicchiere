# Security Policy

## Supported Versions

WeGree is an MVP application in active pre-release development. Security fixes are applied to the current `main` branch and to active deployment branches only. Historical placeholder version ranges are not supported.

| Version / branch | Supported |
| --- | --- |
| Current active branch | Yes |
| Tagged pre-release `0.1.x` builds | Best effort, if still deployed |
| Older branches or archived prototypes | No |

## Reporting a Vulnerability

Report suspected vulnerabilities privately via the repository security channel or directly to the maintainers listed in `package.json`. Do not open public issues with exploit details, secrets, personal data, webhook payloads, or payment identifiers.

When reporting, include:

- affected route, API endpoint, scheduled task, or integration;
- reproduction steps and expected/actual impact;
- whether the issue involves authentication, authorization, payments, documents, forensic logs, external webhooks, or personal data;
- any safe redacted logs needed to reproduce the issue.

Maintainers should acknowledge the report, triage severity, prepare a private fix, and publish only sanitized remediation notes after deployment.
