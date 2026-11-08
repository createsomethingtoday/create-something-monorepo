import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import { List, ListItem as AstryxListItem } from '@astryxdesign/core/List';
import { Link } from '@astryxdesign/core/Link';
import {
  B,
  Field,
  Choice,
  Panel,
  Message,
  Disclosure,
  PageHeading,
  Heading,
  Text,
  VStack,
  HStack
} from './components.jsx';
import { imageUrl, provenanceLabel } from '../web/artwork.mjs';
import { socialDraftIssues, socialErrorMessage, socialReceiptCopy } from '../web/social.mjs';
import {
  sourceCanBegin,
  pendingConsentForProvider,
  pendingAccountForProvider,
  sourceNeedsOperatorReview
} from '../web/model.mjs';
import { targetDescription } from '../web/event-identity.mjs';

const messageOf = (error) => (error instanceof Error ? error.message : String(error));
const owned = (task) => (event) => {
  event?.stopPropagation?.();
  return task(event);
};
const ListItem = ({ children, ...props }) => <AstryxListItem {...props} label={children} />;
const kinds = {
  audio: 'Audio',
  video: 'Music video',
  project: 'Project file',
  other: 'Other / unsupported'
};
const fileSize = (bytes) =>
  !Number.isFinite(bytes)
    ? 'Size unknown'
    : bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function useConfirmation() {
  const [request, setRequest] = useState(null);
  const pending = useRef(null);
  const ask = (message, options = {}) =>
    pending.current
      ? Promise.resolve(false)
      : new Promise((resolve) => {
          pending.current = resolve;
          setRequest({ message, ...options });
        });
  const finish = (value) => {
    const resolve = pending.current;
    pending.current = null;
    setRequest(null);
    resolve?.(value);
  };
  useEffect(
    () => () => {
      pending.current?.(false);
      pending.current = null;
    },
    []
  );
  return [
    ask,
    request ? (
      <Dialog
        isOpen
        purpose="form"
        onOpenChange={() => finish(false)}
        aria-labelledby="creator-confirm-title"
      >
        <VStack gap={4}>
          <Heading level={2} id="creator-confirm-title">
            {request.title || 'Confirm action'}
          </Heading>
          <Text>{request.message}</Text>
          <HStack gap={2}>
            <B onClick={owned(() => finish(false))}>{request.cancelLabel || 'Keep editing'}</B>
            <B primary onClick={owned(() => finish(true))}>
              {request.acceptLabel || 'Continue'}
            </B>
          </HStack>
        </VStack>
      </Dialog>
    ) : null
  ];
}

export function ArtworkImage({ asset, original = false, alt }) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(asset, original);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed)
    return <Text color="secondary">Image unavailable. The record is still saved.</Text>;
  return (
    <VStack gap={2}>
      <img
        className={original ? 'gigi-artwork-original' : 'gigi-artwork-image'}
        src={src}
        alt={alt || asset.alt || 'Saved artwork'}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <Text type="supporting" color="secondary">
        {provenanceLabel(asset)}
      </Text>
    </VStack>
  );
}

function SavedArtworkPicker({ ctx, isOpen, onClose, onSelect }) {
  const [state, setState] = useState({ items: [], nextOffset: null, loading: true, error: '' });
  const generation = useRef(0);
  const load = async (offset = 0) => {
    const revision = ++generation.current;
    setState((old) => ({ ...old, loading: true, error: '' }));
    try {
      const result = await ctx.bridge.call('media.list', { workspaceId: ctx.workspaceId, offset });
      if (revision !== generation.current) return;
      setState((old) => ({
        items: offset ? [...old.items, ...result.items] : result.items,
        nextOffset: result.nextOffset,
        loading: false,
        error: ''
      }));
    } catch (error) {
      if (revision === generation.current)
        setState((old) => ({ ...old, loading: false, error: messageOf(error) }));
    }
  };
  useEffect(() => {
    if (isOpen) void load();
    return () => {
      generation.current++;
    };
  }, [isOpen, ctx.workspaceId]);
  return (
    <Dialog
      isOpen={isOpen}
      purpose="form"
      onOpenChange={onClose}
      aria-labelledby="saved-artwork-title"
    >
      <VStack gap={4}>
        <Heading level={2} id="saved-artwork-title">
          Choose saved artwork
        </Heading>
        <Text color="secondary">
          Images stay on this Mac. Reuse artwork added to an event or music entry.
        </Text>
        {state.loading && <Text role="status">Loading saved artwork…</Text>}
        {state.error && <Message error>{state.error}</Message>}
        <List hasDividers>
          {state.items.map((asset) => (
            <ListItem key={asset.assetId}>
              <VStack gap={2}>
                <ArtworkImage asset={asset} />
                <Text type="supporting">
                  {asset.width} × {asset.height}
                </Text>
                <B onClick={owned(() => onSelect(asset))}>Choose this artwork</B>
              </VStack>
            </ListItem>
          ))}
        </List>
        {!state.loading && !state.items.length && !state.error && (
          <Text>No saved artwork yet. Add an image to an event or music entry first.</Text>
        )}
        {state.nextOffset != null && (
          <B disabled={state.loading} onClick={owned(() => load(state.nextOffset))}>
            More artwork
          </B>
        )}
        {state.error && <B onClick={owned(() => load())}>Retry loading artwork</B>}
        <B onClick={owned(onClose)}>Cancel</B>
      </VStack>
    </Dialog>
  );
}

