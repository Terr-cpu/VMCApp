'use strict';
/* Importación del programa desde la Guía de actividades (EPUB de jw.org). */

const JW_API = 'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS';

// Número de la Guía (bimestral, meses impares) que corresponde a una fecha: '202611'
function numeroGuia(iso) {
  const [y, m] = iso.split('-').map(Number);
  return `${y}${pad(m % 2 ? m : m - 1)}`;
}
function nombreGuia(num) {
  const y = num.slice(0, 4), m = Number(num.slice(4));
  return `${MESES[m - 1]} y ${MESES[m % 12]} de ${y}`;
}
function guiaSiguiente(num, n) {
  let y = Number(num.slice(0, 4)), m = Number(num.slice(4)) + 2 * n;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  return `${y}${pad(m)}`;
}

// Pregunta a jw.org por el enlace del EPUB (esta API sí permite llamadas desde el navegador)
async function enlaceGuia(num) {
  const r = await fetch(`${JW_API}?pub=mwb&issue=${num}&fileformat=EPUB&output=json&langwritten=S&alllangs=0`);
  if (r.status === 404) throw new Error('Esa Guía todavía no está publicada en jw.org.');
  if (!r.ok) throw new Error('jw.org respondió ' + r.status);
  const j = await r.json();
  const f = j.files?.S?.EPUB?.[0];
  if (!f) throw new Error('No se encontró el EPUB en jw.org.');
  return { url: f.file.url, tam: f.filesize, titulo: j.pubName };
}

/* ---------- Lector ZIP mínimo (EPUB = ZIP) ---------- */

async function leerZip(buf) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('El archivo no es un EPUB válido.');
  const total = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const files = {};
  const dec = new TextDecoder();
  for (let k = 0; k < total; k++) {
    const nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
    const name = dec.decode(new Uint8Array(buf, off + 46, nlen));
    files[name] = { method: dv.getUint16(off + 10, true), csize: dv.getUint32(off + 20, true), loff: dv.getUint32(off + 42, true) };
    off += 46 + nlen + elen + clen;
  }
  return {
    names: Object.keys(files),
    async text(name) {
      const f = files[name];
      if (!f) return null;
      const start = f.loff + 30 + dv.getUint16(f.loff + 26, true) + dv.getUint16(f.loff + 28, true);
      const data = new Uint8Array(buf, start, f.csize);
      if (f.method === 0) return dec.decode(data);
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return dec.decode(await new Response(stream).arrayBuffer());
    },
  };
}

/* ---------- Análisis de la Guía ---------- */

const limpiar = s => (s || '').replace(/[\s  ]+/g, ' ').trim();
const sinAcentos = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mesNum = s => { const n = sinAcentos(s).replace('setiembre', 'septiembre'); return MESES.indexOf(n) + 1; };

async function parsearGuia(buf) {
  const zip = await leerZip(buf);
  const opfName = zip.names.find(n => n.endsWith('.opf'));
  if (!opfName) throw new Error('El EPUB no tiene índice (content.opf).');
  const opf = await zip.text(opfName);
  const titulo = limpiar((opf.match(/<dc:title>([^<]*)/) || [])[1]);
  if (!/actividades|vida y ministerio/i.test(titulo)) throw new Error(`Este EPUB no parece una Guía de actividades («${titulo || 'sin título'}»).`);
  const anio = Number((titulo.match(/(\d{4})/) || [])[1]) || new Date().getFullYear();
  const base = opfName.replace(/[^/]*$/, '');
  const attr = (tag, a) => (tag.match(new RegExp(`\\b${a}="([^"]*)"`)) || [])[1];
  const items = Object.fromEntries([...opf.matchAll(/<item\b[^>]*>/g)].map(m => [attr(m[0], 'id'), attr(m[0], 'href')]));
  const spine = [...opf.matchAll(/<itemref\b[^>]*>/g)].map(m => items[attr(m[0], 'idref')]).filter(Boolean);

  const semanas = [];
  for (const href of spine) {
    if (/extracted|cover|toc/i.test(href)) continue;
    const html = await zip.text(base + href);
    if (!html) continue;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sem = parsearSemana(doc, anio);
    if (sem) semanas.push(sem);
  }
  if (!semanas.length) throw new Error('No se encontraron semanas en el EPUB.');
  return { titulo, semanas };
}

