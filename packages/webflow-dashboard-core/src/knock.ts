const KNOCK_TRIGGER_URL = 'https://api.knock.app/v1/workflows';

export interface KnockRecipient {
  id: string;
  email: string;
  name?: string;
}

export interface KnockLoginPayload {
  verificationToken: string;
  expiresAtIso: string;
}

export interface TriggerLoginWorkflowInput {
  apiKey: string;
  workflowKey: string;
  recipient: KnockRecipient;
  data: KnockLoginPayload;
}

export async function triggerKnockLoginWorkflow({
  apiKey,
  workflowKey,
  recipient,
  data
}: TriggerLoginWorkflowInput): Promise<{ workflow_run_id: string }> {
  const response = await fetch(`${KNOCK_TRIGGER_URL}/${encodeURIComponent(workflowKey)}/trigger`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipients: [recipient],
      data
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Knock trigger failed (${response.status}): ${text}`);
  }

  return (await response.json()) as { workflow_run_id: string };
}
