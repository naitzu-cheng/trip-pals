import { useState, useEffect } from 'preact/hooks';
import { html, Sheet, Field, Empty, ImagePicker, ImageGrid, Lightbox, Segmented, toast, errMsg, safeUrl, confirmBox } from '../ui.js';
import { PLACE_CATS, ITEM_KINDS, catEmoji } from '../consts.js';
import { googleMapsPlace } from '../geo.js';

export function PlacesView({ app }) {
  const { store, trip } = app;
  const [places, setPlaces] = useState(null);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const openId = app.openPlaceId;

  useEffect(() => {
    Promise.all([store.list('places', { trip_id: trip.id, user_id: store.userId }), store.list('place_items', { trip_id: trip.id, user_id: store.userId })])
      .then(([p, i]) => { setPlaces(p); setItems(i); })
      .catch(errMsg);
  }, [trip.id, app.version]);

  if (!places) return html`<div class="loading">載入中…</div>`;
  const shown = filter === 'all' ? places : places.filter(p => p.category === filter);
  const open = places.find(p => p.id === openId);

  return html`
    <div class="page">
      <div class="page-head">
        <h2>⭐ 我的地點</h2>
        <button class="btn primary sm" onClick=${() => app.go('map')}>＋ 到地圖標註</button>
      </div>
      <div class="hint">🔒 這裡的地點與清單只有你自己看得到</div>
      <div class="chips scroll-x">
        <button class=${'chip' + (filter === 'all' ? ' on' : '')} onClick=${() => setFilter('all')}>全部 ${places.length}</button>
        ${PLACE_CATS.map(([k, e, l]) => {
          const n = places.filter(p => p.category === k).length;
          return n ? html`<button class=${'chip' + (filter === k ? ' on' : '')} onClick=${() => setFilter(k)}>${e} ${l} ${n}</button>` : null;
        })}
      </div>
      ${!places.length && html`<${Empty} icon="📌" text="在地圖上搜尋或點 📌 標註地點，就能記下想逛、想買、想參觀的東西。" />`}
      <div class="list">
        ${shown.map(p => {
          const its = items.filter(i => i.place_id === p.id);
          const todo = its.filter(i => !i.done).length;
          return html`
            <button class="list-item" key=${p.id} onClick=${() => app.openPlace(p.id)}>
              <span class="li-emoji">${catEmoji(p.category)}</span>
              <span class="li-main">
                <b>${p.name}</b>
                <small>${ITEM_KINDS.map(([k, e]) => {
                  const n = its.filter(i => i.kind === k).length;
                  return n ? `${e}${n} ` : '';
                }).join('') || '還沒有清單'}</small>
              </span>
              ${todo > 0 && html`<span class="badge">${todo}</span>`}
            </button>`;
        })}
      </div>
      ${open && html`<${PlaceDetail} app=${app} place=${open} items=${items.filter(i => i.place_id === open.id)}
        onClose=${() => app.openPlace(null)} />`}
    </div>`;
}

