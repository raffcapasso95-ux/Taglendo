/* ==========================================================================
   Taglendo · prototipo cliccabile
   SOLO PER L'ANTEPRIMA: non va portato nell'app vera.
   Rende navigabili le pagine statiche (link tra schermate, finestre che si
   aprono e chiudono, finestra «Nuovo appuntamento» e calendario funzionanti).
   Il comportamento descritto qui è però la specifica da implementare.
   ========================================================================== */
(function () {
  'use strict';

  var D = 'Dialogs-module__rigNPa__';
  var FL = 'Flow-module__tgFl01__';
  var C = 'Calendar-module__tgK7cA__';
  var A = 'Agenda-module__IQMf4a__';
  var file = location.pathname.split('/').pop() || '';
  var m = file.match(/^(.*)-([pd])\.html$/);
  if (!m) return;
  var PAGE = m[1];
  var V = m[2];
  var params = new URLSearchParams(location.search);

  var TODAY = '2026-11-06';
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var GIORNI_BREVI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  function page(name, query) { return name + '-' + V + '.html' + (query ? '?' + query : ''); }
  function parse(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function shortDate(s) { var d = parse(s); return GIORNI_BREVI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()].slice(0, 3); }
  function longDate(s) { var d = parse(s); return GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()]; }
  function isClosed(s) { var w = parse(s).getDay(); return w === 0 || w === 1; }
  function hasAppts(s) {
    if (isClosed(s) || s < TODAY) return false;
    var d = parse(s), delta = Math.round((d - parse(TODAY)) / 864e5);
    return delta < 21 || (d.getDate() * 7 + d.getMonth() + 1) % 3 === 0;
  }

  /* ---------------------------------------------------------------- avvisi */
  function toast(msg, detail) {
    var region = document.querySelector('[class*="Toast-module__"][class*="region"]') || document.getElementById('proto-toasts');
    if (!region) {
      region = document.createElement('div'); region.id = 'proto-toasts'; region.setAttribute('aria-live', 'polite');
      region.style.cssText = 'position:fixed;z-index:60;left:var(--space-4);right:var(--space-4);top:calc(var(--space-4) + env(safe-area-inset-top, 0px));display:flex;justify-content:center;pointer-events:none';
      document.body.appendChild(region);
    }
    var t = document.createElement('div');
    t.setAttribute('role', 'status');
    t.style.cssText = 'pointer-events:auto;max-width:var(--toast-max-width);padding:var(--toast-padding);border-radius:var(--radius-toast);' +
      'background:var(--brand-plum);color:var(--brand-cream);box-shadow:var(--shadow-toast);display:flex;flex-direction:column;gap:2px;' +
      'transition:opacity var(--duration-toast-in) var(--ease-out),transform var(--duration-toast-in) var(--ease-out);opacity:0;transform:translateY(8px)';
    var a = document.createElement('span'); a.style.cssText = 'font-size:15px;font-weight:700'; a.textContent = msg; t.appendChild(a);
    if (detail) { var b = document.createElement('span'); b.style.cssText = 'font-size:13px;color:var(--brand-peach)'; b.textContent = detail; t.appendChild(b); }
    region.innerHTML = ''; region.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'none'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 3200);
  }

  /* ---------------------------------------------------------------- collegamenti tra schermate */
  function route(href) {
    var u = new URL(href, 'https://x.it');
    var p = u.pathname, q = u.searchParams;
    if (p === '/agenda') {
      if (q.get('nuovo')) return page('agenda-oggi', 'apri=nuovo');
      if (q.get('op') && !q.get('g')) return page('agenda-barbiere');
      var g = q.get('g');
      if (!g || g === TODAY) return page(q.get('op') ? 'agenda-barbiere' : 'agenda-oggi');
      return page(isClosed(g) ? 'agenda-chiuso' : 'agenda-giorno', 'g=' + g);
    }
    if (p === '/statistiche') { var per = q.get('periodo'); return page(per === 'anno' ? 'statistiche-anno' : per === 'settimana' ? 'statistiche-settimana' : per === 'giorno' ? 'statistiche-giorno' : 'statistiche'); }
    var map = {
      '/': 'home', '/accedi': 'accedi', '/registrati': 'registrati', '/password': 'password', '/privacy': 'privacy', '/termini': 'termini', '/cookie': 'cookie',
      '/clienti': 'clienti', '/link': 'link', '/listino': 'listino', '/listino/chiusure': 'chiusure', '/listino/orari': 'listino-orari', '/impostazioni': 'impostazioni', '/profilo': 'profilo',
      '/impostazioni/avvisi': 'avvisi', '/impostazioni/email': 'email', '/impostazioni/email/anteprima': 'email-anteprima', '/impostazioni/operatori': 'operatori',
      '/impostazioni/pagina': 'pagina-salone', '/impostazioni/regole': 'regole', '/barberia-saragozza': 'salone',
      '/primo-avvio/1': 'avvio-1-salone', '/primo-avvio/2': 'avvio-2-orari', '/primo-avvio/3': 'avvio-3-servizi', '/primo-avvio/4': 'avvio-4-operatori', '/primo-avvio/5': 'avvio-5-pronto'
    };
    if (map[p]) return page(map[p]) + (u.hash || '');
    if (/^\/clienti\/[^/]+$/.test(p) && p !== '/clienti/esporta') return page('cliente-scheda');
    return null;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) !== '/') return;
    e.preventDefault();
    if (/\.ics$/.test(href)) return toast('Aggiunto al calendario', 'Si scarica l’evento per il tuo calendario');
    var dest = route(href);
    if (dest) location.href = dest;
    else toast('Non è nell’anteprima', 'Questa funzione esiste solo nell’app.');
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.className.indexOf('Settings-module__tgSe01__pgForm') > -1) return toast('Pagina salvata', 'I clienti vedono subito le modifiche');
    if (e.target.className.indexOf('Settings-module__tgSe01__pfForm') > -1) {
      var nm = e.target.querySelector('input');
      document.querySelectorAll('.Settings-module__tgSe01__pfName').forEach(function (n) { n.textContent = nm.value.trim() || 'Andrea'; });
      return toast('Profilo salvato', 'Le modifiche valgono da subito');
    }
    if (e.target.closest('[class*="AppShell"]')) location.href = page('accedi');
  });

  /* ---------------------------------------------------------------- data mostrata nell'agenda */
  var dayParam = params.get('g');
  function agendaDay() {
    if (dayParam) return dayParam;
    if (PAGE === 'agenda-oggi' || PAGE === 'agenda-ore-passate' || PAGE === 'barbiere-agenda' || PAGE === 'agenda-calendario' || PAGE === 'cliente-in-negozio') return TODAY;
    return '2026-11-07';
  }
  if (dayParam && (PAGE === 'agenda-giorno' || PAGE === 'agenda-chiuso')) {
    var h1 = document.querySelector('h1');
    if (h1) h1.textContent = cap(longDate(dayParam));
    var gr = document.querySelector('[class*="Agenda-module__"][class*="greeting"]');
    if (gr) gr.textContent = 'Agenda di ' + GIORNI[parse(dayParam).getDay()];
    document.querySelectorAll('.' + A + 'dayChip').forEach(function (chip) {
      var on = (chip.getAttribute('href') || '').indexOf('g=' + dayParam) > -1;
      chip.classList.toggle(A + 'dayChipOn', on);
      if (on) { chip.setAttribute('aria-current', 'date'); chip.scrollIntoView({ inline: 'center', block: 'nearest' }); } else chip.removeAttribute('aria-current');
    });
  }

  /* ---------------------------------------------------------------- finestre */
  var veil = null;
  function showVeil(clear) {
    if (veil) veil.remove();
    veil = document.createElement('div');
    veil.setAttribute('aria-hidden', 'true');
    veil.style.cssText = 'position:fixed;inset:0;z-index:39;background:' + (clear ? 'transparent' : 'var(--overlay)') + ';opacity:0;transition:opacity var(--duration-backdrop) ease';
    veil.addEventListener('click', closeDialog);
    document.body.appendChild(veil);
    requestAnimationFrame(function () { veil.style.opacity = '1'; });
  }
  function current() { return document.querySelector('dialog[open]'); }
  function closeDialog() {
    var d = current();
    if (d) d.remove();
    if (veil) { veil.remove(); veil = null; }
    document.querySelectorAll('.' + A + 'calButtonOn').forEach(function (b) { b.classList.remove(A + 'calButtonOn'); b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current()) closeDialog(); });

  var cache = {};
  function loadDialog(name) {
    var url = page(name);
    if (!cache[url]) cache[url] = fetch(url).then(function (r) { return r.text(); }).then(function (t) {
      var doc = new DOMParser().parseFromString(t, 'text/html');
      return doc.querySelector('dialog').outerHTML;
    });
    return cache[url];
  }
  function openDialog(name, after) {
    return loadDialog(name).then(function (html) {
      closeDialog();
      var host = document.querySelector('[class*="Toast-module__"][class*="region"]');
      var wrap = document.createElement('div'); wrap.innerHTML = html;
      var dlg = wrap.firstElementChild;
      dlg.dataset.src = name;
      if (host) host.parentNode.insertBefore(dlg, host); else document.body.appendChild(dlg);
      wire(dlg);
      if (after) after(dlg);
      return dlg;
    }).catch(function () { location.href = page(name); });
  }

  function wire(dlg) {
    var src = dlg.dataset.src || PAGE;
    showVeil(dlg.classList.contains(C + 'popover'));
    if (dlg.dataset.dialog === 'nuovo' || dlg.dataset.dialog === 'negozio') return wireBooking(dlg);
    if (dlg.dataset.dialog === 'calendario') return wireAgendaCal(dlg);
    if (dlg.dataset.dialog === 'nuovo-cliente' || dlg.dataset.dialog === 'foto') return wireClientDialog(dlg);
    if (dlg.dataset.dialog === 'giorno') return wireDayEditor(dlg);
    if (dlg.querySelector('[data-price-row]')) { dlg.dataset.priceToast = ''; wirePrice(dlg); }
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.hasAttribute('data-edit-price') || b.hasAttribute('data-price-set')) return;
      var txt = b.textContent.trim();
      if (src.indexOf('appuntamento-dettaglio') === 0) {
        if (txt === 'Sposta') return openDialog('appuntamento-sposta');
        if (txt === 'Annulla') return openDialog('appuntamento-annulla');
        if (b.hasAttribute('aria-pressed')) { pressInGroup(b); return toast('Stato aggiornato', txt); }
      }
      if (src.indexOf('appuntamento-annulla') === 0) {
        if (txt === 'No, tienilo') return openDialog('appuntamento-dettaglio');
        if (txt.indexOf('Sì') === 0) { closeDialog(); return toast('Appuntamento annullato'); }
      }
      if (/^(Annulla|Chiudi|No, tienilo)$/.test(txt)) return closeDialog();
      if (b.hasAttribute('aria-pressed')) return pressInGroup(b);
      if (b.className.indexOf('Button-module__') > -1 && b.className.indexOf('primary') > -1) { closeDialog(); return toast('Fatto', txt); }
      if (b.className.indexOf('Button-module__') > -1 && b.className.indexOf('secondary') > -1) { closeDialog(); return toast(txt); }
    });
  }
  function pressInGroup(b) {
    Array.prototype.forEach.call(b.parentNode.children, function (s) {
      if (!s.hasAttribute('aria-pressed')) return;
      var on = s === b;
      s.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (s.classList.contains(D + 'option')) { s.classList.toggle(D + 'optionOn', on); return; }
      ['chip', 'dayButton'].forEach(function (base) {
        if (s.classList.contains(D + base) || s.classList.contains(D + base + 'On')) {
          s.classList.toggle(D + base + 'On', on); s.classList.toggle(D + base, !on);
        }
      });
    });
  }

  /* ---------------------------------------------------------------- avatar: iniziali, colore, foto */
  var AV = 'Avatar-module__tgAv01__';
  function initialsOf(n) { return n.trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); }
  function setAvatarColor(el, i) { for (var k = 0; k < 5; k++) el.classList.remove(AV + 'c' + k); el.classList.add(AV + 'c' + i); }
  function wireAvatarPicker(root, nameInput, onChange) {
    if (!root) return null;
    var prev = root.querySelector('[data-avatar-preview]');
    var baseText = prev.textContent;
    function paintName() { if (prev.classList.contains(AV + 'photo')) return; prev.textContent = nameInput ? (nameInput.value.trim() ? initialsOf(nameInput.value) : '+') : baseText; }
    if (nameInput) nameInput.addEventListener('input', function () { paintName(); onChange && onChange(); });
    root.addEventListener('click', function (e) {
      var s = e.target.closest('[data-swatch]');
      if (!s) return;
      root.querySelectorAll('[data-swatch]').forEach(function (x) { var on = x === s; x.classList.toggle(AV + 'swatchOn', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      prev.classList.remove(AV + 'photo'); prev.style.backgroundImage = ''; paintName();
      setAvatarColor(prev, +s.dataset.swatch); onChange && onChange();
    });
    var file = root.querySelector('[data-avatar-file]');
    if (file) file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { prev.style.backgroundImage = 'url(' + r.result + ')'; prev.classList.add(AV + 'photo'); prev.textContent = ''; onChange && onChange(); toast('Foto aggiunta', 'Visibile solo a te e al salone'); };
      r.readAsDataURL(f);
    });
    return { preview: prev };
  }

  /* ---------------------------------------------------------------- nuovo cliente e foto del cliente */
  function wireClientDialog(dlg) {
    var name = dlg.querySelector('[data-new-name]');
    var picker = wireAvatarPicker(dlg.querySelector('[data-avatar-picker]'), name);
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-close')) return closeDialog();
      if (b.hasAttribute('data-save-and-book')) { location.href = page('agenda-oggi', 'apri=nuovo'); return; }
      if (b.hasAttribute('data-confirm')) {
        if (dlg.dataset.dialog === 'foto') {
          var target = document.querySelector('[data-client-avatar]');
          if (target && picker) {
            var p = picker.preview;
            target.className = target.className.replace(/Avatar-module__tgAv01__\S+/g, '').trim();
            p.className.split(/\s+/).forEach(function (k) { if (/__(c\d|photo)$/.test(k)) target.classList.add(k); });
            target.style.backgroundImage = p.style.backgroundImage;
            target.textContent = p.classList.contains(AV + 'photo') ? '' : p.textContent;
          }
          closeDialog(); return toast('Foto aggiornata');
        }
        var n = name && name.value.trim();
        if (!n) { name.focus(); name.setAttribute('aria-invalid', 'true'); return; }
        closeDialog(); return toast('Cliente salvato', n);
      }
    });
  }

  function wireDayTitle(d, ranges) {
    var list = d.querySelector('[data-slots]'), first = list.firstElementChild;
    if (first && ranges) {
      var tpl = first.cloneNode(true); list.innerHTML = '';
      ranges.forEach(function (r, i) {
        var n = tpl.cloneNode(true), o = n.querySelectorAll('output');
        o[0].textContent = r[0]; o[1].textContent = r[1]; n.querySelector('.Listino-module__7K8RIG__slotNum').textContent = i + 1;
        n.querySelector('.Listino-module__7K8RIG__slotRemove').setAttribute('aria-label', 'Togli la fascia ' + r[0] + '–' + r[1]);
        list.appendChild(n);
      });
      var sw = d.querySelector('[role="switch"]'); sw.setAttribute('aria-checked', ranges.length ? 'true' : 'false');
      if (!ranges.length) { list.appendChild(tpl); list.parentNode.style.opacity = '0.4'; }
    }
    var t = d.querySelector('h2'); t.textContent = d.dataset.day;
    d.querySelector('[class*="Toggle-module__ntMQ3a__label"]').textContent = 'Aperto il ' + d.dataset.day.toLowerCase();
    d.querySelectorAll('.Listino-module__7K8RIG__copyDay').forEach(function (b) { b.hidden = d.dataset.day.indexOf(b.textContent) === 0; });
  }
  /* ---------------------------------------------------------------- orari: editor del giorno */
  function addMin(t, m) { var p = t.split(':'), v = Math.max(6 * 60, Math.min(23 * 60, +p[0] * 60 + +p[1] + m)); return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'); }
  var LI = 'Listino-module__7K8RIG__';
  function wireDayEditor(dlg) {
    var list = dlg.querySelector('[data-slots]');
    var tpl = list.firstElementChild ? list.firstElementChild.cloneNode(true) : null;
    function renumber() { list.querySelectorAll('.' + LI + 'slotNum').forEach(function (n, i) { n.textContent = i + 1; }); }
    if (dlg.dataset.day) {
      var t = dlg.querySelector('h2'); t.textContent = dlg.dataset.day;
      dlg.querySelector('[class*="Toggle-module__ntMQ3a__label"]').textContent = 'Aperto il ' + dlg.dataset.day.toLowerCase();
      dlg.querySelectorAll('.' + LI + 'copyDay').forEach(function (b) { b.hidden = dlg.dataset.day.indexOf(b.textContent) === 0; });
    }
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-close')) return closeDialog();
      if (b.hasAttribute('data-confirm')) { closeDialog(); return toast('Orari salvati', dlg.querySelector('h2').textContent); }
      if (b.getAttribute('role') === 'switch') { var on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); list.parentNode.style.opacity = on ? '' : '0.4'; return; }
      if (b.classList.contains(LI + 'stepButton')) { var out = b.parentNode.querySelector('output'); out.textContent = addMin(out.textContent, b.textContent.trim() === '+' ? 15 : -15); return; }
      if (b.classList.contains(LI + 'slotRemove')) { b.closest('li').remove(); return renumber(); }
      if (b.hasAttribute('data-add-slot') && tpl) { var n = tpl.cloneNode(true); var o = n.querySelectorAll('output'); o[0].textContent = '15:00'; o[1].textContent = '19:00'; list.appendChild(n); return renumber(); }
      if (b.classList.contains(LI + 'copyDay')) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }
    });
  }

  /* ---------------------------------------------------------------- calendario mensile */
  function renderCal(cal, year, month, selected) {
    var mode = cal.dataset.calMode;
    cal.dataset.year = year; cal.dataset.month = month;
    cal.querySelector('.' + C + 'month').textContent = cap(MESI[month - 1]) + ' ' + year;
    var key = year + '-' + String(month).padStart(2, '0');
    cal.querySelectorAll('[data-cal-goto]').forEach(function (b) {
      var on = b.dataset.calGoto === key;
      b.classList.toggle(C + 'monthChipOn', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) b.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    });
    var first = new Date(year, month - 1, 1);
    var lead = (first.getDay() + 6) % 7;
    var h = '';
    ['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach(function (g) { h += '<span class="' + C + 'dow" aria-hidden="true">' + g + '</span>'; });
    for (var i = 0; i < lead; i++) h += '<span class="' + C + 'blank" aria-hidden="true"></span>';
    for (var d = new Date(first); d.getMonth() === month - 1; d.setDate(d.getDate() + 1)) {
      var s = iso(d), cls = [C + 'day'], dis = false;
      if (s === TODAY) cls.push(C + 'dayToday');
      if (isClosed(s)) { cls.push(C + 'dayClosed'); dis = dis || mode === 'book'; }
      if (s < TODAY) { cls.push(C + 'dayPast'); dis = dis || mode === 'book'; }
      if (s === selected) cls.push(C + 'dayOn');
      var lab = cap(GIORNI[d.getDay()]) + ' ' + d.getDate() + ' ' + MESI[d.getMonth()] + ' ' + d.getFullYear() + (isClosed(s) ? ', chiuso' : '') + (hasAppts(s) ? ', con appuntamenti' : '');
      h += '<button type="button" class="' + cls.join(' ') + '" aria-label="' + lab + '" aria-pressed="' + (s === selected) + '" data-date="' + s + '"' + (dis ? ' disabled' : '') + '>' +
        '<span class="' + C + 'num">' + d.getDate() + '</span>' + (hasAppts(s) ? '<span class="' + C + 'dot" aria-hidden="true"></span>' : '') + '</button>';
    }
    cal.querySelector('.' + C + 'grid').innerHTML = h;
    var prev = cal.querySelector('[data-cal-prev]');
    if (mode === 'book') prev.disabled = key <= TODAY.slice(0, 7);
  }
  function calSelected(cal) { var b = cal && cal.querySelector('.' + C + 'dayOn'); return b ? b.dataset.date : null; }
  function wireCal(cal, onPick) {
    cal.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      var y = +cal.dataset.year, mo = +cal.dataset.month, sel = calSelected(cal);
      if (b.hasAttribute('data-cal-prev')) { mo--; if (mo === 0) { mo = 12; y--; } return renderCal(cal, y, mo, sel); }
      if (b.hasAttribute('data-cal-next')) { mo++; if (mo === 13) { mo = 1; y++; } return renderCal(cal, y, mo, sel); }
      if (b.dataset.calGoto) { var p = b.dataset.calGoto.split('-'); return renderCal(cal, +p[0], +p[1], sel); }
      if (b.hasAttribute('data-cal-today')) { renderCal(cal, 2026, 11, TODAY); return onPick(TODAY, cal); }
      if (b.dataset.date) { renderCal(cal, y, mo, b.dataset.date); return onPick(b.dataset.date, cal); }
    });
    var p = cal.querySelector('[data-cal-prev]');
    if (cal.dataset.calMode === 'book') p.disabled = (+cal.dataset.year * 100 + +cal.dataset.month) <= 202611;
  }

  function wireAgendaCal(dlg) {
    var go = dlg.querySelector('[data-cal-go]');
    var cal = dlg.querySelector('.' + C + 'cal');
    var picked = calSelected(cal) || TODAY;
    function label(s) { go.textContent = 'Apri ' + longDate(s); }
    if (!dlg.dataset.src) label(picked);
    else { renderCal(cal, +agendaDay().slice(0, 4), +agendaDay().slice(5, 7), agendaDay()); picked = agendaDay(); label(picked); }
    wireCal(cal, function (s) { picked = s; label(s); });
    dlg.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeDialog();
      if (e.target.closest('[data-cal-go]')) location.href = route('/agenda?g=' + picked);
    });
    var btn = document.querySelector('[data-open-agenda-cal]');
    if (btn) { btn.classList.add(A + 'calButtonOn'); btn.setAttribute('aria-expanded', 'true'); }
  }

  /* ---------------------------------------------------------------- finestra «Nuovo appuntamento» */
  var BUSY = {
    sab: { Chiunque: ['09:45'], Andrea: ['09:15', '09:30', '09:45', '16:45', '17:00', '17:15', '17:30', '17:45'], Marco: ['10:00', '10:15', '15:00', '15:15'], Simone: ['10:00', '10:15'] },
    altro: ['10:30', '10:45', '15:00', '15:15', '16:00']
  };
  function busyFor(day, barber) {
    if (day === '2026-11-07') return BUSY.sab[barber] || BUSY.sab.Chiunque;
    if (day === TODAY) return ['09:00', '09:15'];
    return BUSY.altro;
  }

  /* «Nuovo appuntamento» e «Cliente in negozio»: schermata con righe che scorrono di lato */
  /* ---------------------------------------------------------------- prezzo per il cliente (sconto o offerta) */
  function wirePrice(root, onChange) {
    var row = root.querySelector('[data-price-row]'), ed = root.querySelector('[data-price-editor]');
    if (!row || !ed) return null;
    var input = ed.querySelector('[data-price-input]');
    var api = { full: +ed.dataset.full, price: null };
    var cur = parseFloat(input.value.replace(',', '.'));
    if (!isNaN(cur) && cur !== api.full) api.price = cur;
    function fmt(v) { return (Math.round(v * 100) / 100).toString().replace('.', ',') + ' €'; }
    function paint() {
      var now = api.price === null ? api.full : api.price, changed = api.price !== null;
      row.classList.toggle(FL + 'priceChanged', changed);
      row.querySelector('[data-price-now]').textContent = fmt(now);
      var old = row.querySelector('[data-price-old]'); old.hidden = !changed; old.textContent = fmt(api.full);
      ed.querySelectorAll('[data-price-set]').forEach(function (b) {
        var on = +b.dataset.priceSet === now && (changed || b.textContent === 'Prezzo pieno');
        b.classList.toggle(FL + 'quickOn', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      onChange && onChange(api);
    }
    api.setFull = function (v) {
      api.full = v; api.price = null; ed.dataset.full = v; input.value = v;
      var qs = ed.querySelectorAll('[data-price-set]');
      qs[0].dataset.priceSet = v; qs[1].dataset.priceSet = Math.round(v * 0.9); qs[2].dataset.priceSet = Math.round(v * 0.8);
      paint();
    };
    api.text = function () { return api.price === null ? fmt(api.full) : fmt(api.price) + ' invece di ' + fmt(api.full); };
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-edit-price')) {
        var open = ed.hidden; ed.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) input.focus(); return;
      }
      if (b.hasAttribute('data-price-set')) {
        var v = +b.dataset.priceSet; api.price = v === api.full ? null : v; input.value = v; paint();
        if (root.dataset.priceToast !== undefined) toast('Prezzo aggiornato', fmt(v) + (v === 0 ? ' · omaggio' : ''));
      }
    });
    input.addEventListener('input', function () {
      var v = parseFloat(input.value.replace(',', '.'));
      api.price = isNaN(v) || v === api.full ? null : Math.max(0, v); paint();
    });
    input.addEventListener('change', function () { if (root.dataset.priceToast !== undefined) toast('Prezzo aggiornato', api.text()); });
    paint();
    return api;
  }

  function wireBooking(dlg) {
    var walkin = dlg.dataset.dialog === 'negozio';
    var blocks = {};
    dlg.querySelectorAll('[data-block]').forEach(function (s) { blocks[s.dataset.block] = s; });
    var calEl = dlg.querySelector('.' + C + 'cal');
    var st = { day: null, time: walkin ? 'adesso' : null, barber: 'Chiunque', service: null, client: null };
    var pressedDay = dlg.querySelector('.' + D + 'dayButtonOn');
    var calOpen = dlg.querySelector('[data-when-cal]:not([hidden])');
    st.day = (calOpen && calSelected(calEl)) || (pressedDay ? pressedDay.dataset.date : null) || agendaDay();
    if (!walkin) { var pt = dlg.querySelector('.' + D + 'time[aria-pressed="true"]'); st.time = pt ? pt.textContent.trim() : null; }
    var ps = blocks.cosa.querySelector('[aria-pressed="true"]'); st.service = ps ? ps.dataset.value : '';
    var pb = blocks.conchi.querySelector('[aria-pressed="true"]'); st.barber = pb ? pb.dataset.value : 'Chiunque';
    var newBox = blocks.cliente.querySelector('[data-client-new]');
    var nameInput = newBox.querySelector('[data-new-name]');
    var pc = blocks.cliente.querySelector('[aria-pressed="true"]');
    st.client = pc ? (pc.hasAttribute('data-new-client') ? (nameInput.value.trim() || null) : pc.dataset.value) : null;
    var NOW = (dlg.querySelector('[data-sum-main]').textContent.match(/Adesso · (\d\d:\d\d)/) || [])[1];
    wireAvatarPicker(newBox.querySelector('[data-avatar-picker]'), nameInput, function () { refresh(); });
    var price = null;
    price = wirePrice(blocks.cosa, function () { if (price) refresh(); });

    function select(group, btn, onCls) {
      group.querySelectorAll('[aria-pressed]').forEach(function (b) {
        var on = b === btn; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle(onCls, on);
      });
    }
    function refresh() {
      var when = walkin ? 'Adesso · ' + NOW : (st.time ? shortDate(st.day) + ' · ' + st.time : 'Scegli giorno e ora');
      dlg.querySelector('[data-sum-main]').textContent = when + ' · ' + (st.client || 'Scegli il cliente');
      var sp = st.service.split(' · ');
      dlg.querySelector('[data-sum-sub]').textContent = sp[0] + ' · ' + sp[1] + ' · ' + (price ? price.text() : sp[2]) + ' · ' + (st.barber === 'Chiunque' ? 'con chiunque sia libero' : 'con ' + st.barber);
      dlg.querySelector('[data-confirm]').disabled = !(st.time && st.client);
    }
    function paintTimes() {
      if (walkin) return;
      var busy = busyFor(st.day, st.barber);
      dlg.querySelectorAll('.' + D + 'time').forEach(function (b) {
        var t = b.textContent.trim(), isBusy = busy.indexOf(t) > -1, on = !isBusy && t === st.time;
        b.disabled = isBusy;
        b.classList.remove(D + 'chip', D + 'chipOn', D + 'chipOff');
        b.classList.add(isBusy ? D + 'chipOff' : (on ? D + 'chipOn' : D + 'chip'));
        b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.dataset.time = t;
      });
      if (st.time && busy.indexOf(st.time) > -1) st.time = null;
      var hint = dlg.querySelector('[data-when-times] .' + D + 'hint');
      if (hint) hint.textContent = 'Orari con ' + st.barber + ' · ' + shortDate(st.day) + ' · Barrato = occupato';
    }
    function paintStrip() {
      if (walkin) return;
      dlg.querySelectorAll('.' + D + 'days [data-date]').forEach(function (b) {
        var on = b.dataset.date === st.day;
        b.classList.toggle(D + 'dayButtonOn', on); b.classList.toggle(D + 'dayButton', !on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var inStrip = !!dlg.querySelector('.' + D + 'days [data-date="' + st.day + '"]');
      var cb = dlg.querySelector('[data-open-cal]'), lab = cb.querySelector('.' + D + 'calButtonDate');
      if (!inStrip) {
        if (!lab) { lab = document.createElement('span'); lab.className = D + 'calButtonDate'; cb.appendChild(lab); }
        var d = parse(st.day); lab.textContent = d.getDate() + ' ' + MESI_BREVI[d.getMonth()].toLowerCase();
      } else if (lab) lab.remove();
      cb.classList.toggle(D + 'calButtonOn', !inStrip || !dlg.querySelector('[data-when-cal]').hidden);
    }
    function showCal(on) {
      dlg.querySelector('[data-when-cal]').hidden = !on;
      dlg.querySelector('[data-when-times]').hidden = on;
      dlg.querySelector('[data-open-cal]').setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) renderCal(calEl, +st.day.slice(0, 4), +st.day.slice(5, 7), st.day);
      paintStrip();
    }
    function goTo(key) { var el = blocks[key]; if (el) setTimeout(function () { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); }
    function next() { if (!st.time) return goTo('quando'); if (!st.client) return goTo('cliente'); }

    if (calEl) wireCal(calEl, function (s) { st.day = s; st.time = null; showCal(false); paintTimes(); refresh(); });

    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled || b.closest('.' + C + 'cal')) return;
      if (b.hasAttribute('data-close')) return closeDialog();
      if (b.hasAttribute('data-confirm')) {
        closeDialog();
        if (walkin) return toast('Cliente in negozio', st.client + ' · adesso' + (st.barber !== 'Chiunque' ? ' con ' + st.barber : ''));
        return toast('Appuntamento fissato', shortDate(st.day) + ' alle ' + st.time + ' · ' + st.client + (st.barber !== 'Chiunque' ? ' con ' + st.barber : '') + (price && price.price !== null ? ' · ' + price.text() : ''));
      }
      if (b.hasAttribute('data-open-cal')) return showCal(dlg.querySelector('[data-when-cal]').hidden);
      if (b.closest('.' + D + 'days')) { st.day = b.dataset.date; st.time = null; paintStrip(); paintTimes(); refresh(); return; }
      if (b.classList.contains(D + 'time')) { st.time = b.dataset.time; paintTimes(); refresh(); return next(); }
      if (b.hasAttribute('data-change-client')) {
        newBox.hidden = true; st.client = null;
        select(blocks.cliente.querySelector('.' + FL + 'people'), null, FL + 'personOn'); return refresh();
      }
      var blk = b.closest('[data-block]');
      if (!blk) return;
      if (blk.dataset.block === 'cosa' && b.classList.contains(FL + 'card')) { select(b.parentNode, b, FL + 'cardOn'); st.service = b.dataset.value; if (price) price.setFull(+b.dataset.price); paintTimes(); return refresh(); }
      if (blk.dataset.block === 'conchi' && b.classList.contains(FL + 'person')) { select(b.parentNode, b, FL + 'personOn'); st.barber = b.dataset.value; paintTimes(); return refresh(); }
      if (blk.dataset.block === 'cliente' && b.classList.contains(FL + 'person')) {
        select(b.parentNode, b, FL + 'personOn');
        if (b.hasAttribute('data-new-client')) { newBox.hidden = false; nameInput.focus(); st.client = nameInput.value.trim() || null; }
        else { newBox.hidden = true; st.client = b.dataset.value; }
        refresh(); return next();
      }
    });
    dlg.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-new-name')) { st.client = e.target.value.trim() || null; return refresh(); }
      if (e.target.closest('.' + D + 'searchBox')) {
        var q = e.target.value.trim().toLowerCase();
        blocks.cliente.querySelectorAll('.' + FL + 'person:not([data-new-client])').forEach(function (o) { o.hidden = !!q && o.dataset.value.toLowerCase().indexOf(q) === -1; });
      }
    });
    paintStrip(); paintTimes(); refresh();
    dlg._prefill = function (barber, time) {
      if (barber) {
        var bb = blocks.conchi.querySelector('[data-value="' + barber + '"]');
        if (bb) { select(bb.parentNode, bb, FL + 'personOn'); st.barber = barber; }
      }
      st.day = agendaDay(); st.time = time || null; paintStrip(); paintTimes(); refresh();
      if (time) goTo('cliente');
    };
  }

  /* ---------------------------------------------------------------- azioni nelle pagine dell'agenda */
  document.addEventListener('click', function (e) {
    if (e.target.closest('dialog')) return;
    var b = e.target.closest('button');
    if (!b || b.disabled) return;
    var txt = b.textContent.trim();
    var cls = b.className || '';
    if (b.hasAttribute('data-open-menu')) return openMenu(true);
    if (b.hasAttribute('data-close-menu')) return openMenu(false);
    if (b.hasAttribute('data-share')) return toast('Condividi', 'Sul telefono si apre la scelta delle app');
    if (b.hasAttribute('data-share-report')) return toast('Resoconto pronto', 'Si apre WhatsApp con il riepilogo del giorno');
    if (b.hasAttribute('data-copy-link')) { openMenu(false); return toast('Link copiato', 'taglendo.it/barberia-saragozza'); }
    if (b.hasAttribute('data-open-password')) return openDialog('profilo-password');
    if (b.hasAttribute('data-open-delete')) return openDialog('profilo-elimina-account');
    if (cls.indexOf('Settings-module__tgSe01__pfPhoto') > -1) return toast('Cambia la tua foto', 'Sul telefono si apre la fotocamera o la galleria');
    if (cls.indexOf('Settings-module__tgSe01__pfColor') > -1) {
      var tick = b.parentNode.querySelector('svg');
      b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true'); if (tick) b.appendChild(tick);
      return toast('Colore in agenda', b.getAttribute('aria-label'));
    }
    if (cls.indexOf('Settings-module__tgSe01__pfSwitch') > -1) {
      var onl = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', onl ? 'true' : 'false');
      if (b.hasAttribute('data-pg-online')) return toast(onl ? 'Prenotazione online attiva' : 'Solo al telefono', onl ? 'I clienti prenotano dal link' : 'Sulla pagina resta il pulsante per chiamarti');
      if (b.hasAttribute('data-pg-prices')) return toast(onl ? 'Prezzi visibili' : 'Prezzi nascosti', 'Sulla pagina del salone');
      return toast(onl ? 'Sei prenotabile online' : 'Non sei più prenotabile online', onl ? 'I clienti ti vedono nel link' : 'Gli appuntamenti già presi restano');
    }
    if (b.hasAttribute('data-open-agenda-cal')) return openDialog('agenda-calendario');
    if (b.hasAttribute('data-open-new-client')) return openDialog('cliente-nuovo');
    if (b.hasAttribute('data-open-photo')) return openDialog('cliente-foto');
    if (cls.indexOf('Listino-module__7K8RIG__serviceCard') > -1) return openDialog('listino-modifica-servizio');
    if (cls.indexOf('Listino-module__7K8RIG__add') > -1) return openDialog('listino-nuovo-servizio');
    if (cls.indexOf('Listino-module__7K8RIG__dayMain') > -1) {
      var rs = Array.prototype.map.call(b.querySelectorAll('.Listino-module__7K8RIG__range'), function (x) { return x.textContent.split('–'); });
      return openDialog('listino-orari-giorno', function (d) { d.dataset.day = b.dataset.day; wireDayTitle(d, rs); });
    }
    if (cls.indexOf('Listino-module__7K8RIG__daySwitch') > -1) {
      var on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on);
      var row = b.closest('li'); row.classList.toggle('Listino-module__7K8RIG__dayRowClosed', !on);
      var rg = row.querySelector('.Listino-module__7K8RIG__ranges');
      if (!on) { rg.dataset.prev = rg.innerHTML; rg.innerHTML = '<span class="Listino-module__7K8RIG__rangeClosed">Chiuso</span>'; }
      else rg.innerHTML = rg.dataset.prev || '<span class="Listino-module__7K8RIG__range">9:00–19:00</span>';
      return toast(on ? 'Giorno aperto' : 'Giorno chiuso', row.querySelector('.Listino-module__7K8RIG__dayName').textContent);
    }
    if (cls.indexOf('Stats-module__tgSt01__navButton') > -1) return toast('Nell’anteprima c’è un solo periodo per vista');
    if (cls.indexOf('Clients-module__Rx71pa__filter') > -1) {
      if (/^Tutti/.test(txt)) return (location.href = page('clienti'));
      if (/^Da richiamare/.test(txt)) return (location.href = page('clienti-da-richiamare'));
      return toast('Filtro', txt);
    }
    if (cls.indexOf('Clients-module__Rx71pa__privacyRow') > -1 && /Elimina/.test(txt)) return (location.href = page('cliente-elimina'));
    if (txt === '+ Nuovo appuntamento' || txt === '+ Appuntamento') return openDialog('nuovo-1-vuoto', function (d) { d._prefill && d._prefill(null, null); });
    if (txt === 'Cliente in negozio' || txt === 'In negozio ora') return openDialog('cliente-in-negozio');
    var lab = b.getAttribute('aria-label') || '';
    var gm = lab.match(/^Fissa con (\w+) (\d\d:\d\d)/);
    if (gm) return openDialog('nuovo-1-vuoto', function (d) { d._prefill(gm[1], gm[2]); });
    if (cls.indexOf('SidePanel-module__Xpr6Pq__freeButton') > -1) {
      var sub = b.querySelector('[class*="freeSub"]'), when = b.querySelector('[class*="freeWhen"]');
      var who = sub ? sub.textContent.split(' · ')[0] : null;
      var tm = when && when.textContent.match(/\d\d:\d\d/);
      return openDialog('nuovo-1-vuoto', function (d) { d._prefill(who, tm ? tm[0] : null); });
    }
    if (/Day-module__FDC5YW__(block|rowButton)/.test(cls) || cls.indexOf('SidePanel-module__Xpr6Pq__rowButton') > -1) return openDialog('appuntamento-dettaglio');
    if (b.closest('[class*="SidePanel-module__Xpr6Pq__actions"]')) return toast('Stato aggiornato', txt);
    if (cls.indexOf('cancelledToggle') > -1) return toast('Nell’anteprima gli annullati non si mostrano');
    if (b.getAttribute('aria-label') === 'Copia il link di prenotazione') return toast('Link copiato', 'taglendo.it/barberia-saragozza');
  });

  /* ---------------------------------------------------------------- foto del salone (Impostazioni › Pagina del salone) */
  var phGrid = document.querySelector('[data-ph-grid]');
  if (phGrid) {
    var SEP = 'Settings-module__tgSe01__', POOL = ['hero.jpg', 'cambia-taglio.jpg', 'cambia-macchinetta.jpg', 'cambia-schiuma.jpg'], added = 0;
    function phPaint() {
      var tiles = phGrid.querySelectorAll('[data-ph]');
      document.querySelector('[data-ph-count]').textContent = tiles.length + ' di 8';
      phGrid.querySelector('[data-ph-add]').disabled = tiles.length >= 8;
      tiles.forEach(function (t, i) {
        var cov = t.querySelector('.' + SEP + 'phCover'), star = t.querySelector('[data-ph-cover]');
        if (i === 0 && !cov) { cov = document.createElement('span'); cov.className = SEP + 'phCover'; cov.textContent = 'Copertina'; t.insertBefore(cov, t.children[1]); }
        if (i > 0 && cov) cov.remove();
        if (star) star.hidden = i === 0;
      });
    }
    phGrid.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var tile = b.closest('[data-ph]');
      if (b.hasAttribute('data-ph-remove')) {
        if (phGrid.querySelectorAll('[data-ph]').length === 1) return toast('Serve almeno una foto', 'È la copertina della tua pagina');
        tile.remove(); phPaint(); return toast('Foto tolta', 'Non si vede più sulla tua pagina');
      }
      if (b.hasAttribute('data-ph-cover')) { phGrid.insertBefore(tile, phGrid.firstChild); phPaint(); return toast('Nuova copertina', 'È la prima foto della tua pagina'); }
      if (b.hasAttribute('data-ph-add')) {
        var first = phGrid.querySelector('[data-ph]'), copy = first.cloneNode(true);
        var img = copy.querySelector('img'); img.src = '../assets/images/foto/' + POOL[(++added) % POOL.length]; img.alt = 'Foto aggiunta';
        var cv = copy.querySelector('.' + SEP + 'phCover'); if (cv) cv.remove();
        if (!copy.querySelector('[data-ph-cover]')) {
          var st2 = document.createElement('button'); st2.type = 'button'; st2.className = SEP + 'phButton'; st2.setAttribute('data-ph-cover', ''); st2.setAttribute('aria-label', 'Usa come copertina');
          st2.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8z"></path></svg>';
          copy.querySelector('.' + SEP + 'phActions').insertBefore(st2, copy.querySelector('[data-ph-remove]'));
        }
        phGrid.insertBefore(copy, b.closest('li')); phPaint();
        return toast('Foto aggiunta', 'Sul telefono scegli dalla galleria o scatti una foto');
      }
    });
  }

  /* ---------------------------------------------------------------- menu su telefono */
  var menuVeil = null;
  function openMenu(on) {
    var m = document.querySelector('[data-menu]'), btn = document.querySelector('[data-open-menu]');
    if (!m) return;
    m.hidden = !on; if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) {
      menuVeil = document.createElement('div');
      menuVeil.style.cssText = 'position:fixed;inset:0;z-index:44;background:var(--backdrop-sheet)';
      menuVeil.addEventListener('click', function () { openMenu(false); });
      document.body.appendChild(menuVeil);
      var first = m.querySelector('a, button'); if (first) first.focus();
    } else if (menuVeil) { menuVeil.remove(); menuVeil = null; if (btn) btn.focus(); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuVeil) openMenu(false); });
  if (PAGE === 'menu') openMenu(true);

  /* ---------------------------------------------------------------- ricerca nella rubrica */
  var search = document.querySelector('[class*="Clients-module__Rx71pa__searchBox"] input');
  if (search) search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase().replace(/\s+/g, '');
    document.querySelectorAll('[class*="Clients-module__Rx71pa__group"]').forEach(function (g) {
      var any = false;
      g.querySelectorAll('li').forEach(function (li) {
        var n = (li.querySelector('[class*="__name"]') || li).textContent.toLowerCase().replace(/\s+/g, '');
        var wa = (li.querySelector('a[href*="wa.me"]') || {}).href || '';
        var show = !q || n.indexOf(q) > -1 || wa.replace(/\D/g, '').indexOf(q) > -1;
        li.style.display = show ? '' : 'none'; any = any || show;
      });
      g.style.display = any ? '' : 'none';
    });
  });

  /* ---------------------------------------------------------------- sito e pagina pubblica del salone (giro 9) */
  var BKP = 'Booking-module__fkPrwq__';
  function bookGo(name) {
    if (/^salone-/.test(PAGE)) return toast('Prenotazione di prova', 'Il percorso completo è nella «Pagina del salone»');
    location.href = page(name) + '#prenota';
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    var a = t.closest('a[href^="tel:"]');
    if (a) { e.preventDefault(); return toast('Chiamata', 'Sul telefono parte la chiamata al ' + a.getAttribute('href').slice(4).replace('+39', '')); }
    a = t.closest('a[href*="google.com/maps"]');
    if (a) { e.preventDefault(); return toast('Apri in Mappe', 'Sul telefono si apre la navigazione verso il salone'); }
    var b = t.closest('button');
    if (!b || b.disabled) return;
    var cls = b.className || '';
    if (cls.indexOf(BKP + 'service') > -1) return bookGo('prenota-2-giorno');
    if (cls.indexOf(BKP + 'slot') > -1 || cls.indexOf(BKP + 'freeButton') > -1) { b.setAttribute('aria-pressed', 'true'); return setTimeout(function () { bookGo('prenota-3-dati'); }, 150); }
    if (cls.indexOf(BKP + 'pill') > -1 || cls.indexOf(BKP + 'day') > -1) {
      b.parentNode.querySelectorAll('button').forEach(function (x) { if (!x.disabled) x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      return;
    }
    if (cls.indexOf(BKP + 'weekButton') > -1) return toast('Nell’anteprima c’è solo questa settimana');
    if (cls.indexOf(BKP + 'change') > -1) {
      var step = (b.getAttribute('aria-label') || '').replace('Cambia: ', '');
      return bookGo(step === 'Servizio' ? 'salone' : step === 'Giorno e ora' ? 'prenota-2-giorno' : 'prenota-3-dati');
    }
    if (cls.indexOf(BKP + 'box') > -1) { var on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); b.dataset.on = on; b.textContent = on ? '✓' : ''; b.dispatchEvent(new Event('input', { bubbles: true })); return; }
    if (b.hasAttribute('data-book-back')) return bookGo('prenota-3-dati');
    if (cls.indexOf(BKP + 'primary') > -1 && b.closest('[class*="Booking-module"]')) {
      if (PAGE.indexOf('prenota-3') === 0) return bookGo('prenota-4-codice');
      return;
    }
    if (cls.indexOf(BKP + 'secondary') > -1 && PAGE === 'prenota-5-fatto') return bookGo('salone');
    if (cls.indexOf(BKP + 'link') > -1) {
      if (/sbagliata/.test(b.textContent)) return bookGo('prenota-3-dati');
      return toast('Nuovo codice inviato', 'Controlla la tua email');
    }
    if (/__cookieButton|__cookieLink/.test(cls)) {
      var ck = b.closest('[class*="__cookie"][role="dialog"]'); if (ck) ck.hidden = true;
      return toast(/Accetta/.test(b.textContent) ? 'Cookie accettati' : /Rifiuta/.test(b.textContent) ? 'Solo cookie tecnici' : 'Scelta dei cookie', 'Puoi cambiare idea da «Preferenze cookie»');
    }
    if (/footerButton/.test(cls)) return toast('Preferenze cookie', 'Si apre la scelta dei cookie');
  });
  /* prenotazione pubblica a passi (giro 11): una domanda alla volta */
  function wireWizard(wz) {
    var SH = 'Shop-module__tgSh01__';
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var solo = wz.dataset.solo || null, prices = wz.dataset.prices === '1';
    var keys = [].map.call(wz.querySelectorAll('[data-wz-step]'), function (x) { return x.dataset.wzStep; });
    var LABEL = { servizio: 'Servizio', barbiere: 'Barbiere', orario: 'Giorno e ora', dati: 'I tuoi dati' };
    var st = { step: wz.dataset.step, service: wz.dataset.service === '' ? null : +wz.dataset.service, barber: solo || wz.dataset.barber || 'Chiunque', day: TODAY, time: wz.dataset.time || null };
    var svcBtns = wz.querySelectorAll('[data-wz-service]');
    function svc() { return st.service === null ? null : svcBtns[st.service].dataset; }
    var slots = wz.querySelector('[data-wz-slots]'), none = wz.querySelector('[data-wz-none]'), calBox = wz.querySelector('[data-wz-cal]'), calEl = calBox.querySelector('.' + C + 'cal');
    var name = wz.querySelector('#bk-name'), mail = wz.querySelector('#bk-mail'), priv = wz.querySelector('[aria-labelledby="bk-privacy"]');
    function freeTimes(day) {
      var out = [], busy = day === TODAY ? [] : busyFor(day, st.barber === 'Chiunque' ? 'Chiunque' : st.barber);
      [['09:00', '12:30'], ['14:30', '18:30']].forEach(function (r) {
        for (var h = +r[0].slice(0, 2), m = +r[0].slice(3); h * 60 + m <= +r[1].slice(0, 2) * 60 + +r[1].slice(3); m += 30) {
          if (m >= 60) { h++; m -= 60; }
          var t = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
          if (day === TODAY && t < '11:30') continue;
          if (busy.indexOf(t) > -1) continue;
          if (st.barber !== 'Chiunque' && !solo && day === '2026-11-07' && st.barber === 'Andrea' && t >= '16:30') continue;
          out.push(t);
        }
      });
      if (parse(day).getDay() === 0 || parse(day).getDay() === 1) return [];
      if (day === '2026-11-12' && st.barber === 'Marco') return [];
      return out;
    }
    function nextFreeDay(from) {
      var d = parse(from);
      for (var k = 1; k < 60; k++) { d.setDate(d.getDate() + 1); var iso = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); if (freeTimes(iso).length) return iso; }
      return null;
    }
    function paintSlots() {
      var list = freeTimes(st.day);
      none.hidden = list.length > 0; slots.hidden = !list.length;
      var html = '';
      [['Mattina', function (t) { return t < '13:00'; }], ['Pomeriggio', function (t) { return t >= '13:00'; }]].forEach(function (g) {
        var ts = list.filter(g[1]); if (!ts.length) return;
        html += '<div class="' + SH + 'slotGroup"><p class="' + SH + 'slotTitle">' + g[0] + '</p><div class="' + SH + 'slotGrid" role="group" aria-label="' + g[0] + '">' +
          ts.map(function (t) { return '<button type="button" class="' + SH + 'slot" data-wz-time="' + t + '" aria-pressed="' + (t === st.time ? 'true' : 'false') + '">' + t + '</button>'; }).join('') + '</div></div>';
      });
      slots.innerHTML = html;
      wz.querySelectorAll('[data-wz-day]').forEach(function (b) { var on = b.dataset.wzDay === st.day; b.classList.toggle(SH + 'dayOn', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var first = freeTimes(TODAY)[0];
      wz.querySelector('[data-wz-first-text]').textContent = 'Oggi alle ' + first + (solo ? '' : ' con ' + (st.barber === 'Chiunque' ? 'Andrea' : st.barber));
    }
    function whenText() { return shortDate(st.day) + ' · ' + st.time; }
    function okData() { return name.value.trim() && /.+@.+\..+/.test(mail.value) && priv.getAttribute('aria-checked') === 'true'; }
    function missing() {
      var m = []; if (!name.value.trim()) m.push('nome'); if (!/.+@.+\..+/.test(mail.value)) m.push(mail.value ? 'un’email valida' : 'email'); if (priv.getAttribute('aria-checked') !== 'true') m.push('informativa privacy');
      return m;
    }
    function paintData() {
      var s = svc();
      if (s) {
        wz.querySelector('[data-wz-sum-service]').textContent = s.name + ' · ' + s.mins + ' min';
        var pr = wz.querySelector('[data-wz-sum-price]'); if (pr) pr.textContent = s.eur + ' € in negozio';
      }
      var bb = wz.querySelector('[data-wz-sum-barber]'); if (bb) bb.textContent = st.barber === 'Chiunque' ? 'Chi è libero prima' : st.barber;
      if (st.time) { wz.querySelector('[data-wz-sum-when]').textContent = whenText(); wz.querySelector('[data-wz-confirm-text]').textContent = 'Prenota · ' + whenText().replace(' · ', ', '); }
      var ok = okData(), mi = wz.querySelector('[data-wz-missing]');
      wz.querySelector('[data-wz-confirm]').setAttribute('aria-disabled', ok ? 'false' : 'true');
      mi.hidden = ok; if (!ok) { mi.textContent = 'Mancano: ' + missing().join(', ') + '.'; }
    }
    function go(key, dir) {
      var cur = wz.querySelector('[data-wz-step="' + st.step + '"]'), nx = wz.querySelector('[data-wz-step="' + key + '"]');
      if (!nx) return;
      cur.hidden = true; nx.hidden = false;
      nx.removeAttribute('data-dir'); void nx.offsetWidth; nx.setAttribute('data-dir', dir || 'fwd');
      st.step = key;
      var i = keys.indexOf(key);
      wz.querySelector('[data-wz-label]').textContent = 'Passo ' + (i + 1) + ' di ' + keys.length + ' · ' + LABEL[key];
      wz.querySelectorAll('[data-wz-seg]').forEach(function (sg, k) { sg.classList.toggle(SH + 'wzSegOn', k <= i); });
      wz.querySelector('[data-wz-back]').hidden = i === 0;
      if (key === 'orario') paintSlots();
      if (key === 'dati') paintData();
      var top = wz.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.4) wz.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
      setTimeout(function () { nx.querySelector('[tabindex="-1"]').focus({ preventScroll: true }); }, 30);
    }
    function after(key) { var i = keys.indexOf(key); return keys[i + 1]; }
    wz.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.closest('.' + C + 'cal')) return;
      if (b.hasAttribute('data-wz-back')) return go(keys[keys.indexOf(st.step) - 1], 'back');
      if (b.dataset.wzGo) return go(b.dataset.wzGo, 'back');
      if (b.dataset.wzService !== undefined) {
        st.service = +b.dataset.wzService;
        svcBtns.forEach(function (x) { var on = x === b; x.classList.toggle(SH + 'choiceOn', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        return setTimeout(function () { go(st.picked ? 'orario' : after('servizio')); }, 120);
      }
      if (b.dataset.wzBarber) {
        st.barber = b.dataset.wzBarber; st.time = null;
        wz.querySelectorAll('[data-wz-barber]').forEach(function (x) { var on = x === b; x.classList.toggle(SH + 'choiceOn', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        return setTimeout(function () { go('orario'); }, 120);
      }
      if (b.hasAttribute('data-wz-first')) { st.day = TODAY; st.time = freeTimes(TODAY)[0]; if (!solo && st.barber === 'Chiunque') st.barber = 'Andrea'; paintSlots(); return setTimeout(function () { go('dati'); }, 120); }
      if (b.hasAttribute('data-wz-more')) { var open = calBox.hidden; calBox.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) renderCal(calEl, +st.day.slice(0, 4), +st.day.slice(5, 7), st.day); return; }
      if (b.dataset.wzDay) { st.day = b.dataset.wzDay; st.time = null; calBox.hidden = true; wz.querySelector('[data-wz-more]').setAttribute('aria-expanded', 'false'); return paintSlots(); }
      if (b.hasAttribute('data-wz-next')) { var nd = nextFreeDay(st.day); if (nd) { st.day = nd; paintSlots(); } return; }
      if (b.dataset.wzTime) { st.time = b.dataset.wzTime; slots.querySelectorAll('[data-wz-time]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); return setTimeout(function () { go('dati'); }, 140); }
      if (b.hasAttribute('data-wz-confirm')) {
        if (okData()) return bookGo('prenota-4-codice');
        var mi = wz.querySelector('[data-wz-missing]'); mi.hidden = false; mi.removeAttribute('data-bad'); void mi.offsetWidth; mi.setAttribute('data-bad', 'true');
        var firstBad = !name.value.trim() ? name : (!/.+@.+\..+/.test(mail.value) ? mail : priv); firstBad.focus();
      }
    });
    if (calEl) wireCal(calEl, function (s) { st.day = s; st.time = null; calBox.hidden = true; wz.querySelector('[data-wz-more]').setAttribute('aria-expanded', 'false'); paintSlots(); });
    wz.addEventListener('input', function () { if (st.step === 'dati') paintData(); });
    if (st.step === 'orario') paintSlots();
    if (st.step === 'dati') { paintSlots(); paintData(); }
    /* «Prenota con …» dal team: il barbiere è già scelto */
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-pick-barber]'); if (!a) return;
      st.barber = a.dataset.pickBarber; st.picked = true; st.time = null;
      wz.querySelectorAll('[data-wz-barber]').forEach(function (x) { var on = x.dataset.wzBarber === st.barber; x.classList.toggle(SH + 'choiceOn', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      setTimeout(function () { go(st.service === null ? 'servizio' : 'orario', 'fwd'); }, 0);
      toast('Prenoti con ' + st.barber, st.service === null ? 'Scegli il servizio' : 'Scegli giorno e ora');
    });
  }
  document.querySelectorAll('[data-wizard]').forEach(wireWizard);

  /* foto del salone: finestra a tutto schermo con avanti e indietro */
  var gal = document.querySelector('[data-gallery]');
  if (gal) {
    var shots = [].slice.call(gal.querySelectorAll('img')), cur = 0, viewer = null;
    var SH = 'Shop-module__tgSh01__';
    var ic = function (d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    function show(i) {
      cur = (i + shots.length) % shots.length;
      viewer.querySelector('img').src = shots[cur].getAttribute('src'); viewer.querySelector('img').alt = shots[cur].alt;
      viewer.querySelector('[data-v-text]').textContent = (cur + 1) + ' di ' + shots.length + ' · ' + shots[cur].alt;
    }
    function openViewer(i) {
      if (!viewer) {
        viewer = document.createElement('dialog'); viewer.className = SH + 'viewer'; viewer.setAttribute('aria-label', 'Foto del salone');
        viewer.innerHTML = '<img alt=""><div class="' + SH + 'viewerBar"><span class="' + SH + 'viewerText" data-v-text></span><span class="' + SH + 'viewerButtons">' +
          '<button type="button" class="' + SH + 'viewerButton" data-v="-1" aria-label="Foto precedente">' + ic('<path d="m15 6-6 6 6 6"></path>') + '</button>' +
          '<button type="button" class="' + SH + 'viewerButton" data-v="1" aria-label="Foto successiva">' + ic('<path d="m9 6 6 6-6 6"></path>') + '</button>' +
          '<button type="button" class="' + SH + 'viewerButton" data-v="x" aria-label="Chiudi">' + ic('<path d="M6 6l12 12M18 6 6 18"></path>') + '</button></span></div>';
        document.body.appendChild(viewer);
        viewer.addEventListener('click', function (e) {
          var b = e.target.closest('[data-v]');
          if (!b) { if (e.target === viewer) viewer.close(); return; }
          if (b.dataset.v === 'x') return viewer.close();
          show(cur + +b.dataset.v);
        });
        viewer.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
      }
      show(i); viewer.showModal();
    }
    gal.addEventListener('click', function (e) { var b = e.target.closest('[data-photo]'); if (b) openViewer(+b.dataset.photo); });
  }
  /* barra «Prenota» in basso: si nasconde quando la prenotazione è sullo schermo */
  var sbar = document.querySelector('.Shop-module__tgSh01__bar'), bsec = document.getElementById('prenota');
  if (sbar && bsec && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { sbar.style.visibility = en[0].isIntersecting ? 'hidden' : ''; }, { threshold: 0.05 }).observe(bsec);
  }
  var code = document.querySelector('.' + BKP + 'code');
  if (code) code.addEventListener('input', function () { if (code.value.replace(/\D/g, '').length >= 6) bookGo('prenota-5-fatto'); });
  document.addEventListener('submit', function (e) {
    var f = e.target, act = f.getAttribute('action');
    if (act && act.charAt(0) === '/' && !f.closest('[class*="AppShell"]')) { var d = route(act); if (d) location.href = d; }
  });
  /* confronto quaderno / Taglendo: si trascina la maniglia o si usano le frecce */
  document.querySelectorAll('[data-compare]').forEach(function (box) {
    var paper = box.querySelector('[class*="__paper"]'), line = box.querySelector('[class*="__line"]'), handle = box.querySelector('[role="slider"]');
    function set(pc) {
      pc = Math.max(4, Math.min(96, pc));
      paper.style.clipPath = 'inset(0 ' + (100 - pc) + '% 0 0)'; line.style.left = pc + '%'; handle.style.left = pc + '%';
      handle.setAttribute('aria-valuenow', Math.round(pc));
    }
    function fromEvent(ev) { var r = box.getBoundingClientRect(); set((ev.clientX - r.left) / r.width * 100); }
    var drag = false;
    box.addEventListener('pointerdown', function (ev) { drag = true; box.setPointerCapture(ev.pointerId); fromEvent(ev); });
    box.addEventListener('pointermove', function (ev) { if (drag) fromEvent(ev); });
    box.addEventListener('pointerup', function () { drag = false; });
    box.addEventListener('pointercancel', function () { drag = false; });
    handle.addEventListener('keydown', function (ev) {
      var v = +handle.getAttribute('aria-valuenow');
      if (ev.key === 'ArrowLeft') { set(v - 5); ev.preventDefault(); }
      if (ev.key === 'ArrowRight') { set(v + 5); ev.preventDefault(); }
    });
  });
  if (/^prenota-/.test(PAGE) && !location.hash) { var pc = document.getElementById('prenota'); if (pc) pc.scrollIntoView(); }

  /* ---------------------------------------------------------------- home del sito (giro 11) */
  var land = document.querySelector('.Land-module__tgLd01__page');
  if (land) {
    var LD = 'Land-module__tgLd01__';
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && 'IntersectionObserver' in window) land.setAttribute('data-motion', 'on');
    /* testata trasparente sull'apertura, crema dopo; barra in basso solo dopo l'apertura */
    var lh = land.querySelector('[data-land-header]'), lbar = land.querySelector('[data-land-bar]'), hero = land.querySelector('.' + LD + 'hero');
    function onScroll() {
      var endEl = land.querySelector('#inizia'), endTop = endEl ? endEl.getBoundingClientRect().top : 1e9;
      var past = window.scrollY > hero.offsetHeight - 80 && endTop > window.innerHeight - 40;
      lh.setAttribute('data-scrolled', window.scrollY > 24 ? 'true' : 'false');
      if (lbar) lbar.setAttribute('data-hidden', past ? 'false' : 'true');
    }
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    if ('IntersectionObserver' in window) {
      /* comparsa allo scorrimento, una volta sola */
      var rio = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting) { x.target.setAttribute('data-in', 'true'); rio.unobserve(x.target); } });
      }, { rootMargin: '0px 0px -12% 0px' });
      land.querySelectorAll('.' + LD + 'reveal').forEach(function (el) { rio.observe(el); });
      /* racconto: il passo al centro dello schermo accende la schermata del telefono */
      var shots = land.querySelectorAll('[data-story-shot]');
      var sio = new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (!x.isIntersecting) return;
          var k = x.target.getAttribute('data-story');
          land.querySelectorAll('[data-story]').forEach(function (s) { s.classList.toggle(LD + 'storyOn', s === x.target); });
          shots.forEach(function (im) { im.classList.toggle(LD + 'stickyShotOn', im.getAttribute('data-story-shot') === k); });
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      land.querySelectorAll('[data-story]').forEach(function (el) { sio.observe(el); });
      /* prezzo che scende fino a 0 €, a scatti */
      var tk = land.querySelector('[data-ticker]');
      if (tk && !calm) {
        tk.textContent = tk.getAttribute('data-ticker');
        var tio = new IntersectionObserver(function (en) {
          if (!en[0].isIntersecting) return; tio.disconnect();
          var n = +tk.getAttribute('data-ticker');
          (function step() { n = Math.max(0, n - Math.ceil(n / 4)); tk.textContent = n; if (n > 0) setTimeout(step, 70); })();
        }, { threshold: 0.6 });
        tio.observe(tk);
      }
    }
    /* telefono dell'apertura: la vera agenda, rimpicciolita alla larghezza della cornice */
    var scr = land.querySelector('[data-demo-screen]');
    if (scr) {
      var fit = function () { scr.style.setProperty('--demo-scale', (scr.clientWidth / 390).toFixed(4)); };
      fit(); window.addEventListener('resize', fit);
    }
    /* chiusura: il link del salone si scrive mentre digiti il nome */
    var slugIn = land.querySelector('[data-slug-input]'), slugOut = land.querySelector('[data-slug]');
    if (slugIn) slugIn.addEventListener('input', function () {
      var v = slugIn.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      slugOut.textContent = v || 'la-tua-barberia';
    });
    /* online o telefono: la pillola scorre e la scheda cambia */
    var seg = land.querySelector('.' + LD + 'seg');
    if (seg) seg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mode]'); if (!b) return;
      var m = b.dataset.mode; seg.setAttribute('data-mode', m);
      seg.querySelectorAll('[data-mode]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      land.querySelector('#mode-online').hidden = m !== 'online'; land.querySelector('#mode-tel').hidden = m !== 'tel';
      land.querySelector('#mode-online-text').hidden = m !== 'online'; land.querySelector('#mode-tel-text').hidden = m !== 'tel';
    });
  }

  /* ---------------------------------------------------------------- agenda in modalità demo (telefono della home) */
  if (params.get('demo') === '1' && PAGE === 'agenda-oggi') {
    document.documentElement.setAttribute('data-demo', '');
    var DY = 'Day-module__FDC5YW__';
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var list = document.querySelector('.' + DY + 'phoneOnly .' + DY + 'rows');
    if (list && !still) {
      var saved = list.innerHTML, n = 0;
      var arrivals = [
        { who: 'Gianni Ferraro', svc: 'Barba · 20 min · 12&nbsp;€', op: 0, opName: 'Andrea', start: '09:30', end: '09:50' },
        { who: 'Paolo Greco', svc: 'Taglio uomo · 30 min · 20&nbsp;€', op: 2, opName: 'Simone', start: '09:30', end: '10:00' }];
      var cycle = function () {
        if (document.hidden) return;
        if (n === arrivals.length) { list.innerHTML = saved; n = 0; return; }
        var a = arrivals[n], gap = list.querySelectorAll('.' + DY + 'gapRow')[0];
        if (!gap) return;
        toast('Nuova prenotazione online', a.who + ' · ' + a.start + ' con ' + a.opName);
        setTimeout(function () {
          var li = document.createElement('li'); li.className = DY + 'apptRow'; li.setAttribute('data-demo-new', '');
          li.innerHTML = '<button type="button" class="' + DY + 'rowButton" tabindex="-1"><span class="' + DY + 'rowTime">' + a.start + '<span class="' + DY + 'rowEnd">' + a.end + '</span></span>' +
            '<span class="' + DY + 'apptMain"><span class="' + DY + 'apptName">' + a.who + '</span><span class="' + DY + 'apptMeta">' + a.svc + ' · Online</span></span>' +
            '<span class="' + DY + 'opChip"><span class="Agenda-module__IQMf4a__avatar Agenda-module__IQMf4a__op' + a.op + ' Agenda-module__IQMf4a__avatarSm" aria-hidden="true">' + a.opName[0] + '</span>' + a.opName + '</span></button>';
          gap.replaceWith(li);
        }, 700);
        n++;
      };
      setTimeout(cycle, 1400); setInterval(cycle, 3200);
    }
  }

  /* ---------------------------------------------------------------- finestre già aperte nelle schermate di stato */
  var openOnLoad = document.querySelector('dialog[open]');
  if (openOnLoad) wire(openOnLoad);
  if (params.get('apri') === 'nuovo') openDialog('nuovo-1-vuoto', function (d) { d._prefill(null, null); });
})();
