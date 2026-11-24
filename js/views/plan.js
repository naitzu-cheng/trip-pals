// 行程分頁：🗓️ 行程 / 🎫 票券 / 📸 回憶
import { useState } from 'preact/hooks';
import { html, Segmented } from '../ui.js';
import { ItineraryView } from './itinerary.js';
import { BookingsView } from './bookings.js';
import { MemoriesView } from './memories.js';

export function PlanView({ app }) {
  const [sub, setSub] = useState(() => sessionStorage.getItem('trippals.planSub') || 'itin');
  const [openBooking, setOpenBooking] = useState(null);
  const go = v => { setSub(v); sessionStorage.setItem('trippals.planSub', v); };
  return html`
    <div class="plan-seg"><${Segmented} value=${sub} onChange=${go}
      options=${[['itin', '🗓️ 行程'], ['book', '🎫 票券'], ['mem', '📸 回憶']]} /></div>
    ${sub === 'itin' && html`<${ItineraryView} app=${app} onOpenBooking=${id => { setOpenBooking(id); go('book'); }} />`}
    ${sub === 'book' && html`<${BookingsView} app=${app} openId=${openBooking} onOpened=${() => setOpenBooking(null)} />`}
    ${sub === 'mem' && html`<${MemoriesView} app=${app} />`}`;
}