function PlaceDetail({ app, place, items, onClose }) {
  const { store, trip } = app;
  const [p, setP] = useState(place);
  const [kind, setKind] = useState('shop');
  const [draft, setDraft] = useState({ text: '', url: '', images: [] });
  const [light, setLight] = useState(null);
  const [editingName, setEditingName] = useState(false);

  const savePlace = async patch => {
    const next = { ...p, ...patch };
    setP(next);
    try { await store.put('places', next); app.bump(); } catch (e) { errMsg(e); }
  };

  const addItem = async e => {
    e.preventDefault();
    if (!draft.text.trim() && !draft.url.trim() && !draft.images.length) return toast('寫點什麼、貼個網址或加張圖片吧');
    try {
      await store.put('place_items', { place_id: p.id, trip_id: trip.id, kind, text: draft.text.trim(),
        url: draft.url.trim() ? safeUrl(draft.url) : '', images: draft.images, done: false });
      setDraft({ text: '', url: '', images: [] });
      app.bump();
    } catch (err) { errMsg(err); }
  };

  const toggle = async it => {
    try { await store.put('place_items', { ...it, done: !it.done }); app.bump(); } catch (e) { errMsg(e); }
  };
  const delItem = async it => {
    if (!(await confirmBox('刪除這一項？'))) return;
    try { await store.remove('place_items', it.id); app.bump(); } catch (e) { errMsg(e); }
  };
  const delPlace = async () => {
    if (!(await confirmBox(`刪除「${p.name}」和裡面的清單？`))) return;
    try { await store.remove('places', p.id); app.bump(); onClose(); } catch (e) { errMsg(e); }
  };
  const discardDraftImage = async ref => {
    setDraft(d => ({ ...d, images: d.images.filter(r => r !== ref) }));
    store.removeImage(ref);
  };

  return html`
    <${Sheet} title=${html`${catEmoji(p.category)} ${p.name}`} onClose=${onClose} full>
      ${editingName ? html`
        <div class="row gap">
          <input class="input grow" value=${p.name} onInput=${e => setP({ ...p, name: e.target.value })} />
          <button class="btn primary sm" onClick=${() => { setEditingName(false); savePlace({}); }}>完成</button>
        </div>`
      : html`<div class="row gap wrap">
          <button class="btn ghost sm" onClick=${() => setEditingName(true)}>✎ 改名</button>
          <button class="btn ghost sm" onClick=${() => app.showOnMap(p)}>🗺️ 地圖</button>
          <a class="btn ghost sm" href=${googleMapsPlace(p)} target="_blank" rel="noopener">G 地圖 ↗</a>
          <button class="btn ghost sm danger-text" onClick=${delPlace}>刪除地點</button>
        </div>`}
      ${p.address && html`<div class="pc-addr">${p.address}</div>`}
      <div class="chips wrap">
        ${PLACE_CATS.map(([k, e, l]) => html`
          <button class=${'chip' + (p.category === k ? ' on' : '')} onClick=${() => savePlace({ category: k })}>${e} ${l}</button>`)}
      </div>

      ${ITEM_KINDS.map(([k, e, l]) => {
        const list = items.filter(i => i.kind === k);
        if (!list.length) return null;
        return html`<section class="item-sec" key=${k}>
          <h3>${e} ${l}</h3>
          ${list.map(it => html`
            <div class=${'item' + (it.done ? ' done' : '')} key=${it.id}>
              <button class="check" onClick=${() => toggle(it)}>${it.done ? '✅' : '⬜'}</button>
              <div class="item-main">
                ${it.text && html`<div class="item-text">${it.text}</div>`}
                ${it.url && html`<a class="item-url" href=${it.url} target="_blank" rel="noopener">🔗 ${it.url.replace(/^https?:\/\//, '').slice(0, 48)}</a>`}
                <${ImageGrid} store=${store} images=${it.images || []} onOpen=${setLight} />
              </div>
              <button class="icon-btn" onClick=${() => delItem(it)}>🗑️</button>
            </div>`)}
        </section>`;
      })}

      <form class="add-item" onSubmit=${addItem}>
        <${Segmented} value=${kind} options=${ITEM_KINDS.map(([k, e, l]) => [k, `${e} ${l}`])} onChange=${setKind} />
        <textarea class="input" rows="2" placeholder=${kind === 'buy' ? '想買什麼？例：限定版抹茶 KitKat' : kind === 'visit' ? '想參觀什麼？例：頂樓展望台' : '想逛什麼？例：B1 文具區'}
          value=${draft.text} onInput=${e => setDraft({ ...draft, text: e.target.value })}></textarea>
        <input class="input" placeholder="網址（選填）" value=${draft.url} onInput=${e => setDraft({ ...draft, url: e.target.value })} />
        <${ImageGrid} store=${store} images=${draft.images} onRemove=${discardDraftImage} />
        <div class="row gap">
          <${ImagePicker} store=${store} onAdd=${refs => setDraft(d => ({ ...d, images: [...d.images, ...refs] }))} />
          <div class="grow"></div>
          <button class="btn primary">加入</button>
        </div>
      </form>
      <${Lightbox} store=${store} refId=${light} onClose=${() => setLight(null)} />
    </${Sheet}>`;
}
