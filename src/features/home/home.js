/* home feature functions; classic-script compatibility with current app state. */
'use strict';

function getKindness() {
  return kindLines[currentKindnessIndex % kindLines.length];
}

function rollKindness() {
  let next;
  do {
    next = Math.floor(Math.random() * kindLines.length);
  } while (kindLines.length > 1 && next === currentKindnessIndex);
  currentKindnessIndex = next;
  const p = $('#compliment');
  if (p) {
    p.textContent = getKindness();
    p.classList.remove('kindness-pop');
    void p.offsetWidth;
    p.classList.add('kindness-pop');
  }

  toast('A little drop of kindness for you ♡');
}


function getCuteBunnySeason(date = new Date()) {
  const month = date.getMonth();
  if ([11, 0, 1].includes(month)) return { id: 'winter', label: 'Winter wonderland', greeting: 'A little warmth for a cozy day', icon: '❄️' };
  if ([2, 3, 4].includes(month)) return { id: 'spring', label: 'Spring in bloom', greeting: 'Let little things blossom today', icon: '🌷' };
  if ([5, 6, 7].includes(month)) return { id: 'summer', label: 'Summer daydream', greeting: 'Save a little sunshine', icon: '☀️' };
  return { id: 'autumn', label: 'Autumn memories', greeting: 'Collect the golden moments', icon: '🍂' };
}

