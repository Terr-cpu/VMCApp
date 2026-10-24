'use strict';

/* ================= Constantes ================= */

const KEY = 'vmcapp:v1';

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
};
const SOLO_VARONES = ['presidente', 'consejero_b', 'oracion', 'tesoros', 'perlas', 'lectura',
  'discurso_est', 'vida', 'estudio_conductor', 'estudio_lector'];

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
  analisis:     { sec: 'maestros', orden: 1, label: 'Análisis con el auditorio', cod: 'vida', titulo: true },
  vida:         { sec: 'vida',     orden: 1, label: 'Parte', cod: 'vida', titulo: true },
  estudio:      { sec: 'vida',     orden: 2, label: 'Estudio bíblico de la congregación', cod: 'estudio_conductor', ayu: 'estudio_lector', ayuLabel: 'Lector', titulo: true },
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
    config: { congregacion: '', diaReunion: 4, salas: 1, partesMaestros: 3, partesVida: 1, prefijo: '34', minSemanas: 2 },
    publicadores: [],
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
const fechaReunionDeLunes = l => addDias(l, (state.config.diaReunion + 6) % 7);
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
    return { p, motivos, avisos, dMisma, dCualquiera, carga, score };
  }).sort((a, b) => b.score - a.score || a.p.nombre.localeCompare(b.p.nombre, 'es'));
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
        if (parte[rol] || (rol === 'ayudante' && (!TIPOS[parte.tipo].ayu || !parte.titular))) continue;
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
const huecos = sem => sem.sinReunion ? 0 : sem.partes.reduce((n, p) => n + (p.titular ? 0 : 1) + (TIPOS[p.tipo].ayu && !p.ayudante ? 1 : 0), 0);

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

function plantilla() {
  const c = state.config, P = [];
  const conSalas = (tipo, titulo = '') => {
    P.push(nuevaParte(tipo, 'A', titulo));
    if (c.salas == 2) P.push(nuevaParte(tipo, 'B', titulo));
  };
  P.push(nuevaParte('presidente'));
  if (c.salas == 2) P.push(nuevaParte('consejero_b', 'B'));
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
    partes = prev ? prev.partes.map(p => nuevaParte(p.tipo, p.sala, ['maestros', 'discurso_est'].includes(p.tipo) ? p.titulo : '')) : plantilla();
  } else partes = plantilla();
  const sem = { id: uid(), lunes, lecturaSemanal: '', estado: 'borrador', sinReunion: false, motivoSinReunion: '', partes };
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
}

