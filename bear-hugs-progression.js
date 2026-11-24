(() => {
'use strict';

const SELECTED_KEY = 'cuteBunnyBearSelectedFriend:v1';
const LOVE_KEY = 'cuteBunnyBearLove:v1';
const EQUIPPED_KEY_PREFIX = 'cuteBunnyBearEquippedRewards:v1:';
const ACTIONS = new Set(['hug', 'kiss', 'flykiss', 'slap', 'hands', 'dance', 'pet', 'feed', 'sleep', 'tummy', 'idle']);
const REWARDS = [
  { id: 'sunset-meadow', unlockPoints: 100, slot: 'background', previewClass: 'preview-forest', name: 'Cloverlight Meadow', icon: '🍀', kind: 'Scene background', detail: 'A soft sage meadow with little clover lights and warm morning glow', rarity: 'Rare' },
  { id: 'strawberry-hat', unlockPoints: 350, slot: 'headwear', previewClass: 'preview-caps', name: 'Berry Bonnet Pair', icon: '🍓', kind: 'Wearable headwear', detail: 'Tiny berry-pink caps attached to each bear’s head, so they move with every pose', rarity: 'Rare' },
  { id: 'honey-bear', unlockPoints: 1250, slot: 'skin', previewClass: 'preview-honey', name: 'Honey Butter Bears', icon: '🍯', kind: 'Bear appearance', detail: 'A gentle golden fur tint that keeps every original movement and expression', rarity: 'Epic' },
  { id: 'starry-set', unlockPoints: 2150, slot: 'background', previewClass: 'preview-starry', name: 'Moonlit Cloud Garden', icon: '🌙', kind: 'Scene background', detail: 'A quiet lavender night garden with soft moonlight and tiny stars', rarity: 'Legendary' },
  { id: 'starlight-crowns', unlockPoints: 3050, slot: 'headwear', previewClass: 'preview-crowns', name: 'Little Starlight Crowns', icon: '👑', kind: 'Wearable headwear', detail: 'Matching gold crowns that follow the bears as they hug, dance and play', rarity: 'Legendary' }
];

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const getFriends = () => typeof friends !== 'undefined' && Array.isArray(friends) ? friends : [];
const getMe = () => typeof me !== 'undefined' ? me : null;
const getSupabase = () => typeof sb !== 'undefined' ? sb : null;

let selectedFriendId = localStorage.getItem(SELECTED_KEY) || '';
let sharedPoints = 0;
let lastSharedAction = '';
let equippedRewardIds = [];
let sharedProgressPairKey = '';
let sharedProgressInitialized = false;
let progressChannel = null;
let progressTopic = '';
let originalTrigger = typeof window.triggerBearAction === 'function' ? window.triggerBearAction : null;
let originalCloseRealtime = typeof window.closeRealtime === 'function' ? window.closeRealtime : null;
let ownChannel = null;
let ownTopic = '';
let ownReady = false;
let ownPromise = null;
let peerChannel = null;
let peerTopic = '';
let peerReady = false;
let peerPromise = null;
let peerGeneration = 0;
let pendingRemoteActions = [];
let pendingActionAcks = new Map();
let pendingAction = null;
let bearFriendSearchResults = [];
let bearFriendSearchSequence = 0;
let requestChannel = null;
let requestTopic = '';
let requestRefreshTimer = null;
let bearIdleActionTimer = null;
let lastAutonomousBearAction = '';
let lastBearActivityAt = Date.now();
let bearsAreAsleep = false;
let bearAtmosphereTimer = null;
let bearMoments = [];

function getPoints() {
  return Math.max(0, Number(sharedPoints) || 0);
}
function announceSharedLevelUp(previousPoints, nextPoints) {
  const unlocked = REWARDS.filter(reward => previousPoints < reward.unlockPoints && nextPoints >= reward.unlockPoints);
  if (!unlocked.length) return;
  const names = unlocked.map(reward => reward.name).join(', ');
  if (typeof toast === 'function') toast('New Bear Hugs reward unlocked: ' + names + ' ♡');
  else setStatus('New Bear Hugs reward unlocked: ' + names + ' ♡');
}
async function loadSharedProgress() {
  const user = getMe(), client = getSupabase();
  if (!user?.id || !selectedFriendId || !client || !isAcceptedPartner(selectedFriendId)) {
    sharedPoints = 0;
    lastSharedAction = '';
    equippedRewardIds = [];
    sharedProgressPairKey = '';
    sharedProgressInitialized = false;
    updateUI();
    return;
  }
  const requestedPartnerId = String(selectedFriendId);
  const [low, high] = [String(user.id), requestedPartnerId].sort();
  const pairKey = low + ':' + high;
  if (pairKey !== sharedProgressPairKey) {
    sharedProgressPairKey = pairKey;
    sharedPoints = 0;
    lastSharedAction = '';
    equippedRewardIds = [];
    sharedProgressInitialized = false;
    updateUI();
  }
  let { data, error } = await client.from('bear_partner_progress')
    .select('love_points,last_action,equipped_reward_ids')
    .eq('partner_low', low)
    .eq('partner_high', high)
    .maybeSingle();
  // Keep the Love Meter readable on databases where the equipment migration
  // has not been applied yet. Reward writes still require the shared RPC.
  if (error && (error.code === '42703' || /equipped_reward_ids.*(does not exist|not found)|column .*equipped_reward_ids/i.test(error.message || ''))) {
    const fallback = await client.from('bear_partner_progress')
      .select('love_points,last_action')
      .eq('partner_low', low)
      .eq('partner_high', high)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
    // The local equipment cache is restored only after the stale-pair guard below.
  }
  // Realtime refreshes and partner switches can overlap. Ignore stale responses
  // rather than allowing an older pair's points or equipment to replace the current pair.
  if (sharedProgressPairKey !== pairKey || String(selectedFriendId) !== requestedPartnerId ||
      String(getMe()?.id || '') !== String(user.id)) return;
  if (error) {
    console.warn('Shared Bear Hugs progress could not load:', error.message || error);
    setStatus('Your shared Love Meter could not load. Please try again. ♡');
    return;
  }
  const previousPoints = sharedPoints;
  sharedPoints = Math.max(sharedPoints, Number(data?.love_points) || 0);
  lastSharedAction = String(data?.last_action || '');
  if (Array.isArray(data?.equipped_reward_ids)) {
    equippedRewardIds = data.equipped_reward_ids.filter(id => REWARDS.some(reward => reward.id === id));
  } else {
    loadEquippedRewards(pairKey);
  }
  try { localStorage.setItem(EQUIPPED_KEY_PREFIX + pairKey, JSON.stringify(equippedRewardIds)); } catch {}
  if (sharedProgressInitialized) announceSharedLevelUp(previousPoints, sharedPoints);
  sharedProgressInitialized = true;
  updateUI();
}
function createBearActionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 3) | 8).toString(16);
  });
}
async function recordSharedAction(action, partnerId = selectedFriendId, actionId = createBearActionId()) {
  const user = getMe(), client = getSupabase();
  if (!user?.id || !partnerId || !client || !isAcceptedPartner(partnerId)) return false;
  const pairKey = [String(user.id), String(partnerId)].sort().join(':');
  const { data, error } = await client.rpc('record_bear_hug_action', {
    p_partner_id: partnerId,
    p_action: action,
    p_action_id: actionId
  });
  if (error) {
    console.warn('Shared Bear Hugs points could not be saved:', error.message || error);
    setStatus('Your bear moment was sent, but its Love Meter points could not be saved. ♡');
    return false;
  }
  if (sharedProgressPairKey !== pairKey || String(selectedFriendId) !== String(partnerId)) return true;
  const previousPoints = sharedPoints;
  sharedPoints = Math.max(sharedPoints, Number(data) || 0);
  lastSharedAction = action;
  if (sharedProgressInitialized) announceSharedLevelUp(previousPoints, sharedPoints);
  sharedProgressInitialized = true;
  updateUI();
  return true;
}
function getNextReward(points) {
  return REWARDS.find(reward => points < reward.unlockPoints) || null;
}
function loadEquippedRewards(pairKey = sharedProgressPairKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(EQUIPPED_KEY_PREFIX + pairKey) || '[]');
    equippedRewardIds = Array.isArray(saved) ? saved.filter(id => REWARDS.some(reward => reward.id === id)) : [];
  } catch { equippedRewardIds = []; }
}
let equipmentSaveInFlight = false;
async function saveEquippedRewards(partnerId, pairKey, rewardIds) {
  const client = getSupabase();
  if (!pairKey || !partnerId || !client || !isAcceptedPartner(partnerId)) return false;
  let result;
  try {
    result = await client.rpc('set_bear_hug_equipment', {
      p_partner_id: partnerId,
      p_reward_ids: rewardIds
    });
  } catch (error) {
    console.warn('Shared Bear Hugs equipment request failed:', error?.message || error);
    if (sharedProgressPairKey === pairKey && String(selectedFriendId) === String(partnerId)) {
      setStatus('Reward syncing is unavailable. Check your connection and Bear Hugs database updates. ♡');
    }
    return false;
  }
  const { data, error } = result || {};
  // A response for a previous partner must never overwrite the active partner's UI.
  if (sharedProgressPairKey !== pairKey || String(selectedFriendId) !== String(partnerId)) return false;
  if (error) {
    console.warn('Shared Bear Hugs equipment could not be saved:', error.message || error);
    setStatus(/function .*set_bear_hug_equipment.*(does not exist|not found)|schema cache/i.test(error.message || '')
      ? 'Reward syncing needs the latest Bear Hugs database migration. ♡'
      : 'Your reward could not sync to your Bearfriend. Please try again. ♡');
    return false;
  }
  equippedRewardIds = Array.isArray(data) ? data.filter(id => REWARDS.some(reward => reward.id === id)) : rewardIds;
  try { localStorage.setItem(EQUIPPED_KEY_PREFIX + pairKey, JSON.stringify(equippedRewardIds)); } catch {}
  updateUI();
  return true;
}
async function equipReward(id) {
  if (equipmentSaveInFlight) return;
  const reward = REWARDS.find(item => item.id === id);
  if (!reward || getPoints() < reward.unlockPoints) return;
  const partnerId = String(selectedFriendId || '');
  const pairKey = sharedProgressPairKey;
  if (!partnerId || !pairKey || !isAcceptedPartner(partnerId)) return;
  const previous = [...equippedRewardIds];
  const active = equippedRewardIds.includes(id);
  if (active) equippedRewardIds = equippedRewardIds.filter(item => item !== id);
  else {
    if (['background', 'headwear', 'skin'].includes(reward.slot)) {
      equippedRewardIds = equippedRewardIds.filter(item =>
        !REWARDS.some(other => other.id === item && other.slot === reward.slot)
      );
    }
    equippedRewardIds = [...equippedRewardIds, id];
  }
  const requestedRewards = [...equippedRewardIds];
  equipmentSaveInFlight = true;
  updateUI();
  try {
    const saved = await saveEquippedRewards(partnerId, pairKey, requestedRewards);
    if (!saved && sharedProgressPairKey === pairKey && String(selectedFriendId) === partnerId) {
      equippedRewardIds = previous;
      updateUI();
    }
  } finally {
    equipmentSaveInFlight = false;
  }
}

