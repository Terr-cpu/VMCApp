'use strict';

/* ================= Constantes ================= */

const DEMO = new URLSearchParams(location.search).has('demo');
const KEY = DEMO ? 'vmcapp:demo' : 'vmcapp:v1';

// Tipos de asignación que puede tener un publicador
const ASIG = {
  presidente: 'Presidente',
  consejero_b: 'Consejero sala auxiliar',
  oracion: 'Oración',
  tesoros: 'Discurso de Tesoros',
  perlas: 'Perlas escondidas',
  lectura: 'Lectura de la Biblia',
  maestros: 'Demostración (titular)',
  ayudante: 'Ayudante',
  discurso_est: 'Discurso de estudiante',
  vida: 'Nuestra vida cristiana',
  estudio_conductor: 'Conductor del estudio',
  estudio_lector: 'Lector del estudio',
  analisis: '¿Qué dirías? (análisis)',
};
const SOLO_VARONES = ['presidente', 'consejero_b', 'oracion', 'tesoros', 'perlas', 'lectura',
  'discurso_est', 'vida', 'estudio_conductor', 'estudio_lector', 'analisis'];

const PRIVILEGIOS = {
  anciano: 'Anciano',
  siervo: 'Siervo ministerial',
  publicador: 'Publicador bautizado',
  no_bautizado: 'Publicador no bautizado',
};

const SECCIONES = [
  ['inicio', 'Apertura'],
  ['tesoros', 'Tesoros de la Biblia'],
  ['maestros', 'Seamos mejores maestros'],
  ['vida', 'Nuestra vida cristiana'],
  ['cierre', 'Cierre'],
];

