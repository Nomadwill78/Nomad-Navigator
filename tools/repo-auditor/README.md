# Nomad Compass Autonomous Repository Auditor

A read-only, evidence-first repository assurance agent built on the OpenAI Agents SDK Sandbox Agents architecture.

## What it does

The lead agent inventories the repository and delegates to four specialists:

1. **Security** — auth, authorization, Firestore/database rules, secrets, injection, XSS/CSRF, dependencies.
2. **Architecture** — routes, components, persistence, data flows, state integrity, error handling.
3. **Product/UX** — first-time nonprofit journey, trial/onboarding, membership, core workflows, dead/nonfunctional controls.
4. **Production** — build/deploy configuration, environment variables, CI, Vercel/Firebase readiness, operational risks.

The lead reconciles findings and produces a release recommendation: **BLOCK**, **CONDITIONAL**, or **READY**.

## Safety model

- Repository content is treated as untrusted data.
- The audit is read-only by instruction and exposes only the shell capability to the model.
- GitHub credentials are read from `GITHUB_TOKEN`; they are never placed in the clone URL or prompt.
- Reports must not contain secrets.
- Scanner/tool failures are recorded rather than silently treated as passes.
- Findings must be backed by repository evidence and reproducible verification commands.

## Local setup

```bash
cd tools/repo-auditor
python -m venv .venv
source .venv/bin/activate
pip install -e .
export OPENAI_API_KEY="..."
```

The current OpenAI Agents SDK documentation requires Python 3.10+ and recommends `SandboxAgent` with `SandboxRunConfig` when an agent needs to operate on a real filesystem. The local development example uses `UnixLocalSandboxClient`. See the official documentation before upgrading SDK versions because Sandbox Agents are currently beta.

## Run against the Nomad Navigator checkout

```bash
nomad-audit --repo /path/to/Nomad-Navigator --output audit-report.md
```

## Run against GitHub

Public repository:

```bash
nomad-audit \
  --url https://github.com/owner/repository \
  --branch main \
  --output audit-report.md
```

Private repository:

```bash
export GITHUB_TOKEN="..."
nomad-audit \
  --url https://github.com/owner/private-repository \
  --branch main \
  --output audit-report.md
```

The token is supplied through `GIT_ASKPASS` rather than embedded in the Git command or repository URL.

## Recommended production evolution

The local Unix sandbox is the development starting point. For a production service, move the same agent definition to a provider-managed sandbox or Docker-backed sandbox and add persistent sandbox sessions/snapshots. Keep repository credentials outside model-visible prompts and limit network/credential scope to the clone step.

## Current limitations

- The audit runner does not yet automatically open a GitHub pull request or issue.
- Scanner availability depends on the target repository's ecosystem and the sandbox image.
- The current implementation is intentionally read-only; remediation should be a separate approval-gated workflow.
- Hosted sandbox deployment should be added before exposing this as a public multi-tenant service.