function parsearSemana(doc, anio) {
  const h1 = limpiar(doc.querySelector('h1')?.textContent).toUpperCase();
  const m = h1.match(/^(\d{1,2})(?: DE ([A-ZÁÉÍÓÚ]+))?(?: DE (\d{4}))? ?(?:-|–|A) ?(\d{1,2}) DE ([A-ZÁÉÍÓÚ]+)(?: DE (\d{4}))?/);
  if (!m) return null;
  const mesFin = mesNum(m[5]);
  const mesIni = m[2] ? mesNum(m[2]) : mesFin;
  const anioFin = Number(m[6]) || anio;
  const anioIni = Number(m[3]) || (mesIni > mesFin ? anioFin - 1 : anioFin);
  if (!mesIni || !mesFin) return null;
  const lunes = lunesDe(`${anioIni}-${pad(mesIni)}-${pad(Number(m[1]))}`);
  const lectura = limpiar(doc.querySelector('header h2')?.textContent);

  const partes = [];
  const canciones = [];
  let sec = null;
  for (const h of doc.querySelectorAll('h2, h3')) {
    const txt = limpiar(h.textContent);
    if (h.tagName === 'H2') {
      if (/TESOROS/i.test(txt)) sec = 'tesoros';
      else if (/MAESTROS/i.test(txt)) sec = 'maestros';
      else if (/VIDA CRISTIANA/i.test(txt)) sec = 'vida';
      continue;
    }
    const can = h.tagName === 'H3' && !/^\d+\./.test(txt) && txt.match(/Canci[óo]n (\d+)/i);
    if (can) { canciones.push(can[1]); continue; }
    const n = txt.match(/^(\d+)\.\s*(.+)$/);
    if (!n || !sec) continue;
    const num = Number(n[1]), nombreParte = n[2];
    // Detalle: el texto del bloque que sigue al título, p. ej. "(4 mins.) Jer 52:6-20 (th lección 5)."
    let det = '';
    for (let el = h.nextElementSibling; el && !/^H[123]$/.test(el.tagName); el = el.nextElementSibling) {
      det = limpiar(el.textContent);
      if (/\(\d+ ?min/i.test(det)) break;
    }
    const mm = det.match(/\((\d+) ?min[^)]*\)\s*(.*)/i);
    const min = mm ? Number(mm[1]) : null;
    const resto = mm ? mm[2] : '';
    const parte = { tipo: null, titulo: nombreParte, num, min };

    if (sec === 'tesoros') {
      if (/perlas/i.test(nombreParte)) { parte.tipo = 'perlas'; parte.titulo = ''; }
      else if (/lectura de la biblia/i.test(nombreParte)) { parte.tipo = 'lectura'; parte.titulo = resto.replace(/\s*\(th[^)]*\)\.?$/, '').replace(/\.$/, ''); parte.leccion = (resto.match(/\(th ([^)]*)\)/) || [])[1]; }
      else parte.tipo = 'tesoros';
    } else if (sec === 'maestros') {
      if (/^discurso$/i.test(nombreParte)) {
        parte.tipo = 'discurso_est';
        const t = resto.match(/T[íi]tulo: (.*?)(?: \(th [^)]*\))?\.?$/);
        parte.titulo = t ? t[1] : 'Discurso';
        parte.leccion = (resto.match(/\(th ([^)]*)\)/) || [])[1];
      } else if (/an[áa]lisis con el auditorio/i.test(resto)) {
        parte.tipo = 'analisis';
      } else {
        parte.tipo = 'maestros';
        const escena = resto.match(/^([A-ZÁÉÍÓÚÑ ]{6,})\./);
        if (escena) parte.titulo += ' · ' + escena[1].charAt(0) + escena[1].slice(1).toLowerCase();
        parte.leccion = (resto.match(/\((?:lmd|th) ([^)]*)\)\.?$/) || [])[1];
      }
    } else if (sec === 'vida') {
      if (/estudio b[íi]blico de la congregaci[óo]n/i.test(nombreParte)) { parte.tipo = 'estudio'; parte.titulo = resto.replace(/\.$/, ''); }
      else parte.tipo = 'vida';
    }
    if (parte.tipo) partes.push(parte);
  }
  if (!partes.length) return null;
  return { lunes, lectura, partes, canciones: canciones.slice(0, 3) };
}

