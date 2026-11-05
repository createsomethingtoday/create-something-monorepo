# Property-specific privacy content

`PrivacyPolicyContent` uses the existing `property` prop to render disclosures for
the owning website. Agency supports a separate, default-off Meta marketing
choice. Its disclosure explains campaign events, hashed-email matching for saved
inquiries, consent records, withdrawal, and browser privacy signals.

The other properties retain their existing no-Meta promise. Rendering Agency
content does not enable tracking: the owning Agency consent and delivery routes
enforce the choice. No new component prop or tracking behavior is added to Canon.

Verify the rendered disclosure and the non-Agency boundary with:

```bash
pnpm --filter @create-something/canon exec vitest run src/lib/components/privacy-policy-content.test.ts
```

This test renders the component. The Agency privacy controls and actual provider
delivery require separate browser and runtime verification.