// Tipos de parte del programa. cod = asignación del titular, ayu = asignación del segundo puesto.
const TIPOS = {
  presidente:   { sec: 'inicio',   orden: 1, label: 'Presidente', cod: 'presidente' },
  consejero_b:  { sec: 'inicio',   orden: 2, label: 'Consejero sala auxiliar', cod: 'consejero_b' },
  oracion_ini:  { sec: 'inicio',   orden: 3, label: 'Oración inicial', cod: 'oracion' },
  tesoros:      { sec: 'tesoros',  orden: 1, label: 'Discurso', cod: 'tesoros', titulo: true },
  perlas:       { sec: 'tesoros',  orden: 2, label: 'Busquemos perlas escondidas', cod: 'perlas' },
  lectura:      { sec: 'tesoros',  orden: 3, label: 'Lectura de la Biblia', cod: 'lectura', salas: true, titulo: true },
  maestros:     { sec: 'maestros', orden: 1, label: 'Demostración', cod: 'maestros', ayu: 'ayudante', ayuLabel: 'Ayudante', salas: true, titulo: true },
  discurso_est: { sec: 'maestros', orden: 1, label: 'Discurso', cod: 'discurso_est', salas: true, titulo: true },
  analisis:     { sec: 'maestros', orden: 1, label: '¿Qué dirías?', cod: 'analisis', salas: true, titulo: true },
  vida:         { sec: 'vida',     orden: 1, label: 'Parte', cod: 'vida', titulo: true },
  estudio:      { sec: 'vida',     orden: 2, label: 'Estudio bíblico de la congregación', cod: 'estudio_conductor', ayu: 'estudio_lector', ayuLabel: 'Lector', titulo: true },
  visita_sc:    { sec: 'vida',     orden: 2, label: 'Discurso del superintendente de circuito', fijo: true, titulo: true },
  oracion_fin:  { sec: 'cierre',   orden: 1, label: 'Oración final', cod: 'oracion' },
};
const SEC_ORDEN = Object.fromEntries(SECCIONES.map(([k], i) => [k, i]));
const SUBTIPOS_MAESTROS = ['Empiece conversaciones', 'Haga revisitas', 'Haga discípulos', 'Explique sus creencias'];

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ================= Utilidades ================= */

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDias = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const hoyISO = () => toISO(new Date());
const diasEntre = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000);
function lunesDe(iso) {
  const d = fromISO(iso);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return toISO(d);
}
function fechaLarga(iso) {
  const d = fromISO(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
function fechaCorta(iso) {
  const d = fromISO(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function rangoSemana(lunes) {
  const a = fromISO(lunes), b = fromISO(addDias(lunes, 6));
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} de ${MESES[a.getMonth()]} ${a.getFullYear()}`;
  return `${a.getDate()} ${MESES[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
}
// Texto relativo para una diferencia en días (negativo = pasado)
function relativo(dias) {
  if (dias == null) return 'nunca';
  const sem = Math.round(Math.abs(dias) / 7);
  if (sem === 0) return 'esta semana';
  const t = sem === 1 ? '1 sem' : sem < 9 ? `${sem} sem` : `${Math.round(sem / 4.35)} meses`;
  return dias < 0 ? `hace ${t}` : `en ${t}`;
}

/* ================= Estado ================= */

function estadoVacio() {
  return {
    version: 1,
    config: { congregacion: '', diaReunion: 4, salas: 1, partesMaestros: 3, partesVida: 1, prefijo: '34', minSemanas: 2, horaReunion: '19:00' },
    publicadores: [],
    especiales: [],
    semanas: [],
    sustituciones: [],
    ultimoRespaldo: null,
  };
}
function normalizar(s) {
  const base = estadoVacio();
  return { ...base, ...s, config: { ...base.config, ...(s.config || {}) } };
}
function cargar() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalizar(JSON.parse(raw));
  } catch (e) { console.error(e); }
  return estadoVacio();
}
let state = cargar();
const pilaDeshacer = [];
const instantanea = () => JSON.stringify({ ...state, modificado: undefined });
let ultimaInstantanea = instantanea();
function reiniciarDeshacer() { pilaDeshacer.length = 0; ultimaInstantanea = instantanea(); }
const ui = {
  vista: 'cuadrante',
  lunes: lunesDe(hoyISO()),
  hist: 'resumen',
  filtro: { pub: '', cod: '', desde: '', hasta: '' },
  buscar: '',
  verInactivos: false,
  mesImprimir: hoyISO().slice(0, 7),
  impr: 'programa',
  modo: 'semana',
  mes: hoyISO().slice(0, 7),
  estPeriodo: '6m',
  estProg: false,
  semImprimir: '',
};

function guardarLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { alert('No se pudo guardar: ' + e.message); }
}
function guardar() {
  marcarGuardado();
  const ahora = instantanea();
  if (ahora !== ultimaInstantanea) {
    pilaDeshacer.push(ultimaInstantanea);
    if (pilaDeshacer.length > 40) pilaDeshacer.shift();
    ultimaInstantanea = ahora;
  }
  state.modificado = new Date().toISOString();
  guardarLocal();
  programarSubida();
}
function commit() { guardar(); render(); }

// «✓ Guardado» en la barra superior, para ver que cada cambio queda guardado
let tGuardado = null;
function marcarGuardado() {
  const el = document.getElementById('guardado');
  if (!el) return;
  const h = new Date();
  el.textContent = `✓ Guardado ${pad(h.getHours())}:${pad(h.getMinutes())}`;
  el.classList.add('vivo');
  clearTimeout(tGuardado);
  tGuardado = setTimeout(() => el.classList.remove('vivo'), 1500);
}

function aviso(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('ver');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('ver'), 2600);
}
function deshacer() {
  if (!pilaDeshacer.length) return;
  state = normalizar(JSON.parse(pilaDeshacer.pop()));
  ultimaInstantanea = instantanea();
  state.modificado = new Date().toISOString();
  guardarLocal();
  programarSubida();
  render();
}

const pub = id => state.publicadores.find(p => p.id === id);
const nombre = id => id ? (pub(id)?.nombre ?? '(eliminado)') : '';
const semanaPorLunes = l => state.semanas.find(s => s.lunes === l);
const semanaPorId = id => state.semanas.find(s => s.id === id);
const fechaReunionDeLunes = l => addDias(l, (diaReunionDe(l) + 6) % 7);
const fechaReunion = s => fechaReunionDeLunes(s.lunes);
const publicadoresOrdenados = () => [...state.publicadores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

/* ================= Historial (derivado) ================= */

// Cada asignación hecha o programada, más las que fueron sustituidas.
function entradas() {
  const out = [];
  for (const s of state.semanas) {
    if (s.sinReunion) continue;
    const fecha = fechaReunion(s);
    for (const p of s.partes) {
      const t = TIPOS[p.tipo];
      const base = { fecha, sem: s, tipo: p.tipo, titulo: p.titulo, sala: p.sala, estado: 'asignada' };
      if (p.titular) out.push({ ...base, pub: p.titular, cod: t.cod, rol: 'titular', companero: t.ayu ? p.ayudante : null });
      if (t.ayu && p.ayudante) out.push({ ...base, pub: p.ayudante, cod: t.ayu, rol: 'ayudante', companero: p.titular });
    }
  }
  for (const x of state.sustituciones) {
    const s = semanaPorId(x.semanaId);
    if (!s || !x.original) continue;
    out.push({
      fecha: fechaReunion(s), sem: s, tipo: x.tipo, titulo: x.titulo, sala: x.sala,
      pub: x.original, cod: x.cod, rol: x.rol, estado: 'sustituido', motivo: x.motivo, sustituto: x.sustituto,
    });
  }
  return out;
}
const estadoEntrada = e => e.estado === 'sustituido' ? 'sustituido' : (e.fecha < hoyISO() ? 'realizada' : 'programada');

function ausente(p, fecha) {
  return (p.ausencias || []).some(a => a.desde && a.desde <= fecha && (!a.hasta || a.hasta >= fecha));
}

// Distancia (con signo) a la asignación más cercana a `fecha`
function masCercana(lista, fecha) {
  let best = null;
  for (const e of lista) {
    const d = diasEntre(fecha, e.fecha);
    if (best == null || Math.abs(d) < Math.abs(best)) best = d;
  }
  return best;
}

/* ================= Sugerencias ================= */

function codDe(parte, rol) {
  const t = TIPOS[parte.tipo];
  return rol === 'ayudante' ? t.ayu : t.cod;
}
const familiaDe = p => (p?.familia || '').trim().toLowerCase();
const mismaFamilia = (a, b) => !!(a && b && familiaDe(a) && familiaDe(a) === familiaDe(b));
const esParteEstudiante = (parte, rol) => PARTES_ESTUDIANTE.includes(parte.tipo) || (rol === 'ayudante' && parte.tipo === 'maestros');

/*
 * Puntúa a todos los publicadores activos para un puesto.
 * motivos = impedimentos (no se sugieren); avisos = pegas leves (bajan la puntuación).
 */
function candidatos(sem, parte, rol, ents = entradas()) {
  const cfg = state.config;
  const cod = codDe(parte, rol);
  const fecha = fechaReunion(sem);
  const porPub = new Map();
  for (const e of ents) {
    if (e.estado !== 'asignada' || e.sem.id === sem.id) continue;
    if (!porPub.has(e.pub)) porPub.set(e.pub, []);
    porPub.get(e.pub).push(e);
  }
  const ocupados = new Set();
  for (const p of sem.partes) {
    if (p.id === parte.id) {
      if (rol === 'titular' && p.ayudante) ocupados.add(p.ayudante);
      if (rol === 'ayudante' && p.titular) ocupados.add(p.titular);
      continue;
    }
    if (p.titular) ocupados.add(p.titular);
    if (p.ayudante) ocupados.add(p.ayudante);
  }
  const t = TIPOS[parte.tipo];
  const companero = pub(rol === 'ayudante' ? parte.titular : (t.ayu ? parte.ayudante : null));
  const conSalas = esParteEstudiante(parte, rol) && semTieneAux(sem);

  return state.publicadores.filter(p => p.activo).map(p => {
    const motivos = [], avisos = [];
    if (!(p.asignaciones || []).includes(cod)) motivos.push('no habilitado');
    if (p.soloAyudante && rol === 'titular') motivos.push('solo ayudante');
    if (ocupados.has(p.id)) motivos.push('ya tiene parte esta semana');
    if (ausente(p, fecha)) motivos.push('ausente');
    if (companero && t.ayu === 'ayudante' && companero.sexo !== p.sexo && !mismaFamilia(companero, p)) motivos.push('distinto sexo y no es de su familia');

    const mias = porPub.get(p.id) || [];
    const dMisma = masCercana(mias.filter(e => e.cod === cod), fecha);
    const dCualquiera = masCercana(mias, fecha);
    const ultima = mias.filter(e => e.fecha < fecha).sort((x, y) => y.fecha.localeCompare(x.fecha))[0] || null;
    const carga = mias.filter(e => Math.abs(diasEntre(fecha, e.fecha)) <= 182).length;
    // Base: tiempo sin esta parte y sin ninguna parte (máx. 1 año), menos su carga reciente
    let score = Math.min(Math.abs(dMisma ?? 9999), 365) + 0.6 * Math.min(Math.abs(dCualquiera ?? 9999), 365) - 8 * carga;

    const minSem = p.minSemanas ?? cfg.minSemanas ?? 2;
    if (dCualquiera != null && Math.abs(dCualquiera) < minSem * 7) {
      score -= 250;
      avisos.push(`otra parte ${relativo(dCualquiera)}`);
    }
    if (conSalas && p.sala && p.sala !== 'ambas' && p.sala !== parte.sala) {
      score -= 300;
      avisos.push(p.sala === 'A' ? 'prefiere sala principal' : 'prefiere sala auxiliar');
    }
    if (conSalas) {
      // Alterna de sala: si su última parte de estudiante fue en esta misma sala, baja un poco
      const ult = mias.filter(e => PARTES_ESTUDIANTE.includes(e.tipo) && e.fecha < fecha).sort((x, y) => y.fecha.localeCompare(x.fecha))[0];
      if (ult && ult.sala === parte.sala) score -= 20;
    }
    if (companero) {
      const dPar = masCercana(mias.filter(e => e.companero === companero.id), fecha);
      if (dPar != null && Math.abs(dPar) < 120) { score -= 60; avisos.push(`ya fueron pareja ${relativo(dPar)}`); }
    }
    return { p, motivos, avisos, dMisma, dCualquiera, carga, score, ultima, fechaRef: fecha, azar: sorteo(p.id + sem.lunes + parte.tipo + rol) };
  }).sort((a, b) => b.score - a.score || a.azar - b.azar);
}

// Desempate variado pero estable: el mismo puesto da siempre el mismo orden
function sorteo(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function infoCandidato(c) {
  const misma = c.dMisma == null ? 'nunca esta parte' : `esta parte ${relativo(c.dMisma)}`;
  return `${misma} · ${c.carga} en 6 meses`;
}

function opcionesSelect(sem, parte, rol, ents) {
  const actual = parte[rol];
  const lista = candidatos(sem, parte, rol, ents);
  const aptos = lista.filter(c => !c.motivos.length);
  const otros = lista.filter(c => c.motivos.length);
  const op = c => {
    const extra = c.motivos.length ? ` — ${c.motivos.join(', ')}` : c.avisos.length ? ` ⚠ ${c.avisos.join(', ')}` : '';
    return `<option value="${c.p.id}" ${c.p.id === actual ? 'selected' : ''}>${esc(c.p.nombre)} (${infoCandidato(c)})${esc(extra)}</option>`;
  };
  let html = `<option value="">— Sin asignar —</option>`;
  if (aptos.length) html += `<optgroup label="Sugeridos">${aptos.slice(0, 5).map(op).join('')}</optgroup>`;
  if (aptos.length > 5) html += `<optgroup label="Otros aptos">${aptos.slice(5).map(op).join('')}</optgroup>`;
  if (otros.length) html += `<optgroup label="No recomendados">${otros.map(op).join('')}</optgroup>`;
  if (actual && !lista.some(c => c.p.id === actual)) html += `<option value="${actual}" selected>${esc(nombre(actual))} (inactivo)</option>`;
  return html;
}

// Pide confirmación si se elige a alguien con impedimentos
function confirmarNoApto(sem, parte, rol, id) {
  if (!id) return true;
  const c = candidatos(sem, parte, rol).find(c => c.p.id === id);
  if (!c || !c.motivos.length) return true;
  return confirm(`${c.p.nombre}: ${c.motivos.join(', ')}.\n\n¿Asignar igualmente?`);
}

// Rellena los puestos libres empezando por los que tienen menos candidatos posibles
function sugerirVacios(sem) {
  let n = 0;
  for (;;) {
    const ents = entradas();
    let mejor = null;
    for (const parte of sem.partes) {
      for (const rol of ['titular', 'ayudante']) {
        if (TIPOS[parte.tipo].fijo || parte[rol] || (rol === 'ayudante' && (!TIPOS[parte.tipo].ayu || !parte.titular))) continue;
        const aptos = candidatos(sem, parte, rol, ents).filter(c => !c.motivos.length);
        if (aptos.length && (!mejor || aptos.length < mejor.k)) mejor = { parte, rol, c: aptos[0], k: aptos.length };
      }
    }
    if (!mejor) break;
    mejor.parte[mejor.rol] = mejor.c.p.id;
    n++;
  }
  return n;
}

function abrirCandidatos(sem, parte, rol) {
  const t = TIPOS[parte.tipo];
  const lista = candidatos(sem, parte, rol);
  const fila = (c, i) => `<tr class="${c.motivos.length ? 'inactivo' : ''}">
    <td class="num small muted">${c.motivos.length ? '' : i + 1}</td>
    <td><b>${esc(c.p.nombre)}</b>${c.p.familia ? ` <span class="small muted">fam. ${esc(c.p.familia)}</span>` : ''}</td>
    <td class="small">${c.dMisma == null ? '<span class="badge ok">nunca</span>' : relativo(c.dMisma)}</td>
    <td class="small">${relativo(c.dCualquiera)}</td>
    <td class="num">${c.carga}</td>
    <td class="small">${c.motivos.map(m => `<span class="badge danger">${esc(m)}</span>`).join(' ')} ${c.avisos.map(m => `<span class="badge warn">${esc(m)}</span>`).join(' ')}</td>
    <td><button class="small ${i === 0 && !c.motivos.length ? 'primary' : ''}" data-dlg="elegir" data-id="${c.p.id}">Elegir</button></td></tr>`;
  const aptos = lista.filter(c => !c.motivos.length), otros = lista.filter(c => c.motivos.length);
  abrirDialogo(`
    <h2>Candidatos</h2>
    <p style="margin-top:0"><b>${t.label}</b>${parte.titulo ? ' — ' + esc(parte.titulo) : ''}${rol === 'ayudante' ? ` (${t.ayuLabel.toLowerCase()})` : ''}${semTieneAux(sem) && t.salas ? ` · ${parte.sala === 'B' ? 'sala auxiliar' : 'sala principal'}` : ''}<br>
      <span class="small muted">${fechaLarga(fechaReunion(sem))}. Orden: más tiempo sin esta parte y sin intervenir, menos carga en los últimos 6 meses.</span></p>
    <div class="tabla-wrap"><table>
      <thead><tr><th></th><th>Publicador</th><th>Esta parte</th><th>Última</th><th class="num">6 m</th><th>Observaciones</th><th></th></tr></thead>
      <tbody>${aptos.map(fila).join('')}${otros.map(fila).join('')}</tbody></table></div>
    <div class="dlg-foot"><span></span><button data-dlg="cerrar">Cerrar</button></div>`, () => { });
  dlgHandler = (accion, el) => {
    if (accion === 'cerrar') return cerrarDialogo();
    if (accion !== 'elegir') return;
    const id = el.dataset.id;
    if (!confirmarNoApto(sem, parte, rol, id)) return;
    if (sem.estado === 'publicada' && parte[rol]) { cerrarDialogo(); return abrirSustitucion(sem, parte, rol, id); }
    parte[rol] = id;
    marcarAvisado(parte, rol, null);
    cerrarDialogo(); commit();
  };
}

const semanasDesde = (lunes, n) => state.semanas.filter(s => s.lunes >= lunes && s.lunes < addDias(lunes, 7 * n));
const huecos = sem => sem.sinReunion ? 0 : sem.partes.reduce((n, p) => n + (TIPOS[p.tipo].fijo ? 0 : (p.titular ? 0 : 1) + (TIPOS[p.tipo].ayu && !p.ayudante ? 1 : 0)), 0);

function abrirRellenar() {
  const desde = ui.lunes;
  let n = 4;
  const pintar = () => {
    const sems = semanasDesde(desde, n);
    $('#dlg-body').innerHTML = `
      <h2>Rellenar varias semanas</h2>
      <p class="small muted" style="margin-top:0">Rellena los puestos libres de las semanas en borrador, por orden, repartiendo las partes entre todos. Las semanas publicadas no se tocan.</p>
      <label class="row">Semanas a partir de la actual <input type="number" id="r-n" min="1" max="12" value="${n}" style="width:70px"></label>
      <ul class="small">${sems.map(s => `<li>${rangoSemana(s.lunes)} — ${s.estado === 'publicada' ? 'publicada (no se toca)' : s.sinReunion ? 'sin reunión' : `${huecos(s)} puestos libres`}</li>`).join('') || '<li>No hay semanas creadas en ese periodo.</li>'}</ul>
      <div class="dlg-foot"><span></span><span class="row"><button data-dlg="cerrar">Cancelar</button><button class="primary" data-dlg="ok">✨ Rellenar</button></span></div>`;
  };
  pintar();
  $('#dlg-body').onchange = e => { if (e.target.id === 'r-n') { n = Math.max(1, Math.min(12, Number(e.target.value) || 1)); pintar(); } };
  dlgHandler = accion => {
    if (accion === 'cerrar') return cerrarDialogo();
    if (accion !== 'ok') return;
    let total = 0;
    for (const s of semanasDesde(desde, n)) if (s.estado !== 'publicada' && !s.sinReunion) total += sugerirVacios(s);
    cerrarDialogo(); commit();
    alert(total ? `Se han rellenado ${total} puestos.` : 'No se ha podido rellenar ningún puesto (no hay candidatos aptos).');
  };
  $('#dlg').showModal();
}

/* ================= Problemas de una semana ================= */

function problemasSemana(sem) {
  const out = [];
  if (sem.sinReunion) return out;
  const fecha = fechaReunion(sem);
  const cuenta = new Map();
  for (const p of sem.partes) {
    const t = TIPOS[p.tipo];
    for (const rol of ['titular', 'ayudante']) {
      if (rol === 'ayudante' && !t.ayu) continue;
      const id = p[rol];
      if (!id) continue;
      const x = pub(id);
      const que = `${t.label}${rol === 'ayudante' ? ` (${t.ayuLabel.toLowerCase()})` : ''}`;
      if (!x) { out.push(`${que}: el publicador asignado ya no existe`); continue; }
      if (!x.activo) out.push(`${x.nombre} está marcado como inactivo — ${que}`);
      if (ausente(x, fecha)) out.push(`${x.nombre} estará ausente ese día — ${que}`);
      if (!(x.asignaciones || []).includes(codDe(p, rol))) out.push(`${x.nombre} no está habilitado para esta parte — ${que}`);
      cuenta.set(id, (cuenta.get(id) || 0) + 1);
    }
    if (t.ayu === 'ayudante' && p.titular && p.ayudante) {
      const a = pub(p.titular), b = pub(p.ayudante);
      if (a && b && a.sexo !== b.sexo && !mismaFamilia(a, b)) out.push(`${a.nombre} y ${b.nombre} son de distinto sexo y no constan como familia`);
    }
  }
  for (const [id, n] of cuenta) if (n > 1) out.push(`${nombre(id)} tiene ${n} asignaciones esta semana`);
  return out;
}

/* ================= Semanas ================= */

function nuevaParte(tipo, sala = 'A', titulo = '') {
  return { id: uid(), tipo, sala, titulo, titular: null, ayudante: null };
}
function ordenarPartes(sem) {
  sem.partes.sort((a, b) => {
    const ta = TIPOS[a.tipo], tb = TIPOS[b.tipo];
    return SEC_ORDEN[ta.sec] - SEC_ORDEN[tb.sec] || ta.orden - tb.orden;
  });
}
const partesOrdenadas = sem => { ordenarPartes(sem); return sem.partes; };
const semTieneAux = sem => sem.partes.some(p => p.sala === 'B');

// La misma parte en la otra sala (misma posición entre las de su tipo)
function gemela(sem, parte) {
  if (!TIPOS[parte.tipo].salas) return null;
  const misma = sem.partes.filter(p => p.tipo === parte.tipo && p.sala === parte.sala);
  const otra = sem.partes.filter(p => p.tipo === parte.tipo && p.sala !== parte.sala);
  return otra[misma.indexOf(parte)] || null;
}

function ponerSalaAux(sem, activar) {
  if (activar) {
    for (const p of [...sem.partes]) {
      if (TIPOS[p.tipo].salas && p.sala === 'A' && !gemela(sem, p)) {
        sem.partes.push({ ...nuevaParte(p.tipo, 'B', p.titulo), num: p.num, min: p.min, leccion: p.leccion });
      }
    }
    if (!sem.partes.some(p => p.tipo === 'consejero_b')) sem.partes.push(nuevaParte('consejero_b', 'B'));
  } else sem.partes = sem.partes.filter(p => p.sala !== 'B');
}

// ¿Lleva sala auxiliar una semana nueva? Sí si está en Ajustes o si la semana anterior la tenía
function semanaAnteriorNormal(lunes) {
  return [...state.semanas]
    .filter(s => s.lunes < lunes && !s.sinReunion && !s.partes.some(p => p.tipo === 'visita_sc'))
    .sort((a, b) => b.lunes.localeCompare(a.lunes))[0] || null;
}
function quiereAux(lunes) {
  if (especialDe(lunes)?.tipo === 'visita') return false;
  if (state.config.salas == 2) return true;
  const prev = lunes && semanaAnteriorNormal(lunes);
  return !!(prev && semTieneAux(prev));
}
// Semanas futuras con reunión normal que aún no tienen la sala auxiliar
const semanasSinAux = () => state.semanas.filter(s => s.lunes >= lunesDe(hoyISO()) && !s.sinReunion && !semTieneAux(s) && !s.partes.some(p => p.tipo === 'visita_sc'));

function plantilla(lunes) {
  const c = state.config, P = [];
  const aux = quiereAux(lunes);
  const conSalas = (tipo, titulo = '') => {
    P.push(nuevaParte(tipo, 'A', titulo));
    if (aux) P.push(nuevaParte(tipo, 'B', titulo));
  };
  P.push(nuevaParte('presidente'));
  if (aux) P.push(nuevaParte('consejero_b', 'B'));
  P.push(nuevaParte('oracion_ini'));
  P.push(nuevaParte('tesoros'));
  P.push(nuevaParte('perlas'));
  conSalas('lectura');
  for (let i = 0; i < c.partesMaestros; i++) conSalas('maestros', SUBTIPOS_MAESTROS[i] || '');
  for (let i = 0; i < c.partesVida; i++) P.push(nuevaParte('vida'));
  P.push(nuevaParte('estudio'));
  P.push(nuevaParte('oracion_fin'));
  return P;
}

function crearSemana(lunes, modo) {
  let partes;
  if (modo === 'copiar') {
    const prev = [...state.semanas].filter(s => s.lunes < lunes && !s.sinReunion).sort((a, b) => b.lunes.localeCompare(a.lunes))[0];
    partes = prev ? prev.partes.map(p => nuevaParte(p.tipo, p.sala, ['maestros', 'discurso_est'].includes(p.tipo) ? p.titulo : '')) : plantilla(lunes);
  } else partes = plantilla(lunes);
  const sem = { id: uid(), lunes, lecturaSemanal: '', estado: 'borrador', sinReunion: false, motivoSinReunion: '', partes };
  aplicarEspecial(sem);
  state.semanas.push(sem);
  state.semanas.sort((a, b) => a.lunes.localeCompare(b.lunes));
  return sem;
}

/* ================= Render general ================= */

function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.vista === ui.vista));
  $('#congregacion').textContent = state.config.congregacion ? '· ' + state.config.congregacion : '';
  renderAviso();
  pintarSync();
  const main = $('#main');
  const vistas = { cuadrante: vistaCuadrante, publicadores: vistaPublicadores, historial: vistaHistorial, estadisticas: vistaEstadisticas, imprimir: vistaImprimir, ajustes: vistaAjustes };
  const bd = $('#deshacer');
  bd.hidden = !pilaDeshacer.length;
  main.innerHTML = vistas[ui.vista]();
  ajustarPapel();
  anotarRuta();
}

// En pantallas estrechas la vista previa se reduce entera, como una hoja de papel
function ajustarPapel() {
  document.querySelectorAll('.papel').forEach(el => {
    const ancho = el.parentElement.clientWidth;
    const z = Math.min(1, ancho / 794);
    el.style.zoom = z < 1 ? z.toFixed(3) : '';
  });
}
window.addEventListener('resize', ajustarPapel);

