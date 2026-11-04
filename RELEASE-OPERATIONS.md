# Release safeguards and operational review

Reviewed November 4, 2026 for `doaner69/MyProspects`, Vercel project `myprospects`, and production `https://www.myprospects.com`. Product/pricing HTML, tracking behavior, dependencies and the database schema are outside this change.

## Enforced release policy

GitHub `main` now requires a pull request and the `Test and generated-file checks` status from the GitHub Actions app (ID 15368). The branch must be current before merging. The policy applies to administrators; force pushes and branch deletion are disabled. Required human approval count is zero, so a solo maintainer can merge after checks pass without needing a cofounder review. The applied configuration is recorded in `ops/main-branch-protection.json`; inspect existing settings before reapplying it so later protections are preserved.

Vercel Build and Deployment → Deployment Checks now requires the same GitHub job for **Production**. The dashboard confirmed the saved check and stated that it takes effect on the next production deployment. The live application was not redeployed to test a deliberately failing release. Do not rename the CI job without updating both gates. Keep the post-release verification workflow separate from this pre-release gate to avoid a circular dependency.

The settings changes are already active independently of the draft PR. Application logging and workflow code take effect only after an authorized merge/release.

## Production verification and response

After a successful Vercel production deployment, the verification workflow selects the active production revision from GitHub deployment records, validates its provenance and ancestry on `main`, checks out that revision, and runs the existing GET-only deployment checker against the canonical production domain. Preview/failed/untrusted or stale events are skipped. Concurrency groups are keyed by the selected SHA: duplicate checks of one revision may replace each other, while an older revision cannot cancel verification of a newer one. Manual dispatch selects the current production deployment without accepting arbitrary URLs or refs.

A failed check produces a failed GitHub Actions run and a run summary. GitHub notification delivery depends on each maintainer's existing Actions/watch preferences; this change does not add Slack/email destinations. The workflow does not publish, promote, roll back, submit leads, or use production credentials. It must be merged before GitHub can deliver automatic production events to it; offline event-selection tests and PR CI do not establish that the first real production event has run successfully.

For a failure:

1. Confirm the run's selected deployment SHA and Vercel production alias. If a newer deployment completed during checking, rerun verification for the current deployment rather than comparing stale assets.
2. Read failed paths in the run output. For HTTP failures, check deployment state/aliases and endpoint runtime logs. For asset/metadata mismatches, compare with the exact selected revision.
3. Fix through a PR and the required checks. Do not use an administrative bypass to publish failing code.
4. If a rollback is necessary, obtain explicit release authorization and select a previously healthy production deployment in Vercel. Verify compatibility with any schema/config changes made since that release; this change includes no schema migration. Promote the intended healthy deployment using Vercel's supported rollback/promotion controls, then run verification and inspect runtime errors.

The checker expects `check:deployment` in the selected revision (available from the PR #3 release onward). For older revisions, perform manual checks using an appropriate verified checkout. Neither a successful HTTP scan nor clean runtime logs establishes successful real lead persistence, analytics ingestion, field performance, or indexing.

## Safe lead diagnostics

Each handler creates a fresh server UUID, returns it in `X-Request-Id`, and correlates `lead.request`, `lead.persistence` and `lead.notification` JSON events. Records use fixed route/outcome/reason labels, HTTP status where applicable, and monotonic elapsed milliseconds. Notification outcomes explicitly distinguish `sent`, `skipped` (`missing_webhook`) and `failed` (`delivery_failed`). Persistence failure is reported once, and Slack remains best-effort after the lead is saved.

Operational events omit submitted names, emails, messages/notes, websites, companies, user agents, request headers, database results, raw Error messages/stacks and credential URLs. Existing Slack lead notifications intentionally retain their existing business fields; those messages are separate from diagnostics. A failed logging sink cannot turn an already-persisted lead into a failed response. Platform-generated errors that never reach the handler do not receive its request ID or events.

Use the request ID to correlate stages in Vercel logs. Watch for persistence failures, notification skips/failures, elevated rejections and sustained stage durations. No new external log sink, alert destination or data-retention policy is configured by this PR.

## Abuse-protection review — no blocking changes

Verified in code:

- POST-only endpoints, JSON/object validation, required fields and trial enum validation.
- Honeypots reject before database/Slack work. Bots can omit the honeypot, so it is not rate limiting.
- Persisted strings are length-capped and SQL values are parameterized.
- Browser submit buttons are disabled during requests; this is not durable idempotency.
- No application rate limiter, request-origin policy, Content-Type enforcement or explicit raw-body cap. String caps apply after parsing.

Verified in the authenticated Vercel dashboard:

- Firewall active, system mitigations active, zero custom rules, Bot Protection inactive.
- The native WAF configuration endpoint returned 404; that was insufficient to infer protection status. Dashboard inspection resolved the uncertainty. No firewall, bot or rate-limit rules were changed.

An offline handler test demonstrated that valid contact JSON supplied as `text/plain` with an untrusted Origin could reach injected persistence. No real lead was submitted. This indicates a browser-originated spam path; the forms have no authenticated session action, so the issue is anonymous spam/resource use rather than authenticated-account CSRF. CORS response restrictions do not prevent all cross-origin sends. Scripts can also spoof Origin/Content-Type, so header checks alone would not replace rate protection.

Recommended next change: review endpoint-specific successful/rejected traffic privately, then scope a non-blocking observation rule to POST on the two form APIs. Choose thresholds from observed rates and shared-network behavior before blocking. No numerical threshold is justified by this review. Consider JSON media-type enforcement and an application request-envelope limit separately; Vercel's general function payload ceiling is not a tailored form limit. Durable per-submission idempotency remains a later database/API change; do not deduplicate solely by email.

References: [Vercel deployment checks](https://vercel.com/docs/deployment-checks), [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [Vercel system DDoS mitigation](https://vercel.com/docs/vercel-firewall/ddos-mitigation), [WAF rate limits](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [function payload limits](https://vercel.com/docs/functions/limitations).
