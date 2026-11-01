import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import Admin from '../src/routes/admin/+page.svelte';
import NetworkContext from '../src/lib/components/NetworkContext.svelte';
import LearningPaths from '../src/lib/components/LearningPaths.svelte';

vi.mock('$app/state', () => ({
  page: { params: {}, url: new URL('https://example.invalid/paths') }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const network = { slug: 'test-workshop', name: 'Test workshop', status: 'suspended' };
describe('onboarding state and achievable next steps', () => {
  it('preserves network identity and paused access with an owner recovery destination', () => {
    const { body } = render(NetworkContext, { props: { network, canManage: true } });
    expect(body).toContain('Test workshop');
    expect(body).toContain('Member access paused');
    expect(body).toContain('/n/test-workshop/settings');
    expect(body).not.toContain('Activate');
  });
  it('does not offer management actions to a viewer', () => {
    const { body } = render(NetworkContext, { props: { network, canManage: false } });
    expect(body).toContain('Contact the creator');
    expect(body).not.toContain('/settings');
  });
  it('offers lesson preparation rather than an empty path editor for a creator without lessons', () => {
    const { body } = render(LearningPaths, {
      props: {
        data: {
          network: { ...network, status: 'active' },
          path: null,
          paths: [],
          videos: [],
          canEdit: true
        }
      }
    });
    expect(body).toContain('Prepare a lesson first');
    expect(body).toContain('/n/test-workshop/studio');
    expect(body).not.toContain('Create a learning path');
    expect(body).not.toContain('Choose a lesson');
  });
  it('routes an inactive creator to network recovery instead of an unavailable upload', () => {
    const { body } = render(LearningPaths, {
      props: { data: { network, path: null, paths: [], videos: [], canEdit: true } }
    });
    expect(body).toContain('Uploads require an active network');
    expect(body).toContain('/n/test-workshop/settings');
    expect(body).not.toContain('Prepare your first lesson');
  });
  it('reflects the existing upload restriction without removing the review workspace', () => {
    const { body } = render(Admin, {
      props: {
        data: {
          network: {
            ...network,
            id: 'test',
            description: '',
            format: 'academy',
            access_model: 'members',
            status: 'suspended'
          },
          identity: { subject: 'test-owner', email: 'owner@example.invalid', role: 'admin' },
          impersonation: null,
          selfServiceEnabled: false,
          supportEnabled: false,
          reviewer: false
        }
      }
    });
    expect(body).toContain('Uploads are unavailable while this network is not active');
    expect(body).toMatch(/<fieldset[^>]*disabled/);
    expect(body).toContain('New to teaching here?');
    expect(body).toContain('Back to library');
  });
  it('keeps the viewer return neutral without claiming available sessions', () => {
    const { body } = render(LearningPaths, {
      props: { data: { network, path: null, paths: [], videos: [], canEdit: false } }
    });
    expect(body).toContain('Back to library');
    expect(body).not.toContain('Browse available sessions');
    expect(body).not.toContain('Prepare your first lesson');
  });
  it('allows path drafting when a creator has a selectable lesson', () => {
    const { body } = render(LearningPaths, {
      props: {
        data: {
          network: { ...network, status: 'active' },
          path: null,
          paths: [],
          videos: [{ id: 'lesson-1', title: 'Synthetic lesson' } as any],
          canEdit: true
        }
      }
    });
    expect(body).toContain('Create a learning path');
    expect(body).toContain('Synthetic lesson');
  });
});
