// Bettermode dynamic-block UI ("Slate") for the per-post admin draft panel.
// Schema mirrors the prior-art invite app: a tree of blocks with a root.

export type Slate = {
  rootBlock: string;
  blocks: SlateBlock[];
};

export type SlateBlock = {
  id: string;
  name: string;
  props?: Record<string, unknown>;
  children?: string[];
};

export type Interaction = {
  id: string;
  type: 'SHOW' | 'OPEN_TOAST' | 'CLOSE';
  props?: Record<string, unknown>;
  slate?: Slate;
};

export type DraftBlockState = {
  postId: string;
  draftText: string;
  draftStatus: 'pending' | 'approved' | 'sent' | 'rejected' | 'expired' | 'none';
  excerpt?: string;
  notice?: { kind: 'success' | 'error' | 'info'; title: string };
};

export function adminDraftSlate(state: DraftBlockState): Slate {
  const showSendable = state.draftStatus === 'pending' || state.draftStatus === 'approved';
  const showSent = state.draftStatus === 'sent';
  const showNone = state.draftStatus === 'none';

  return {
    rootBlock: 'root',
    blocks: [
      {
        id: 'root',
        name: 'Container',
        props: { spacing: 'md' },
        children: [
          'title',
          ...(state.notice ? ['notice'] : []),
          ...(showNone ? ['empty'] : []),
          ...(showSent ? ['sentBanner'] : []),
          ...(showSendable ? ['form'] : []),
        ],
      },
      {
        id: 'title',
        name: 'Text',
        props: { value: 'Marketplace Creator Agent — drafted reply', size: 'md' },
      },
      ...(state.notice
        ? [
            {
              id: 'notice',
              name: 'Alert',
              props: {
                status: state.notice.kind === 'success' ? 'success' : state.notice.kind === 'error' ? 'error' : 'info',
                title: state.notice.title,
              },
            } as SlateBlock,
          ]
        : []),
      ...(showNone
        ? [
            {
              id: 'empty',
              name: 'Text',
              props: {
                value: 'No draft yet. The agent generates a draft when a creator posts or replies in this space.',
                color: 'subdued',
              },
            } as SlateBlock,
          ]
        : []),
      ...(showSent
        ? [
            {
              id: 'sentBanner',
              name: 'Alert',
              props: { status: 'success', title: 'Reply sent' },
            } as SlateBlock,
          ]
        : []),
      ...(showSendable
        ? formBlocks(state)
        : []),
    ],
  };
}

function formBlocks(state: DraftBlockState): SlateBlock[] {
  const defaultValues = JSON.stringify({
    draft: state.draftText,
    postId: state.postId,
  });

  return [
    {
      id: 'form',
      name: 'Form',
      props: {
        callbackId: 'send-draft',
        defaultValues,
      },
      children: [
        ...(state.excerpt ? ['excerpt'] : []),
        'draft',
        'hiddenPostId',
        'actions',
      ],
    },
    ...(state.excerpt
      ? [
          {
            id: 'excerpt',
            name: 'Text',
            props: {
              value: `Original: ${state.excerpt}`,
              color: 'subdued',
              size: 'sm',
            },
          } as SlateBlock,
        ]
      : []),
    {
      id: 'draft',
      name: 'Textarea',
      props: {
        name: 'draft',
        label: 'Drafted reply',
        rows: 8,
        required: true,
      },
    },
    {
      id: 'hiddenPostId',
      name: 'Input',
      props: {
        name: 'postId',
        type: 'hidden',
      },
    },
    {
      id: 'actions',
      name: 'Container',
      props: { direction: 'row', spacing: 'sm' },
      children: ['sendBtn', 'regenBtn', 'dismissBtn'],
    },
    {
      id: 'sendBtn',
      name: 'Button',
      props: { type: 'submit', variant: 'primary' },
      children: ['sendText'],
    },
    { id: 'sendText', name: 'Text', props: { value: 'Send as me' } },
    {
      id: 'regenBtn',
      name: 'Button',
      props: {
        type: 'submit',
        variant: 'secondary',
        callbackId: 'regen-draft',
      },
      children: ['regenText'],
    },
    { id: 'regenText', name: 'Text', props: { value: 'Regenerate' } },
    {
      id: 'dismissBtn',
      name: 'Button',
      props: {
        type: 'submit',
        variant: 'ghost',
        callbackId: 'dismiss-draft',
      },
      children: ['dismissText'],
    },
    { id: 'dismissText', name: 'Text', props: { value: 'Dismiss' } },
  ];
}

export function nonAdminSlate(): Slate {
  return {
    rootBlock: 'root',
    blocks: [
      {
        id: 'root',
        name: 'Container',
        props: { spacing: 'sm' },
        children: ['hint'],
      },
      {
        id: 'hint',
        name: 'Text',
        props: {
          value: 'Marketplace Creator Agent: visible to admins only.',
          color: 'subdued',
          size: 'sm',
        },
      },
    ],
  };
}

export function interactionResponse(
  webhook: { data?: { appId?: string; interactionId?: string } },
  interactions: Interaction[],
): Record<string, unknown> {
  return {
    type: 'INTERACTION',
    status: 'SUCCEEDED',
    data: {
      appId: webhook.data?.appId,
      interactionId: webhook.data?.interactionId,
      interactions,
    },
  };
}