function renderAviso() {
  const el = $('#aviso');
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
      <p class="small">Plantilla: ${state.config.partesMaestros} partes de «Seamos mejores maestros», ${state.config.partesVida} de «Nuestra vida cristiana»${state.config.salas == 2 ? ', con sala auxiliar' : ''} (cámbialo en Ajustes). La sala auxiliar también se puede activar en cada semana.</p>
    </div>`;
    return html;
  }

  const publicada = sem.estado === 'publicada';
  const ents = entradas();
  const vacios = huecos(sem);
  const problemas = problemasSemana(sem);

  html += `<div class="card">
    <div class="row between">
      <div class="row">
        <span class="badge ${publicada ? 'ok' : 'warn'}">${publicada ? 'Publicada' : 'Borrador'}</span>
        <span class="muted small">Reunión: ${fechaLarga(fechaReunion(sem))}</span>
        ${!sem.sinReunion && vacios ? `<span class="badge gray">${vacios} sin asignar</span>` : ''}
      </div>
      <div class="row">
        ${!sem.sinReunion && !publicada ? `<button data-act="sugerir-vacios">✨ Sugerir vacíos</button><button data-act="vaciar">Vaciar</button>` : ''}
        ${publicada ? `<button data-act="despublicar">Volver a borrador</button>` : `<button class="primary" data-act="publicar">Publicar</button>`}
        <button class="danger" data-act="borrar-sem">Eliminar</button>
      </div>
    </div>
    <div class="row" style="margin-top:12px">
      <label class="field grow"><span>Lectura bíblica semanal</span>
        <input data-act="lectura-semanal" value="${esc(sem.lecturaSemanal)}" placeholder="p. ej. ISAÍAS 58, 59"></label>
      ${sem.sinReunion ? '' : `<label class="row" style="margin-top:18px" title="Añade o quita las partes de estudiante de la sala auxiliar en esta semana"><input type="checkbox" data-act="sala-aux" ${semTieneAux(sem) ? 'checked' : ''} ${publicada ? 'disabled' : ''}> Sala auxiliar</label>`}
      <label class="row" style="margin-top:18px"><input type="checkbox" data-act="sin-reunion" ${sem.sinReunion ? 'checked' : ''}> Sin reunión</label>
      ${sem.sinReunion ? `<label class="field grow"><span>Motivo</span><input data-act="motivo-sin" value="${esc(sem.motivoSinReunion)}" placeholder="Asamblea, visita del superintendente…"></label>` : ''}
    </div>
    ${publicada ? `<p class="small muted" style="margin:10px 0 0">La semana está publicada: los cambios de personas se registran como <b>sustituciones</b> en el historial.</p>` : ''}
    ${problemas.length ? `<div class="problemas">${problemas.map(x => `<div>⚠ ${esc(x)}</div>`).join('')}</div>` : ''}
  </div>`;

  if (sem.sinReunion) return html;

  html += `<div class="card"><datalist id="dl-maestros">${SUBTIPOS_MAESTROS.map(s => `<option value="${s}">`).join('')}<option value="Discurso"></datalist>`;
  for (const [sec, secLabel] of SECCIONES) {
    const partes = partesOrdenadas(sem).filter(p => TIPOS[p.tipo].sec === sec);
    const add = {
      maestros: `<span class="row"><button class="small" data-act="add-parte" data-tipo="maestros">+ Demostración</button><button class="small" data-act="add-parte" data-tipo="discurso_est">+ Discurso</button></span>`,
      vida: `<button class="small" data-act="add-parte" data-tipo="vida">+ Parte</button>`,
    }[sec] || '';
    html += `<div class="sec-head sec-${sec}"><span>${secLabel}</span>${add}</div>`;
    // Las partes de la sala auxiliar con gemela se dibujan junto a la principal
    const visibles = partes.filter(p => !(p.sala === 'B' && TIPOS[p.tipo].salas && gemela(sem, p)));
    html += visibles.map(p => filaParte(sem, p, publicada, ents)).join('') || `<p class="muted small">Sin partes.</p>`;
  }
  html += `</div>`;

  html += tarjetaAvisos(sem);

  const subs = state.sustituciones.filter(x => x.semanaId === sem.id);
  if (subs.length) {
    html += `<div class="card"><h3>Sustituciones de esta semana</h3>${tablaSustituciones(subs)}</div>`;
  }
  return html;
}

function filaParte(sem, p, publicada, ents) {
  const t = TIPOS[p.tipo];
  const gem = p.sala === 'A' ? gemela(sem, p) : null;
  const salaBadge = p.sala === 'B' ? `<span class="badge warn">Sala aux.</span>` : '';
  const borrable = ['maestros', 'discurso_est', 'analisis', 'vida'].includes(p.tipo);
  const titulo = t.titulo
    ? `<input class="titulo" data-act="titulo" data-parte="${p.id}" value="${esc(p.titulo)}" placeholder="Tema / referencia" ${p.tipo === 'maestros' ? 'list="dl-maestros"' : ''}>`
    : '<div></div>';
  const bloque = x => {
    const slots = [slot(sem, x, 'titular', t.ayu ? (p.tipo === 'estudio' ? 'Conductor' : 'Titular') : '', publicada, ents)];
    if (t.ayu) slots.push(slot(sem, x, 'ayudante', t.ayuLabel, publicada, ents));
    return slots.join('');
  };
  const cuerpo = gem
    ? `<div class="sala-blk"><span class="sala-tag">Sala principal</span>${bloque(p)}</div><div class="sala-blk aux"><span class="sala-tag">Sala auxiliar</span>${bloque(gem)}</div>`
    : bloque(p);
  return `<div class="parte">
    <div class="p-tipo">${p.num ? `<span class="muted">${p.num}.</span> ` : ''}${t.label}${salaBadge}
      ${p.min || p.leccion ? `<div class="small muted">${[p.min ? p.min + ' min' : '', p.leccion ? 'lección ' + esc(p.leccion.replace(/^lecci[óo]n /, '')) : ''].filter(Boolean).join(' · ')}</div>` : ''}</div>
    ${titulo}
    <div class="p-slots">${cuerpo}</div>
    <div>${borrable && !publicada ? `<button class="icon small danger" data-act="del-parte" data-parte="${p.id}" title="Quitar parte">✕</button>` : ''}</div>
  </div>`;
}

function slot(sem, p, rol, label, publicada, ents) {
  const lab = label ? `<label>${label}</label>` : '';
  if (publicada && p[rol]) {
    return `<div class="slot">${lab}<div class="fijo">${esc(nombre(p[rol]))}</div>
      <button class="small" data-act="sustituir" data-parte="${p.id}" data-rol="${rol}">Sustituir</button></div>`;
  }
  return `<div class="slot">${lab}<select data-act="asignar" data-parte="${p.id}" data-rol="${rol}">${opcionesSelect(sem, p, rol, ents)}</select>
    <button class="small icon" data-act="candidatos" data-parte="${p.id}" data-rol="${rol}" title="Ver candidatos y por qué">🔍</button></div>`;
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
  const pendientes = lista.filter(a => !a.parte.avisos?.[a.rol]).length;
  return `<div class="card">
    <div class="row between"><h3 style="margin:0">Avisos</h3>
      <span class="badge ${pendientes ? 'warn' : 'ok'}">${pendientes ? `${pendientes} sin avisar` : 'Todos avisados'}</span></div>
    <div class="tabla-wrap" style="margin-top:8px"><table><tbody>${lista.map(a => {
      const p = pub(a.id);
      const av = a.parte.avisos?.[a.rol];
      const tel = telefonoWa(p?.telefono);
      const url = `https://wa.me/${tel}?text=${encodeURIComponent(textoAviso(sem, a.parte, a.rol))}`;
      return `<tr>
        <td><b>${esc(nombre(a.id))}</b>${tel ? '' : ' <span class="small muted">(sin teléfono)</span>'}</td>
        <td class="small">${TIPOS[a.parte.tipo].label}${a.rol === 'ayudante' ? ` (${TIPOS[a.parte.tipo].ayuLabel.toLowerCase()})` : ''}</td>
        <td>${av ? `<span class="badge ok">Avisado ${fechaCorta(av.slice(0, 10)).slice(0, 5)}</span>` : '<span class="badge gray">Pendiente</span>'}</td>
        <td class="row" style="justify-content:flex-end">
          <a class="btn small" href="${url}" target="_blank" rel="noopener" data-act="aviso-wa" data-parte="${a.parte.id}" data-rol="${a.rol}">WhatsApp</a>
          <button class="small" data-act="aviso-copiar" data-parte="${a.parte.id}" data-rol="${a.rol}">Copiar</button>
          ${av ? `<button class="small icon" data-act="aviso-quitar" data-parte="${a.parte.id}" data-rol="${a.rol}" title="Marcar como pendiente">↺</button>` : ''}
        </td></tr>`;
    }).join('')}</tbody></table></div></div>`;
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
      <span>${nuevo ? '' : `<button class="danger" data-dlg="borrar">Eliminar</button> <button data-dlg="ver-hist">Ver historial</button>`}</span>
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
    else if (accion === 'ver-hist') {
      cerrarDialogo(); ui.vista = 'historial'; ui.hist = 'detalle'; ui.filtro = { pub: p.id, cod: '', desde: '', hasta: '' }; render();
    }
    else if (accion === 'ok') {
      if (!p.nombre) { alert('Escribe el nombre.'); return; }
      if (p.sexo === 'M') {
        p.asignaciones = p.asignaciones.filter(c => !SOLO_VARONES.includes(c));
        if (['anciano', 'siervo'].includes(p.privilegio)) p.privilegio = 'publicador';
      }
      if (p.soloAyudante) p.asignaciones = ['ayudante'];
      p.ausencias = p.ausencias.filter(a => a.desde);
      if (nuevo) state.publicadores.push(p);
      else state.publicadores[state.publicadores.findIndex(x => x.id === p.id)] = p;
      cerrarDialogo(); commit();
    }
    else if (accion === 'cerrar') cerrarDialogo();
  };
  pintar();
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
  let html = `<div class="subtabs">${tabs.map(([k, v]) => `<button data-act="hist-tab" data-tab="${k}" class="${ui.hist === k ? 'on' : ''}">${v}</button>`).join('')}</div>`;
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
  return { presidente: 'Pres', consejero_b: 'Cons', oracion: 'Orac', tesoros: 'Tes', perlas: 'Perl', lectura: 'Lect', maestros: 'Dem', ayudante: 'Ayud', discurso_est: 'Disc', vida: 'Vida', estudio_conductor: 'EBC', estudio_lector: 'Lector' }[c];
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
    <button data-act="impr-tab" data-tab="programa" class="${ui.impr !== 's89' ? 'on' : ''}">Programa del mes</button>
    <button data-act="impr-tab" data-tab="s89" class="${ui.impr === 's89' ? 'on' : ''}">Hojas de asignación (S-89)</button></div>`;
  return tabs + (ui.impr === 's89' ? imprS89(sems) : imprPrograma(sems));
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
  return `<div class="card row no-print">
    <label class="row">Mes <input type="month" data-act="mes-imprimir" value="${ui.mesImprimir}"></label>
    <select data-act="sem-imprimir"><option value="">Todas las semanas</option>
      ${sems.map(s => `<option value="${s.id}" ${ui.semImprimir === s.id ? 'selected' : ''}>${rangoSemana(s.lunes)}</option>`).join('')}</select>
    <button class="primary" data-act="imprimir" ${hojas.length ? '' : 'disabled'}>🖨 Imprimir / Guardar PDF</button>
    <span class="muted small">${hojas.length} hojas${sinAsignar ? ` · ${sinAsignar} partes de estudiante sin asignar` : ''}</span>
  </div>
  ${hojas.length ? `<div class="s89-grid">${hojas.join('')}</div>` : `<div class="card empty">No hay partes de estudiante asignadas en este periodo.</div>`}`;
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
    ${p.leccion ? `<div class="linea"><b>Lección:</b> <span>${esc(p.leccion)}</span></div>` : ''}
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

  return `<div class="card row no-print">
    <label class="row">Mes <input type="month" data-act="mes-imprimir" value="${mes}"></label>
    <button class="primary" data-act="imprimir" ${sems.length ? '' : 'disabled'}>🖨 Imprimir / Guardar PDF</button>
    <span class="muted small">${sems.length} semanas · ${sems.filter(s => s.estado !== 'publicada' && !s.sinReunion).length} en borrador</span>
  </div>
  ${sems.length ? `<div class="hoja">
    <h1>Programa de la reunión Vida y Ministerio Cristiano</h1>
    <div class="sub">${esc(c.congregacion)}${c.congregacion ? ' · ' : ''}${MESES[m - 1]} ${y}</div>
    ${sems.map(bloque).join('')}
  </div>` : `<div class="card empty">No hay semanas creadas en este mes.</div>`}`;
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
        <option value="2" ${c.salas == 2 ? 'selected' : ''}>Principal + auxiliar (por defecto en semanas nuevas)</option></select></label>
      <label class="field"><span>Prefijo telefónico del país (WhatsApp)</span><input data-act="cfg" data-k="prefijo" value="${esc(c.prefijo)}" placeholder="34"></label>
      <label class="field"><span>Semanas mínimas entre partes de una misma persona</span><input type="number" min="0" max="12" data-act="cfg" data-k="minSemanas" data-num="1" value="${c.minSemanas ?? 2}"></label>
      <label class="field"><span>Partes de «Seamos mejores maestros» por defecto</span><input type="number" min="1" max="6" data-act="cfg" data-k="partesMaestros" data-num="1" value="${c.partesMaestros}"></label>
      <label class="field"><span>Partes de «Nuestra vida cristiana» por defecto</span><input type="number" min="1" max="4" data-act="cfg" data-k="partesVida" data-num="1" value="${c.partesVida}"></label>
    </div>
    <p class="small muted">La plantilla solo afecta a las semanas que crees a partir de ahora.</p>
  </div>
  ${tarjetaDrive()}
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
function abrirDialogo(html, onOk) {
  $('#dlg-body').innerHTML = html;
  $('#dlg-body').onchange = null;
  dlgHandler = accion => {
    if (accion === 'ok') { if (onOk() !== false) cerrarDialogo(); }
    else if (accion === 'cerrar') cerrarDialogo();
  };
  $('#dlg').showModal();
}
function cerrarDialogo() { $('#dlg').close(); dlgHandler = null; }
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
  if (drive.conectado && hayCambiosLocales() && tokenValido()) { sincronizar().catch(() => { }); e.preventDefault(); }
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
    case 'sustituir': abrirSustitucion(sem, parte, el.dataset.rol); break;
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
    case 'sin-reunion': sem.sinReunion = el.checked; commit(); break;
    case 'motivo-sin': sem.motivoSinReunion = el.value; guardar(); break;
    case 'ver-inactivos': ui.verInactivos = el.checked; render(); break;
    case 'est-prog': ui.estProg = el.checked; render(); break;
    case 'filtro': ui.filtro[el.dataset.k] = el.value; render(); break;
    case 'mes-imprimir': if (el.value) { ui.mesImprimir = el.value; ui.semImprimir = ''; render(); } break;
    case 'sem-imprimir': ui.semImprimir = el.value; render(); break;
    case 'drive-client': drive.clientId = el.value.trim(); guardarDrive(); break;
    case 'cfg': state.config[el.dataset.k] = el.dataset.num ? Number(el.value) : el.value; commit(); break;
  }
});

document.addEventListener('input', e => {
  if (e.target.dataset.act === 'buscar') {
    ui.buscar = e.target.value;
    render();
    const inp = $('[data-act="buscar"]');
    inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
  }
});

render();
