import pokemonData from '../data/pokemon.json';

export const COMPANION_KEY = 'poke_companion';

const DIALOGUES = {
  common: [
    '今天天气真好呀~',
    '你在看什么呢？',
    '有什么好玩的事吗？',
    '想出去散步！',
    '肚子饿了...',
    '今天也辛苦了！',
    '加油！你可以的！',
    '我在发呆...',
    '想交更多朋友~',
    '今天过得怎么样？',
    '看到一只蝴蝶飞过去了！',
    '好无聊啊，陪我玩嘛~',
  ],
  rare: [
    '感觉今天充满力量！',
    '今天的你看起来心情不错',
    '我感受到了一股能量的流动',
    '想要展示一下我的能力',
    '今天的星光很亮呢',
    '有什么需要我帮忙的吗？',
    '我正在冥想中...',
    '感觉到了有趣的事情要发生',
    '今天的魔力很充沛！',
    '想和你一起去冒险！',
  ],
  legendary: [
    '今日天象有异，必有大事发生',
    '我感受到了远古的力量',
    '今天的能量流动非常特殊',
    '有什么命运在召唤我们',
    '天地之间，唯你可信',
    '我看到了未来的可能性',
    '今天的星辰排列很特别',
    '有什么重要的事情即将开始',
    '世界在等待你的行动',
    '我与你同在',
  ],
};

const MOODS = ['happy', 'normal', 'excited', 'sleepy', 'hungry'];

const MOOD_EXPRESSIONS = {
  happy: { petResponse: '嘿嘿，好舒服~', feedResponse: '好好吃！' },
  normal: { petResponse: '嗯~还不错', feedResponse: '谢谢~' },
  excited: { petResponse: '太棒了！再来再来！', feedResponse: '这个太美味了！' },
  sleepy: { petResponse: 'zzz...嗯？哦...', feedResponse: '好困...但还是想吃...' },
  hungry: { petResponse: '先别摸我，我饿...', feedResponse: '终于有吃的了！' },
};

function getCompanion() {
  try {
    return JSON.parse(localStorage.getItem(COMPANION_KEY)) || null;
  } catch {
    return null;
  }
}

function saveCompanion(data) {
  localStorage.setItem(COMPANION_KEY, JSON.stringify(data));
}

function pickRandomCompanion() {
  const collection = JSON.parse(localStorage.getItem('poke_collection') || '[]');
  if (collection.length === 0) return null;
  const id = collection[Math.floor(Math.random() * collection.length)];
  const pokemon = pokemonData.find(p => p.id === id);
  if (!pokemon) return null;

  return {
    id: pokemon.id,
    name: pokemon.name,
    nameEn: pokemon.nameEn,
    level: 1,
    xp: 0,
    intimacy: 0,
    mood: 'normal',
    lastFeed: null,
    lastPet: null,
    lastDialogue: Date.now(),
  };
}

function getLevelThreshold(level) {
  return level * 20 + 10;
}

export function ensureCompanion() {
  let companion = getCompanion();
  if (!companion || !pokemonData.find(p => p.id === companion.id)) {
    companion = pickRandomCompanion();
    if (companion) saveCompanion(companion);
  }
  return companion;
}

export function feedPokemon() {
  const companion = getCompanion();
  if (!companion) return null;

  const now = Date.now();
  const lastFeed = companion.lastFeed || 0;
  const cooldown = 30 * 60 * 1000;

  if (now - lastFeed < cooldown) {
    const remaining = Math.ceil((cooldown - (now - lastFeed)) / 60000);
    return { success: false, message: `还在消化中，${remaining}分钟后再来喂食吧~`, companion };
  }

  const xpGain = 5 + Math.floor(Math.random() * 5);
  companion.xp = (companion.xp || 0) + xpGain;
  companion.lastFeed = now;

  let leveledUp = false;
  while (companion.xp >= getLevelThreshold(companion.level)) {
    companion.xp -= getLevelThreshold(companion.level);
    companion.level++;
    leveledUp = true;
  }

  companion.mood = MOODS[Math.floor(Math.random() * MOODS.length)];
  saveCompanion(companion);

  return {
    success: true,
    message: `${companion.name}吃得津津有味！+${xpGain} 经验值`,
    feedResponse: MOOD_EXPRESSIONS[companion.mood].feedResponse,
    leveledUp,
    level: companion.level,
    xp: companion.xp,
    nextXp: getLevelThreshold(companion.level),
    companion,
  };
}

export function petPokemon() {
  const companion = getCompanion();
  if (!companion) return null;

  const now = Date.now();
  companion.intimacy = (companion.intimacy || 0) + 1;
  companion.lastPet = now;
  companion.xp = (companion.xp || 0) + 1;

  let leveledUp = false;
  while (companion.xp >= getLevelThreshold(companion.level)) {
    companion.xp -= getLevelThreshold(companion.level);
    companion.level++;
    leveledUp = true;
  }

  companion.mood = MOODS[Math.floor(Math.random() * MOODS.length)];
  saveCompanion(companion);

  return {
    success: true,
    message: `亲密度 +1（当前 ${companion.intimacy}）`,
    petResponse: MOOD_EXPRESSIONS[companion.mood].petResponse,
    leveledUp,
    level: companion.level,
    intimacy: companion.intimacy,
    companion,
  };
}

export function getRandomDialogue() {
  const companion = getCompanion();
  if (!companion) return null;
  const pool = DIALOGUES[companion.level >= 10 ? 'legendary' : companion.level >= 5 ? 'rare' : 'common'];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function canFeed() {
  const companion = getCompanion();
  if (!companion) return false;
  const lastFeed = companion.lastFeed || 0;
  const cooldown = 30 * 60 * 1000;
  return Date.now() - lastFeed >= cooldown;
}

export function getFeedRemaining() {
  const companion = getCompanion();
  if (!companion) return 0;
  const lastFeed = companion.lastFeed || 0;
  const cooldown = 30 * 60 * 1000;
  const remaining = cooldown - (Date.now() - lastFeed);
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

export function getCompanionPokemon() {
  const companion = getCompanion();
  if (!companion) return null;
  return pokemonData.find(p => p.id === companion.id) || null;
}

export function switchCompanion() {
  const newCompanion = pickRandomCompanion();
  if (newCompanion) {
    const old = getCompanion();
    if (old) {
      newCompanion.level = old.level;
      newCompanion.xp = old.xp;
      newCompanion.intimacy = old.intimacy;
    }
    saveCompanion(newCompanion);
    return newCompanion;
  }
  return null;
}