// Convierte una semana de la Guía en partes de la app (con sala auxiliar si procede)
function partesDesdeGuia(g, dos = state.config.salas == 2) {
  const P = [nuevaParte('presidente')];
  if (dos) P.push(nuevaParte('consejero_b', 'B'));
  P.push(nuevaParte('oracion_ini'));
  for (const x of g.partes) {
    const salas = TIPOS[x.tipo].salas && dos ? ['A', 'B'] : ['A'];
    for (const sala of salas) P.push({ ...nuevaParte(x.tipo, sala, x.titulo), num: x.num, min: x.min, leccion: x.leccion || '' });
  }
  P.push(nuevaParte('oracion_fin'));
  return P;
}

// Crea la semana o actualiza su programa conservando las personas ya asignadas
function aplicarSemanaGuia(g) {
  const sem = semanaPorLunes(g.lunes);
  const nuevas = partesDesdeGuia(g, sem ? semTieneAux(sem) : state.config.salas == 2);
  if (!sem) {
    const s = { id: uid(), lunes: g.lunes, lecturaSemanal: g.lectura, canciones: g.canciones, estado: 'borrador', sinReunion: false, motivoSinReunion: '', partes: nuevas };
    aplicarEspecial(s);
    state.semanas.push(s);
    state.semanas.sort((a, b) => a.lunes.localeCompare(b.lunes));
    return { nueva: true, perdidas: [] };
  }
  const usadas = new Set();
  for (const np of nuevas) {
    const v = sem.partes.find(p => !usadas.has(p) && p.tipo === np.tipo && p.sala === np.sala);
    if (!v) continue;
    usadas.add(v);
    Object.assign(np, { id: v.id, titular: v.titular, ayudante: v.ayudante, avisos: v.avisos });
  }
  const perdidas = sem.partes.filter(p => !usadas.has(p) && (p.titular || p.ayudante));
  sem.partes = nuevas;
  sem.lecturaSemanal = g.lectura;
  if (g.canciones?.length) sem.canciones = g.canciones;
  aplicarEspecial(sem);
  return { nueva: false, perdidas };
}

/* ---------- Diálogo de importación ---------- */

