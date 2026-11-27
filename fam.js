/* Общий модуль «Список базара»: кто я, моя пара, подключение по коду, сообщения через бота */
window.BZ = (() => {
  const TOKEN = '9048023473:AAGVSv9rPZnskkfFdbjiU5r32mWV5z7YBZg';
  const BASE = location.origin + location.pathname.replace(/[^/]*$/, '');
  const TWA = window.Telegram && Telegram.WebApp && Telegram.WebApp.initData ? Telegram.WebApp : null;
  // первая пара — уже подключена
  const LEGACY = {
    748149827: { id: 1828250943, name: 'Жасмин', topic: 'bzj-xhVrydzuy3HnSdN7' },
    1828250943: { id: 748149827, name: 'Жахонгир', topic: 'bzj-xhVrydzuy3HnSdN7' },
  };
  const LS = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch (e) { return null } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} },
    del(k) { try { localStorage.removeItem(k) } catch (e) {} },
  };
  const u = TWA && TWA.initDataUnsafe && TWA.initDataUnsafe.user;
  const me = u ? { id: u.id, name: (u.first_name || 'Я').slice(0, 40) } : null;
  const cs = TWA && TWA.CloudStorage && TWA.isVersionAtLeast && TWA.isVersionAtLeast('6.9') ? TWA.CloudStorage : null;
  const get = k => new Promise(r => {
    if (!cs) return r(LS.get(k));
    try { cs.getItem(k, (e, v) => { if (e || !v) return r(LS.get(k)); try { r(JSON.parse(v)) } catch (x) { r(LS.get(k)) } }) } catch (e) { r(LS.get(k)) }
  });
  const set = (k, v) => { LS.set(k, v); try { cs && cs.setItem(k, JSON.stringify(v), () => {}) } catch (e) {} };
  const del = k => { LS.del(k); try { cs && cs.removeItem(k, () => {}) } catch (e) {} };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = n => { const a = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const b = crypto.getRandomValues(new Uint8Array(n)); for (const x of b) s += a[x % a.length]; return s };
  const code = id => Number(id).toString(36).toUpperCase();
  const okTopic = t => typeof t === 'string' && /^bz[jf]-[A-Za-z0-9]{8,32}$/.test(t);

  async function send(chat, html, btn) {
    if (!chat) return false;
    const call = b => fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()).catch(() => ({ ok: false }));
    const body = { chat_id: chat, text: html, parse_mode: 'HTML', disable_web_page_preview: true };
    if (btn) body.reply_markup = { inline_keyboard: [[{ text: btn.text, web_app: { url: btn.url } }]] };
    let r = await call(body);
    if (!r.ok && btn) { body.reply_markup = { inline_keyboard: [[{ text: btn.text, url: btn.url }]] }; r = await call(body) }
    if (!r.ok && btn) { delete body.reply_markup; body.text = html + '\n\n' + esc(btn.url); r = await call(body) }
    return !!r.ok;
  }

  let fam = null;
  async function load() {
    if (!me) return null;
    fam = await get('bz-fam');
    if (fam && !(Number.isInteger(fam.id) && okTopic(fam.topic))) fam = null;
    if (!fam && LEGACY[me.id]) { fam = { ...LEGACY[me.id] }; set('bz-fam', fam) }
    // приглашение пришло кнопкой от бота: ?pair=ID.TOPIC.ИМЯ
    const qs = new URLSearchParams(location.search);
    const p = qs.get('pair');
    if (p) {
      const [id, topic, ...n] = p.split('.');
      const pid = Number(id);
      if (Number.isInteger(pid) && pid > 0 && pid !== me.id && okTopic(topic)) {
        const isNew = !fam || fam.id !== pid || fam.topic !== topic;
        fam = { id: pid, name: (decodeURIComponent(n.join('.')) || 'Пара').slice(0, 40), topic };
        set('bz-fam', fam);
        if (isNew && qs.get('ack') !== '1') {
          // сообщаем пригласившему, что подключились
          send(pid, '<b>' + esc(me.name) + '</b> подключился(ась) к общему списку ✅', { text: 'Открыть Список базара', url: BASE + 'index.html?ack=1&pair=' + me.id + '.' + topic + '.' + encodeURIComponent(me.name) });
        }
        BZ.justPaired = isNew;
      }
      history.replaceState(null, '', location.pathname);
    }
    return fam;
  }
  // пригласить пару по её коду
  async function invite(c) {
    const pid = parseInt(String(c || '').trim().toLowerCase(), 36);
    if (!me) return { err: 'Открой приложение через @bazarjay_bot в Telegram' };
    if (!Number.isInteger(pid) || pid <= 0) return { err: 'Неверный код' };
    if (pid === me.id) return { err: 'Это твой собственный код — нужен код второго человека' };
    const topic = 'bzf-' + rnd(16);
    const ok = await send(pid, '<b>' + esc(me.name) + '</b> приглашает тебя вести общий список базара и играть вместе 🛒🎮\nНажми кнопку, чтобы подключиться.',
      { text: 'Подключиться ✅', url: BASE + 'index.html?pair=' + me.id + '.' + topic + '.' + encodeURIComponent(me.name) });
    if (!ok) return { err: 'Не получилось: пусть этот человек сначала откроет @bazarjay_bot и нажмёт Start' };
    fam = { id: pid, name: 'Пара (ждём ответа)', topic };
    set('bz-fam', fam);
    return { ok: true };
  }
  function unpair() { fam = null; del('bz-fam') }

  return { TWA, me, esc, send, load, invite, unpair, code, BASE, get fam() { return fam }, LS };
})();
