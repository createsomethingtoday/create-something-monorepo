/** Generated photographic cutouts form a decorative record-collection metaphor.
 * The example musician is never assigned to a saved person. Record proof is HTML. */
export function questScene({ phase = 0, linked = false, personSaved = false, skipped = false } = {}) {
  const showGig = phase > 0;
  const showPerson = phase > 1 && !skipped;
  return `<div class="quest-scene quest-collage quest-collage-phase-${phase}${showPerson ? ' quest-collage-with-person' : ''}${linked ? ' quest-collage-linked' : ''}" aria-hidden="true"><div class="quest-collage-canvas">
    <span class="quest-paper-stamp" data-quest-part="helper">g.</span>
    <div class="quest-divider-set" data-quest-part="identity"><span class="quest-divider quest-divider-music">Music</span><span class="quest-divider quest-divider-people">People</span><span class="quest-divider quest-divider-gigs">Gigs</span></div>
    <div class="quest-crate" data-quest-part="home"><img class="quest-crate-back" src="./onboarding/crate-cutout.png" width="1536" height="1024" alt="" decoding="async"><img class="quest-crate-front" src="./onboarding/crate-cutout.png" width="1536" height="1024" alt="" decoding="async"></div>
    ${showGig ? '<div class="quest-vinyl" data-quest-part="gig"><img src="./onboarding/vinyl-cutout.png" width="1536" height="1024" alt="" decoding="async"></div>' : ''}
    ${showPerson ? `<div class="quest-musician${personSaved || linked ? '' : ' quest-musician-example'}" data-quest-part="person"><img src="./onboarding/musician-cutout.png" width="1254" height="1254" alt="" decoding="async"></div>` : ''}
    ${linked ? '<svg class="quest-photo-connection" viewBox="0 0 560 340" focusable="false"><path data-quest-part="route" pathLength="100" d="M241 157c15 44 72 46 92 1" fill="none" stroke="#75875d" stroke-width="3" stroke-linecap="round"/><circle cx="241" cy="157" r="4" fill="#75875d"/><circle cx="333" cy="158" r="4" fill="#75875d"/></svg>' : ''}
  </div></div>`;
}