function renderAviso() {
  const el = $('#aviso');
  if (DEMO) {
    el.hidden = false;
    el.innerHTML = `<b>Modo demostración:</b> datos inventados que no se guardan en Drive ni se mezclan con los tuyos. <a href="./">Volver a mi cuadrante</a>`;
    return;
  }
  const hayDatos = state.publicadores.length || state.semanas.length;
  const dias = state.ultimoRespaldo ? diasEntre(state.ultimoRespaldo.slice(0, 10), hoyISO()) : null;
  if (hayDatos && !drive.conectado && (dias == null || dias > 14)) {
    el.hidden = false;
    el.innerHTML = `Los datos solo están guardados en este navegador. ${dias == null ? 'Aún no has hecho' : `Hace ${dias} días de tu última`} copia de seguridad — <a href="#" data-act="ir-ajustes">descárgala en Ajustes</a>.`;
  } else el.hidden = true;
}

/* ================= Vista: Cuadrante ================= */

function vistaCuadrante() {
  if (ui.modo === 'mes') return navMes() + tiraProximas() + vistaMes();
  const sem = semanaPorLunes(ui.lunes);
  const existentes = state.semanas.map(s =>
    `<option value="${s.lunes}" ${s.lunes === ui.lunes ? 'selected' : ''}>${rangoSemana(s.lunes)}${s.estado === 'publicada' ? ' ✓' : ''}${s.sinReunion ? ' (sin reunión)' : ''}</option>`).join('');
  let html = `
  <div class="semnav">
    <button data-act="sem-prev" title="Semana anterior">◀</button>
    <div class="rango">${rangoSemana(ui.lunes)}</div>
    <button data-act="sem-next" title="Semana siguiente">▶</button>
    <button data-act="sem-hoy">Hoy</button>
    <input type="date" data-act="sem-fecha" value="${ui.lunes}" title="Ir a fecha">
    ${state.semanas.length ? `<select data-act="sem-ir"><option value="">Semanas creadas…</option>${existentes}</select>` : ''}
    <span class="grow"></span>
    ${selectorModo()}
  </div>
  <div class="row acciones-sem">
    <button data-act="importar-guia">📥 Importar de jw.org</button>
    <button data-act="rellenar">✨ Rellenar varias semanas</button>
  </div>
  ${tiraProximas()}`;

  if (!state.publicadores.length) {
    html += `<div class="card"><b>Primero añade publicadores</b> en la pestaña <a href="#" data-act="ir-publicadores">Publicadores</a> para poder asignar partes.</div>`;
  }

  if (!sem) {
    const hayPrev = state.semanas.some(s => s.lunes < ui.lunes && !s.sinReunion);
    html += `<div class="card empty">
      <p>No hay programa para esta semana.</p>
      <div class="row" style="justify-content:center">
        <button class="primary" data-act="importar-guia">📥 Importar de la Guía (jw.org)</button>
        <button data-act="crear-sem" data-modo="plantilla">Crear con plantilla</button>
        ${hayPrev ? `<button data-act="crear-sem" data-modo="copiar">Copiar estructura de la semana anterior</button>` : ''}
      </div>
      <div class="row" style="justify-content:center;margin-top:12px">${selectorEspecial(ui.lunes)}</div>
      <p class="small">Plantilla: ${state.config.partesMaestros} partes de «Seamos mejores maestros», ${state.config.partesVida} de «Nuestra vida cristiana»${state.config.salas == 2 ? ', con sala auxiliar' : ''} (cámbialo en Ajustes). La sala auxiliar también se puede activar en cada semana.</p>
    </div>`;
    return html;
  }

  const publicada = sem.estado === 'publicada';
  const ents = entradas();
  const problemas = problemasSemana(sem);

  html += tarjetaPasos(sem, problemas);
  if (sem.sinReunion) return html + opcionesSemana(sem, publicada);
  if (publicada) html += tarjetaAvisos(sem);

  html += `<div class="card partes-card"><datalist id="dl-maestros">${SUBTIPOS_MAESTROS.map(s => `<option value="${s}">`).join('')}<option value="Discurso"></datalist>`;
  for (const [sec, secLabel] of SECCIONES) {
    const partes = partesOrdenadas(sem).filter(p => TIPOS[p.tipo].sec === sec);
    const add = publicada ? '' : {
      maestros: `<span class="row"><button class="small" data-act="add-parte" data-tipo="maestros">+ Demostración</button><button class="small" data-act="add-parte" data-tipo="discurso_est">+ Discurso</button></span>`,
      vida: `<button class="small" data-act="add-parte" data-tipo="vida">+ Parte</button>`,
    }[sec] || '';
    html += `<div class="sec-head sec-${sec}"><span>${secLabel}</span>${add}</div>`;
    // Las partes de la sala auxiliar con gemela se dibujan junto a la principal
    const visibles = partes.filter(p => !(p.sala === 'B' && TIPOS[p.tipo].salas && gemela(sem, p)));
    html += visibles.map(p => filaParte(sem, p, publicada, ents)).join('') || `<p class="muted small">Sin partes.</p>`;
  }
  html += `</div>`;
  html += opcionesSemana(sem, publicada);

  const subs = state.sustituciones.filter(x => x.semanaId === sem.id);
  if (subs.length) {
    html += `<div class="card"><h3>Sustituciones de esta semana</h3>${tablaSustituciones(subs)}</div>`;
  }
  return html;
}

// Los cuatro pasos de cada semana y el botón con lo siguiente que hay que hacer
function tarjetaPasos(sem, problemas) {
  const publicada = sem.estado === 'publicada';
  const fecha = `${fechaLarga(fechaReunion(sem))}`;
  if (sem.sinReunion) {
    return `<div class="card pasos-card"><div class="pasos-fecha">${fecha}</div>
      <p class="pasos-txt"><b>Sin reunión esta semana</b>${sem.motivoSinReunion ? ' · ' + esc(sem.motivoSinReunion) : ''}.</p></div>`;
  }
  const h = huecos(sem);
  const lista = asignacionesDe(sem);
  const pendientes = lista.filter(a => !a.parte.avisos?.[a.rol]).length;
  const desdeGuia = sem.partes.some(p => p.num);
  const estado = (hecho, actual) => hecho ? 'hecho' : actual ? 'actual' : '';
  const pasos = [
    ['Programa', desdeGuia ? 'de jw.org' : 'plantilla', 'hecho'],
    ['Asignar', h ? `${h} ${h === 1 ? 'libre' : 'libres'}` : 'completo', estado(!h, !publicada && h)],
    ['Publicar', publicada ? 'publicada' : 'borrador', estado(publicada, !publicada && !h)],
    ['Avisar', publicada ? (pendientes ? `${pendientes} pendientes` : 'todos') : `${lista.length} personas`, estado(publicada && !pendientes, publicada && pendientes)],
  ];
  let accion, ayuda;
  if (!publicada && h) {
    accion = `<button class="primary grande" data-act="sugerir-vacios">✨ Rellenar ${h === 1 ? 'el hueco' : `los ${h} huecos`} con sugerencias</button>`;
    ayuda = 'Propone a quien más tiempo lleva sin esa parte. Después toca cualquier nombre para cambiarlo.';
  } else if (!publicada) {
    accion = `<button class="primary grande" data-act="publicar">✓ Publicar la semana</button>`;
    ayuda = problemas.length ? 'Revisa antes los avisos en rojo.' : 'Al publicarla podrás avisar a cada uno. Los cambios posteriores se guardan como sustituciones.';
  } else if (pendientes) {
    accion = `<button class="primary grande" data-act="ir-avisos">📲 Avisar a ${pendientes === 1 ? '1 persona' : `${pendientes} personas`}</button>`;
    ayuda = 'Cada aviso abre WhatsApp con el mensaje ya escrito.';
  } else {
    accion = `<button class="grande" data-act="ir-s89">🖨 Imprimir las hojas S-89 de esta semana</button>`;
    ayuda = '¡Semana lista! Todos están avisados.';
  }
  return `<div class="card pasos-card">
    <div class="pasos-fecha">${fecha}</div>
    <ol class="pasos">${pasos.map(([t, sub, st], i) => `<li class="${st}"><span class="paso-n">${st === 'hecho' ? '✓' : i + 1}</span><span><b>${t}</b><small>${sub}</small></span></li>`).join('')}</ol>
    <div class="pasos-accion">${accion}<p class="small muted">${ayuda}</p></div>
    ${problemas.length ? `<div class="problemas">${problemas.map(x => `<div>⚠ ${esc(x)}</div>`).join('')}</div>` : ''}
  </div>`;
}

// Lo que se toca poco va plegado
function opcionesSemana(sem, publicada) {
  return `<div class="card opciones ${ui.opcionesAbiertas ? 'abierta' : ''}">
    <button class="opciones-tit" data-act="toggle-opciones">⚙ Más opciones de esta semana <span>${ui.opcionesAbiertas ? '▲' : '▼'}</span></button>
    ${ui.opcionesAbiertas ? `<div class="opciones-cuerpo">
      <div class="form-grid">
        <label class="field full"><span>Lectura bíblica semanal</span><input data-act="lectura-semanal" value="${esc(sem.lecturaSemanal)}" placeholder="p. ej. ISAÍAS 58, 59"></label>
        ${sem.sinReunion ? '' : `<div class="field"><span>Canciones (inicio · medio · final)</span><div class="row canciones">
          ${[0, 1, 2].map(i => `<input data-act="cancion" data-i="${i}" inputmode="numeric" value="${esc((sem.canciones || [])[i] || '')}" placeholder="${['Inicio', 'Medio', 'Final'][i]}">`).join('')}</div></div>`}
        <div class="field">${selectorEspecial(sem.lunes)}</div>
      </div>
      <div class="row" style="margin-top:12px;gap:18px">
        ${sem.sinReunion ? '' : `<label class="row"><input type="checkbox" data-act="sala-aux" ${semTieneAux(sem) ? 'checked' : ''} ${publicada ? 'disabled' : ''}> Sala auxiliar</label>`}
        <label class="row"><input type="checkbox" data-act="sin-reunion" ${sem.sinReunion ? 'checked' : ''}> Sin reunión</label>
      </div>
      ${sem.sinReunion ? `<label class="field" style="margin-top:10px"><span>Motivo</span><input data-act="motivo-sin" value="${esc(sem.motivoSinReunion)}" placeholder="Asamblea, Conmemoración…"></label>` : ''}
      <div class="row" style="margin-top:14px">
        ${!sem.sinReunion && !publicada ? `<button data-act="sugerir-vacios">✨ Sugerir vacíos</button><button data-act="vaciar">Vaciar asignaciones</button>` : ''}
        ${publicada ? `<button data-act="despublicar">Volver a borrador</button>` : (!sem.sinReunion ? `<button data-act="publicar">Publicar</button>` : '')}
        <button class="danger" data-act="borrar-sem">Eliminar semana</button>
      </div>
    </div>` : ''}
  </div>`;
}

function filaParte(sem, p, publicada, ents) {
  const t = TIPOS[p.tipo];
  const gem = p.sala === 'A' ? gemela(sem, p) : null;
  const salaBadge = p.sala === 'B' ? ` <span class="badge warn">Sala aux.</span>` : '';
  const borrable = ['maestros', 'discurso_est', 'analisis', 'vida'].includes(p.tipo);
  const titulo = t.titulo
    ? `<input class="titulo" data-act="titulo" data-parte="${p.id}" value="${esc(p.titulo)}" placeholder="Tema / referencia" ${p.tipo === 'maestros' ? 'list="dl-maestros"' : ''}>`
    : '';
  const bloque = x => {
    const slots = [slot(sem, x, 'titular', t.ayu ? (p.tipo === 'estudio' ? 'Conductor' : 'Titular') : '', publicada, ents)];
    if (t.ayu) slots.push(slot(sem, x, 'ayudante', t.ayuLabel, publicada, ents));
    return slots.join('');
  };
  const cuerpo = t.fijo ? `<div class="slot-btn fijo">Lo presenta el superintendente de circuito</div>` : gem
    ? `<div class="sala-blk"><span class="sala-tag">Sala principal</span>${bloque(p)}</div><div class="sala-blk aux"><span class="sala-tag">Sala auxiliar</span>${bloque(gem)}</div>`
    : bloque(p);
  return `<div class="parte">
    <div class="p-cab">
      <div class="p-tipo">${p.num ? `<span class="muted">${p.num}.</span> ` : ''}${t.label}${salaBadge}
        ${p.min || p.leccion ? `<span class="small muted p-meta">${[p.min ? p.min + ' min' : '', p.leccion ? 'lección ' + esc(p.leccion.replace(/^lecci[óo]n /, '')) : ''].filter(Boolean).join(' · ')}</span>` : ''}</div>
      ${borrable && !publicada ? `<button class="icon small danger" data-act="del-parte" data-parte="${p.id}" title="Quitar parte">✕</button>` : ''}
    </div>
    ${titulo}
    <div class="p-slots">${cuerpo}</div>
  </div>`;
}

// Cada puesto es un botón: muestra a la persona y al tocarlo se elige o se cambia
function slot(sem, p, rol, label, publicada, ents) {
  const id = p[rol];
  let hace = '';
  if (id && ents) {
    const cod = codDe(p, rol), f = fechaReunion(sem);
    const prev = ents.filter(e => e.estado === 'asignada' && e.pub === id && e.cod === cod && e.fecha < f).map(e => e.fecha).sort().pop();
    hace = prev ? `esta parte hacía ${relativo(diasEntre(f, prev)).replace('hace ', '')}` : 'primera vez en esta parte';
  }
  const x = id ? pub(id) : null;
  const av = p.avisos?.[rol];
  const mal = id && (!x || !x.activo || ausente(x, fechaReunion(sem)) || !(x.asignaciones || []).includes(codDe(p, rol)));
  return `<button class="slot-btn ${id ? '' : 'vacio'} ${mal ? 'mal' : ''}" data-act="elegir" data-parte="${p.id}" data-rol="${rol}">
    ${label ? `<span class="slot-rol">${label}</span>` : ''}
    <span class="slot-nombre">${id ? esc(nombre(id)) : 'Elegir…'}${hace ? `<small>${hace}</small>` : ''}</span>
    ${mal ? '<span class="slot-est mal">⚠</span>' : publicada && id ? `<span class="slot-est ${av ? 'ok' : ''}">${av ? '✓ avisado' : 'sin avisar'}</span>` : ''}
    <span class="slot-chev">›</span>
  </button>`;
}

