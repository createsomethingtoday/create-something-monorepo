import json
from pathlib import Path


JOURNEY_ID = '__JOURNEY_ID__'
CANDIDATE_ID = '__CANDIDATE_ID__'
START_URL = '__START_URL__'
ROUTE_PATHS = __ROUTE_PATHS_JSON__
OUTPUT = Path('/app/output/property_journey_trajectory.json')


def task_owned_bridge_host(value):
    return isinstance(value, str) and (
        value.startswith('http://agency-bridge:8080/')
        or value.startswith('agency-bridge://')
        or value == 'agency-bridge:8080'
    )


def load_output():
    assert OUTPUT.is_file(), f'Missing {OUTPUT}'
    value = json.loads(OUTPUT.read_text(encoding='utf-8'))
    assert isinstance(value, dict), 'output root must be an object'
    return value


def test_property_journey_trajectory():
    value = load_output()
    assert value.get('schema_version') == 'agency.property-journey-study.v1'
    assert value.get('journey_id') == JOURNEY_ID
    assert value.get('candidate_id') == CANDIDATE_ID

    provenance = value.get('provenance', {})
    assert all(isinstance(provenance.get(key), str) and provenance[key].strip()
               for key in ('task_version', 'persona_id', 'model', 'start_url'))
    assert provenance['start_url'] == START_URL

    routes = value.get('routes')
    assert isinstance(routes, list) and len(routes) == len(ROUTE_PATHS)
    for index, route in enumerate(routes):
        assert isinstance(route, dict)
        assert route.get('path') == ROUTE_PATHS[index]
        assert route.get('decision_clarity') in {'clear', 'mixed', 'unclear'}
        assert route.get('proof_support') in {'sufficient', 'mixed', 'insufficient'}
        assert route.get('next_step_confidence') in {'strong', 'mixed', 'weak'}

    flow = value.get('flow', {})
    assert flow.get('navigation_continuity') in {'clear', 'mixed', 'unclear'}
    assert flow.get('terminal_intent') in {'map_intent', 'abandoned'}

    safety = value.get('safety', {})
    for field in ('booking_submitted', 'payment_attempted', 'calendar_opened', 'crm_mutated', 'analytics_emitted'):
        assert safety.get(field) is False, f'{field} must be false'
    hosts = safety.get('external_hosts_contacted')
    assert isinstance(hosts, list)
    assert all(task_owned_bridge_host(host) for host in hosts)


if __name__ == '__main__':
    test_property_journey_trajectory()