function ensureBearAccessoryLayers() {
  const svg = $('#bearPoseSvg');
  if (!svg) return;
  [0, 1].forEach(index => {
    const head = svg.querySelector('#h' + index);
    if (!head || head.querySelector('.bear-visual-accessory')) return;
    head.insertAdjacentHTML('beforeend',
      '<g class="bear-visual-accessory bear-visual-cap" aria-hidden="true" pointer-events="none">' +
        '<path d="M-25 -87 Q-22 -106 0 -108 Q22 -106 25 -87 Q2 -81 -25 -87Z" fill="#e96883" stroke="#a94361" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M-25 -87 Q0 -82 25 -87 Q19 -77 0 -77 Q-19 -77 -25 -87Z" fill="#f49ab0" stroke="#a94361" stroke-width="2.1" stroke-linejoin="round"/>' +
        '<path d="M-2 -103 Q0 -108 3 -103" fill="none" stroke="#ffe9a9" stroke-width="2.2" stroke-linecap="round"/>' +
        '<circle cx="0" cy="-99" r="3" fill="#fff0bd"/>' +
      '</g>' +
      '<g class="bear-visual-accessory bear-visual-crown" aria-hidden="true" pointer-events="none">' +
        '<path d="M-25 -82 L-20 -105 L-8 -92 L0 -112 L8 -92 L20 -105 L25 -82Z" fill="#f3ca68" stroke="#9e7538" stroke-width="2.3" stroke-linejoin="round"/>' +
        '<rect x="-25" y="-84" width="50" height="8" rx="3" fill="#ffe6a0" stroke="#9e7538" stroke-width="2"/>' +
        '<circle cx="-19" cy="-101" r="2.5" fill="#fff8dd"/><circle cy="-108" r="2.5" fill="#fff8dd"/><circle cx="19" cy="-101" r="2.5" fill="#fff8dd"/>' +
      '</g>'
    );
  });
}

