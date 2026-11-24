// 💰 記帳分帳：記下誰付了多少、哪些人分，最後算出誰該給誰
import { useState, useEffect } from 'preact/hooks';
import { html, Sheet, Field, Empty, toast, errMsg, fmtDate, daysBetween, confirmBox, fmtMoney } from '../ui.js';
import { EXPENSE_CATS, expenseCat, CURRENCIES } from '../consts.js';
import { fetchRate, participants, newGuestId, owedBy, baseAmount, balances, settleUp } from '../money.js';

export function ExpensesView({ app }) {
  const { store, trip } = app;
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const [guests, setGuests] = useState(false);
  const base = trip.currency || 'TWD';
  const people = participants(app);
  const nameOf = id => people.find(p => p.id === id)?.name || '（已離開）';
  const me = store.userId;

  useEffect(() => {
    store.list('expenses', { trip_id: trip.id }).then(setList).catch(errMsg);
  }, [trip.id, app.version]);

  if (!list) return html`<div class="loading">載入中…</div>`;

  const spend = list.filter(e => e.kind !== 'settle');
  const total = spend.reduce((s, e) => s + baseAmount(e), 0);
  const mine = spend.reduce((s, e) => s + (owedBy(e)[me] || 0), 0);
  const byCat = EXPENSE_CATS.map(([k, icon, label]) => ({
    k, icon, label, v: spend.filter(e => (e.category || 'other') === k).reduce((s, e) => s + baseAmount(e), 0),
  })).filter(c => c.v > 0);
  const bal = balances(list);
  const transfers = settleUp(bal);

  const markPaid = async t => {
    if (!(await confirmBox(`確認 ${nameOf(t.from)} 已經還 ${nameOf(t.to)} ${fmtMoney(t.amount, base)}？`))) return;
    try {
      await store.put('expenses', {
        trip_id: trip.id, kind: 'settle', title: '還錢', amount: Math.round(t.amount * 100) / 100,
        currency: base, rate: 1, paid_by: t.from, split_among: [t.to], day: new Date().toISOString().slice(0, 10),
      });
      toast('✅ 已記錄還款');
      app.bump();
    } catch (e) { errMsg(e); }
  };

  const setBase = async cur => {
    try { app.updateTrip(await store.put('trips', { ...trip, currency: cur })); } catch (e) { errMsg(e); }
  };

  // 依日期分組，新的在上面
  const groups = [];
  for (const e of [...list].sort((a, b) => (b.day || '').localeCompare(a.day || '') || String(b.created_at).localeCompare(String(a.created_at)))) {
    const g = groups.find(x => x.day === (e.day || null));
    if (g) g.items.push(e); else groups.push({ day: e.day || null, items: [e] });
  }

  return html`
    <div class="page">
      <div class="page-head">
        <h2>💰 記帳</h2>
        <div class="row gap">
          <button class="btn ghost sm" onClick=${() => setGuests(true)}>👥 分帳成員</button>
          <button class="btn primary sm" onClick=${() => setEdit({})}>＋ 記一筆</button>
        </div>
      </div>

      <div class="card money-summary">
        <div class="money-big">
          <div><small>總花費</small><b>${fmtMoney(total, base)}</b></div>
          <div><small>我分攤的</small><b>${fmtMoney(mine, base)}</b></div>
        </div>
        ${byCat.length > 0 && html`<div class="cat-bar">
          ${byCat.map(c => html`<span class=${'cat-seg c-' + c.k} style=${{ flex: c.v }} title=${c.label}></span>`)}
        </div>
        <div class="cat-legend">
          ${byCat.map(c => html`<span><i class=${'dot c-' + c.k}></i>${c.icon} ${c.label} ${Math.round(c.v / total * 100)}%</span>`)}
        </div>`}
        <div class="row gap muted small-text">
          主要幣別
          ${list.length ? html`<b>${base}</b><span>（有記帳後就不能換）</span>`
          : html`<select class="input sm-input" value=${base} onChange=${e => setBase(e.target.value)}>
              ${CURRENCIES.map(([c, n]) => html`<option value=${c}>${c} ${n}</option>`)}
            </select>`}
        </div>
      </div>

      <section>
        <h3 class="sec-title">🤝 誰該給誰</h3>
        ${!transfers.length ? html`<div class="muted pad">${list.length ? '🎉 目前大家都不欠錢' : '記帳後會自動算出來'}</div>`
        : html`<div class="list">${transfers.map(t => html`
            <div class="card settle-row">
              <div class="grow"><b>${nameOf(t.from)}</b> → <b>${nameOf(t.to)}</b>
                <div class="settle-amt">${fmtMoney(t.amount, base)}</div></div>
              <button class="btn ghost sm" onClick=${() => markPaid(t)}>✓ 已還</button>
            </div>`)}</div>`}
      </section>

      <section>
        <h3 class="sec-title">🧾 明細</h3>
        ${!list.length && html`<${Empty} icon="💰" text="還沒有記帳。按「＋ 記一筆」開始吧！" />`}
        ${groups.map(g => html`
          <div class="exp-day" key=${g.day || 'none'}>
            <div class="muted exp-day-head">${g.day ? fmtDate(g.day) : '未填日期'}
              <span>${fmtMoney(g.items.filter(e => e.kind !== 'settle').reduce((s, e) => s + baseAmount(e), 0), base)}</span></div>
            ${g.items.map(e => html`
              <div class="card exp-row" key=${e.id} onClick=${() => setEdit(e)}>
                <div class="exp-icon">${e.kind === 'settle' ? '🤝' : expenseCat(e.category)[1]}</div>
                <div class="grow exp-main">
                  <div class="exp-title">${e.kind === 'settle' ? `${nameOf(e.paid_by)} 還 ${nameOf(e.split_among?.[0])}` : e.title || expenseCat(e.category)[2]}</div>
                  <div class="muted small-text">${e.kind === 'settle' ? '還款' : `${nameOf(e.paid_by)} 付 · ${e.shares ? '自訂分攤' : `${(e.split_among || []).length} 人分`}`}</div>
                </div>
                <div class="exp-amt">
                  <b>${fmtMoney(e.amount, e.currency)}</b>
                  ${e.currency !== base && html`<small class="muted">≈ ${fmtMoney(baseAmount(e), base)}</small>`}
                </div>
              </div>`)}
          </div>`)}
      </section>

      ${edit && html`<${ExpenseForm} app=${app} item=${edit} people=${people} base=${base}
        onClose=${() => setEdit(null)} onSaved=${() => { setEdit(null); app.bump(); }} />`}
      ${guests && html`<${GuestsSheet} app=${app} people=${people} onClose=${() => setGuests(false)} />`}
    </div>`;
}

