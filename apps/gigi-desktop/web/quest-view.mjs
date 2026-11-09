import { icon } from './icons.mjs';
import { questScene } from './quest-scene.mjs';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const missionIcons = ['house', 'music', 'user-round', 'arrow-right'];
const missions = ['Your space', 'Your gig', 'Your people', 'Ready'];

/** First-run presentation. Saved records, never drafts, supply completion proof. */
export function questView({ workspace, profileName = '', phase = 0, draft = {}, gig = null, person = null, crewLinked = false, skipped = false, busy = false, error = null, animation = '', storageWarning = false, recoveryRequired = false, setupProfile = false } = {}) {
  const current = Number.isInteger(phase) && phase >= 0 && phase <= 3 ? phase : 0;
  const completed = [current > 0, Boolean(gig), Boolean(person && crewLinked)];
  const count = completed.filter(Boolean).length;
  const disabled = busy ? ' disabled' : '';
  const linked = Boolean(person && crewLinked);
  const guide = [
    'Your gigs, in one place.',
    'Every gig starts with a record.',
    person && !linked ? 'Your person is saved. Finish the link to your gig when you’re ready.' : 'Add one person. Watch them connect to your gig.',
    linked ? 'You did it. Your work and people are together.' : 'You did it. Your gig is ready. Add people whenever you like.'
  ][current];
  const status = [
    setupProfile ? 'Your workspace is saved. Finish your profile to continue.' : 'One small step at a time.',
    'Nice. Your space is ready.',
    person && !linked ? 'Person saved. The gig link still needs to finish.' : 'Gig added. Let’s bring someone along.',
    skipped ? 'Gig added. You can add people later.' : linked ? 'Person added. You’re ready to go.' : 'Your saved work is ready to explore.'
  ][current];

  let content;
  if (current === 0) {
    content = `<p class="quest-kicker">Step 1 of 3 · Your space</p><h1 id="quest-heading" tabindex="-1">${setupProfile ? 'Finish your space.' : 'What’s your name?'}</h1><p class="quest-description">${setupProfile ? 'Your space is ready. Add your name to keep going.' : 'We’ll make a space just for you.'}</p>
      <form id="workspace-form" class="quest-form">
        <div class="field"><label for="owner-name">Your name</label><input id="owner-name" name="ownerName" required maxlength="80" autocomplete="name" placeholder="e.g. Danny" value="${escape(draft.ownerName || profileName)}"${disabled}></div>
        <button type="submit" class="btn primary quest-primary"${disabled}>${busy ? 'Making your space…' : 'Let’s go →'}</button>
      </form>`;
  } else if (current === 1) {
    content = `<p class="quest-kicker">Step 2 of 3 · Your gig</p><h1 id="quest-heading" tabindex="-1">Name your first gig.</h1><p class="quest-description">A show, session or rehearsal. Give it a name to start.</p><form id="quest-gig-form" class="quest-form"><div class="field"><label for="quest-title">Gig name</label><input id="quest-title" name="title" required maxlength="120" autocomplete="off" placeholder="e.g. Friday night at The Echo" value="${escape(draft.gigTitle ?? draft.title)}"${disabled}></div><button type="submit" class="btn primary quest-primary"${disabled}>${busy ? 'Saving your gig…' : 'Add gig →'}</button></form>`;
  } else if (current === 2) {
    content = `<p class="quest-kicker">Step 3 of 3 · Your people</p><h1 id="quest-heading" tabindex="-1">Who’s helping?</h1><p class="quest-description">${person ? 'The person is already saved. Retry the link to connect them to your gig.' : 'A bandmate, booker or collaborator. What’s their name?'}</p>${person ? `<div class="quest-saved-person"><span class="quest-help">Saved person</span><strong>${escape(person.title)}</strong></div><button type="button" class="btn primary quest-primary" data-quest-action="retry-link"${disabled}>${busy ? 'Linking person…' : 'Retry link to gig →'}</button>` : `<form id="quest-person-form" class="quest-form"><div class="field"><label for="quest-title">Person’s name</label><input id="quest-title" name="title" required maxlength="80" autocomplete="off" placeholder="e.g. Alex" value="${escape(draft.personName ?? draft.title)}"${disabled}></div><button type="submit" class="btn primary quest-primary"${disabled}>${busy ? 'Saving and linking…' : 'Add to my gig →'}</button></form>`}<button type="button" class="btn text quest-skip" data-quest-action="skip-person"${disabled}>I’ll ${person ? 'finish the link' : 'add someone'} later</button>`;
  } else {
    content = `<p class="quest-kicker">${linked ? 'All 3 done' : 'Ready to explore'}</p><h1 id="quest-heading" tabindex="-1">You’re ready to explore.</h1><p class="quest-description">${linked ? 'You created a space and a gig, then linked a person to it.' : 'Your space and gig are saved. You can bring your crew in later.'} You can add more whenever you like.</p><button type="button" class="btn primary quest-primary" data-quest-action="finish"${disabled}>Start using GiGi →</button><details class="quest-sidequests"><summary>Try more later</summary><button type="button" class="btn quest-sidequest" data-quest-action="calendar"${disabled}><span>${icon('calendar-days')}Bring in your calendar</span><small>Open source setup · separate consent required</small></button><button type="button" class="btn quest-sidequest" data-quest-action="ai"${disabled}><span>${icon('messages-square')}Meet Ask GiGi</span><small>Open AI setup</small></button></details>`;
  }

  return `<main class="quest" data-quest-phase="${current}" data-quest-route-ready="${linked}" data-quest-motion="${escape(animation)}" aria-label="Set up GiGi" aria-busy="${Boolean(busy)}">
    <header class="quest-header"><span class="quest-brand">GiGi<span class="quest-brand-dot" aria-hidden="true"></span></span><span class="quest-header-label">A little setup. A lot less to remember.</span>${workspace && current > 0 ? `<button type="button" class="btn text quest-pause" data-quest-action="pause"${disabled}>Explore freely</button>` : ''}</header>
    <div class="quest-progress"><strong>${current === 3 ? 'Ready to go' : 'Let’s make it yours'}</strong><span>${count} of 3 done</span></div>
    <div class="quest-route"><span class="quest-wayfinder" data-current="${current}" aria-hidden="true"></span><ol class="quest-map" aria-label="Setup steps">${missions.map((title, index) => {
      const done = Boolean(completed[index]);
      const label = done ? 'Done' : index === current ? 'Your turn' : index === 2 && skipped ? 'Later' : 'Later';
      return `<li class="quest-node${done ? ' quest-node-complete' : ''}" data-quest-step="${index}"${index === current ? ' aria-current="step"' : ''}><span class="quest-node-mark" aria-hidden="true">${icon(done ? 'circle-check' : missionIcons[index])}</span><span>${title}</span><small>${label}</small></li>`;
    }).join('')}</ol></div>
    <div class="quest-layout"><section class="quest-mission" aria-labelledby="quest-heading"><p class="quest-status" role="status" aria-live="polite">${status}</p>${content}${error ? `<p class="quest-error" role="alert" tabindex="-1">${escape(error?.message || error)}</p>` : ''}${recoveryRequired ? '<button type="button" class="btn" data-quest-action="restore">Check saved progress</button>' : ''}${storageWarning ? '<p class="quest-storage-warning" role="status">Your records are saved, but tutorial progress could not be remembered on this Mac. You can keep using GiGi.</p>' : ''}</section>
    <aside class="quest-world" aria-label="How your workspace comes together"><figure class="quest-illustration">${questScene({ phase: current, linked, personSaved: Boolean(person), skipped })}<figcaption>${guide}</figcaption></figure>${workspace || gig ? `<div class="quest-saved" aria-label="Your saved workspace"><p class="quest-help quest-saved-label">${icon('circle-check')}Saved on this Mac</p><h2>${icon('house')}${escape(workspace?.name || 'Your space')}</h2>${gig ? `<div class="quest-gig"><span class="quest-help">${icon('music')}Saved gig</span><h3>${escape(gig.title)}</h3>${linked ? `<div class="quest-person"><span class="quest-help">${icon('link')}Linked person</span><p class="quest-person-name">${escape(person.title)} <span class="quest-link-description">connected to ${escape(gig.title)}</span></p></div>` : ''}</div>` : ''}</div>` : ''}</aside></div>
    <footer class="quest-footer"><span>${workspace ? 'Your work stays saved. Connect apps whenever you’re ready.' : 'No sign-in needed. Your records stay on this Mac.'}</span><button type="button" class="btn text quest-replay" data-quest-action="replay"${disabled}>Replay illustration ${icon('history')}</button></footer>
  </main>`;
}