function ensureLivingScene(scene) {
  if (!scene) return;
  const hour = new Date().getHours();
  const atmosphere = hour < 6 || hour >= 20 ? 'night' : hour < 11 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  ['morning', 'afternoon', 'evening', 'night'].forEach(name => scene.classList.toggle('bear-time-' + name, name === atmosphere));
  let ambience = scene.querySelector('.bear-living-atmosphere');
  if (!ambience) {
    ambience = document.createElement('div');
    ambience.className = 'bear-living-atmosphere';
    ambience.setAttribute('aria-hidden', 'true');
    ambience.innerHTML = '<span class="bear-living-petal petal-one">✿</span><span class="bear-living-petal petal-two">✧</span><span class="bear-living-petal petal-three">♡</span><span class="bear-living-glow"></span>';
    scene.appendChild(ambience);
  }

}
function getBearMomentsKey() {
  return 'cuteBunnyBearMoments:v1:' + (sharedProgressPairKey || 'unpaired');
}
function loadBearMoments() {
  try {
    const saved = JSON.parse(localStorage.getItem(getBearMomentsKey()) || '[]');
    bearMoments = Array.isArray(saved) ? saved.slice(0, 20) : [];
  } catch { bearMoments = []; }
}
function saveBearMoments() {
  try { localStorage.setItem(getBearMomentsKey(), JSON.stringify(bearMoments.slice(0, 20))); } catch {}
}
function renderBearMoments() {
  if (!bearMoments.length) return '<section class="bear-moments"><div><b>Our little memories</b><small>Delivered moments saved on this device</small></div><p>Your first little memory will appear here. ♡</p></section>';
  const labels = {hug:'A warm hug',kiss:'A sweet kiss',flykiss:'A flying kiss',hands:'Holding paws',dance:'A little dance',pet:'A gentle pat',feed:'Strawberry time',sleep:'A sleepy moment',tummy:'Tummy tickles',peekaboo:'Peekaboo',bump:'A tiny head bump',slap:'Playful surprise',idle:'A quiet moment'};
  return '<section class="bear-moments"><div><b>Our little memories</b><small>Recent moments saved on this device</small></div><div class="bear-moments-list">' + bearMoments.slice(0,6).map(moment => '<article><span>' + esc(labels[moment.action] || 'A little moment') + '</span><button type="button" data-bear-moment-favorite="' + esc(moment.actionId) + '" aria-pressed="' + (moment.favorite ? 'true' : 'false') + '" aria-label="' + (moment.favorite ? 'Remove favorite memory' : 'Favorite memory') + '">' + (moment.favorite ? '♥' : '♡') + '</button></article>').join('') + '</div></section>';
}
function recordBearMoment(event) {
  const detail = event?.detail || {};
  const action = String(detail.action || '');
  const actionId = String(detail.actionId || '');
  if (!action || !actionId || !selectedFriendId || !isAcceptedPartner(selectedFriendId)) return;
  if (bearMoments.some(moment => moment.actionId === actionId)) return;
  bearMoments.unshift({ action, actionId, at: Date.now(), favorite: false });
  bearMoments = bearMoments.slice(0, 20);
  saveBearMoments();
  updateUI();
}
function updateUI() {
  const root = $('#coupleBearGame');
  if (!root) return;
  const points = getPoints();
  const nextReward = getNextReward(points);
  const unlockedCount = REWARDS.filter(reward => points >= reward.unlockPoints).length;
  const pointsToNext = nextReward ? nextReward.unlockPoints - points : 0;
  const previousReward = nextReward
    ? [...REWARDS].reverse().find(reward => reward.unlockPoints < nextReward.unlockPoints && points >= reward.unlockPoints) || null
    : REWARDS[REWARDS.length - 1];
  const progressStart = previousReward ? previousReward.unlockPoints : 0;
  const progressSpan = nextReward ? nextReward.unlockPoints - progressStart : 1;
  const progressPercent = nextReward
    ? Math.max(0, Math.min(100, ((points - progressStart) / progressSpan) * 100))
    : 100;
  const scene = $('.couple-bears-scene', root);
  let careStrip = $('#bearCarePointsStrip', root);
  if (!careStrip) {
    careStrip = document.createElement('section');
    careStrip.id = 'bearCarePointsStrip';
    careStrip.className = 'bear-care-strip';
    careStrip.setAttribute('aria-label', 'Shared Care Points and Bear Hugs Level 1');
  }
  const actions = $('.couple-bear-actions', root);
  if (actions) actions.insertAdjacentElement('afterend', careStrip);
  else if (scene) scene.insertAdjacentElement('afterend', careStrip);
  else root.appendChild(careStrip);
  careStrip.innerHTML =
    '<div class="bear-care-strip-head">' +
      '<div class="bear-care-total"><span class="bear-care-mark" aria-hidden="true">✿</span><span><small>SHARED CARE POINTS</small><b>' + points.toLocaleString() + '</b></span></div>' +
      '<span class="bear-care-level"><small>BEAR LEVEL</small><b>1</b></span>' +
    '</div>' +
    '<div class="bear-care-track" role="progressbar" aria-label="' + (nextReward ? 'Progress to ' + esc(nextReward.name) : 'All keepsakes unlocked') + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(progressPercent) + '"><span style="width:' + progressPercent + '%"></span></div>' +
    '<div class="bear-care-foot"><span><b class="bear-care-progress-label">' + points.toLocaleString() + ' Care Points</b></span><b>' + (nextReward ? pointsToNext.toLocaleString() + ' to next treasure' : 'All treasures collected') + '</b></div>' +
    '<div class="bear-care-milestone"><span>✧</span>' + (nextReward
      ? 'Next keepsake: <b>' + esc(nextReward.name) + '</b> · ' + nextReward.unlockPoints.toLocaleString() + ' Care Points'
      : '<b>Every keepsake is unlocked!</b> Your little bear world is complete') + '</div>';

  let panel = $('#bearProgressionPanel', root);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'bearProgressionPanel';
    panel.className = 'bear-progression-panel';
    const footer = $('.couple-bear-footer', root);
    if (footer) footer.insertAdjacentElement('afterend', panel);
    else root.appendChild(panel);
  }
  if (!panel.dataset.rewardHandler) {
    panel.dataset.rewardHandler = 'true';
    panel.addEventListener('click', event => {
      const favorite = event.target.closest('[data-bear-moment-favorite]');
      if (favorite) {
        const moment = bearMoments.find(item => item.actionId === favorite.dataset.bearMomentFavorite);
        if (moment) { moment.favorite = !moment.favorite; saveBearMoments(); updateUI(); }
        return;
      }
      const button = event.target.closest('[data-bear-equip]');
      if (!button || button.disabled) return;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      void equipReward(button.dataset.bearEquip).finally(() => {
        if (button.isConnected) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      });
    });
  }

  const rewardCards = REWARDS.map((reward, index) => {
    const unlocked = points >= reward.unlockPoints;
    const applied = equippedRewardIds.includes(reward.id);
    const progressLabel = unlocked
      ? (applied ? 'Currently in your bear world' : 'Unlocked · ready to use')
      : (reward.unlockPoints - points).toLocaleString() + ' Care Points to unlock';
    return '<article class="bear-reward ' + (unlocked ? 'is-unlocked' : 'is-locked') + (applied ? ' is-applied' : '') + (nextReward?.id === reward.id ? ' is-next' : '') + '">' +
      '<div class="bear-reward-preview ' + reward.previewClass + '" aria-hidden="true"><span>' + reward.icon + '</span><i>✦</i><small>🐻　✿　🐻</small></div>' +
      '<div class="bear-reward-copy"><span class="bear-reward-kicker">' + reward.rarity + ' · TREASURE ' + (index + 1) + '</span><b>' + reward.name + '</b><small>' + reward.detail + '</small></div>' +
      '<div class="bear-reward-bottom"><span class="bear-reward-state">' + progressLabel + '</span>' +
      (unlocked ? '<button type="button" class="bear-reward-apply" data-bear-equip="' + reward.id + '" aria-pressed="' + applied + '">' + (applied ? 'Unequip' : 'Use reward') + '</button>' : '<span class="bear-reward-lock">🔒 ' + reward.unlockPoints.toLocaleString() + ' Care Points</span>') +
      '</div></article>';
  }).join('');

  const rewardSummary = nextReward
    ? '<div class="bear-next-reward"><div class="bear-next-reward-art ' + nextReward.previewClass + '">' + nextReward.icon + '</div><div><small>NEXT LITTLE TREASURE</small><b>' + nextReward.name + '</b><span>' + pointsToNext.toLocaleString() + ' more Care Points to unlock · keep sharing little moments</span></div></div>'
    : '<div class="bear-next-reward bear-all-unlocked"><div class="bear-next-reward-art preview-starry">✧</div><div><small>YOUR WORLD IS COMPLETE</small><b>Every treasure is yours!</b><span>Keep collecting sweet moments together.</span></div></div>';

  const progressPips = REWARDS.map(reward =>
    '<span class="bear-reward-pip ' + (points >= reward.unlockPoints ? 'is-filled' : '') + '" aria-hidden="true"></span>'
  ).join('');
  panel.innerHTML = rewardSummary +
    '<section class="bear-rewards"><div class="bear-rewards-heading"><div><b>Little treasures</b><small>' + unlockedCount + ' of ' + REWARDS.length + ' unlocked · collect them with Care Points</small><div class="bear-reward-progress-pips" role="img" aria-label="' + unlockedCount + ' of ' + REWARDS.length + ' treasures unlocked">' + progressPips + '</div></div><span class="bear-reward-count"><b>' + unlockedCount + '</b><small>OF ' + REWARDS.length + '</small></span></div><div class="bear-rewards-list">' +
    rewardCards + '</div></section>' + renderBearMoments();

  if (scene) {
    scene.classList.toggle('bear-reward-sunset', equippedRewardIds.includes('sunset-meadow'));
    scene.classList.toggle('bear-reward-strawberry', equippedRewardIds.includes('strawberry-hat'));
    scene.classList.toggle('bear-reward-honey', equippedRewardIds.includes('honey-bear'));
    scene.classList.toggle('bear-reward-starry', equippedRewardIds.includes('starry-set'));
    scene.classList.toggle('bear-reward-crowns', equippedRewardIds.includes('starlight-crowns'));
  }
  ensureBearAccessoryLayers();
  ensureLivingScene(scene);
  if (sharedProgressPairKey) loadBearMoments();
  updatePartnerChip();
}

