'use strict';
/* Pestaña de estadísticas: quién participa más y menos, reparto por partes, salas, parejas y sustituciones. */

const PERIODOS = [['3m', '3 meses'], ['6m', '6 meses'], ['12m', '12 meses'], ['ano', 'Año de servicio'], ['todo', 'Todo']];

function rangoPeriodo(k) {
  const hoy = hoyISO();
  const [y, m] = hoy.split('-').map(Number);
  const inicioAno = `${m >= 9 ? y : y - 1}-09-01`;
  const desde = { '3m': addDias(hoy, -91), '6m': addDias(hoy, -182), '12m': addDias(hoy, -365), ano: inicioAno, todo: '0000-01-01' }[k];
  const hasta = ui.estProg ? (k === 'ano' ? `${Number(inicioAno.slice(0, 4)) + 1}-08-31` : '9999-12-31') : addDias(hoy, -1);
  return { desde, hasta };
}

const pct = (n, max) => max ? Math.max(2, Math.round(n / max * 100)) : 0;

function barras(items, opts = {}) {
  if (!items.length) return `<p class="muted small">Sin datos en este periodo.</p>`;
  const max = Math.max(...items.map(i => i.n), 1);
  return `<div class="hbars">${items.map(i => `
    <div class="hbar" data-tip="${esc(i.tip || `${i.label}: ${i.n}`)}" ${i.id ? `data-act="hist-pub" data-id="${i.id}"` : ''}>
      <span class="hbar-l">${esc(i.label)}</span>
      <span class="hbar-t"><span class="hbar-f ${opts.clase || ''}" style="width:${pct(i.n, max)}%"></span></span>
      <span class="hbar-v">${i.n}${i.extra ? ` <span class="muted">${esc(i.extra)}</span>` : ''}</span>
    </div>`).join('')}</div>`;
}

