# Reviewed creator and company-support launch

CRE-2030. This supersedes the earlier open creator signup and hosting-only scope. Implementation and provider acceptance are separate: the paid switches remain off until the acceptance matrix below is proven.

## Product policy

- A verified Identity account may learn and acquire assets without creator approval.
- Creators submit professional credentials and an HTTPS teaching-video link. Links may be unlisted; Private restricts the application record, not the video's third-party hosting permissions. Reviewers evaluate technical accuracy, explanation, evaluation, and access boundaries. They record feedback and approve, reject for revision, or suspend. Decision revisions prevent stale overwrites; review history is durable.
- Every creator is reviewed, including invited creators. This is the conservative implementation pending an explicit invitation exception. Approved creators may issue up to ten outstanding, email-bound, 30-day invitations. Only hashes of invitation tokens are stored in D1. A host-only cookie carries an invitation through Identity; it does not confer access.
- An approved invited creator may start one calendar month of hosting on one draft network. The entitlement is atomic and cannot be moved or extended by retry. It never applies to company support. No automatic charge follows the month; the creator explicitly subscribes afterward.
- Creator hosting retains the researched USD24.50/month plan. Independent creator asset prices remain creator-owned. The existing zero-platform-commission proposal is still gated by PCN_ASSET_FEE_POLICY=hosting_only_v1 and operator confirmation. The support split must never be copied to creator assets.
- Company support is CREATE SOMETHING's USD900/month subscription for one agreed workflow. A separately approved partner accepts the requested scope before checkout. Custom builds, provider usage, operations and incident response are separately scoped.
- Company workspaces are permanently members-only and cannot become creator storefronts. Company updates are restricted to the company owner and its currently approved partner. Subscription and partner state are rechecked server-side.

## Payment boundaries

Creator assets retain direct charges, full Stripe Dashboard, Stripe-collected processing fees and Stripe-owned negative-balance liability. Company support uses a distinct Accounts v2 recipient account with Express Dashboard and application-owned fee/loss responsibility. Do not reuse the creator merchant account for this purpose.

Support Checkout uses the server-owned USD900 recurring Price and `subscription_data.transfer_data.amount_percent=95`, on the platform account. No creator trial, user-provided price, user-provided destination, application fee, discount or alternate split is accepted. Validate account identity, application metadata, mode, Dashboard/responsibility tuple and recipient transfer capability before checkout. The proposed interpretation is USD855 partner / USD45 CREATE SOMETHING before processing fees; final fee/tax/refund treatment must be confirmed before enabling live checkout. Stripe Tax requires verified registrations; a flag alone does not establish tax compliance.

Subscription access reconciles current provider subscriptions, exact price/customer/owner/destination, current invoice payments and charge refund/dispute state. Webhook event payloads trigger authoritative readback rather than directly granting access. Duplicate and out-of-order events are safe. Subscribe the billing endpoint to subscription, checkout, invoice, charge.refunded, charge.dispute.* and refund.* events. Unsupported payment forms and ambiguous histories fail closed for manual reconciliation.

For support refunds, the CREATE SOMETHING operator owns refund and dispute operations in Stripe. Reverse the destination transfer when refunding, reconcile the subscription/access, and preserve the refund/reversal receipt. A refund does not itself cancel future subscription invoices. Partner suspension immediately removes access/new purchases; the operator must also cancel or reassign affected recurring subscriptions in Stripe. Do not represent an access suspension as billing cancellation. Company users can manage/cancel their own subscription through the portal. Confirm these operational procedures and actual test-mode reversals before paid activation.

## Impact and evidence

- `/field-engineering` explains the portfolio journey; `/n/:slug/field-notes` stores structured creator-reported context, implementation, evaluation, results and evidence links. Members-only is the default; public evidence requires an active approved network, public previews and explicit publication consent. No platform certification is implied.
- `/impact` is reviewer-only. Browser-reported page/action aggregates contain only an allowlisted surface, event and UTC day; no visitor identifier, email, credential, token, query string or client content. Respect DNT/GPC and retain aggregates for 90 days.
- `/n/:slug/impact` is owner-only and scopes every query to that network. Report orders, membership, playback grants and package-delivery grants separately. A response stream grant is not a completed download, install, reproduction or customer outcome.
- Applications, trials and orders are reported from server records rather than accepting browser claims as trusted conversions.