function partnerProfileFromRows(id) {
  for (const row of partnerRequests) {
    const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
    const recipient = Array.isArray(row.recipient) ? row.recipient[0] : row.recipient;
    if (String(row.sender_id) === String(id) && sender) return sender;
    if (String(row.recipient_id) === String(id) && recipient) return recipient;
  }
  return null;
}
function getSelectedFriend() {
  return getFriends().find(friend => String(friend?.id) === selectedFriendId) || partnerProfileFromRows(selectedFriendId);
}
function setStatus(message) {
  const status = $('#coupleBearStatus');
  if (status) status.textContent = message;
}
let partnerRequests = [];
let partnerRequestsLoaded = false;
async function loadPartnerRequests() {
  const user = getMe(), client = getSupabase();
  if (!user?.id || !client) return false;
  const { data, error } = await client.from('bear_partner_requests')
    .select('id,sender_id,recipient_id,status,created_at,sender:profiles!bear_partner_requests_sender_id_fkey(id,username,display_name,mascot),recipient:profiles!bear_partner_requests_recipient_id_fkey(id,username,display_name,mascot)')
    .or('sender_id.eq.' + user.id + ',recipient_id.eq.' + user.id)
    .order('created_at', { ascending: false }).limit(100);
  if (error) {
    console.warn('Bear Partner requests could not load:', error.message || error);
    partnerRequestsLoaded = false;
    setStatus('Bearfriend requests could not load. Please try again. ♡');
    return false;
  }
  partnerRequests = data || [];
  partnerRequestsLoaded = true;
  updatePartnerChip();
  return true;
}
function isAcceptedPartner(id) {
  const uid = String(getMe()?.id || '');
  return partnerRequests.some(row => row.status === 'accepted' &&
    ((String(row.sender_id) === uid && String(row.recipient_id) === String(id)) ||
     (String(row.recipient_id) === uid && String(row.sender_id) === String(id))));
}
function requestFor(id) {
  const uid = String(getMe()?.id || '');
  return partnerRequests.find(row =>
    (String(row.sender_id) === uid && String(row.recipient_id) === String(id)) ||
    (String(row.recipient_id) === uid && String(row.sender_id) === String(id)));
}
function renderPickerList() {
  const modal = $('#bearFriendPicker');
  if (!modal) return;
  const uid = String(getMe()?.id || '');
  const selected = getSelectedFriend();
  const hasSelected = !!(selected && selectedFriendId && isAcceptedPartner(selectedFriendId));
  const incoming = partnerRequests.filter(row => row.status === 'pending' && String(row.recipient_id) === uid);
  const candidates = [...new Map([...getFriends(), ...(typeof friendResults !== 'undefined' ? friendResults : []), ...bearFriendSearchResults]
    .filter(friend => friend?.id && String(friend.id) !== uid)
    .map(friend => [String(friend.id), friend])).values()];

  const selectedHtml = hasSelected
    ? '<article class="bear-current-partner"><span class="bear-friend-avatar">' + esc(selected.mascot || '🐰') + '</span><span class="bear-friend-choice-copy"><b>' + esc(selected.display_name || selected.displayName || selected.username || 'Friend') + ' · Bearfriend</b><small>Your selected Bearfriend</small></span><button type="button" class="bear-partner-remove" data-bear-remove>Remove Bearfriend</button></article>'
    : '';

  const requestsHtml = incoming.length
    ? incoming.map(row => {
        const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender || {};
        return '<article class="bear-request-row"><span class="bear-friend-avatar">' + esc(sender.mascot || '🐰') + '</span><span class="bear-request-copy"><b>' + esc(sender.display_name || sender.displayName || sender.username || 'A friend') + '</b><small>@' + esc(sender.username || '') + ' wants to be your Bearfriend</small></span><button class="bear-request-accept" data-bear-accept="' + esc(row.id) + '">Accept</button><button class="bear-request-decline" data-bear-decline="' + esc(row.id) + '" aria-label="Decline request">×</button></article>';
      }).join('')
    : '<div class="bear-request-empty">No Bearfriend requests yet.</div>';

  const peopleHtml = candidates.length ? candidates.map(friend => {
    const id = String(friend.id), req = requestFor(id);
    let action = isAcceptedPartner(id)
      ? (id === selectedFriendId
        ? '<span class="bear-request-state is-current">Your Bearfriend</span>'
        : '<button class="bear-friend-choice-action is-accepted" data-bear-select="' + esc(id) + '">Choose Bearfriend</button>')
      : req?.status === 'pending' && String(req.sender_id) === uid
        ? '<span class="bear-request-state">Request sent</span><button class="bear-request-cancel" data-bear-cancel="' + esc(req.id) + '">Cancel</button>'
        : req?.status === 'pending'
          ? '<button class="bear-request-accept" data-bear-accept="' + esc(req.id) + '">Accept</button>'
          : '<button class="bear-friend-choice-action" data-bear-invite="' + esc(id) + '">Send request</button>';
    return '<article class="bear-friend-choice' + (id === selectedFriendId ? ' is-selected' : '') + '"><span class="bear-friend-avatar">' + esc(friend.mascot || '🐰') + '</span><span class="bear-friend-choice-copy"><b>' + esc(friend.display_name || friend.displayName || friend.username || 'Friend') + '</b><small>@' + esc(friend.username || '') + '</small></span>' + action + '</article>';
  }).join('') : '<div class="bear-no-friends">Your friend list is empty. Search for a username above, or add friends from the Friends tab.</div>';

  $('.bear-friend-picker-list', modal).innerHTML =
    (selectedHtml ? '<section class="bear-request-section"><h4>Current Bearfriend</h4>' + selectedHtml + '</section>' : '') +
    '<section class="bear-request-section"><h4>Requests</h4>' + requestsHtml + '</section>' +
    '<section class="bear-request-section"><h4>Choose a Bearfriend</h4>' + peopleHtml + '</section>';
}