function renderHomePage(c, visibleFeed, notes, pics, songs) {
    destroyBearPoseEngine();
    document.body.dataset.season = getCuteBunnySeason().id;
    c.innerHTML = `
      <div class="hero home-hero">
        <div>
          <small>✿ MADE FOR LITTLE MOMENTS</small>
          <h3>A little world to keep close</h3>
          <p>Four small corners for the moments you share together.</p>
          <button class="primary" data-go="friends">Find your friend ♡</button>
        </div>
        <button class="hero-art bunny-button" id="bunnyBuddy" aria-label="Open your profile">
          <span>☁️</span><span>${esc(me?.mascot || '🐰')}</span><span class="hero-side-flower" aria-hidden="true"><svg viewBox="0 0 48 58"><defs><linearGradient id="sidePetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f9dce7"/><stop offset="1" stop-color="#d98eae"/></linearGradient><radialGradient id="sideCore"><stop stop-color="#fff0b8"/><stop offset="1" stop-color="#e9b85f"/></radialGradient></defs><path d="M24 31Q22 44 24 55" fill="none" stroke="#78977d" stroke-width="2.4" stroke-linecap="round"/><path d="M23 46Q11 36 7 43Q13 53 23 49Z" fill="#b8cfad" stroke="#78977d" stroke-width="1.2"/><path d="M25 49Q34 38 41 43Q38 53 25 52Z" fill="#c9d9b9" stroke="#78977d" stroke-width="1.2"/><g fill="url(#sidePetal)" stroke="#fff8f2" stroke-width="1.6"><ellipse cx="24" cy="17" rx="5.4" ry="9" transform="rotate(0 24 17)"/><ellipse cx="24" cy="17" rx="5.4" ry="9" transform="rotate(60 24 17)"/><ellipse cx="24" cy="17" rx="5.4" ry="9" transform="rotate(120 24 17)"/></g><g fill="none" stroke="#fff7f1" stroke-width=".8" opacity=".75"><path d="M24 10Q23 14 24 16M16 17Q20 17 22 18M28 18Q31 16 33 14"/></g><circle cx="24" cy="17" r="4.2" fill="url(#sideCore)" stroke="#fff8f2" stroke-width="1.4"/><circle cx="22.5" cy="15.5" r="1" fill="#fff9dc" opacity=".9"/></svg></span>
          <svg class="doodle-bouquet" viewBox="0 0 94 72" aria-hidden="true"><defs><linearGradient id="petalPink" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe6ed"/><stop offset="1" stop-color="#dc8eaa"/></linearGradient><linearGradient id="petalLilac" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0e7ff"/><stop offset="1" stop-color="#bba4dc"/></linearGradient><linearGradient id="petalPeach" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0d2"/><stop offset="1" stop-color="#e9b778"/></linearGradient><radialGradient id="flowerGold"><stop stop-color="#fff2bd"/><stop offset="1" stop-color="#e6ad59"/></radialGradient></defs><g class="stems" fill="none" stroke="#78977d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M46 66Q27 43 17 24M46 66Q40 39 42 15M46 66Q58 43 76 25"/><path d="M37 56Q22 48 15 55Q23 65 39 60M51 57Q66 46 76 54Q69 65 51 61"/></g><g fill="#b8cfad" stroke="#78977d" stroke-width="1.3"><path d="M31 49Q15 35 10 43Q16 55 31 49Z"/><path d="M57 50Q70 34 81 42Q76 55 57 50Z"/></g><g fill="none" stroke="#e8f0df" stroke-width=".8" opacity=".9"><path d="M14 44Q21 46 27 48M61 47Q69 44 77 43"/></g><g stroke="#fff9f3" stroke-width="1.45"><g fill="url(#petalPink)"><ellipse cx="17" cy="19" rx="4.1" ry="7.3"/><ellipse cx="17" cy="19" rx="4.1" ry="7.3" transform="rotate(72 17 19)"/><ellipse cx="17" cy="19" rx="4.1" ry="7.3" transform="rotate(144 17 19)"/><ellipse cx="17" cy="19" rx="4.1" ry="7.3" transform="rotate(216 17 19)"/><ellipse cx="17" cy="19" rx="4.1" ry="7.3" transform="rotate(288 17 19)"/></g><g fill="url(#petalLilac)"><path d="M42 5C35 9 34 17 42 22C50 17 49 9 42 5Z"/><path d="M42 5C50 9 50 17 42 22C34 17 34 9 42 5Z" transform="rotate(60 42 14)"/><path d="M42 5C50 9 50 17 42 22C34 17 34 9 42 5Z" transform="rotate(120 42 14)"/></g><g fill="url(#petalPeach)"><ellipse cx="76" cy="21" rx="4.8" ry="8"/><ellipse cx="76" cy="21" rx="4.8" ry="8" transform="rotate(72 76 21)"/><ellipse cx="76" cy="21" rx="4.8" ry="8" transform="rotate(144 76 21)"/><ellipse cx="76" cy="21" rx="4.8" ry="8" transform="rotate(216 76 21)"/><ellipse cx="76" cy="21" rx="4.8" ry="8" transform="rotate(288 76 21)"/></g></g><g fill="url(#flowerGold)" stroke="#fff9f1" stroke-width="1.2"><circle cx="17" cy="19" r="3.1"/><circle cx="42" cy="14" r="3.1"/><circle cx="76" cy="21" r="3.3"/></g><g fill="#fff8e8" opacity=".9"><circle cx="16" cy="18" r=".8"/><circle cx="41" cy="13" r=".8"/><circle cx="75" cy="20" r=".9"/></g><g fill="#f2c5d5" opacity=".85"><circle cx="29" cy="28" r="1.5"/><circle cx="59" cy="29" r="1.7"/><circle cx="87" cy="39" r="1.4"/></g></svg>
          <i>✦</i>
        </button>
      </div>
      <div class="daily" id="dailyCard" role="button" tabindex="0" aria-label="A little kindness for today. Tap for another reminder">
        <span class="daily-icon">🌼</span><div><small>A LITTLE KINDNESS FOR TODAY</small><p id="compliment">${esc(getKindness())}</p></div>
      </div>
      ${renderKindnessEventMarkup()}
      <div class="toolbar"><h3>Your happy things</h3><span>${visibleFeed.length} shared memories</span></div>
      <div class="grid happy-things-grid">
        ${streakWidget()}
        <article class="tile"><button type="button" class="tile-art note-art happy-thing-art happy-note-thumbnail" data-happy-go="notes" aria-label="Open Little Love Notes"><svg viewBox="0 0 220 132" role="img" aria-hidden="true"><defs><linearGradient id="note-paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#fff0f3"/></linearGradient><linearGradient id="note-envelope" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3c5d3"/><stop offset="1" stop-color="#df91ad"/></linearGradient><filter id="note-shadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="3"/></filter></defs><ellipse cx="111" cy="113" rx="66" ry="8" fill="#b77f98" opacity=".17" filter="url(#note-shadow)"/><g class="note-artwork"><g transform="rotate(-9 82 67)"><rect x="42" y="29" width="91" height="76" rx="8" fill="#f8e9ec" stroke="#d9a8b7" stroke-width="2"/><path d="M54 45h56M54 54h44M54 63h51" stroke="#d9b2bf" stroke-width="2" stroke-linecap="round"/><path d="M54 82q11-9 22 0t22 0" fill="none" stroke="#e3a7bb" stroke-width="2"/><path d="M106 88c-5-7-14-2-11 5 2 4 11 10 11 10s9-6 11-10c3-7-6-12-11-5Z" fill="#e6a1b9"/></g><g transform="rotate(5 133 67)"><rect x="91" y="18" width="88" height="91" rx="10" fill="url(#note-paper)" stroke="#d7a0b4" stroke-width="2.5"/><path d="M103 38h49M103 48h56M103 58h45M103 68h52" stroke="#e6c4ce" stroke-width="2.4" stroke-linecap="round"/><path d="M103 82q13-7 25 0t25 0" fill="none" stroke="#edc5d1" stroke-width="2"/><path d="M103 91h31" stroke="#e6c4ce" stroke-width="2" stroke-linecap="round"/><circle cx="164" cy="29" r="5" fill="#e6b66f"/></g><g transform="translate(59 77)"><path d="M0 0 53-28l54 28-54 34Z" fill="url(#note-envelope)" stroke="#c77f9e" stroke-width="2.2" stroke-linejoin="round"/><path d="m0 0 53 34L107 0" fill="#f8dce5" stroke="#c77f9e" stroke-width="2.2" stroke-linejoin="round"/><path d="M43 4c-6-8-16-2-12 6 2 5 12 12 12 12s10-7 12-12c4-8-6-14-12-6Z" fill="#d87899" stroke="#fff2f5" stroke-width="1.5"/></g><path d="M183 35c-5-7-14-2-11 5 2 4 11 10 11 10s9-6 11-10c3-7-6-12-11-5Z" fill="#e6a1b9"/><path d="m38 34 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#d9b36e"/></g></svg></button><h3>Little Love Notes</h3><p>${notes.length} saved notes</p><button class="primary" data-go="notes">Open notes →</button></article>
        <article class="tile"><button type="button" class="tile-art photo-art happy-thing-art happy-photo-thumbnail" data-happy-go="gallery" aria-label="Open Photo Garden"><svg viewBox="0 0 220 132" role="img" aria-hidden="true"><ellipse cx="110" cy="112" rx="63" ry="8" fill="#8fae8b" opacity=".17"/><rect x="68" y="20" width="84" height="91" rx="13" fill="#fffaf4" stroke="#c4d5b8" stroke-width="2.5" transform="rotate(-5 110 65)"/><rect x="79" y="29" width="84" height="91" rx="13" fill="#fffdf8" stroke="#b9cda9" stroke-width="2.5" transform="rotate(5 120 74)"/><rect x="88" y="38" width="68" height="69" rx="8" fill="#e8f0df"/><circle cx="122" cy="65" r="12" fill="#f2c6d1"/><circle cx="122" cy="51" r="7" fill="#e8a7ba"/><circle cx="136" cy="65" r="7" fill="#e8a7ba"/><circle cx="122" cy="79" r="7" fill="#e8a7ba"/><circle cx="108" cy="65" r="7" fill="#e8a7ba"/><circle cx="122" cy="65" r="5" fill="#e4be73"/><path d="M93 96q15-25 29-7t28-2" fill="none" stroke="#8da77e" stroke-width="3" stroke-linecap="round"/></svg></button><h3>Photo Garden</h3><p>${pics.length} shared photos</p><button class="primary" data-go="gallery">Open photos →</button></article>
        <article class="tile"><button type="button" class="tile-art music-art happy-thing-art happy-music-thumbnail" data-happy-go="music" aria-label="Open Cozy Playlist"><svg viewBox="0 0 220 132" role="img" aria-hidden="true"><defs><linearGradient id="music-deck" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4eafa"/><stop offset="1" stop-color="#cdb9e2"/></linearGradient><linearGradient id="music-vinyl" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#806d9d"/><stop offset=".55" stop-color="#544968"/><stop offset="1" stop-color="#9882ae"/></linearGradient></defs><ellipse cx="111" cy="113" rx="68" ry="8" fill="#8e79a9" opacity=".17"/><g class="music-artwork"><g transform="rotate(-5 111 75)"><rect x="43" y="40" width="136" height="66" rx="13" fill="url(#music-deck)" stroke="#a58cbd" stroke-width="2.5"/><rect x="51" y="48" width="120" height="50" rx="9" fill="#f9f3fb" opacity=".8"/><circle cx="105" cy="73" r="35" fill="url(#music-vinyl)" stroke="#76618f" stroke-width="2"/><circle cx="105" cy="73" r="27" fill="none" stroke="#c9b8d8" stroke-width="1.2" opacity=".48"/><circle cx="105" cy="73" r="20" fill="none" stroke="#c9b8d8" stroke-width="1.2" opacity=".42"/><circle cx="105" cy="73" r="12" fill="#f0c7d5" stroke="#b986a5" stroke-width="1.5"/><path d="M105 66c-4-5-10-1-7 4 1 3 7 7 7 7s6-4 7-7c3-5-3-9-7-4Z" fill="#b86f91"/><circle cx="105" cy="73" r="2.2" fill="#fff5f7"/><path d="M145 55 160 55 160 83Q160 91 152 91Q144 91 144 84Q144 77 153 77Q156 77 158 79V61H145Z" fill="#b79acb"/><path d="M60 58h13M60 64h8" stroke="#d4bfdc" stroke-width="2" stroke-linecap="round"/></g><path d="M52 29q-9 11 0 22m118-25q9 11 0 22" fill="none" stroke="#b29ac8" stroke-width="3" stroke-linecap="round"/><path d="M185 32c-5-7-14-2-11 5 2 4 11 10 11 10s9-6 11-10c3-7-6-12-11-5Z" fill="#d9b2df"/><path d="m38 81 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#d9b36e"/></g></svg></button><h3>Cozy Playlist</h3><p>${songs.length} shared songs</p><button class="primary" data-go="music">Open music →</button></article>
      </div>

      <section class="couple-bear-game" id="coupleBearGame" aria-labelledby="coupleBearTitle">
        <div class="couple-bear-heading">
          <span class="couple-bear-sparkle" aria-hidden="true">✦</span>
          <div><small>A LITTLE PLAYTIME</small><h3 id="coupleBearTitle">Bearfriend</h3><p>Choose how our little bears show their love.</p></div>
          <span class="couple-bear-sparkle" aria-hidden="true">♡</span>
        </div>
        <div class="couple-bears-scene bear-pose-scene" data-action="idle" data-viewer-gender="${esc(me?.gender || '')}" aria-label="Two little bears, one brown and one white">
          <svg id="bearPoseSvg" viewBox="90 120 420 270" role="img" aria-label="Two animated bears showing affection through movement">
            <title>Two Little Bears</title>
          </svg>
        </div>
        <p class="couple-bear-status" id="coupleBearStatus" aria-live="polite">Two little bears, one big love.</p>
        <div class="couple-bear-actions" role="group" aria-label="Choose a bear action">
          <button type="button" class="bear-action-button" data-couple-action="hug" aria-pressed="false"><span aria-hidden="true">🫂</span><b>Hug</b></button>
          <button type="button" class="bear-action-button" data-couple-action="kiss" aria-pressed="false"><span aria-hidden="true">💋</span><b>Kiss</b></button>
          <button type="button" class="bear-action-button" data-couple-action="flykiss" aria-pressed="false"><span aria-hidden="true">😘</span><b>Flying kiss</b></button>
          <button type="button" class="bear-action-button" data-couple-action="slap" aria-pressed="false"><span aria-hidden="true">🖐️</span><b>Playful slap</b></button>
          <button type="button" class="bear-action-button" data-couple-action="hands" aria-pressed="false"><span aria-hidden="true">🤝</span><b>Hold hands</b></button>
          <button type="button" class="bear-action-button" data-couple-action="dance" aria-pressed="false"><span aria-hidden="true">💃</span><b>Dance</b></button>
          <button type="button" class="bear-action-button" data-couple-action="pet" aria-pressed="false"><span aria-hidden="true">🐾</span><b>Pet</b></button>
          <button type="button" class="bear-action-button" data-couple-action="tummy" aria-pressed="false"><span aria-hidden="true">🫳</span><b>Scratch tummy</b></button>
          <button type="button" class="bear-action-button" data-couple-action="feed" aria-pressed="false"><span aria-hidden="true">🍓</span><b>Feed</b></button>
          <button type="button" class="bear-action-button" data-couple-action="sleep" aria-pressed="false"><span aria-hidden="true">🌙</span><b>Sleep</b></button>
          <button type="button" class="bear-action-button" data-couple-action="idle" aria-pressed="false"><span aria-hidden="true">🌸</span><b>Relax</b></button>
        </div>
        <div class="couple-bear-footer">
          <div class="bear-love-meter" role="group" aria-label="Little love meter">
            <div class="bear-love-meter-copy"><span>Little love meter</span><b id="bearLoveCount">0 hugs of happiness</b></div>
            <div class="bear-love-track"><span id="bearLoveFill"></span></div>
          </div>
        </div>
      </section>
    `;
    initBearPoseEngine();
}