/* ================= Selector de persona ================= */

// Semanas sin esta parte, con color: verde = hace mucho, rojo = muy reciente
function medidor(d, clase = '') {
  if (d == null) return `<span class="medidor m-nunca ${clase}"><b>Nunca</b><small>esta parte</small></span>`;
  const sem = Math.round(Math.abs(d) / 7);
  const nivel = d > 0 ? 'm-prox' : sem >= 12 ? 'm-mucho' : sem >= 6 ? 'm-bien' : sem >= 3 ? 'm-poco' : 'm-reciente';
  const num = sem >= 9 ? `${Math.round(sem / 4.35)}` : `${sem}`;
  const ud = sem >= 9 ? (Math.round(sem / 4.35) === 1 ? 'mes' : 'meses') : (sem === 1 ? 'sem' : 'sem');
  return `<span class="medidor ${nivel} ${clase}"><b>${d > 0 ? 'en ' : ''}${num} ${ud}</b><small>${d > 0 ? 'la tiene' : 'sin esta parte'}</small></span>`;
}

function ultimaParte(c) {
  if (!c.ultima) return 'Aún no ha tenido ninguna parte';
  const t = TIPOS[c.ultima.tipo];
  const d = fromISO(c.ultima.fecha);
  const antes = relativo(diasEntre(c.fechaRef, c.ultima.fecha)).replace('hace ', '');
  return `Última: ${t?.label ?? ''}${c.ultima.rol === 'ayudante' ? ` (${t.ayuLabel.toLowerCase()})` : ''} · ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} (${antes} antes)`;
}

function barraCarga(n, max) {
  return `<span class="carga" title="${n} partes en los últimos 6 meses"><span class="carga-t"><span style="width:${max ? Math.max(4, n / max * 100) : 0}%"></span></span>${n} en 6 meses</span>`;
}

function razones(c) {
  const r = [];
  if (c.dMisma == null) r.push('nunca ha tenido esta parte');
  else r.push(c.dMisma < 0 ? `hizo esta parte ${relativo(c.dMisma)}` : `tiene esta parte ${relativo(c.dMisma)}`);
  const yaAvisado = c.avisos.some(a => a.startsWith('otra parte'));
  if (c.dCualquiera != null && c.dCualquiera !== c.dMisma && !yaAvisado) r.push(c.dCualquiera < 0 ? `su última parte fue ${relativo(c.dCualquiera)}` : `tiene otra parte ${relativo(c.dCualquiera)}`);
  r.push(`${c.carga} ${c.carga === 1 ? 'parte' : 'partes'} en 6 meses`);
  const txt = r.join(' · ');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function registrarSustitucion(sem, parte, rol, nuevo, motivo) {
  state.sustituciones.push({
    id: uid(), registrado: new Date().toISOString(), semanaId: sem.id, parteId: parte.id,
    tipo: parte.tipo, titulo: parte.titulo, sala: parte.sala, rol, cod: codDe(parte, rol),
    original: parte[rol], sustituto: nuevo, motivo,
  });
  parte[rol] = nuevo;
  marcarAvisado(parte, rol, null);
}

function abrirSelector(sem, parte, rol) {
  const t = TIPOS[parte.tipo];
  const actual = parte[rol];
  const sustituye = sem.estado === 'publicada' && !!actual;
  const lista = candidatos(sem, { ...parte, [rol]: null }, rol).filter(c => c.p.id !== actual);
  const aptos = lista.filter(c => !c.motivos.length);
  const top = aptos.slice(0, 3);
  const resto = aptos.slice(3);
  const noAptos = lista.filter(c => c.motivos.length);
  let q = '', motivo = '', verNoAptos = false;

  const maxCarga = Math.max(1, ...lista.map(c => c.carga));
  const fila = c => `<button class="sel-fila ${c.motivos.length ? 'no' : ''}" data-dlg="elegir" data-id="${c.p.id}">
    ${medidor(c.dMisma, 'peq')}
    <span class="sel-fila-txt"><b>${esc(c.p.nombre)}</b>
      <small>${c.motivos.length ? esc(c.motivos.join(', ')) : esc(ultimaParte(c))}</small>
      ${c.avisos.length && !c.motivos.length ? `<small class="sel-aviso">⚠ ${esc(c.avisos.join(', '))}</small>` : ''}</span>
    ${c.motivos.length ? '' : barraCarga(c.carga, maxCarga)}</button>`;
  const pintarLista = () => {
    const nq = sinAcentos(q.trim());
    if (nq) {
      const vis = lista.filter(c => sinAcentos(c.p.nombre).includes(nq));
      return vis.length ? vis.map(fila).join('') : `<p class="muted small" style="padding:8px">Nadie coincide.</p>`;
    }
    return (resto.length ? resto.map(fila).join('') : `<p class="muted small" style="padding:4px 8px">No hay más personas aptas.</p>`) +
      (noAptos.length ? (verNoAptos ? `<div class="sel-sec">No recomendados</div>${noAptos.map(fila).join('')}`
        : `<button class="small" style="margin-top:6px" data-dlg="ver-no">Ver también ${noAptos.length} no recomendados</button>`) : '');
  };
  const pintar = () => {
    const sub = [parte.titulo, fechaLarga(fechaReunion(sem)), semTieneAux(sem) && (t.salas || parte.tipo === 'consejero_b') ? (parte.sala === 'B' ? 'sala auxiliar' : 'sala principal') : ''].filter(Boolean);
    $('#dlg-body').innerHTML = `
      <div class="sel-cab">
        <div><div class="sel-tit">${t.label}${rol === 'ayudante' ? ` · ${t.ayuLabel}` : t.ayu ? (parte.tipo === 'estudio' ? ' · Conductor' : ' · Titular') : ''}</div>
          <div class="small muted">${esc(sub.join(' · '))}</div></div>
        <button class="icon" data-dlg="cerrar" title="Cerrar">✕</button>
      </div>
      ${actual ? `<div class="sel-actual"><span>Ahora: <b>${esc(nombre(actual))}</b></span>${sustituye ? '' : '<button class="small danger" data-dlg="quitar">Quitar</button>'}</div>` : ''}
      ${sustituye ? `<div class="sel-motivo"><span class="small muted">La semana está publicada: el cambio quedará como <b>sustitución</b>. ¿Por qué?</span>
        <div class="chips-sel">${['Enfermedad', 'Viaje', 'Trabajo', 'Asuntos familiares', 'No contestó'].map(m => `<button class="chip ${motivo === m ? 'on' : ''}" data-dlg="motivo" data-m="${m}">${m}</button>`).join('')}</div>
        <input id="sel-motivo" placeholder="Otro motivo (opcional)" value="${esc(['Enfermedad', 'Viaje', 'Trabajo', 'Asuntos familiares', 'No contestó'].includes(motivo) ? '' : motivo)}"></div>` : ''}
      <div class="sel-sec">Recomendados</div>
      ${top.length ? `<div class="recos">${top.map((c, i) => `<button class="reco ${i === 0 ? 'mejor' : ''}" data-dlg="elegir" data-id="${c.p.id}">
          ${i === 0 ? '<span class="reco-tag">★ Mejor opción</span>' : ''}
          <div class="reco-top">${medidor(c.dMisma)}<b>${esc(c.p.nombre)}</b></div>
          <span class="reco-ult">${esc(ultimaParte(c))}</span>
          ${barraCarga(c.carga, maxCarga)}
          ${c.avisos.length ? `<span class="sel-aviso">⚠ ${esc(c.avisos.join(', '))}</span>` : ''}</button>`).join('')}</div>`
        : `<p class="muted small">No hay nadie apto para este puesto: revisa en Publicadores quién tiene marcada esta asignación.</p>`}
      <div class="sel-sec">Otras personas</div>
      <input type="search" id="sel-buscar" placeholder="Buscar por nombre…" value="${esc(q)}" autocomplete="off">
      <div id="sel-lista" class="sel-lista">${pintarLista()}</div>`;
  };

  dlgHandler = (accion, el) => {
    if (accion === 'cerrar') return cerrarDialogo();
    if (accion === 'motivo') { motivo = el.dataset.m; return pintar(); }
    if (accion === 'ver-no') { verNoAptos = true; $('#sel-lista').innerHTML = pintarLista(); return; }
    if (accion === 'quitar') { parte[rol] = null; marcarAvisado(parte, rol, null); cerrarDialogo(); return commit(); }
    if (accion !== 'elegir') return;
    const id = el.dataset.id;
    if (!confirmarNoApto(sem, { ...parte, [rol]: null }, rol, id)) return;
    if (sustituye) registrarSustitucion(sem, parte, rol, id, (motivo || $('#sel-motivo')?.value || '').trim());
    else { parte[rol] = id; marcarAvisado(parte, rol, null); }
    cerrarDialogo(); commit();
  };
  pintar();
  $('#dlg-body').onchange = null;
  $('#dlg-body').oninput = e => {
    if (e.target.id === 'sel-buscar') { q = e.target.value; $('#sel-lista').innerHTML = pintarLista(); }
    if (e.target.id === 'sel-motivo') motivo = e.target.value;
  };
  $('#dlg').classList.add('hoja-abajo');
  $('#dlg').showModal();
}

function selectorModo() {
  return `<div class="seg"><button data-act="modo" data-modo="semana" class="${ui.modo !== 'mes' ? 'on' : ''}">Semana</button><button data-act="modo" data-modo="mes" class="${ui.modo === 'mes' ? 'on' : ''}">Mes</button></div>`;
}

function estadoSemana(s) {
  if (!s) return { cls: 'gray', txt: 'sin programa' };
  if (s.sinReunion) return { cls: 'gray', txt: 'sin reunión' };
  const pr = problemasSemana(s).length, h = huecos(s);
  if (pr) return { cls: 'danger', txt: `${pr} problema${pr > 1 ? 's' : ''}` };
  if (h) return { cls: 'warn', txt: `${h} libre${h > 1 ? 's' : ''}` };
  if (s.estado !== 'publicada') return { cls: 'info', txt: 'completa · borrador' };
  const av = asignacionesDe(s).filter(a => !a.parte.avisos?.[a.rol]).length;
  if (av) return { cls: 'info', txt: `${av} sin avisar` };
  return { cls: 'ok', txt: 'lista ✓' };
}

function tiraProximas() {
  const base = lunesDe(hoyISO());
  let html = '';
  for (let i = 0; i < 8; i++) {
    const l = addDias(base, 7 * i);
    const st = estadoSemana(semanaPorLunes(l));
    const d = fromISO(fechaReunionDeLunes(l));
    html += `<button class="prox ${st.cls} ${l === ui.lunes && ui.modo !== 'mes' ? 'sel' : ''}" data-act="prox-ir" data-lunes="${l}">
      <b>${i === 0 ? 'Esta semana' : `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`}</b><span>${st.txt}</span></button>`;
  }
  return `<div class="proximas">${html}</div>`;
}

function navMes() {
  const [y, m] = ui.mes.split('-').map(Number);
  return `<div class="semnav">
    <button data-act="mes-prev" title="Mes anterior">◀</button>
    <div class="rango">${MESES[m - 1]} ${y}</div>
    <button data-act="mes-next" title="Mes siguiente">▶</button>
    <span class="grow"></span>
    ${selectorModo()}
  </div>`;
}

// Cuadrícula del mes: una columna por semana y una fila por puesto
function vistaMes() {
  const sems = state.semanas.filter(s => fechaReunion(s).slice(0, 7) === ui.mes);
  if (!sems.length) return `<div class="card empty">No hay semanas creadas en este mes.</div>`;
  const filas = new Map();
  const celdas = new Map();
  for (const s of sems) {
    const cuenta = {};
    for (const p of partesOrdenadas(s)) {
      const t = TIPOS[p.tipo];
      const grupo = t.sec === 'maestros' ? 'maestros' : p.tipo;
      const k = `${grupo}@${p.sala}`;
      cuenta[k] = (cuenta[k] || 0) + 1;
      const clave = `${k}#${cuenta[k]}`;
      if (!filas.has(clave)) {
        const label = grupo === 'maestros' ? `Maestros ${cuenta[k]}` : t.label + (cuenta[k] > 1 ? ` ${cuenta[k]}` : '');
        filas.set(clave, { label: label + (p.sala === 'B' && t.salas ? ' · aux.' : ''), orden: [SEC_ORDEN[t.sec], grupo === 'maestros' ? 1 : t.orden, cuenta[k], p.sala] });
      }
      celdas.set(`${s.id}|${clave}`, p);
    }
  }
  const orden = [...filas.entries()].sort(([, a], [, b]) => {
    for (let i = 0; i < 4; i++) if (a.orden[i] !== b.orden[i]) return a.orden[i] < b.orden[i] ? -1 : 1;
    return 0;
  });
  const celda = (s, clave) => {
    const p = celdas.get(`${s.id}|${clave}`);
    if (s.sinReunion) return '<td class="muted small">—</td>';
    if (!p) return '<td></td>';
    if (TIPOS[p.tipo].fijo) return `<td class="small muted">Superintendente</td>`;
    const t = TIPOS[p.tipo];
    const nombres = [p.titular ? esc(nombre(p.titular)) : '<span class="hueco">libre</span>'];
    if (t.ayu) nombres.push(p.ayudante ? esc(nombre(p.ayudante)) : '<span class="hueco">libre</span>');
    return `<td class="click small" data-act="prox-ir" data-lunes="${s.lunes}" data-tip="${esc(t.label + (p.titulo ? ': ' + p.titulo : ''))}">${nombres.join('<br>')}</td>`;
  };
  return `<div class="card tabla-wrap"><table class="mes">
    <thead><tr><th></th>${sems.map(s => {
      const d = fromISO(fechaReunion(s));
      const st = estadoSemana(s);
      return `<th class="click" data-act="prox-ir" data-lunes="${s.lunes}">${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()}<div><span class="badge ${st.cls}">${st.txt}</span></div></th>`;
    }).join('')}</tr></thead>
    <tbody>${orden.map(([clave, f]) => `<tr><td class="small"><b>${esc(f.label)}</b></td>${sems.map(s => celda(s, clave)).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

/* ================= Avisos ================= */

function asignacionesDe(sem) {
  const out = [];
  for (const p of partesOrdenadas(sem)) {
    if (p.titular) out.push({ parte: p, rol: 'titular', id: p.titular });
    if (TIPOS[p.tipo].ayu && p.ayudante) out.push({ parte: p, rol: 'ayudante', id: p.ayudante });
  }
  return out;
}

function textoAviso(sem, parte, rol) {
  const t = TIPOS[parte.tipo];
  const quien = pub(parte[rol]);
  const otro = rol === 'titular' ? parte.ayudante : parte.titular;
  let que;
  if (parte.tipo === 'discurso_est') que = `discurso${parte.titulo && parte.titulo !== 'Discurso' ? ` «${parte.titulo}»` : ''}`;
  else if (['maestros', 'analisis', 'vida', 'tesoros'].includes(parte.tipo) && parte.titulo) que = `«${parte.titulo}»`;
  else que = t.label.toLowerCase() + (parte.titulo ? ` (${parte.titulo})` : '');
  if (parte.num) que = `intervención ${parte.num}, ${que}`;
  if (rol === 'ayudante') que = `${t.ayuLabel.toLowerCase()} en la ${que}`;
  if (t.ayu && otro) que += rol === 'titular' ? `, con ${nombre(otro)} de ${t.ayuLabel.toLowerCase()}` : `, con ${nombre(otro)}`;
  if (parte.sala === 'B') que += ', en la sala auxiliar';
  const nom = (quien?.nombre || '').split(' ')[0];
  return `Hola, ${nom}. Te recuerdo tu asignación en la reunión Vida y Ministerio Cristiano del ${fechaLarga(fechaReunion(sem))}: ${que}. ¡Gracias!`;
}

function telefonoWa(tel) {
  let d = String(tel || '').replace(/\D/g, '').replace(/^00/, '');
  if (d && d.length <= 9) d = (state.config.prefijo || '') + d;
  return d;
}

function tarjetaAvisos(sem) {
  const lista = asignacionesDe(sem);
  if (!lista.length) return '';
  const pendientes = lista.filter(a => !a.parte.avisos?.[a.rol]);
  const orden = [...pendientes, ...lista.filter(a => a.parte.avisos?.[a.rol])];
  return `<div class="card" id="avisos">
    <div class="row between"><h3 style="margin:0">📲 Avisos</h3>
      <span class="badge ${pendientes.length ? 'warn' : 'ok'}">${pendientes.length ? `${pendientes.length} sin avisar` : 'Todos avisados'}</span></div>
    <p class="small muted" style="margin:6px 0 10px">Pulsa <b>WhatsApp</b> y se abre con el mensaje escrito. Si se lo has dicho en persona, márcalo con <b>✓</b>.</p>
    <div class="avisos-lista">${orden.map(a => {
      const p = pub(a.id);
      const av = a.parte.avisos?.[a.rol];
      const tel = telefonoWa(p?.telefono);
      const url = `https://wa.me/${tel}?text=${encodeURIComponent(textoAviso(sem, a.parte, a.rol))}`;
      const t = TIPOS[a.parte.tipo];
      const que = `${t.label}${a.rol === 'ayudante' ? ` · ${t.ayuLabel.toLowerCase()}` : ''}${a.parte.sala === 'B' ? ' · sala aux.' : ''}`;
      const datos = `data-parte="${a.parte.id}" data-rol="${a.rol}"`;
      return `<div class="aviso-fila ${av ? 'hecho' : ''}">
        <div class="av-info"><b>${esc(nombre(a.id))}</b><span class="small muted">${esc(que)}${tel ? '' : ' · sin teléfono'}</span></div>
        <div class="av-acc">
          ${av ? `<span class="badge ok">✓ Avisado</span><button class="small icon" data-act="aviso-quitar" ${datos} title="Marcar como pendiente">↺</button>`
            : `<a class="btn wa" href="${url}" target="_blank" rel="noopener" data-act="aviso-wa" ${datos}>WhatsApp</a>
               <button class="small icon" data-act="aviso-marcar" ${datos} title="Ya avisado (en persona)">✓</button>`}
          <button class="small icon" data-act="aviso-copiar" ${datos} title="Copiar el mensaje">⧉</button>
          <button class="small icon" data-act="ics-pub" data-id="${a.id}" title="Sus próximas fechas para el calendario">📅</button>
        </div></div>`;
    }).join('')}</div></div>`;
}

function marcarAvisado(parte, rol, valor = new Date().toISOString()) {
  parte.avisos = { ...(parte.avisos || {}), [rol]: valor };
  if (!valor) delete parte.avisos[rol];
}

/* ================= Sustitución ================= */

function abrirSustitucion(sem, parte, rol, preseleccion) {
  const t = TIPOS[parte.tipo];
  const original = parte[rol];
  const ops = opcionesSelect(sem, { ...parte, [rol]: null }, rol)
    .replace(`value="${original}"`, `value="${original}" disabled`);
  abrirDialogo(`
    <h2>Sustituir</h2>
    <p><b>${t.label}</b>${parte.titulo ? ' — ' + esc(parte.titulo) : ''}${rol === 'ayudante' ? ` (${t.ayuLabel.toLowerCase()})` : ''}<br>
    <span class="muted">${fechaLarga(fechaReunion(sem))} · ahora: <b>${esc(nombre(original))}</b></span></p>
    <div class="form-grid">
      <label class="field full"><span>Nuevo asignado</span><select id="sus-nuevo">${ops}</select></label>
      <label class="field full"><span>Motivo</span><input id="sus-motivo" list="dl-motivos" placeholder="Enfermedad, viaje, trabajo…">
        <datalist id="dl-motivos"><option value="Enfermedad"><option value="Viaje"><option value="Trabajo"><option value="Asuntos familiares"><option value="No contestó"><option value="Error de asignación"></datalist></label>
    </div>
    <div class="dlg-foot"><span></span><span class="row">
      <button data-dlg="cerrar">Cancelar</button>
      <button class="primary" data-dlg="ok">Registrar sustitución</button></span></div>`,
  () => {
    if (!$('#sus-nuevo')) return;
    const nuevo = $('#sus-nuevo').value || null;
    const motivo = $('#sus-motivo').value.trim();
    if (!nuevo) { alert('Elige quién la sustituye (o vuelve la semana a borrador para dejarla vacía).'); return false; }
    if (!confirmarNoApto(sem, { ...parte, [rol]: null }, rol, nuevo)) return false;
    state.sustituciones.push({
      id: uid(), registrado: new Date().toISOString(), semanaId: sem.id, parteId: parte.id,
      tipo: parte.tipo, titulo: parte.titulo, sala: parte.sala, rol, cod: codDe(parte, rol),
      original, sustituto: nuevo, motivo,
    });
    parte[rol] = nuevo;
    marcarAvisado(parte, rol, null);
    commit();
  });
  if (preseleccion) $('#sus-nuevo').value = preseleccion;
}

function tablaSustituciones(lista) {
  const filas = [...lista].sort((a, b) => {
    const sa = semanaPorId(a.semanaId), sb = semanaPorId(b.semanaId);
    return (sb?.lunes || '').localeCompare(sa?.lunes || '') || b.registrado.localeCompare(a.registrado);
  }).map(x => {
    const s = semanaPorId(x.semanaId);
    const t = TIPOS[x.tipo];
    return `<tr>
      <td>${s ? fechaCorta(fechaReunion(s)) : '—'}</td>
      <td>${t?.label ?? x.tipo}${x.titulo ? ` <span class="muted small">${esc(x.titulo)}</span>` : ''}${x.rol === 'ayudante' ? ` <span class="badge gray">${esc(t?.ayuLabel ?? 'ayudante')}</span>` : ''}</td>
      <td>${esc(nombre(x.original))}</td>
      <td>${esc(nombre(x.sustituto))}</td>
      <td>${esc(x.motivo) || '<span class="muted">—</span>'}</td>
      <td class="small muted">${fechaCorta(x.registrado.slice(0, 10))}</td>
      <td><button class="small icon danger" data-act="del-sus" data-id="${x.id}" title="Borrar registro">✕</button></td>
    </tr>`;
  }).join('');
  return `<div class="tabla-wrap"><table><thead><tr><th>Reunión</th><th>Parte</th><th>Original</th><th>Sustituto</th><th>Motivo</th><th>Registrado</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
}

