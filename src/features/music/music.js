/* music feature functions; classic-script compatibility with current app state. */
'use strict';

function formatClock(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60), seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function shortIslandTitle(track) {
  const name = String(track?.fileName || track?.text || 'Song').replace(/\.[^.]{1,8}$/, '').trim();
  return Array.from(name || 'Song').slice(0, 5).join('');
}

function toggleMusicIsland(force) {
  const panel = $('#nowPlayingPanel'), pill = $('#nowPlayingPill'), track = playlist[playlistIndex];
  if (!panel) return;
  if (!track && force !== false) return;
  const open = typeof force === 'boolean' ? force : panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !open);
  pill?.setAttribute('aria-expanded', String(open));
}

function syncPlayer() {
  const audio = $('#globalAudio');
  if (!audio) return;
  audio.preload = 'auto';
  document.querySelectorAll('[data-play-song]').forEach(button => {
    const active = String(playlist[playlistIndex]?.id) === String(button.dataset.playSong) && !audio.paused && !audio.ended;
    button.classList.toggle('is-playing', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? 'Pause song' : 'Play song');
  });
  const track = playlist[playlistIndex], hasTrack = !!track && !!audio.src, playing = hasTrack && !audio.paused && !audio.ended;
  const island = $('#nowPlayingIsland'), pill = $('#nowPlayingPill'), shortTitle = $('#islandShortTitle'), fullTitle = $('#islandFullTitle');
  const status = $('#islandStatusText'), toggle = $('#nowPlayingToggle'), seek = $('#islandSeek'), current = $('#islandCurrentTime'), duration = $('#islandDuration');
  if (island) {
    island.classList.toggle('hidden', !hasTrack);
    island.classList.toggle('is-playing', playing);
  }
  $('#app').classList.toggle('has-now-playing', hasTrack);
  if (!hasTrack) toggleMusicIsland(false);
  if (track) {
    const title = track.fileName || track.text || 'A little song';
    const songAuthor = track.author || {};
    const currentStatus = String(songAuthor.displayName || songAuthor.display_name || songAuthor.username || 'Unknown user').trim() || 'Unknown user';
    const userPet = $('#islandPetIcon');
    if (userPet) userPet.textContent = String(songAuthor.mascot || '🐰');
    if (shortTitle) shortTitle.textContent = shortIslandTitle(track);
    if (fullTitle) fullTitle.textContent = title;
    if (status) status.textContent = currentStatus;
    if (pill) {
      pill.title = title + ' · ' + currentStatus;
      pill.setAttribute('aria-label', 'Music: ' + title + '. Status: ' + currentStatus + '. Open player');
    }
  }
  if (toggle) {
    toggle.textContent = audio.paused ? '▶' : 'Ⅱ';
    toggle.setAttribute('aria-label', audio.paused ? 'Play song' : 'Pause song');
  }
  if (seek) seek.value = audio.duration ? String(Math.round(audio.currentTime / audio.duration * 1000)) : 0;
  if (current) current.textContent = formatClock(audio.currentTime);
  if (duration) duration.textContent = formatClock(audio.duration);
}

async function resolveSongSource(track) {
  const key = String(track.id);
  const cached = songUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 30000) return cached.url;
  if (songUrlInFlight.has(key)) return songUrlInFlight.get(key);
  const request = sb.storage.from('memories').createSignedUrl(track.storagePath, 3600)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) throw error || new Error('The song file could not be loaded.');
      const entry = { url: data.signedUrl, expiresAt: Date.now() + 3500000 };
      songUrlCache.set(key, entry);
      if (songUrlCache.size > 24) songUrlCache.delete(songUrlCache.keys().next().value);
      return entry.url;
    }).finally(() => songUrlInFlight.delete(key));
  songUrlInFlight.set(key, request);
  return request;
}

function warmSongSources(tracks) {
  tracks.forEach(track => {
    if (track?.storagePath) void resolveSongSource(track).catch(error => console.debug('Song prefetch deferred:', error?.message || error));
  });
}

async function playSong(id) {
  const songs = feed.filter(x => x.kind === 'song');
  const index = songs.findIndex(x => String(x.id) === String(id));
  const audio = $('#globalAudio');
  const requestId = ++songLoadSequence;
  if (index < 0) return toast('This song is no longer in your garden ♡');

  if (String(playlist[playlistIndex]?.id) === String(id) && audio.src) {
    if (audio.paused) await audio.play().catch(error => toast(error.message));
    else audio.pause();
    syncPlayer();
    return;
  }

  playlist = songs;
  playlistIndex = index;
  const track = songs[index];
  const playButton = [...document.querySelectorAll("[data-play-song]")].find(button => String(button.dataset.playSong) === String(id));
  playButton?.classList.add("is-loading");
  playButton?.classList.remove("is-buffering");
  // Keep the current player and audio element alive while the next signed URL
  // is resolved; the previous song continues instead of flashing to empty.
  syncPlayer();
  try {
    const url = await resolveSongSource(track);
    if (requestId !== songLoadSequence) return;
    audio.src = url;
    audio.preload = 'auto';
    playButton?.classList.remove("is-loading");
    playButton?.classList.add("is-buffering");
    const playback = audio.play();
    syncPlayer();
    await playback;
    if (requestId !== songLoadSequence) return;
    syncPlayer();
    playButton?.classList.remove("is-loading", "is-buffering");
  } catch (error) {
    if (requestId !== songLoadSequence) return;
    playButton?.classList.remove("is-loading", "is-buffering");
    syncPlayer();
    toast(error?.message || 'Could not play this song right now ♡');
  }
}

function stepSong(step) {
  const songs = feed.filter(x => x.kind === 'song');
  if (!songs.length) {
    playlist = [];
    playlistIndex = -1;
    return;
  }
  const currentId = playlist[playlistIndex]?.id;
  const currentIndex = songs.findIndex(song => String(song.id) === String(currentId));
  const baseIndex = currentIndex < 0 ? (step > 0 ? -1 : 0) : currentIndex;
  const nextIndex = (baseIndex + step + songs.length) % songs.length;
  // Do not change playlistIndex here. playSong uses it to distinguish a
  // genuinely new track from the currently playing one.
  void playSong(songs[nextIndex].id);
}


function renderMusicPage(c, songs) {
    c.innerHTML = `
      <div class="heading"><h2>Cozy music 🎵</h2><p>Your songs play right here in the garden.</p></div>
      <label class="primary upload-label">＋ Add a song<input data-upload="song" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm" hidden></label>
      <h3 class="shared-songs-title">Your shared songs</h3>
      <div class="grid media-grid music-grid">${songs.map(memoryCard).join('') || '<div class="empty">Add a song file and listen together right here ♡'}</div>
      ${historySentinelMarkup('bottom')}
    `;
}
