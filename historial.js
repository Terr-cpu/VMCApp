'use strict';
/*
 * Importar historial de asignaciones desde Excel (.xlsx) o CSV.
 * Admite dos formatos:
 *   - "lista":   una fila por asignación (Fecha · Publicador · Parte · Ayudante · Sala · Título)
 *   - "cuadro":  una fila por semana y una columna por parte (Fecha · Presidente · Oración · Lectura · …)
 */

/* ---------- Lectura de archivos ---------- */

function parsearCSV(texto) {
  texto = texto.replace(/^﻿/, '');
  const primera = texto.split(/\r?\n/)[0] || '';
  const sep = [';', ',', '\t'].sort((a, b) => primera.split(b).length - primera.split(a).length)[0];
  const filas = [];
  let fila = [], celda = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(celda); celda = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda); filas.push(fila); fila = []; celda = '';
    } else celda += c;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas;
}

async function leerXLSX(buf) {
  const zip = await leerZip(buf);
  const xml = async n => { const t = await zip.text(n); return t ? new DOMParser().parseFromString(t, 'application/xml') : null; };
  const wb = await xml('xl/workbook.xml');
  if (!wb) throw new Error('No parece un archivo de Excel (.xlsx).');
  const rels = await xml('xl/_rels/workbook.xml.rels');
  const destino = {};
  for (const r of rels?.getElementsByTagName('Relationship') || []) destino[r.getAttribute('Id')] = r.getAttribute('Target');
  const compartidas = [];
  const ss = await xml('xl/sharedStrings.xml');
  for (const si of ss?.getElementsByTagName('si') || []) compartidas.push([...si.getElementsByTagName('t')].map(t => t.textContent).join(''));

  const hojas = [];
  for (const sh of wb.getElementsByTagName('sheet')) {
    const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let ruta = destino[rid] || '';
    ruta = ruta.startsWith('/') ? ruta.slice(1) : 'xl/' + ruta.replace(/^\.\//, '');
    const doc = await xml(ruta);
    if (!doc) continue;
    const filas = [];
    for (const row of doc.getElementsByTagName('row')) {
      const fila = [];
      for (const c of row.getElementsByTagName('c')) {
        const ref = c.getAttribute('r') || '';
        const letras = ref.replace(/\d+/g, '');
        let col = 0;
        for (const ch of letras) col = col * 26 + (ch.charCodeAt(0) - 64);
        const t = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
        let valor;
        if (t === 's') valor = compartidas[Number(v)] ?? '';
        else if (t === 'inlineStr') valor = [...c.getElementsByTagName('t')].map(x => x.textContent).join('');
        else if (t === 'b') valor = v === '1' ? 'VERDADERO' : 'FALSO';
        else valor = v === '' ? '' : (t === 'str' || isNaN(Number(v)) ? v : Number(v));
        fila[(col || fila.length + 1) - 1] = valor;
      }
      filas[Number(row.getAttribute('r') || filas.length + 1) - 1] = fila;
    }
    hojas.push({ nombre: sh.getAttribute('name'), filas: [...filas].map(f => [...(f || [])].map(x => x ?? '')) });
  }
  return hojas;
}

async function leerArchivoTabla(file) {
  const nombreArch = file.name.toLowerCase();
  if (nombreArch.endsWith('.xls')) throw new Error('El formato .xls antiguo no se puede leer. Ábrelo en Excel y guárdalo como .xlsx o CSV.');
  if (nombreArch.endsWith('.xlsx') || nombreArch.endsWith('.xlsm')) return leerXLSX(await file.arrayBuffer());
  return [{ nombre: file.name, filas: parsearCSV(await file.text()) }];
}

/* ---------- Interpretación ---------- */

const norm = s => sinAcentos(String(s ?? '')).replace(/\s+/g, ' ').trim();

function fechaDesde(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = norm(v);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) { const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); return `${y}-${pad(+m[2])}-${pad(+m[1])}`; }
  m = s.match(/(\d{1,2})(?: de)? ([a-z]+)(?:,? (?:de )?(\d{4}))?/);
  if (m) {
    const mes = MESES.findIndex(x => m[2].startsWith(x.slice(0, 3))) + 1;
    if (mes) return `${m[3] || hoyISO().slice(0, 4)}-${pad(mes)}-${pad(+m[1])}`;
  }
  return null;
}

