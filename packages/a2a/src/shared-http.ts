import {
  publishSharedOutbox,
  listSharedMonitoring,
  cancelSharedSubscription
} from './shared-delivery';
import { authenticate, limitAdmission, requireScope } from './auth';
import { SharedInboxService } from './shared-domain';
import type { SharedCapability, SharedSendInput } from './shared-types';
import { ADMIN_SCOPE, READ_SCOPE, WRITE_SCOPE, type RuntimeEnv } from './env';
import { HttpError, json, readJson, sameOrigin, stringField } from './http';

function fields(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new HttpError('invalid_request', 400, 'Unexpected request field.');
}
function number(value: string | null, name: string) {
  if (value === null) return 0;
  if (!/^(0|[1-9]\d{0,15})$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw new HttpError('invalid_request', 400, `Invalid ${name}.`);
  return Number(value);
}
function version(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1)
    throw new HttpError('invalid_request', 400, 'A current assignmentVersion is required.');
  return Number(value);
}
function capabilities(value: unknown): SharedCapability[] {
  if (value === undefined) return ['read', 'post', 'work'];
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((x) => !['read', 'post', 'work'].includes(x)) ||
    !value.includes('read')
  )
    throw new HttpError(
      'invalid_request',
      400,
      'Choose read, post and work permissions; read is required.'
    );
  return [...new Set(value)] as SharedCapability[];
}
export async function sharedHttp(request: Request, env: RuntimeEnv): Promise<Response> {
  if (env.SHARED_INBOXES_ENABLED !== 'true')
    throw new HttpError('shared_inboxes_unavailable', 503, 'Shared inboxes are not enabled.');
  const url = new URL(request.url),
    path = url.pathname.slice('/api/v2'.length),
    method = request.method;
  const p = await authenticate(request, env);
  requireScope(p, READ_SCOPE);
  const owner = p.authentication === 'owner_session';
  if (!['GET', 'HEAD'].includes(method)) {
    requireScope(p, WRITE_SCOPE);
    if (owner) sameOrigin(request, env.BASE_URL);
    await limitAdmission(env, `shared-write:${p.subject}`, 120, 60000);
  }
  const service = new SharedInboxService(env.DB);
  const body = () => readJson(request);
  const ownerOnly = () => {
    if (!owner)
      throw new HttpError('owner_session_required', 403, 'Use your signed-in owner console.');
    requireScope(p, ADMIN_SCOPE);
  };
  const view = url.searchParams.get('viewAgentId') ?? undefined;
  if (path === '/me' && method === 'GET') {
    ownerOnly();
    return json({
      subject: p.subject,
      email: p.email,
      displayName: p.displayName,
      mode: 'owner',
      selfService: env.SELF_SERVICE_ENABLED === 'true'
    });
  }
  if (path === '/agents') {
    if (method === 'GET')
      return json({
        agents: owner ? await service.listAgents(p) : [await service.resolveAgent(p)]
      });
    if (method === 'POST') {
      ownerOnly();
      const b = await body();
      fields(b, ['name']);
      return json({ agent: await service.createAgent(p, stringField(b, 'name', 120)) }, 201);
    }
  }
  let match = path.match(/^\/agents\/([^/]+)$/);
  if (match) {
    ownerOnly();
    if (method === 'PATCH') {
      const b = await body();
      fields(b, ['paused']);
      if (typeof b.paused !== 'boolean')
        throw new HttpError('invalid_request', 400, 'Paused must be true or false.');
      return json({ agent: await service.setAgentPaused(p, match[1], b.paused) });
    }
    if (method === 'DELETE') return json(await service.deleteAgent(p, match[1]));
  }
  if (path === '/inboxes') {
    if (method === 'GET') return json({ inboxes: await service.listInboxes(p) });
    if (method === 'POST') {
      ownerOnly();
      const b = await body();
      fields(b, ['name']);
      return json({ inbox: await service.createInbox(p, stringField(b, 'name', 120)) }, 201);
    }
  }
  match = path.match(/^\/inboxes\/([^/]+)$/);
  if (match && method === 'PATCH') {
    ownerOnly();
    const b = await body();
    fields(b, ['state']);
    if (!['active', 'archived', 'closed'].includes(String(b.state)))
      throw new HttpError('invalid_request', 400, 'Invalid inbox state.');
    return json(
      await service.setInboxState(p, match[1], b.state as 'active' | 'archived' | 'closed')
    );
  }
  if (path === '/connections') {
    if (method === 'GET') {
      ownerOnly();
      return json({ connections: await service.listConnections(p) });
    }
    if (method === 'POST') {
      const b = await body();
      fields(b, ['label']);
      return json(
        { connection: await service.requestConnection(p, stringField(b, 'label', 120)) },
        201
      );
    }
  }
  match = path.match(/^\/connections\/([^/]+)\/(approve|revoke)$/);
  if (match && method === 'POST') {
    ownerOnly();
    if (match[2] === 'revoke') return json(await service.revokeConnection(p, match[1]));
    const b = await body();
    fields(b, ['agentId']);
    return json(await service.approveConnection(p, match[1], stringField(b, 'agentId')));
  }
  if (path === '/invitations' && method === 'GET') {
    ownerOnly();
    return json({ invitations: await service.listInvitations(p) });
  }
  match = path.match(/^\/invitations\/([^/]+)$/);
  if (match && method === 'GET') {
    ownerOnly();
    return json(await service.previewInvitation(p, match[1]));
  }
  match = path.match(/^\/invitations\/([^/]+)\/(accept|reject|revoke)$/);
  if (match && method === 'POST') {
    ownerOnly();
    return json(
      match[2] === 'accept'
        ? await service.acceptInvitation(p, match[1])
        : match[2] === 'reject'
          ? await service.rejectInvitation(p, match[1])
          : await service.revokeInvitation(p, match[1])
    );
  }
  match = path.match(/^\/inboxes\/([^/]+)\/invitations$/);
  if (match && method === 'POST') {
    ownerOnly();
    const b = await body();
    fields(b, ['agentId', 'capabilities']);
    return json(
      {
        invitation: await service.invite(
          p,
          match[1],
          stringField(b, 'agentId'),
          capabilities(b.capabilities)
        )
      },
      201
    );
  }
  match = path.match(/^\/inboxes\/([^/]+)\/members$/);
  if (match) {
    if (method === 'GET') return json({ members: await service.roster(p, match[1], view) });
    if (method === 'POST') {
      ownerOnly();
      const b = await body();
      fields(b, ['agentId', 'capabilities']);
      return json(
        {
          membership: await service.addOwnMembership(
            p,
            match[1],
            stringField(b, 'agentId'),
            capabilities(b.capabilities)
          )
        },
        201
      );
    }
  }
  match = path.match(/^\/inboxes\/([^/]+)\/members\/([^/]+)(\/leave)?$/);
  if (match && (method === 'DELETE' || (method === 'POST' && match[3]))) {
    ownerOnly();
    return json(
      match[3]
        ? await service.leave(p, match[1], match[2])
        : await service.removeMember(p, match[1], match[2])
    );
  }
  match = path.match(/^\/inboxes\/([^/]+)\/messages$/);
  if (match) {
    if (method === 'GET')
      return json(
        await service.listMessages(
          p,
          match[1],
          number(url.searchParams.get('after'), 'cursor'),
          50,
          view
        )
      );
    if (method === 'POST') {
      const b = await body();
      fields(b, ['text', 'kind', 'assigneeAgentId', 'idempotencyKey', 'viewAgentId']);
      if (b.kind !== undefined && !['conversation', 'request'].includes(String(b.kind)))
        throw new HttpError('invalid_request', 400, 'Invalid message kind.');
      if (!owner && b.viewAgentId !== undefined)
        throw new HttpError(
          'invalid_request',
          400,
          'Agent identity comes from its approved connection.'
        );
      const input: SharedSendInput = {
        text: stringField(b, 'text', 16384),
        idempotencyKey: stringField(b, 'idempotencyKey', 128),
        kind: b.kind as SharedSendInput['kind'],
        ...(b.assigneeAgentId === undefined
          ? {}
          : { assigneeAgentId: stringField(b, 'assigneeAgentId') })
      };
      const message = owner
        ? await service.sendOwnerMessage(
            p,
            match[1],
            input,
            b.viewAgentId === undefined ? undefined : stringField(b, 'viewAgentId')
          )
        : await service.sendMessage(p, match[1], input);
      await publishSharedOutbox(env).catch(() =>
        console.warn(JSON.stringify({ event: 'shared_publication_deferred' }))
      );
      return json(message, 201);
    }
  }
  match = path.match(
    /^\/inboxes\/([^/]+)\/messages\/([^/]+)(?:\/(claim|finish|reassign|cancel))?$/
  );
  if (match) {
    if (method === 'GET' && !match[3])
      return json({ message: await service.readMessage(p, match[1], match[2], view) });
    if (method === 'POST' && match[3]) {
      const b = await body();
      if (match[3] === 'claim') {
        fields(b, ['assignmentVersion']);
        return json(
          await service.claimMessage(p, match[1], match[2], version(b.assignmentVersion))
        );
      }
      if (match[3] === 'finish') {
        fields(b, ['claimToken', 'assignmentVersion', 'state']);
        if (!['completed', 'rejected', 'approval_required'].includes(String(b.state)))
          throw new HttpError('invalid_request', 400, 'Invalid outcome.');
        return json({
          message: await service.finishMessage(p, match[1], match[2], {
            claimToken: stringField(b, 'claimToken'),
            assignmentVersion: version(b.assignmentVersion),
            state: b.state as 'completed' | 'rejected' | 'approval_required'
          })
        });
      }
      ownerOnly();
      if (match[3] === 'reassign') {
        fields(b, ['agentId', 'assignmentVersion']);
        return json({
          message: await service.reassignMessage(
            p,
            match[1],
            match[2],
            stringField(b, 'agentId'),
            version(b.assignmentVersion)
          )
        });
      }
      fields(b, ['assignmentVersion']);
      return json(await service.cancelMessage(p, match[1], match[2], version(b.assignmentVersion)));
    }
  }
  match = path.match(/^\/inboxes\/([^/]+)\/context$/);
  if (match) {
    if (method === 'GET')
      return json(
        await service.listContext(
          p,
          match[1],
          number(url.searchParams.get('after'), 'cursor'),
          50,
          view
        )
      );
    if (method === 'POST') {
      ownerOnly();
      const b = await readJson(request, 400000, true);
      fields(b, ['title', 'text', 'viewAgentId']);
      return json(
        {
          context: await service.createContext(
            p,
            match[1],
            { title: stringField(b, 'title', 200), text: stringField(b, 'text', 65536) },
            b.viewAgentId === undefined ? undefined : stringField(b, 'viewAgentId')
          )
        },
        201
      );
    }
  }
  match = path.match(/^\/inboxes\/([^/]+)\/context-search$/);
  if (match && method === 'GET')
    return json(await service.searchContext(p, match[1], url.searchParams.get('q') ?? '', view));
  match = path.match(/^\/inboxes\/([^/]+)\/context\/([^/]+)$/);
  if (match) {
    if (method === 'GET')
      return json(
        await service.readContext(
          p,
          match[1],
          match[2],
          view,
          number(url.searchParams.get('offset'), 'offset')
        )
      );
    if (method === 'DELETE') {
      ownerOnly();
      return json(await service.revokeContext(p, match[1], match[2]));
    }
  }
  match = path.match(/^\/inboxes\/([^/]+)\/monitoring$/);
  if (match && method === 'GET') {
    ownerOnly();
    return json(await listSharedMonitoring(env, p, match[1], view));
  }
  match = path.match(/^\/subscriptions\/([^/]+)$/);
  if (match && method === 'DELETE') {
    ownerOnly();
    await cancelSharedSubscription(env, p, match[1]);
    return json({ ok: true });
  }
  throw new HttpError('not_found', 404, 'Shared inbox operation not found.');
}
