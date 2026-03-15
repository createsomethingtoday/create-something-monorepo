/**
 * Half Dozen Zoom API secure output policy artifact.
 *
 * This composes the global bridge baseline with client-specific Zoom
 * redaction rules, then exposes execution hooks for ComposioToolFactory.
 */

import {
  DEFAULT_SECURE_OUTPUT_POLICY,
  composeSecureOutputPolicies,
  createSecureOutputRedactionHook,
  type ComposioToolExecutionHooks,
  type SecureOutputPolicyArtifact,
} from '@create-something/composio-bridge';

export const HALFDOZEN_ZOOM_SECURE_OUTPUT_POLICY: SecureOutputPolicyArtifact = {
  policyId: 'halfdozen-zoom-secure-output',
  version: '2026-02-25',
  description: 'Client-specific Zoom redaction rules for meetings and recordings data.',
  baseline: {
    maxStringLength: 10_000,
  },
  toolkitOverrides: {
    ZOOM: {
      redactKeys: [
        'join_url',
        'start_url',
        'download_url',
        'play_url',
        'share_url',
        'recording_play_passcode',
        'password',
        'pstn_password',
        'h323_password',
        'encrypted_password',
      ],
      dropKeys: [
        'download_access_token',
      ],
      redactPaths: [
        'data.recording_files.*.download_url',
        'data.recording_files.*.play_url',
        'data.recording_files.*.share_url',
      ],
    },
  },
  toolOverrides: {
    ZOOM_GET_MEETING_RECORDINGS: {
      dropPaths: ['data.download_access_token'],
    },
  },
};

export const HALFDOZEN_EFFECTIVE_SECURE_OUTPUT_POLICY = composeSecureOutputPolicies(
  [DEFAULT_SECURE_OUTPUT_POLICY, HALFDOZEN_ZOOM_SECURE_OUTPUT_POLICY],
  {
    policyId: 'halfdozen-zoom-effective-secure-output',
    version: '2026-02-25',
    description: 'Effective Half Dozen Zoom policy (global baseline + client overrides).',
  },
);

export function createHalfDozenZoomExecutionHooks(): ComposioToolExecutionHooks {
  return {
    afterExecute: [createSecureOutputRedactionHook(HALFDOZEN_EFFECTIVE_SECURE_OUTPUT_POLICY)],
  };
}

