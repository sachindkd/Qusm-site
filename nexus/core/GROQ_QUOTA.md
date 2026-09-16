# NEXUS Groq quota

NEXUS uses the configured Groq model and key. Groq organization-level TPD limits cannot be increased by application code.

The runtime should treat a 429/Tokens-per-day response as a temporary provider-quota condition, avoid repeated retries, and return a short user-facing message rather than exposing the raw provider error.

Prompt and output budgets should remain conservative so normal requests do not consume the daily allowance unnecessarily.
