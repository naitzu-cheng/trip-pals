import { useState } from 'preact/hooks';
import { html, toast, errMsg, confirmBox } from '../ui.js';
import { AvatarPreview } from './avatar-editor.js';
import { MEMBER_COLORS } from '../consts.js';
import { distMeters } from '../map.js';
import { fmtDist } from '../geo.js';

export function CompanionsView({ app }) {
  const { store, trip, companions, pos } = app;
  const [busy, setBusy] = useState(false);

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
              ${c.loc && !self && html`<button class="btn ghost sm" onClick=${() => app.showOnMap(c.loc)}>📍 地圖</button>`}
            </div>`;
        })}
      </div>
      ${!isOwner && html`<button class="btn ghost danger-text block" onClick=${leave}>退出這趟旅程</button>`}
    </div>`;
}