async function removeBearfriend() {
  const user = getMe(), client = getSupabase(), partnerId = selectedFriendId;
  if (!user?.id || !client || !partnerId) return;
  const request = requestFor(partnerId);
  if (!request || request.status !== 'accepted') {
    setStatus('Your Bearfriend connection could not be found. Refresh and try again.');
    return;
  }
  const { data, error } = await client.from('bear_partner_requests')
    .delete().eq('id', request.id).eq('status', 'accepted')
    .select('id').maybeSingle();
  if (error || !data) {
    console.warn('Bearfriend removal failed:', error?.message || error);
    setStatus('Could not remove this Bearfriend. Please try again.');
    return;
  }
  partnerRequests = partnerRequests.filter(row => String(row.id) !== String(request.id));
  selectedFriendId = '';
  lastBearActivityAt = Date.now();
  bearsAreAsleep = false;
  try { localStorage.removeItem(SELECTED_KEY); } catch {}
  peerGeneration++;
  closeChannel(peerChannel);
  peerChannel = null;
  peerTopic = '';
  peerReady = false;
  peerPromise = null;
  sharedPoints = 0;
  lastSharedAction = '';
  sharedProgressPairKey = '';
  sharedProgressInitialized = false;
  equippedRewardIds = [];
  updatePartnerChip();
  updateUI();
  renderPickerList();
  setStatus('Bearfriend removed. You can choose another friend anytime.');
}

