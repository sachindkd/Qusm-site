# FBMR Studio

The Studio is the in-site visual content authoring surface. It supports reusable section templates, draft/published states, media fields, CTAs, and responsive presentation metadata. It is intentionally designed to inherit the FBMR visual system instead of creating one-off page styles.

Production hardening note: persistence should be wired to the existing authenticated content API/database before enabling publishing for multiple editors. Drafts in the browser are a safe preview fallback and do not write unbounded data to the database.