function ExpenseForm({ app, item, people, base, onClose, onSaved }) {
  const { store, trip } = app;
  const days = daysBetween(trip.start_date, trip.end_date);
  const today = new Date().toISOString().slice(0, 10);
  const isSettle = item.kind === 'settle';
  const [f, setF] = useState({
    title: '', category: 'food', amount: '', currency: localStorage.getItem('trippals.lastCur.' + trip.id) || base,
    rate: 1, paid_by: store.userId, split_among: people.map(p => p.id),
    day: days.includes(today) ? today : days[0] || today, note: '', shares: null, ...item,
  });
  const [custom, setCustom] = useState(!!item.shares);
  const [rateBusy, setRateBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  // 換幣別時自動查匯率
  useEffect(() => {
    if (item.id && f.currency === item.currency) return;
    if (f.currency === base) return set('rate', 1);
    let alive = true;
    setRateBusy(true);
    fetchRate(f.currency, base).then(r => {
      if (!alive) return;
      setRateBusy(false);
      if (r) set('rate', Math.round(r * 1e6) / 1e6);
      else toast('查不到匯率，請自己輸入');
    });
    return () => { alive = false; };
  }, [f.currency]);

  const toggle = id => set('split_among', f.split_among.includes(id) ? f.split_among.filter(x => x !== id) : [...f.split_among, id]);
  const sharesSum = Object.values(f.shares || {}).reduce((s, v) => s + (Number(v) || 0), 0);

  const save = async e => {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!(amount > 0)) return toast('請輸入金額');
    if (!(Number(f.rate) > 0)) return toast('請輸入匯率');
    let shares = null, split = f.split_among;
    if (custom) {
      shares = Object.fromEntries(Object.entries(f.shares || {}).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)]));
      if (Math.abs(sharesSum - amount) > 0.01) return toast(`每人金額加起來（${sharesSum}）要等於總金額（${amount}）`);
      split = Object.keys(shares);
    }
    if (!split.length) return toast('至少選一個人分攤');
    setSaving(true);
    try {
      localStorage.setItem('trippals.lastCur.' + trip.id, f.currency);
      await store.put('expenses', {
        ...f, trip_id: trip.id, kind: f.kind || 'expense', amount, rate: Number(f.rate), split_among: split, shares,
        day: f.day || null, title: f.title.trim(),
      });
      onSaved();
    } catch (err) { errMsg(err); }
    setSaving(false);
  };
  const del = async () => {
    if (!(await confirmBox('刪除這筆帳？'))) return;
    try { await store.remove('expenses', item.id); onSaved(); } catch (err) { errMsg(err); }
  };

  const curOpts = CURRENCIES.some(c => c[0] === f.currency) ? CURRENCIES : [[f.currency, ''], ...CURRENCIES];

  return html`
    <${Sheet} title=${isSettle ? '還款紀錄' : item.id ? '編輯帳目' : '記一筆'} onClose=${onClose}>
      <form class="form" onSubmit=${save}>
        ${!isSettle && html`
          <div class="chips wrap tight">
            ${EXPENSE_CATS.map(([k, icon, label]) => html`<button type="button" class=${'chip' + (f.category === k ? ' on' : '')}
              onClick=${() => set('category', k)}>${icon} ${label}</button>`)}
          </div>
          <${Field} label="項目"><input class="input" value=${f.title} placeholder="例：一蘭拉麵"
            onInput=${e => set('title', e.target.value)} /></${Field}>`}
        <div class="row gap">
          <${Field} label="金額"><input class="input" type="number" inputmode="decimal" step="any" min="0" value=${f.amount}
            placeholder="0" onInput=${e => set('amount', e.target.value)} /></${Field}>
          <${Field} label="幣別">
            <select class="input" value=${f.currency} onChange=${e => set('currency', e.target.value)}>
              ${curOpts.map(([c, n]) => html`<option value=${c}>${c} ${n}</option>`)}
            </select>
          </${Field}>
        </div>
        ${f.currency !== base && html`
          <${Field} label=${`匯率：1 ${f.currency} = ? ${base}${rateBusy ? '（查詢中…）' : ''}`}>
            <input class="input" type="number" step="any" min="0" value=${f.rate} onInput=${e => set('rate', e.target.value)} />
            ${Number(f.amount) > 0 && html`<small class="muted">≈ ${fmtMoney(Number(f.amount) * Number(f.rate || 0), base)}</small>`}
          </${Field}>`}
        <div class="row gap">
          <${Field} label=${isSettle ? '誰還錢' : '誰付的'}>
            <select class="input" value=${f.paid_by} onChange=${e => set('paid_by', e.target.value)}>
              ${people.map(p => html`<option value=${p.id}>${p.name}</option>`)}
            </select>
          </${Field}>
          <${Field} label="日期"><input class="input" type="date" value=${f.day || ''} onInput=${e => set('day', e.target.value)} /></${Field}>
        </div>
        ${!isSettle && html`
          <${Field} label="誰要分攤">
            <div class="row gap wrap">
              <button type="button" class=${'chip' + (!custom ? ' on' : '')} onClick=${() => setCustom(false)}>平均分</button>
              <button type="button" class=${'chip' + (custom ? ' on' : '')} onClick=${() => setCustom(true)}>自訂每人金額</button>
            </div>
            ${!custom ? html`
              <div class="chips wrap tight" style="margin-top:8px">
                ${people.map(p => html`<button type="button" class=${'chip' + (f.split_among.includes(p.id) ? ' on' : '')}
                  onClick=${() => toggle(p.id)}>${p.name}</button>`)}
              </div>
              ${f.split_among.length > 0 && Number(f.amount) > 0 && html`<small class="muted">每人 ${fmtMoney(Number(f.amount) / f.split_among.length, f.currency)}</small>`}`
            : html`
              <div class="shares">
                ${people.map(p => html`<label class="share-row"><span>${p.name}</span>
                  <input class="input" type="number" inputmode="decimal" step="any" min="0" placeholder="0" value=${f.shares?.[p.id] ?? ''}
                    onInput=${e => set('shares', { ...(f.shares || {}), [p.id]: e.target.value })} /></label>`)}
                <small class=${Math.abs(sharesSum - Number(f.amount || 0)) > 0.01 ? 'danger-text' : 'muted'}>
                  合計 ${sharesSum} / ${f.amount || 0} ${f.currency}</small>
              </div>`}
          </${Field}>`}
        ${isSettle && html`<${Field} label="還給誰">
          <select class="input" value=${f.split_among[0]} onChange=${e => set('split_among', [e.target.value])}>
            ${people.map(p => html`<option value=${p.id}>${p.name}</option>`)}
          </select></${Field}>`}
        <${Field} label="備註"><input class="input" value=${f.note || ''} onInput=${e => set('note', e.target.value)} /></${Field}>
        <div class="row gap sheet-actions">
          ${item.id && html`<button type="button" class="btn danger" onClick=${del}>刪除</button>`}
          <div class="grow"></div>
          <button type="button" class="btn ghost" onClick=${onClose}>取消</button>
          <button class="btn primary" disabled=${saving}>${saving ? '儲存中…' : '儲存'}</button>
        </div>
      </form>
    </${Sheet}>`;
}

