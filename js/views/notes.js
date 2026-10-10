import { useState, useEffect } from 'preact/hooks';
import { html, Sheet, Field, Empty, ImagePicker, ImageGrid, Lightbox, Segmented, Img, toast, errMsg, fmtDate, daysBetween, confirmBox } from '../ui.js';
import { NOTE_KINDS, PACK_PRESETS } from '../consts.js';

export function NotesView({ app }) {
  const { store, trip } = app;
  const [notes, setNotes] = useState(null);
  const [kind, setKind] = useState('pack');
  const [edit, setEdit] = useState(null);
  const [light, setLight] = useState(null);

  const load = () => store.list('notes', { trip_id: trip.id, user_id: store.userId }).then(setNotes).catch(errMsg);
  useEffect(() => { load(); }, [trip.id, app.version]);
  if (!notes) return html`<div class="loading">載入中…</div>`;

  const list = notes.filter(n => n.kind === kind);
  const save = async row => {
    try { await store.put('notes', { trip_id: trip.id, ...row }); load(); } catch (e) { errMsg(e); }
  };

  return html`
    <div class="page">
      <div class="page-head"><h2>📒 筆記</h2>
        ${kind !== 'pack' && html`<button class="btn primary sm" onClick=${() => setEdit({ kind, images: [] })}>＋ 新增</button>`}
      </div>
      <div class="hint">🔒 筆記只有你自己看得到</div>
      <${Segmented} value=${kind} options=${NOTE_KINDS} onChange=${setKind} />

      ${kind === 'pack' && html`<${PackList} app=${app} items=${list} onSave=${save} onEdit=${setEdit} reload=${load} />`}

      ${kind === 'outfit' && (list.length ? html`
        <div class="outfits">
          ${[...list].sort((a, b) => (a.day || '9').localeCompare(b.day || '9')).map(n => html`
            <div class="outfit-card" key=${n.id} onClick=${() => setEdit(n)}>
              ${n.images?.[0] ? html`<${Img} store=${store} refId=${n.images[0]} class="outfit-img" />`
              : html`<div class="outfit-img ph">👗</div>`}
              ${n.images?.length > 1 && html`<span class="more">+${n.images.length - 1}</span>`}
              <div class="outfit-info">
                <b>${n.day ? fmtDate(n.day) : ''} ${n.title || ''}</b>
                ${n.body && html`<small>${n.body}</small>`}
              </div>
            </div>`)}
        </div>`
      : html`<${Empty} icon="👗" text="規劃每天的穿搭，可以拍衣服照片上傳喔！" />`)}

      ${kind === 'memo' && (list.length ? html`
        <div class="list">
          ${list.map(n => html`
            <div class="memo-card" key=${n.id} onClick=${() => setEdit(n)}>
              <b>${n.title || '（無標題）'}</b>
              ${n.body && html`<p>${n.body}</p>`}
              <${ImageGrid} store=${store} images=${n.images || []} onOpen=${r => { setLight(r); }} />
            </div>`)}
        </div>`
      : html`<${Empty} icon="📝" text="記下匯率、緊急電話、必吃清單…任何事都行" />`)}

      ${edit && html`<${NoteForm} app=${app} note=${edit} onClose=${() => setEdit(null)}
        onSaved=${() => { setEdit(null); load(); }} />`}
      <${Lightbox} store=${store} refId=${light} onClose=${() => setLight(null)} />
    </div>`;
}

