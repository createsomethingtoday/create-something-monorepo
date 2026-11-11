<script lang="ts">
  import { SEO } from '@create-something/canon';
  import AgencyAccountPage from '$lib/components/AgencyAccountPage.svelte';
  import AgencyChapterDial from '$lib/components/AgencyChapterDial.svelte';

  let { data } = $props();
  type AccountUser = { email?: string; name?: string; tier?: string } | null;
  const accountUser = $derived(data.user as AccountUser);
  const chapters = [
    { id: 'account-profile', label: 'Your profile', short: 'Profile', note: 'Your identity across CREATE SOMETHING.' },
    { id: 'account-mcp-access', label: 'MCP access', short: 'Access', note: 'Choose how your tools connect.' },
    { id: 'account-properties', label: 'The properties', short: 'Sites', note: 'Find your next CREATE SOMETHING destination.' },
    { id: 'account-session', label: 'Your session', short: 'Session', note: 'Sign out when you are done.' }
  ];
</script>

<SEO title="Account" description="Manage your CREATE SOMETHING AGENCY account" propertyName="agency" noindex={true} />

<div class="agency-page-wayfinding" data-page-wayfinding>
  <AgencyChapterDial {chapters} context=".AGENCY / ACCOUNT" purpose="Your profile. Your connections. Your call." scope="page" />
</div>
<AgencyAccountPage user={accountUser} />