// Traduce el nombre de una parte (columna o celda) a tipo + papel de la app
function parteDesdeTexto(txt) {
  const n = norm(txt);
  if (!n) return null;
  const sala = /\baux|sala (b|2)|\bb$|\(b\)/.test(n) ? 'B' : 'A';
  const r = (tipo, rol = 'titular') => ({ tipo, rol, sala: TIPOS[tipo].salas || tipo === 'consejero_b' ? (tipo === 'consejero_b' ? 'B' : sala) : 'A' });
  if (/servicio|superintendente/.test(n)) return { tipo: 'visita_sc', rol: 'titular', sala: 'A' };
  if (/lector/.test(n)) return r('estudio', 'ayudante');
  if (/ayudante|acompanante/.test(n)) return r('maestros', 'ayudante');
  if (/presid/.test(n)) return r('presidente');
  if (/consejero/.test(n)) return r('consejero_b');
  if (/oracion/.test(n)) return r(/final|cierre|conclus|2/.test(n) ? 'oracion_fin' : 'oracion_ini');
  if (/perla/.test(n)) return r('perlas');
  if (/lectura/.test(n)) return r('lectura');
  if (/estudio|conductor|ebc/.test(n)) return r('estudio');
  if (/tesoro/.test(n)) return r('tesoros');
  if (/analisis|que diria/.test(n)) return r('analisis');
  if (/discurso/.test(n)) return r('discurso_est');
  if (/analisis|que diria/.test(n)) return r('analisis');
  if (/empiece|empecemos|revisita|discipulo|creencia|demostraci|maestros|conversaci|estudiante|asignacion/.test(n)) return r('maestros');
  if (/vida|necesidades|parte/.test(n)) return r('vida');
  return null;
}

function buscarPublicador(texto) {
  const n = norm(texto);
  if (!n) return null;
  const variantes = [n];
  if (n.includes(',')) { const [ap, no] = n.split(',').map(x => x.trim()); variantes.push(`${no} ${ap}`); }
  for (const v of variantes) {
    const exacto = state.publicadores.find(p => norm(p.nombre) === v);
    if (exacto) return exacto;
  }
  for (const v of variantes) {
    const tokens = v.replace(/,/g, ' ').split(' ').filter(Boolean);
    const posibles = state.publicadores.filter(p => { const pn = norm(p.nombre).split(' '); return tokens.every(t => pn.includes(t)); });
    if (posibles.length === 1) return posibles[0];
  }
  return null;
}

const CAMPOS_LISTA = [['fecha', 'Fecha'], ['publicador', 'Publicador'], ['parte', 'Parte / asignación'], ['rol', 'Papel (estudiante, ayudante…)'],
  ['ayudante', 'Ayudante'], ['sala', 'Sala'], ['titulo', 'Título / tema'], ['evento', 'Evento (visita, asamblea)'], ['semanal', 'Lectura bíblica semanal']];

function adivinarCampo(cabecera) {
  const n = norm(cabecera);
  if (/^lectura( biblica)? semanal$|^lectura$/.test(n)) return 'semanal';
  if (/fecha|^semana|^dia/.test(n)) return 'fecha';
  if (/ayudante|acompan/.test(n)) return 'ayudante';
  if (/^sala/.test(n)) return 'sala';
  if (/evento/.test(n)) return 'evento';
  if (/^rol\b|^papel|funcion/.test(n)) return 'rol';
  if (/parte|asignacion|^tipo/.test(n)) return 'parte';
  if (/titulo|tema|leccion/.test(n)) return 'titulo';
  if (/publicador|nombre|hermano|estudiante|asignado|quien/.test(n)) return 'publicador';
  return '';
}

// Un título solo se guarda si aporta algo (no repite el nombre de la parte ni es un hueco como «[sin título]»)
function tituloUtil(titulo, tipo) {
  const t = String(titulo ?? '').trim();
  if (!t || t.startsWith('[') || !TIPOS[tipo]?.titulo) return '';
  const p = parteDesdeTexto(t);
  if (p && p.tipo === tipo && !['maestros', 'analisis'].includes(tipo)) return '';
  return t;
}

