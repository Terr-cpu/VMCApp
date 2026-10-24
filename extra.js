'use strict';
/* Semanas especiales, hoja del presidente, calendario (.ics) y modo demostración. */

/* ================= Semanas especiales ================= */

const ESPECIALES = {
  visita: { label: 'Visita del superintendente de circuito', sinReunion: false },
  asamblea: { label: 'Asamblea', sinReunion: true },
  conmemoracion: { label: 'Conmemoración', sinReunion: true },
  otro: { label: 'Otro motivo (sin reunión)', sinReunion: true },
};

const especialDe = lunes => (state.especiales || []).find(e => e.lunes === lunes) || null;

// Día de la reunión de una semana: el de la visita si lo tiene, si no el habitual
function diaReunionDe(lunes) {
  const e = especialDe(lunes);
  return e?.tipo === 'visita' && e.dia != null && e.dia !== '' ? Number(e.dia) : state.config.diaReunion;
}

function aplicarEspecial(sem) {
  const e = especialDe(sem.lunes);
  const tieneVisita = sem.partes.some(p => p.tipo === 'visita_sc');
  if (e && ESPECIALES[e.tipo]?.sinReunion) {
    sem.sinReunion = true;
    sem.motivoSinReunion = e.nota || ESPECIALES[e.tipo].label;
    sem.porEspecial = true;
  } else if (sem.porEspecial) {
    sem.sinReunion = false;
    sem.motivoSinReunion = '';
    delete sem.porEspecial;
  }
  if (e?.tipo === 'visita' && !tieneVisita) {
    // En la visita, el discurso del superintendente sustituye al estudio bíblico de la congregación
    sem.partes = sem.partes.filter(p => p.tipo !== 'estudio');
    sem.partes.push({ ...nuevaParte('visita_sc', 'A', e.nota || 'Discurso de servicio'), min: 30 });
  } else if (e?.tipo !== 'visita' && tieneVisita) {
    sem.partes = sem.partes.filter(p => p.tipo !== 'visita_sc');
    sem.partes.push(nuevaParte('estudio'));
  }
}

function ponerEspecial(lunes, tipo, extra = {}) {
  state.especiales = (state.especiales || []).filter(e => e.lunes !== lunes);
  if (tipo) state.especiales.push({ id: uid(), lunes, tipo, dia: tipo === 'visita' ? (extra.dia ?? 2) : null, nota: extra.nota || '' });
  state.especiales.sort((a, b) => a.lunes.localeCompare(b.lunes));
  const sem = semanaPorLunes(lunes);
  if (sem) {
    const estudio = sem.partes.find(p => p.tipo === 'estudio');
    if (tipo === 'visita' && estudio && (estudio.titular || estudio.ayudante) &&
      !confirm('Esta semana ya tiene asignado el estudio bíblico. Con la visita se sustituye por el discurso del superintendente y esas asignaciones se quitan. ¿Seguir?')) {
      state.especiales = state.especiales.filter(e => e.lunes !== lunes);
      return false;
    }
    aplicarEspecial(sem);
  }
  return true;
}

function selectorEspecial(lunes) {
  const e = especialDe(lunes);
  return `<label class="field"><span>Semana especial</span><select data-act="especial" data-lunes="${lunes}">
    <option value="">Normal</option>
    ${Object.entries(ESPECIALES).map(([k, v]) => `<option value="${k}" ${e?.tipo === k ? 'selected' : ''}>${v.label}</option>`).join('')}
  </select></label>
  ${e?.tipo === 'visita' ? `<label class="field"><span>Día de la reunión esa semana</span><select data-act="especial-dia" data-lunes="${lunes}">
    ${[1, 2, 3, 4, 5].map(d => `<option value="${d}" ${Number(e.dia) === d ? 'selected' : ''}>${DIAS[d]}</option>`).join('')}</select></label>` : ''}`;
}

