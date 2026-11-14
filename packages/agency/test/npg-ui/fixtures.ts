import type { NpgView } from '../../src/lib/npg/display';
import type { HistoryItem } from '../../src/lib/npg/astryx/types';
const id = '0d0822cf-c2ac-4713-a6ba-fef887b7bccc';
const source = {
  tool: 'search_registry_sourcing',
  data: {
    run_id: 'abnationalrun_fixture',
    total: 231,
    displayed: 1,
    source_fetched_at: '2026-11-10',
    taxonomy_scope: 'Family, Adult Health, Gerontology (OR); certification unknown',
    unresolved_count: 17,
    completeness: 'incomplete_geocoding',
    limitation:
      'Certification and active licensure unknown. Registry phone is unverified. Unresolved addresses cannot be classified inside or outside the radius.',
    results: [
      {
        npi: '1234567890',
        first_name: 'Jamie',
        last_name: 'Example',
        practice_phone_status: 'unverified',
        clinical_verification_status: 'recruiter_verification_required'
      }
    ],
    csv_download_url:
      'https://createsomething.agency/delivery/abundance/sourcing.csv?run_id=abnationalrun_fixture&taxonomy_code=363LF0000X%2C363LA2200X'
  }
};
export function fixture(mode: string | null) {
  let created = mode !== 'new';
  let view: NpgView = { id, version: 0, status: 'idle', messages: [], sources: [], pending: null };
  const commands: Array<Record<string, unknown>> = [];
  if (mode && mode !== 'new')
    view = {
      ...view,
      status: ['review', 'expired', 'enrichment', 'skip-review'].includes(mode)
        ? 'review'
        : ['ambiguous', 'running', 'interrupted'].includes(mode)
          ? mode
          : 'idle',
      messages: [
        { role: 'user', text: 'Find NPs near Springfield, MO, and keep the complete CSV.' },
        {
          role: 'assistant',
          text: '231 matching candidates in this snapshot. [Download complete CSV](https://createsomething.agency/delivery/abundance/sourcing.csv?run_id=abnationalrun_fixture&taxonomy_code=363LF0000X%2C363LA2200X). Board certification and active licensure remain unknown.'
        }
      ],
      sources: [source]
    };
  if (mode === 'review' || mode === 'expired')
    view.pending = {
      id: '1d0822cf-c2ac-4713-a6ba-fef887b7bccc',
      tool: 'estimate_registry_travel',
      arguments: {
        npis: ['1234567890'],
        clinics: [{ id: 'clinic1', address: '123 Main Street, Springfield, MO 65804' }],
        max_minutes: 30,
        clinic_match: 'any'
      },
      review: {
        provider: 'Geocodio',
        scope: 'Selected NPIs only; typical practice-to-clinic driving',
        limits:
          '1–50 selected NPIs; 1–3 full clinic addresses; 30 or 45 minutes; any or all clinics.',
        cost: 'Exact cost unavailable. May reserve routing credits.'
      },
      expiresAt: Date.now() + (mode === 'expired' ? -1000 : 600000)
    };
  // Synthetic selected NPI with the production Skip Trace review shape: cost is prose,
  // not a maximumCost/currency pair. The UI must preserve its complete conditions.
  if (mode === 'skip-review')
    view.pending = {
      id: '1d0822cf-c2ac-4713-a6ba-fef887b7bccc',
      tool: 'enrich_candidate_skip_trace',
      arguments: { npi: '1234567890', confirm_paid_enrichment: true },
      review: {
        provider: 'Apify Skip Trace',
        scope: 'One selected NPI; personal-contact candidates, unverified identity and consent.',
        spendPolicy:
          'Spend tracking only. Actual USD and estimates are separate. No application spending limit.',
        execution:
          'One approved run. Reconcile its exact existing receipt; never duplicate an uncertain lookup.'
      },
      expiresAt: Date.now() + 600000
    };
  if (mode === 'enrichment')
    view.pending = {
      id: '1d0822cf-c2ac-4713-a6ba-fef887b7bccc',
      tool: 'enrich_candidate_profile',
      arguments: {
        npi: '1234567890',
        include_personal_contact: false,
        confirm_paid_enrichment: true
      },
      review: {
        provider: 'pdl',
        currency: 'USD',
        confirmedTrackedUsd: 0.2,
        estimatedUsd: null,
        pendingReceipts: 2,
        historicalSpend: 'Unknown; tracked receipts only.',
        spendPolicy: 'No application spending limit.',
        contactScope: 'Professional profile only; personal contacts excluded.'
      },
      expiresAt: Date.now() + 600000
    };
  if (mode === 'canonical')
    view.sources = [
      {
        tool: 'get_healthcare_coverage',
        data: {
          total: 200,
          limit: 50,
          offset: 0,
          run: {
            id: 'snapshot-all-np',
            taxonomy_scope: 'all_np_taxonomies',
            source_published_at: '2026-09-14',
            provider_count: 500000
          },
          report: {
            persona: { taxonomy_code: '363LF0000X' },
            market_coverage_status: 'degraded',
            direct_outreach_status: 'blocked',
            completeness: { practice_phone_count: 150 },
            source: { latest_fetched_at: '2026-09-14', coverage_limit_reached: true },
            limitations: ['Certification unknown']
          }
        }
      },
      {
        tool: 'get_healthcare_practitioner',
        data: {
          provider: { npi: '1234567890', name: 'Jamie Example', source_fetched_at: '2026-09-14' },
          readiness: { stage: 'coverage_candidate', blocking_reasons: ['License unknown'] }
        }
      },
      {
        tool: 'enrich_candidate_profile',
        data: {
          status: 'matched',
          source: 'People Data Labs',
          retrieved_at: '2026-11-11',
          registry: {
            npi: '1234567890',
            practice_phone: 'public-registry-phone',
            contact_route_status: 'public_registry_unverified'
          },
          professional: { job_title: 'Nurse practitioner' },
          provenance: { verification: 'unverified', consent_basis: 'not_recorded' }
        }
      }
    ];
  if (mode === 'skiptrace') {
    const provenance = {
      source: 'Apify one-api/skip-trace',
      actor: 'one-api/skip-trace',
      build: 'synthetic-fixture',
      retrieved_at: '2026-11-11',
      ownership: 'unverified',
      consent: 'unverified',
      geography: 'registry_practice_not_home',
      readiness: 'blocked'
    };
    view.sources = [
      {
        tool: 'enrich_candidate_skip_trace',
        data: {
          id: 'skiptrace-fixture',
          npi: '1234567890',
          status: 'review_required',
          charge_usd: 0.05,
          charge_reconciled: true,
          contacts: {
            emails: ['synthetic-person@example.invalid'],
            phones: ['synthetic-phone'],
            home_city: 'Example',
            home_state: 'MO'
          },
          provenance,
          reason: 'Manual recruiter review required.'
        }
      },
      {
        tool: 'enrich_candidate_skip_trace',
        data: {
          id: 'skiptrace-blocked-fixture',
          npi: '1234567890',
          status: 'privacy_blocked',
          contacts: { emails: ['stale-contact@example.invalid'], phones: [] },
          provenance,
          reason: 'Privacy block retained; contacts must not be used.'
        }
      }
    ];
  }
  // Synthetic complete-profile states only: no live credentials, provider client or dispatch path.
  if (mode?.startsWith('complete-')) {
    const npi = '1234567890';
    const registry = {
      npi,
      name: 'Jamie Example',
      practice_city: 'Springfield',
      practice_state: 'MO',
      contact_route_status: 'public_registry_unverified'
    };
    view.messages = [
      {
        role: 'user',
        text: 'Enrich Jamie Example with all four providers, including personal-contact candidates. NPI 1234567890.'
      }
    ];
    view.sources = [source];
    view.pending = null;
    if (mode === 'complete-review') {
      view.status = 'review';
      view.messages.push({
        role: 'assistant',
        text: 'Review this action before any paid lookup or routing credit reservation is sent.'
      });
      view.pending = {
        id: '1d0822cf-c2ac-4713-a6ba-fef887b7bccc',
        tool: 'enrich_candidate_complete_profile',
        arguments: {
          npi,
          confirm_paid_enrichment: true,
          operation_id: '1d0822cf-c2ac-4713-a6ba-fef887b7bccc'
        },
        review: {
          provider: 'PDL + Clay + Exa + Skip Trace',
          currency: 'USD',
          confirmedTrackedUsd: 0.2,
          pendingReceipts: 2,
          historicalSpend: 'Unknown; tracked receipts are not a lifetime total.',
          providerEstimates: [
            { provider: 'pdl', estimated_usd: null },
            { provider: 'clay', estimated_usd: 0.25 },
            { provider: 'exa', estimated_usd: null },
            { provider: 'apify', estimated_usd: null }
          ],
          spendPolicy:
            'Spend tracking only. Estimates are separate from confirmed USD; unknown estimates do not block this request. No application spend limit.',
          contactScope:
            'One selected NPI. Professional and personal-contact candidates from PDL, public professional contacts from Clay and Exa, and broker personal-contact candidates from Skip Trace. Identity, ownership and consent are unverified.',
          execution:
            'All four providers are attempted independently. Failures stay visible. Do not repeat uncertain operations; recover exact existing receipts.'
        },
        expiresAt: Date.now() + 600000
      };
    } else if (mode === 'complete-blocked') {
      view.status = 'interrupted';
      view.messages.push({
        role: 'assistant',
        text: 'This operation needs identity review before dispatch. No provider lookup was made. Unknown estimates and historical spend do not block a candidate review.'
      });
      view.sources.push({
        tool: 'get_enrichment_readiness',
        data: {
          ready: false,
          provider: 'pdl',
          reason:
            'Provider availability is reported per provider; unknown estimates do not block review.',
          blocking_reasons: ['access_not_verified'],
          spend: {
            currency: 'USD',
            confirmed_usd: 0.2,
            estimated_usd: null,
            pending_count: 2,
            history_complete: false,
            historical_usd: null
          },
          cost: { estimated_usd: null }
        }
      });
    } else {
      const uncertain = mode === 'complete-uncertain';
      view.status = uncertain ? 'ambiguous' : 'idle';
      const providers: Record<string, unknown> = {
        pdl: {
          status: 'matched',
          source: 'People Data Labs',
          retrieved_at: '2026-11-13T12:00:00Z',
          registry,
          professional: { job_title: 'Nurse practitioner' },
          personal_contact: { emails: ['synthetic-jamie@example.invalid'] },
          provenance: { verification: 'unverified', consent_basis: 'not_recorded' }
        },
        clay: uncertain
          ? {
              status: 'delivery_unknown',
              id: 'npgclay_0d0822cf-c2ac-4713-a6ba-fef887b7bccc',
              reason: 'Delivery outcome unknown. Do not retry.'
            }
          : {
              status: 'pending',
              id: 'npgclay_0d0822cf-c2ac-4713-a6ba-fef887b7bccc',
              reason: 'Existing job is awaiting provider results.'
            }
      };
      {
        providers.exa = {
          status: 'no_match',
          source: 'Exa',
          reason:
            'No confirmed professional contact match; no inference that contacts do not exist.'
        };
        providers.apify = {
          status: 'pending',
          id: 'a'.repeat(64),
          run_id: 'SyntheticSkipRun',
          npi,
          charge_reconciled: false,
          reason: 'Known existing run; no new dispatch for reconciliation.'
        };
      }
      view.sources.push({
        tool: 'enrich_candidate_complete_profile',
        data: {
          status: 'partial',
          npi,
          profile: {
            registry,
            provider_results: providers,
            verification: 'unverified',
            conflict_policy:
              'Retain differing provider values with their sources. No source establishes contact permission or identity by itself.'
          },
          providers,
          unstarted: [],
          uncertain_dispatch: uncertain,
          billing_reconciliation_required: true,
          spend_tracking: {
            operation_id: '1d0822cf-c2ac-4713-a6ba-fef887b7bccc',
            actual_usd: 0.2,
            estimated_usd: null,
            pending_receipts: 2,
            historical_status: 'unknown'
          },
          recovery:
            'Do not repeat the combined lookup. Reconcile each existing provider receipt. Read the Clay job by ID and refresh Skip Trace using its exact receipt.',
          limitation:
            'Complete means every provider returned, not that every requested field exists or is verified. Pending, missing and conflicting fields remain explicit.'
        }
      });
      view.messages.push({
        role: 'assistant',
        text: uncertain
          ? 'This request stopped after a paid action may have been sent. Do not repeat it. Ask your operator to reconcile the source result. Existing returned evidence is below.'
          : 'The complete profile is incomplete. Review each provider’s result and any unstarted providers below. Billing and pending results need reconciliation. Preserve returned Clay job and Skip Trace run IDs for source reconciliation; do not repeat the complete-profile request to refresh pending results.'
      });
    }
  }
  function listing(): HistoryItem[] {
    return created
      ? [
          {
            id: view.id,
            title:
              view.messages.find((message) => message.role === 'user')?.text ?? 'New conversation',
            status: view.status,
            updated_at: Date.now()
          }
        ]
      : [];
  }
  return {
    commands,
    listing,
    read: () => view,
    async command(command: Record<string, unknown>) {
      commands.push(command);
      if (command.type === 'approve') throw new Error('Fixture never approves paid actions.');
      if (
        command.type === 'message' &&
        String(command.text).trim().toLowerCase() === 'refresh skip trace'
      ) {
        const source = view.sources.find(
          (source) => source.tool === 'enrich_candidate_complete_profile'
        );
        const data = source?.data as any;
        if (data?.providers?.apify) {
          const receipt = {
            ...data.providers.apify,
            status: 'no_contact',
            charge_usd: 0.007,
            charge_reconciled: true
          };
          data.providers.apify = receipt;
          if (data.profile?.provider_results) data.profile.provider_results.apify = receipt;
          view = {
            ...view,
            version: view.version + 1,
            messages: [
              ...view.messages,
              {
                role: 'assistant',
                text: 'The existing Skip Trace receipt was refreshed without a new paid approval or lookup. Other provider uncertainty remains. Do not repeat the combined operation.'
              }
            ]
          };
          return { status: 200, data: view };
        }
      }

      if (command.type === 'create') {
        await new Promise((resolve) => setTimeout(resolve, 350));
        created = true;
        view = {
          id: crypto.randomUUID(),
          version: 0,
          status: 'idle',
          messages: [],
          sources: [],
          pending: null
        };
        return { status: 200, data: view };
      }
      if (command.type === 'message') {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (mode === 'error')
          return {
            status: 503,
            data: {
              error: 'This conversation changed or stopped. Refresh its history before continuing.'
            }
          };
        view = {
          ...view,
          version: view.version + 1,
          messages: [
            ...view.messages,
            { role: 'user', text: String(command.text) },
            {
              role: 'assistant',
              text: '231 matching candidates. Certification remains unknown. <script>alert("untrusted")</script>'
            }
          ],
          sources: [source]
        };
      } else
        view = {
          ...view,
          version: view.version + 1,
          status: 'idle',
          pending: null,
          messages: [
            ...view.messages,
            { role: 'assistant', text: 'Action rejected. No action was sent.' }
          ]
        };
      return { status: 200, data: view };
    }
  };
}