// Convierte las filas a asignaciones: [{fecha, tipo, rol, sala, nombre, titulo, ayudante}]
function interpretar(hoja, cfg) {
  const filas = hoja.filas;
  const cab = filas[cfg.fila] || [];
  const datos = filas.slice(cfg.fila + 1);
  const out = [], avisos = new Set();
  if (cfg.formato === 'lista') {
    const col = cfg.lista;
    for (const f of datos) {
      const fecha = fechaDesde(f[col.fecha]);
      const quien = String(f[col.publicador] ?? '').trim();
      if (!fecha || !quien) continue;
      let pt = parteDesdeTexto(f[col.parte]);
      if (col.rol !== '' && col.rol != null) {
        // El papel dice si es estudiante o ayudante; la parte, cuál (lectura, discurso, ¿qué diría?…)
        const pr = parteDesdeTexto(f[col.rol]);
        if (pr && pr.tipo === 'maestros' && pt && ['maestros', 'discurso_est', 'analisis', 'lectura'].includes(pt.tipo)) pt = { ...pt, rol: pr.rol };
        else if (pr) pt = pr;
      }
      if (!pt) { avisos.add(`Parte no reconocida: «${f[col.parte]}»`); continue; }
      if (col.sala !== '' && col.sala != null && /aux|b|2/i.test(String(f[col.sala] ?? '')) && (TIPOS[pt.tipo].salas)) pt.sala = 'B';
      out.push({
        fecha, ...pt, nombre: quien,
        ayudante: col.ayudante !== '' ? String(f[col.ayudante] ?? '').trim() : '',
        titulo: tituloUtil(col.titulo !== '' ? f[col.titulo] : '', pt.tipo),
        evento: col.evento !== '' && col.evento != null ? String(f[col.evento] ?? '').trim() : '',
        semanal: col.semanal !== '' && col.semanal != null ? String(f[col.semanal] ?? '').trim() : '',
      });
    }
  } else {
    for (const f of datos) {
      const fecha = fechaDesde(f[cfg.colFecha]);
      if (!fecha) continue;
      cab.forEach((h, i) => {
        const destino = cfg.columnas[i];
        if (!destino || i === cfg.colFecha) return;
        const valor = String(f[i] ?? '').trim();
        if (!valor || valor === '-' || valor === '—') return;
        const [tipo, rol, sala] = destino.split('|');
        // Una celda puede traer "Titular / Ayudante"
        const partes = valor.split(/\s*[/+&]\s*|\s+y\s+(?=[A-ZÁÉÍÓÚ])/).filter(Boolean);
        if (rol === 'titular' && partes.length === 2 && TIPOS[tipo].ayu) out.push({ fecha, tipo, rol, sala, nombre: partes[0], ayudante: partes[1], titulo: '' });
        else out.push({ fecha, tipo, rol, sala, nombre: valor, ayudante: '', titulo: '' });
      });
    }
  }
  return { asignaciones: out, avisos: [...avisos] };
}

function opcionesDestino() {
  const ops = [['', '— ignorar —']];
  for (const [k, t] of Object.entries(TIPOS)) {
    if (t.fijo) continue;
    const salas = t.salas ? ['A', 'B'] : [k === 'consejero_b' ? 'B' : 'A'];
    for (const sala of salas) {
      const suf = t.salas && sala === 'B' ? ' (sala aux.)' : '';
      const sec = { tesoros: 'Tesoros · ', maestros: 'Maestros · ', vida: 'Vida cristiana · ' }[t.sec] || '';
      ops.push([`${k}|titular|${sala}`, `${sec}${t.label}${t.ayu ? (k === 'estudio' ? ' — conductor' : ' — titular') : ''}${suf}`]);
      if (t.ayu) ops.push([`${k}|ayudante|${sala}`, `${sec}${t.label} — ${t.ayuLabel.toLowerCase()}${suf}`]);
    }
  }
  return ops;
}

/* ---------- Lista de hermanos ---------- */

const esSi = v => /^(si|s|x|1|true|verdadero|yes)$/.test(norm(v));

// Qué asignaciones habilita cada columna de una hoja de hermanos
function codsDesdeCabecera(h, sexo) {
  const n = norm(h);
  if (/estudiantil/.test(n)) return sexo === 'M' ? ['maestros', 'ayudante'] : ['lectura', 'maestros', 'ayudante', 'discurso_est'];
  if (/presid/.test(n)) return ['presidente'];
  if (/consejero/.test(n)) return ['consejero_b'];
  if (/oracion/.test(n)) return ['oracion'];
  if (/tesoro/.test(n)) return ['tesoros'];
  if (/perla/.test(n)) return ['perlas'];
  if (/que diria|analisis/.test(n)) return ['analisis'];
  if (/conductor/.test(n)) return ['estudio_conductor'];
  if (/lector/.test(n)) return ['estudio_lector'];
  if (/vida|necesidades/.test(n)) return ['vida'];
  if (/ayudante/.test(n)) return ['ayudante'];
  if (/lectura/.test(n)) return ['lectura'];
  if (/discurso/.test(n)) return ['discurso_est'];
  return null;
}