async function sendPartnerInvite(id) {
  const user = getMe(), client = getSupabase();
  if (!user?.id || !client) return;
  await loadPartnerRequests();
  const existing = requestFor(id);
  if (existing?.status === 'accepted') { await chooseFriend(id); return; }
  if (existing?.status === 'pending') {
    if (String(existing.recipient_id) === String(user.id)) await answerPartnerInvite(existing.id, true);
    else setStatus('Your Bearfriend request is waiting for a reply. ♡');
    return;
  }
  const { error } = await client.from('bear_partner_requests').insert({ sender_id: user.id, recipient_id: id, status: 'pending' });
  if (error) { console.warn('Bearfriend request failed:', error.message || error); setStatus('Your Bearfriend request could not be sent. Please try again. ♡'); return; }
  await loadPartnerRequests();
  renderPickerList();
  setStatus('Bearfriend request sent. ♡');
}
async function cancelPartnerRequest(id) {
  const user = getMe(), client = getSupabase();
  if (!user?.id || !client) return;
  const { data, error } = await client.from('bear_partner_requests')
    .delete().eq('id', id).eq('sender_id', user.id).eq('status', 'pending')
    .select('id').maybeSingle();
  if (error || !data) {
    console.warn('Bearfriend request cancellation failed:', error?.message || error);
    setStatus('That request could not be cancelled. Please refresh and try again. ♡');
    return;
  }
  await loadPartnerRequests();
  renderPickerList();
  setStatus('Bearfriend request cancelled. ♡');
}
async function answerPartnerInvite(id, accept) {
  const user = getMe(), client = getSupabase();
  const { data, error } = await client.from('bear_partner_requests')
    .update({ status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString() })
    .eq('id', id).eq('recipient_id', user.id).eq('status', 'pending')
    .select('sender_id').maybeSingle();
  if (error || !data) { console.warn('Bearfriend response failed:', error?.message || 'No matching pending request'); setStatus('Could not update that Bearfriend request. Please retry. ♡'); return; }
  await loadPartnerRequests();
  renderPickerList();
  if (accept) await chooseFriend(String(data.sender_id));
}
function ensurePicker() {
  if ($('#bearFriendPicker')) return;
  const modal = document.createElement('div');
  modal.id = 'bearFriendPicker';
  modal.className = 'bear-friend-picker hidden';
  modal.innerHTML = '<section class="bear-friend-picker-card" role="dialog" aria-modal="true" aria-labelledby="bearFriendPickerTitle"><button type="button" class="bear-friend-picker-close" aria-label="Close">×</button><span class="bear-picker-art">🐻 ♡ 🐻</span><small>YOUR LITTLE BEARFRIEND SPACE</small><h3 id="bearFriendPickerTitle">Choose your Bearfriend</h3><p>Choose an accepted friend for your little bears. You can change this anytime; your choice will be remembered.</p><form class="bear-friend-search" id="bearFriendSearchForm"><input id="bearFriendSearchInput" type="search" maxlength="24" autocomplete="off" spellcheck="false" placeholder="Find a friend by username…" aria-label="Find a friend by username"><button type="submit">Find</button></form><div class="bear-friend-picker-list"><div class="bear-no-friends">Loading your requests and friends… ♡</div></div><p class="bear-picker-footnote">You can change your Bearfriend later. ♡</p></section>';
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('.bear-friend-picker-close')) {
      pendingAction = null; modal.classList.add('hidden'); return;
    }
    const invite = event.target.closest('[data-bear-invite]');
    if (invite) { void sendPartnerInvite(invite.dataset.bearInvite); return; }
    const accept = event.target.closest('[data-bear-accept]');
    if (accept) { void answerPartnerInvite(accept.dataset.bearAccept, true); return; }
    const decline = event.target.closest('[data-bear-decline]');
    if (decline) { void answerPartnerInvite(decline.dataset.bearDecline, false); return; }
    const cancel = event.target.closest('[data-bear-cancel]');
    if (cancel) { void cancelPartnerRequest(cancel.dataset.bearCancel); return; }
    const select = event.target.closest('[data-bear-select]');
    if (select) void chooseFriend(select.dataset.bearSelect);
    const remove = event.target.closest('[data-bear-remove]');
    if (remove) void removeBearfriend();
  });
  modal.addEventListener('submit', event => {
    if (!event.target.matches('#bearFriendSearchForm')) return;
    event.preventDefault();
    void searchBearFriends();
  });
}
async function searchBearFriends() {
  const input = $('#bearFriendSearchInput');
  const query = String(input?.value || '').trim();
  if (!query) { setStatus('Type a username to find your friend. ♡'); return; }
  if (!/^[a-zA-Z0-9_]{1,24}$/.test(query)) { setStatus('Usernames use letters, numbers, and underscores. ♡'); return; }
  if (typeof api !== 'function') { setStatus('Friend search is not available right now. ♡'); return; }
  const sequence = ++bearFriendSearchSequence;
  const list = $('.bear-friend-picker-list', $('#bearFriendPicker'));
  if (list) list.innerHTML = '<div class="bear-no-friends">Finding your friend… ♡</div>';
  try {
    const results = await api('/users?q=' + encodeURIComponent(query));
    if (sequence !== bearFriendSearchSequence) return;
    bearFriendSearchResults = Array.isArray(results) ? results : [];
    renderPickerList();
    if (!bearFriendSearchResults.length) setStatus('No matching friend found. Check the username and try again. ♡');
  } catch (error) {
    console.warn('Bearfriend friend search failed:', error?.message || error);
    if (list) list.innerHTML = '<div class="bear-no-friends">Could not search right now. Please try again. ♡</div>';
  }
}
async function openPicker(action = null) {
  if (action) pendingAction = action;
  ensurePicker();
  const modal = $('#bearFriendPicker');
  modal.classList.remove('hidden');
  $('.bear-friend-picker-list', modal).innerHTML = '<div class="bear-no-friends">Loading your requests and friends… ♡</div>';
  const needsFriendRefresh = !getFriends().length && !(typeof friendResults !== 'undefined' && friendResults.length) && typeof refresh === 'function';
  if (needsFriendRefresh) {
    try { await refresh(); } catch (error) { console.warn('Friends could not refresh for Bearfriend picker:', error?.message || error); }
  }
  await loadPartnerRequests();
  renderPickerList();
}
function updatePartnerChip() {
  const root = $('#coupleBearGame');
  if (!root) return;
  let chip = $('.bear-partner-chip', root);
  if (!chip) {
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'bear-partner-chip';
    chip.addEventListener('click', () => openPicker());
  }
  const friend = getSelectedFriend();
  const accepted = !!(friend && isAcceptedPartner(selectedFriendId));
  chip.hidden = !!selectedFriendId && !partnerRequestsLoaded;
  chip.textContent = accepted
    ? (friend.display_name || friend.displayName || friend.username || 'Friend') + ' · Bearfriend'
    : 'Choose Bearfriend';
  chip.setAttribute('aria-label', accepted ? 'Manage Bearfriend' : 'Choose Bearfriend');
  chip.title = accepted ? 'Manage Bearfriend' : 'Choose Bearfriend';
  const scene = $('.couple-bears-scene', root);
  if (scene) scene.insertAdjacentElement('beforebegin', chip);
  else root.appendChild(chip);
}
function updateConnectionStatus() {
  if (!getSelectedFriend()) return;
  if (peerReady && ownReady) setStatus('Connected with ' + (getSelectedFriend().display_name || getSelectedFriend().displayName || getSelectedFriend().username || 'your friend') + '. Choose a little action together. ♡');
}
function closeChannel(channel) {
  const client = getSupabase();
  if (channel && client) {
    try { void client.removeChannel(channel); } catch {}
  }
}
function ensureOwnChannel() {
  const client = getSupabase();
  const user = getMe();
  if (!client || !user?.id) return Promise.resolve(false);
  const topic = 'cute-bunny-bear-actions-' + String(user.id);
  if (ownChannel && ownTopic === topic && ownReady) return Promise.resolve(true);
  if (ownChannel && ownTopic === topic && ownPromise) return ownPromise;
  closeChannel(ownChannel);
  ownChannel = null;
  ownTopic = topic;
  ownReady = false;
  ownPromise = new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      ownPromise = null;
      if (!value) {
        closeChannel(ownChannel);
        ownChannel = null;
        ownTopic = '';
        ownReady = false;
      }
      resolve(value);
    };
    const channel = client.channel(topic, { config: { broadcast: { self: false, ack: true } } })
      .on('broadcast', { event: 'bear-action' }, ({ payload }) => receiveAction(payload))
      .on('broadcast', { event: 'bear-action-ack' }, ({ payload }) => {
        const pending = pendingActionAcks.get(String(payload?.actionId || ''));
        if (!pending || String(payload?.fromUserId || '') !== pending.partnerId) return;
        clearTimeout(pending.timer);
        pendingActionAcks.delete(String(payload.actionId));
        pending.resolve(true);
      });
    ownChannel = channel;
    channel.subscribe(status => {
      if (channel !== ownChannel) return;
      ownReady = status === 'SUBSCRIBED';
      if (ownReady) {
        updateConnectionStatus();
        finish(true);
      } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        ownReady = false;
        finish(false);
        console.warn('Bear Hugs receive channel status:', status);
      }
    });
    setTimeout(() => finish(ownReady), 6000);
  });
  return ownPromise;
}
async function ensurePeerChannel(friendId) {
  const client = getSupabase();
  if (!client || !friendId) return false;
  const topic = 'cute-bunny-bear-actions-' + String(friendId);
  if (peerChannel && peerTopic === topic && peerReady) return true;
  if (peerChannel && peerTopic === topic && peerPromise) return peerPromise;
  if (peerTopic !== topic) {
    peerGeneration++;
    closeChannel(peerChannel);
    peerChannel = null;
    peerTopic = topic;
    peerReady = false;
    peerPromise = null;
  }
  if (!peerChannel) peerChannel = client.channel(topic, { config: { broadcast: { self: false, ack: true } } });
  if (peerReady) return true;
  const generation = peerGeneration;
  const channel = peerChannel;
  peerPromise = new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      if (generation === peerGeneration) {
        peerPromise = null;
        if (!value) {
          closeChannel(peerChannel);
          peerChannel = null;
          peerTopic = '';
          peerReady = false;
        }
      }
      resolve(value);
    };
    channel.subscribe(status => {
      if (generation !== peerGeneration || channel !== peerChannel) return;
      peerReady = status === 'SUBSCRIBED';
      if (peerReady) {
        updateConnectionStatus();
        finish(true);
      } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        peerReady = false;
        finish(false);
        console.warn('Bear Hugs send channel status:', status);
      }
    });
    setTimeout(() => finish(peerReady), 6000);
  });
  return peerPromise;
}
async function chooseFriend(id) {
  const friend = [...getFriends(), ...(typeof friendResults !== 'undefined' ? friendResults : []), partnerProfileFromRows(id)].find(item => item && String(item?.id) === String(id));
  if (!friend) return;
  await loadPartnerRequests();
  if (!isAcceptedPartner(id)) {
    setStatus('A Bearfriend request must be accepted before playing together. ♡');
    await openPicker();
    return;
  }
  selectedFriendId = String(friend.id);
  lastBearActivityAt = Date.now();
  bearsAreAsleep = false;
  try { localStorage.setItem(SELECTED_KEY, selectedFriendId); } catch {}
  $('#bearFriendPicker')?.classList.add('hidden');
  updatePartnerChip();
  setStatus('Connecting your two little bears… ♡');
  const results = await Promise.all([ensureOwnChannel(), ensurePeerChannel(selectedFriendId)]);
  if (results.every(Boolean)) updateConnectionStatus();
  else setStatus('Your partner is selected, but the live connection is still reconnecting. Try an action again shortly. ♡');
  await loadSharedProgress();
  scheduleBearIdleAction();
  if (pendingAction) {
    const action = pendingAction;
    pendingAction = null;
    runLocalAction(action);
  }
}
async function sendAction(action, partnerId = selectedFriendId, actionId = createBearActionId()) {
  const friend = getFriends().find(item => String(item?.id) === String(partnerId)) || partnerProfileFromRows(partnerId);
  const user = getMe();
  const client = getSupabase();
  if (!friend || !user?.id || !client || !isAcceptedPartner(partnerId)) {
    setStatus('Choose a friend before starting your little moment. ♡');
    openPicker();
    return false;
  }
  const connected = await ensurePeerChannel(partnerId);
  if (!connected || !peerChannel) {
    setStatus('Your bears are trying to reconnect. Please try that action again in a moment. ♡');
    return false;
  }
  const payload = {
    action,
    actionId,
    userId: String(user.id),
    toUserId: String(partnerId),
    gender: user.gender || null,
    sentAt: Date.now()
  };
  let resolveAcknowledgement;
  const acknowledgement = new Promise(resolve => { resolveAcknowledgement = resolve; });
  const ackTimer = setTimeout(() => {
    pendingActionAcks.delete(payload.actionId);
    resolveAcknowledgement(false);
  }, 3500);
  pendingActionAcks.set(payload.actionId, { partnerId: String(partnerId), resolve: resolveAcknowledgement, timer: ackTimer });
  try {
    const result = await peerChannel.send({ type: 'broadcast', event: 'bear-action', payload });
    if (result !== 'ok') {
      clearTimeout(ackTimer);
      pendingActionAcks.delete(payload.actionId);
      resolveAcknowledgement(false);
      console.warn('Bear Hugs action was not delivered:', result);
      setStatus('That little moment could not reach your friend. Please try again. ♡');
      return false;
    }
    const acknowledged = await acknowledgement;
    if (acknowledged) {
      setStatus('Your Bearfriend received the little moment. ♡');
    } else {
      setStatus('Your little moment was sent, but your Bearfriend has not confirmed receiving it yet. ♡');
    }
    return acknowledged;
  } catch (error) {
    clearTimeout(ackTimer);
    pendingActionAcks.delete(payload.actionId);
    resolveAcknowledgement(false);
    console.warn('Bear Hugs action send failed:', error?.message || error);
    setStatus('That little moment could not reach your friend. Please try again. ♡');
    return false;
  }
}
function applyRemoteAction(action, payload) {
  if (!ACTIONS.has(action)) return;
  noteBearActivity();
  const root = $('#coupleBearGame');
  if (root && typeof originalTrigger === 'function') {
    originalTrigger(action, { remote: true, gender: payload.gender });
    if (action === 'sleep') bearsAreAsleep = true;
    lastSharedAction = action;
    window.dispatchEvent(new CustomEvent('cute-bunny:bear-action', {
      detail: { action, actionId: String(payload.actionId || '') }
    }));
    updateUI();
    const sender = getFriends().find(friend => String(friend?.id) === String(payload.userId));
    setStatus((sender?.display_name || sender?.displayName || sender?.username || 'Your friend') +
      ' chose ' + (action === 'hands' ? 'to hold paws' : action) + '. ♡');
  } else {
    // The sender records shared points once through the database RPC.
    // Never award a second copy on the receiving browser.
    if (pendingRemoteActions.length >= 20) pendingRemoteActions.shift();
    pendingRemoteActions.push({ action, payload });
  }
}
function receiveAction(payload) {
  const user = getMe();
  if (!payload || !user?.id) return;
  if (String(payload.toUserId || '') !== String(user.id)) return;
  if (String(payload.userId || '') === String(user.id)) return;
  const senderIsFriend = getFriends().some(friend => String(friend?.id) === String(payload.userId)) || !!partnerProfileFromRows(payload.userId);
  if (!senderIsFriend || !isAcceptedPartner(payload.userId) || !ACTIONS.has(String(payload.action || ''))) return;
  // The recipient automatically pairs with the friend who initiated the shared action.
  selectedFriendId = String(payload.userId);
  try { localStorage.setItem(SELECTED_KEY, selectedFriendId); } catch {}
  updatePartnerChip();
  void ensurePeerChannel(selectedFriendId);
  applyRemoteAction(String(payload.action), payload);
  if (payload.actionId) void sendActionAcknowledgement(payload);
}
async function sendActionAcknowledgement(actionPayload) {
  const senderId = String(actionPayload?.userId || '');
  const user = getMe();
  if (!senderId || !user?.id || !actionPayload?.actionId) return;
  const connected = await ensurePeerChannel(senderId);
  if (!connected || !peerChannel || peerTopic !== 'cute-bunny-bear-actions-' + senderId) return;
  try {
    await peerChannel.send({
      type: 'broadcast',
      event: 'bear-action-ack',
      payload: {
        actionId: String(actionPayload.actionId),
        fromUserId: String(user.id),
        toUserId: senderId,
        receivedAt: Date.now()
      }
    });
  } catch (error) {
    console.warn('Bear Hugs acknowledgement could not be sent:', error?.message || error);
  }
}
function flushPendingRemoteAction() {
  if (!pendingRemoteActions.length || !$('#coupleBearGame') || typeof originalTrigger !== 'function') return;
  const pending = pendingRemoteActions.shift();
  const scene = $('.couple-bears-scene');
  if (scene) scene.dataset.action = pending.action;
  originalTrigger(pending.action, { remote: true, gender: pending.payload.gender, queued: true });
  if (pending.action === 'sleep') bearsAreAsleep = true;
  lastSharedAction = pending.action;
  window.dispatchEvent(new CustomEvent('cute-bunny:bear-action', {
    detail: { action: pending.action, actionId: String(pending.payload.actionId || '') }
  }));
  const sender = getFriends().find(friend => String(friend?.id) === String(pending.payload.userId));
  setStatus((sender?.display_name || sender?.displayName || sender?.username || 'Your friend') +
    ' chose ' + (pending.action === 'hands' ? 'to hold paws' : pending.action) + '. ♡');
  updateUI();
  if (pendingRemoteActions.length) setTimeout(flushPendingRemoteAction, 1200);
}
async function runLocalAction(action) {
  if (!ACTIONS.has(action)) return;
  noteBearActivity();
  if (!selectedFriendId || !getSelectedFriend() || !isAcceptedPartner(selectedFriendId)) {
    openPicker(action);
    return;
  }
  if (typeof originalTrigger !== 'function') {
    setStatus('The bear animation is still loading. Please try again in a moment. ♡');
    return;
  }

  // Play immediately and keep every action button available. Network delivery,
  // acknowledgement, and Care Point recording happen independently in the
  // background so a slow connection never blocks the next interaction.
  const partnerId = String(selectedFriendId);
  const actionId = createBearActionId();
  originalTrigger(action, { remote: true, gender: getMe()?.gender });
  if (action === 'sleep') bearsAreAsleep = true;
  updateUI();
  setStatus('A little moment for your Bearfriend… ♡');

  void (async () => {
    try {
      const delivered = await sendAction(action, partnerId, actionId);
      if (!delivered) return;
      await recordSharedAction(action, partnerId, actionId);
      // Count only actions confirmed as delivered; action IDs keep retries
      // and concurrent sends from awarding duplicate quest credit.
      window.dispatchEvent(new CustomEvent('cute-bunny:bear-action', { detail: { action, actionId } }));
    } catch (error) {
      console.warn('Bear Hugs action could not be completed:', error?.message || error);
      setStatus('Your bears enjoyed the moment, but it could not reach your Bearfriend. ♡');
    }
  })();
}
function ensureProgressChannel() {
  const client = getSupabase(), user = getMe();
  if (!client || !user?.id) return;
  const topic = 'cute-bunny-bear-progress-' + String(user.id);
  if (progressChannel && progressTopic === topic) return;
  closeChannel(progressChannel);
  progressChannel = client.channel(topic)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bear_partner_progress' }, () => {
      void loadSharedProgress();
    })
    .subscribe(status => {
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        console.warn('Shared Bear Hugs progress updates unavailable:', status);
      }
    });
  progressTopic = topic;
}
function ensureRequestChannel() {
  const client = getSupabase(), user = getMe();
  if (!client || !user?.id) return;
  const topic = 'cute-bunny-bear-requests-' + String(user.id);
  if (requestChannel && requestTopic === topic) return;
  closeChannel(requestChannel);
  requestChannel = null;
  requestTopic = topic;
  requestChannel = client.channel(topic)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bear_partner_requests' }, () => {
      if (requestRefreshTimer) clearTimeout(requestRefreshTimer);
      requestRefreshTimer = setTimeout(async () => {
        requestRefreshTimer = null;
        const loaded = await loadPartnerRequests();
        if (!loaded) return;
        if (selectedFriendId && !isAcceptedPartner(selectedFriendId)) {
          selectedFriendId = '';
          try { localStorage.removeItem(SELECTED_KEY); } catch {}
          closeChannel(peerChannel);
          peerChannel = null;
          peerTopic = '';
          peerReady = false;
        }
        updatePartnerChip();
        updateUI();
        if (!$('#bearFriendPicker')?.classList.contains('hidden')) renderPickerList();
      }, 180);
    })
    .subscribe(status => {
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) console.warn('Bearfriend live request updates unavailable:', status);
    });
}
function startBearHugsRealtime() {
  ensureRequestChannel();
  ensureProgressChannel();
  void ensureOwnChannel();
  if (selectedFriendId && getSelectedFriend()) void ensurePeerChannel(selectedFriendId);
}
function closeBearHugsRealtime() {
  closeChannel(requestChannel);
  closeChannel(progressChannel);
  progressChannel = null;
  progressTopic = '';
  requestChannel = null;
  requestTopic = '';
  if (requestRefreshTimer) { clearTimeout(requestRefreshTimer); requestRefreshTimer = null; }
  closeChannel(ownChannel);
  closeChannel(peerChannel);
  ownChannel = peerChannel = null;
  ownTopic = peerTopic = '';
  ownReady = peerReady = false;
  ownPromise = peerPromise = null;
  peerGeneration++;
}