/* ================= Vista: Publicadores ================= */

function vistaPublicadores() {
  const ents = entradas().filter(e => e.estado === 'asignada');
  const hoy = hoyISO();
  const q = ui.buscar.toLowerCase();
  const lista = publicadoresOrdenados().filter(p => (ui.verInactivos || p.activo) && (!q || p.nombre.toLowerCase().includes(q)));
  const inactivos = state.publicadores.filter(p => !p.activo).length;

  const filas = lista.map(p => {
    const mias = ents.filter(e => e.pub === p.id);
    const pasadas = mias.filter(e => e.fecha < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const futuras = mias.filter(e => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ult = pasadas[0], prox = futuras[0];
    const badges = [
      p.precursor ? '<span class="badge ok">Precursor</span>' : '',
      p.sala === 'A' ? '<span class="badge gray">Sala principal</span>' : p.sala === 'B' ? '<span class="badge gray">Sala auxiliar</span>' : '',
      p.soloAyudante ? '<span class="badge warn">Solo ayudante</span>' : '',
      !p.activo ? '<span class="badge gray">Inactivo</span>' : '',
      ausente(p, hoy) ? '<span class="badge danger">Ausente</span>' : '',
    ].join(' ');
    return `<tr class="click ${p.activo ? '' : 'inactivo'}" data-act="editar-pub" data-id="${p.id}">
      <td><b>${esc(p.nombre)}</b> <span class="muted small">${p.sexo === 'H' ? '♂' : '♀'}${p.familia ? ' · fam. ' + esc(p.familia) : ''}</span><div>${badges}</div></td>
      <td class="num">${mias.filter(e => Math.abs(diasEntre(hoy, e.fecha)) <= 182).length}</td>
      <td>${PRIVILEGIOS[p.privilegio] ?? ''}</td>
      <td><div class="chips">${(p.asignaciones || []).map(c => `<span class="badge gray">${ASIG[c]}</span>`).join('') || '<span class="muted small">ninguna</span>'}</div></td>
      <td class="small">${ult ? `${fechaCorta(ult.fecha)}<br><span class="muted">${TIPOS[ult.tipo].label} · ${relativo(diasEntre(hoy, ult.fecha))}</span>` : '<span class="muted">nunca</span>'}</td>
      <td class="small">${prox ? `${fechaCorta(prox.fecha)}<br><span class="muted">${TIPOS[prox.tipo].label}</span>` : '<span class="muted">—</span>'}</td>
    </tr>`;
  }).join('');

  return `<div class="card">
    <div class="row between">
      <h2 style="margin:0">Publicadores <span class="muted small">${state.publicadores.filter(p => p.activo).length} activos</span></h2>
      <div class="row">
        <input type="search" data-act="buscar" placeholder="Buscar…" value="${esc(ui.buscar)}">
        ${inactivos ? `<label class="row small"><input type="checkbox" data-act="ver-inactivos" ${ui.verInactivos ? 'checked' : ''}> Ver inactivos (${inactivos})</label>` : ''}
        <button class="primary" data-act="nuevo-pub">+ Añadir publicador</button>
      </div>
    </div>
  </div>
  ${lista.length ? `<div class="card tabla-wrap"><table>
    <thead><tr><th>Nombre</th><th class="num" title="Asignaciones en los últimos 6 meses y próximas">6 m</th><th>Privilegio</th><th>Asignaciones que puede hacer</th><th>Última</th><th>Próxima</th></tr></thead>
    <tbody>${filas}</tbody></table></div>`
    : `<div class="card empty">${state.publicadores.length ? 'Ningún publicador coincide.' : 'Aún no hay publicadores. Pulsa «Añadir publicador».'}</div>`}`;
}

function asignacionesSugeridas(p) {
  if (p.soloAyudante) return ['ayudante'];
  if (p.sexo === 'M') return ['maestros', 'ayudante'];
  return {
    anciano: ['presidente', 'consejero_b', 'oracion', 'tesoros', 'perlas', 'vida', 'estudio_conductor', 'estudio_lector'],
    siervo: ['oracion', 'tesoros', 'perlas', 'vida', 'estudio_lector', 'lectura', 'maestros', 'ayudante', 'discurso_est'],
    publicador: ['oracion', 'lectura', 'maestros', 'ayudante', 'discurso_est', 'estudio_lector'],
    no_bautizado: ['lectura', 'maestros', 'ayudante', 'discurso_est'],
  }[p.privilegio] || [];
}

function abrirPublicador(id) {
  const p = id ? structuredClone(pub(id)) : {
    id: uid(), nombre: '', telefono: '', sexo: 'H', privilegio: 'publicador', precursor: false,
    soloAyudante: false, activo: true, asignaciones: [], ausencias: [], notas: '',
  };
  const nuevo = !id;
  if (nuevo) p.asignaciones = asignacionesSugeridas(p);

  const pintar = () => {
    $('#dlg-body').innerHTML = `
    <h2>${nuevo ? 'Nuevo publicador' : 'Editar publicador'}</h2>
    <div class="form-grid">
      <label class="field"><span>Nombre y apellidos</span><input id="f-nombre" value="${esc(p.nombre)}" autofocus></label>
      <label class="field"><span>Teléfono (WhatsApp)</span><input id="f-tel" type="tel" value="${esc(p.telefono)}" placeholder="600 123 456"></label>
      <label class="field"><span>Sexo</span>
        <select id="f-sexo"><option value="H" ${p.sexo === 'H' ? 'selected' : ''}>Hermano</option><option value="M" ${p.sexo === 'M' ? 'selected' : ''}>Hermana</option></select></label>
      <label class="field"><span>Privilegio</span>
        <select id="f-priv">${Object.entries(PRIVILEGIOS).filter(([k]) => p.sexo === 'H' || !['anciano', 'siervo'].includes(k))
          .map(([k, v]) => `<option value="${k}" ${p.privilegio === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field"><span>Familia (permite emparejar hermano y hermana)</span><input id="f-fam" list="dl-fam" value="${esc(p.familia)}" placeholder="p. ej. Pérez García">
        <datalist id="dl-fam">${[...new Set(state.publicadores.map(x => x.familia).filter(Boolean))].map(f => `<option value="${esc(f)}">`).join('')}</datalist></label>
      <label class="field"><span>Sala preferida (partes de estudiante)</span><select id="f-sala">
        ${[['ambas', 'Cualquiera'], ['A', 'Solo sala principal'], ['B', 'Solo sala auxiliar']].map(([k, v]) => `<option value="${k}" ${(p.sala || 'ambas') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field"><span>Semanas mínimas entre partes</span><input id="f-min" type="number" min="0" max="12" value="${p.minSemanas ?? ''}" placeholder="General (${state.config.minSemanas ?? 2})"></label>
      <div></div>
      <div class="full row" style="gap:18px">
        <label class="row"><input type="checkbox" id="f-prec" ${p.precursor ? 'checked' : ''}> Precursor regular</label>
        <label class="row"><input type="checkbox" id="f-ayu" ${p.soloAyudante ? 'checked' : ''}> Solo ayudante</label>
        <label class="row"><input type="checkbox" id="f-activo" ${p.activo ? 'checked' : ''}> Activo</label>
      </div>
      <div class="full">
        <div class="row between"><span class="muted small">Asignaciones que puede hacer</span>
          <button class="small" data-dlg="sugeridas">Aplicar las de su privilegio</button></div>
        <div class="checks" style="margin-top:6px">${Object.entries(ASIG).map(([k, v]) => {
          const no = p.sexo === 'M' && SOLO_VARONES.includes(k);
          return `<label class="${no ? 'no' : ''}"><input type="checkbox" class="f-asig" value="${k}" ${p.asignaciones.includes(k) ? 'checked' : ''} ${no ? 'disabled' : ''}> ${v}</label>`;
        }).join('')}</div>
      </div>
      <div class="full">
        <div class="row between"><span class="muted small">Ausencias / no disponible</span><button class="small" data-dlg="add-aus">+ Añadir</button></div>
        ${p.ausencias.map((a, i) => `<div class="row" style="margin-top:6px">
          <input type="date" class="f-aus-desde" data-i="${i}" value="${a.desde || ''}"> →
          <input type="date" class="f-aus-hasta" data-i="${i}" value="${a.hasta || ''}" title="Vacío = indefinido">
          <input class="f-aus-motivo grow" data-i="${i}" value="${esc(a.motivo)}" placeholder="Motivo">
          <button class="small icon danger" data-dlg="del-aus" data-i="${i}">✕</button></div>`).join('') || '<p class="muted small" style="margin:4px 0">Ninguna.</p>'}
      </div>
      <label class="field full"><span>Notas</span><textarea id="f-notas" rows="2">${esc(p.notas)}</textarea></label>
    </div>
    ${nuevo ? '' : resumenPublicador(p.id)}
    <div class="dlg-foot">
      <span>${nuevo ? '' : `<button class="danger" data-dlg="borrar">Eliminar</button> <button data-dlg="ver-hist">Ver historial</button> <button data-dlg="ics" title="Sus próximas asignaciones en un archivo para el calendario">📅 Calendario</button>`}</span>
      <span class="row"><button data-dlg="cerrar">Cancelar</button><button class="primary" data-dlg="ok">Guardar</button></span>
    </div>`;
  };

  // Lee el formulario al objeto p (para no perder cambios al repintar)
  const leer = () => {
    p.nombre = $('#f-nombre').value.trim();
    p.telefono = $('#f-tel').value.trim();
    p.familia = $('#f-fam').value.trim();
    p.sala = $('#f-sala').value;
    p.minSemanas = $('#f-min').value === '' ? undefined : Math.max(0, Number($('#f-min').value));
    p.sexo = $('#f-sexo').value;
    p.privilegio = $('#f-priv').value;
    p.precursor = $('#f-prec').checked;
    p.soloAyudante = $('#f-ayu').checked;
    p.activo = $('#f-activo').checked;
    p.asignaciones = [...document.querySelectorAll('.f-asig:checked')].map(i => i.value);
    p.notas = $('#f-notas').value;
    document.querySelectorAll('.f-aus-desde').forEach(i => p.ausencias[i.dataset.i].desde = i.value);
    document.querySelectorAll('.f-aus-hasta').forEach(i => p.ausencias[i.dataset.i].hasta = i.value);
    document.querySelectorAll('.f-aus-motivo').forEach(i => p.ausencias[i.dataset.i].motivo = i.value);
  };

  dlgHandler = (accion, el) => {
    leer();
    if (accion === 'sugeridas') { p.asignaciones = asignacionesSugeridas(p); pintar(); }
    else if (accion === 'add-aus') { p.ausencias.push({ desde: hoyISO(), hasta: '', motivo: '' }); pintar(); }
    else if (accion === 'del-aus') { p.ausencias.splice(+el.dataset.i, 1); pintar(); }
    else if (accion === 'borrar') {
      const n = entradas().filter(e => e.pub === p.id).length;
      if (!confirm(n ? `${p.nombre} tiene ${n} asignaciones en el historial. Se recomienda marcarlo como inactivo en lugar de eliminarlo.\n\n¿Eliminar de todos modos? Sus partes quedarán sin asignar.` : `¿Eliminar a ${p.nombre}?`)) return;
      state.publicadores = state.publicadores.filter(x => x.id !== p.id);
      for (const s of state.semanas) for (const pt of s.partes) {
        if (pt.titular === p.id) pt.titular = null;
        if (pt.ayudante === p.id) pt.ayudante = null;
      }
      cerrarDialogo(); commit();
    }
    else if (accion === 'ics') icsPublicador(p.id);
    else if (accion === 'ver-hist') {
      cerrarDialogo(); ui.vista = 'historial'; ui.hist = 'detalle'; ui.filtro = { pub: p.id, cod: '', desde: '', hasta: '' }; render();
    }
    else if (accion === 'ok') {
      if (!p.nombre) { alert('Escribe el nombre.'); return; }
      guardarFicha();
      cerrarDialogo(); commit();
    }
    else if (accion === 'cerrar') cerrarDialogo();
  };
  const guardarFicha = () => {
    if (p.sexo === 'M') {
      p.asignaciones = p.asignaciones.filter(c => !SOLO_VARONES.includes(c));
      if (['anciano', 'siervo'].includes(p.privilegio)) p.privilegio = 'publicador';
    }
    if (p.soloAyudante) p.asignaciones = ['ayudante'];
    p.ausencias = p.ausencias.filter(a => a.desde);
    const i = state.publicadores.findIndex(x => x.id === p.id);
    if (i < 0) state.publicadores.push(structuredClone(p));
    else state.publicadores[i] = structuredClone(p);
  };
  pintar();
  const inicial = JSON.stringify(p);
  // Si se cierra sin pulsar Guardar (Atrás, Esc o al salir de la app), no se pierde lo escrito
  alCerrarFuera = () => {
    if (!$('#f-nombre')) return;
    leer();
    if (JSON.stringify(p) === inicial || !p.nombre) return;
    guardarFicha(); guardar();
    aviso(`Cambios de ${p.nombre} guardados`);
  };
  $('#dlg').showModal();
  // Al cambiar sexo/privilegio/solo ayudante repinta (limita opciones)
  $('#dlg-body').onchange = e => {
    if (['f-sexo', 'f-ayu'].includes(e.target.id)) { leer(); if (p.sexo === 'M' && ['anciano', 'siervo'].includes(p.privilegio)) p.privilegio = 'publicador'; pintar(); }
  };
}

function resumenPublicador(id) {
  const ents = entradas().filter(e => e.pub === id);
  if (!ents.length) return `<p class="muted small" style="margin-top:14px">Sin asignaciones todavía.</p>`;
  const ult = [...ents].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6);
  return `<div style="margin-top:14px"><span class="muted small">Últimas asignaciones</span>
    <table style="margin-top:4px"><tbody>${ult.map(e => `<tr>
      <td class="small">${fechaCorta(e.fecha)}</td><td class="small">${TIPOS[e.tipo]?.label}${e.rol === 'ayudante' ? ` (${TIPOS[e.tipo].ayuLabel.toLowerCase()})` : ''}</td>
      <td>${badgeEstado(e)}</td></tr>`).join('')}</tbody></table></div>`;
}

function badgeEstado(e) {
  const st = estadoEntrada(e);
  return { realizada: '<span class="badge ok">Realizada</span>', programada: '<span class="badge">Programada</span>', sustituido: '<span class="badge danger">Sustituido</span>' }[st];
}

/* ================= Vista: Historial ================= */

function vistaHistorial() {
  const tabs = [['resumen', 'Resumen por publicador'], ['detalle', 'Detalle'], ['sustituciones', `Sustituciones (${state.sustituciones.length})`]];
  let html = `<div class="row between" style="margin-bottom:12px"><div class="subtabs" style="margin:0">${tabs.map(([k, v]) => `<button data-act="hist-tab" data-tab="${k}" class="${ui.hist === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <button data-act="importar-hist">📄 Importar historial (Excel / CSV)</button></div>`;
  if (ui.hist === 'resumen') html += histResumen();
  else if (ui.hist === 'detalle') html += histDetalle();
  else html += state.sustituciones.length ? `<div class="card">${tablaSustituciones(state.sustituciones)}</div>` : `<div class="card empty">No hay sustituciones registradas.</div>`;
  return html;
}

function histResumen() {
  const hoy = hoyISO();
  const ents = entradas();
  const cods = Object.keys(ASIG).filter(c => ents.some(e => e.cod === c && e.estado === 'asignada'));
  const filas = publicadoresOrdenados().filter(p => p.activo).map(p => {
    const mias = ents.filter(e => e.pub === p.id);
    const hechas = mias.filter(e => e.estado === 'asignada' && e.fecha < hoy);
    const prog = mias.filter(e => e.estado === 'asignada' && e.fecha >= hoy);
    const sust = mias.filter(e => e.estado === 'sustituido').length;
    const ult = hechas.map(e => e.fecha).sort().pop();
    const dias = ult ? diasEntre(ult, hoy) : null;
    return { p, hechas, prog, sust, ult, dias };
  }).sort((a, b) => (b.dias ?? 1e9) - (a.dias ?? 1e9));

  if (!filas.length) return `<div class="card empty">No hay publicadores activos.</div>`;
  return `<div class="card">
    <p class="small muted" style="margin-top:0">Ordenado por quién lleva más tiempo sin intervenir. Las cifras cuentan partes ya realizadas (las programadas aparecen aparte).</p>
    <div class="tabla-wrap"><table>
    <thead><tr><th>Publicador</th><th>Última</th><th class="num">Hechas</th><th class="num">Progr.</th><th class="num">Sustit.</th>
      ${cods.map(c => `<th class="num" title="${ASIG[c]}">${abrev(c)}</th>`).join('')}</tr></thead>
    <tbody>${filas.map(f => `<tr class="click" data-act="hist-pub" data-id="${f.p.id}">
      <td><b>${esc(f.p.nombre)}</b>${f.p.soloAyudante ? ' <span class="badge warn">ayud.</span>' : ''}</td>
      <td class="small">${f.ult ? `${fechaCorta(f.ult)} <span class="${f.dias > 120 ? 'badge danger' : 'muted'}">${relativo(-f.dias)}</span>` : '<span class="badge danger">nunca</span>'}</td>
      <td class="num">${f.hechas.length}</td><td class="num">${f.prog.length || ''}</td><td class="num">${f.sust || ''}</td>
      ${cods.map(c => { const n = f.hechas.filter(e => e.cod === c).length; return `<td class="num ${n ? '' : 'zero'}">${n || '·'}</td>`; }).join('')}
    </tr>`).join('')}</tbody></table></div></div>`;
}

function abrev(c) {
  return { presidente: 'Pres', consejero_b: 'Cons', oracion: 'Orac', tesoros: 'Tes', perlas: 'Perl', lectura: 'Lect', maestros: 'Dem', ayudante: 'Ayud', discurso_est: 'Disc', vida: 'Vida', estudio_conductor: 'EBC', estudio_lector: 'Lector', analisis: '¿Qué?' }[c];
}

function histDetalle() {
  const f = ui.filtro;
  let ents = entradas();
  if (f.pub) ents = ents.filter(e => e.pub === f.pub);
  if (f.cod) ents = ents.filter(e => e.cod === f.cod);
  if (f.desde) ents = ents.filter(e => e.fecha >= f.desde);
  if (f.hasta) ents = ents.filter(e => e.fecha <= f.hasta);
  ents.sort((a, b) => b.fecha.localeCompare(a.fecha));

  const filtros = `<div class="card row">
    <select data-act="filtro" data-k="pub"><option value="">Todos los publicadores</option>
      ${publicadoresOrdenados().map(p => `<option value="${p.id}" ${f.pub === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>
    <select data-act="filtro" data-k="cod"><option value="">Todas las asignaciones</option>
      ${Object.entries(ASIG).map(([k, v]) => `<option value="${k}" ${f.cod === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label class="row small">Desde <input type="date" data-act="filtro" data-k="desde" value="${f.desde}"></label>
    <label class="row small">Hasta <input type="date" data-act="filtro" data-k="hasta" value="${f.hasta}"></label>
    ${f.pub || f.cod || f.desde || f.hasta ? `<button class="small" data-act="filtro-limpiar">Limpiar</button>` : ''}
    <span class="muted small grow" style="text-align:right">${ents.length} registros</span>
    ${ents.length ? `<button class="small" data-act="csv">⬇ CSV</button>` : ''}
  </div>`;
  ui.entsFiltradas = ents;

  if (!ents.length) return filtros + `<div class="card empty">No hay asignaciones con estos filtros.</div>`;
  return filtros + `<div class="card tabla-wrap"><table>
    <thead><tr><th>Fecha</th><th>Publicador</th><th>Parte</th><th>Con</th><th>Estado</th></tr></thead>
    <tbody>${ents.map(e => {
      const t = TIPOS[e.tipo];
      return `<tr>
      <td class="small">${fechaCorta(e.fecha)}</td>
      <td>${esc(nombre(e.pub))}</td>
      <td>${t?.label ?? e.tipo}${e.rol === 'ayudante' ? ` <span class="badge gray">${t.ayuLabel.toLowerCase()}</span>` : ''}${e.sala === 'B' ? ' <span class="badge warn">sala aux.</span>' : ''}
        ${e.titulo ? `<div class="small muted">${esc(e.titulo)}</div>` : ''}</td>
      <td class="small">${esc(nombre(e.companero))}</td>
      <td>${badgeEstado(e)}${e.estado === 'sustituido' ? `<div class="small muted">por ${esc(nombre(e.sustituto))}${e.motivo ? ' · ' + esc(e.motivo) : ''}</div>` : ''}</td>
    </tr>`;
    }).join('')}</tbody></table></div>`;
}

function exportarCSV(ents) {
  const col = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = [['Fecha', 'Publicador', 'Parte', 'Título', 'Papel', 'Sala', 'Compañero', 'Estado', 'Sustituto', 'Motivo']];
  for (const e of ents) {
    const t = TIPOS[e.tipo];
    filas.push([e.fecha, nombre(e.pub), t?.label ?? e.tipo, e.titulo, e.rol === 'ayudante' ? t?.ayuLabel : 'Titular',
      e.sala === 'B' ? 'Auxiliar' : 'Principal', nombre(e.companero), estadoEntrada(e), nombre(e.sustituto), e.motivo]);
  }
  const blob = new Blob(['\ufeff' + filas.map(f => f.map(col).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vmc-historial-${hoyISO()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ================= Vista: Imprimir ================= */

const PARTES_ESTUDIANTE = ['lectura', 'maestros', 'discurso_est'];

function vistaImprimir() {
  const sems = state.semanas.filter(s => fechaReunion(s).slice(0, 7) === ui.mesImprimir);
  const tabs = `<div class="subtabs no-print">
    <button data-act="impr-tab" data-tab="programa" class="${!['s89', 'presidente'].includes(ui.impr) ? 'on' : ''}">Programa del mes</button>
    <button data-act="impr-tab" data-tab="s89" class="${ui.impr === 's89' ? 'on' : ''}">Hojas de asignación (S-89)</button>
    <button data-act="impr-tab" data-tab="presidente" class="${ui.impr === 'presidente' ? 'on' : ''}">Hoja del presidente</button></div>`;
  return tabs + (ui.impr === 's89' ? imprS89(sems) : ui.impr === 'presidente' ? imprPresidente(sems) : imprPrograma(sems));
}

function imprS89(sems) {
  const elegidas = ui.semImprimir ? sems.filter(s => s.id === ui.semImprimir) : sems;
  const hojas = [];
  for (const s of elegidas) {
    if (s.sinReunion) continue;
    for (const p of partesOrdenadas(s)) {
      if (!PARTES_ESTUDIANTE.includes(p.tipo) || !p.titular) continue;
      hojas.push(hojaS89(s, p));
    }
  }
  const sinAsignar = elegidas.reduce((n, s) => n + (s.sinReunion ? 0 : s.partes.filter(p => PARTES_ESTUDIANTE.includes(p.tipo) && !p.titular).length), 0);
  return `<div class="card row no-print barra-impr">
    <label class="row">Mes <input type="month" data-act="mes-imprimir" value="${ui.mesImprimir}"></label>
    <select data-act="sem-imprimir"><option value="">Todas las semanas</option>
      ${sems.map(s => `<option value="${s.id}" ${ui.semImprimir === s.id ? 'selected' : ''}>${rangoSemana(s.lunes)}</option>`).join('')}</select>
    <button class="primary" data-act="imprimir" ${hojas.length ? '' : 'disabled'}>🖨 Imprimir / Guardar PDF</button>
    <span class="muted small">${hojas.length} hojas${sinAsignar ? ` · ${sinAsignar} partes de estudiante sin asignar` : ''}</span>
  </div>
  ${hojas.length ? `<div class="papel-zona"><div class="papel"><div class="s89-grid">${hojas.join('')}</div></div></div>` : `<div class="card empty">No hay partes de estudiante asignadas en este periodo.</div>`}`;
}

function hojaS89(s, p) {
  const t = TIPOS[p.tipo];
  const caja = on => `<span class="caja">${on ? '✕' : ''}</span>`;
  const dos = semTieneAux(s);
  return `<div class="s89">
    <h4>ASIGNACIÓN PARA LA REUNIÓN<br>VIDA Y MINISTERIO CRISTIANO</h4>
    <div class="linea"><b>Nombre:</b> <span>${esc(nombre(p.titular))}</span></div>
    <div class="linea"><b>Ayudante:</b> <span>${t.ayu ? esc(nombre(p.ayudante)) : ''}</span></div>
    <div class="linea"><b>Fecha:</b> <span>${fechaLarga(fechaReunion(s))}</span></div>
    <div class="linea"><b>Intervención núm.:</b> <span>${p.num ? p.num + ' · ' : ''}${p.tipo === 'lectura' ? t.label + (p.titulo ? ` (${esc(p.titulo)})` : '') : esc(p.titulo || t.label)}</span></div>
    ${p.leccion ? `<div class="linea"><b>Lección:</b> <span>${esc(p.leccion.replace(/^lecci[óo]n\s*/i, ''))}</span></div>` : ''}
    <div class="salas"><b>Se presentará en:</b>
      <div>${caja(!dos || p.sala !== 'B')} Sala principal</div>
      <div>${caja(dos && p.sala === 'B')} Sala auxiliar núm. 1</div>
      <div>${caja(false)} Sala auxiliar núm. 2</div>
    </div>
    <p class="nota"><b>Nota para el estudiante:</b> encontrarás la información para preparar tu intervención en la Guía de actividades. Repasa también la lección indicada.</p>
  </div>`;
}

function imprPrograma(sems) {
  const mes = ui.mesImprimir;
  const [y, m] = mes.split('-').map(Number);
  const c = state.config;

  const bloque = s => {
    const fecha = fromISO(fechaReunion(s));
    const aux = semTieneAux(s);
    const cols = aux ? 3 : 2;
    const cab = `<h2><span>${DIAS[fecha.getDay()].toUpperCase()} ${fecha.getDate()} DE ${MESES[fecha.getMonth()].toUpperCase()}</span><span>${esc(s.lecturaSemanal.toUpperCase())}</span></h2>`;
    if (s.sinReunion) return `<div class="p-sem">${cab}<p><i>${esc(s.motivoSinReunion || 'Sin reunión')}</i></p></div>`;
    const nombresDe = p => {
      const t = TIPOS[p.tipo];
      if (t.fijo) return 'Superintendente de circuito';
      if (p.tipo === 'estudio' && p.ayudante) return `${esc(nombre(p.titular))} / Lector: ${esc(nombre(p.ayudante))}`;
      return [nombre(p.titular), t.ayu ? nombre(p.ayudante) : ''].filter(Boolean).map(esc).join(' / ') || '—';
    };
    let rows = aux ? `<tr class="p-cols"><td></td><td class="n">Sala principal</td><td class="n">Sala auxiliar</td></tr>` : '';
    let secActual = null;
    for (const p of partesOrdenadas(s)) {
      const t = TIPOS[p.tipo];
      if (p.sala === 'B' && t.salas && gemela(s, p)) continue;
      if (t.sec !== secActual && ['tesoros', 'maestros', 'vida'].includes(t.sec)) {
        rows += `<tr class="p-sec ${t.sec}"><td colspan="${cols}">${SECCIONES[SEC_ORDEN[t.sec]][1]}</td></tr>`;
      }
      secActual = t.sec;
      const label = `${p.num ? p.num + '. ' : ''}${t.label}${p.titulo ? `: ${esc(p.titulo)}` : ''}`;
      const gem = p.sala === 'A' ? gemela(s, p) : null;
      if (aux && gem) rows += `<tr><td>${label}</td><td class="n">${nombresDe(p)}</td><td class="n">${nombresDe(gem)}</td></tr>`;
      else if (aux && p.sala === 'B') rows += `<tr><td>${label}</td><td></td><td class="n">${nombresDe(p)}</td></tr>`;
      else rows += `<tr><td>${label}</td><td class="n" colspan="${cols - 1}">${nombresDe(p)}</td></tr>`;
    }
    return `<div class="p-sem">${cab}<table>${rows}</table></div>`;
  };

  return `<div class="card row no-print barra-impr">
    <label class="row">Mes <input type="month" data-act="mes-imprimir" value="${mes}"></label>
    <button class="primary" data-act="imprimir" ${sems.length ? '' : 'disabled'}>🖨 Imprimir / Guardar PDF</button>
    <button data-act="ics-mes" ${sems.length ? '' : 'disabled'} title="Todas las asignaciones del mes en un archivo para Google Calendar, Outlook o el iPhone">📅 Calendario del mes (.ics)</button>
    <span class="muted small">${sems.length} semanas · ${sems.filter(s => s.estado !== 'publicada' && !s.sinReunion).length} en borrador</span>
  </div>
  ${sems.length ? `<div class="papel-zona"><div class="papel hoja">
    <h1>Programa de la reunión Vida y Ministerio Cristiano</h1>
    <div class="sub">${esc(c.congregacion)}${c.congregacion ? ' · ' : ''}${MESES[m - 1]} ${y}</div>
    ${sems.map(bloque).join('')}
  </div></div>` : `<div class="card empty">No hay semanas creadas en este mes.</div>`}`;
}

/* ================= Vista: Ajustes ================= */

function vistaAjustes() {
  const c = state.config;
  return `<div class="card">
    <h2>Configuración</h2>
    <div class="form-grid">
      <label class="field full"><span>Nombre de la congregación</span><input data-act="cfg" data-k="congregacion" value="${esc(c.congregacion)}"></label>
      <label class="field"><span>Día de la reunión entre semana</span><select data-act="cfg" data-k="diaReunion" data-num="1">
        ${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${c.diaReunion === d ? 'selected' : ''}>${DIAS[d]}</option>`).join('')}</select></label>
      <label class="field"><span>Salas</span><select data-act="cfg" data-k="salas" data-num="1">
        <option value="1" ${c.salas == 1 ? 'selected' : ''}>Solo sala principal</option>
        <option value="2" ${c.salas == 2 ? 'selected' : ''}>Principal + auxiliar (por defecto en semanas nuevas)</option></select>
        ${semanasSinAux().length ? `<button class="small" style="margin-top:6px" data-act="aux-futuras">+ Añadir la sala auxiliar a ${semanasSinAux().length} ${semanasSinAux().length === 1 ? 'semana futura que no la tiene' : 'semanas futuras que no la tienen'}</button>` : ''}</label>
      <label class="field"><span>Hora de comienzo de la reunión</span><input type="time" data-act="cfg" data-k="horaReunion" value="${c.horaReunion || '19:00'}"></label>
      <label class="field"><span>Prefijo telefónico del país (WhatsApp)</span><input data-act="cfg" data-k="prefijo" value="${esc(c.prefijo)}" placeholder="34"></label>
      <label class="field"><span>Semanas mínimas entre partes de una misma persona</span><input type="number" min="0" max="12" data-act="cfg" data-k="minSemanas" data-num="1" value="${c.minSemanas ?? 2}"></label>
      <label class="field"><span>Partes de «Seamos mejores maestros» por defecto</span><input type="number" min="1" max="6" data-act="cfg" data-k="partesMaestros" data-num="1" value="${c.partesMaestros}"></label>
      <label class="field"><span>Partes de «Nuestra vida cristiana» por defecto</span><input type="number" min="1" max="4" data-act="cfg" data-k="partesVida" data-num="1" value="${c.partesVida}"></label>
    </div>
    <p class="small muted">La plantilla solo afecta a las semanas que crees a partir de ahora.</p>
  </div>
  ${tarjetaEspeciales()}
  ${DEMO ? '' : tarjetaDrive()}
  <div class="card">
    <h2>Historial anterior</h2>
    <p class="small muted" style="margin-top:0">Si llevabas las asignaciones en Excel o en otra aplicación, impórtalas para que las sugerencias tengan en cuenta quién hizo qué.</p>
    <button data-act="importar-hist">📄 Importar historial (Excel / CSV)</button>
  </div>
  <div class="card">
    <h2>Demostración</h2>
    <p class="small muted" style="margin-top:0">Abre la app con una congregación inventada para probarlo todo sin tocar tus datos.</p>
    ${DEMO ? `<div class="row"><a class="btn primary" href="./">Salir de la demostración</a><button data-act="demo-reiniciar">Reiniciar datos de ejemplo</button></div>` : `<a class="btn" href="./?demo=1" target="_blank" rel="noopener">▶ Abrir demostración</a> <a class="btn" href="ayuda.html" target="_blank" rel="noopener">📘 Guía de uso</a>`}
  </div>
  <div class="card">
    <h2>Copia de seguridad</h2>
    <p class="small muted" style="margin-top:0">Los datos se guardan en este navegador. Descarga una copia con regularidad (por ejemplo en esta misma carpeta o en Drive) para no perder el historial.</p>
    <div class="row">
      <button class="primary" data-act="exportar">⬇ Descargar copia (.json)</button>
      <label class="row"><button data-act="importar-btn">⬆ Restaurar copia…</button><input type="file" id="importar" accept=".json,application/json" hidden></label>
      <span class="muted small">${state.ultimoRespaldo ? 'Última copia: ' + fechaCorta(state.ultimoRespaldo.slice(0, 10)) : 'Nunca se ha hecho copia.'}</span>
    </div>
    <p class="small muted">${state.publicadores.length} publicadores · ${state.semanas.length} semanas · ${state.sustituciones.length} sustituciones</p>
  </div>
  <div class="card">
    <h2>Zona peligrosa</h2>
    <button class="danger" data-act="borrar-todo">Borrar todos los datos</button>
  </div>`;
}

function exportar() {
  state.ultimoRespaldo = new Date().toISOString();
  guardar();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vmc-respaldo-${hoyISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  render();
}

function importar(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!Array.isArray(data.publicadores) || !Array.isArray(data.semanas)) throw new Error('El archivo no parece una copia de esta app.');
      if (!confirm(`Restaurar copia con ${data.publicadores.length} publicadores y ${data.semanas.length} semanas?\nSe reemplazarán los datos actuales.`)) return;
      state = normalizar(data);
      commit();
    } catch (e) { alert('No se pudo importar: ' + e.message); }
  };
  r.readAsText(file);
}

/* ================= Diálogo ================= */

let dlgHandler = null;
let alCerrarFuera = null;
let ignorarPop = false;
{
  // Al cerrar una ventana (botón, Esc o «Atrás») se limpia y, si hacía falta, se guarda lo escrito
  const dlg = $('#dlg');
  dlg.addEventListener('cancel', () => { alCerrarFuera?.(); });
  dlg.addEventListener('close', () => {
    dlg.classList.remove('hoja-abajo');
    $('#dlg-body').oninput = null;
    dlgHandler = null;
    alCerrarFuera = null;
    render();
  });
}
function abrirDialogo(html, onOk) {
  $('#dlg-body').innerHTML = html;
  $('#dlg-body').onchange = null;
  $('#dlg-body').oninput = null;
  dlgHandler = accion => {
    if (accion === 'ok') { if (onOk() !== false) cerrarDialogo(); }
    else if (accion === 'cerrar') cerrarDialogo();
  };
  $('#dlg').showModal();
}
function cerrarDialogo() {
  alCerrarFuera = null;
  if ($('#dlg').open) $('#dlg').close();
}

// Pantalla actual como dirección, para que «Atrás» y «Adelante» se muevan dentro de la app
function rutaActual() {
  if (ui.vista === 'cuadrante') return ui.modo === 'mes' ? `cuadrante/mes/${ui.mes}` : `cuadrante/${ui.lunes}`;
  if (ui.vista === 'imprimir') return `imprimir/${ui.impr || 'programa'}/${ui.mesImprimir}`;
  if (ui.vista === 'historial') return `historial/${ui.hist}`;
  if (ui.vista === 'estadisticas') return `estadisticas/${ui.estPeriodo}`;
  return ui.vista;
}
let restaurando = false;
function anotarRuta() {
  if (restaurando || $('#dlg').open) return;
  const ruta = rutaActual();
  if (history.state?.ruta === ruta) return;
  const url = location.pathname + location.search + '#' + ruta;
  if (history.state?.ruta) history.pushState({ ruta }, '', url);
  else history.replaceState({ ruta }, '', url);
}
window.addEventListener('popstate', () => {
  if (ignorarPop) { ignorarPop = false; return; }
  const dlg = $('#dlg');
  if (dlg.open) {
    // «Atrás» con una ventana abierta: se guarda lo escrito, se cierra y se sigue en la misma pantalla
    alCerrarFuera?.();
    alCerrarFuera = null;
    dlg.close();
    history.pushState({ ruta: rutaActual() }, '', location.pathname + location.search + '#' + rutaActual());
    return;
  }
  restaurando = true;
  aplicarRuta();
  render();
  restaurando = false;
  if (history.state?.ruta !== rutaActual()) history.replaceState({ ruta: rutaActual() }, '', location.pathname + location.search + '#' + rutaActual());
});

// Antes de salir o de pasar a otra app: guarda lo que se esté escribiendo y lo sube a Drive
function volcarPendiente() {
  const el = document.activeElement;
  if (el?.dataset?.act && /^(INPUT|TEXTAREA)$/.test(el.tagName)) el.dispatchEvent(new Event('change', { bubbles: true }));
  if ($('#dlg').open) alCerrarFuera?.();
  guardarLocal();
  if (typeof drive !== 'undefined' && drive.conectado && !DEMO && tokenValido() && hayCambiosLocales()) sincronizar().catch(() => { });
}
window.addEventListener('pagehide', volcarPendiente);
document.addEventListener('visibilitychange', () => { if (document.hidden) volcarPendiente(); });
$('#dlg').addEventListener('click', e => {
  const b = e.target.closest('[data-dlg]');
  if (b && dlgHandler) { e.preventDefault(); dlgHandler(b.dataset.dlg, b); }
});

/* ================= Eventos ================= */

$('#sync').addEventListener('click', () => {
  if (tokenValido() && !sync.error) sincronizar().catch(manejarError);
  else conectarDrive();
});
window.addEventListener('beforeunload', e => {
  volcarPendiente();
  if (drive.conectado && !DEMO && hayCambiosLocales() && tokenValido()) e.preventDefault();
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && !$('#dlg').open) {
    e.preventDefault(); deshacer();
  }
});

$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-vista]');
  if (b) { ui.vista = b.dataset.vista; render(); }
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.closest('dialog')) return;
  const act = el.dataset.act;
  const sem = semanaPorLunes(ui.lunes);
  const parte = sem && el.dataset.parte ? sem.partes.find(p => p.id === el.dataset.parte) : null;
  if (el.tagName === 'A' && act !== 'aviso-wa') e.preventDefault();

  switch (act) {
    case 'ir-ajustes': ui.vista = 'ajustes'; render(); break;
    case 'ir-publicadores': ui.vista = 'publicadores'; render(); break;
    case 'sem-prev': ui.lunes = addDias(ui.lunes, -7); render(); break;
    case 'sem-next': ui.lunes = addDias(ui.lunes, 7); render(); break;
    case 'sem-hoy': ui.lunes = lunesDe(hoyISO()); render(); break;
    case 'importar-guia': abrirImportarGuia(); break;
    case 'rellenar': abrirRellenar(); break;
    case 'aux-futuras': { const l = semanasSinAux(); l.forEach(s => ponerSalaAux(s, true)); commit(); alert(`Sala auxiliar añadida a ${l.length} ${l.length === 1 ? 'semana' : 'semanas'}.`); break; }
    case 'importar-hist': abrirImportarHistorial(); break;
    case 'ics-pub': icsPublicador(el.dataset.id); break;
    case 'ics-mes': icsMes(ui.mesImprimir); break;
    case 'esp-quitar': ponerEspecial(el.dataset.lunes, null); commit(); break;
    case 'esp-add': {
      const f = $('#esp-fecha').value;
      if (!f) { alert('Elige una fecha de esa semana.'); break; }
      if (ponerEspecial(lunesDe(f), $('#esp-tipo').value, { nota: $('#esp-nota').value.trim() })) commit();
      break;
    }
    case 'demo-reiniciar':
      if (confirm('¿Volver a generar los datos de ejemplo?')) { generarDemo(); reiniciarDeshacer(); guardarLocal(); render(); }
      break;
    case 'est-periodo': ui.estPeriodo = el.dataset.k; render(); break;
    case 'candidatos': abrirCandidatos(sem, parte, el.dataset.rol); break;
    case 'deshacer': deshacer(); break;
    case 'csv': exportarCSV(ui.entsFiltradas || []); break;
    case 'modo':
      ui.modo = el.dataset.modo;
      if (ui.modo === 'mes') ui.mes = fechaReunionDeLunes(ui.lunes).slice(0, 7);
      render(); break;
    case 'prox-ir': ui.lunes = el.dataset.lunes; ui.modo = 'semana'; render(); break;
    case 'mes-prev': case 'mes-next': {
      let [y, m] = ui.mes.split('-').map(Number);
      m += act === 'mes-next' ? 1 : -1;
      if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
      ui.mes = `${y}-${pad(m)}`; render(); break;
    }
    case 'aviso-wa': marcarAvisado(parte, el.dataset.rol); setTimeout(commit, 50); break;
    case 'aviso-copiar':
      navigator.clipboard.writeText(textoAviso(sem, parte, el.dataset.rol))
        .then(() => { marcarAvisado(parte, el.dataset.rol); commit(); })
        .catch(() => prompt('Copia el mensaje:', textoAviso(sem, parte, el.dataset.rol)));
      break;
    case 'aviso-quitar': marcarAvisado(parte, el.dataset.rol, null); commit(); break;
    case 'crear-sem': crearSemana(ui.lunes, el.dataset.modo); commit(); break;
    case 'sugerir-vacios': {
      const n = sugerirVacios(sem); commit();
      if (!n) alert('No se encontró a nadie apto para los puestos vacíos. Revisa las asignaciones habilitadas de los publicadores.');
      break;
    }
    case 'vaciar':
      if (confirm('¿Quitar todas las personas asignadas de esta semana?')) { sem.partes.forEach(p => { p.titular = null; p.ayudante = null; }); commit(); }
      break;
    case 'publicar': sem.estado = 'publicada'; commit(); break;
    case 'despublicar': sem.estado = 'borrador'; commit(); break;
    case 'borrar-sem': {
      const nSus = state.sustituciones.filter(x => x.semanaId === sem.id).length;
      if (confirm(`¿Eliminar el programa de esta semana${nSus ? ` y sus ${nSus} sustituciones` : ''}? Desaparecerá del historial.`)) {
        state.semanas = state.semanas.filter(s => s !== sem);
        state.sustituciones = state.sustituciones.filter(x => x.semanaId !== sem.id);
        commit();
      }
      break;
    }
    case 'add-parte': {
      const tipo = el.dataset.tipo;
      const aux = semTieneAux(sem);
      sem.partes.push(nuevaParte(tipo, 'A', tipo === 'discurso_est' ? 'Discurso' : ''));
      if (TIPOS[tipo].salas && aux) sem.partes.push(nuevaParte(tipo, 'B', tipo === 'discurso_est' ? 'Discurso' : ''));
      commit(); break;
    }
    case 'del-parte':
      if (parte) {
        const gem = gemela(sem, parte);
        const ocupada = [parte, gem].some(p => p && (p.titular || p.ayudante));
        if (!ocupada || confirm('Esta parte tiene personas asignadas. ¿Quitarla?')) {
          sem.partes = sem.partes.filter(p => p !== parte && p !== gem); commit();
        }
      }
      break;
    case 'sustituir': case 'elegir': abrirSelector(sem, parte, el.dataset.rol); break;
    case 'toggle-opciones': ui.opcionesAbiertas = !ui.opcionesAbiertas; render(); break;
    case 'ir-avisos': $('#avisos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'ir-s89':
      ui.vista = 'imprimir'; ui.impr = 's89'; ui.mesImprimir = fechaReunion(sem).slice(0, 7); ui.semImprimir = sem.id;
      render(); scrollTo(0, 0); break;
    case 'aviso-marcar': marcarAvisado(parte, el.dataset.rol); commit(); break;
    case 'del-sus':
      if (confirm('¿Borrar este registro de sustitución? (No cambia quién está asignado ahora)')) {
        state.sustituciones = state.sustituciones.filter(x => x.id !== el.dataset.id); commit();
      }
      break;
    case 'nuevo-pub': abrirPublicador(null); break;
    case 'editar-pub': abrirPublicador(el.dataset.id); break;
    case 'hist-tab': ui.hist = el.dataset.tab; render(); break;
    case 'hist-pub': ui.vista = 'historial'; ui.hist = 'detalle'; ui.filtro = { pub: el.dataset.id, cod: '', desde: '', hasta: '' }; render(); break;
    case 'filtro-limpiar': ui.filtro = { pub: '', cod: '', desde: '', hasta: '' }; render(); break;
    case 'imprimir': window.print(); break;
    case 'impr-tab': ui.impr = el.dataset.tab; render(); break;
    case 'exportar': exportar(); break;
    case 'drive-on': conectarDrive(); break;
    case 'drive-off': desconectarDrive(); break;
    case 'drive-sync':
      if (tokenValido()) { sync.error = ''; sincronizar().catch(manejarError); } else conectarDrive();
      break;
    case 'importar-btn': $('#importar').click(); break;
    case 'borrar-todo':
      if (confirm('¿Borrar TODOS los datos (publicadores, semanas e historial)? Descarga antes una copia si la necesitas.') && prompt('Escribe BORRAR para confirmar') === 'BORRAR') {
        state = estadoVacio(); commit();
      }
      break;
  }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'importar' && el.files[0]) { importar(el.files[0]); el.value = ''; return; }
  if (!el.dataset.act || el.closest('dialog')) return;
  const sem = semanaPorLunes(ui.lunes);
  const parte = sem && el.dataset.parte ? sem.partes.find(p => p.id === el.dataset.parte) : null;
  switch (el.dataset.act) {
    case 'sem-fecha': if (el.value) { ui.lunes = lunesDe(el.value); render(); } break;
    case 'sem-ir': if (el.value) { ui.lunes = el.value; render(); } break;
    case 'asignar':
      if (!confirmarNoApto(sem, parte, el.dataset.rol, el.value)) { render(); break; }
      parte[el.dataset.rol] = el.value || null; marcarAvisado(parte, el.dataset.rol, null); commit(); break;
    case 'titulo': {
      parte.titulo = el.value;
      const gem = gemela(sem, parte);
      if (gem) gem.titulo = el.value;
      guardar(); break;
    }
    case 'sala-aux': {
      const quitar = !el.checked;
      const ocupadas = sem.partes.filter(p => p.sala === 'B' && (p.titular || p.ayudante)).length;
      if (quitar && ocupadas && !confirm(`Hay ${ocupadas} partes asignadas en la sala auxiliar. ¿Quitarla igualmente?`)) { render(); break; }
      ponerSalaAux(sem, el.checked); commit(); break;
    }
    case 'lectura-semanal': sem.lecturaSemanal = el.value; guardar(); break;
    case 'cancion': sem.canciones = Object.assign(['', '', ''], sem.canciones || []); sem.canciones[Number(el.dataset.i)] = el.value.trim(); guardar(); break;
    case 'especial':
      if (!ponerEspecial(el.dataset.lunes, el.value || null)) { render(); break; }
      commit(); break;
    case 'especial-dia': {
      const e = especialDe(el.dataset.lunes);
      if (e) { e.dia = Number(el.value); commit(); }
      break;
    }
    case 'sin-reunion': sem.sinReunion = el.checked; commit(); break;
    case 'motivo-sin': sem.motivoSinReunion = el.value; guardar(); break;
    case 'ver-inactivos': ui.verInactivos = el.checked; render(); break;
    case 'est-prog': ui.estProg = el.checked; render(); break;
    case 'filtro': ui.filtro[el.dataset.k] = el.value; render(); break;
    case 'mes-imprimir': if (el.value) { ui.mesImprimir = el.value; ui.semImprimir = ''; render(); } break;
    case 'sem-imprimir': ui.semImprimir = el.value; render(); break;
    case 'drive-client': drive.clientId = el.value.trim(); guardarDrive(); break;
    case 'cfg':
      state.config[el.dataset.k] = el.dataset.num ? Number(el.value) : el.value;
      if (el.dataset.k === 'salas' && state.config.salas == 2 && semanasSinAux().length &&
        confirm(`Hay ${semanasSinAux().length} semanas futuras sin sala auxiliar. ¿Añadírsela ahora?`)) semanasSinAux().forEach(s => ponerSalaAux(s, true));
      commit(); break;
  }
});

let tEscritura = null;
document.addEventListener('input', e => {
  const el = e.target;
  if (['titulo', 'lectura-semanal', 'cancion', 'motivo-sin'].includes(el.dataset.act) && !el.closest('dialog')) {
    clearTimeout(tEscritura);
    tEscritura = setTimeout(() => el.dispatchEvent(new Event('change', { bubbles: true })), 500);
    return;
  }
  if (e.target.dataset.act === 'buscar') {
    ui.buscar = e.target.value;
    render();
    const inp = $('[data-act="buscar"]');
    inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
  }
});

if (DEMO && !state.publicadores.length) { generarDemo(); reiniciarDeshacer(); guardarLocal(); }
aplicarRuta();
render();