function hojaHermanos(hojas) {
  for (const h of hojas) {
    const fila = h.filas.findIndex(f => f.some(c => /^nombre/.test(norm(c))) && f.some(c => /^sexo/.test(norm(c))));
    if (fila < 0 || fila > 5) continue;
    const cab = h.filas[fila];
    const personas = h.filas.slice(fila + 1).filter(f => String(f[cab.findIndex(c => /^nombre/.test(norm(c)))] ?? '').trim());
    if (personas.length) return { hoja: h, fila, cab, personas };
  }
  return null;
}

function leerHermanos(info) {
  const { cab, personas } = info;
  const ix = re => cab.findIndex(c => re.test(norm(c)));
  const iNom = ix(/^nombre/), iSexo = ix(/^sexo/), iPriv = ix(/^privilegio/), iAct = ix(/^activo/), iFam = ix(/^familia/), iNota = ix(/^nota/), iTel = ix(/telefono|movil/);
  return personas.map(f => {
    const nombreP = String(f[iNom]).trim();
    const sx = norm(f[iSexo]);
    const sexo = /^(m|mujer|hermana|f|femenino)/.test(sx) ? 'M' : /^(h|hombre|hermano|v|varon|masculino)/.test(sx) ? 'H' : null;
    const nota = iNota >= 0 ? String(f[iNota] ?? '').trim() : '';
    const cods = new Set();
    cab.forEach((h, i) => { if (esSi(f[i])) (codsDesdeCabecera(h, sexo || 'H') || []).forEach(c => cods.add(c)); });
    if (sexo === 'M') SOLO_VARONES.forEach(c => cods.delete(c));
    const privTxt = iPriv >= 0 ? norm(f[iPriv]) : '';
    let privilegio = /anciano/.test(privTxt) ? 'anciano' : /siervo/.test(privTxt) ? 'siervo' : /no bautizado/.test(privTxt) ? 'no_bautizado' : privTxt ? 'publicador' : '';
    let deducido = false;
    if (!privilegio) {
      deducido = true;
      privilegio = sexo !== 'M' && (cods.has('presidente') || cods.has('estudio_conductor')) ? 'anciano'
        : sexo !== 'M' && ['tesoros', 'perlas', 'vida'].some(c => cods.has(c)) ? 'siervo' : 'publicador';
    }
    const visitante = /superintendente|visitante/i.test(nota);
    return {
      nombre: nombreP, sexo, privilegio, deducido, cods: [...cods], nota, visitante,
      activo: visitante ? false : (iAct >= 0 && String(f[iAct] ?? '').trim() ? !/^no/.test(norm(f[iAct])) : true),
      familia: iFam >= 0 ? String(f[iFam] ?? '').trim() : '',
      telefono: iTel >= 0 ? String(f[iTel] ?? '').trim() : '',
    };
  });
}

// Crea los hermanos que no existan y completa los que ya estén
function aplicarHermanos(lista, sexoPorHistorial) {
  const res = { creados: 0, actualizados: 0, ids: new Set() };
  for (const h of lista) {
    const sexo = h.sexo || sexoPorHistorial(h.nombre) || 'H';
    const existente = buscarPublicador(h.nombre);
    if (existente) {
      existente.asignaciones = [...new Set([...(existente.asignaciones || []), ...h.cods])].filter(c => existente.sexo !== 'M' || !SOLO_VARONES.includes(c));
      if (!existente.familia && h.familia) existente.familia = h.familia;
      if (!existente.telefono && h.telefono) existente.telefono = h.telefono;
      res.actualizados++;
      continue;
    }
    const notas = [h.nota, h.deducido ? 'Privilegio deducido del Excel: revísalo.' : '', !h.sexo ? 'Sexo no indicado en el Excel: revísalo.' : ''].filter(Boolean).join(' ');
    const p = {
      id: uid(), nombre: h.nombre, telefono: h.telefono, sexo, privilegio: sexo === 'M' && ['anciano', 'siervo'].includes(h.privilegio) ? 'publicador' : h.privilegio,
      precursor: false, soloAyudante: h.cods.length === 1 && h.cods[0] === 'ayudante', activo: h.activo,
      asignaciones: h.cods, ausencias: [], notas, familia: h.familia,
    };
    state.publicadores.push(p);
    res.ids.add(p.id);
    res.creados++;
  }
  return res;
}

