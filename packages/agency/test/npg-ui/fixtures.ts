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
        provider: 'Apify one-api/skip-trace',
        scope:
          'One selected registry NPI; broker personal contact candidates and home city/state. Practice geography is not residence.',
        limits:
          'One pinned run, ten-cent cap, shared daily reservations. Repeated identical input reconciles the same run. Account ownership and empty-sentinel anonymous access are checked before dispatch; these checks cannot exclude explicit grants or Actor-creator sharing. Account restriction and sharing setup require operator review.',
        cost: 'Up to $0.10 reserved. Contacts, ownership and consent remain unverified; never recruiter-ready.'
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
        maximumCost: 0.15,
        totalAllowance: 100,
        recordedSpend: 10,
        remaining: 90,
        scope: 'One candidate only; no outreach. No automatic reset or top-up.',
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
            data: { error: 'Fixture interruption. Refresh the history before trying again.' }
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
