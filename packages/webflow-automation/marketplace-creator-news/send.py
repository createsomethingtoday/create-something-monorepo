#!/usr/bin/env python3
"""Post a Marketplace news item to creators through Knock.

Recipients are 🎨Creators with at least one published asset and a 🔑WF User ID.
The Knock workflow `marketplace-creator-news` puts the post in the dashboard
bell and in the Creator Hub Overview. With KNOCK_SECRET_API_KEY set, the same list is
also added to the Knock audience `marketplace-creators` (adds only).

Dry run by default: prints the post and the recipient count. Add --send to
trigger production. A human must approve the post text before --send.

  infisical run --env=prod --path=/ -- python3 send.py --title "..." --body "..." [--link URL] [--send]

Reads AIRTABLE_API_KEY and KNOCK_SECRET_API_KEY (Infisical prod).
"""

import argparse
import json
import os
import subprocess
import urllib.parse
import urllib.request

BASE_ID = 'appMoIgXMTTTNIc3p'
CREATORS_TABLE = '🎨Creators'
WF_USER_ID_FIELD = 'fldpwkyHcmErSNkzX'  # 🔑WF User ID
RECIPIENT_FORMULA = "AND({#️⃣👛Published}>0, {🔑WF User ID}!='')"
WORKFLOW = 'marketplace-creator-news'
AUDIENCE = 'marketplace-creators'
BATCH_SIZE = 100


def creator_user_ids(api_key: str) -> list[str]:
    ids, offset = set(), None
    while True:
        query = {
            'filterByFormula': RECIPIENT_FORMULA,
            'returnFieldsByFieldId': 'true',
            'fields[]': WF_USER_ID_FIELD,
            'pageSize': 100,
        }
        if offset:
            query['offset'] = offset
        url = (
            f'https://api.airtable.com/v0/{BASE_ID}/'
            f'{urllib.parse.quote(CREATORS_TABLE)}?{urllib.parse.urlencode(query)}'
        )
        request = urllib.request.Request(url, headers={'Authorization': f'Bearer {api_key}'})
        page = json.load(urllib.request.urlopen(request))
        for record in page['records']:
            user_id = (record['fields'].get(WF_USER_ID_FIELD) or '').strip()
            if user_id:
                ids.add(user_id)
        offset = page.get('offset')
        if not offset:
            return sorted(ids)


def sync_audience(secret: str, user_ids: list[str]) -> None:
    for start in range(0, len(user_ids), 1000):
        body = json.dumps(
            {'members': [{'user': {'id': i}} for i in user_ids[start : start + 1000]]}
        ).encode()
        request = urllib.request.Request(
            f'https://api.knock.app/v1/audiences/{AUDIENCE}/members?create_audience=true',
            data=body,
            method='POST',
            headers={'Authorization': f'Bearer {secret}', 'Content-Type': 'application/json'},
        )
        urllib.request.urlopen(request)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--title', required=True)
    parser.add_argument('--body', required=True, help='Markdown')
    parser.add_argument('--link', help='Optional URL the post opens')
    parser.add_argument('--send', action='store_true', help='Trigger production')
    args = parser.parse_args()

    recipients = creator_user_ids(os.environ['AIRTABLE_API_KEY'])
    data = {'title': args.title, 'body': args.body}
    if args.link:
        data['link_url'] = args.link

    print(f'Post: {json.dumps(data, ensure_ascii=False)}')
    print(f'Recipients: {len(recipients)} creators')
    if os.environ.get('KNOCK_SECRET_API_KEY'):
        sync_audience(os.environ['KNOCK_SECRET_API_KEY'], recipients)
        print(f'Synced audience {AUDIENCE}')
    if not args.send:
        print('Dry run. Add --send to post.')
        return

    for start in range(0, len(recipients), BATCH_SIZE):
        batch = recipients[start : start + BATCH_SIZE]
        subprocess.run(
            [
                'knock', 'workflow', 'run', WORKFLOW,
                '--environment', 'production',
                '--recipients', ','.join(batch),
                '--data', json.dumps(data),
            ],
            check=True,
        )
        print(f'Sent {start + len(batch)}/{len(recipients)}')


if __name__ == '__main__':
    main()