function tarjetaEspeciales() {
  const lista = (state.especiales || []).filter(e => e.lunes >= addDias(lunesDe(hoyISO()), -28));
  return `<div class="card">
    <h2>Semanas especiales</h2>
    <p class="small muted" style="margin-top:0">Márcalas con antelación: al crear o importar esa semana se ajusta sola (sin reunión por asamblea, o discurso del superintendente en lugar del estudio y cambio de día en la visita).</p>
    ${lista.length ? `<table><tbody>${lista.map(e => `<tr>
      <td><b>${rangoSemana(e.lunes)}</b></td>
      <td>${ESPECIALES[e.tipo]?.label ?? e.tipo}${e.tipo === 'visita' && e.dia != null ? ` · reunión el ${DIAS[e.dia]}` : ''}${e.nota ? ` <span class="muted small">${esc(e.nota)}</span>` : ''}</td>
      <td style="text-align:right"><button class="small icon danger" data-act="esp-quitar" data-lunes="${e.lunes}" title="Quitar">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted small">No hay ninguna marcada.</p>'}
    <div class="row" style="margin-top:10px">
      <input type="date" id="esp-fecha" title="Cualquier día de esa semana">
      <select id="esp-tipo">${Object.entries(ESPECIALES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
      <input id="esp-nota" placeholder="Nota (opcional)" class="grow">
      <button class="primary" data-act="esp-add">+ Añadir</button>
    </div>
  </div>`;
}

/* ================= Hoja del presidente ================= */

const MIN_DEF = { tesoros: 10, perlas: 10, lectura: 4, maestros: 4, discurso_est: 5, analisis: 5, vida: 15, estudio: 30, visita_sc: 30 };
const hhmm = t => `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;

function nombresParte(s, p) {
  const t = TIPOS[p.tipo];
  if (t.fijo) return 'Superintendente de circuito';
  const uno = x => [nombre(x.titular), t.ayu ? nombre(x.ayudante) : ''].filter(Boolean).join(' / ') || '—';
  if (p.tipo === 'estudio') return `${nombre(p.titular) || '—'}${p.ayudante ? ` · Lector: ${nombre(p.ayudante)}` : ''}`;
  const gem = p.sala === 'A' ? gemela(s, p) : null;
  return gem ? `${uno(p)}  ·  Aux.: ${uno(gem)}` : uno(p);
}

// Calcula la hora de comienzo de cada momento de la reunión
function horario(s) {
  const [h, m] = (state.config.horaReunion || '19:00').split(':').map(Number);
  let t = h * 60 + m;
  const filas = [];
  const add = (min, label, quien, sec, extra = {}) => { filas.push({ ini: t, min, label, quien, sec, ...extra }); t += min; };
  const can = s.canciones || [];
  const partes = partesOrdenadas(s).filter(p => !(p.sala === 'B' && TIPOS[p.tipo].salas && gemela(s, p)) && p.tipo !== 'consejero_b');
  const de = tipo => partes.find(p => p.tipo === tipo);
  const pres = nombre(de('presidente')?.titular);
  add(5, `Canción${can[0] ? ' ' + can[0] : ''} y oración`, nombre(de('oracion_ini')?.titular), 'inicio');
  add(1, 'Palabras de introducción', pres, 'inicio');
  let cancionMedio = false;
  for (const p of partes) {
    const tp = TIPOS[p.tipo];
    if (!['tesoros', 'maestros', 'vida'].includes(tp.sec)) continue;
    if (tp.sec === 'vida' && !cancionMedio) { add(3, `Canción${can[1] ? ' ' + can[1] : ''}`, '', 'vida'); cancionMedio = true; }
    add(p.min || MIN_DEF[p.tipo] || 5, `${p.num ? p.num + '. ' : ''}${tp.label}${p.titulo ? ': ' + p.titulo : ''}`, nombresParte(s, p), tp.sec, { parte: true });
    if (PARTES_ESTUDIANTE.includes(p.tipo)) add(1, 'Consejo', pres, tp.sec, { consejo: true });
  }
  add(3, 'Palabras de conclusión', pres, 'cierre');
  add(5, `Canción${can[2] ? ' ' + can[2] : ''} y oración`, nombre(de('oracion_fin')?.titular), 'cierre');
  return { filas, fin: t };
}

function imprPresidente(sems) {
  const elegidas = (ui.semImprimir ? sems.filter(s => s.id === ui.semImprimir) : sems).filter(s => !s.sinReunion);
  const hoja = s => {
    const { filas, fin } = horario(s);
    const pres = nombre(s.partes.find(p => p.tipo === 'presidente')?.titular);
    const cons = nombre(s.partes.find(p => p.tipo === 'consejero_b')?.titular);
    return `<div class="hoja hoja-pres">
      <div class="pres-cab">
        <div><h1>Reunión Vida y Ministerio Cristiano</h1>
          <div class="sub">${fechaLarga(fechaReunion(s))} · ${esc(s.lecturaSemanal)}</div></div>
        <div class="pres-quien"><span>Presidente</span><b>${esc(pres) || '—'}</b>${cons ? `<span>Consejero sala aux.</span><b>${esc(cons)}</b>` : ''}</div>
      </div>
      <table class="pres-tabla">
        <thead><tr><th>Hora</th><th>Min</th><th>Parte</th><th>Asignados</th><th>Real</th></tr></thead>
        <tbody>${filas.map(f => `<tr class="${f.consejo ? 'consejo' : ''} ${f.parte ? 'ps-' + f.sec : ''}">
          <td class="hora">${hhmm(f.ini)}</td><td class="min">${f.min}</td>
          <td>${esc(f.label)}</td><td>${esc(f.quien)}</td><td class="real"></td></tr>`).join('')}</tbody>
      </table>
      <p class="pres-fin">Termina a las <b>${hhmm(fin)}</b> · ${fin - filas[0].ini} minutos en total</p>
    </div>`;
  };
  const sinCanciones = elegidas.filter(s => !(s.canciones || []).some(Boolean)).length;
  return `<div class="card row no-print">
    <label class="row">Mes <input type="month" data-act="mes-imprimir" value="${ui.mesImprimir}"></label>
    <select data-act="sem-imprimir"><option value="">Todas las semanas</option>
      ${sems.map(s => `<option value="${s.id}" ${ui.semImprimir === s.id ? 'selected' : ''}>${rangoSemana(s.lunes)}</option>`).join('')}</select>
    <label class="row small">Empieza a las <input type="time" data-act="cfg" data-k="horaReunion" value="${state.config.horaReunion || '19:00'}"></label>
    <button class="primary" data-act="imprimir" ${elegidas.length ? '' : 'disabled'}>🖨 Imprimir / Guardar PDF</button>
    ${sinCanciones ? `<span class="muted small">${sinCanciones} semanas sin números de canción (se rellenan al importar de jw.org o en cada semana)</span>` : ''}
  </div>
  ${elegidas.length ? `<div class="pres-lista">${elegidas.map(hoja).join('')}</div>` : `<div class="card empty">No hay reuniones en este periodo.</div>`}`;
}

/* ================= Calendario (.ics) ================= */

function icsTexto(v) { return String(v ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
function icsPlegar(linea) {
  const out = [];
  while (linea.length > 73) { out.push(linea.slice(0, 73)); linea = ' ' + linea.slice(73); }
  out.push(linea);
  return out.join('\r\n');
}

function eventosICS(ents, conNombre) {
  const [h, m] = (state.config.horaReunion || '19:00').split(':').map(Number);
  const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return ents.map(e => {
    const t = TIPOS[e.tipo];
    const f = e.fecha.replace(/-/g, '');
    const que = `${t?.label ?? e.tipo}${e.rol === 'ayudante' ? ` (${t.ayuLabel.toLowerCase()})` : ''}${e.sala === 'B' ? ' · sala auxiliar' : ''}`;
    const resumen = `VMC: ${que}${conNombre ? ' — ' + nombre(e.pub) : ''}`;
    const desc = [e.titulo, e.companero ? `Con ${nombre(e.companero)}` : '', state.config.congregacion].filter(Boolean).join('\n');
    return [
      'BEGIN:VEVENT',
      `UID:${e.sem.id}-${e.tipo}-${e.sala}-${e.rol}-${e.pub}@vmcapp`,
      `DTSTAMP:${sello}`,
      `DTSTART:${f}T${pad(h)}${pad(m)}00`,
      'DURATION:PT1H45M',
      `SUMMARY:${icsTexto(resumen)}`,
      desc ? `DESCRIPTION:${icsTexto(desc)}` : '',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsTexto(resumen)}`, 'TRIGGER:-P1D', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsTexto(resumen)}`, 'TRIGGER:-PT2H', 'END:VALARM',
      'END:VEVENT',
    ].filter(Boolean).map(icsPlegar).join('\r\n');
  });
}

function descargarICS(ents, archivo, conNombre) {
  if (!ents.length) { alert('No hay asignaciones para exportar.'); return; }
  const cal = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cuadrante VMC//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsTexto('Reunión VMC' + (state.config.congregacion ? ' · ' + state.config.congregacion : ''))}`,
    ...eventosICS(ents, conNombre), 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([cal], { type: 'text/calendar;charset=utf-8' }));
  a.download = archivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const asignadasDesdeHoy = () => entradas().filter(e => e.estado === 'asignada' && e.fecha >= hoyISO());

