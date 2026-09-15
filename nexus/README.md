# NEXUS

NEXUS is a standalone Discord AI platform hosted through the Qusm infrastructure without modifying the existing FBMR application code.

## Boundary

- NEXUS lives under its own `nexus/` namespace.
- Existing FBMR/Qusm application routes and files are not changed by this bootstrap.
- NEXUS uses NEXUS-specific environment variables only.
- Discord credentials and model API keys must be supplied through deployment secrets, never committed to Git.

## Architecture

`NEXUS AI -> sandbox/tool runtime -> Discord API`

The runtime is designed around server-isolated context, memory, tool execution, verification, and extensible capabilities.
