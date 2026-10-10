export const PLACE_CATS = [
  ['sight', '🏛️', '景點'],
  ['food', '🍜', '美食'],
  ['shop', '🛍️', '購物'],
  ['nature', '🌳', '自然'],
  ['stay', '🏨', '住宿'],
  ['other', '📍', '其他'],
];
export const catEmoji = c => (PLACE_CATS.find(x => x[0] === c) || PLACE_CATS[5])[1];

export const ITEM_KINDS = [
  ['shop', '👀', '想逛'],
  ['buy', '🛒', '想買'],
  ['visit', '🎟️', '想參觀'],
];

export const NOTE_KINDS = [
  ['pack', '🎒 攜帶清單'],
  ['outfit', '👗 穿搭'],
  ['memo', '📝 備忘'],
];

export const PACK_PRESETS = {
  '證件': ['護照', '身分證', '簽證 / 入境資料', '機票 / 車票', '飯店訂房資料', '旅遊保險'],
  '3C': ['手機', '充電器', '行動電源', '轉接頭', '耳機', '網卡 / eSIM'],
  '衣物': ['上衣', '褲子', '內衣褲', '襪子', '睡衣', '外套', '好走的鞋'],
  '盥洗': ['牙刷牙膏', '洗面乳', '保養品', '防曬', '隱形眼鏡', '毛巾'],
  '其他': ['錢包 / 外幣', '信用卡', '常備藥', '雨傘', '環保袋', '水壺'],
};

export const MEMBER_COLORS = ['#4c6ef5', '#f76707', '#37b24d', '#d6336c', '#7048e8', '#1098ad', '#f59f00'];