## Migration / release

Production currently starts at migration0001. Apply0002–0011 in order after exporting a D1 backup and verifying the original default-network row counts. Preview currently starts at0007. Once non-default networks exist, do not roll back to the old single-network Worker: its membership queries are not tenant-scoped. Retain the new schema and use a compatible forward fix or maintenance release; the export is a recovery artifact, not permission to overwrite newly created data. New migrations0008–0011 create admission, impact, support and field-note records;0010 adds network kind. Do not edit these migrations after remote application; use a new migration for later changes.

Identity enrollment changes require migration0016, the verified sender, return-path allowlist, and actual email/signup/recovery acceptance. Keep PUBLIC_ENROLLMENT_ENABLED=false until verified. Existing verified Identity accounts may use applications. No alternate provider or authentication bypass is permitted.

Keep PCN_SELF_SERVICE_ENABLED, PCN_CONNECT_ENABLED, PCN_ASSET_COMMERCE_ENABLED, PCN_SUPPORT_ENABLED and PCN_SUPPORT_CONNECT_ENABLED false until the respective provider and browser acceptance gates pass. A gated deployment is not a complete self-service launch.

## Remaining live acceptance

1. Browser control returned by the operator; desktop/mobile/keyboard, admission, reviewer, invitations, buyer/seller and support workflows exercised with actual identities.
2. Stripe test-mode access: creator and partner onboarding, paid/free asset, current release delivery, renewals, failed payment, cancellation, refund with support transfer reversal, dispute, retries and exact split readback. Configure isolated test/live prices, portals, signing secrets and publishable keys; retain no live test charges.
3. Stream Read/Edit and Account Analytics permissions: private upload, processing, publication, signed playback, original denial, membership revocation and usage checks.
4. Confirm launch fee interpretation, creator trial policy, and tax configuration. Validate current partner approvals and signed support scope.
5. Merge immutable source after CI, migrate with backup, deploy and read back provider versions and public/protected endpoints. Record remaining browser/provider gaps honestly in Linear.

## References

Kiro's official marketing ties product claims to specs, tasks, tool integrations and working UI: https://kiro.dev/. Private adapts that coherence through permissions, evaluations, packages and field evidence; it does not copy Kiro assets or trade dress.

Stripe: https://docs.stripe.com/api/checkout/sessions/create ; https://docs.stripe.com/connect/marketplace/tasks/create ; https://docs.stripe.com/connect/destination-charges ; https://docs.stripe.com/api/invoice-payment/list . The installed Stripe CLI lacks the documented newer docs/whoami commands and the Stripe connector requires reauthentication, so official web documentation and installed SDK types were used as fallback.

## Invitation-based enrollment (CRE-2030)
Identity's PCN_ENROLLMENT_ENABLED mode reads the production PCN database through PCN_DB. Signup eligibility requires an active member invitation on an active network, or an unredeemed, unexpired creator invitation from a currently approved sponsor. Both request and completion recheck eligibility. Public enrollment remains false; exact-email operator allowlists remain an independent controlled override. The reader issues SELECT queries only and never approves creators, redeems invitations, grants membership, or starts a trial. A verified existing nondeleted Identity account can recover in this mode even after losing PCN access. Mailbox proof, rate limits, fixed return origin and single-use challenges remain mandatory.
Disable PCN_ENROLLMENT_ENABLED to stop this route, including outstanding signup completions. Removing the PCN_DB binding also closes it. Previously created identities remain, and application authorization still decides access. Preview invitations never make a mailbox eligible through the production binding. Do not approve mock credentials in production to exercise this flow.
Audience context: Map PCN business and engineer leads (task01a0c0d4-a517-7cf3-b957-d7c1b27c90ff) separates business learners from practical engineers teaching techniques; its narrower company segment is undecided. Invitation signup does not imply a paid plan or creator approval.