/* ---------- Aplicar al historial ---------- */

function colocar(sem, tipo, rol, sala, id, titulo) {
  if (tipo === 'oracion_ini' && sem.partes.find(p => p.tipo === 'oracion_ini')?.titular && !sem.partes.find(p => p.tipo === 'oracion_fin')?.titular) tipo = 'oracion_fin';
  const igual = x => x.tipo === tipo && x.sala === sala;
  if (sem.partes.some(x => igual(x) && x[rol] === id)) return 'repetida';
  // El ayudante va con el primer titular de esa parte que aún no tenga ayudante
  let p = rol === 'ayudante'
    ? sem.partes.find(x => igual(x) && x.titular && !x.ayudante) || sem.partes.find(x => igual(x) && !x.ayudante)
    : sem.partes.find(x => igual(x) && !x.titular);
  if (!p) {
    if (['presidente', 'consejero_b', 'oracion_ini', 'oracion_fin', 'tesoros', 'perlas', 'estudio'].includes(tipo) && sem.partes.some(x => x.tipo === tipo && x.sala === sala && x[rol])) return 'ocupada';
    p = nuevaParte(tipo, sala, titulo || (tipo === 'discurso_est' ? 'Discurso' : ''));
    sem.partes.push(p);
  }
  p[rol] = id;
  if (titulo && !p.titulo) p.titulo = titulo;
  return 'ok';
}

function aplicarHistorial(asignaciones, nuevos, idsHabilitar = new Set()) {
  // Crea los publicadores nuevos que se hayan marcado
  const creados = {};
  for (const [n, sexo] of Object.entries(nuevos)) {
    const p = { id: uid(), nombre: n, telefono: '', sexo, privilegio: 'publicador', precursor: false, soloAyudante: false, activo: true, asignaciones: [], ausencias: [], notas: 'Creado al importar el historial', familia: '' };
    p.asignaciones = asignacionesSugeridas(p);
    state.publicadores.push(p);
    creados[norm(n)] = p;
    idsHabilitar.add(p.id);
  }
  const idDe = n => (creados[norm(n)] || buscarPublicador(n))?.id || null;
  const res = { ok: 0, repetidas: 0, ocupadas: 0, sinPublicador: 0, semanasNuevas: 0, visitas: 0 };
  const orden = [...asignaciones].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const especiales = new Map();
  const pendientesLectura = new Map();
  for (const a of orden) {
    const ev = norm(a.evento);
    if (a.tipo === 'visita_sc' || /visita|superintendente/.test(ev)) especiales.set(lunesDe(a.fecha), { tipo: 'visita', dia: fromISO(a.fecha).getDay() });
    else if (/asamblea/.test(ev)) especiales.set(lunesDe(a.fecha), { tipo: 'asamblea', nota: a.evento });
    if (a.semanal) { const s0 = semanaPorLunes(lunesDe(a.fecha)); if (s0 && !s0.lecturaSemanal) s0.lecturaSemanal = a.semanal.toUpperCase(); else if (!s0) pendientesLectura.set(lunesDe(a.fecha), a.semanal.toUpperCase()); }
    if (a.tipo === 'visita_sc') continue;
    const id = idDe(a.nombre);
    if (!id) { res.sinPublicador++; continue; }
    const lunes = lunesDe(a.fecha);
    let sem = semanaPorLunes(lunes);
    if (!sem) {
      sem = { id: uid(), lunes, lecturaSemanal: '', estado: a.fecha < hoyISO() ? 'publicada' : 'borrador', sinReunion: false, motivoSinReunion: '', partes: [], importada: true };
      state.semanas.push(sem);
      res.semanasNuevas++;
    }
    const r = colocar(sem, a.tipo, a.rol, a.sala, id, a.titulo);
    if (r === 'ok') res.ok++; else if (r === 'repetida') res.repetidas++; else res.ocupadas++;
    if (a.ayudante && TIPOS[a.tipo].ayu) {
      const idA = idDe(a.ayudante);
      if (idA) {
        const p = sem.partes.find(x => x.tipo === a.tipo && x.sala === a.sala && x.titular === id && !x.ayudante);
        if (p) { p.ayudante = idA; res.ok++; }
      } else res.sinPublicador++;
    }
    // Los creados en esta importación quedan habilitados para lo que ya han hecho
    const marcar = (pid, rol) => {
      const p = idsHabilitar.has(pid) && pub(pid);
      const cod = codDe({ tipo: a.tipo }, rol);
      if (p && cod && !p.asignaciones.includes(cod) && !(p.sexo === 'M' && SOLO_VARONES.includes(cod))) p.asignaciones.push(cod);
    };
    marcar(id, a.rol);
  }
  state.semanas.sort((a, b) => a.lunes.localeCompare(b.lunes));
  for (const [lunes, l] of pendientesLectura) { const s0 = semanaPorLunes(lunes); if (s0 && !s0.lecturaSemanal) s0.lecturaSemanal = l; }
  for (const [lunes, e] of especiales) {
    if (e.tipo === 'asamblea' && semanaPorLunes(lunes)?.partes.some(p => p.titular)) continue;
    if (!especialDe(lunes)) { ponerEspecial(lunes, e.tipo, e); res.visitas++; }
  }
  // Las semanas creadas desde el historial se ordenan y llevan las partes fijas aunque estén vacías
  for (const sem of state.semanas.filter(x => x.importada)) ordenarPartes(sem);
  return res;
}

