#!/usr/bin/env python3
"""Draw's stdio MCP adapter and CLI. Uses only Python's standard library."""
import argparse
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse
import uuid

DEFAULT_ORIGIN = 'https://draw.createsomething.agency'

class DrawAgent:
    def __init__(self, origin=DEFAULT_ORIGIN, state=None):
        parsed = urlparse(origin)
        if origin != DEFAULT_ORIGIN and not (parsed.scheme == 'http' and parsed.hostname in ('127.0.0.1', 'localhost')):
            raise ValueError('Use the production Draw origin or an explicit local development origin.')
        self.origin = origin.rstrip('/')
        self.path = Path(state or os.environ.get('DRAW_AGENT_STATE', '~/.config/draw-motion-descript/agent-connections.json')).expanduser()
        self.connections = self.load()

    def load(self):
        try:
            data = json.loads(self.path.read_text())
            return {key: value for key, value in data.items() if value.get('expires', 0) > time.time() * 1000 and value.get('origin') == self.origin}
        except FileNotFoundError:
            return {}

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        tmp = self.path.with_name(self.path.name + '.' + uuid.uuid4().hex + '.tmp')
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(self.connections, stream)
        os.replace(tmp, self.path)

    def request(self, action, payload=None, connection=None):
        body = {'action': action, **(payload or {})}
        headers = {'Content-Type': 'application/json', 'User-Agent': 'DrawAgent/1.0 (+https://draw.createsomething.agency)'}
        if connection:
            body['sessionId'] = connection['sessionId']
            headers['Authorization'] = 'Bearer ' + connection['agentToken']
        request = urllib.request.Request(self.origin + '/api/agent', data=json.dumps(body).encode(), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            try:
                message = json.load(error).get('error', 'Draw request failed.')
            except (ValueError, AttributeError):
                message = f'Draw request failed (HTTP {error.code}).'
            raise RuntimeError(message) from None

    def connection(self, project_id):
        connection = self.connections.get(project_id)
        if not connection:
            raise ValueError('Project is not connected. Use Connect agent in that Draw project, then draw_agent_connect.')
        return connection

    def call(self, name, args):
        if name == 'draw_agent_connect':
            paired = self.request('pair', {'code': args['code'], 'agentName': args.get('agentName', 'Codex')})
            paired['origin'] = self.origin
            self.connections[paired['projectId']] = paired
            self.save()
            return {key: value for key, value in paired.items() if key != 'agentToken'}
        if name == 'draw_agent_connections':
            return {'connections': [{key: value for key, value in item.items() if key != 'agentToken'} for item in self.connections.values()]}
        if name == 'draw_agent_intent':
            from draw_intent import execute_intent
            return execute_intent(self, args)
        if name == 'draw_agent_run':
            started = time.monotonic()
            result = self.call('draw_agent_call', {'projectId': args['projectId'], 'tool': 'draw_execute', 'arguments': {'expectedRevision': args['expectedRevision'], 'commands': args['commands']}, **({'commandId': args['commandId']} if args.get('commandId') else {})})
            return {**result, 'adapterTotalMs': (time.monotonic() - started) * 1000}
        connection = self.connection(args['projectId'])
        if name == 'draw_agent_status':
            return self.request('status', connection=connection)
        if name == 'draw_agent_tools':
            return self.request('tools', connection=connection)
        if name == 'draw_agent_disconnect':
            result = self.request('disconnect', connection=connection)
            del self.connections[args['projectId']]
            self.save()
            return result
        if name == 'draw_agent_receipt':
            return self.request('receipt', {'commandId': args['commandId']}, connection)
        if name == 'draw_agent_call':
            command_id = args.get('commandId') or str(uuid.uuid4())
            payload = {'commandId': command_id, 'tool': args['tool'], 'arguments': args.get('arguments', {})}
            # Persist receipt identity before the uncertain network write. Never automatically retry enqueue.
            connection['lastCommandId'] = command_id
            self.save()
            try:
                self.request('enqueue', payload, connection)
            except Exception as error:
                return {'state': 'unconfirmed', 'commandId': command_id, 'error': str(error), 'next': 'Read draw_agent_receipt for this command ID and inspect the project before retrying a mutation.'}
            deadline = time.monotonic() + 35
            while time.monotonic() < deadline:
                try:
                    receipt = self.request('receipt', {'commandId': command_id}, connection)
                except (RuntimeError, OSError):
                    time.sleep(1)
                    continue
                if receipt['state'] not in ('queued', 'running'):
                    return receipt
                time.sleep(0.7)
            return {'state': 'unknown', 'commandId': command_id, 'next': 'Read the receipt and inspect the project. Do not automatically replay this command.'}
        raise ValueError('Unknown Draw agent tool.')


def tool(name, description, properties, required=(), read_only=False):
    return {'name': name, 'description': description, 'inputSchema': {'type': 'object', 'properties': properties, 'required': list(required), 'additionalProperties': False}, 'annotations': {'readOnlyHint': read_only, 'openWorldHint': True}}

PROJECT = {'projectId': {'type': 'string', 'description': 'Exact project ID from the connection receipt.'}}
TOOLS = [
    tool('draw_agent_connect', 'Pair once with an open Draw project using its visible Connect agent code. Returns the exact project ID. Never print the pairing code or credentials.', {'code': {'type': 'string'}, 'agentName': {'type': 'string', 'maxLength': 60}}, ['code']),
    tool('draw_agent_connections', 'List this adapter’s remembered project connections. Call status to confirm current availability.', {}, read_only=True),
    tool('draw_agent_status', 'Check the paired project’s mode, browser availability and expiry.', PROJECT, ['projectId'], True),
    tool('draw_agent_tools', 'Discover the real editing tools and exact input schemas for the paired project’s current Canvas or Motion mode.', PROJECT, ['projectId'], True),
    tool('draw_agent_call', 'Execute a discovered Draw tool in the paired browser. Real editing, undo and activity use the same path as WebMCP. Inspect before editing; never replay unknown/unconfirmed results automatically. Returns a command receipt.', {**PROJECT, 'tool': {'type': 'string'}, 'arguments': {'type': 'object'}, 'commandId': {'type': 'string', 'description': 'Optional stable ID for this exact operation; never reuse for a different operation.'}}, ['projectId', 'tool']),
    tool('draw_agent_run', 'Fast path: execute revision-guarded edits and verify in one browser command. Returns activity, change receipt, geometry and timings. Never replay unknown, unconfirmed or applied results.', {**PROJECT, 'expectedRevision': {'type': 'string'}, 'commands': {'type': 'array', 'minItems': 1, 'maxItems': 100, 'items': {'type': 'object'}, 'description': 'draw_edit commands from the discovered Canvas schema.'}, 'commandId': {'type': 'string'}}, ['projectId', 'expectedRevision', 'commands']),
    tool('draw_agent_intent', 'Route one bounded user request with Jev then execute and verify. Supports moving a note/group by distance (default 32), palette stroke colors, and edge alignment of the existing selection. Requires TYPESAFE_API_KEY in adapter environment. Sends bounded canvas context to TypeSafe. Unsupported, uncertain or unavailable routing returns needs_reasoning without editing; the calling agent owns fallback.', {**PROJECT, 'request': {'type': 'string', 'minLength': 1, 'maxLength': 2000}, 'distance': {'type': 'number', 'minimum': 1, 'maximum': 1000, 'default': 32}}, ['projectId', 'request']),
    tool('draw_agent_receipt', 'Read an existing command receipt without executing it again.', {**PROJECT, 'commandId': {'type': 'string'}}, ['projectId', 'commandId'], True),
    tool('draw_agent_disconnect', 'Revoke this project connection and forget its agent credential.', PROJECT, ['projectId'])
]

def serve(agent):
    for line in sys.stdin:
        rpc = None
        try:
            rpc = json.loads(line)
            if 'id' not in rpc:
                continue
            method = rpc.get('method')
            if method == 'initialize':
                version = rpc.get('params', {}).get('protocolVersion', '2024-11-05')
                result = {'protocolVersion': version, 'capabilities': {'tools': {}}, 'serverInfo': {'name': 'draw-agent', 'version': '0.1.0'}}
            elif method == 'ping':
                result = {}
            elif method == 'tools/list':
                result = {'tools': TOOLS}
            elif method == 'tools/call':
                params = rpc['params']
                try:
                    output = agent.call(params['name'], params.get('arguments', {}))
                    result = {'content': [{'type': 'text', 'text': json.dumps(output)}], 'isError': output.get('state') in ('failed', 'unknown', 'unconfirmed') or output.get('result', {}).get('ok') is False}
                except Exception as error:
                    result = {'content': [{'type': 'text', 'text': str(error)}], 'isError': True}
            else:
                print(json.dumps({'jsonrpc': '2.0', 'id': rpc['id'], 'error': {'code': -32601, 'message': 'Method not found'}}), flush=True)
                continue
            print(json.dumps({'jsonrpc': '2.0', 'id': rpc['id'], 'result': result}), flush=True)
        except Exception:
            print(json.dumps({'jsonrpc': '2.0', 'id': rpc.get('id') if isinstance(rpc, dict) else None, 'error': {'code': -32600, 'message': 'Invalid request'}}), flush=True)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin', default=DEFAULT_ORIGIN)
    parser.add_argument('--state', help='Private local connection credential file; default is outside the plugin.')
    parser.add_argument('--call', help='Call one MCP tool, reading its argument object from stdin; otherwise serve stdio MCP.')
    args = parser.parse_args()
    agent = DrawAgent(args.origin, args.state)
    if args.call:
        print(json.dumps(agent.call(args.call, json.load(sys.stdin))))
    else:
        serve(agent)

if __name__ == '__main__':
    main()
