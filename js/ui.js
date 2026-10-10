// 共用 UI 元件（Preact + htm，免打包）
import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import htm from 'htm';
import { compressImage } from './images.js';

export const html = htm.bind(h);
export { h, render };

/* ---------- 提示訊息 ---------- */
let toastHost;
export function toast(msg, ms = 2400) {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toast-host';
    document.body.appendChild(toastHost);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastHost.appendChild(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

export const errMsg = e => toast('⚠️ ' + (e?.message || e));

/* ---------- 底部彈出視窗 ---------- */
let openSheets = 0;
export function Sheet({ title, onClose, children, full }) {
  // 打開時隱藏底部分頁列，避免擋住「儲存 / 刪除」
  useEffect(() => {
    openSheets++;
    document.body.classList.add('sheet-open');
    return () => { if (--openSheets === 0) document.body.classList.remove('sheet-open'); };
  }, []);
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose?.();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return html`
    <div class="sheet-backdrop" onClick=${e => e.target === e.currentTarget && onClose?.()}>
      <div class=${'sheet' + (full ? ' full' : '')}>
        <div class="sheet-head">
          <div class="sheet-title">${title}</div>
          <button class="icon-btn" onClick=${onClose} aria-label="關閉">✕</button>
        </div>
        <div class="sheet-body">${children}</div>
      </div>
    </div>`;
}

export async function confirmBox(msg) {
  return window.confirm(msg);
}

/* ---------- 圖片 ---------- */
export function Img({ store, refId, ...rest }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    store.imageUrl(refId).then(u => alive && setUrl(u));
    return () => { alive = false; };
  }, [refId]);
  return url ? html`<img src=${url} loading="lazy" ...${rest} />` : html`<div class="img-ph" ...${rest}></div>`;
}

export function ImageGrid({ store, images = [], onRemove, onOpen }) {
  if (!images.length) return null;
  return html`<div class="img-grid">
    ${images.map(ref => html`
      <div class="img-cell" key=${ref}>
        <${Img} store=${store} refId=${ref} onClick=${() => onOpen?.(ref)} />
        ${onRemove && html`<button class="img-x" onClick=${() => onRemove(ref)}>✕</button>`}
      </div>`)}
  </div>`;
}

export function ImagePicker({ store, onAdd, label = '📷 加入圖片' }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const pick = async e => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const refs = [];
      for (const f of files) refs.push(await store.uploadImage(await compressImage(f)));
      onAdd(refs);
    } catch (err) { errMsg(err); }
    setBusy(false);
  };
  return html`
    <button type="button" class="btn ghost" disabled=${busy} onClick=${() => ref.current.click()}>
      ${busy ? '上傳中…' : label}
    </button>
    <input ref=${ref} type="file" accept="image/*" multiple hidden onChange=${pick} />`;
}

export function Lightbox({ store, refId, onClose }) {
  if (!refId) return null;
  return html`<div class="lightbox" onClick=${onClose}><${Img} store=${store} refId=${refId} /></div>`;
}

/* ---------- 表單小工具 ---------- */
export function Field({ label, children }) {
  return html`<label class="field"><span>${label}</span>${children}</label>`;
}

export function Segmented({ value, options, onChange }) {
  return html`<div class="seg">
    ${options.map(([v, l]) => html`
      <button type="button" class=${v === value ? 'on' : ''} onClick=${() => onChange(v)}>${l}</button>`)}
  </div>`;
}

export function Empty({ icon, text, children }) {
  return html`<div class="empty"><div class="empty-icon">${icon}</div><div>${text}</div>${children}</div>`;
}

export const fmtDate = d => {
  if (!d) return '';
  const x = new Date(d + 'T00:00:00');
  return `${x.getMonth() + 1}/${x.getDate()}（${'日一二三四五六'[x.getDay()]}）`;
};

export function daysBetween(start, end) {
  if (!start) return [];
  const out = [];
  const a = new Date(start + 'T00:00:00'), b = new Date((end || start) + 'T00:00:00');
  for (let d = a; d <= b && out.length < 60; d = new Date(d.getTime() + 864e5)) {
    out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  }
  return out;
}

export const safeUrl = u => {
  if (!u) return '';
  const s = u.trim();
  return /^https?:\/\//i.test(s) ? s : 'https://' + s;
};
