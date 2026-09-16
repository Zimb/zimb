# Security Policy — Zimb.app

## Reporting a vulnerability

If you discover a security vulnerability in Zimb, **please do NOT open a public issue.**

Instead, email **security@zimb.app** with:

- A clear description of the vulnerability
- Steps to reproduce
- Potential impact (data exposure, privilege escalation, fund loss, etc.)

We will acknowledge receipt within **48 hours** and provide a remediation timeline within **5 business days**.

## Scope

The following are in scope for security reports:

| Component | Domain |
|---|---|
| Worker API | api.zimb.app |
| Senior Kanban | app.zimb.app |
| VS Code Extension | marketplace.visualstudio.com (publisher: zimb) |
| GitHub App | `@zimb-bot` |
| Landing | zimb.app |

## Severity classification

| Severity | Examples | Response SLA |
|---|---|---|
| **Critical** | Funds loss/double-charge, auth bypass, repo access leak | Patch within 24 h |
| **High** | Privilege escalation, secret leak, RCE | Patch within 7 days |
| **Medium** | XSS stored, CSRF on sensitive action | Patch within 30 days |
| **Low** | Information disclosure (non-sensitive), minor CSRF | Patch within 90 days |

## Out-of-scope

- Denial of service attacks
- Social engineering against Zimb staff
- Physical attacks on infrastructure
- Findings requiring physical access to a user's device

## Recognition

We credit security researchers in our [HALL_OF_FAME.md](HALL_OF_FAME.md) (to be created) once the issue is patched and the researcher has consented.
