<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';
  import { supportHeaders, api } from '$lib/client';
  import { invalidateAll } from '$app/navigation';
  import { assetKinds, assetPrice, type ReleaseManifest } from '$lib/assets';
  let { data } = $props();
  let draft = $state(
    untrack(() => ({
      title: data.asset.title,
      summary: data.asset.summary,
      kind: data.asset.kind,
      price: (data.asset.price_cents / 100).toFixed(2),
      audience: data.asset.audience,
      visibility: data.asset.visibility
    }))
  );
  async function saveDetails(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    try {
      await api(`assets/${data.asset.id}`, draft, data.network!.slug);
      await invalidateAll();
      message = 'Asset details saved. Existing release files and licenses are unchanged.';
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  let version = $state('1.0.0'),
    files = $state<FileList>(),
    busy = $state(false),
    message = $state('');
  let acceptLicense = $state(false),
    purchaseMessage = $state(''),
    purchaseBusy = $state(false);
  async function purchase(action: 'acquire' | 'check') {
    if (!release) return;
    purchaseBusy = true;
    purchaseMessage = '';
    try {
      const result = await api(
        `assets/${data.asset.id}/purchase`,
        { action, release: release.id, acceptLicense },
        data.network!.slug
      );
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      purchaseMessage =
        result.status === 'paid'
          ? 'Payment confirmed. Your package is ready.'
          : result.status === 'refunded'
            ? 'This payment was refunded. Contact the builder for support.'
            : result.status === 'disputed'
              ? 'Access is paused while the payment is under review.'
              : result.status === 'not_started'
                ? 'No purchase has been started for this release.'
                : 'Payment has not been confirmed. If you completed checkout, check again shortly before trying another payment.';
      await invalidateAll();
    } catch (e) {
      purchaseMessage = (e as Error).message;
    } finally {
      purchaseBusy = false;
    }
  }
  onMount(() => {
    if (page.url.searchParams.has('purchase') && data.identity) void purchase('check');
  });
  let selected = $state(untrack(() => data.selectedRelease));
  const release = $derived(data.releases.find((r) => r.id === selected) || data.releases[0]);
  let manifest = $state<ReleaseManifest>({
    runtimes: '',
    requirements: '',
    permissions: '',
    license: '',
    install: '',
    verify: '',
    uninstall: '',
    changes: '',
    support: ''
  });
  const fields: { key: keyof ReleaseManifest; label: string; hint: string }[] = [
    {
      key: 'runtimes',
      label: 'Compatible runtimes and versions',
      hint: 'Name the clients you tested and their versions. Avoid “works everywhere”.'
    },
    {
      key: 'requirements',
      label: 'Prerequisites and ongoing costs',
      hint: 'Dependencies, accounts, model requirements and any paid services.'
    },
    {
      key: 'permissions',
      label: 'Permissions and data access',
      hint: 'Explain filesystem, network and tool access. State explicitly when no access is required.'
    },
    {
      key: 'license',
      label: 'License and permitted use',
      hint: 'State personal/commercial use, team seats and redistribution terms. This text stays with the release.'
    },
    {
      key: 'install',
      label: 'Installation steps',
      hint: 'Exact steps for each supported runtime. Never include real API keys or passwords.'
    },
    {
      key: 'verify',
      label: 'Verify the installation',
      hint: 'A small check and its expected result so buyers know it works.'
    },
    {
      key: 'uninstall',
      label: 'Remove or roll back',
      hint: 'How to remove this asset and any configuration it adds.'
    },
    {
      key: 'changes',
      label: 'Release notes',
      hint: 'What this version provides, its limitations and any breaking changes.'
    },
    {
      key: 'support',
      label: 'Support and refund policy',
      hint: 'A contact method, support scope and refund terms buyers can read before purchase.'
    }
  ];
  async function recover() {
    busy = true;
    message = '';
    try {
      const result = await api(`assets/${data.asset.id}/recover`, {}, data.network!.slug);
      await invalidateAll();
      message = `${result.recovered} recovered. ${result.message}`;
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function upload(event: SubmitEvent) {
    event.preventDefault();
    if (!files?.[0]) return;
    busy = true;
    message = '';
    try {
      const form = new FormData();
      form.set('package', files[0]);
      form.set('version', version);
      form.set('manifest', JSON.stringify(manifest));
      const response = await fetch(
        `/api/networks/${data.network!.slug}/assets/${data.asset.id}/release`,
        { method: 'POST', headers: supportHeaders(), body: form }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Release upload failed.');
      await invalidateAll();
      selected = result.id;
      message = 'Release saved. Inspect the buyer details before publishing.';
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>{data.asset.title} | {data.network?.name}</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="builder-workspace">
  <div class="workspace-trail">
    <a href={`/n/${data.network!.slug}/assets`}>{data.network!.name} / Assets</a><span>/</span><span
      >{data.asset.title}</span
    >
  </div>
  <p class="eyebrow">
    <Icon name={data.asset.kind} size={20} />
    {assetKinds[data.asset.kind]} / {data.owner ? data.asset.visibility : 'BUILDER ASSET'}
  </p>
  <h1 class="asset-heading">{data.asset.title}</h1>
  <p class="lede">{data.asset.summary}</p>
  <div class="builder-split asset-detail">
    <section>
      {#if release}<label
          >Release<select bind:value={selected}
            ><option value="">Latest uploaded · {data.releases[0].version}</option
            >{#each data.releases as item}<option value={item.id}>Version {item.version}</option
              >{/each}</select
          ></label
        >
        <div class="release-facts">
          <span>v{release.version}</span><span
            >{(release.size_bytes / 1024).toFixed(1)} KiB ZIP</span
          ><span>{release.created_at.slice(0, 10)}</span>
        </div>
        {#each [['runtimes', 'Works with'], ['requirements', 'Before you start'], ['permissions', 'Access this asset needs'], ['license', 'License'], ['changes', 'What’s in this release'], ['support', 'Support and refunds']] as [key, label]}<section
            class="manifest-section"
          >
            <h2>{label}</h2>
            <p class="preserve">{release.manifest[key as keyof typeof release.manifest]}</p>
          </section>{/each}
        {#if release.entitled}<section class="manifest-section">
            <p class="eyebrow">YOUR INSTALLATION GUIDE</p>
            <h2>From package to working setup.</h2>
            <ol class="install-steps">
              {#each [['install', 'Install'], ['verify', 'Check it works'], ['uninstall', 'Remove or roll back']] as [key, label]}<li
                >
                  <h3>{label}</h3>
                  <p class="preserve">{release.manifest[key as keyof typeof release.manifest]}</p>
                </li>{/each}
            </ol>
            <p class="muted">
              Instructions are supplied by the builder. Review the package and requested permissions
              before running commands. Downloading does not install or execute anything.
            </p>
          </section>{/if}
      {:else}<section class="builder-panel">
          <h2>{data.owner ? 'Add your first release.' : 'No release available.'}</h2>
          <p>
            {data.owner
              ? 'Package the asset with a clear installation path. Buyers need to know what it does, what it can access, and how to verify the result.'
              : 'The builder has not made a package available yet.'}
          </p>
        </section>{/if}
    </section>
    <aside class="builder-panel purchase-panel">
      <p class="eyebrow">{data.owner ? 'BUYER PREVIEW' : 'SELECTED RELEASE'}</p>
      <h2>{assetPrice(data.asset.price_cents)}{data.asset.price_cents ? ' USD' : ''}</h2>
      <p>
        One release. Its included files and the license shown here. Network sessions and future
        releases are separate.
      </p>
      {#if release?.entitled}<a
          class="button"
          href={`/api/networks/${data.network!.slug}/assets/${data.asset.id}/download?release=${release.id}`}
          >Download v{release.version} <Icon name="download" /></a
        >
        <p class="muted">SHA-256</p>
        <code class="checksum">{release.sha256}</code>
      {:else if !data.identity}<a
          class="button"
          href={`/signup?next=${encodeURIComponent(`/n/${data.network!.slug}/assets/${data.asset.id}`)}`}
          >Create account to continue <Icon name="arrow-right" /></a
        >
        <p class="muted">
          Already a member? <a
            href={`/login?next=${encodeURIComponent(`/n/${data.network!.slug}/assets/${data.asset.id}`)}`}
            >Sign in</a
          >. We’ll bring you back to this asset.
        </p>
      {:else if release && data.commerceReady && data.asset.visibility === 'published' && !data.owner}
        <label class="license-consent"
          ><input type="checkbox" bind:checked={acceptLicense} /> I have reviewed and accept this release’s
          license and the builder’s refund policy.</label
        >
        <p class="muted">
          {#if data.asset.price_cents}
            Sold by the builder of {data.network!.name}. Taxes are calculated at checkout. You pay
            the builder directly; contact them for payment support.
          {:else}
            A free release from {data.network!.name}. Add this version to your collection to access
            its package and installation instructions. No payment details are needed.
          {/if}
        </p>
        <button
          class="button"
          disabled={purchaseBusy || !acceptLicense}
          onclick={() => purchase('acquire')}
          >{purchaseBusy
            ? 'Confirming…'
            : data.asset.price_cents
              ? `Buy v${release.version} · ${assetPrice(data.asset.price_cents)}`
              : 'Add release to collection'}
          <Icon name="arrow-right" /></button
        >
      {:else}<p class="availability" role="status">
          This release is not available to acquire yet.
        </p>{/if}
      {#if data.identity && !data.owner && release}<button
          class="button secondary"
          disabled={purchaseBusy}
          onclick={() => purchase('check')}>{purchaseBusy ? 'Checking…' : 'Check purchase'}</button
        >{/if}
      {#if purchaseMessage}<p class="availability" role="status">{purchaseMessage}</p>{/if}
      {#if data.owner}<p class="muted">
          {data.commerceReady
            ? 'Publish only when the release and its support policy are ready for buyers.'
            : 'Publishing is awaiting activation and delivery acceptance. Your drafts remain private.'}
          {#if data.asset.price_cents > 0}<a href={`/n/${data.network!.slug}/seller`}
              >Set up seller payments <Icon name="arrow-right" /></a
            >{/if}
        </p>{/if}
      <a href="/collection">Your collection <Icon name="arrow-right" /></a>
    </aside>
  </div>
  {#if data.owner}<section class="builder-split">
      <div>
        <p class="eyebrow">01 / SHAPE THE OFFER</p>
        <h2>Be clear about<br /><em>what it does.</em></h2>
        <p>
          Make the outcome specific. Buyers should understand the technique, intended runtime and
          scope before they purchase.
        </p>
      </div>
      <form class="builder-form" onsubmit={saveDetails}>
        <label>Asset name<input bind:value={draft.title} maxlength="100" required /></label><label
          >What does it help a builder do?<textarea
            bind:value={draft.summary}
            maxlength="1000"
            required
          ></textarea></label
        ><label
          >Package type<select bind:value={draft.kind}
            >{#each Object.entries(assetKinds) as [value, label]}<option {value}>{label}</option
              >{/each}</select
          ></label
        ><label>Price in USD<input bind:value={draft.price} inputmode="decimal" required /></label
        ><label
          >Audience<select bind:value={draft.audience}
            ><option value="members">Invited members</option><option value="public"
              >Public when the network allows previews</option
            ></select
          ></label
        ><label
          >Listing state<select bind:value={draft.visibility}
            ><option value="draft">Private draft</option><option value="archived">Archived</option
            ></select
          ></label
        >
        <p class="muted">
          Archiving removes a listing; acquired releases remain in buyers’ collections. Release
          files and licenses cannot be overwritten.
        </p>
        <button class="button" disabled={busy}>{busy ? 'Saving…' : 'Save asset details'}</button>
      </form>
    </section>
    <section class="builder-split">
      <div>
        <p class="eyebrow">02 / MAKE IT REPRODUCIBLE</p>
        <h2>A release someone<br /><em>can actually use.</em></h2>
        <p>
          Upload a ZIP up to 16 MiB. Include the package, documentation and license. Five immutable
          releases per asset: a new version never replaces a buyer’s existing files.
        </p>
        {#if !data.storageReady}<p class="availability">
            Private package storage is awaiting configuration. Asset drafts are saved; uploading
            will become available when storage is connected.
          </p>{/if}
      </div>
      <form class="builder-form" onsubmit={upload}>
        <label
          >Version<input
            bind:value={version}
            required
            pattern="[0-9]+\.[0-9]+\.[0-9]+"
            placeholder="1.0.0"
          /></label
        ><label
          >ZIP package<input type="file" accept=".zip,application/zip" bind:files required /></label
        >{#each fields as field}<label
            >{field.label}<textarea
              bind:value={manifest[field.key]}
              required
              maxlength={['install', 'license'].includes(field.key) ? 4000 : 1500}
              aria-describedby={`hint-${field.key}`}
            ></textarea><span id={`hint-${field.key}`} class="field-hint">{field.hint}</span></label
          >{/each}{#if message}<p role="status" class="availability">{message}</p>{/if}<button
          class="button"
          disabled={busy || !data.storageReady || data.releases.length >= 5}
          >{busy ? 'Saving…' : 'Save private release'} <Icon name="upload" /></button
        ><button
          class="button secondary"
          type="button"
          disabled={busy || !data.storageReady}
          onclick={recover}>Recover uploads</button
        >
      </form>
    </section>{/if}
</main>

<style>
  .license-consent {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 13px;
    margin: 24px 0;
  }
  .license-consent input {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .purchase-panel button {
    margin: 8px 0;
  }
</style>
