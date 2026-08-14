import json
from pathlib import Path


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


def test_no_side_effect_buyer_trajectory():
    value = load_output()
    assert value.get('schema_version') == 'agency.matraix-buyer-readiness.v1'

    provenance = value.get('provenance', {})
    assert all(isinstance(provenance.get(key), str) and provenance[key].strip() for key in ('task_version', 'persona_id', 'model', 'surface_url'))
    assert '/agent-readiness' in provenance['surface_url']

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
    assert safety.get('external_hosts_contacted') == []


if __name__ == '__main__':
    test_no_side_effect_buyer_trajectory()