function icsPublicador(id) {
  const p = pub(id);
  const slug = (p?.nombre || 'publicador').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  descargarICS(asignadasDesdeHoy().filter(e => e.pub === id), `vmc-${slug}.ics`, false);
}
function icsMes(mes) {
  descargarICS(entradas().filter(e => e.estado === 'asignada' && e.fecha.slice(0, 7) === mes), `vmc-${mes}.ics`, true);
}

/* ================= Modo demostración ================= */

function generarDemo() {
  const s = estadoVacio();
  state = s;
  s.config.congregacion = 'Congregación de ejemplo';
  s.config.salas = 2;
  const H = ['Juan Pérez García:anciano:Pérez', 'Luis Gómez Ortega:anciano', 'Raúl Soto Marín:anciano:Soto', 'Jorge Vidal Cruz:anciano:Vidal',
    'Pedro Ruiz León:siervo:Ruiz', 'Marcos Díaz Prieto:siervo', 'Iván Torres Nieto:siervo', 'Andrés León Sanz:publicador:León',
    'Pablo Mora Gil:publicador:Mora', 'Tomás Gil Romero:no_bautizado', 'Sergio Prieto Vega:publicador', 'Daniel Rey Castro:publicador', 'Hugo Peña Alonso:publicador'];
  const M = ['Ana Pérez Lozano:publicador:Pérez', 'Marta Sanz Iglesias:publicador', 'Lucía Vega Molina:publicador', 'Rosa Cano Herrera:no_bautizado',
    'Elena Ríos Navarro:publicador', 'Carmen Soto Rubio:publicador:Soto', 'Laura Ruiz Campos:publicador:Ruiz', 'Sara León Fuentes:publicador:León',
    'Inés Mora Calvo:publicador:Mora', 'Clara Vidal Serrano:publicador:Vidal', 'Nuria Gil Domínguez:publicador', 'Pilar Ramos Vázquez:publicador', 'Teresa Lara Méndez:publicador'];
  const mk = (def, sexo) => {
    const [nombreP, priv, familia] = def.split(':');
    const p = { id: uid(), nombre: nombreP, telefono: '', sexo, privilegio: priv, precursor: false, soloAyudante: false, activo: true, asignaciones: [], ausencias: [], notas: '', familia: familia || '' };
    p.asignaciones = asignacionesSugeridas(p);
    s.publicadores.push(p);
  };
  H.forEach(d => mk(d, 'H'));
  M.forEach(d => mk(d, 'M'));
  const porNombre = n => s.publicadores.find(p => p.nombre.startsWith(n));
  Object.assign(porNombre('Pilar Ramos'), { soloAyudante: true, asignaciones: ['ayudante'] });
  porNombre('Teresa Lara').sala = 'A';
  porNombre('Elena Ríos').precursor = true;
  porNombre('Hugo Peña').ausencias = [{ desde: addDias(hoyISO(), 7), hasta: addDias(hoyISO(), 30), motivo: 'Viaje' }];

  const temas = ['Confiemos en Jehová en tiempos difíciles', 'La humildad nos acerca a Dios', 'Seamos leales como Rut', 'Jehová cumple sus promesas',
    'El valor de la paciencia', 'Cuidemos nuestra amistad con Jehová', 'Imitemos la fe de Abrahán', 'La oración nos da fuerzas', 'Perdonemos de corazón',
    'Mantengámonos despiertos', 'Animémonos unos a otros', 'Agradezcamos el rescate', 'Busquemos primero el Reino', 'Hablemos con valor'];
  const vida = ['Necesidades de la congregación', 'Cómo ayudar a los mayores', 'Usemos bien las publicaciones', 'Lo que aprendemos de los jóvenes'];
  const libros = ['ISAÍAS', 'JEREMÍAS', 'EZEQUIEL', 'DANIEL', 'OSEAS', 'JOEL', 'AMÓS'];
  const base = lunesDe(hoyISO());
  const inicio = addDias(base, -7 * 8);
  ponerEspecial(addDias(base, 7 * 3), 'visita', { dia: 2 });
  ponerEspecial(addDias(base, 7 * 6), 'asamblea', { nota: 'Asamblea de circuito' });
  for (let i = 0; i < 15; i++) {
    const l = addDias(inicio, 7 * i);
    const sem = crearSemana(l, 'plantilla');
    sem.lecturaSemanal = `${libros[i % libros.length]} ${i * 2 + 1}, ${i * 2 + 2}`;
    sem.canciones = [String(10 + (i * 7) % 140), String(20 + (i * 11) % 130), String(30 + (i * 13) % 120)];
    let n = 1;
    for (const p of partesOrdenadas(sem)) {
      if (p.sala === 'B') continue;
      if (['tesoros', 'perlas', 'lectura', 'maestros', 'discurso_est', 'vida', 'estudio'].includes(p.tipo)) p.num = n++;
      if (p.tipo === 'tesoros') p.titulo = temas[i % temas.length];
      if (p.tipo === 'lectura') { p.titulo = `${libros[i % libros.length].charAt(0) + libros[i % libros.length].slice(1, 3).toLowerCase()} ${i * 2 + 1}:1-12`; p.leccion = `lección ${(i % 12) + 1}`; }
      if (p.tipo === 'vida') p.titulo = vida[i % vida.length];
      if (p.tipo === 'estudio') p.titulo = `lfb lección ${40 + i}`;
      const gem = gemela(sem, p);
      if (gem) Object.assign(gem, { num: p.num, titulo: p.titulo, leccion: p.leccion });
    }
  }
  for (const sem of state.semanas) {
    sugerirVacios(sem);
    if (sem.lunes < base) {
      sem.estado = 'publicada';
      for (const a of asignacionesDe(sem)) marcarAvisado(a.parte, a.rol, sem.lunes + 'T10:00:00.000Z');
    }
  }
  // Algunas sustituciones en semanas pasadas
  const motivos = ['Enfermedad', 'Viaje', 'Trabajo', 'Enfermedad', 'Asuntos familiares'];
  state.semanas.filter(x => x.estado === 'publicada' && !x.sinReunion).slice(1, 6).forEach((sem, i) => {
    const p = sem.partes.find(x => x.tipo === 'maestros' && x.titular);
    if (!p) return;
    const c = candidatos(sem, { ...p, titular: null }, 'titular').find(c => !c.motivos.length);
    if (!c) return;
    state.sustituciones.push({ id: uid(), registrado: sem.lunes + 'T12:00:00.000Z', semanaId: sem.id, parteId: p.id, tipo: p.tipo, titulo: p.titulo, sala: p.sala, rol: 'titular', cod: 'maestros', original: p.titular, sustituto: c.p.id, motivo: motivos[i] });
    p.titular = c.p.id;
  });
  state.ultimoRespaldo = new Date().toISOString();
  return state;
}

// Rutas en la dirección (#vista/sub/mes) para abrir directamente una pantalla
function aplicarRuta() {
  const [vista, a, b] = decodeURIComponent(location.hash.slice(1)).split('/');
  if (!vista) return;
  if (['cuadrante', 'publicadores', 'historial', 'estadisticas', 'imprimir', 'ajustes'].includes(vista)) ui.vista = vista;
  if (vista === 'imprimir') {
    if (a) ui.impr = a;
    if (/^\d{4}-\d{2}$/.test(b || '')) ui.mesImprimir = b;
  }
  if (vista === 'cuadrante' && a === 'mes') { ui.modo = 'mes'; if (b) ui.mes = b; }
  else if (vista === 'cuadrante' && /^\d{4}-\d{2}-\d{2}$/.test(a || '')) ui.lunes = lunesDe(a);
  if (vista === 'estadisticas' && a) ui.estPeriodo = a;
}