/** Actual Astryx artwork dialog, shared by Music and record detail surfaces. */
export function ArtworkManager({ ctx, entity, item, onChanged = () => {}, disabled = false }) {
  const [open, setOpen] = useState(false),
    [full, setFull] = useState(null),
    [picker, setPicker] = useState(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [pending, setPending] = useState(null);
  const [form, setForm] = useState({
    alt: item.cover?.alt || '',
    purpose: 'artwork',
    rights: 'unknown',
    sourceUrl: '',
    creator: ''
  });
  const [confirm, confirmation] = useConfirmation();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const invoke = (operation, input = {}) =>
    ctx.bridge.call(operation, {
      workspaceId: ctx.workspaceId,
      entity,
      id: item.id,
      expectedRevision: Number(item.coverRevision) || 0,
      ...input
    });
  const changed = async () => {
    await onChanged();
    if (alive.current) {
      setOpen(false);
      setPending(null);
    }
  };
  const run = async (operation, input = {}) => {
    if (disabled || busy || pending) return;
    const request = { operation, requestId: crypto.randomUUID() };
    setBusy(true);
    setPending(request);
    setNotice('');
    try {
      const result = await invoke(operation, { requestId: request.requestId, ...input });
      if (!alive.current) return;
      setPending(null);
      if (result.cancelled) setNotice('Image selection cancelled. Nothing saved.');
      else await changed();
    } catch (error) {
      if (alive.current)
        setNotice(`${messageOf(error)} Check the original save before another image change.`);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const check = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const result = await ctx.bridge.call('media.operationStatus', {
        workspaceId: ctx.workspaceId,
        requestId: pending.requestId,
        operation: pending.operation === 'media.import' ? 'import' : 'attach'
      });
      if (result.state === 'completed') await changed();
      else
        setNotice(
          'Outcome remains unverified. Close and inspect the target before a deliberate new change.'
        );
    } catch (error) {
      setNotice(messageOf(error));
    } finally {
      setBusy(false);
    }
  };
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const choose = async (asset) => {
    const mode = picker;
    setPicker(null);
    if (mode === 'cleanup') {
      if (
        await confirm('Remove this unused saved image from GiGi? The original file is unchanged.', {
          title: 'Remove saved image?',
          acceptLabel: 'Remove image'
        })
      ) {
        try {
          await ctx.bridge.call('media.removeUnused', {
            workspaceId: ctx.workspaceId,
            assetId: asset.assetId
          });
          setNotice('Unused saved image removed. Its original file is unchanged.');
        } catch (error) {
          setNotice(messageOf(error));
        }
      }
    } else await run('media.attach', { assetId: asset.assetId, alt: form.alt });
  };
  const viewFull = async () => {
    try {
      setFull(
        await ctx.bridge.call('media.get', {
          workspaceId: ctx.workspaceId,
          assetId: item.cover.assetId
        })
      );
    } catch (error) {
      ctx.actions.notice(messageOf(error), true);
    }
  };
  return (
    <VStack gap={3} data-creator-owned="true">
      {item.cover && (
        <>
          <ArtworkImage asset={item.cover} />
          <B onClick={owned(viewFull)}>View full artwork</B>
        </>
      )}
      <B
        disabled={disabled || busy}
        onClick={owned(() => {
          setForm((old) => ({ ...old, alt: item.cover?.alt || '' }));
          setNotice('');
          setOpen(true);
        })}
      >
        {item.cover ? 'Change artwork' : 'Add artwork'}
      </B>
      <Dialog
        isOpen={open}
        purpose={busy ? 'required' : 'form'}
        onOpenChange={() => {
          if (!busy) setOpen(false);
        }}
        aria-labelledby={`artwork-title-${item.id}`}
      >
        <VStack gap={4}>
          <Heading level={2} id={`artwork-title-${item.id}`}>
            Flyer & artwork
          </Heading>
          <Text>
            <strong>Selected record: </strong>
            {targetDescription(item, entity)}
          </Text>
          <Text color="secondary">
            Check this title, kind and date before choosing artwork. An unclassified gig is not a
            confirmed performance.
          </Text>
          <Text>
            One local JPEG or PNG, up to 8 MiB and 24 megapixels. Nothing is uploaded. Generated
            illustrations stay distinct from supplied flyers.
          </Text>
          <form
            onSubmit={owned((event) => {
              event.preventDefault();
              if (!form.alt.trim())
                return setNotice('Add an image description before choosing a file.');
              void run('media.import', {
                mode: 'picker',
                alt: form.alt,
                provenance: {
                  origin: 'supplied',
                  purpose: form.purpose,
                  rights: form.rights,
                  ...(form.sourceUrl ? { sourceUrl: form.sourceUrl } : {}),
                  ...(form.creator ? { creator: form.creator } : {})
                }
              });
            })}
          >
            <VStack gap={3}>
              <Field
                label="Image description"
                textarea
                value={form.alt}
                onChange={(value) => update('alt', value)}
                required
                maxLength={500}
                disabled={busy || Boolean(pending)}
              />
              <Choice
                label="Image type"
                value={form.purpose}
                onChange={(value) => update('purpose', value)}
                options={[
                  ['artwork', 'Supplied artwork'],
                  ['official_flyer', 'Official flyer · user supplied'],
                  ['illustration', 'Supplied illustration']
                ]}
                disabled={busy || Boolean(pending)}
              />
              <Choice
                label="Rights"
                value={form.rights}
                onChange={(value) => update('rights', value)}
                options={[
                  ['unknown', 'Unknown · local reference'],
                  ['owned', 'I own this artwork'],
                  ['licensed', 'Licensed'],
                  ['permission', 'Permission obtained']
                ]}
                disabled={busy || Boolean(pending)}
              />
              <Field
                label="Source URL"
                type="url"
                value={form.sourceUrl}
                onChange={(value) => update('sourceUrl', value)}
                disabled={busy || Boolean(pending)}
              />
              <Field
                label="Creator / credit"
                value={form.creator}
                onChange={(value) => update('creator', value)}
                disabled={busy || Boolean(pending)}
              />
              {notice && <Message>{notice}</Message>}
              <HStack gap={2} wrap="wrap">
                <B primary type="submit" disabled={busy || Boolean(pending)}>
                  Choose image file
                </B>
                <B
                  disabled={busy || Boolean(pending) || !form.alt.trim()}
                  onClick={owned(() => setPicker('reuse'))}
                >
                  Reuse saved artwork
                </B>
                <B
                  danger
                  disabled={busy || Boolean(pending)}
                  onClick={owned(() => run('media.attach', { assetId: null }))}
                >
                  Remove cover
                </B>
                {pending && (
                  <B disabled={busy} onClick={owned(check)}>
                    Check last save
                  </B>
                )}
                <B disabled={busy} onClick={owned(() => setOpen(false))}>
                  Close
                </B>
              </HStack>
            </VStack>
          </form>
          <Disclosure title="Storage and backups">
            <Text>
              Images are copied into this workspace and its database backups. Original files stay
              unchanged. The workspace holds at most 100 images or 128 MiB including previews.
            </Text>
            <B disabled={busy || Boolean(pending)} onClick={owned(() => setPicker('cleanup'))}>
              Remove unused saved image
            </B>
          </Disclosure>
        </VStack>
      </Dialog>
      <SavedArtworkPicker
        ctx={ctx}
        isOpen={Boolean(picker)}
        onClose={() => setPicker(null)}
        onSelect={choose}
      />
      <Dialog
        isOpen={Boolean(full)}
        onOpenChange={() => setFull(null)}
        aria-labelledby="full-artwork-title"
      >
        <VStack gap={3}>
          <Heading level={2} id="full-artwork-title">
            Artwork
          </Heading>
          {full && (
            <>
              <ArtworkImage asset={full} original />
              <Text>
                {provenanceLabel(full)} · Rights: {full.provenance?.rights || 'Unknown'}
              </Text>
              {full.provenance?.sourceUrl && <Text>Source: {full.provenance.sourceUrl}</Text>}
            </>
          )}
          <B onClick={owned(() => setFull(null))}>Close</B>
        </VStack>
      </Dialog>
      {confirmation}
    </VStack>
  );
}

export function Music({ ctx }) {
  const state = useRef({
    items: [],
    total: 0,
    offset: 0,
    hasMore: false,
    query: '',
    kind: '',
    busy: false,
    loading: true,
    notice: '',
    error: '',
    editing: null,
    dirty: false,
    importRequest: null,
    preview: null,
    previewStatus: ''
  }).current;
  const [, paint] = useState(0),
    alive = useRef(true),
    revision = useRef(0),
    mediaRef = useRef(null),
    host = useRef(null);
  const [confirm, confirmation] = useConfirmation();
  const render = () => {
    if (alive.current) paint((value) => value + 1);
  };
  const invoke = (operation, input = {}) =>
    ctx.bridge.call(operation, { workspaceId: ctx.workspaceId, ...input });
  const canLeave = async () =>
    !state.dirty ||
    (await confirm('Discard unsaved music organization changes?', {
      title: 'Discard changes?',
      acceptLabel: 'Discard changes'
    }));
  const stop = (restoreFocus = false) => {
    const previewId = state.preview?.id;
    const media = mediaRef.current;
    if (media) {
      media.pause();
      media.removeAttribute('src');
      media.load();
    }
    state.preview = null;
    render();
    if (restoreFocus && previewId)
      requestAnimationFrame(() => {
        [...(host.current?.querySelectorAll('[data-music-preview]') || [])]
          .find((button) => button.dataset.musicPreview === previewId)
          ?.focus();
      });
  };
  const load = async (offset = state.offset) => {
    const current = ++revision.current;
    state.loading = true;
    state.error = '';
    render();
    try {
      const result = await invoke('music.list', { query: state.query, kind: state.kind, offset });
      if (!alive.current || current !== revision.current) return;
      Object.assign(state, result, { offset, error: '' });
    } catch (error) {
      if (alive.current && current === revision.current) {
        state.error = messageOf(error);
        state.notice = '';
      }
    } finally {
      if (alive.current && current === revision.current) {
        state.loading = false;
        render();
      }
    }
  };
  const action = async (task) => {
    if (state.busy || !alive.current) return;
    state.busy = true;
    state.error = '';
    state.notice = '';
    render();
    try {
      await task();
    } catch (error) {
      if (alive.current) state.error = messageOf(error);
    } finally {
      if (alive.current) {
        state.busy = false;
        render();
      }
    }
  };
  const receipt = (result) =>
    result.cancelled
      ? 'Import cancelled. No new entries saved.'
      : `Added ${result.added} ${result.added === 1 ? 'entry' : 'entries'}. ${result.duplicates || 0} duplicates and ${result.skipped || 0} unreadable or excluded entries skipped.${result.limited ? ' The import or library limit was reached; select a smaller folder for the remaining files.' : ''} Nothing uploaded.`;
  const importFiles = async (mode) => {
    if (state.importRequest || !(await canLeave())) return;
    state.editing = null;
    state.dirty = false;
    const request = (state.importRequest = { requestId: crypto.randomUUID(), mode });
    await action(async () => {
      const result = await invoke('music.import', request);
      if (!alive.current) return;
      state.notice = receipt(result);
      state.importRequest = null;
      state.offset = 0;
      await load();
    });
  };
  const recoverImport = () =>
    action(async () => {
      const result = await invoke('music.importStatus', {
        requestId: state.importRequest.requestId
      });
      if (result.state === 'completed') {
        state.notice = receipt(result.receipt);
        state.importRequest = null;
        state.offset = 0;
        await load();
      } else
        state.notice =
          'The import outcome is not verified. Check again before starting another import; no picker was reopened.';
    });
  const cancelImport = async () => {
    try {
      await invoke('music.cancel', { requestId: state.importRequest.requestId });
      state.notice = 'Cancellation requested. Waiting for the import receipt.';
    } catch (error) {
      state.error = messageOf(error);
    }
    render();
  };
  const preview = (item) =>
    action(async () => {
      const result = await invoke('music.preview', { id: item.id });
      stop();
      state.preview = { ...result, id: item.id };
      state.previewStatus = 'Local preview. Playback depends on this Mac’s codec support.';
      render();
    });
  useEffect(() => {
    alive.current = true;
    const dispose = () => {
      alive.current = false;
      revision.current++;
      if (state.importRequest)
        void invoke('music.cancel', { requestId: state.importRequest.requestId }).catch(() => {});
      const media = mediaRef.current;
      if (media) {
        media.pause();
        media.removeAttribute('src');
        media.load();
      }
    };
    ctx.actions.setCreatorMount?.({ canLeave, dispose });
    void load();
    const refresh = () => {
      if (alive.current && !state.busy && !state.dirty && !state.editing) void load();
    };
    window.addEventListener('focus', refresh);
    return () => {
      dispose();
      window.removeEventListener('focus', refresh);
    };
  }, [ctx.workspaceId]);
  useEffect(() => {
    if (!state.preview) return;
    const media = mediaRef.current;
    media?.focus();
    media?.play()?.catch(() => {
      state.previewStatus =
        'Press Play to start. If playback fails, this format or codec may not be supported.';
      render();
    });
  }, [state.preview]);
  useEffect(() => {
    if (state.editing) host.current?.querySelector('#music-edit-title')?.focus();
  }, [state.editing?.id]);
  const changeEdit = (key, value) => {
    state.editing = { ...state.editing, [key]: value };
    state.dirty = true;
    render();
  };
  return (
    <section
      ref={host}
      data-creator-owned="true"
      aria-label="Local music library"
      aria-busy={state.loading || state.busy}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && state.preview) {
          event.preventDefault();
          event.stopPropagation();
          stop(true);
        }
      }}
    >
      <VStack gap={5}>
        <PageHeading
          title="Your music"
          description="Works in progress, reference tracks, and music videos."
          actions={
            <>
              <B
                primary
                disabled={state.busy || Boolean(state.importRequest)}
                onClick={owned(() => importFiles('files'))}
              >
                Add files
              </B>
              <B
                disabled={state.busy || Boolean(state.importRequest)}
                onClick={owned(() => importFiles('folder'))}
              >
                Add folder
              </B>
            </>
          }
        />
        <Text color="secondary">
          Originals stay in place. Media and organization are not uploaded. This workspace saves
          local file references; moved files need reconnection. Backups include this index and
          artwork, but not the original audio, video or project files.
        </Text>
        {state.preview && (
          <Panel
            title={state.preview.title}
            actions={<B onClick={owned(() => stop(true))}>Close preview</B>}
          >
            {state.preview.kind === 'video' ? (
              <video
                ref={mediaRef}
                controls
                preload="metadata"
                src={`gigi-media://localhost/${encodeURIComponent(ctx.workspaceId)}/${encodeURIComponent(state.preview.id)}`}
                aria-label={`Local preview of ${state.preview.title}`}
                onError={() => {
                  state.previewStatus =
                    'This media cannot be played here. It may use an unsupported codec or be unavailable. Reconnect the original, or open it in its own application.';
                  render();
                }}
              />
            ) : (
              <audio
                ref={mediaRef}
                controls
                preload="metadata"
                src={`gigi-media://localhost/${encodeURIComponent(ctx.workspaceId)}/${encodeURIComponent(state.preview.id)}`}
                aria-label={`Local preview of ${state.preview.title}`}
                onError={() => {
                  state.previewStatus =
                    'This media cannot be played here. Reconnect the original, or open it in its own application.';
                  render();
                }}
              />
            )}
            <Text role="status">{state.previewStatus}</Text>
          </Panel>
        )}
        {(state.loading || state.notice || state.busy) && (
          <Message>
            {state.loading ? 'Loading your local music…' : state.busy ? 'Working…' : state.notice}
          </Message>
        )}
        {state.importRequest && (
          <HStack gap={2}>
            <B onClick={owned(cancelImport)}>Cancel import</B>
            <B disabled={state.busy} onClick={owned(recoverImport)}>
              Check import receipt
            </B>
          </HStack>
        )}
        {state.error && (
          <>
            <Message error>{state.error}</Message>
            <B disabled={state.busy} onClick={owned(() => load())}>
              Retry loading
            </B>
          </>
        )}
        {state.editing && (
          <Panel title={`Organize ${state.editing.title}`}>
            <form
              id="music-edit-form"
              onSubmit={owned((event) => {
                event.preventDefault();
                void action(async () => {
                  const edit = state.editing;
                  await invoke('music.edit', {
                    id: edit.id,
                    expectedRevision: edit.organizationRevision,
                    ...Object.fromEntries(
                      ['title', 'artist', 'project', 'version', 'collection', 'tags'].map((key) => [
                        key,
                        edit[key] || ''
                      ])
                    )
                  });
                  if (!alive.current) return;
                  state.editing = null;
                  state.dirty = false;
                  state.notice = 'Organization saved in this workspace.';
                  await load();
                });
              })}
            >
              <VStack gap={4}>
                <section className="gigi-form-grid">
                  {[
                    ['title', 'Title'],
                    ['artist', 'Artist / collaborator'],
                    ['project', 'Project'],
                    ['version', 'Version (e.g. Mix 03)'],
                    ['collection', 'Collection'],
                    ['tags', 'Tags']
                  ].map(([key, label]) => (
                    <Field
                      key={key}
                      id={`music-edit-${key}`}
                      name={key}
                      label={label}
                      value={state.editing[key] || ''}
                      required={key === 'title'}
                      maxLength={1000}
                      disabled={state.busy}
                      onChange={(value) => changeEdit(key, value)}
                    />
                  ))}
                </section>
                <Text color="secondary">
                  Use the same project name for related bounces and session files. Versions label
                  separately imported files; GiGi never edits your DAW project.
                </Text>
                {state.dirty && <Text role="status">Unsaved organization changes.</Text>}
                <HStack gap={2}>
                  <B primary type="submit" disabled={state.busy}>
                    Save organization
                  </B>
                  <B
                    disabled={state.busy}
                    onClick={owned(async () => {
                      if (await canLeave()) {
                        state.editing = null;
                        state.dirty = false;
                        render();
                      }
                    })}
                  >
                    Cancel
                  </B>
                </HStack>
              </VStack>
            </form>
          </Panel>
        )}
        <form
          id="music-search-form"
          onSubmit={owned((event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(event.currentTarget));
            void (async () => {
              if (!(await canLeave())) return;
              state.editing = null;
              state.dirty = false;
              state.query = String(data.query || '');
              state.kind = String(data.kind || '');
              state.offset = 0;
              await load();
            })();
          })}
        >
          <HStack gap={3} wrap="wrap">
            <Field
              id="music-query"
              name="query"
              label="Search"
              type="search"
              defaultValue={state.query}
              placeholder="Title, artist, project, collection or tags"
            />
            <Choice
              id="music-kind"
              name="kind"
              label="Media"
              value={state.kind}
              options={[['', 'All media'], ...Object.entries(kinds)]}
            />
            <B type="submit" disabled={state.busy}>
              Search
            </B>
          </HStack>
        </form>
        {Boolean(state.total) && (
          <Text color="secondary">
            {state.offset + 1}–{Math.min(state.offset + state.items.length, state.total)} of{' '}
            {state.total} matching entries
          </Text>
        )}
        {!state.items.length && !state.loading && !state.error ? (
          <Panel
            title={
              state.query || state.kind
                ? 'Nothing matches this view'
                : 'Make room for your next idea'
            }
          >
            <Text>
              {state.query || state.kind
                ? 'Change the search or media filter.'
                : 'Add a demo, a final bounce, a session file or an MP4. Organize related files under a project and label each version. Collections keep listening references together.'}
            </Text>
            <B
              primary={!state.query && !state.kind}
              disabled={state.busy || Boolean(state.importRequest)}
              onClick={owned(async () => {
                if (state.query || state.kind) {
                  if (!(await canLeave())) return;
                  state.editing = null;
                  state.dirty = false;
                  state.query = '';
                  state.kind = '';
                  state.offset = 0;
                  await load();
                } else await importFiles('files');
              })}
            >
              {state.query || state.kind ? 'Clear filters' : 'Add your first files'}
            </B>
          </Panel>
        ) : (
          <List hasDividers edge="flush">
            {state.items.map((item) => {
              const available = item.availability === 'available',
                playable = item.previewable !== false && ['audio', 'video'].includes(item.kind),
                disabled = state.busy || Boolean(state.editing);
              return (
                <ListItem key={item.id}>
                  <article>
                    <VStack gap={3}>
                      <Heading level={3}>{item.title}</Heading>
                      <Text>
                        {[
                          kinds[item.kind] || kinds.other,
                          item.artist,
                          item.project,
                          item.collection,
                          item.version
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                      <Text type="supporting" color="secondary">
                        {item.filename} · {fileSize(item.bytes)}
                        {item.tags ? ` · ${item.tags}` : ''}
                      </Text>
                      <Text type="supporting">
                        {available
                          ? playable
                            ? 'Available on this Mac'
                            : 'Indexed · no in-app preview'
                          : item.availability === 'changed'
                            ? 'Original changed · add as a new version'
                            : 'Original unavailable · reconnect'}
                      </Text>
                      <HStack gap={2} wrap="wrap">
                        {available && playable && (
                          <B
                            disabled={disabled}
                            data-music-preview={item.id}
                            onClick={owned(() => preview(item))}
                          >
                            Preview
                          </B>
                        )}
                        <B
                          disabled={disabled}
                          onClick={owned(async () => {
                            if (await canLeave()) {
                              state.editing = { ...item };
                              state.dirty = false;
                              render();
                            }
                          })}
                        >
                          Organize
                        </B>
                        <B
                          disabled={disabled}
                          primary={!available}
                          onClick={owned(() =>
                            action(async () => {
                              const result = await invoke('music.reconnect', { id: item.id });
                              state.notice = result.cancelled
                                ? 'Reconnect cancelled.'
                                : 'Original reconnected. Nothing uploaded.';
                              await load();
                            })
                          )}
                        >
                          {available ? 'Reconnect original' : 'Reconnect'}
                        </B>
                        <B
                          danger
                          disabled={disabled}
                          onClick={owned(async () => {
                            if (
                              await confirm(
                                `Remove “${item.title}” from this library? The original file remains untouched.`,
                                {
                                  title: 'Remove library entry?',
                                  acceptLabel: 'Remove entry',
                                  cancelLabel: 'Keep entry'
                                }
                              )
                            )
                              await action(async () => {
                                await invoke('music.remove', { id: item.id });
                                stop();
                                state.notice = 'Removed library entry. Original file unchanged.';
                                await load();
                              });
                          })}
                        >
                          Remove entry
                        </B>
                      </HStack>
                      <ArtworkManager
                        ctx={ctx}
                        entity="music"
                        item={item}
                        disabled={disabled}
                        onChanged={() => load()}
                      />
                    </VStack>
                  </article>
                </ListItem>
              );
            })}
          </List>
        )}
        {(state.offset > 0 || state.hasMore) && (
          <nav aria-label="Music pages">
            <HStack gap={2}>
              <B
                disabled={!state.offset || state.busy}
                onClick={owned(async () => {
                  if (await canLeave()) {
                    state.editing = null;
                    state.dirty = false;
                    await load(Math.max(0, state.offset - 100));
                  }
                })}
              >
                Previous
              </B>
              <B
                disabled={!state.hasMore || state.busy}
                onClick={owned(async () => {
                  if (await canLeave()) {
                    state.editing = null;
                    state.dirty = false;
                    await load(state.offset + 100);
                  }
                })}
              >
                Next
              </B>
            </HStack>
          </nav>
        )}
        <Text type="supporting" color="secondary">
          Each import indexes up to 1,000 selected entries; this workspace holds up to 10,000.
          Hidden files and symbolic links are skipped. Project files are references, not editable
          sessions.
        </Text>
        {confirmation}
      </VStack>
    </section>
  );
}

