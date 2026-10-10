import { useState, useEffect } from 'preact/hooks';
import { html, Sheet, Field, Segmented, ImageGrid, Lightbox, Empty, toast, errMsg, confirmBox, fmtDate } from '../ui.js';
import { catEmoji, ITEM_KINDS, NOTE_KINDS } from '../consts.js';
import { googleMapsPlace } from '../geo.js';
import { AvatarPreview } from './avatar-editor.js';
import { MEMBER_COLORS } from '../consts.js';
import { distMeters } from '../map.js';
import { fmtDist } from '../geo.js';

export function CompanionsView({ app }) {
  const { store, trip, companions, pos } = app;
  const [busy, setBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState([]); // [{ user_id, granted }]
  const [pwSheet, setPwSheet] = useState(false);
  const [unlocking, setUnlocking] = useState(null); // 要輸入誰的密碼
  const [viewing, setViewing] = useState(null); // 正在看誰的地點 / 筆記

  const loadStatus = () => store.mode === 'cloud' && store.privateStatus(trip.id).then(setShareStatus).catch(e => console.warn(e));
  useEffect(() => { loadStatus(); }, [trip.id]);

  if (store.mode !== 'cloud') {
    return html`
      <div class="page">
        <div class="page-head"><h2>👥 同行</h2></div>
        <div class="card">
          <p>目前是 <b>本機模式</b>：資料只存在這個瀏覽器裡。</p>
          <p>要邀請同行人、共享行程與位置，需要開啟 <b>雲端模式</b>（免費的 Supabase）。設定步驟請看專案裡的 <code>README.md</code>。</p>
        </div>
      </div>`;
  }

  const me = companions.find(c => c.user_id === store.userId);
  const sharing = !!me?.share_location;
  const isOwner = trip.owner_id === store.userId;

  const toggleShare = async () => {
    if (!sharing && !(await confirmBox('開啟後，這趟旅程的同行人可以在地圖上看到你的即時位置。隨時可以關閉。要開啟嗎？'))) return;
    setBusy(true);
    try {
      await store.setSharing(trip.id, !sharing);
      if (!sharing) app.startGps(false);
      await app.refreshCompanions();
      toast(sharing ? '🙈 已停止分享位置' : '📡 開始分享位置');
    } catch (e) { errMsg(e); }
    setBusy(false);
  };

  const invite = async () => {
    const text = `一起規劃「${trip.name}」吧！打開 ${location.origin + location.pathname}，登入後用邀請碼 ${trip.invite_code} 加入`;
    if (navigator.share) {
      try { await navigator.share({ title: '旅伴邀請', text }); } catch { /* 使用者取消 */ }
    } else {
      await navigator.clipboard?.writeText(text);
      toast('📋 邀請訊息已複製');
    }
  };

  const myShare = shareStatus.some(x => x.user_id === store.userId);
  const statusOf = id => shareStatus.find(x => x.user_id === id);
  const nameOf = c => c?.profile?.display_name || '夥伴';

  const openFriend = c => {
    const st = statusOf(c.user_id);
    if (st?.granted) setViewing(c);
    else setUnlocking(c);
  };

  const leave = async () => {
    if (!(await confirmBox('確定要退出這趟旅程嗎？'))) return;
    try { await store.leaveTrip(trip.id); app.closeTrip(); } catch (e) { errMsg(e); }
  };

  return html`
    <div class="page">
      <div class="page-head"><h2>👥 同行</h2></div>

      <div class="card invite">
        <div class="muted">邀請碼</div>
        <div class="invite-code">${trip.invite_code}</div>
        <button class="btn primary" onClick=${invite}>📨 邀請朋友</button>
      </div>

      <div class="card share-card">
        <div class="grow">
          <b>分享我的位置</b>
          <div class="muted small">${sharing ? '同行人看得到你在地圖上的角色' : '目前同行人看不到你的位置'}</div>
        </div>
        <button class=${'switch' + (sharing ? ' on' : '')} disabled=${busy} onClick=${toggleShare} aria-label="分享位置"><span></span></button>
      </div>

      <div class="card share-card">
        <div class="grow">
          <b>🔒 用密碼分享我的地點和筆記</b>
          <div class="muted small">${myShare ? '已開啟：知道密碼的夥伴可以看（不能修改）' : '目前只有你自己看得到'}</div>
        </div>
        <button class="btn ghost sm" onClick=${() => setPwSheet(true)}>${myShare ? '更改' : '設定'}</button>
      </div>

      <div class="members">
        ${companions.map((c, i) => {
          const self = c.user_id === store.userId;
          const d = c.loc && pos ? distMeters(pos, c.loc) : null;
          return html`
            <div class="member" key=${c.user_id} style=${{ '--c': MEMBER_COLORS[(i + 1) % MEMBER_COLORS.length] }}>
              <div class="member-av"><${AvatarPreview} config=${c.profile?.avatar} height=${90} spin=${false} /></div>
              <div class="grow">
                <b>${c.profile?.display_name || '夥伴'} ${self ? '（我）' : ''} ${c.user_id === trip.owner_id ? '👑' : ''}</b>
                <div class="muted small">
                  ${c.share_location ? (c.loc ? `📡 分享位置中${d != null && !self ? ` · 距離 ${fmtDist(d)}` : ''}` : '📡 分享中（等待定位）') : '🙈 未分享位置'}
                </div>
              </div>
              <div class="member-btns">
                ${c.loc && !self && html`<button class="btn ghost sm" onClick=${() => app.showOnMap(c.loc)}>📍 地圖</button>`}
                ${!self && statusOf(c.user_id) && html`<button class="btn ghost sm" onClick=${() => openFriend(c)}>
                  ${statusOf(c.user_id).granted ? '📒 地點與筆記' : '🔑 輸入密碼'}</button>`}
              </div>
            </div>`;
        })}
      </div>
      ${!isOwner && html`<button class="btn ghost danger-text block" onClick=${leave}>退出這趟旅程</button>`}
      ${pwSheet && html`<${PasswordSheet} app=${app} enabled=${myShare} onClose=${() => setPwSheet(false)}
        onDone=${() => { setPwSheet(false); loadStatus(); }} />`}
      ${unlocking && html`<${UnlockSheet} app=${app} friend=${unlocking} name=${nameOf(unlocking)} onClose=${() => setUnlocking(null)}
        onUnlocked=${() => { const f = unlocking; setUnlocking(null); loadStatus(); setViewing(f); }} />`}
      ${viewing && html`<${FriendPrivate} app=${app} friend=${viewing} name=${nameOf(viewing)} onClose=${() => setViewing(null)} />`}
    </div>`;
}

function PasswordSheet({ app, enabled, onClose, onDone }) {
  const { store, trip } = app;
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async e => {
    e.preventDefault();
    if (pw.length < 4) return toast('密碼至少 4 個字');
    setBusy(true);
    try { await store.setPrivatePassword(trip.id, pw); toast('🔒 已設定密碼，把密碼告訴想分享的夥伴吧'); onDone(); } catch (err) { errMsg(err); }
    setBusy(false);
  };
  const off = async () => {
    if (!(await confirmBox('關閉後，夥伴就看不到你的地點和筆記了（之前輸入過密碼的也一樣）。確定嗎？'))) return;
    setBusy(true);
    try { await store.setPrivatePassword(trip.id, ''); toast('已關閉分享'); onDone(); } catch (err) { errMsg(err); }
    setBusy(false);
  };
  return html`
    <${Sheet} title="🔒 分享我的地點和筆記" onClose=${onClose}>
      <form class="form" onSubmit=${save}>
        <p class="muted small">設定密碼後，這趟旅程的夥伴輸入正確密碼，就能<b>查看</b>你的「我的地點」（想逛、想買、想參觀）和「筆記」。他們不能修改。<br />
          更換或關閉密碼時，之前輸入過的人要重新輸入。</p>
        <${Field} label=${enabled ? '新密碼' : '密碼（至少 4 個字）'}>
          <input class="input" type="text" autocomplete="off" value=${pw} maxlength="32" onInput=${e => setPw(e.target.value)} />
        </${Field}>
        <div class="row gap">
          ${enabled && html`<button type="button" class="btn danger" disabled=${busy} onClick=${off}>關閉分享</button>`}
          <div class="grow"></div>
          <button type="button" class="btn ghost" onClick=${onClose}>取消</button>
          <button class="btn primary" disabled=${busy}>${busy ? '儲存中…' : '儲存'}</button>
        </div>
      </form>
    </${Sheet}>`;
}

function UnlockSheet({ app, friend, name, onClose, onUnlocked }) {
  const { store, trip } = app;
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async e => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    try {
      const ok = await store.unlockPrivate(trip.id, friend.user_id, pw);
      if (ok) { toast('🔓 解鎖成功'); onUnlocked(); } else toast('密碼不對喔');
    } catch (err) { errMsg(err); }
    setBusy(false);
  };
  return html`
    <${Sheet} title=${'🔑 ' + name + ' 的地點和筆記'} onClose=${onClose}>
      <form class="form" onSubmit=${go}>
        <p class="muted small">請輸入 ${name} 告訴你的密碼。</p>
        <input class="input" type="password" autocomplete="off" value=${pw} onInput=${e => setPw(e.target.value)} />
        <div class="row gap">
          <div class="grow"></div>
          <button type="button" class="btn ghost" onClick=${onClose}>取消</button>
          <button class="btn primary" disabled=${busy}>${busy ? '確認中…' : '解鎖'}</button>
        </div>
      </form>
    </${Sheet}>`;
}