/* ---------- Diálogo ---------- */

function abrirImportarHistorial() {
  const d = { hojas: null, hoja: 0, cfg: null, error: '', nuevos: {} };

  const preparar = filaForzada => {
    const h = d.hojas[d.hoja];
    const fila = filaForzada ?? Math.max(0, h.filas.findIndex(f => f.filter(x => String(x).trim()).length >= 2));
    const cab = h.filas[fila] || [];
    const reconocidas = cab.filter(c => parteDesdeTexto(c)).length;
    const lista = Object.fromEntries(CAMPOS_LISTA.map(([k]) => [k, '']));
    cab.forEach((c, i) => { const k = adivinarCampo(c); if (k && lista[k] === '') lista[k] = i; });
    // «Parte / tema» sirve a la vez de parte y de título
    if (lista.titulo === '' && lista.parte !== '' && /tema|titulo/.test(norm(cab[lista.parte]))) lista.titulo = lista.parte;
    const columnas = cab.map(c => { const p = parteDesdeTexto(c); return p && !/fecha/.test(norm(c)) ? `${p.tipo}|${p.rol}|${p.sala}` : ''; });
    const colFecha = cab.findIndex(c => /fecha|semana/.test(norm(c)));
    d.cfg = { fila, formato: reconocidas >= 3 ? 'cuadro' : 'lista', lista, columnas, colFecha: colFecha < 0 ? 0 : colFecha };
  };

  const pintar = () => {
    let html = `<h2>Importar historial desde Excel o CSV</h2>`;
    if (!d.hojas) {
      html += `<p class="small muted" style="margin-top:0">Sirve tanto una tabla con <b>una fila por asignación</b> (fecha, publicador, parte, ayudante…) como el <b>cuadrante</b> con una fila por semana y una columna por parte. Después podrás revisar cómo se interpreta cada columna antes de importar.</p>
        <input type="file" id="h-file" accept=".xlsx,.xlsm,.csv,.txt,text/csv">`;
    } else {
      const h = d.hojas[d.hoja], cab = h.filas[d.cfg.fila] || [];
      const colOps = (sel, vacia = true) => `${vacia ? '<option value="">—</option>' : ''}${cab.map((c, i) => `<option value="${i}" ${String(sel) === String(i) ? 'selected' : ''}>${esc(c || `Columna ${i + 1}`)}</option>`).join('')}`;
      const { asignaciones, avisos } = interpretar(h, d.cfg);
      const nombres = [...new Set(asignaciones.filter(a => a.tipo !== 'visita_sc').flatMap(a => [a.nombre, a.ayudante]).filter(Boolean))];
      const deHermanos = d.conHermanos ? new Set(leerHermanos(d.hermanos).map(x => norm(x.nombre))) : new Set();
      const sinCasar = nombres.filter(n => !buscarPublicador(n) && !deHermanos.has(norm(n)));
      const fechas = asignaciones.map(a => a.fecha).sort();
      html += `<div class="form-grid">
        ${d.hojas.length > 1 ? `<label class="field"><span>Hoja</span><select id="h-hoja">${d.hojas.map((x, i) => `<option value="${i}" ${i === d.hoja ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label>` : ''}
        <label class="field"><span>Formato</span><select id="h-formato">
          <option value="lista" ${d.cfg.formato === 'lista' ? 'selected' : ''}>Una fila por asignación</option>
          <option value="cuadro" ${d.cfg.formato === 'cuadro' ? 'selected' : ''}>Cuadrante: una fila por semana</option></select></label>
        <label class="field"><span>Fila de encabezados</span><input type="number" id="h-fila" min="1" value="${d.cfg.fila + 1}"></label>
      </div>`;
      if (d.cfg.formato === 'lista') {
        html += `<div class="form-grid" style="margin-top:10px">${CAMPOS_LISTA.map(([k, v]) => `<label class="field"><span>${v}${['fecha', 'publicador', 'parte'].includes(k) ? ' *' : ''}</span><select class="h-campo" data-k="${k}">${colOps(d.cfg.lista[k])}</select></label>`).join('')}</div>`;
      } else {
        const ops = opcionesDestino();
        html += `<label class="field" style="margin-top:10px"><span>Columna de la fecha</span><select id="h-colfecha">${colOps(d.cfg.colFecha, false)}</select></label>
          <div class="tabla-wrap" style="margin-top:8px"><table><thead><tr><th>Columna del archivo</th><th>Se importa como</th></tr></thead><tbody>
          ${cab.map((c, i) => i === d.cfg.colFecha ? '' : `<tr><td>${esc(c || `Columna ${i + 1}`)}</td><td><select class="h-col" data-i="${i}">${ops.map(([k, v]) => `<option value="${k}" ${d.cfg.columnas[i] === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('')}
          </tbody></table></div>`;
      }
      if (d.hermanos) {
        const lista = leerHermanos(d.hermanos);
        const nuevosH = lista.filter(x => !buscarPublicador(x.nombre)).length;
        html += `<label class="row" style="margin-top:12px;align-items:flex-start"><input type="checkbox" id="h-hermanos" ${d.conHermanos ? 'checked' : ''}>
          <span>Importar también la lista de hermanos de la hoja «${esc(d.hermanos.hoja.nombre)}»: <b>${lista.length}</b> personas (${nuevosH} nuevas) con sexo, familia y lo que puede hacer cada una.
          <span class="small muted">Si no indica el privilegio, se deduce (presidente o conductor → anciano; tesoros, perlas o vida cristiana → siervo) y queda anotado para revisarlo.</span></span></label>`;
      }
      html += `<div class="card" style="margin:14px 0 0;padding:12px">
        <b>${asignaciones.length}</b> asignaciones${fechas.length ? ` del ${fechaCorta(fechas[0])} al ${fechaCorta(fechas[fechas.length - 1])}` : ''} · ${nombres.length} personas
        ${avisos.length ? `<div class="small" style="color:var(--warn);margin-top:6px">${avisos.slice(0, 5).map(esc).join('<br>')}${avisos.length > 5 ? `<br>… y ${avisos.length - 5} más` : ''}</div>` : ''}
        ${sinCasar.length ? `<div style="margin-top:10px"><span class="small muted">No están en la lista de publicadores. Marca los que quieras crear (si no, sus filas se saltan):</span>
          <div class="checks" style="margin-top:6px">${sinCasar.map(n => `<label><input type="checkbox" class="h-nuevo" data-n="${esc(n)}" ${d.nuevos[n] ? 'checked' : ''}> ${esc(n)}
            <select class="h-sexo" data-n="${esc(n)}"><option value="H" ${d.nuevos[n] !== 'M' ? 'selected' : ''}>H</option><option value="M" ${d.nuevos[n] === 'M' ? 'selected' : ''}>M</option></select></label>`).join('')}</div></div>` : ''}
      </div>`;
    }
    if (d.error) html += `<p class="badge danger" style="white-space:normal">${esc(d.error)}</p>`;
    html += `<div class="dlg-foot"><span>${d.hojas ? '<button data-dlg="otro">← Otro archivo</button>' : ''}</span><span class="row">
      <button data-dlg="cerrar">Cancelar</button>${d.hojas ? '<button class="primary" data-dlg="ok">Importar al historial</button>' : ''}</span></div>`;
    $('#dlg-body').innerHTML = html;
  };

  dlgHandler = accion => {
    if (accion === 'cerrar') return cerrarDialogo();
    if (accion === 'otro') { d.hojas = null; d.error = ''; return pintar(); }
    if (accion !== 'ok') return;
    const { asignaciones } = interpretar(d.hojas[d.hoja], d.cfg);
    if (!asignaciones.length) { d.error = 'No hay ninguna fila válida con esta configuración.'; return pintar(); }
    // Si casi todas las fechas caen en el mismo día y no es el configurado, se propone cambiarlo
    const dias = {};
    for (const a of asignaciones) { const w = fromISO(a.fecha).getDay(); dias[w] = (dias[w] || 0) + 1; }
    const [diaTop, nTop] = Object.entries(dias).sort((a, b) => b[1] - a[1])[0];
    if (Number(diaTop) !== state.config.diaReunion && nTop / asignaciones.length > .8 &&
      confirm(`Casi todas las fechas del archivo son ${DIAS[diaTop]}, pero la app tiene la reunión el ${DIAS[state.config.diaReunion]}. ¿Cambiar el día de la reunión a ${DIAS[diaTop]}?`)) {
      state.config.diaReunion = Number(diaTop);
    }
    let rh = null;
    if (d.hermanos && d.conHermanos) {
      // Para quien no tenga sexo en la lista, se deduce de si ha hecho partes solo de varones
      const sexoPorHistorial = n => asignaciones.some(a => norm(a.nombre) === norm(n) && (SOLO_VARONES.includes(codDe({ tipo: a.tipo }, a.rol)) || a.tipo === 'visita_sc')) ? 'H' : null;
      rh = aplicarHermanos(leerHermanos(d.hermanos), sexoPorHistorial);
    }
    const r = aplicarHistorial(asignaciones, d.nuevos, rh?.ids);
    cerrarDialogo(); commit();
    alert(`Historial importado.\n\n${rh ? `${rh.creados} hermanos creados${rh.actualizados ? ` y ${rh.actualizados} completados` : ''}.\n` : ''}${r.visitas ? `${r.visitas} ${r.visitas === 1 ? 'semana marcada' : 'semanas marcadas'} como visita del superintendente.\n` : ''}${r.ok} asignaciones añadidas${r.semanasNuevas ? ` (${r.semanasNuevas} ${r.semanasNuevas === 1 ? 'semana nueva' : 'semanas nuevas'})` : ''}.` +
      `${r.repetidas ? `\n${r.repetidas} ya estaban y se han saltado.` : ''}` +
      `${r.ocupadas ? `\n${r.ocupadas} no se pusieron porque ese puesto ya tenía a otra persona.` : ''}` +
      `${r.sinPublicador ? `\n${r.sinPublicador} se saltaron porque la persona no está en la lista.` : ''}`);
  };

  $('#dlg-body').onchange = async e => {
    const el = e.target;
    try {
      if (el.id === 'h-file' && el.files[0]) {
        d.hojas = (await leerArchivoTabla(el.files[0])).filter(h => h.filas.length);
        if (!d.hojas.length) throw new Error('El archivo está vacío.');
        const pref = d.hojas.findIndex(h => /historial|asignaciones/i.test(h.nombre));
        d.hoja = pref >= 0 ? pref : d.hojas.reduce((m, h, i, a) => h.filas.length > a[m].filas.length ? i : m, 0);
        d.hermanos = hojaHermanos(d.hojas);
        d.conHermanos = !!d.hermanos;
        d.error = ''; d.nuevos = {}; preparar();
      }
      else if (el.id === 'h-hoja') { d.hoja = Number(el.value); preparar(); }
      else if (el.id === 'h-formato') d.cfg.formato = el.value;
      else if (el.id === 'h-fila') { const f = d.cfg.formato; preparar(Math.max(0, Number(el.value) - 1)); d.cfg.formato = f; }
      else if (el.classList.contains('h-campo')) d.cfg.lista[el.dataset.k] = el.value === '' ? '' : Number(el.value);
      else if (el.id === 'h-colfecha') d.cfg.colFecha = Number(el.value);
      else if (el.classList.contains('h-col')) d.cfg.columnas[Number(el.dataset.i)] = el.value;
      else if (el.classList.contains('h-nuevo')) { const n = el.dataset.n; if (el.checked) d.nuevos[n] = document.querySelector(`.h-sexo[data-n="${CSS.escape(n)}"]`).value; else delete d.nuevos[n]; }
      else if (el.classList.contains('h-sexo')) { const n = el.dataset.n; if (d.nuevos[n]) d.nuevos[n] = el.value; return; }
      else if (el.id === 'h-hermanos') d.conHermanos = el.checked;
    } catch (err) { d.error = err.message; }
    pintar();
  };
  pintar();
  $('#dlg').showModal();
}