function scheduleBearIdleAction(delay = 25000) {
  if (bearIdleActionTimer) clearTimeout(bearIdleActionTimer);
  bearIdleActionTimer = null;
  const root = $('#coupleBearGame');
  if (!root || document.hidden || !selectedFriendId || !isAcceptedPartner(selectedFriendId)) return;
  bearIdleActionTimer = setTimeout(() => {
    bearIdleActionTimer = null;
    runAutonomousBearAction();
  }, Math.max(1000, delay));
}
function runAutonomousBearAction() {
  const root = $('#coupleBearGame');
  if (!root || document.hidden || !selectedFriendId || !isAcceptedPartner(selectedFriendId) || bearsAreAsleep) return;
  if (typeof originalTrigger !== 'function') {
    scheduleBearIdleAction(1500);
    return;
  }
  const idleFor = Date.now() - lastBearActivityAt;
  const choices = idleFor >= 120000 ? ['sleep'] : ['hug', 'kiss', 'flykiss', 'hands', 'dance', 'pet', 'tummy', 'feed', 'peekaboo', 'bump'];
  const available = choices.filter(action => action !== lastAutonomousBearAction);
  const action = available[Math.floor(Math.random() * available.length)] || 'pet';
  lastAutonomousBearAction = action;
  // Autonomous moments are purely visual: do not broadcast them, award points,
  // or count them toward daily missions.
  originalTrigger(action, { remote: true, gender: getMe()?.gender, autonomous: true });
  if (action === 'sleep') { bearsAreAsleep = true; return; }
  scheduleBearIdleAction(25000);
}
function noteBearActivity() {
  lastBearActivityAt = Date.now();
  bearsAreAsleep = false;
  scheduleBearIdleAction(25000);
}

