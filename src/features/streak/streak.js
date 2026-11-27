/* streak feature functions; classic-script compatibility with current app state. */
'use strict';

function streakBadge(count) {
  return count >= 30 ? '🌟 Love-garden legend' : count >= 7 ? '🌼 Week in bloom' : count >= 3 ? '🌱 Growing steadily' : count > 0 ? '🌷 First blossoms' : '✨ Fresh start';
}

function streakWidget() {
  const count = Math.max(0, Number(me?.login_streak) || 0);
  const subtitle = count ? count + (count === 1 ? ' day in a row' : ' days in a row') : 'Start your streak today ♡';
  const thumbnailLabel = count ? 'Open your ' + count + '-day streak garden' : 'Open your streak garden';
  return '<article class="tile streak-tile"><div class="tile-art streak-art streak-art-trigger" data-open-streak role="button" tabindex="0" aria-label="' + esc(thumbnailLabel) + '">' +
    '<span class="streak-plant-illustration streak-plant-svg" aria-hidden="true">' +
      '<svg viewBox="0 0 240 132" role="img" aria-hidden="true"><defs><linearGradient id="streak-pot" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5c8d5"/><stop offset="1" stop-color="#d98daa"/></linearGradient><linearGradient id="streak-leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c0d6a9"/><stop offset="1" stop-color="#7fa47d"/></linearGradient></defs><ellipse cx="120" cy="120" rx="67" ry="7" fill="#a98a9b" opacity=".17"/><g class="streak-artwork"><path d="M120 105Q91 79 73 69M120 104Q119 69 120 47M121 104Q151 78 169 64" fill="none" stroke="#789b78" stroke-width="4" stroke-linecap="round"/><path d="M99 88Q69 61 57 82Q75 105 99 88ZM139 86Q165 57 184 75Q168 102 139 86Z" fill="url(#streak-leaf)" stroke="#739473" stroke-width="2"/><path d="M82 83q8 0 13 4M151 83q12-6 22-4" fill="none" stroke="#dce9ce" stroke-width="2" stroke-linecap="round"/><path d="M82 83q17-22 9-48M120 72Q99 53 91 35M121 65Q143 42 150 23" fill="none" stroke="#789b78" stroke-width="3.5" stroke-linecap="round"/><g transform="translate(91 29)"><g fill="#f3c4d3"><ellipse cy="-12" rx="6" ry="10"/><ellipse cy="12" rx="6" ry="10"/><ellipse cx="-12" rx="10" ry="6"/><ellipse cx="12" rx="10" ry="6"/><ellipse cx="-8.5" cy="-8.5" rx="6" ry="8"/><ellipse cx="8.5" cy="8.5" rx="6" ry="8"/></g><circle r="5" fill="#e7bd70"/><circle r="2" fill="#fff0bd"/></g><g transform="translate(151 22)"><g fill="#f8df9e"><ellipse cy="-11" rx="5.5" ry="9"/><ellipse cy="11" rx="5.5" ry="9"/><ellipse cx="-11" rx="9" ry="5.5"/><ellipse cx="11" rx="9" ry="5.5"/><ellipse cx="-8" cy="-8" rx="5.5" ry="7.5"/><ellipse cx="8" cy="8" rx="5.5" ry="7.5"/></g><circle r="4.5" fill="#c58e70"/></g><g transform="translate(120 44)"><g fill="#dfc6e9"><ellipse cy="-9" rx="5" ry="7.5"/><ellipse cy="9" rx="5" ry="7.5"/><ellipse cx="-9" rx="7.5" ry="5"/><ellipse cx="9" rx="7.5" ry="5"/></g><circle r="3.8" fill="#e6c477"/></g><path d="M79 94Q120 101 161 94L153 119Q120 130 87 119Z" fill="url(#streak-pot)" stroke="#c77f9e" stroke-width="2.5"/><path d="M77 94Q120 103 163 94L160 103Q120 111 80 103Z" fill="#f8dce5" stroke="#c77f9e" stroke-width="2"/><path d="M101 110q19-12 38 0-19 13-38 0Z" fill="#fff2f4" opacity=".95"/><path d="M120 106v9" stroke="#c77f9e" stroke-width="1.5"/><path d="M93 114q27 8 54 0" fill="none" stroke="#fff5f5" stroke-width="1.5" opacity=".8"/><path d="m43 34 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm151 22 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#d5b36e"/><path d="M183 19c-5-7-15-2-11 5 2 4 11 10 11 10s9-6 11-10c4-7-6-12-11-5Z" fill="#e7a9bd"/></g></svg></span></div>' +
    '<h3>Your streak</h3><p data-streak-live-subtitle title="' + esc(subtitle) + '">' + esc(subtitle) + '</p><button type="button" class="primary streak-open-button" data-open-streak>Open streak →</button></article>';
}

function syncStreakWidget() {
  const count = Math.max(0, Number(me?.login_streak) || 0);
  const subtitle = count ? count + (count === 1 ? ' day in a row' : ' days in a row') : 'Start your streak today ♡';
  document.querySelectorAll('[data-streak-live-subtitle]').forEach(node => {
    node.textContent = subtitle;
    node.title = subtitle;
  });
  const thumbnail = document.querySelector('.streak-art-trigger[data-open-streak]');
  if (thumbnail) thumbnail.setAttribute('aria-label', count ? 'Open your ' + count + '-day streak garden' : 'Open your streak garden');
}

async function recordLoginStreak() {
  if (!me || !sb) return;
  const userId = me.id;
  const timezone = normalizeStreakTimeZone(getBrowserStreakTimeZone());
  const today = streakDateInTimeZone(timezone);
  const cacheKey = 'cuteBunnyStreak:' + userId;
  const attemptKey = userId + ':' + timezone + ':' + today;
  if (streakRecordInFlight && streakRecordInFlightKey === attemptKey) return streakRecordInFlight;

  let saved = { count: 0, date: '' };
  try { saved = JSON.parse(localStorage.getItem(cacheKey) || '{}'); } catch {}
  const legacyCount = Math.max(0, Math.min(3650, Number(saved.count) || 0));
  const legacyDate = /^\d{4}-\d{2}-\d{2}$/.test(String(saved.date || '')) ? saved.date : null;

  const request = (async () => {
    try {
      const { data, error } = await sb.rpc('record_login_streak_for_timezone', {
        p_timezone: timezone,
        p_legacy_count: legacyCount,
        p_legacy_date: legacyDate
      });
      if (error) throw error;
      if (me?.id !== userId) return;
      const result = Array.isArray(data) ? data[0] : data;
      const count = Number(result?.login_streak);
      const date = String(result?.last_login_date || '').slice(0, 10);
      if (!Number.isInteger(count) || count < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('The streak service returned an invalid count.');
      }
      me.login_streak = count;
      me.last_login_date = date;
      me.streak_timezone = normalizeStreakTimeZone(result?.streak_timezone || timezone);
      streakCountdownDayKey = streakDateInTimeZone(me.streak_timezone);
      try { localStorage.setItem(cacheKey, JSON.stringify({ count, date })); } catch {}
      saveStreakHistory(date, count);
      saveStreakMilestones(count);
      syncStreakWidget();
      if (page === 'streak') renderStreakPage();
    } catch (error) {
      console.error('Could not sync login streak:', error);
      if (me?.id === userId) toast('Your streak could not sync. Check your connection and reopen Cute Bunny.');
    }
  })();

  streakRecordInFlightKey = attemptKey;
  streakRecordInFlight = request;
  try {
    await request;
  } finally {
    if (streakRecordInFlight === request) {
      streakRecordInFlight = null;
      streakRecordInFlightKey = '';
    }
  }
}

function streakStorageKey(suffix) {
  return 'cuteBunnyStreak:' + String(me?.id || me?.username || 'guest') + ':' + suffix;
}

function readStreakHeartMilestones() {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('heart-milestones')) || '[]');
    return new Set(Array.isArray(saved) ? saved.map(Number) : []);
  } catch { return new Set(); }
}

function saveStreakHeartMilestones(count) {
  const earned = readStreakHeartMilestones();
  [10, 100, 250, 500, 750, 1000, 1500, 2000].forEach(value => { if (count >= value) earned.add(value); });
  try { localStorage.setItem(streakStorageKey('heart-milestones'), JSON.stringify([...earned].sort((a,b) => a-b))); } catch {}
}

function readStreakDailyQuests(dateKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('daily-quests:' + dateKey)) || '{}');
    return {
      hearts: Array.isArray(saved.hearts) ? [...new Set(saved.hearts.map(String))] : [],
      bearActions: Array.isArray(saved.bearActions) ? saved.bearActions.slice(-99).map(String).filter(action => ['hug','kiss','flykiss','hands','dance','pet','feed','sleep','tummy','idle'].includes(action)) : [],
      bearActionIds: Array.isArray(saved.bearActionIds) ? saved.bearActionIds.slice(-120).map(String) : [],
      photo: saved.photo === true,
      photoCount: Math.max(saved.photo === true ? 1 : 0, Number(saved.photoCount) || 0),
      kissNote: saved.kissNote === true,
      kissNotes: Math.max(saved.kissNote === true ? 1 : 0, Number(saved.kissNotes) || 0),
      note: Math.max(0, Number(saved.note) || 0),
      noteTexts: Array.isArray(saved.noteTexts) ? saved.noteTexts.slice(-80).map(String) : [],
      song: saved.song === true,
      songCount: Math.max(saved.song === true ? 1 : 0, Number(saved.songCount) || 0),
      login: saved.login === true,
      badge: saved.badge === true
    };
  } catch { return {hearts:[], bearActions:[], bearActionIds:[], photo:false, photoCount:0, kissNote:false, kissNotes:0, note:0, noteTexts:[], song:false, songCount:0, login:false, badge:false}; }
}

function writeStreakDailyQuests(dateKey, state) {
  try { localStorage.setItem(streakStorageKey('daily-quests:' + dateKey), JSON.stringify(state)); } catch {}
}

