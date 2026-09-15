# NEXUS

NEXUS is a standalone Discord AI platform hosted through the Qusm infrastructure without modifying the existing FBMR application code.

## Boundary

- NEXUS lives under its own `nexus/` namespace.
- Existing FBMR/Qusm application routes and files are not changed by this bootstrap.
- NEXUS uses NEXUS-specific environment variables only.
- Discord credentials and model API keys must be supplied through deployment secrets, never committed to Git.

## AI-first operating model

NEXUS is objective-driven rather than command-driven:

`Natural-language objective -> AI understands -> dynamic plan -> capability selection -> sandbox execution -> verification -> result`

The user does not need a predefined command for every workflow. The AI chooses from the available technical capabilities according to the objective. The capability catalog is an execution interface, not a hard-coded workflow engine.

## Architecture

`NEXUS AI -> dynamic planner -> guild-scoped sandbox -> tool executors -> Discord/API providers`

Every execution carries a `guildId`. The sandbox rejects cross-guild actions. Future persistence must use the guild as the tenant key so server memory/history/settings stay isolated.

## Current runtime

The web app has AI planning plus a guarded execution endpoint. Discord interactions are signature-verified using the configured public key. Full continuous Discord Gateway monitoring still needs a persistent worker/runtime; Vercel serverless functions alone are not a persistent Gateway process.

## Environment

All secrets are NEXUS-prefixed. Configure them in the separate NEXUS deployment instead of committing them to GitHub. `NEXUS_CONTROL_KEY` protects direct execution calls until the owner dashboard authentication layer is connected.