// 唯讀：夥伴的地點清單與筆記
function FriendPrivate({ app, friend, name, onClose }) {
  const { store, trip } = app;
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('places');
  const [light, setLight] = useState(null);
  useEffect(() => {
    const m = { trip_id: trip.id, user_id: friend.user_id };
    Promise.all([store.list('places', m), store.list('place_items', m), store.list('notes', m)])
      .then(([places, items, notes]) => setData({ places, items, notes }))
      .catch(errMsg);
  }, [friend.user_id]);

  const notesOf = k => (data?.notes || []).filter(n => n.kind === k);
  return html`
    <${Sheet} title=${'📒 ' + name + ' 的地點和筆記（唯讀）'} onClose=${onClose} full>
      <${Segmented} value=${tab} options=${[['places', '⭐ 地點'], ...NOTE_KINDS]} onChange=${setTab} />
      ${!data ? html`<div class="loading">載入中…</div>`
      : tab === 'places' ? (data.places.length ? data.places.map(p => {
          const its = data.items.filter(i => i.place_id === p.id);
          return html`
            <section class="item-sec" key=${p.id}>
              <h3>${catEmoji(p.category)} ${p.name}
                ${p.lat != null && html` <button class="btn ghost sm" onClick=${() => { onClose(); app.showOnMap({ lat: p.lat, lng: p.lng, name: p.name, address: p.address, kind: 'new' }); }}>📍 地圖</button>`}
                <a class="btn ghost sm" href=${googleMapsPlace(p)} target="_blank" rel="noopener">G 地圖 ↗</a>
              </h3>
              ${!its.length && html`<div class="muted small">（沒有清單）</div>`}
              ${its.map(it => {
                const k = ITEM_KINDS.find(x => x[0] === it.kind) || ITEM_KINDS[0];
                return html`
                  <div class=${'item' + (it.done ? ' done' : '')} key=${it.id}>
                    <span class="check">${k[1]}</span>
                    <div class="item-main">
                      ${it.text && html`<div class="item-text">${it.text}</div>`}
                      ${it.url && html`<a class="item-url" href=${it.url} target="_blank" rel="noopener">🔗 ${it.url.replace(/^https?:\/\//, '').slice(0, 48)}</a>`}
                      <${ImageGrid} store=${store} images=${it.images || []} onOpen=${setLight} />
                    </div>
                  </div>`;
              })}
            </section>`;
        }) : html`<${Empty} icon="⭐" text=${name + ' 還沒有標註地點'} />`)
      : (notesOf(tab).length ? html`<div class="list">${notesOf(tab).map(n => html`
          <div class="memo-card" key=${n.id}>
            <b>${tab === 'pack' ? (n.checked ? '✅ ' : '⬜ ') : ''}${n.day ? fmtDate(n.day) + ' ' : ''}${n.title || ''}</b>
            ${n.body && html`<p>${n.body}</p>`}
            <${ImageGrid} store=${store} images=${n.images || []} onOpen=${setLight} />
          </div>`)}</div>`
        : html`<${Empty} icon="📝" text="這裡還沒有內容" />`)}
      <${Lightbox} store=${store} refId=${light} onClose=${() => setLight(null)} />
    </${Sheet}>`;
}