function normalizeDailyQuestText(value) {
  return String(value || '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}♡❤]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function dailyQuestTextMatches(text, match) {
  const message = normalizeDailyQuestText(text);
  if (!message) return false;
  const keywords = Array.isArray(match) ? match : [match];
  const aliases = {
    hello: ['hello','hi','hey'],
    happy: ['happy','happiness','glad','joy','cheerful'],
    thank: ['thank','thanks','thankful','thank you','appreciate','appreciation'],
    dream: ['dream','dreams','wish','wishes'],
    beautiful: ['beautiful','beauty','lovely','pretty','gorgeous'],
    morning: ['morning','good morning'],
    night: ['night','good night','tonight'],
    kind: ['kind','kindness','caring','thoughtful'],
    win: ['win','wins','won','victory','achievement'],
    appreciate: ['appreciate','appreciation','grateful','thankful'],
    song: ['song','songs','music','melody'],
    remember: ['remember','memory','memories'],
    proud: ['proud','believe','encourage','you can do it'],
    '♡': ['♡','❤','love'],
    hope: ['hope','hopeful','wish','wishes'],
    day: ['day','today'],
    smile: ['smile','smiling','smiled','happy'],
    love: ['love','lovely','adore','caring']
  };
  return keywords.some(keyword => {
    const candidates = aliases[String(keyword).toLowerCase()] || [String(keyword)];
    return candidates.some(candidate => {
      const normalized = normalizeDailyQuestText(candidate);
      if (!normalized) return false;
      return (' ' + message + ' ').includes(' ' + normalized + ' ');
    });
  });
}

function getDailyQuestRotation(dateKey) {
  // A shared 20-day journey: one fresh chat quest, one photo quest,
  // and one community quest each day. Each category has 20 unique entries.
  const chatQuests = [
    ['Warm hello','Send a message that includes “hello”.','note','note','hello'],
    ['A happy thought','Share a message with the word “happy”.','note','note','happy'],
    ['A little thank-you','Send someone a thank-you message.','note','note','thank'],
    ['Dream big','Tell someone about a dream or wish.','note','note','dream'],
    ['A colourful thought','Share a message with any colour word.','note','note',['red','blue','green','yellow','pink','purple','orange','black','white','brown','grey','gray']],
    ['Morning sunshine','Send a good-morning message.','note','note','morning'],
    ['Moonlight wishes','Send a good-night message.','note','note','night'],
    ['Kind words','Send a message with the word “kind”.','note','note','kind'],
    ['Tiny victory','Share a little win from your day.','note','note','win'],
    ['A note of appreciation','Tell someone what you appreciate.','note','note','appreciate'],
    ['Favourite melody','Talk about a song you love.','note','note','song'],
    ['A memory to keep','Share a message about a favourite memory.','note','note','remember'],
    ['You can do it','Send someone an encouraging message.','note','note','proud'],
    ['A heart in words','Send a message with a heart symbol.','note','note','♡'],
    ['A hopeful note','Share something you are hopeful about.','note','note','hope'],
    ['How was your day?','Ask someone how their day is going.','note','note','day'],
    ['Pass on a smile','Send a message with the word “smile”.','note','note','smile'],
    ['A little love','Send a message that includes “love”.','note','note','love'],
    ['Three little messages','Send three chat messages today.','note','note',null,3],
    ['Keep the conversation going','Send five chat messages today.','note','note',null,5]
  ];
  const photoQuests = [
    ['Sky postcard','Share a photo of the sky.','photo','photo'],
    ['A favourite colour','Share a photo featuring your favourite colour.','photo','photo'],
    ['Little piece of nature','Share a photo of something from nature.','photo','photo'],
    ['Cosy corner','Share a photo of a cosy place or corner.','photo','photo'],
    ['A tasty moment','Share a photo of something you enjoyed eating.','photo','photo'],
    ['Tiny details','Share a close-up photo of an interesting detail.','photo','photo'],
    ['Flower of the day','Share a photo of a flower or plant.','photo','photo'],
    ['Golden hour','Share a photo in warm evening light.','photo','photo'],
    ['A view worth keeping','Share a photo of a view you love.','photo','photo'],
    ['Something handmade','Share a photo of something you made.','photo','photo'],
    ['A bookish moment','Share a photo of a book, page, or reading spot.','photo','photo'],
    ['Everyday beauty','Share a photo of something ordinary but lovely.','photo','photo'],
    ['Pet or animal friend','Share a photo of an animal.','photo','photo'],
    ['A little celebration','Share a photo of something that made you smile.','photo','photo'],
    ['Rainy-day mood','Share a photo that captures a rainy-day feeling.','photo','photo'],
    ['Your creative side','Share a photo of your art or creative work.','photo','photo'],
    ['A special keepsake','Share a photo of an object you treasure.','photo','photo'],
    ['Two tiny moments','Share two photos from your day.','photo','photo',null,2],
    ['A mini photo story','Share two photos that tell a little story.','photo','photo',null,2],
    ['Photo diary','Share three photos that capture your day.','photo','photo',null,3]
  ];
  const communityQuests = [
    ['Three hearts of kindness','Leave hearts on three different memories.','heart','hearts',null,3],
    ['A song to share','Share a song with your friends.','song','song'],
    ['Garden hello','Visit your little garden today.','login','login'],
    ['Five kind reactions','Leave hearts on five different memories.','heart','hearts',null,5],
    ['A soundtrack for today','Share a song that matches your mood.','song','song'],
    ['A little appreciation','Leave hearts on three memories from others.','heart','hearts',null,3],
    ['Music for the moment','Share another song you enjoy.','song','song'],
    ['A friendly visit','Check in and keep your streak growing.','login','login'],
    ['Spread the sunshine','Like five memories that brighten your day.','heart','hearts',null,5],
    ['A peaceful melody','Share a calm song.','song','song'],
    ['Three thoughtful hearts','Send hearts to three different memories.','heart','hearts',null,3],
    ['Back to the garden','Visit your garden and care for your streak.','login','login'],
    ['Celebrate a creator','Leave hearts on five memories.','heart','hearts',null,5],
    ['Share your soundtrack','Share a song you would recommend.','song','song'],
    ['A little wave','Check in to your garden today.','login','login'],
    ['Kindness all around','Like three memories from other people.','heart','hearts',null,3],
    ['One more melody','Share a song that makes you smile.','song','song'],
    ['Garden regular','Keep your daily streak alive.','login','login'],
    ['Five bright hearts','Leave hearts on five lovely memories.','heart','hearts',null,5],
    ['Music for everyone','Share one final song for today.','song','song']
  ];

  // Day 1 began on 2026-11-21. Every account sees the same set on each date.
  const campaignStart = '2026-11-21';
  const startDate = new Date(campaignStart + 'T00:00:00Z');
  const currentDate = new Date(dateKey + 'T00:00:00Z');
  const elapsedDays = Number.isFinite(startDate.getTime()) && Number.isFinite(currentDate.getTime())
    ? Math.max(0, Math.floor((currentDate - startDate) / 86400000)) : 0;
  const dayIndex = elapsedDays % 20;
  // Bear Hugs missions rotate into the community slot on five days of each
  // 20-day cycle, keeping the daily set at three quests.
  const bearHugQuests = {
    3: ['A warm bear hug','Give your Bearfriend two hugs.','bear-action','heart','hug',2],
    7: ['A kiss for your Bearfriend','Share two kisses with your Bearfriend.','bear-action','heart','kiss',2],
    11: ['A little bear cuddle','Pet your Bearfriend three times.','bear-action','heart','pet',3],
    15: ['Dance together','Share two dances with your Bearfriend.','bear-action','heart','dance',2],
    19: ['Three caring moments','Share any three Bear Hugs actions together.','bear-action','heart',null,3]
  };
  const entries = [chatQuests[dayIndex], photoQuests[dayIndex], bearHugQuests[dayIndex] || communityQuests[dayIndex]];

  return entries.map((entry, slot) => {
    const [title, description, kind, art, match, target = 1] = entry;
    const id = 'day-' + (dayIndex + 1) + '-quest-' + (slot + 1);
    const progress = state => {
      if (kind === 'heart') return Math.min(target, state.hearts.length);
      if (kind === 'bear-action') return Math.min(target, state.bearActions.filter(action => !match || action === match).length);
      if (kind === 'photo') return Math.min(target, state.photoCount);
      if (kind === 'song') return Math.min(target, state.songCount);
      if (kind === 'kiss-note') return Math.min(target, state.kissNotes);
      if (kind === 'login') return state.login ? 1 : 0;
      if (kind === 'note' && match) return Math.min(target, state.noteTexts.filter(text => dailyQuestTextMatches(text, match)).length);
      return Math.min(target, state.note);
    };
    return {id,title,description,target,art,kind,match,progress,done:state => progress(state) >= target};
  });
}

function readPetalRewards() {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('petal-rewards')) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
}

function petalRewardBalance(rewards = readPetalRewards()) {
 const pending=Object.values(rewards).reduce((sum,amount)=>{const value=Number(amount);return sum+(Number.isFinite(value)&&value>0?Math.trunc(value):0);},0);
 return Math.max(0,Math.trunc(Number(cloudPetalPoints)||0)+pending);
}

async function syncPetalPointsToCloud() {
 if(!sb||!me?.id)return false;
 if(petalPointsSyncInFlight)return petalPointsSyncInFlight;
 const userId=String(me.id);
 petalPointsSyncInFlight=(async()=>{
  const pending=readPetalRewards();
  for(const [key,rawAmount] of Object.entries(pending)){
   const amount=Math.trunc(Number(rawAmount)); if(!key||!Number.isFinite(amount)||amount<1)continue;
   const {data,error}=await sb.rpc('grant_petal_points',{p_grant_key:String(key),p_amount:amount});
   if(error)throw error;
   if(String(me?.id||'')!==userId)return false;
   if(data&&Number.isFinite(Number(data.petal_points)))cloudPetalPoints=Math.max(0,Number(data.petal_points));
   const latest=readPetalRewards();
   if(Number(latest[key])===Number(rawAmount)){delete latest[key];try{localStorage.setItem(streakStorageKey('petal-rewards'),JSON.stringify(latest));}catch{return false;}}
  }
  return true;
 })();
 try{return await petalPointsSyncInFlight;}
 catch(error){console.warn('Petal Points sync failed; pending rewards were retained:',error?.message||error);return false;}
 finally{petalPointsSyncInFlight=null;}
}

function awardPetalReward(key,amount,sync=true){
 if(!me||!key)return false;
 const rewardAmount=Math.trunc(Number(amount));
 if(!Number.isFinite(rewardAmount)||rewardAmount<1||rewardAmount>1000)return false;
 const rewards=readPetalRewards();if(Object.prototype.hasOwnProperty.call(rewards,key))return false;
 rewards[key]=rewardAmount;
 try{localStorage.setItem(streakStorageKey('petal-rewards'),JSON.stringify(rewards));}catch{return false;}
 if(sync)void syncPetalPointsToCloud();return true;
}

function readGardenCollection() {
  try {
    const value = JSON.parse(localStorage.getItem(streakStorageKey('garden-collection')) || '{}');
    return { owned: Array.isArray(value.owned) ? value.owned : [], equippedItems: Array.isArray(value.equippedItems) ? value.equippedItems : [value.equipped, value.bunny].filter(id => id && id !== 'none'), equipped: value.equipped || 'none', bunny: value.bunny || 'none' };
  } catch { return { owned: [], equippedItems: [], equipped: 'none', bunny: 'none' }; }
}

function saveGardenCollection(value) {
  try {
    localStorage.setItem(streakStorageKey('garden-collection'), JSON.stringify(value));
    // Keep the local change marked until the cloud confirms it. A later hydration
    // can safely retry instead of silently discarding an offline equip action.
    localStorage.setItem(streakStorageKey('garden-collection-pending-sync'), '1');
    return true;
  } catch { return false; }
}

function normalizeGardenCollection(value = {}) {
  const validIds = new Set(GARDEN_COLLECTIBLES.map(item => item.id));
  const owned = Array.isArray(value.owned) ? [...new Set(value.owned.filter(id => validIds.has(id)))] : [];
  const legacyEquipped = [value.equipped, value.bunny].filter(id => id && id !== 'none');
  const equippedItems = [...new Set((Array.isArray(value.equipped_items) ? value.equipped_items : Array.isArray(value.equippedItems) ? value.equippedItems : legacyEquipped).filter(id => owned.includes(id)))];
  return {
    owned,
    equippedItems,
    equipped: equippedItems.find(id => GARDEN_COLLECTIBLES.find(item => item.id === id)?.type === 'garden') || 'none',
    bunny: equippedItems.find(id => GARDEN_COLLECTIBLES.find(item => item.id === id)?.type === 'bunny') || 'none'
  };
}