function install() {
  if (window.__cuteBunnyBearHugsFixed) return;
  window.__cuteBunnyBearHugsFixed = true;
  ensurePicker();
  window.addEventListener('cute-bunny:bear-action', recordBearMoment);
  if (!bearAtmosphereTimer) bearAtmosphereTimer = setInterval(() => ensureLivingScene($('.couple-bears-scene')), 15 * 60 * 1000);

  // Delegate from document because the app replaces #content on every render.
  document.addEventListener('click', event => {
    const root = event.target.closest?.('#coupleBearGame');
    if (!root) return;
    const actionButton = event.target.closest('[data-couple-action]');
    const sceneTap = !actionButton && event.target.closest('.couple-bears-scene, #bearPoseSvg');
    if (!actionButton && !sceneTap) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const action = actionButton ? actionButton.dataset.coupleAction : 'pet';
    void (async () => {
      // The saved Bearfriend ID is restored synchronously, while the accepted
      // relationship/profile rows load asynchronously. Wait for that check
      // before deciding to show the chooser.
      if (selectedFriendId && !partnerRequestsLoaded) {
        const loaded = await loadPartnerRequests();
        if (!loaded) {
          setStatus('Checking your saved Bearfriend connection. Please try again in a moment. ♡');
          return;
        }
      }
      if (selectedFriendId && getSelectedFriend() && isAcceptedPartner(selectedFriendId)) {
        updatePartnerChip();
        runLocalAction(action);
        return;
      }
      void openPicker(action);
    })();
  }, true);

  if (typeof window.startBearRealtime === 'function') window.startBearRealtime = startBearHugsRealtime;
  if (typeof window.publishBearAction === 'function') window.publishBearAction = () => {};
  if (typeof window.closeRealtime === 'function') {
    window.closeRealtime = function() {
      closeBearHugsRealtime();
      return originalCloseRealtime ? originalCloseRealtime.apply(this, arguments) : undefined;
    };
  }

  let observedGameRoot = $('#coupleBearGame');
  const observer = new MutationObserver(() => {
    const currentRoot = $('#coupleBearGame');
    if (currentRoot === observedGameRoot) return;
    observedGameRoot = currentRoot;
    if (currentRoot) {
      updatePartnerChip();
      updateUI();
      flushPendingRemoteAction();
      scheduleBearIdleAction();
      // The Bearfriend chooser is intentionally opened by the first bear interaction,
      // not by an automatic page-load popup. This keeps the experience predictable.
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('storage', event => {
    if (event.key === LOVE_KEY) updateUI();
    if (event.key === SELECTED_KEY) {
      selectedFriendId = localStorage.getItem(SELECTED_KEY) || '';
      updatePartnerChip();
      scheduleBearIdleAction();
    }
  });
  window.addEventListener('focus', () => {
    void loadPartnerRequests().then(() => {
      if (selectedFriendId && isAcceptedPartner(selectedFriendId)) startBearHugsRealtime();
    });
    startBearHugsRealtime();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      startBearHugsRealtime();
      scheduleBearIdleAction();
    } else if (bearIdleActionTimer) {
      clearTimeout(bearIdleActionTimer);
      bearIdleActionTimer = null;
    }
  });
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(eventName => {
    document.addEventListener(eventName, event => {
      if (event.target?.closest?.('#coupleBearGame')) noteBearActivity();
    }, { capture: true, passive: eventName !== 'keydown' });
  });

  startBearHugsRealtime();
  updatePartnerChip();
  updateUI();
  void loadPartnerRequests().then(loaded => {
    if (!loaded) return;
    if (selectedFriendId && !isAcceptedPartner(selectedFriendId)) {
      selectedFriendId = '';
      try { localStorage.removeItem(SELECTED_KEY); } catch {}
    } else if (selectedFriendId) {
      updatePartnerChip();
      startBearHugsRealtime();
      void loadSharedProgress();
      scheduleBearIdleAction();
    }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
})();