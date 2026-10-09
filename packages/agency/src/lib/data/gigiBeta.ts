// Immutable release identity; never replace bytes at this versioned path.
export const gigiBeta = {
  version: '0.1.0',
  filename: 'GiGi-0.1.0-arm64-private-beta.dmg',
  bytes: 75750054,
  sha256: 'e9ce1625e4e406fe375625f3708389ff22e9afeb369a34baa39fe0153a2d7b6e',
  url: 'https://media.createsomething.io/releases/gigi/0.1.0/e9ce1625e4e406fe375625f3708389ff22e9afeb369a34baa39fe0153a2d7b6e/GiGi-0.1.0-arm64-private-beta.dmg'
} as const;

export const gigiWalkthroughs = [
  {
    title: 'Start with your workspace',
    seconds: 90,
    bytes: 3848046,
    sha256: 'cc6fa3ae6ffc3579234749059da1e1efa51082b86eea1ae4b5d86620aae384fa',
    url: 'https://media.createsomething.io/releases/gigi/walkthroughs/cc6fa3ae6ffc3579234749059da1e1efa51082b86eea1ae4b5d86620aae384fa/gigi-silent-walkthrough.mp4',
    description: 'Create a local workspace, add a gig, link the people and work, and explore optional connections.'
  },
  {
    title: 'Read, review and approve with Ask GiGi',
    seconds: 86,
    bytes: 3862158,
    sha256: '6bdd2b9b49f5e8c67879d47ae0c87ab2fae9ca6c5a330ef14c7302cceebfcbbc',
    url: 'https://media.createsomething.io/releases/gigi/walkthroughs/6bdd2b9b49f5e8c67879d47ae0c87ab2fae9ca6c5a330ef14c7302cceebfcbbc/gigi-codex-chat-walkthrough.mp4',
    description: 'Open embedded chat, read linked records, review a proposed task edit, approve it and check the saved result. Two labelled cuts shorten agent waiting.'
  }
] as const;