async function syncGardenCollectionToCloud(value = readGardenCollection()) {
  if (!sb || !me?.id) return false;
  const userId = String(me.id);
  const normalized = normalizeGardenCollection(value);
  const { error } = await sb.from('profile_garden_collections').upsert({
    user_id: userId,
    owned: normalized.owned,
    equipped: normalized.equipped,
    bunny: normalized.bunny,
    equipped_items: normalized.equippedItems,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) {
    console.warn('Garden collection sync failed:', error.message || error);
    return false;
  }
  // Never write one account's response into another account's local cache.
  if (String(me?.id || '') !== userId) return false;
  try {
    localStorage.setItem(streakStorageKey('garden-collection'), JSON.stringify(normalized));
    localStorage.setItem(streakStorageKey('garden-collection-reconciled'), '1');
    localStorage.removeItem(streakStorageKey('garden-collection-pending-sync'));
  } catch {}
  return true;
}

async function hydrateGardenCollectionFromCloud() {
  if (!sb || !me?.id) return readGardenCollection();
  const userId = String(me.id);
  const { data, error } = await sb.from('profile_garden_collections')
    .select('owned,equipped,bunny,equipped_items,petal_points')
    .eq('user_id', userId)
    .maybeSingle();
  if (String(me?.id || '') !== userId) return readGardenCollection();
  if (error) {
    console.warn('Garden collection could not be loaded:', error.message || error);
    return readGardenCollection();
  }
  if (data) {
    cloudPetalPoints = Math.max(0, Number(data.petal_points) || 0);
    // Ownership is permanent once purchased: merge cloud and locally saved ownership
    // so a stale/empty copy cannot make a paid-for item appear purchasable again.
    const localCollection = normalizeGardenCollection(readGardenCollection());
    const cloudCollection = normalizeGardenCollection(data);
    const purchaseLedger = readPetalRewards();
    const ledgerOwned = GARDEN_COLLECTIBLES
      .filter(item => Object.prototype.hasOwnProperty.call(purchaseLedger, 'purchase:' + item.id))
      .map(item => item.id);
    // Import equipped selections from older local caches once, and whenever a
    // local equip action is still pending. After successful reconciliation, the
    // cloud becomes authoritative so an old device cannot undo a later unequip.
    const needsLocalEquipmentRecovery =
      localStorage.getItem(streakStorageKey('garden-collection-reconciled')) !== '1' ||
      localStorage.getItem(streakStorageKey('garden-collection-pending-sync')) === '1';
    const normalized = normalizeGardenCollection({
      ...data,
      owned: [...new Set([...cloudCollection.owned, ...localCollection.owned, ...ledgerOwned])],
      equippedItems: needsLocalEquipmentRecovery
        ? [...new Set([...cloudCollection.equippedItems, ...localCollection.equippedItems])]
        : cloudCollection.equippedItems
    });
    const cloudEquipmentsDiffer = normalized.equippedItems.length !== cloudCollection.equippedItems.length
      || normalized.equippedItems.some(id => !cloudCollection.equippedItems.includes(id));
    const cloudOwnershipDiffers = normalized.owned.length !== cloudCollection.owned.length
      || normalized.owned.some(id => !cloudCollection.owned.includes(id));
    if (cloudOwnershipDiffers || cloudEquipmentsDiffer) {
      await syncGardenCollectionToCloud(normalized);
    } else {
      try {
        localStorage.setItem(streakStorageKey('garden-collection'), JSON.stringify(normalized));
        localStorage.setItem(streakStorageKey('garden-collection-reconciled'), '1');
        localStorage.removeItem(streakStorageKey('garden-collection-pending-sync'));
      } catch {}
    }
    return normalized;
  }
  const legacy = normalizeGardenCollection(readGardenCollection());
  cloudPetalPoints = 0;
  await syncGardenCollectionToCloud(legacy);
  return legacy;
}

function renderFriendGardenCollection(collection, userId, isOwnProfile = false) {
  const gate = $('#friendProfileGate');
  if (!gate || gate.dataset.collectionUserId !== String(userId)) return;
  const section = $('#friendProfileCollection');
  const catalog = typeof GARDEN_COLLECTIBLES !== 'undefined' ? GARDEN_COLLECTIBLES : [];
  const equippedIds = new Set(collection.equippedItems || [collection.equipped, collection.bunny].filter(id => id && id !== 'none'));
  const ownedItems = catalog.filter(item => collection.owned.includes(item.id) && equippedIds.has(item.id));
  const count = $('#friendProfileCollectionCount');
  if (count) {
    count.textContent = ownedItems.length + (ownedItems.length === 1 ? ' treasure' : ' treasures');
    count.hidden = false;
  }
  const list = $('#friendProfileCollectionItems');
  if (!list) return;
  if (!ownedItems.length) {
    if (section) section.hidden = !isOwnProfile;
    list.innerHTML = isOwnProfile ? '<p class="friend-profile-empty">Collect your treasures in the shop ♡</p>' : '';
    return;
  }
  if (section) section.hidden = false;
  list.innerHTML = ownedItems.map(item => {
    const equipped = (collection.equippedItems || [collection.equipped, collection.bunny]).includes(item.id);
    return '<span class="friend-profile-collection-item garden-rarity-' + esc(item.rarity || 'common') + (equipped ? ' is-equipped' : '') + '" title="' + esc(item.name) + '" aria-label="' + esc(item.name + (equipped ? ', equipped' : '')) + '"><span class="friend-profile-collection-art">' + item.art + '<i class="sg-art-glint" aria-hidden="true">✧</i></span><small class="friend-profile-collection-name">' + esc(item.name) + '</small>' + (equipped ? '<i class="friend-profile-equipped-mark" aria-label="Equipped">✦</i>' : '') + '</span>';
  }).join('');
}

async function loadFriendGardenCollection(user, isOwnProfile) {
  const sequence = ++friendGardenRequestSequence;
  const gate = $('#friendProfileGate');
  if (!gate || !user?.id) return;
  gate.dataset.collectionUserId = String(user.id);
  let collection;
  if (isOwnProfile) {
    collection = await hydrateGardenCollectionFromCloud();
    const petalsNode = $('#friendProfilePetals');
    if (petalsNode && gate.dataset.collectionUserId === String(user.id)) petalsNode.textContent = petalRewardBalance().toLocaleString();
  } else {
    if (!sb) return;
    try {
      const { data, error } = await sb.from('profile_garden_collections')
        .select('owned,equipped,bunny,equipped_items,petal_points')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      collection = normalizeGardenCollection(data || {});
      const petalsNode = $('#friendProfilePetals');
      if (petalsNode && gate.dataset.collectionUserId === String(user.id)) petalsNode.textContent = Math.max(0, Number(data?.petal_points) || 0).toLocaleString();
      try { localStorage.setItem(friendGardenCollectionCacheKey(user.id), JSON.stringify(collection)); } catch {}
    } catch (error) {
      console.warn('Friend garden collection could not be loaded:', error?.message || error);
      return;
    }
  }
  if (sequence !== friendGardenRequestSequence || gate.dataset.collectionUserId !== String(user.id)) return;
  renderFriendGardenCollection(collection, user.id, isOwnProfile);
}

function updateGardenShopItem(id, collection) {
  const normalized = normalizeGardenCollection(collection);
  GARDEN_COLLECTIBLES.forEach(item => {
    const card = document.querySelector('.sg-collectible-card [data-buy-collectible="' + item.id + '"]')?.closest('.sg-collectible-card');
    const button = card?.querySelector('[data-buy-collectible]');
    if (!card || !button) return;
    const owned = normalized.owned.includes(item.id);
    const equipped = normalized.equippedItems.includes(item.id);
    card.classList.toggle('is-equipped', equipped);
    button.textContent = equipped ? 'Equipped ✓' : owned ? 'Equip' : item.cost + ' petals · Collect';
    button.disabled = !owned && petalRewardBalance() < item.cost;
    button.setAttribute('aria-label', equipped ? 'Unequip ' + item.name : owned ? 'Equip ' + item.name : 'Collect ' + item.name + ' for ' + item.cost + ' Petal Points');
  });
}

function updateGardenPetalBalance() {
  const balance = document.querySelector('.sg-petal-balance b');
  if (balance) balance.textContent = petalRewardBalance().toLocaleString() + ' Petal Points';
  const profileBalance = $('#friendProfilePetals');
  if (profileBalance && $('#friendProfileGate')?.dataset.ownProfile === 'true') profileBalance.textContent = petalRewardBalance().toLocaleString();
}

async function buyGardenCollectible(id) {
  const item = GARDEN_COLLECTIBLES.find(entry => entry.id === id);
  if (!item || !me || gardenPurchaseInFlight) return;
  if (!sb) {
    toast('The garden shop is temporarily unavailable. Please sign in again.');
    return;
  }

  gardenPurchaseInFlight = true;
  const buttons = [...document.querySelectorAll('[data-buy-collectible]')];
  buttons.forEach(button => {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
  });

  try {
    // Finish hydration and flush locally earned points before the database transaction.
    await gardenCollectionHydration;
    await hydrateGardenCollectionFromCloud();
    if (!await syncPetalPointsToCloud()) {
      throw new Error('Your Petal Points could not be synchronized. Please try again.');
    }

    const current = normalizeGardenCollection(readGardenCollection());
    const action = current.owned.includes(id) ? 'toggle_equip' : 'purchase';
    const { data, error } = await sb.rpc('perform_garden_shop_action', {
      p_item_id: id,
      p_action: action
    });
    if (error) throw error;
    if (!data || data.ok !== true || !Array.isArray(data.owned) || !Array.isArray(data.equipped_items)) {
      throw new Error('The shop returned an incomplete update. Please refresh and check your collection.');
    }

    // The RPC is the single source of truth: ownership, equipment and balance
    // are committed together under a row lock, so rapid requests cannot double-spend.
    const normalized = normalizeGardenCollection({
      owned: data.owned,
      equipped_items: data.equipped_items,
      equipped: data.equipped || 'none',
      bunny: data.bunny || 'none'
    });
    cloudPetalPoints = Math.max(0, Number(data.petal_points) || 0);
    try {
      localStorage.setItem(streakStorageKey('garden-collection'), JSON.stringify(normalized));
      localStorage.setItem(streakStorageKey('garden-collection-reconciled'), '1');
      localStorage.removeItem(streakStorageKey('garden-collection-pending-sync'));
    } catch {}

    updateGardenShopItem(id, normalized);
    updateGardenPetalBalance();

    if (data.status === 'already_owned') {
      toast(item.name + ' is already in your collection.');
    } else if (action === 'purchase') {
      toast(item.name + ' purchased and equipped!');
    } else {
      toast(normalized.equippedItems.includes(id) ? item.name + ' equipped!' : item.name + ' unequipped.');
    }
  } catch (error) {
    console.error('Garden shop action failed:', error?.message || error);
    toast(error?.message || 'The shop could not complete that action. Please try again.');
  } finally {
    gardenPurchaseInFlight = false;
    document.querySelectorAll('[data-buy-collectible]').forEach(button => {
      button.removeAttribute('aria-busy');
      const item = GARDEN_COLLECTIBLES.find(entry => entry.id === button.dataset.buyCollectible);
      const owned = readGardenCollection().owned.includes(button.dataset.buyCollectible);
      if (item) button.disabled = !owned && petalRewardBalance() < item.cost;
    });
    updateGardenPetalBalance();
  }
}

function getWeeklyBloomProgress(todayKey) {
  const date = new Date(todayKey + 'T00:00:00.000Z');
  const monday = shiftStreakDate(todayKey, -((date.getUTCDay() + 6) % 7));
  const completedDays = [];
  for (let i=0;i<7;i++) {
    const key = shiftStreakDate(monday, i);
    if (key > todayKey) continue;
    const state = readStreakDailyQuests(key);
    if (state.badge || getDailyQuestRotation(key).every(quest => quest.done(state))) completedDays.push(key);
  }
  return { monday, completedDays };
}

function claimWeeklyBloomReward(days, todayKey) {
  const progress = getWeeklyBloomProgress(todayKey);
  if (progress.completedDays.length < days) { toast('Complete ' + days + ' daily quest sets to unlock this weekly bloom.'); return; }
  const rewardKey = 'weekly:' + progress.monday + ':' + days;
  if (awardPetalReward(rewardKey, days === 3 ? 30 : days === 5 ? 50 : 100)) toast('Weekly Bloom reward collected! ✿');
  else toast('This weekly reward has already been collected.');
  renderStreakPage();
}

function claimDailyPetalChest() {
  if (!me) return;
  const dateKey = streakDateInTimeZone(normalizeStreakTimeZone(me.streak_timezone || getBrowserStreakTimeZone()));
  const state = readStreakDailyQuests(dateKey);
  if (!getDailyQuestRotation(dateKey).every(quest => quest.done(state))) {
    toast('Complete all three daily quests to open your reward chest.');
    return;
  }
  if (awardPetalReward('chest:' + dateKey, 25)) toast('Your daily chest opened! +25 Petal Points ✿');
  else toast('Today’s reward chest has already been claimed.');
  if (page === 'streak') renderStreakPage();
}

function recordStreakNoteQuest(text) {
  const content = String(text || '');
  if (!content.trim()) return;
  recordStreakDailyQuest('note', content);
  if (/💋|😘|😗|😙|😚|😽/u.test(content)) recordStreakDailyQuest('kiss-note', content);
}

function recordStreakDailyQuest(kind, value = '') {
  if (!me) return;
  const timezone = normalizeStreakTimeZone(me.streak_timezone || getBrowserStreakTimeZone());
  const dateKey = streakDateInTimeZone(timezone);
  const state = readStreakDailyQuests(dateKey);
  if (kind === 'heart' && value && !state.hearts.includes(String(value))) state.hearts.push(String(value));
  if (kind === 'bear-action') {
    const action = typeof value === 'object' ? String(value.action || '') : String(value || '');
    const actionId = typeof value === 'object' ? String(value.actionId || '') : '';
    if (['hug','kiss','flykiss','hands','dance','pet','feed','sleep','tummy','idle'].includes(action) &&
        (!actionId || !state.bearActionIds.includes(actionId))) {
      state.bearActions.push(action);
      if (actionId) state.bearActionIds.push(actionId);
      state.bearActions = state.bearActions.slice(-99);
      state.bearActionIds = state.bearActionIds.slice(-120);
    }
  }
  if (kind === 'photo') { state.photo = true; state.photoCount = Math.min(99,state.photoCount + 1); }
  if (kind === 'kiss-note') { state.kissNote = true; state.kissNotes = Math.min(99,state.kissNotes + 1); if (value) state.noteTexts.push(String(value)); }
  if (kind === 'note') { state.note = Math.min(99,state.note + 1); if (value) state.noteTexts.push(String(value)); }
  if (kind === 'song') { state.song = true; state.songCount = Math.min(99,state.songCount + 1); }
  if (kind === 'login') state.login = true;
  state.noteTexts = state.noteTexts.slice(-80);
  const quests = getDailyQuestRotation(dateKey);
  const previousState = readStreakDailyQuests(dateKey);
  const completedBefore = new Set(quests.filter(quest => quest.done(previousState)).map(quest => quest.id));
  const newlyCompletedQuests = quests.filter(quest => !completedBefore.has(quest.id) && quest.done(state));
  const newlyCompleted = !state.badge && quests.every(quest => quest.done(state));
  if (newlyCompleted) state.badge = true;
  writeStreakDailyQuests(dateKey, state);
  quests.forEach(quest => {
    if (quest.done(state)) awardPetalReward('quest:' + dateKey + ':' + quest.id, 10);
  });
  newlyCompletedQuests.filter(quest => !newlyCompleted).forEach(quest => toast(quest.title + ' complete! +10 Petal Points', {duration: 2400}));
  if (newlyCompleted) toast('Daily Bloom earned! Today’s chest is ready to open.', {duration: 4200});
  if (page === 'streak') renderStreakPage();
}

function streakDateKey(date) {
  return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + String(date.getUTCDate()).padStart(2, '0');
}

function shiftStreakDate(key, amount) {
  const date = new Date(key + 'T00:00:00.000Z');
  if (Number.isNaN(date.getTime())) return key;
  date.setUTCDate(date.getUTCDate() + amount);
  return streakDateKey(date);
}

function streakDateDistance(from, to) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(from || '') || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(to || '')) return null;
  const fromTime = Date.parse(from + 'T00:00:00.000Z');
  const toTime = Date.parse(to + 'T00:00:00.000Z');
  return Number.isFinite(fromTime) && Number.isFinite(toTime) ? Math.round((toTime - fromTime) / 86400000) : null;
}

function getBrowserStreakTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