function PackList({ app, items, onSave, onEdit, reload }) {
  const { store } = app;
  const [text, setText] = useState('');
  const [presets, setPresets] = useState(false);
  const done = items.filter(i => i.checked).length;

  const add = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    await onSave({ kind: 'pack', title: text.trim(), checked: false, images: [] });
    setText('');
  };
  const addPreset = async name => {
    const have = new Set(items.map(i => i.title));
    for (const t of PACK_PRESETS[name]) {
      if (!have.has(t)) await store.put('notes', { trip_id: app.trip.id, kind: 'pack', title: t, body: name, checked: false, images: [] });
    }
    toast(`已加入「${name}」常用清單`);
    reload();
  };

  return html`
    <div class="pack">
      ${items.length > 0 && html`
        <div class="progress"><div style=${{ width: (done / items.length) * 100 + '%' }}></div>
          <span>${done} / ${items.length} 已打包</span></div>`}
      <form class="row gap" onSubmit=${add}>
        <input class="input grow" placeholder="要帶什麼？" value=${text} onInput=${e => setText(e.target.value)} />
        <button class="btn primary">加入</button>
      </form>
      <button class="btn ghost sm" onClick=${() => setPresets(!presets)}>✨ 從常用清單加入</button>
      ${presets && html`<div class="chips wrap">
        ${Object.keys(PACK_PRESETS).map(k => html`<button class="chip" onClick=${() => addPreset(k)}>＋ ${k}</button>`)}
      </div>`}
      ${!items.length && html`<${Empty} icon="🎒" text="列出這趟要帶的東西，出發前一一打勾！" />`}
      <div class="checklist">
        ${[...items].sort((a, b) => a.checked - b.checked).map(it => html`
          <div class=${'check-row' + (it.checked ? ' done' : '')} key=${it.id}>
            <button class="check" onClick=${() => onSave({ ...it, checked: !it.checked })}>${it.checked ? '✅' : '⬜'}</button>
            <span class="grow" onClick=${() => onEdit(it)}>${it.title}
              ${it.body && html`<small class="tag">${it.body}</small>`}
              ${it.images?.length > 0 && html`<small> 📷${it.images.length}</small>`}
            </span>
          </div>`)}
      </div>
    </div>`;
}

function NoteForm({ app, note, onClose, onSaved }) {
  const { store, trip } = app;
  const [f, setF] = useState({ title: '', body: '', images: [], ...note });
  const [light, setLight] = useState(null);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const days = daysBetween(trip.start_date, trip.end_date);
  const label = NOTE_KINDS.find(k => k[0] === f.kind)[1];

  const save = async e => {
    e.preventDefault();
    if (!f.title?.trim() && !f.body?.trim() && !f.images.length) return toast('內容是空的喔');
    try { await store.put('notes', { ...f, trip_id: trip.id, day: f.day || null }); onSaved(); } catch (err) { errMsg(err); }
  };
  const del = async () => {
    if (!(await confirmBox('刪除這則筆記？'))) return;
    try { await store.remove('notes', note.id); onSaved(); } catch (err) { errMsg(err); }
  };
  const removeImg = ref => { set('images', f.images.filter(r => r !== ref)); store.removeImage(ref); };

  return html`
    <${Sheet} title=${(note.id ? '編輯 ' : '新增 ') + label} onClose=${onClose}>
      <form class="form" onSubmit=${save}>
        ${f.kind === 'outfit' && days.length > 0 && html`
          <${Field} label="哪一天">
            <select class="input" value=${f.day || ''} onChange=${e => set('day', e.target.value)}>
              <option value="">不指定</option>
              ${days.map((d, i) => html`<option value=${d}>Day ${i + 1} · ${fmtDate(d)}</option>`)}
            </select>
          </${Field}>`}
        <${Field} label=${f.kind === 'pack' ? '物品' : '標題'}>
          <input class="input" value=${f.title || ''} onInput=${e => set('title', e.target.value)}
            placeholder=${f.kind === 'outfit' ? '例：逛街日・白色洋裝' : ''} /></${Field}>
        <${Field} label=${f.kind === 'pack' ? '分類 / 備註' : '內容'}>
          <textarea class="input" rows=${f.kind === 'memo' ? 6 : 3} value=${f.body || ''}
            onInput=${e => set('body', e.target.value)}></textarea></${Field}>
        <${ImageGrid} store=${store} images=${f.images} onRemove=${removeImg} onOpen=${setLight} />
        <${ImagePicker} store=${store} onAdd=${refs => set('images', [...f.images, ...refs])} />
        <div class="row gap">
          ${note.id && html`<button type="button" class="btn danger" onClick=${del}>刪除</button>`}
          <div class="grow"></div>
          <button class="btn primary">儲存</button>
        </div>
      </form>
      <${Lightbox} store=${store} refId=${light} onClose=${() => setLight(null)} />
    </${Sheet}>`;
}