function vistaEstadisticas() {
  const { desde, hasta } = rangoPeriodo(ui.estPeriodo);
  const hoy = hoyISO();
  const todas = entradas().filter(e => e.fecha >= desde && e.fecha <= hasta);
  const asign = todas.filter(e => e.estado === 'asignada');
  const sust = todas.filter(e => e.estado === 'sustituido');
  const activos = state.publicadores.filter(p => p.activo);
  const semanas = state.semanas.filter(s => !s.sinReunion && fechaReunion(s) >= desde && fechaReunion(s) <= hasta);

  const filtros = `<div class="card row no-print">
    <div class="seg">${PERIODOS.map(([k, v]) => `<button data-act="est-periodo" data-k="${k}" class="${ui.estPeriodo === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <label class="row small"><input type="checkbox" data-act="est-prog" ${ui.estProg ? 'checked' : ''}> Incluir partes programadas (futuras)</label>
    <span class="muted small grow" style="text-align:right">${desde === '0000-01-01' ? 'Todo el historial' : `Del ${fechaCorta(desde)} al ${hasta.startsWith('9999') ? 'futuro' : fechaCorta(hasta)}`}</span>
  </div>`;

  if (!asign.length && !sust.length) return filtros + `<div class="card empty">No hay asignaciones en este periodo.</div>`;

  // Por publicador
  const porPub = new Map();
  for (const e of asign) {
    const r = porPub.get(e.pub) || { n: 0, tipos: {}, salaA: 0, salaB: 0, ult: '' };
    r.n++;
    r.tipos[e.cod] = (r.tipos[e.cod] || 0) + 1;
    if (PARTES_ESTUDIANTE.includes(e.tipo) || (e.tipo === 'maestros' && e.rol === 'ayudante')) e.sala === 'B' ? r.salaB++ : r.salaA++;
    if (e.fecha > r.ult) r.ult = e.fecha;
    porPub.set(e.pub, r);
  }
  const participantes = [...porPub.keys()].filter(id => pub(id)).length;
  const desglose = r => Object.entries(r.tipos).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${ASIG[c]}: ${n}`).join(' · ');

  const kpis = [
    ['Partes', asign.length, `${semanas.length} reuniones`],
    ['Participantes', participantes, `de ${activos.length} activos`],
    ['Media por participante', participantes ? (asign.length / participantes).toFixed(1).replace('.', ',') : '0', 'partes'],
    ['Sustituciones', sust.length, asign.length ? `${Math.round(sust.length / (asign.length + sust.length) * 100)} % de las asignaciones` : ''],
  ];

  const ranking = [...porPub.entries()].filter(([id]) => pub(id))
    .map(([id, r]) => ({ id, label: nombre(id), n: r.n, tip: `${nombre(id)} — ${r.n} partes. ${desglose(r)}` }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'es'));

  // Menos utilizados: activos con alguna asignación habilitada
  const menos = activos.filter(p => (p.asignaciones || []).length)
    .map(p => {
      const r = porPub.get(p.id);
      const ultGlobal = entradas().filter(e => e.pub === p.id && e.estado === 'asignada' && e.fecha < hoy).map(e => e.fecha).sort().pop();
      return { id: p.id, label: p.nombre, n: r?.n || 0, extra: ultGlobal ? `· última ${relativo(diasEntre(hoy, ultGlobal))}` : '· nunca', ult: ultGlobal || '' };
    })
    .sort((a, b) => a.n - b.n || a.ult.localeCompare(b.ult))
    .slice(0, 12);

  // Por mes
  const meses = new Map();
  for (const e of asign) meses.set(e.fecha.slice(0, 7), (meses.get(e.fecha.slice(0, 7)) || 0) + 1);
  const clavesMes = [...meses.keys()].sort().slice(-18);
  const maxMes = Math.max(...clavesMes.map(k => meses.get(k)), 1);
  const columnas = clavesMes.length ? `<div class="cols">${clavesMes.map(k => {
    const [y, m] = k.split('-').map(Number);
    const n = meses.get(k);
    return `<div class="col" data-tip="${MESES[m - 1]} ${y}: ${n} partes">
      <span class="col-b" style="height:${pct(n, maxMes)}%">${n === maxMes ? `<span class="col-v">${n}</span>` : ''}</span>
      <span class="col-l">${MESES[m - 1].slice(0, 3)}${m === 1 || k === clavesMes[0] ? `<br>${String(y).slice(2)}` : ''}</span></div>`;
  }).join('')}</div>` : '';

  // Por tipo de asignación
  const porCod = {};
  for (const e of asign) porCod[e.cod] = (porCod[e.cod] || 0) + 1;
  const tipos = Object.entries(porCod).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ label: ASIG[c], n }));

  // Mapa publicador × tipo
  const codsUsados = Object.keys(ASIG).filter(c => porCod[c]);
  const maxCelda = Math.max(1, ...[...porPub.values()].flatMap(r => Object.values(r.tipos)));
  const filasMapa = ranking.map(r => {
    const t = porPub.get(r.id).tipos;
    return `<tr><td class="small"><b>${esc(r.label)}</b></td>${codsUsados.map(c => {
      const n = t[c] || 0;
      const fuerza = n ? 15 + Math.round(85 * n / maxCelda) : 0;
      return `<td class="num heat ${fuerza > 55 ? 'fuerte' : ''}" style="${n ? `background:color-mix(in srgb, var(--viz-1) ${fuerza}%, transparent)` : ''}" data-tip="${esc(`${r.label} · ${ASIG[c]}: ${n}`)}">${n || ''}</td>`;
    }).join('')}<td class="num"><b>${r.n}</b></td></tr>`;
  }).join('');

  // Salas
  const conSalas = [...porPub.entries()].filter(([id, r]) => pub(id) && r.salaB);
  const hayAux = asign.some(e => e.sala === 'B');
  const salas = hayAux ? `<div class="card"><h3>Sala principal y auxiliar</h3>
    <p class="small muted" style="margin-top:0">Partes de estudiante (incluido ayudante) en cada sala. Sirve para que todos pasen por las dos.</p>
    <div class="leyenda"><span><i class="sw viz-1"></i> Sala principal</span><span><i class="sw viz-2"></i> Sala auxiliar</span></div>
    <div class="hbars">${[...porPub.entries()].filter(([id, r]) => pub(id) && (r.salaA || r.salaB))
      .sort((a, b) => (b[1].salaA + b[1].salaB) - (a[1].salaA + a[1].salaB))
      .map(([id, r]) => {
        const tot = r.salaA + r.salaB;
        return `<div class="hbar" data-tip="${esc(`${nombre(id)}: ${r.salaA} en principal, ${r.salaB} en auxiliar`)}">
          <span class="hbar-l">${esc(nombre(id))}</span>
          <span class="hbar-t apilada">${r.salaA ? `<span class="hbar-f" style="width:${r.salaA / tot * 100}%"></span>` : ''}${r.salaB ? `<span class="hbar-f viz-2" style="width:${r.salaB / tot * 100}%"></span>` : ''}</span>
          <span class="hbar-v">${r.salaA} / ${r.salaB}</span></div>`;
      }).join('')}</div>
    ${conSalas.length ? '' : '<p class="small muted">Nadie ha tenido todavía partes en la sala auxiliar en este periodo.</p>'}
  </div>` : '';

  // Parejas titular-ayudante
  const parejas = new Map();
  for (const e of asign) {
    if (e.rol !== 'ayudante' || !e.companero || e.tipo !== 'maestros') continue;
    const k = [e.companero, e.pub].sort().join('|');
    const r = parejas.get(k) || { n: 0, ult: '' };
    r.n++; if (e.fecha > r.ult) r.ult = e.fecha;
    parejas.set(k, r);
  }
  const topParejas = [...parejas.entries()].sort((a, b) => b[1].n - a[1].n || b[1].ult.localeCompare(a[1].ult)).slice(0, 10);

  // Sustituciones
  const motivos = {};
  for (const e of sust) { const m = (e.motivo || 'Sin motivo').trim(); motivos[m] = (motivos[m] || 0) + 1; }
  const sustituidos = {}, sustitutos = {};
  for (const e of sust) {
    sustituidos[e.pub] = (sustituidos[e.pub] || 0) + 1;
    if (e.sustituto) sustitutos[e.sustituto] = (sustitutos[e.sustituto] || 0) + 1;
  }
  const lista = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return filtros + `
  <div class="kpis">${kpis.map(([t, v, s]) => `<div class="kpi"><span class="kpi-t">${t}</span><span class="kpi-v">${v}</span><span class="kpi-s">${s}</span></div>`).join('')}</div>
  <div class="grid2">
    <div class="card"><h3>Más participaciones</h3>${barras(ranking.slice(0, 12))}</div>
    <div class="card"><h3>Menos participaciones</h3><p class="small muted" style="margin-top:0">Activos con alguna asignación habilitada. Buenos candidatos para las próximas semanas.</p>${barras(menos, { clase: 'tenue' })}</div>
  </div>
  <div class="grid2">
    <div class="card"><h3>Partes por mes</h3>${columnas}</div>
    <div class="card"><h3>Por tipo de asignación</h3>${barras(tipos)}</div>
  </div>
  <div class="card"><h3>Quién hace qué</h3>
    <div class="tabla-wrap"><table class="mapa"><thead><tr><th></th>${codsUsados.map(c => `<th class="num" title="${ASIG[c]}">${abrev(c)}</th>`).join('')}<th class="num">Total</th></tr></thead>
    <tbody>${filasMapa}</tbody></table></div></div>
  ${salas}
  <div class="grid2">
    <div class="card"><h3>Parejas más repetidas</h3>${topParejas.length ? `<table><tbody>${topParejas.map(([k, r]) => {
      const [a, b] = k.split('|');
      return `<tr><td>${esc(nombre(a))} y ${esc(nombre(b))}</td><td class="num"><b>${r.n}</b></td><td class="small muted">última ${relativo(diasEntre(hoy, r.ult))}</td></tr>`;
    }).join('')}</tbody></table>` : '<p class="muted small">Sin demostraciones con ayudante en este periodo.</p>'}</div>
    <div class="card"><h3>Sustituciones</h3>${sust.length ? `
      <span class="small muted">Por motivo</span>${barras(lista(motivos).map(([m, n]) => ({ label: m, n })))}
      <span class="small muted">A quién se sustituyó</span>${barras(lista(sustituidos).map(([id, n]) => ({ id, label: nombre(id), n })))}
      <span class="small muted">Quién cubrió más</span>${barras(lista(sustitutos).map(([id, n]) => ({ id, label: nombre(id), n })))}` : '<p class="muted small">No hubo sustituciones en este periodo.</p>'}</div>
  </div>`;
}

/* Tooltip compartido para elementos con data-tip */
(() => {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  document.body.appendChild(tip);
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
  });
  document.addEventListener('mousemove', e => {
    if (tip.hidden) return;
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px';
    tip.style.top = (e.clientY + 16) + 'px';
  });
})();