function normalizeStreakTimeZone(value) {
  const candidate = String(value || 'UTC').trim() || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch { return 'UTC'; }
}

function streakDateInTimeZone(timeZone = 'UTC') {
  const zone = normalizeStreakTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return fields.year + '-' + fields.month + '-' + fields.day;
}

function streakTimeRemaining(timeZone = 'UTC') {
  const zone = normalizeStreakTimeZone(timeZone);
  const today = streakDateInTimeZone(zone);
  const [year, month, day] = shiftStreakDate(today, 1).split('-').map(Number);
  const targetWallTime = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  let midnight = targetWallTime;
  for (let pass = 0; pass < 4; pass++) {
    const fields = Object.fromEntries(formatter.formatToParts(new Date(midnight)).map(part => [part.type, part.value]));
    const wallTime = Date.UTC(
      Number(fields.year), Number(fields.month) - 1, Number(fields.day),
      Number(fields.hour), Number(fields.minute), Number(fields.second)
    );
    const correction = targetWallTime - wallTime;
    midnight += correction;
    if (correction === 0) break;
  }
  const minutes = Math.max(0, Math.ceil((midnight - Date.now()) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? hours + 'h ' + String(rest).padStart(2, '0') + 'm' : rest + 'm';
}

function updateStreakCountdownLabels() {
  const timezone = normalizeStreakTimeZone(me?.streak_timezone || getBrowserStreakTimeZone());
  const todayKey = streakDateInTimeZone(timezone);
  if (streakCountdownDayKey && todayKey !== streakCountdownDayKey) {
    streakCountdownDayKey = todayKey;
    void recordLoginStreak();
    recordStreakDailyQuest('login');
    if (page === 'streak') renderStreakPage();
  }
  const remaining = streakTimeRemaining(timezone);
  document.querySelectorAll('[data-streak-self-countdown]').forEach(node => { node.textContent = remaining; });
  document.querySelectorAll('[data-streak-friend-countdown]').forEach(node => { node.textContent = 'Visit today · ' + remaining + ' left'; });

  document.querySelectorAll('[data-streak-friend-status]').forEach(node => {
    const friend = {
      login_streak: Number(node.dataset.streakCount) || 0,
      last_login_date: node.dataset.lastLoginDate || null,
      streak_timezone: node.dataset.streakTimezone || 'UTC'
    };
    const snapshot = streakFriendSnapshot(friend);
    node.textContent = snapshot.label;
    const card = node.closest('.sg-friend-card');
    const countNode = card?.querySelector('[data-streak-friend-count]');
    if (countNode) countNode.textContent = snapshot.count === null ? '–' : String(snapshot.count);
    const countWrap = countNode?.closest('.sg-friend-flower-count');
    if (countWrap) countWrap.setAttribute('aria-label', snapshot.count === null ? 'Streak unavailable' : snapshot.count + (snapshot.count === 1 ? ' day streak' : ' days streak'));
  });
}

function startStreakCountdown() {
  streakCountdownDayKey = streakDateInTimeZone(me?.streak_timezone || getBrowserStreakTimeZone());
  updateStreakCountdownLabels();
  if (!streakCountdownInterval) streakCountdownInterval = window.setInterval(updateStreakCountdownLabels, 60000);
}

function readStreakPetalBest() {
  try {
    const value = Number(localStorage.getItem(streakStorageKey('petal-pairs-best')));
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch { return 0; }
}

function saveStreakPetalBest(moves) {
  const current = readStreakPetalBest();
  if (!Number.isInteger(moves) || moves < 1 || (current && current <= moves)) return current;
  try { localStorage.setItem(streakStorageKey('petal-pairs-best'), String(moves)); } catch {}
  return moves;
}

function readStreakHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('history')) || '[]');
    return new Set(Array.isArray(saved) ? saved.filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)) : []);
  } catch { return new Set(); }
}

function readStreakGardenBlooms(dateKey) {
  const valid = new Set(['pink','lavender','honey','rose','peach','lilac','cream']);
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('garden-blooms:' + dateKey)) || '[]');
    return new Set(Array.isArray(saved) ? saved.filter(id => valid.has(id)) : []);
  } catch { return new Set(); }
}

function saveStreakGardenBloom(dateKey, flowerId) {
  const valid = new Set(['pink','lavender','honey','rose','peach','lilac','cream']);
  if (!valid.has(flowerId)) return new Set();
  const blooms = readStreakGardenBlooms(dateKey);
  blooms.add(flowerId);
  try { localStorage.setItem(streakStorageKey('garden-blooms:' + dateKey), JSON.stringify([...blooms])); } catch {}
  return blooms;
}

function saveStreakHistory(dateKey, count) {
  const history = readStreakHistory();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) return;
  history.add(dateKey);
  for (let i = 1; i < Math.min(730, Math.max(1, Number(count) || 1)); i++) {
    history.add(shiftStreakDate(dateKey, -i));
  }
  try {
    localStorage.setItem(streakStorageKey('history'), JSON.stringify([...history].sort().slice(-1095)));
  } catch {}
}

function readStreakGoals() {
  const defaults = [
    {id:'memory', label:'Share a happy memory'},
    {id:'note', label:'Send a little love note'},
    {id:'music', label:'Enjoy a cozy song'}
  ];
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('goals')) || 'null');
    if (Array.isArray(saved)) return saved.filter(goal => goal && goal.id && goal.label).slice(0, 6);
  } catch {}
  try { localStorage.setItem(streakStorageKey('goals'), JSON.stringify(defaults)); } catch {}
  return defaults;
}

function writeStreakGoals(goals) {
  try { localStorage.setItem(streakStorageKey('goals'), JSON.stringify(goals.slice(0, 6))); } catch {}
}

function readStreakGoalChecks(dateKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('checks:' + dateKey)) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
}

function countSavedStreakGoalCompletions() {
  const prefix = streakStorageKey('checks:');
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        total += Object.values(saved).filter(value => value === true).length;
      }
    }
  } catch {}
  return total;
}

function updateStreakGoalProgress() {
  const list = $('#streakGoalsList');
  if (!list) return;
  const checks = readStreakGoalChecks(new Date().toISOString().slice(0, 10));
  const boxes = [...list.querySelectorAll('[data-streak-goal]')];
  const completed = boxes.filter(box => !!checks[box.dataset.streakGoal]).length;
  const percentage = boxes.length ? Math.round(completed / boxes.length * 100) : 0;
  const label = $('#streakGoalProgress');
  const bar = $('#streakGoalProgressBar');
  if (label) label.textContent = completed + ' of ' + boxes.length + ' bloomed';
  if (bar) {
    bar.style.width = percentage + '%';
    bar.setAttribute('aria-valuenow', String(percentage));
  }
  boxes.forEach(box => box.closest('.streak-goal')?.classList.toggle('is-done', !!checks[box.dataset.streakGoal]));
  const total = countSavedStreakGoalCompletions();
  const totalLabel = $('#sgAllTimeGoalCount');
  if (totalLabel) {
    totalLabel.hidden = total === 0;
    totalLabel.textContent = total + ' little ' + (total === 1 ? 'goal' : 'goals') + ' completed across your journal';
  }
}

function readStreakMilestones() {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('milestones')) || '[]');
    return new Set(Array.isArray(saved) ? saved.map(Number) : []);
  } catch { return new Set(); }
}

function saveStreakMilestones(count) {
  const earned = readStreakMilestones();
  [3, 7, 14, 30, 50, 100].forEach(value => { if (count >= value) earned.add(value); });
  try { localStorage.setItem(streakStorageKey('milestones'), JSON.stringify([...earned].sort((a,b) => a-b))); } catch {}
}

