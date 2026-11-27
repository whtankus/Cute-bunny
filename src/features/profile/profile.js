/* profile feature functions; classic-script compatibility with current app state. */
'use strict';

function openClassicProfileEditor() {
  if (!me) return;
  const gate = $('#profileGate');
  if (!gate) return;
  $('#profileDisplay').value = me.displayName || me.display_name || '';
  $('#profileUsername').value = me.username || '';
  $('#profileBio').value = me.bio || '';
  $('#profileTheme').value = me.theme || 'rose';
  $('#profileMascot').value = me.mascot || '🐰';
  setTheme(me.theme || 'rose');
  updateThemePreview(me.theme || 'rose');
  updateBuddyChoices(me.mascot || '🐰');
  document.querySelectorAll('[data-classic-gender]').forEach(button => {
    const selected = button.dataset.classicGender === (me.gender || '');
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  gate.dataset.returnToOwnProfile = 'true';
  $('#friendProfileGate')?.classList.add('hidden');
  gate.classList.remove('hidden');
  document.body.classList.add('classic-profile-open');
  gate.scrollTop = 0;
}

function closeClassicProfileEditor() {
  const gate = $('#profileGate');
  if (!gate) return;
  const returnToProfile = gate.dataset.returnToOwnProfile === 'true';
  gate.classList.add('hidden');
  gate.dataset.returnToOwnProfile = 'false';
  document.body.classList.remove('classic-profile-open');
  if (returnToProfile && me) showFriendProfile(me);
}

function restoreProfileSettingsToMain() {
  const panel = $('#profileSettingsPanel');
  if (panel) panel.classList.add('hidden');
  const trigger = $('#profileSettingsTrigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function profileSettingsMarkup() {
  const themeOptions = [
    ['rose','🌷','Rose garden'],['lavender','☁️','Lavender skies'],['mint','🍃','Mint meadow'],
    ['sky','🐦','Bluebird day'],['peach','🍑','Peach glow'],['berry','🫐','Berry bloom'],
    ['midnight','🌙','Midnight lilac'],['sage','🌿','Sage garden'],['buttercup','🌼','Buttercup']
  ];
  const buddyOptions = [['🐰','Bunny'],['🐱','Kitty'],['🐻','Bear'],['🐸','Frog']];
  return `<section class="profile-settings-panel hidden" id="profileSettingsPanel" aria-label="Settings" aria-modal="false">
    <div class="profile-settings-heading">
      <div><small>YOUR LITTLE CORNER</small><h3>Settings</h3><p>Make this space feel like yours.</p></div>
      <button type="button" class="profile-settings-close" id="profileSettingsClose" aria-label="Close profile settings">×</button>
    </div>
    <div class="profile-settings-tabs" role="tablist" aria-label="Settings sections">
      <button type="button" class="profile-settings-tab is-active" data-settings-tab="account" role="tab" aria-selected="true" aria-controls="profileSettingsAccount">Account</button>
      <button type="button" class="profile-settings-tab" data-settings-tab="personal" role="tab" aria-selected="false" aria-controls="profileSettingsPersonal">Personal</button>
      <button type="button" class="profile-settings-tab" data-settings-tab="appearance" role="tab" aria-selected="false" aria-controls="profileSettingsAppearance">Appearance</button>
      <button type="button" class="profile-settings-tab" data-settings-tab="notifications" role="tab" aria-selected="false" aria-controls="profileSettingsNotifications">Alerts</button>
    </div>
    <div class="profile-settings-section profile-editor-settings" id="profileSettingsAccount" data-settings-section="account" role="tabpanel">
      <div class="settings-section-intro"><span class="settings-section-icon">♡</span><div><b>About you</b><small>Write a little introduction.</small></div></div>
      <label class="profile-settings-field">A little about you
        <textarea id="profileEditBio" maxlength="180" rows="3" placeholder="Write a little introduction..."></textarea>
        <small class="profile-bio-count" id="profileBioCount">0 / 180</small>
      </label>
    </div>
    <div class="profile-settings-section profile-editor-settings hidden" id="profileSettingsPersonal" data-settings-section="personal" role="tabpanel">
      <div class="settings-section-intro"><span class="settings-section-icon">✿</span><div><b>About you</b><small>Personalize how your profile is represented.</small></div></div>
      <div class="profile-settings-gender">
        <label>Gender</label>
        <div class="profile-gender-options" role="group" aria-label="Choose your gender">
          <button type="button" data-profile-gender="male" aria-pressed="false">Male</button>
          <button type="button" data-profile-gender="female" aria-pressed="false">Female</button>
        </div>
      </div>
    </div>
    <div class="profile-settings-section profile-editor-settings hidden" id="profileSettingsAppearance" data-settings-section="appearance" role="tabpanel">
      <div class="settings-section-intro"><span class="settings-section-icon">✧</span><div><b>Your appearance</b><small>Choose the colours and little buddy you love.</small></div></div>
      <input id="settingsThemeValue" type="hidden" value="rose">
      <div class="settings-choice-heading">Colour theme</div>
      <div class="settings-theme-grid" role="radiogroup" aria-label="Choose a colour theme">
        ${themeOptions.map(([value,emoji,label]) => `<button type="button" class="settings-theme-choice theme-${value}" data-settings-theme-choice="${value}" role="radio" aria-checked="false"><span class="theme-illustration" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M20 5c3 0 4 5 4 8 3-3 7-5 9-3s0 7-3 9c4 0 8 2 8 5s-5 4-8 4c3 3 4 7 2 9s-7 0-9-3c0 4-2 7-5 7s-4-5-4-8c-3 3-7 4-9 2s0-7 3-9c-4 0-7-2-7-5s5-4 8-4c-3-3-4-7-2-9s7 0 9 3c0-4 2-6 4-6Z" fill="currentColor" opacity=".78"/><circle cx="20" cy="22" r="5" fill="#fff6e9" stroke="currentColor" stroke-width="1.5"/></svg></span><small>${label}</small></button>`).join('')}
      </div>
      <input id="settingsBuddyValue" type="hidden" value="🐰">
      <div class="settings-choice-heading">Little buddy</div>
      <div class="settings-buddy-row" role="radiogroup" aria-label="Choose your little buddy">
        ${buddyOptions.map(([value,label]) => `<button type="button" class="settings-buddy-choice" data-settings-buddy-choice="${value}" role="radio" aria-checked="false"><span class="buddy-choice-art">${buddyIllustration(value)}</span><small>${label}</small></button>`).join('')}
      </div>
      <button type="button" class="settings-wallpaper-action" id="profileSettingsWallpaper">Change profile wallpaper <span>→</span></button>
    </div>
    <div class="profile-settings-section profile-editor-settings hidden" id="profileSettingsNotifications" data-settings-section="notifications" role="tabpanel">
      <div class="settings-section-intro"><span class="settings-section-icon">♡</span><div><b>Your notifications</b><small>Choose what you want to hear about.</small></div></div>
      <div class="settings-notification-card"><span>Photos, songs & notes</span><small>Updates shared in your little corner</small><button type="button" class="settings-open-notifications" id="profileSettingsOpenNotifications">Manage alerts →</button></div>
    </div>
    <div class="profile-settings-actions">
      <p class="profile-settings-feedback" id="profileSettingsFeedback" role="status" aria-live="polite"></p>
      <button type="button" class="primary profile-settings-save" id="profileSettingsSave"><span aria-hidden="true">♡</span> Save settings</button>
    </div>
  </section>`;
}

function buddyIllustration(value) {
  const icons = { '🐰':'bunny', '🐱':'kitty', '🐻':'bear', '🐸':'frog' };
  const icon = icons[value] || 'bunny';
  return '<svg class="cb-buddy-illustration" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><use href="#cb-icon-' + icon + '"></use></svg>';
}

function updateProfileLivePreview() {
  const count = $('#profileBioCount'), bio = $('#profileEditBio');
  if (count) count.textContent = (bio?.value || '').length + ' / 180';
}

function renderProfileSettings() {
  const bioField = $('#profileEditBio');
  if (bioField) bioField.value = me?.bio || '';
  updateProfileLivePreview();
  const gender = me?.gender || '';
  const theme = me?.theme || 'rose';
  const buddy = me?.mascot || '🐰';
  const themeInput = $('#settingsThemeValue'), buddyInput = $('#settingsBuddyValue');
  if (themeInput) themeInput.value = theme;
  if (buddyInput) buddyInput.value = buddy;
  document.querySelectorAll('[data-settings-theme-choice]').forEach(button => {
    const selected = button.dataset.settingsThemeChoice === theme;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  document.querySelectorAll('[data-settings-buddy-choice]').forEach(button => {
    const selected = button.dataset.settingsBuddyChoice === buddy;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  document.querySelectorAll('[data-profile-gender]').forEach(button => {
    const selected = button.dataset.profileGender === gender;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  syncBearViewerRole();
}

async function saveProfileSettings() {
  if (!me?.id) return;
  const save = $('#profileSettingsSave'), feedback = $('#profileSettingsFeedback');
  const gender = document.querySelector('[data-profile-gender].is-selected')?.dataset.profileGender || null;
  const username = me.username || '';
  if (save) save.disabled = true;
  if (feedback) feedback.textContent = 'Saving your changes…';
  try {
    const theme = $('#settingsThemeValue')?.value || me.theme || 'rose';
    const mascot = $('#settingsBuddyValue')?.value || me.mascot || '🐰';
    const displayName = me.displayName || me.display_name || '';
    const bio = String($('#profileEditBio')?.value || '').trim().slice(0,180);
    const saved = await api('/me', { method: 'PUT', body: JSON.stringify({ username, gender, theme, mascot, displayName, bio }) });
    me = { ...me, ...saved, username: saved.username || username, gender, theme, mascot, displayName: saved.displayName ?? displayName, display_name: saved.display_name ?? displayName, bio };
    setTheme(theme);
    const topMascot = $('#topMascot');
    if (topMascot) topMascot.textContent = mascot;
    const gate = $('#friendProfileGate');
    if (gate && !gate.classList.contains('hidden') && gate.dataset.ownProfile === 'true') showFriendProfile(me);
    renderProfileSettings();
    if (feedback) feedback.textContent = 'Settings saved ♡';
    toast('Settings saved ♡');
    restoreProfileSettingsToMain();
    render();
  } catch (error) {
    if (feedback) feedback.textContent = error.message || 'Could not save your profile.';
    toast(error.message || 'Could not save your profile.');
  } finally {
    if (save) save.disabled = false;
  }
}

async function cycleProfileWallpaper() {
  if (!me?.id) return;
  const current = PROFILE_WALLPAPERS.includes(me.profile_wallpaper) ? me.profile_wallpaper : 'normal';
  const next = PROFILE_WALLPAPERS[(PROFILE_WALLPAPERS.indexOf(current) + 1) % PROFILE_WALLPAPERS.length];
  const button = $('#friendProfileFollow');
  if (button) button.disabled = true;
  try {
    const saved = await api('/profile-wallpaper', { method: 'PUT', body: JSON.stringify({ wallpaper: next }) });
    me = { ...me, profile_wallpaper: saved.profile_wallpaper || next };
    const card = $('#friendProfileGate .friend-profile-card');
    if (card) card.dataset.wallpaper = me.profile_wallpaper;
    const ownRow = document.querySelector('#content .own-profile-row');
    if (ownRow) ownRow.dataset.wallpaper = me.profile_wallpaper;
    if (button) button.innerHTML = '<span aria-hidden="true">✿</span>';
    toast('Wallpaper: ' + (PROFILE_WALLPAPER_LABELS[me.profile_wallpaper] || 'Normal') + ' ♡');
  } catch (error) {
    toast(error.message || 'Could not save wallpaper.');
  } finally {
    if (button) button.disabled = false;
  }
}

function updateBuddyChoices(value = $('#profileMascot')?.value || '🐰') {
  document.querySelectorAll('[data-buddy-choice]').forEach(button => {
    const selected = button.dataset.buddyChoice === value;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
}

function updateThemePreview(theme = $('#profileTheme')?.value || 'rose') {
  // Apply the selected palette to the entire app immediately while Settings is open.
  setTheme(theme);
  const preview = $('#profileThemePreview');
  if (preview) preview.dataset.themePreview = theme;
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    const selected = button.dataset.themeChoice === theme;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  const buddy = $('#profileMascot')?.value || '🐰', avatar = $('#profileThemeBuddy');
  if (avatar) avatar.textContent = buddy;
  const name = $('#profilePreviewName');
  if (name) name.textContent = $('#profileDisplay')?.value.trim() || me?.displayName || 'Your cozy style';
  const meta = $('#profilePreviewMeta');
  if (meta) meta.textContent = `@${($('#profileUsername')?.value.trim().toLowerCase() || me?.username || 'your_name')} · ${themeNames[theme] || themeNames.rose}`;
  updateBuddyChoices(buddy);
}
