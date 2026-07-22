# Lessons

- For non-essential privacy UI, confirm the intended audience, regulatory posture, and acceptable UX interruption before choosing the strictest implementation. Present the trade-off between opt-in consent and clear disclosure before making the choice part of the product.
- When acknowledging a content revision, preserve historical timestamps that have no separate audit field. Use `updatedAt` for the acknowledgement time and change only the revision/status fields required by the explicit transition; never repurpose or overwrite the sole original completion timestamp.
- For content-ID-driven UI, never use a non-null assertion on authored IDs. Validate every branch against the real content set, render human-readable localized labels instead of bare IDs, and test every selectable branch.
- Exact-target navigation must define how focus is transferred after the source view unmounts and how the user exits the target mode. Provide an announced focused destination plus an explicit path back to normal browsing, and cover both in end-to-end tests.
- Treat persisted content IDs as compatibility contracts. When splitting or reorganizing content, keep the closest semantic successor on the existing ID with a new revision, and let newly split sections start untouched; never duplicate one historical completion across multiple new records.