function resetStreakPetalGame() {
  const symbols = ['🌷','🌼','🌸','🌻','🌺','🍀'];
  const tones = ['rose','sunshine','lilac','gold','peach','mint'];
  const flowerPairs = symbols.map((symbol, index) => {
    const firstTone = tones[Math.floor(Math.random() * tones.length)];
    const otherTones = tones.filter(tone => tone !== firstTone);
    const secondTone = otherTones[Math.floor(Math.random() * otherTones.length)];
    const pairKey = String(index);
    return [
      { id: pairKey + '-a', pairKey, symbol, tone: firstTone },
      { id: pairKey + '-b', pairKey, symbol, tone: secondTone }
    ];
  });
  const cards = flowerPairs.flat();
  for (let index = cards.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  for (let index = cards.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  streakPetalGame = { cards, flipped: [], matched: [], moves: 0, locked: false, completed: false, newBest: false };
  renderStreakPetalGame();
}

function renderStreakPetalGame() {
  const board = $('#streakGameBoard');
  if (!board) return;
  const state = streakPetalGame;
  board.innerHTML = state.cards.map(card => {
    const matched = state.matched.includes(card.id);
    const revealed = matched || state.flipped.includes(card.id);
    const petalTone = card.tone || 'rose';
    return '<button type="button" class="sg-petal-card sg-petal-' + petalTone + (revealed ? ' is-revealed' : '') +
      (matched ? ' is-matched' : '') + (state.completed ? ' is-celebrating' : '') + '" data-streak-game-card="' + card.id +
      '" aria-pressed="' + revealed + '" aria-label="' + (revealed ? card.symbol : 'Reveal a flower') +
      '"' + (matched || state.locked || state.completed ? ' disabled' : '') + '>' +
      '<span class="sg-petal-back" aria-hidden="true">✿</span><span class="sg-petal-face" aria-hidden="true">' +
      card.symbol + '</span></button>';
  }).join('');
  const pairs = state.matched.length / 2;
  const status = $('#streakGameStatus');
  const moves = $('#streakGamePairsLeft');
  if (status) status.textContent = state.completed
    ? (state.newBest ? 'New personal best! ✿' : 'All six pairs found!')
    : state.locked ? 'Remember the flowers…' : 'Find all six pairs';
  if (moves) moves.textContent = state.completed ? 'All pairs found' : (6 - pairs) + ' pairs left';
  const progress = $('#streakGameProgressBar');
  if (progress) {
    progress.style.width = (pairs / 6 * 100) + '%';
    progress.setAttribute('aria-valuenow', String(pairs));
  }
  const best = $('#streakGameBest');
  if (best) best.textContent = readStreakPetalBest() ? 'Best ' + readStreakPetalBest() : 'No best yet';
}

function flipStreakPetalCard(cardId) {
  const state = streakPetalGame;
  if (state.locked || state.completed || state.matched.includes(cardId) || state.flipped.includes(cardId)) return;

  state.flipped.push(cardId);
  if (state.flipped.length === 2) {
    state.moves += 1;
    const [firstId,secondId] = state.flipped;
    const first = state.cards.find(card => card.id === firstId);
    const second = state.cards.find(card => card.id === secondId);
    if (first && second && first.pairKey === second.pairKey) {

      state.matched.push(firstId,secondId);
      state.flipped = [];
      state.completed = state.matched.length === state.cards.length;
      if (state.completed) {
        const previousBest = readStreakPetalBest();
        saveStreakPetalBest(state.moves);
        state.newBest = !previousBest || state.moves < previousBest;
      }
      renderStreakPetalGame();
      if (state.completed) {
        window.setTimeout(() => {
          if (streakPetalGame === state) resetStreakPetalGame();
        }, 1500);
      }
      return;
    }
    state.locked = true;
    renderStreakPetalGame();
    setTimeout(() => {
      if (streakPetalGame !== state) return;
      state.flipped = [];
      state.locked = false;
      if (page === 'streak') renderStreakPetalGame();
    }, 720);
    return;
  }
  renderStreakPetalGame();
}

function streakFriendSnapshot(friend) {
  if (!Object.prototype.hasOwnProperty.call(friend || {}, 'last_login_date')) {
    return { count: null, label: 'Streak unavailable', state: 'unknown' };
  }
  const count = Math.max(0, Number(friend.login_streak) || 0);
  const lastDate = String(friend.last_login_date || '').slice(0, 10);
  if (!lastDate) {
    return {
      count,
      label: count > 0 ? 'Streak date unavailable' : 'No streak yet',
      state: count > 0 ? 'unknown' : 'new'
    };
  }
  const timezone = normalizeStreakTimeZone(friend.streak_timezone || 'UTC');
  const todayKey = streakDateInTimeZone(timezone);
  const gap = streakDateDistance(lastDate, todayKey);
  if (gap === null || gap < 0) return { count, label: 'Activity unavailable', state: 'unknown' };
  if (gap > 1) return { count: 0, label: 'Streak paused', state: 'paused' };
  if (gap === 1) return { count, label: 'Visit today · ' + streakTimeRemaining(timezone) + ' left', state: 'due' };
  return { count, label: '', state: 'active' };
}

function streakFriendsMarkup() {
  if (!Array.isArray(friends) || !friends.length) {
    return '<div class="sg-friends-empty"><p>No friends in bloom yet.</p><button type="button" class="sg-find-friends" data-go="friends">Find friends</button></div>';
  }
  let liveState = {};
  try { liveState = presenceChannel?.presenceState?.() || {}; } catch {}
  const isOnline = id => isPresenceUserOnline(id, liveState);
  const stateRank = {active:0,due:1,paused:2,new:3,unknown:4};
  const orderedFriends = [...friends].sort((a,b) => {
    const onlineOrder = Number(isOnline(b.id)) - Number(isOnline(a.id));
    if (onlineOrder) return onlineOrder;
    const aSnapshot = streakFriendSnapshot(a);
    const bSnapshot = streakFriendSnapshot(b);
    return (stateRank[aSnapshot.state] ?? 4) - (stateRank[bSnapshot.state] ?? 4) ||
      (Number(b.login_streak) || 0) - (Number(a.login_streak) || 0) ||
      String(a.username || '').localeCompare(String(b.username || ''));
  });
  const rows = orderedFriends.map(friend => {
    const snapshot = streakFriendSnapshot(friend);
    const streakDays = snapshot.count === null ? '–' : String(snapshot.count);
    const streakAria = snapshot.count === null ? 'Streak unavailable' : snapshot.count + (snapshot.count === 1 ? ' day streak' : ' days streak');
    const displayName = String(friend.display_name || friend.username || 'Friend').trim() || 'Friend';
    const timezone = normalizeStreakTimeZone(friend.streak_timezone || 'UTC');
    const lastDate = String(friend.last_login_date || '').slice(0, 10);
    const rawCount = Math.max(0, Number(friend.login_streak) || 0);
    const initialPresence = presenceStatus === 'ready' ? 'Offline' : presenceStatus === 'error' ? 'Presence unavailable' : 'Connecting…';
    return '<div class="sg-friend-card" data-friend-id="' + esc(friend.id || '') + '" aria-label="' + esc(displayName) + ' garden">' +
      '<span class="sg-friend-avatar" aria-hidden="true">' + esc(friend.mascot || '🐰') + '</span>' +
      '<span class="sg-friend-details">' +
      '<span class="sg-friend-heading"><strong class="sg-friend-name">' + esc(displayName) + '</strong>' +
      '<span class="sg-friend-flower-count" aria-label="' + esc(streakAria) + '">' +
      '<strong data-streak-friend-count>' + streakDays + '</strong><i aria-hidden="true">🌸</i><em>streak</em></span></span>' +
      '<span class="sg-friend-meta"><small class="sg-friend-presence">' + initialPresence + '</small>' +
      '<small class="sg-friend-streak-status" data-streak-friend-status data-streak-timezone="' + esc(timezone) +
      '" data-last-login-date="' + esc(lastDate) + '" data-streak-count="' + rawCount + '">' + esc(snapshot.label) + '</small></span></span></div>';
  }).join('');
  return '<div class="sg-friend-list" aria-label="' + friends.length + ' followed friends">' + rows + '</div>';
}

async function loadKindnessEventStatus() {
 if(!sb||!me?.id||kindnessEventStatusLoading)return kindnessEventStatus;
 const userId=String(me.id);kindnessEventStatusLoading=true;
 try{
  const {data,error}=await sb.rpc('get_kindness_event_status');if(error)throw error;
  if(String(me?.id||'')!==userId)return null;
  kindnessEventStatus=data&&typeof data==='object'?data:null;kindnessEventStatusUserId=userId;
  const {data:garden,error:gardenError}=await sb.from('profile_garden_collections').select('petal_points').eq('user_id',userId).maybeSingle();
  if(!gardenError&&String(me?.id||'')===userId&&garden)cloudPetalPoints=Math.max(0,Number(garden.petal_points)||0);
  if(page==='streak')renderStreakPage();else if(page==='home')render();
  return kindnessEventStatus;
 }catch(error){console.warn('Kindness event status could not be loaded:',error?.message||error);return null;}
 finally{kindnessEventStatusLoading=false;}
}

async function claimKindnessEventReward() {
  if (!sb || !me?.id || kindnessClaimInFlight) return;
  const button = $('[data-claim-kindness-event]');
  if (button) button.disabled = true;
  kindnessClaimInFlight = true;
  try {
    const { data, error } = await sb.rpc('claim_kindness_event_reward');
    if (error) throw error;
    await hydrateGardenCollectionFromCloud();
    gardenCollectionReadyUserId = String(me.id);
    kindnessEventStatus = { ...(kindnessEventStatus || {}), state: 'claimed', bubble_count: Number(data?.petal_points) || Number(kindnessEventStatus?.bubble_count) || 0 };
    kindnessEventStatusUserId = String(me.id);
    if (page === 'streak') renderStreakPage();
    else if (page === 'home') render();
    toast('Your ' + (Number(data?.petal_points) || 0) + ' Petal Points have been added ♡');
  } catch (error) {
    toast(error?.message || 'Your kindness reward could not be claimed. Please try again.');
    void loadKindnessEventStatus();
  } finally {
    kindnessClaimInFlight = false;
    if (button) button.disabled = false;
  }
}

function renderKindnessEventMarkup() {
 const status=kindnessEventStatusUserId===String(me?.id||'')?kindnessEventStatus:null;
 if(!status||status.show_poster!==true)return '';
 const friendTimes=(Array.isArray(friends)?friends:[]).filter(friend=>friend&&friend.id&&friend.streak_timezone).slice(0,6).map(friend=>'<span class="sg-kindness-friend-time"><b>'+esc(friend.displayName||friend.display_name||friend.username||'Friend')+'</b><small>11:00 PM · '+esc(friend.streak_timezone)+'</small></span>').join('');
 const active=status.state==='active',count=Math.max(0,Number(status.bubble_count)||0);
 const timeZone=status.timezone||'Local timezone';
 const detail=active?count+' petals collected so far. Completed petals are added to your permanent balance after midnight.':'Your next kindness hour begins at 11 PM in your local timezone.';
 return '<section class="sg-kindness-event" aria-label="Kindness Hour">'+
 '<div class="sg-kindness-event-sparkle sg-kindness-sparkle-one" aria-hidden="true">✦</div><div class="sg-kindness-event-sparkle sg-kindness-sparkle-two" aria-hidden="true">✧</div>'+
 '<div class="sg-kindness-event-heading"><span class="sg-kindness-heart" aria-hidden="true">♡</span><div class="sg-kindness-title-wrap"><span class="sg-kindness-eyebrow">SUNDAY &amp; WEDNESDAY</span><h3>Kindness Hour</h3><span class="sg-kindness-subtitle">A little love goes a long way</span></div><span class="sg-kindness-phase'+(active?' is-live':'')+'">'+(active?'LIVE NOW':'NEXT SESSION')+'</span></div>'+
 '<div class="sg-kindness-timebar"><span class="sg-kindness-clock" aria-hidden="true">◷</span><span class="sg-kindness-time-label">YOUR LOCAL TIME</span><strong>11:00 PM – 12:00 AM</strong><span class="sg-kindness-timezone">'+esc(timeZone)+'</span></div>'+(friendTimes?'<div class="sg-kindness-friend-times"><span>FRIENDS’ LOCAL SCHEDULES</span>'+friendTimes+'</div>':'')+'<div class="sg-kindness-event-body"><div class="sg-kindness-copy"><p>Every chat bubble you send or receive during the hour earns <strong>1 Petal Point</strong>.</p><small>'+esc(detail)+'</small></div><div class="sg-kindness-reward"><span class="sg-kindness-petal-count">'+count+'</span><span class="sg-kindness-petal-label">PETALS THIS HOUR</span><span class="sg-kindness-state">'+(active?'Collecting…':'See you tonight ♡')+'</span></div></div></section>';
}

function renderStreakPage() {
  const content = $('#content');
  if (!content || !me) return;
  const collectionUserId = String(me.id);
  if (gardenCollectionHydratedUserId !== collectionUserId) {
    gardenCollectionHydratedUserId = collectionUserId;
    gardenCollectionReadyUserId = '';
    gardenCollectionHydration = hydrateGardenCollectionFromCloud().then(() => {
      gardenCollectionReadyUserId = collectionUserId;
      if (page === 'streak') renderStreakPage();
    });
  }
  // Never render shop prices from a stale local cache while cloud ownership is loading.
  if (gardenCollectionReadyUserId !== collectionUserId) {
    content.innerHTML = '<div class="streak-garden-page"><p class="sg-petal-note">Loading your garden collection…</p></div>';
    return;
  }
  const timezone = normalizeStreakTimeZone(me.streak_timezone || getBrowserStreakTimeZone());
  const todayKey = streakDateInTimeZone(timezone);
  const lastDate = String(me.last_login_date || '').slice(0, 10);
  const gap = lastDate ? streakDateDistance(lastDate, todayKey) : null;
  const count = gap !== null && gap >= 0 && gap <= 1 ? Math.max(0, Number(me.login_streak) || 0) : 0;
  if (count) {
    saveStreakHistory(lastDate, count);
    saveStreakMilestones(count);
  }
  const history = readStreakHistory();
  const gardenBlooms = readStreakGardenBlooms(todayKey);
  const sortedHistory = [...history].sort();
  let bestRun = 0, run = 0, previous = '';
  sortedHistory.forEach(day => {
    run = previous && shiftStreakDate(previous, 1) === day ? run + 1 : 1;
    bestRun = Math.max(bestRun, run);
    previous = day;
  });

  const gardenStage = count >= 30 ? 'Your garden is in full bloom' : count >= 14 ? 'Your flowers are thriving' :
    count >= 7 ? 'Your garden is blooming' : count ? 'Your garden is growing' : 'Your first bloom is waiting';

  const milestones = [
    {days:3, name:'Tiny sprout'},
    {days:7, name:'First flower'},
    {days:14, name:'Little garden'},
    {days:30, name:'Growing plant'},
    {days:50, name:'Golden bouquet'},
    {days:100, name:'Everlasting lotus'}
  ];
  const earned = readStreakMilestones();
  const next = milestones.find(item => count < item.days) || null;
  const previousMilestone = next ? [...milestones].reverse().find(item => item.days <= count) : milestones[milestones.length - 1];
  const base = previousMilestone ? previousMilestone.days : 0;
  const progress = next ? Math.max(0, Math.min(100, ((count - base) / Math.max(1, next.days - base)) * 100)) : 100;
  const left = next ? Math.max(0, next.days - count) : 0;
  const allTimeGoalCompletions = countSavedStreakGoalCompletions();

  const heartCount = Math.max(0, Number(me.heartCount) || 0);
  saveStreakHeartMilestones(heartCount);
  const heartMilestones = [
    {hearts:10, name:'Little Keepsake', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M13 25 36 13l23 12v27H13Z" fill="#f5d9e4" stroke="#c98da8" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 24h52v8H10z" fill="#e8b9cb" stroke="#c98da8" stroke-width="2"/><path d="M29 23c0-8 14-8 14 0-1 5-7 8-7 8s-6-3-7-8Z" fill="#d77e9e"/><path d="M36 32v20" stroke="#c98da8" stroke-width="2"/><path d="m23 18 5-5m16 5 5-5" stroke="#fff8f4" stroke-width="2" stroke-linecap="round"/></svg>'},
    {hearts:100, name:'Sweet Letter', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><rect x="10" y="17" width="52" height="36" rx="7" fill="#fff0e8" stroke="#c98da8" stroke-width="2.2"/><path d="m12 22 24 19 24-19" fill="none" stroke="#d89bb2" stroke-width="2.5" stroke-linecap="round"/><path d="M28 13c0-6 9-7 9 0 0-7 10-6 9 0-1 5-9 10-9 10s-8-5-9-10Z" fill="#d77e9e"/><path d="M19 47h15m-15-5h9" stroke="#d8b4c2" stroke-width="2" stroke-linecap="round"/></svg>'},
    {hearts:250, name:'Blushing Bouquet', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M22 30 36 55 50 30" fill="#d9e7ce" stroke="#91aa82" stroke-width="2"/><path d="M36 53V29M36 43 24 34M36 40l12-10" stroke="#91aa82" stroke-width="2.5" stroke-linecap="round"/><g fill="#f4c5d5" stroke="#c98da8" stroke-width="1.5"><circle cx="23" cy="20" r="7"/><circle cx="36" cy="13" r="7"/><circle cx="49" cy="20" r="7"/></g><g fill="#e6a1b9"><circle cx="23" cy="20" r="2.5"/><circle cx="36" cy="13" r="2.5"/><circle cx="49" cy="20" r="2.5"/></g><path d="m22 45 14 10 14-10" fill="none" stroke="#c98da8" stroke-width="3" stroke-linecap="round"/></svg>'},
    {hearts:500, name:'Golden Treasure', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="m36 8 7 8 12-1-2 12 8 9-10 7-3 12-12-4-12 4-3-12-10-7 8-9-2-12 12 1Z" fill="#f7e8b8" stroke="#c7a45f" stroke-width="2"/><path d="m36 19 12 11-12 17-12-17Z" fill="#e8a4ba" stroke="#bd7895" stroke-width="2"/><path d="m24 30 12 4 12-4M36 34v13" fill="none" stroke="#fff4e7" stroke-width="2"/><circle cx="36" cy="28" r="3" fill="#fff5d9"/></svg>'},
    {hearts:750, name:'Love Guardian', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="m13 27 6-14 12 8 5-12 5 12 12-8 6 14-9 24H22Z" fill="#e9dff4" stroke="#a58bb8" stroke-width="2" stroke-linejoin="round"/><path d="M25 31c0-7 10-8 11 0 2-8 12-7 12 0-1 7-12 15-12 15S26 38 25 31Z" fill="#d77e9e" stroke="#bd7895" stroke-width="1.4"/><circle cx="19" cy="17" r="2" fill="#d7b56e"/><circle cx="53" cy="17" r="2" fill="#d7b56e"/><path d="M18 48q-5 5-1 9m37-9q5 5 1 9" fill="none" stroke="#a58bb8" stroke-width="2" stroke-linecap="round"/></svg>'},
    {hearts:1000, name:'Everlasting Love', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><circle cx="36" cy="32" r="25" fill="#fff0e7" stroke="#d5a2b5" stroke-width="2"/><circle cx="36" cy="32" r="20" fill="none" stroke="#e6c1ce" stroke-width="1.5" stroke-dasharray="2 3"/><path d="M24 29c0-9 12-10 12 0 1-10 13-9 13 0-1 9-13 18-13 18S25 38 24 29Z" fill="#d77e9e" stroke="#bd7895" stroke-width="1.5"/><path d="m16 12 3 4 5 1-5 2-3 5-2-5-5-2 5-1Zm40-2 2 4 4 2-4 1-2 4-2-4-4-1 4-2Z" fill="#d6b66f"/><path d="M15 39q-5-5-7 0m49 0q5-5 7 0" fill="none" stroke="#91aa82" stroke-width="2" stroke-linecap="round"/></svg>'},
    {hearts:1500, name:'Everlasting Rose', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M36 55V39" stroke="#789a79" stroke-width="3" stroke-linecap="round"/><path d="M35 49q-12-12-19-5 7 11 19 7m2-5q11-12 19-5-6 11-19 7" fill="#b8d2a9" stroke="#789a79" stroke-width="1.5"/><g fill="#df789c" stroke="#a94e73" stroke-width="1.8"><path d="M36 8c-8-7-18 1-12 10-10 4-6 17 5 16 0 10 14 12 16 1 10 2 15-10 6-16 6-10-5-18-15-11z"/><path d="M25 22q2-11 12-7 10-3 12 7-2 12-13 13-11-2-11-13z" fill="#f4b5ca"/></g><path d="M29 22q4-7 11-2-2 7-7 8" fill="none" stroke="#fff1f5" stroke-width="2" stroke-linecap="round"/></svg>'},
    {hearts:2000, name:'Heart of the Garden', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M36 54V39" stroke="#789a79" stroke-width="3" stroke-linecap="round"/><path d="M35 49q-11-10-17-4 6 9 17 6m2-2q10-10 17-4-5 9-17 6" fill="#b8d2a9" stroke="#789a79" stroke-width="1.4"/><g fill="#d8c5ed" stroke="#9277ae" stroke-width="1.8"><path d="M36 6c-6-5-13 1-10 8-9 1-10 12-2 16-1 9 11 12 13 3 3 9 15 6 13-3 8-5 6-15-3-16-2-9-9-12-11-8z"/></g><path d="m18 15 4-9 10 7 4-11 5 11 10-7 3 10" fill="#edca79" stroke="#a98548" stroke-width="1.7" stroke-linejoin="round"/><circle cx="36" cy="25" r="8" fill="#fff0c8" stroke="#c49a55" stroke-width="1.8"/><path d="M31 26c0-5 5-5 5 0 1-5 6-5 6 0-1 4-6 7-6 7s-5-3-5-7z" fill="#d8799d"/></svg>'}
  ];
  const earnedHearts = readStreakHeartMilestones();
  const heartBadges = heartMilestones.map(item => {
    const unlocked = heartCount >= item.hearts;
    const percentage = unlocked ? 100 : Math.min(100, heartCount / item.hearts * 100);
    const status = unlocked ? 'Heart unlocked' : (item.hearts - heartCount) + ' hearts to go';
    const specialClass = item.hearts === 1000 ? ' sg-special-heart sg-special-heart-1000' : item.hearts === 1500 ? ' sg-special-heart sg-special-heart-1500' : item.hearts === 2000 ? ' sg-special-heart sg-special-heart-2000' : '';
    return '<article class="streak-milestone sg-milestone' + specialClass + (unlocked ? ' is-earned' : ' is-locked') + '">' +
      '<span class="sg-milestone-art sg-heart-milestone-art">' + item.art + '</span>' +
      '<span class="sg-milestone-copy"><small class="sg-milestone-day">' + item.hearts + ' HEARTS</small><b>' + item.name +
      '</b><em>' + status + '</em></span>' +
      '<span class="sg-milestone-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      Math.round(percentage) + '"><i style="width:' + percentage + '%"></i></span>' +
      '<small class="sg-milestone-progress-copy">' + Math.min(heartCount, item.hearts) + ' / ' + item.hearts + ' hearts</small></article>';
  }).join('');
  const dailyQuestState = readStreakDailyQuests(todayKey);
  const dailyQuestItems = getDailyQuestRotation(todayKey).map(quest => {
    const progress = Math.min(quest.target,quest.progress(dailyQuestState));
    const done = quest.done(dailyQuestState);
    return {...quest,progress,done};
  });
  const completedQuests = dailyQuestItems.filter(item => item.done).length;
  const petalRewards = readPetalRewards();
  const chestClaimed = Object.prototype.hasOwnProperty.call(petalRewards, 'chest:' + todayKey);
  const petalRewardsMarkup = '<div class="sg-petal-rewards" aria-label="Petal Points rewards">' +
    '<div class="sg-petal-balance"><span class="sg-petal-balance-art">' + gardenIllustration('bloom-5') + '</span><div><b>' + petalRewardBalance(petalRewards) + ' Petal Points</b><small>Earn 10 per daily quest · 25 from the daily chest</small></div></div>' +
    '<button type="button" class="sg-petal-chest' + (completedQuests === 3 && !chestClaimed ? ' is-ready' : chestClaimed ? ' is-claimed' : '') + '" data-claim-petal-chest aria-live="polite" aria-label="' + (chestClaimed ? 'Daily chest collected' : completedQuests === 3 ? 'Daily chest ready to open, plus 25 Petal Points' : 'Daily chest locked until all three quests are complete') + '"' + (completedQuests !== 3 || chestClaimed ? ' disabled' : '') + '>' +
    '<span class="sg-chest-art">' + gardenIllustration('golden-bell') + '</span> ' + (chestClaimed ? 'Chest collected today ✓' : completedQuests === 3 ? 'Chest ready · Open for +25' : 'Complete 3 quests to unlock chest') + '</button>' +
    '<small class="sg-petal-note">Your Petal Points sync to your account and stay available across your devices.</small></div>';
  const collection = readGardenCollection();
  const collectibleMarkup = '<section class="sg-collectibles"><div class="sg-section-heading"><div><h3>Little Garden Shop</h3><p>Find a tiny treasure, from everyday blooms to magical keepsakes</p></div><span class="sg-shop-sparkle" aria-hidden="true">✧</span></div><div class="sg-collectible-grid">' +
    [...GARDEN_COLLECTIBLES].sort((a, b) => a.cost - b.cost).map(item => {
      const owned = collection.owned.includes(item.id);
      const equippedIds = new Set(Array.isArray(collection.equippedItems) ? collection.equippedItems : [collection.equipped, collection.bunny].filter(id => id && id !== 'none'));
      const equipped = equippedIds.has(item.id);
      const affordable = petalRewardBalance(petalRewards) >= item.cost;
      return '<article class="sg-collectible-card item-' + item.id + ' rarity-' + item.rarity + (equipped ? ' is-equipped' : '') + '" data-rarity="' + item.rarity + '"><span class="sg-collectible-art">' + item.art + '<i class="sg-art-glint" aria-hidden="true">✧</i></span><b>' + item.name + '</b><small>' + (item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)) + ' · ' + (item.type === 'bunny' ? 'Bunny style' : 'Garden decor') + '</small><button type="button" data-buy-collectible="' + item.id + '"' + (!owned && !affordable ? ' disabled' : '') + '>' + (equipped ? 'Equipped ✓' : owned ? 'Equip' : item.cost + ' petals · Collect') + '</button></article>';
    }).join('') + '</div></section>';
  const weeklyProgress = getWeeklyBloomProgress(todayKey);
  const weeklyTiers = [{days:3,points:30,title:'Little Bloom',art:gardenIllustration('bloom-3')},{days:5,points:50,title:'Garden Glow',art:gardenIllustration('bloom-5')},{days:7,points:100,title:'Full Bloom',art:gardenIllustration('bloom-7')}];
  const weeklyMarkup = '<section class="sg-weekly-rewards"><div class="sg-section-heading"><div><h3>Weekly Bloom Rewards</h3><p>Complete daily quests on different days</p></div><span class="sg-goal-count">' + weeklyProgress.completedDays.length + ' / 7 days</span></div><div class="sg-weekly-tier-list">' +
    weeklyTiers.map(tier => {
      const key = 'weekly:' + weeklyProgress.monday + ':' + tier.days;
      const claimed = Object.prototype.hasOwnProperty.call(petalRewards, key);
      const unlocked = weeklyProgress.completedDays.length >= tier.days;
      return '<article class="sg-weekly-tier' + (unlocked ? ' is-unlocked' : '') + '"><span class="sg-weekly-art">' + tier.art + '</span><div><b>' + tier.title + '</b><small>' + tier.days + ' completed days · +' + tier.points + ' petals</small></div><button type="button" data-claim-weekly="' + tier.days + '"' + (!unlocked || claimed ? ' disabled' : '') + '>' + (claimed ? 'Claimed ✓' : unlocked ? 'Collect' : 'Locked') + '</button></article>';
    }).join('') + '</div></section>';
  const dailyQuestMarkup = '<div class="sg-daily-quest-list">' +
    dailyQuestItems.map(item => {
      const action = item.kind === 'bear-action' ? 'bear-hugs' :
        item.kind === 'photo' ? 'gallery' : item.kind === 'song' ? 'music' :
        (item.kind === 'note' || item.kind === 'kiss-note') ? 'notes' :
        item.kind === 'heart' ? 'gallery' : 'streak';
      return '<article class="sg-daily-quest-card' + (item.done ? ' is-done' : '') + '" data-daily-quest-action="' + action + '" role="button" tabindex="0" aria-label="' + esc(item.title + '. ' + item.description + (item.done ? ' Completed.' : ' Open quest activity.')) + '">' +
        '<span class="sg-daily-quest-icon">' + gardenIllustration(item.art || item.kind || item.id) + '</span>' +
        '<div class="sg-daily-quest-copy"><div class="sg-daily-quest-title-row"><b>' + item.title + '</b>' +
        '<span class="sg-daily-quest-status' + (item.done ? ' is-done' : '') + '" role="status" aria-live="polite">' + (item.done ? 'Complete ✓' : item.progress + ' / ' + item.target) + '</span></div>' +
        '<p>' + item.description + '</p>' + (item.kind === 'note' && item.match ? '<div class="sg-quest-keyword-hint"><span>USE IN YOUR MESSAGE</span><b>' + (Array.isArray(item.match) ? item.match.join(' · ') : item.match) + '</b></div>' : '') + '<div class="sg-daily-quest-progress"><span style="width:' + (item.progress / item.target * 100) + '%"></span></div></div></article>';
    }).join('') +
    '</div><div class="sg-daily-quest-footer"><span>' + completedQuests + ' / 3 quests complete</span>' +
    (dailyQuestState.badge ? '<b class="sg-daily-bloom-badge">✿ Daily Bloom earned</b>' : '<small>Complete today’s 3 quests to earn your Daily Bloom</small>') + '</div>';

  const todayDate = new Date(todayKey + 'T00:00:00Z');
  const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
  const weekStartDate = shiftStreakDate(todayKey, -mondayOffset);
  const weekEndDate = shiftStreakDate(weekStartDate, 6);
  if (!streakSelectedWeekDate || streakSelectedWeekDate < weekStartDate || streakSelectedWeekDate > weekEndDate) {
    streakSelectedWeekDate = todayKey;
  }
  const week = [];
  for (let i = 0; i < 7; i++) {
    const key = shiftStreakDate(weekStartDate, i);
    const date = new Date(key + 'T00:00:00Z');
    const shortName = new Intl.DateTimeFormat(undefined, {weekday:'short', timeZone:'UTC'}).format(date);
    const fullDate = new Intl.DateTimeFormat(undefined, {weekday:'long', month:'short', day:'numeric', timeZone:'UTC'}).format(date);
    const visited = history.has(key), isToday = key === todayKey, isFuture = key > todayKey;
    const selected = key === streakSelectedWeekDate;
    const stateClass = (visited ? ' is-visited' : isFuture ? ' is-future' : ' is-missed') + (isToday ? ' is-today' : '');
    const marker = visited
      ? '<svg viewBox="0 0 40 40"><g fill="#d989a8"><ellipse cx="20" cy="8" rx="5.2" ry="8"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(60 20 20)"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(120 20 20)"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(180 20 20)"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(240 20 20)"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(300 20 20)"/></g><circle cx="20" cy="20" r="5" fill="#efc978"/><path d="M20 26v10" stroke="#789775" stroke-width="2" stroke-linecap="round"/></svg>'
      : isFuture
        ? '<svg viewBox="0 0 40 40"><path d="M20 35V20" stroke="#91a98b" stroke-width="2" stroke-linecap="round"/><path d="M20 27c-8-9-14-4-12 1 4 5 9 3 12-1Z" fill="#dce8d4"/><path d="M20 20c-7-7-5-15 0-17 7 5 7 12 0 17Z" fill="#f4dfe8" stroke="#cfadc1" stroke-width="1.5"/></svg>'
        : '<span class="sg-week-missed-mark" aria-hidden="true">–</span>';
    week.push('<button type="button" class="sg-week-day' + stateClass + (selected ? ' is-selected' : '') +
      '" data-streak-week-date="' + key + '" aria-pressed="' + selected + '" aria-label="' + fullDate + ': ' +
      (visited ? 'visit recorded' : isFuture ? 'upcoming day' : 'no visit recorded') + '">' +
      '<span class="sg-week-name">' + shortName + '</span><span class="sg-week-flower" aria-hidden="true">' + marker +
      '</span><small class="sg-week-date">' + Number(key.slice(-2)) + '</small></button>');
  }

  const goals = readStreakGoals();
  const checks = readStreakGoalChecks(todayKey);
  const completed = Object.keys(checks).filter(id => checks[id] && goals.some(goal => goal.id === id)).length;
  const goalMarkup = goals.map((goal, index) =>
    '<div class="streak-goal sg-goal-row' + (checks[goal.id] ? ' is-done' : '') + '">' +
    '<label class="streak-goal-main sg-goal-main"><input type="checkbox" data-streak-goal="' + esc(goal.id) + '"' +
    (checks[goal.id] ? ' checked' : '') + '><span class="sg-goal-flower" aria-hidden="true"><svg viewBox="0 0 40 40"><g fill="' +
    ['#d989a8','#b9a6d7','#dcae73','#d989a8','#a5b99b','#b9a6d7'][index % 6] +
    '"><ellipse cx="20" cy="8" rx="5" ry="8"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(60 20 20)"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(120 20 20)"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(180 20 20)"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(240 20 20)"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(300 20 20)"/></g><circle cx="20" cy="20" r="5" fill="#efc978"/></svg></span><span class="sg-goal-text">' + esc(goal.label) +
    '</span></label><button type="button" class="streak-goal-remove sg-goal-remove" data-streak-remove-goal="' + esc(goal.id) +
    '" aria-label="Remove ' + esc(goal.label) + '">×</button></div>'
  ).join('') || '<div class="streak-empty-goals">Your journal is ready for a little promise. ♡</div>';

  const milestoneIllustrations = STREAK_MILESTONE_ILLUSTRATIONS.slice(0, 6);
  const badges = milestones.map((item, index) => {
    const unlocked = count >= item.days;
    const daysLeft = Math.max(0, item.days - count);
    const milestoneProgress = unlocked ? 100 : Math.min(100, Math.max(0, count / item.days * 100));
    const status = unlocked ? 'Bloom unlocked' : daysLeft === 1 ? '1 day to go' : daysLeft + ' days to go';
    const specialClass = item.days === 50 ? ' sg-special-bloom sg-special-bloom-50' : item.days === 100 ? ' sg-special-bloom sg-special-bloom-100' : '';
    return '<article class="streak-milestone sg-milestone' + specialClass + (unlocked ? ' is-earned' : ' is-locked') +
      '" aria-label="' + item.name + ', ' + item.days + ' days, ' + status + '">' +
      '<span class="sg-milestone-art">' + milestoneIllustrations[index] + '</span>' +
      '<span class="sg-milestone-copy"><small class="sg-milestone-day">' + item.days + '-DAY BLOOM</small><b>' + item.name +
      '</b><em class="sg-milestone-status">' + status + '</em></span>' +
      '<span class="sg-milestone-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      Math.round(milestoneProgress) + '" aria-label="' + Math.round(milestoneProgress) + '% toward ' + item.name + '">' +
      '<i style="width:' + milestoneProgress + '%"></i></span>' +
      '<small class="sg-milestone-progress-copy">' + (unlocked ? item.days + ' days reached' : Math.min(count, item.days) + ' / ' + item.days + ' days') + '</small></article>';
  }).join('');

  const gardenScene = `<svg class="sg-garden-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 460" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="sgGardenTitle sgGardenDesc">
  <title id="sgGardenTitle">A little bunny's cherry blossom garden</title>
  <desc id="sgGardenDesc">A gentle garden with lavender mountains, sage grass, a flowering cherry tree and a small bunny gardener.</desc>
  <defs>
    <linearGradient id="sgMountainFar" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#c9badd"/>
      <stop offset="1" stop-color="#a9a1c7"/>
    </linearGradient>
    <linearGradient id="sgMountainNear" x1="0" y1="0" x2="0.9" y2="1">
      <stop stop-color="#b9b2d0"/>
      <stop offset="1" stop-color="#9998b6"/>
    </linearGradient>
    <linearGradient id="sgMeadow" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#b7c6a7"/>
      <stop offset="1" stop-color="#829d7d"/>
    </linearGradient>
    <linearGradient id="sgBunnyFur" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#fffdf4"/>
      <stop offset="1" stop-color="#eadfd7"/>
    </linearGradient>
    <linearGradient id="sgScarf" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#d995ae"/>
      <stop offset="1" stop-color="#bd7898"/>
    </linearGradient>
    <linearGradient id="sgPetal" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#fff3f4"/>
      <stop offset="1" stop-color="#e8a5bc"/>
    </linearGradient>
    <linearGradient id="sgGardenPetal" x1="0" y1="0" x2=".72" y2="1">
      <stop stop-color="#fffafd"/>
      <stop offset=".42" stop-color="#f9c4d5"/>
      <stop offset="1" stop-color="#df8eae"/>
    </linearGradient>
    <radialGradient id="sgGardenCenter" cx=".36" cy=".28" r=".8">
      <stop stop-color="#fff1ad"/>
      <stop offset=".58" stop-color="#f1c75e"/>
      <stop offset="1" stop-color="#d99a42"/>
    </radialGradient>
    <g id="sgCherryBloom">
      <g fill="url(#sgPetal)" stroke="#d58da9" stroke-opacity=".45" stroke-width="1.2">
        <ellipse cy="-8" rx="5.8" ry="10"/>
        <ellipse cy="-8" rx="5.8" ry="10" transform="rotate(72)"/>
        <ellipse cy="-8" rx="5.8" ry="10" transform="rotate(144)"/>
        <ellipse cy="-8" rx="5.8" ry="10" transform="rotate(216)"/>
        <ellipse cy="-8" rx="5.8" ry="10" transform="rotate(288)"/>
      </g>
      <circle r="3.8" fill="#e8c77f"/>
    </g>
    <g id="sgGardenFlower">
      <path d="M0 8 C-1 17 -1 26 0 35" fill="none" stroke="#668868" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M-1 24 Q-18 12 -18 24 Q-10 33 -1 24Z" fill="#87a982" stroke="#668868" stroke-opacity=".45" stroke-width=".8"/>
      <path d="M0 30 Q17 17 18 29 Q10 38 0 30Z" fill="#a8c49a" stroke="#668868" stroke-opacity=".4" stroke-width=".8"/>
      <g transform="scale(1.25)">
        <g fill="url(#sgGardenPetal)" stroke="#cc7f9e" stroke-width=".9" stroke-linejoin="round">
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z"/>
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z" transform="rotate(72)"/>
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z" transform="rotate(144)"/>
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z" transform="rotate(216)"/>
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z" transform="rotate(288)"/>
        </g>
        <g fill="none" stroke="#fff8fb" stroke-width=".85" stroke-linecap="round" opacity=".9">
          <path d="M0 -4 Q-2 -9 -1 -13"/>
          <path d="M0 -4 Q-2 -9 -1 -13" transform="rotate(72)"/>
          <path d="M0 -4 Q-2 -9 -1 -13" transform="rotate(144)"/>
          <path d="M0 -4 Q-2 -9 -1 -13" transform="rotate(216)"/>
          <path d="M0 -4 Q-2 -9 -1 -13" transform="rotate(288)"/>
        </g>
        <circle r="4.2" fill="url(#sgGardenCenter)" stroke="#d49a4a" stroke-width=".65"/>
        <g stroke="#e8b548" stroke-width="1.15" stroke-linecap="round">
          <path d="M0 -2 L0 -7 M2 0 L7 -2 M2 2 L5 7 M-2 2 L-5 7 M-2 0 L-7 -2"/>
        </g>
        <g fill="#f6d879" stroke="#dba64b" stroke-width=".4">
          <circle cy="-7.2" r="1.3"/>
          <circle cx="7.2" cy="-2" r="1.3"/>
          <circle cx="5" cy="7" r="1.3"/>
          <circle cx="-5" cy="7" r="1.3"/>
          <circle cx="-7.2" cy="-2" r="1.3"/>
        </g>
      </g>
    </g>
    <g id="sgGardenBud">
      <path d="M0 8 C-1 21 -1 31 0 43" fill="none" stroke="#668868" stroke-width="3" stroke-linecap="round"/>
      <path d="M-1 29 Q-18 17 -18 28 Q-11 37 -1 29Z" fill="#8fae85"/>
      <path d="M0 35 Q17 22 18 33 Q11 42 0 35Z" fill="#a7bf99"/>
      <path d="M0 8 C-10 0 -8 -12 0 -19 C9 -12 10 0 0 8Z" fill="#e9c7d5" stroke="#b983a0" stroke-width="1.5"/>
      <path d="M0 7 Q-5 -3 -2 -14" fill="none" stroke="#f9e7ed" stroke-width="2" stroke-linecap="round"/>
      <path d="M-6 6 Q0 1 6 6" fill="none" stroke="#73936e" stroke-width="2.2" stroke-linecap="round"/>
    </g>
  </defs>

  <!-- Quiet mountain layers leave open sky around the focal scene. -->
  <path d="M0 263 L76 151 121 202 207 105 300 228 387 148 470 230 556 158 680 237 V460 H0Z" fill="url(#sgMountainFar)" opacity=".7"/>
  <path d="M0 286 Q115 238 224 271 T441 261 T680 267 V460 H0Z" fill="url(#sgMountainNear)" opacity=".62"/>
  <path d="M0 319 Q122 281 248 307 T486 302 T680 296 V460 H0Z" fill="#c0c6b7" opacity=".78"/>

  <!-- Soft, connected meadow shapes. -->
  <path d="M0 334 Q115 298 231 329 T453 319 T680 314 V460 H0Z" fill="#aabd9d"/>
  <path d="M0 368 Q115 331 245 361 T472 350 T680 346 V460 H0Z" fill="url(#sgMeadow)"/>
  <path d="M0 414 Q145 372 277 407 T520 395 T680 390 V460 H0Z" fill="#819d7b" opacity=".8"/>

  <!-- One flowering cherry tree, with blossoms attached to its branches. -->
  <path d="M555 455 C550 383 535 326 541 272 C545 227 574 183 625 145" fill="none" stroke="#80645f" stroke-width="22" stroke-linecap="round"/>
  <path d="M548 286 C506 250 473 220 426 212 M568 237 C594 204 624 191 664 183 M542 333 C510 306 487 286 460 268" fill="none" stroke="#886b65" stroke-width="10" stroke-linecap="round"/>
  <path d="M409 216 C389 180 405 137 443 124 C452 77 503 56 540 83 C574 49 632 69 641 116 C679 132 681 177 651 199 C642 239 587 253 552 231 C518 258 450 250 432 225Z" fill="#a7b99b"/>
  <path d="M443 180 C432 151 454 128 476 128 C491 101 521 104 536 124 C557 103 586 113 591 139 C617 138 632 159 619 180 C603 204 565 201 548 190 C519 214 475 208 463 191Z" fill="#b7c5a7" opacity=".82"/>
  <g>
    <use href="#sgCherryBloom" transform="translate(438 153) scale(1.15)"/>
    <use href="#sgCherryBloom" transform="translate(470 106) scale(.97)"/>
    <use href="#sgCherryBloom" transform="translate(512 83) scale(1.02)"/>
    <use href="#sgCherryBloom" transform="translate(554 111) scale(1.12)"/>
    <use href="#sgCherryBloom" transform="translate(603 107) scale(1.03)"/>
    <use href="#sgCherryBloom" transform="translate(638 151) scale(.99)"/>
    <use href="#sgCherryBloom" transform="translate(581 179) scale(.94)"/>
    <use href="#sgCherryBloom" transform="translate(520 188) scale(.99)"/>
    <use href="#sgCherryBloom" transform="translate(474 204) scale(.84)"/>
    <use href="#sgCherryBloom" transform="translate(626 202) scale(.91)"/>
  </g>

  <!-- The little bunny gardener is the clear foreground focal point. -->
  <g stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="347" cy="394" rx="45" ry="13" fill="#627c65" opacity=".18" stroke="none"/>
    <path d="M323 271 C309 231 318 194 337 196 C357 198 357 242 350 275Z" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2.3"/>
    <path d="M354 267 C350 227 362 193 380 202 C397 211 384 252 373 278Z" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2.3"/>
    <path d="M329 258 C319 226 330 210 339 212 C348 220 346 244 342 263Z" fill="#e9b3c2" opacity=".9" stroke="none"/>
    <path d="M360 258 C359 229 370 213 378 218 C384 229 374 251 369 263Z" fill="#e9b3c2" opacity=".9" stroke="none"/>

    <ellipse cx="349" cy="352" rx="39" ry="53" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2.2"/>
    <ellipse cx="320" cy="355" rx="13" ry="23" transform="rotate(-24 320 355)" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2"/>
    <ellipse cx="378" cy="354" rx="13" ry="23" transform="rotate(24 378 354)" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2"/>
    <path d="M321 330 Q349 312 378 330 L382 377 Q350 392 318 377Z" fill="#91a98a" stroke="#718d74" stroke-width="2"/>
    <path d="M338 324 Q349 334 360 324 L367 340 Q349 350 331 340Z" fill="url(#sgScarf)" stroke="none"/>
    <path d="M357 335 L376 342 L364 354Z" fill="#cf88a5" stroke="none"/>
    <ellipse cx="349" cy="383" rx="15" ry="7" fill="#e9c8ce" opacity=".78" stroke="none"/>
    <ellipse cx="334" cy="397" rx="18" ry="9" fill="#fff8ed" stroke="#d8c9c1" stroke-width="2"/>
    <ellipse cx="364" cy="397" rx="18" ry="9" fill="#fff8ed" stroke="#d8c9c1" stroke-width="2"/>

    <circle cx="350" cy="293" r="43" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2.4"/>
    <ellipse cx="331" cy="307" rx="8" ry="4.5" fill="#efb8c5" opacity=".78" stroke="none"/>
    <ellipse cx="369" cy="307" rx="8" ry="4.5" fill="#efb8c5" opacity=".78" stroke="none"/>
    <ellipse cx="337" cy="291" rx="3.2" ry="4.2" fill="#59465b" stroke="none"/>
    <ellipse cx="363" cy="291" rx="3.2" ry="4.2" fill="#59465b" stroke="none"/>
    <path d="M346 301 Q350 297 354 301 Q352 307 350 307 Q348 307 346 301Z" fill="#c9829d" stroke="none"/>
    <path d="M350 307 Q345 314 340 310 M350 307 Q355 314 360 310" fill="none" stroke="#80616f" stroke-width="1.8"/>
    <path d="M335 277 Q350 267 365 277" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>
  </g>

  <!-- Four rooted flowers are the existing touch targets. -->
  <g id="sgGardenPlots"></g>

  <!-- A few low grass strokes ground the illustration without extra ornaments. -->
  <g fill="none" stroke="#6e906f" stroke-width="3" stroke-linecap="round" opacity=".78">
    <path d="M48 433 Q41 411 31 403 M56 434 Q63 411 77 405 M188 440 Q182 417 169 410 M196 440 Q207 420 218 416"/>
    <path d="M435 436 Q428 411 415 405 M445 438 Q456 415 468 410 M627 432 Q618 409 607 404 M637 434 Q650 412 663 410"/>
  </g>
</svg>`;

  const streakFlowerTotal = Math.max(count, bestRun);
  const gardenFlowers = [
    {id:'pink', label:'pink flower', x:14.7, y:79.3, svgX:100, svgY:365, scale:1.72},
    {id:'lavender', label:'lavender flower', x:27.9, y:85.2, svgX:190, svgY:392, scale:1.60},
    {id:'honey', label:'yellow flower', x:40.4, y:87.8, svgX:275, svgY:404, scale:1.54},
    {id:'rose', label:'rose flower', x:61, y:88.7, svgX:415, svgY:408, scale:1.60},
    {id:'peach', label:'peach flower', x:72.5, y:85.2, svgX:493, svgY:392, scale:1.62},
    {id:'lilac', label:'lilac flower', x:83.8, y:80.7, svgX:570, svgY:371, scale:1.60},
    {id:'cream', label:'cream flower', x:93.4, y:87.6, svgX:635, svgY:403, scale:1.48}
  ];
  const earnedGardenFlowers = Math.min(gardenFlowers.length, Math.max(0, streakFlowerTotal));
  const gardenPlantMarkup = gardenFlowers.map((flower, index) =>
    '<use href="#' + (index < earnedGardenFlowers ? 'sgGardenFlower' : 'sgGardenBud') +
    '" transform="translate(' + flower.svgX + ' ' + flower.svgY + ') scale(' + flower.scale + ')"/>'
  ).join('');
  const gardenSceneMarkup = gardenScene.replace('<g id="sgGardenPlots"></g>', '<g>' + gardenPlantMarkup + '</g>');
  const gardenFlowerMarkup = gardenFlowers.map(flower => {
    const watered = gardenBlooms.has(flower.id);
    return '<button type="button" class="sg-garden-flower-hit' + (watered ? ' is-watered' : '') +
      '" data-sg-garden-flower="' + flower.id + '" style="--flower-x:' + flower.x + '%;--flower-y:' + flower.y + '%"' +
      ' aria-label="' + (watered ? 'Watered ' : 'Water ') + flower.label + '" aria-pressed="' + watered + '"' +
      (watered ? ' disabled' : '') + '><span aria-hidden="true"></span></button>';
  }).join('');

  const headingFlowerDecor =
    '<i class="sg-heading-bloom sg-heading-bloom-one" style="--sg-bloom-speed:' + (3.4 + Math.random() * 1.9).toFixed(2) + 's;--sg-bloom-delay:-' + (Math.random() * 2.4).toFixed(2) + 's">✿</i>' +
    '<i class="sg-heading-bloom sg-heading-bloom-two" style="--sg-bloom-speed:' + (4.1 + Math.random() * 1.8).toFixed(2) + 's;--sg-bloom-delay:-' + (Math.random() * 2.8).toFixed(2) + 's">✿</i>';

  content.innerHTML = [
    '<div class="streak-garden-page">',
    '<div class="sg-page-heading"><div><h2>Your Streak Garden</h2></div><span class="sg-heading-doodle" aria-hidden="true">' +
      headingFlowerDecor + '</span></div>',

    '<div class="sg-page-group sg-garden-group" id="sgGardenGroup">',
    '<section class="sg-hero" aria-label="Your current streak garden"><div class="sg-hero-paper">' +
      '<div class="sg-hero-copy"><div class="sg-hero-topline">' +
      '<div class="sg-hero-streak-meta"><span class="sg-eyebrow">CURRENT STREAK</span>' +
      '<div class="sg-count-line"><strong>' + count + '</strong><span><b>' + (count === 1 ? 'day' : 'days') + '</b><small>in a row</small></span></div></div>' +
      '<h3 class="sg-garden-stage">' + gardenStage + '</h3></div></div>' +
      '<div class="sg-hero-scene"><div class="sg-garden-art sg-bloom-stage-' + (count >= 30 ? 'full' : count >= 14 ? 'lush' : count >= 7 ? 'bloom' : count >= 3 ? 'sprout' : 'seed') + '" id="sgGardenArt" data-bloom-days="' + count + '">' + gardenSceneMarkup +
        '<div class="sg-garden-hit-layer">' + gardenFlowerMarkup + '</div></div>' +
        '</div>' +
      '<span class="sg-hero-corner sg-corner-one" aria-hidden="true">❧</span></div></section>',
    '</div>',

    '<div class="sg-page-group sg-journal-group" id="sgJournalGroup">',
    '<section class="sg-week-section"><div class="sg-section-heading"><div><h3>Weekly blooms</h3></div></div>' +
      '<div class="sg-week-row">' + week.join('') + '</div></section>',
    '</div>',
    '<div class="sg-garden-switcher" role="tablist" aria-label="Your garden details">' +
      '<button type="button" class="sg-garden-switch' + (streakGardenActiveTab === 'daily' ? ' is-active' : '') + '" data-streak-garden-tab="daily" role="tab" aria-selected="' + (streakGardenActiveTab === 'daily') + '"><span class="sg-switch-icon sg-switch-daily" aria-hidden="true"><svg viewBox="0 0 32 32"><rect x="8" y="6" width="16" height="21" rx="3" fill="#fffaf4" stroke="currentColor" stroke-width="1.8"/><path d="M12 5.5h8a2 2 0 0 1 2 2V9H10V7.5a2 2 0 0 1 2-2Z" fill="#f6e4c5" stroke="currentColor" stroke-width="1.5"/><path d="m12 14 1.8 1.8 3-3.2M12 21l1.8 1.8 3-3.2M19 14h2M19 21h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="sg-switch-label"><b>Daily Quest</b></span></button>' +
      '<button type="button" class="sg-garden-switch' + (streakGardenActiveTab === 'hearts' ? ' is-active' : '') + '" data-streak-garden-tab="hearts" role="tab" aria-selected="' + (streakGardenActiveTab === 'hearts') + '"><span class="sg-switch-icon sg-switch-hearts" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 27S4.5 19.5 4.5 11.5c0-6 7.5-8 11.5-.8 4-7.2 11.5-5.2 11.5.8C27.5 19.5 16 27 16 27Z" fill="currentColor"/><path d="m11 15 3.5 3.5 7-8" fill="none" stroke="#fffaf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="sg-switch-label"><b>Your Hearts</b></span></button>' +
      '<button type="button" class="sg-garden-switch' + (streakGardenActiveTab === 'flowers' ? ' is-active' : '') + '" data-streak-garden-tab="flowers" role="tab" aria-selected="' + (streakGardenActiveTab === 'flowers') + '"><span class="sg-switch-icon sg-switch-flowers" aria-hidden="true"><svg viewBox="0 0 32 32"><g fill="currentColor"><ellipse cx="16" cy="7" rx="4" ry="6"/><ellipse cx="16" cy="7" rx="4" ry="6" transform="rotate(60 16 16)"/><ellipse cx="16" cy="7" rx="4" ry="6" transform="rotate(120 16 16)"/></g><circle cx="16" cy="16" r="4" fill="#f2c875"/><path d="M16 21v7" stroke="#78966f" stroke-width="2" stroke-linecap="round"/></svg></span><span class="sg-switch-label"><b>Your Flowers</b></span></button></div>',
    '<section class="sg-tab-panel' + (streakGardenActiveTab === 'flowers' ? ' is-active' : '') + '" id="sgFlowersPanel" role="tabpanel"' + (streakGardenActiveTab === 'flowers' ? '' : ' hidden') + '>' +
      '<section class="sg-milestones-section"><div class="sg-section-heading"><div><h3>Your Flowers</h3><p>' + milestones.filter(item => count >= item.days).length + ' of ' + milestones.length + ' garden milestones unlocked</p></div></div>' +
      '<div class="sg-milestone-route">' + badges + '</div></section></section>',
    '<section class="sg-tab-panel' + (streakGardenActiveTab === 'hearts' ? ' is-active' : '') + '" id="sgHeartsPanel" role="tabpanel"' + (streakGardenActiveTab === 'hearts' ? '' : ' hidden') + '>' +
      '<section class="sg-milestones-section sg-hearts-section"><div class="sg-section-heading"><div><h3>Your Hearts</h3><p>' + heartCount + ' hearts received · ' + heartMilestones.filter(item => heartCount >= item.hearts).length + ' of ' + heartMilestones.length + ' milestones unlocked</p></div></div>' +
      '<div class="sg-milestone-route">' + heartBadges + '</div></section></section>',
    '<section class="sg-tab-panel' + (streakGardenActiveTab === 'daily' ? ' is-active' : '') + '" id="sgDailyPanel" role="tabpanel"' + (streakGardenActiveTab === 'daily' ? '' : ' hidden') + '>' +
      '<section class="sg-daily-quests-section"><div class="sg-section-heading"><div><h3>Daily Quest</h3><p>20-day garden adventure · Day ' + (Math.floor(Math.max(0,(new Date(todayKey + 'T00:00:00Z') - new Date('2026-11-21T00:00:00Z')) / 86400000) % 20) + 1) + ' of 20 · 20 chat + 20 photo quests</p></div><span class="sg-goal-count">' + completedQuests + ' / 3</span></div>' +
      dailyQuestMarkup + petalRewardsMarkup + weeklyMarkup + collectibleMarkup + '</section></section>',
    '</div>',
    '</div>',
  ].join('');
  startStreakCountdown();
  syncPresenceUI();
}

function openStreakGarden() {
  const content = $('#content');
  try {
    if (page !== 'streak') go('streak');
    else renderStreakPage();
    if (!content?.querySelector('.streak-garden-page')) renderStreakPage();
    if (!content?.querySelector('.streak-garden-page')) {
      throw new Error('The Streak Garden page did not finish rendering.');
    }
  } catch (error) {
    console.error('Streak Garden failed to open:', error);
    if (content) {
      const message = error && error.message ? error.message : 'An unexpected page error occurred.';
      content.innerHTML = '<section class="sg-load-error"><span aria-hidden="true">🌱</span><h2>Your garden needs a moment</h2><p>The Streak Garden could not finish opening.</p><small>' +
        esc(message) + '</small><button type="button" class="primary" data-streak-retry>Try opening again</button></section>';
    }
  }
}