// 沒有用 App 的同行人（例如家人），只記名字給分帳用
function GuestsSheet({ app, people, onClose }) {
  const { store, trip } = app;
  const [name, setName] = useState('');
  const save = async guests => {
    try { app.updateTrip(await store.put('trips', { ...trip, guests })); } catch (e) { errMsg(e); }
  };
  const add = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    await save([...(trip.guests || []), { id: newGuestId(), name: name.trim() }]);
    setName('');
  };
  const remove = async g => {
    if (!(await confirmBox(`移除「${g.name}」？已經記的帳不會刪除，但會顯示成（已離開）。`))) return;
    await save((trip.guests || []).filter(x => x.id !== g.id));
  };
  return html`
    <${Sheet} title="分帳成員" onClose=${onClose}>
      <div class="form">
        <div class="list">
          ${people.map(p => html`<div class="row gap guest-row">
            <span class="grow">${p.member ? '🧳' : '👤'} ${p.name}${p.id === store.userId ? '（我）' : ''}</span>
            ${!p.member && html`<button class="icon-btn" onClick=${() => remove((trip.guests || []).find(g => g.id === p.id))}>✕</button>`}
          </div>`)}
        </div>
        <p class="muted small-text">${store.mode === 'cloud' ? '有加入旅程的同行人會自動出現。' : ''}沒有用旅伴 App 的人，可以在這裡加名字一起分帳。</p>
        <form class="row gap" onSubmit=${add}>
          <input class="input grow" value=${name} placeholder="名字，例：媽媽" onInput=${e => setName(e.target.value)} />
          <button class="btn primary">加入</button>
        </form>
      </div>
    </${Sheet}>`;
}