const instagramLink = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      ['www.instagram.com', 'instagram.com'].includes(url.hostname) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
};

export function Social({ ctx }) {
  const state = useRef({
    items: [],
    selected: null,
    editor: null,
    total: 0,
    nextOffset: null,
    account: null,
    loading: false,
    busy: false,
    dirty: false,
    message: null,
    confirming: false,
    setupOpen: false,
    connection: null,
    connectionAttempt: null,
    connectionRequestId: null,
    preview: null,
    validationMode: null,
    fieldIssue: null,
    pendingSave: null
  }).current;
  const [, paint] = useState(0),
    alive = useRef(true),
    host = useRef(null);
  const [confirm, confirmation] = useConfirmation(),
    [picker, setPicker] = useState(false);
  const render = () => {
    if (alive.current) paint((value) => value + 1);
  };
  const invoke = (operation, input = {}) =>
    ctx.bridge.call(operation, { workspaceId: ctx.workspaceId, ...input });
  const select = (record) => {
    state.selected = record;
    state.editor = {
      ...record.body,
      ...(record.imageSnapshot ? { imageSnapshot: record.imageSnapshot } : {})
    };
    state.dirty = false;
    state.confirming = false;
    state.pendingSave = null;
    state.validationMode = null;
    state.fieldIssue = null;
  };
  const list = async (offset = 0) => {
    const page = await invoke('social.list', { offset });
    if (!alive.current) return;
    state.items = offset ? [...state.items, ...page.items] : page.items;
    state.total = page.total;
    state.nextOffset = page.nextOffset;
  };
  const refresh = async () => {
    await list();
    if (state.selected) {
      const record = await invoke('social.get', { id: state.selected.id });
      if (alive.current) select(record);
    }
  };
  const act = async (task) => {
    if (state.busy || !alive.current) return;
    state.busy = true;
    state.message = null;
    render();
    try {
      await task();
    } catch (error) {
      if (alive.current) state.message = socialErrorMessage(error);
    } finally {
      if (alive.current) {
        state.busy = false;
        render();
      }
    }
  };
  const canLeave = async () =>
    !state.busy &&
    (!state.dirty ||
      (await confirm(
        state.pendingSave
          ? 'The last save is unverified. Leave and check saved drafts before creating another copy?'
          : 'Discard unsaved changes? The saved draft stays unchanged.',
        { title: 'Leave this draft?', acceptLabel: 'Discard changes' }
      )));
  const checkConnection = async () => {
    const source = await ctx.bridge.call('connections.status', { provider: 'instagram' });
    if (!alive.current) return;
    state.connection = source;
    const id = source.connectedAccountId;
    if (!id || source.state !== 'connected') {
      state.account = null;
      state.message =
        'Instagram is not verified. Open Connection setup to connect or reconcile the existing attempt.';
      return;
    }
    state.account = await ctx.bridge.call('instagram.account', { connectedAccountId: id });
  };
  const save = () =>
    act(async () => {
      state.fieldIssue = null;
      state.validationMode = false;
      if (socialDraftIssues(state.editor).length) return;
      const { imageSnapshot, ...editable } = state.editor;
      const request = {
        ...editable,
        ...(state.selected
          ? { id: state.selected.id, expectedRevision: state.selected.revision }
          : {})
      };
      if (state.pendingSave && JSON.stringify(state.pendingSave.body) !== JSON.stringify(request))
        throw Error(
          'The last save is unverified. Retry its exact text or reopen Drafts to check before saving changes.'
        );
      state.pendingSave ||= { body: request, requestId: crypto.randomUUID() };
      const result = await invoke('social.save', {
        ...state.pendingSave.body,
        requestId: state.pendingSave.requestId
      });
      if (!alive.current) return;
      select(result);
      state.message = 'Draft saved locally. Nothing was published.';
      await list();
    });
  const review = () =>
    act(async () => {
      if (state.dirty || !state.selected) throw Error('Save the draft before reviewing.');
      state.fieldIssue = null;
      state.validationMode = true;
      if (socialDraftIssues(state.editor, true).length) return;
      if (
        state.preview?.imageUrl !== state.editor.imageUrl ||
        state.preview?.expectedImageSha256 !== state.editor.expectedImageSha256
      ) {
        state.fieldIssue = {
          field: 'imageUrl',
          message: 'Load the verified preview again before reviewing this saved draft.'
        };
        return;
      }
      await checkConnection();
      if (
        state.selected.approvalRequest?.state === 'pending_user_approval' &&
        state.selected.approvalRequest.instagramAccountId !== state.account?.instagramAccountId
      ) {
        state.fieldIssue = {
          field: 'connectedAccountId',
          message:
            'The agent requested a different Instagram account. Check the intended account before reviewing this request.'
        };
        return;
      }
      if (state.account?.connectedAccountId !== state.editor.connectedAccountId) {
        state.fieldIssue = {
          field: 'connectedAccountId',
          message: 'Verify the draft’s selected account before publishing.'
        };
        return;
      }
      state.confirming = true;
    });
  const publish = () => {
    const selected = state.selected,
      account = state.account;
    if (!state.confirming || state.dirty || !selected || selected.state !== 'draft') return;
    state.confirming = false;
    return act(async () => {
      try {
        const result = await invoke('social.publish', {
          id: selected.id,
          expectedRevision: selected.revision,
          expectedInstagramAccountId: account?.instagramAccountId,
          ...(selected.approvalRequest?.state === 'pending_user_approval'
            ? { approvalRequestId: selected.approvalRequest.id }
            : {}),
          confirmed: true
        });
        if (alive.current) select(result);
      } catch (error) {
        try {
          const current = await invoke('social.get', { id: selected.id });
          if (!alive.current) return;
          select(current);
          state.message =
            current.state === 'draft'
              ? socialErrorMessage(error)
              : 'Publishing outcome needs checking. Read the receipt before taking any further action.';
        } catch {
          state.selected = { ...selected, state: 'unknown', receipt: { state: 'unknown' } };
          state.message =
            'Publishing outcome could not be read. Check the receipt before taking any further action.';
        }
      }
      await list();
    });
  };
  const preview = () =>
    act(async () => {
      const url = state.editor.imageUrl;
      const result = await ctx.bridge.call('instagram.preview', { imageUrl: url });
      if (
        result.imageUrl !== url ||
        !/^[a-f0-9]{64}$/.test(result.expectedImageSha256 || '') ||
        !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(result.dataUrl || '')
      )
        throw Error('The JPEG preview could not be verified.');
      if (!alive.current) return;
      state.fieldIssue = null;
      state.preview = result;
      state.editor.expectedImageSha256 = result.expectedImageSha256;
      if (state.selected?.body.expectedImageSha256 !== result.expectedImageSha256)
        state.dirty = true;
      state.message = state.dirty
        ? 'Image verified. Save this draft to bind this exact image before publishing.'
        : 'Saved image verified. Review the exact post when ready.';
    });
  const setField = (key, value) => {
    state.editor = { ...state.editor, [key]: value };
    if (key === 'imageUrl') {
      state.editor.expectedImageSha256 = '';
      state.preview = null;
    }
    state.dirty = true;
    state.fieldIssue = null;
    render();
  };
  useEffect(() => {
    alive.current = true;
    ctx.actions.setCreatorMount?.({
      canLeave,
      dispose() {
        alive.current = false;
      }
    });
    state.loading = true;
    void list()
      .catch((error) => {
        if (alive.current) state.message = `Drafts could not be loaded: ${messageOf(error)}`;
      })
      .finally(() => {
        state.loading = false;
        render();
      });
    const focus = () => {
      if (alive.current && !state.loading && !state.busy && !state.dirty && !state.confirming)
        void act(refresh);
    };
    window.addEventListener('focus', focus);
    return () => {
      alive.current = false;
      window.removeEventListener('focus', focus);
    };
  }, [ctx.workspaceId]);
  const draft = state.editor,
    saved = state.selected,
    locked = Boolean(saved && saved.state !== 'draft'),
    local = Boolean(draft?.imageAssetId),
    account = state.account;
  const issues = [
    ...(draft && state.validationMode != null
      ? socialDraftIssues(draft, state.validationMode)
      : []),
    ...(state.fieldIssue ? [state.fieldIssue] : [])
  ];
  useEffect(() => {
    if (!issues.length) return;
    const field = host.current?.querySelector(`[data-social-field="${issues[0].field}"]`);
    (field?.type === 'hidden'
      ? field.parentElement.querySelector('[role="combobox"]')
      : field
    )?.focus();
  }, [state.validationMode, state.fieldIssue, state.busy]);
  const errorFor = (key) =>
    issues
      .filter((issue) => issue.field === key)
      .map((issue) => issue.message)
      .join(' ');
  const consent = pendingConsentForProvider(
      state.connection,
      { instagram: state.connectionAttempt },
      'instagram'
    ),
    pendingAccount = pendingAccountForProvider(state.connection, 'instagram');
  return (
    <section
      ref={host}
      data-creator-owned="true"
      aria-label="Instagram drafts"
      onKeyDown={(event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === 's' &&
          state.editor &&
          !state.confirming
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (!state.busy && !locked) void save();
        }
      }}
    >
      <VStack gap={5}>
        <PageHeading
          title="Instagram drafts"
          description="Shape a post here. Saving stays on this Mac; publishing is a separate decision."
          actions={
            <>
              <B
                disabled={state.busy || state.dirty || state.confirming}
                onClick={owned(() => act(refresh))}
              >
                Refresh drafts
              </B>
              <B
                primary
                disabled={state.busy}
                onClick={owned(async () => {
                  if (!(await canLeave())) return;
                  state.pendingSave = null;
                  state.selected = null;
                  state.editor = {
                    title: '',
                    caption: '',
                    imageUrl: '',
                    connectedAccountId: state.account?.connectedAccountId || ''
                  };
                  state.dirty = false;
                  state.validationMode = null;
                  state.fieldIssue = null;
                  render();
                })}
              >
                New draft
              </B>
            </>
          }
        />
        <Panel
          title={
            account
              ? `@${account.username || 'Instagram account'}`
              : 'Instagram connection not verified'
          }
          actions={
            <HStack gap={2}>
              <B disabled={state.busy} onClick={owned(() => act(checkConnection))}>
                Check connection
              </B>
              <B
                onClick={owned(() => {
                  state.setupOpen = !state.setupOpen;
                  render();
                })}
              >
                Connection setup
              </B>
            </HStack>
          }
        >
          <Text color="secondary">
            {account
              ? 'Business / Creator identity verified. Publishing permission is checked when you publish.'
              : 'Drafting needs no connection. Use Connection setup when you are ready to publish.'}
          </Text>
        </Panel>
        {state.setupOpen && (
          <Panel title="Connect Instagram">
            <Text>
              Use a Business or Creator account. Personal accounts are unsupported. You choose
              whether to grant Composio access in the browser; GiGi never adds permissions silently.
            </Text>
            <Message status="warning" title="Review the requested access">
              The existing Instagram connection configuration requests profile access, content
              publishing, messages, comments and insights. GiGi uses only account identity and
              publishing in this workspace; the provider grant is broader. Continue only if you
              approve all requested access.
            </Message>
            <Text color="secondary">
              Sign in to GiGi sources first, then check the Instagram connection.{' '}
              {state.connection
                ? `Status: ${state.connection.state}`
                : 'Status has not been checked.'}
            </Text>
            <HStack gap={2} wrap="wrap">
              <B
                disabled={state.busy}
                onClick={owned(() =>
                  act(async () => {
                    await ctx.bridge.call('auth.login', {});
                    await checkConnection();
                  })
                )}
              >
                Sign in to GiGi sources
              </B>
              {sourceCanBegin(state.connection) && (
                <B
                  disabled={state.busy}
                  onClick={owned(() =>
                    act(async () => {
                      if (!sourceCanBegin(state.connection))
                        throw Error('Check the existing connection before starting consent.');
                      if (
                        !(await confirm(
                          'Start an Instagram connection through Composio? The existing configuration requests profile access, content publishing, messages, comments and insights. GiGi uses only identity and publishing here. Review and approve the full requested access in the browser before granting it.',
                          {
                            title: 'Connect Instagram?',
                            acceptLabel: 'Continue to connection',
                            cancelLabel: 'Cancel'
                          }
                        ))
                      )
                        return;
                      state.connectionRequestId ||= crypto.randomUUID();
                      state.connection = { provider: 'instagram', state: 'pending' };
                      const attempt = await ctx.bridge.call('connections.begin', {
                        provider: 'instagram',
                        requestId: state.connectionRequestId
                      });
                      state.connectionAttempt = attempt;
                      state.connection = {
                        provider: 'instagram',
                        state: 'pending',
                        connectedAccountId: attempt.connectedAccountId
                      };
                      state.message =
                        'Consent prepared. Open the existing consent page, then return to verify the account.';
                    })
                  )}
                >
                  Start Instagram consent
                </B>
              )}
              {consent && (
                <B
                  disabled={state.busy}
                  onClick={owned(() =>
                    act(async () => {
                      const url = pendingConsentForProvider(
                        state.connection,
                        { instagram: state.connectionAttempt },
                        'instagram'
                      );
                      if (!url)
                        throw Error(
                          'Consent URL expired or unavailable. Check status before taking another action.'
                        );
                      await ctx.bridge.call('connections.openConsent', {
                        provider: 'instagram',
                        url
                      });
                      state.message =
                        'Consent page opened. Return here and verify after completing the browser step.';
                    })
                  )}
                >
                  Open existing consent page
                </B>
              )}
              {pendingAccount && !sourceNeedsOperatorReview(state.connection) && (
                <B
                  disabled={state.busy}
                  onClick={owned(() =>
                    act(async () => {
                      const id = pendingAccountForProvider(state.connection, 'instagram');
                      if (!id) throw Error('Check status to find the existing connection attempt.');
                      state.connection = await ctx.bridge.call('connections.reconcile', {
                        provider: 'instagram',
                        connectedAccountId: id
                      });
                      await checkConnection();
                    })
                  )}
                >
                  Verify connected account
                </B>
              )}
            </HStack>
            {state.connection?.state === 'pending' && (
              <Text>
                Finish the existing consent attempt, then verify. Do not start a second connection.
              </Text>
            )}
            {sourceNeedsOperatorReview(state.connection) && (
              <Message status="warning">
                The connection outcome needs operator review. No new consent attempt will be started
                here.
              </Message>
            )}
          </Panel>
        )}
        {state.message && <Message>{state.message}</Message>}
        <section className="gigi-creator-grid">
          <aside aria-label="Saved Instagram drafts">
            <VStack gap={3}>
              <Heading level={2}>Saved drafts · {state.total ?? state.items.length}</Heading>
              {state.loading && <Text role="status">Loading drafts…</Text>}
              <List hasDividers edge="flush">
                {state.items.map((item) => (
                  <ListItem key={item.id}>
                    <VStack gap={2}>
                      <Heading level={3}>{item.body.title}</Heading>
                      <Text color="secondary">{item.body.caption || 'Caption still open'}</Text>
                      <Text type="supporting">
                        {item.approvalRequest?.state === 'pending_user_approval'
                          ? 'Agent requested your review'
                          : item.state === 'draft'
                            ? 'Saved draft'
                            : socialReceiptCopy(item.receipt).title}
                      </Text>
                      <B
                        disabled={state.busy}
                        onClick={owned(async () => {
                          if (!(await canLeave())) return;
                          await act(async () => {
                            const record = await invoke('social.get', { id: item.id });
                            if (alive.current) select(record);
                          });
                        })}
                      >
                        {saved?.id === item.id ? 'Selected draft' : 'Open draft'}
                      </B>
                    </VStack>
                  </ListItem>
                ))}
              </List>
              {!state.loading && !state.items.length && (
                <Text color="secondary">
                  Your next release, a studio moment, or a show announcement. Start a draft and come
                  back when it is ready.
                </Text>
              )}
              {state.nextOffset != null && (
                <B disabled={state.busy} onClick={owned(() => act(() => list(state.nextOffset)))}>
                  Load more drafts
                </B>
              )}
            </VStack>
          </aside>
          {draft ? (
            <section aria-label="Instagram draft editor">
              <VStack gap={4}>
                {saved?.approvalRequest?.state === 'pending_user_approval' && (
                  <Message status="warning" title="An agent requested your review">
                    Nothing has been approved or published. Load the verified image, check the
                    caption and account, then choose Review & publish if you want to share this
                    exact post.
                  </Message>
                )}
                {saved?.approvalRequest?.state === 'stale' && (
                  <Message status="warning">
                    The previous agent approval request is stale because this draft changed. It
                    cannot authorize this version.
                  </Message>
                )}
                <Heading level={2}>{saved ? 'Edit draft' : 'New draft'}</Heading>
                <Text color="secondary" role="status">
                  {state.dirty ? 'Unsaved changes' : saved ? 'Saved on this Mac' : 'Not saved yet'}
                </Text>
                <HStack gap={2} wrap="wrap">
                  <B primary disabled={state.busy || locked} onClick={owned(save)}>
                    {state.busy ? 'Working…' : 'Save draft'}
                  </B>
                  {local ? (
                    <Text color="secondary">Local artwork · not available for publishing</Text>
                  ) : (
                    <B
                      disabled={state.busy || locked || !saved || state.dirty}
                      onClick={owned(review)}
                    >
                      Review & publish
                    </B>
                  )}
                </HStack>
                {Boolean(issues.length) && (
                  <Message error>Before continuing, check the highlighted fields.</Message>
                )}
                <Field
                  label="Title"
                  id="social-title"
                  data-social-field="title"
                  value={draft.title || ''}
                  maxLength={200}
                  disabled={locked || state.busy}
                  onChange={(value) => setField('title', value)}
                  help={errorFor('title')}
                  aria-invalid={Boolean(errorFor('title'))}
                />
                <Field
                  label="Caption"
                  id="social-caption"
                  data-social-field="caption"
                  textarea
                  value={draft.caption || ''}
                  rows={7}
                  maxLength={2300}
                  disabled={locked || state.busy}
                  onChange={(value) => setField('caption', value)}
                  help={errorFor('caption')}
                  aria-invalid={Boolean(errorFor('caption'))}
                />
                <Text type="supporting" color="secondary">
                  {(draft.caption || '').length} / 2,200
                </Text>
                <HStack gap={2} wrap="wrap">
                  <B disabled={locked || state.busy} onClick={owned(() => setPicker(true))}>
                    Choose saved local artwork
                  </B>
                  {local && (
                    <B
                      disabled={locked || state.busy}
                      onClick={owned(() => {
                        delete state.editor.imageAssetId;
                        delete state.editor.imageAlt;
                        delete state.editor.imageSnapshot;
                        state.dirty = true;
                        render();
                      })}
                    >
                      Remove local artwork
                    </B>
                  )}
                </HStack>
                {local && (
                  <>
                    <Field
                      label="Local artwork description"
                      value={draft.imageAlt || ''}
                      maxLength={500}
                      disabled={locked || state.busy}
                      onChange={(value) => setField('imageAlt', value)}
                    />
                    <Text color="secondary">
                      Local artwork stays on this Mac. It is included in database backups and is not
                      available for publishing.
                    </Text>
                  </>
                )}
                <Field
                  label="Public JPEG image URL"
                  id="social-imageUrl"
                  type="url"
                  data-social-field="imageUrl"
                  value={draft.imageUrl || ''}
                  placeholder="https://media.createsomething.io/…/cover.jpg"
                  disabled={local || locked || state.busy}
                  onChange={(value) => setField('imageUrl', value)}
                  help={errorFor('imageUrl')}
                  aria-invalid={Boolean(errorFor('imageUrl'))}
                />
                <Disclosure title="JPEG requirements and supported media">
                  <Text color="secondary">
                    Single JPEG posts only: at most 8 MiB, at least 320 pixels wide, with an aspect
                    ratio from 4:5 to 1.91:1. This release accepts direct public HTTPS image URLs
                    from media.createsomething.io only; the image must be accessible without signing
                    in. GiGi does not upload your local music or photos. Carousels, Reels and
                    Stories are not supported here yet.
                  </Text>
                </Disclosure>
                <Choice
                  label="Publishing account"
                  id="social-connectedAccountId"
                  data-social-field="connectedAccountId"
                  value={draft.connectedAccountId || ''}
                  options={[
                    ['', 'Choose a verified account'],
                    ...(account
                      ? [
                          [
                            account.connectedAccountId,
                            `@${account.username || account.connectedAccountId}`
                          ]
                        ]
                      : []),
                    ...(draft.connectedAccountId &&
                    draft.connectedAccountId !== account?.connectedAccountId
                      ? [[draft.connectedAccountId, 'Saved account · verify connection']]
                      : [])
                  ]}
                  disabled={locked || state.busy}
                  onChange={(value) => setField('connectedAccountId', value)}
                  help={errorFor('connectedAccountId')}
                />
                {locked && (
                  <Panel title={socialReceiptCopy(saved.receipt).title}>
                    <Text>{socialReceiptCopy(saved.receipt).detail}</Text>
                    {saved.receipt?.mediaId && (
                      <Text>Instagram post ID: {saved.receipt.mediaId}</Text>
                    )}
                    {instagramLink(saved.receipt?.permalink) && (
                      <Link href={instagramLink(saved.receipt.permalink)} isExternalLink>
                        View on Instagram
                      </Link>
                    )}
                    {saved.state === 'not_published' && (
                      <B
                        disabled={state.busy}
                        onClick={owned(() => {
                          state.editor = { ...state.selected.body };
                          state.selected = null;
                          state.dirty = true;
                          state.pendingSave = null;
                          state.message =
                            'New unsaved copy. Fix the requirements, save, then review again. The original receipt is kept.';
                          render();
                        })}
                      >
                        Copy into a new draft
                      </B>
                    )}
                    <B
                      disabled={state.busy}
                      onClick={owned(() =>
                        act(async () => {
                          const record = await invoke('social.receipt', {
                            id: state.selected.id,
                            continueConfirmed:
                              state.selected.receipt?.state === 'unknown' &&
                              state.selected.receipt?.reason === 'container_processing'
                          });
                          if (alive.current) select(record);
                          await list();
                        })
                      )}
                    >
                      {saved.receipt?.state === 'unknown' &&
                      saved.receipt?.reason === 'container_processing'
                        ? 'Continue pending publish'
                        : 'Check publish receipt'}
                    </B>
                  </Panel>
                )}
                <Panel title="Post preview">
                  <Text color="secondary">
                    Approximate layout. Instagram may display it differently.
                  </Text>
                  {local && (draft.imageSnapshot || saved?.imageSnapshot) ? (
                    <ArtworkImage
                      asset={draft.imageSnapshot || saved.imageSnapshot}
                      alt={draft.imageAlt}
                    />
                  ) : state.preview &&
                    state.preview.imageUrl === draft.imageUrl &&
                    state.preview.expectedImageSha256 === draft.expectedImageSha256 ? (
                    <img
                      className="gigi-artwork-image"
                      src={state.preview.dataUrl}
                      alt="Verified Instagram post image"
                    />
                  ) : draft.imageUrl ? (
                    <B disabled={state.busy || locked} onClick={owned(preview)}>
                      Load verified image preview
                    </B>
                  ) : (
                    <Text>Your image will appear here</Text>
                  )}
                  <Text className="gigi-preserve-lines">
                    {draft.caption || 'Your caption will appear here.'}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {local
                      ? 'Local image preview. Nothing is uploaded.'
                      : 'Loading a preview asks the connector to validate the public JPEG. It does not publish. The exact reviewed image must still match when you publish.'}
                  </Text>
                </Panel>
              </VStack>
            </section>
          ) : (
            <Panel title="A place to work on your next post">
              <Text>
                Keep the caption and image together, review the exact account and post, then choose
                whether to publish.
              </Text>
            </Panel>
          )}
        </section>
        <Dialog
          isOpen={state.confirming}
          purpose="form"
          onOpenChange={() => {
            state.confirming = false;
            render();
          }}
          aria-labelledby="social-confirm-title"
        >
          <VStack gap={4}>
            <Heading level={2} id="social-confirm-title">
              Publish this exact post?
            </Heading>
            <Text>
              This will share the saved JPEG and caption publicly on{' '}
              <strong>@{account?.username || 'the selected Instagram account'}</strong>.
            </Text>
            {state.preview && (
              <img
                className="gigi-artwork-image"
                src={state.preview.dataUrl}
                alt="Exact image approved for publication"
              />
            )}
            <Text className="gigi-preserve-lines">{saved?.body.caption}</Text>
            <Text color="secondary">{saved?.body.imageUrl}</Text>
            <Text>Only continue if you have permission to publish this media.</Text>
            <HStack gap={2}>
              <B
                onClick={owned(() => {
                  state.confirming = false;
                  render();
                })}
              >
                Keep as draft
              </B>
              <B primary onClick={owned(publish)}>
                Publish on Instagram
              </B>
            </HStack>
          </VStack>
        </Dialog>
        <SavedArtworkPicker
          ctx={ctx}
          isOpen={picker}
          onClose={() => setPicker(false)}
          onSelect={(asset) => {
            state.editor = {
              ...state.editor,
              imageAssetId: asset.assetId,
              imageAlt:
                state.editor.imageAlt || `Artwork for ${state.editor.title || 'this draft'}`,
              imageSnapshot: asset,
              imageUrl: '',
              expectedImageSha256: ''
            };
            state.preview = null;
            state.dirty = true;
            setPicker(false);
            render();
          }}
        />
        {confirmation}
      </VStack>
    </section>
  );
}