function abrirImportarGuia() {
  const actual = numeroGuia(fechaReunionDeLunes(ui.lunes));
  const d = { num: actual, enlace: null, error: '', cargando: false, guia: null, sel: new Set() };

  const pintar = () => {
    let html = `<h2>Importar programa de jw.org</h2>`;
    if (!d.guia) {
      html += `
      <p class="small muted" style="margin-top:0">jw.org no deja que la app descargue el archivo directamente: pulsa «Descargar EPUB» y después cárgalo aquí. Tarda unos segundos.</p>
      <div class="form-grid">
        <label class="field"><span>Guía de actividades</span><select id="g-num">
          ${[-1, 0, 1, 2].map(i => guiaSiguiente(actual, i)).map(n => `<option value="${n}" ${n === d.num ? 'selected' : ''}>${nombreGuia(n)}</option>`).join('')}
        </select></label>
        <div class="field"><span>&nbsp;</span>
          ${d.enlace ? `<a class="btn primary" href="${esc(d.enlace.url)}" target="_blank" rel="noopener">⬇ Descargar EPUB (${(d.enlace.tam / 1048576).toFixed(1)} MB)</a>`
            : `<button data-dlg="buscar" ${d.cargando ? 'disabled' : ''}>${d.cargando ? 'Buscando…' : '1. Buscar en jw.org'}</button>`}
        </div>
        <label class="field full"><span>${d.enlace ? '2. ' : ''}Cargar el EPUB descargado (mwb_S_….epub)</span><input type="file" id="g-file" accept=".epub,application/epub+zip"></label>
      </div>
      ${d.error ? `<p class="badge danger" style="white-space:normal">${esc(d.error)}</p>` : ''}`;
    } else {
      html += `<p style="margin-top:0"><b>${esc(d.guia.titulo)}</b><br><span class="small muted">Marca las semanas que quieres traer. En las que ya existen se mantienen las personas asignadas.</span></p>
      <div class="tabla-wrap"><table><tbody>${d.guia.semanas.map((s, i) => {
        const ex = semanaPorLunes(s.lunes);
        return `<tr><td><input type="checkbox" class="g-sem" data-i="${i}" ${d.sel.has(i) ? 'checked' : ''}></td>
          <td><b>${rangoSemana(s.lunes)}</b><div class="small muted">${esc(s.lectura)}</div></td>
          <td class="small">${s.partes.filter(p => ['maestros', 'discurso_est', 'analisis'].includes(p.tipo)).map(p => esc(p.titulo.split(' · ')[0])).join(', ')}</td>
          <td>${ex ? `<span class="badge ${ex.estado === 'publicada' ? 'ok' : 'warn'}">ya existe${ex.estado === 'publicada' ? ' · publicada' : ''}</span>` : '<span class="badge">nueva</span>'}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    }
    html += `<div class="dlg-foot"><span>${d.guia ? `<button data-dlg="otra">← Otro archivo</button>` : ''}</span><span class="row">
      <button data-dlg="cerrar">Cancelar</button>
      ${d.guia ? `<button class="primary" data-dlg="ok">Importar ${d.sel.size} semanas</button>` : ''}</span></div>`;
    $('#dlg-body').innerHTML = html;
  };

  dlgHandler = async (accion) => {
    if (accion === 'cerrar') return cerrarDialogo();
    if (accion === 'otra') { d.guia = null; d.error = ''; return pintar(); }
    if (accion === 'buscar') {
      d.cargando = true; d.error = ''; pintar();
      try { d.enlace = await enlaceGuia(d.num); } catch (e) { d.error = e.message.includes('fetch') ? 'No hay conexión con jw.org.' : e.message; }
      d.cargando = false; pintar();
    }
    if (accion === 'ok') {
      const elegidas = [...d.sel].map(i => d.guia.semanas[i]);
      if (!elegidas.length) return;
      const publicadas = elegidas.filter(g => semanaPorLunes(g.lunes)?.estado === 'publicada');
      if (publicadas.length && !confirm(`${publicadas.length} de las semanas ya están publicadas. Se actualizarán los títulos de las partes manteniendo a los asignados. ¿Seguir?`)) return;
      const avisos = [];
      for (const g of elegidas) {
        const r = aplicarSemanaGuia(g);
        if (r.perdidas.length) avisos.push(`${rangoSemana(g.lunes)}: ${r.perdidas.map(p => `${TIPOS[p.tipo].label} (${[nombre(p.titular), nombre(p.ayudante)].filter(Boolean).join(' / ')})`).join(', ')}`);
      }
      ui.lunes = elegidas[0].lunes;
      cerrarDialogo(); commit();
      if (avisos.length) alert('Estas personas estaban en partes que ya no existen en el programa nuevo y han quedado sin asignar:\n\n' + avisos.join('\n'));
    }
  };

  $('#dlg-body').onchange = async e => {
    if (e.target.id === 'g-num') { d.num = e.target.value; d.enlace = null; d.error = ''; pintar(); }
    if (e.target.id === 'g-file' && e.target.files[0]) {
      try {
        d.guia = await parsearGuia(await e.target.files[0].arrayBuffer());
        d.sel = new Set(d.guia.semanas.map((s, i) => i));
        d.error = '';
      } catch (err) { d.error = 'No se pudo leer: ' + err.message; }
      pintar();
    }
    if (e.target.classList.contains('g-sem')) {
      const i = Number(e.target.dataset.i);
      e.target.checked ? d.sel.add(i) : d.sel.delete(i);
      pintar();
    }
  };
  pintar();
  $('#dlg').showModal();
}
