import { useState } from 'preact/hooks';
import { html, Field, Segmented, toast, errMsg } from '../ui.js';
import { supabase } from '../store.js';

export function AuthView({ onDone, onLocal }) {
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!email || pw.length < 6) return toast('請輸入 email 和至少 6 碼密碼');
    setBusy(true);
    try {
      const sb = await supabase();
      if (mode === 'in') {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        onDone();
      } else {
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.href } });
        if (error) throw error;
        if (data.session) onDone();
        else { toast('📧 請到信箱點確認信，再回來登入', 5000); setMode('in'); }
      }
    } catch (err) {
      errMsg(err.message === 'Invalid login credentials' ? 'email 或密碼錯誤' : err);
    }
    setBusy(false);
  };

  return html`
    <div class="page auth-page">
      <div class="auth-logo">🧳</div>
      <h1>旅伴 TripPals</h1>
      <p class="muted">和夥伴一起規劃旅程、在地圖上看見彼此</p>
      <form class="card form" onSubmit=${submit}>
        <${Segmented} value=${mode} options=${[['in', '登入'], ['up', '註冊']]} onChange=${setMode} />
        <${Field} label="Email"><input class="input" type="email" autocomplete="email" value=${email}
          onInput=${e => setEmail(e.target.value)} /></${Field}>
        <${Field} label="密碼"><input class="input" type="password" autocomplete=${mode === 'in' ? 'current-password' : 'new-password'}
          value=${pw} onInput=${e => setPw(e.target.value)} /></${Field}>
        <button class="btn primary block" disabled=${busy}>${busy ? '請稍候…' : mode === 'in' ? '登入' : '建立帳號'}</button>
      </form>
      <button class="btn ghost" onClick=${onLocal}>先不登入，用本機模式試用</button>
    </div>`;
}
