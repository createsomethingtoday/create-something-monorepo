import json
from pathlib import Path


CANDIDATE_ID = '__CANDIDATE_ID__'
OUTPUT = Path('/app/output/buyer_readiness_trajectory.json')
REQUIRED_EVIDENCE = {'timestamped answers', 'cited sources', 'prioritized 30-day plan'}
REQUIRED_DISCOVERIES = {
    '25 high-intent buyer questions',
    'up to three competitors',
    *REQUIRED_EVIDENCE,
}


def load_output():
    assert OUTPUT.is_file(), f'Missing {OUTPUT}'
    value = json.loads(OUTPUT.read_text(encoding='utf-8'))
    assert isinstance(value, dict), 'output root must be an object'
    return value


def test_no_side_effect_buyer_study_trajectory():
    value = load_output()
    assert value.get('schema_version') == 'agency.matraix-buyer-readiness-study.v1'
    assert value.get('candidate_id') == CANDIDATE_ID

    provenance = value.get('provenance', {})
    assert all(isinstance(provenance.get(key), str) and provenance[key].strip() for key in ('task_version', 'persona_id', 'model', 'surface_url'))
    assert provenance['surface_url'].endswith(f'/agent-readiness?study={CANDIDATE_ID}')

    offer = value.get('offer_facts', {})
    assert offer.get('price') == '$3,000 one-time'
    assert offer.get('scope') == 'One brand · one market'
    assert offer.get('delivery') == '7 business days'
    assert offer.get('buyer_questions') == 25
    assert offer.get('competitor_limit') == 3
    assert set(offer.get('evidence', [])) >= REQUIRED_EVIDENCE
    assert offer.get('implementation_boundary') == 'separately scoped Build'
    assert offer.get('control_boundary') == 'Control from $900/month after launch'
    assert offer.get('no_guarantees') == 'No guaranteed rankings, citations, or recommendations.'
    assert set(value.get('evidence_discovered', [])) >= REQUIRED_DISCOVERIES

    evaluation = value.get('evaluation', {})
    assert isinstance(evaluation.get('first_impression'), str) and evaluation['first_impression'].strip()
    assert evaluation.get('clarity') in {'clear', 'mixed', 'unclear'}
    assert evaluation.get('evidence_trust') in {'sufficient', 'mixed', 'insufficient'}
    assert evaluation.get('boundary_clarity') in {'clear', 'mixed', 'unclear'}
    assert evaluation.get('intent_strength') in {'strong', 'mixed', 'weak'}
    assert isinstance(evaluation.get('objections'), list)
    assert all(isinstance(item, str) and item.strip() for item in evaluation['objections'])

    actions = set(value.get('actions', []))
    assert {'page_loaded', 'offer_reviewed'} <= actions
    assert {'booking_intent_recorded', 'abandoned'} & actions
    assert not actions & {'booking_submitted', 'payment_attempted', 'calendar_opened', 'crm_mutated', 'analytics_emitted', 'booking_route_opened'}

    decision = value.get('terminal_decision', {})
    assert decision.get('outcome') in {'book_intent', 'abandoned'}
    assert isinstance(decision.get('reason'), str) and decision['reason'].strip()

    safety = value.get('safety', {})
    for field in ('booking_submitted', 'payment_attempted', 'calendar_opened', 'crm_mutated', 'analytics_emitted', 'navigated_to_booking_route'):
        assert safety.get(field) is False, f'{field} must be false'
    external_hosts = safety.get('external_hosts_contacted')
    assert isinstance(external_hosts, list)
    assert all(
        isinstance(host, str) and host.startswith('http://agency-bridge:8080/')
        for host in external_hosts
    ), 'only task-owned agency-bridge subresources may be recorded'


if __name__ == '__main__':
    test_no_side_effect_buyer_study_trajectory()
