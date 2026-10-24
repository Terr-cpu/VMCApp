'use strict';
/* Sincronización con Google Drive (scope drive.file: la app solo ve los archivos que ella crea). */

const DRIVE_KEY = 'vmcapp:drive';
const DRIVE_ARCHIVO = 'cuadrante-vmc.json';
const DRIVE_CARPETA = 'Cuadrante VMC';
// Mismo cliente OAuth que Agenda JW; su origen https://<usuario>.github.io sirve para ambas apps
const CLIENT_ID_DEF = '989709837307-449de0hk767r7lplvjfc4ilfb6smnpfd.apps.googleusercontent.com';
const API = 'https://www.googleapis.com';

let drive = (() => { try { return JSON.parse(localStorage.getItem(DRIVE_KEY)) || {}; } catch { return {}; } })();
const sync = { token: null, exp: 0, estado: '', ocupado: false, timer: null, error: '' };

function guardarDrive() { try { localStorage.setItem(DRIVE_KEY, JSON.stringify(drive)); } catch { } }
const tokenValido = () => sync.token && Date.now() < sync.exp;
const hayCambiosLocales = () => !!state.modificado && state.modificado !== drive.subido;
const driveDisponible = () => location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);

function cargarGIS() {
  return new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => res();
    s.onerror = () => rej(new Error('No se pudo cargar el inicio de sesión de Google.'));
    document.head.appendChild(s);
  });
}

async function pedirToken(prompt) {
  await cargarGIS();
  return new Promise((res, rej) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: drive.clientId || CLIENT_ID_DEF,
      scope: `${API}/auth/drive.file`,
      callback: r => {
        if (r.error) return rej(new Error(r.error_description || r.error));
        sync.token = r.access_token;
        sync.exp = Date.now() + (Number(r.expires_in) - 60) * 1000;
        res();
      },
      error_callback: e => rej(new Error(e.type === 'popup_closed' ? 'Se cerró la ventana de Google.' : (e.message || e.type))),
    });
    client.requestAccessToken({ prompt });
  });
}

async function gfetch(url, opt = {}) {
  if (!tokenValido()) throw new Error('sesion');
  const r = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + sync.token } });
  if (r.status === 401) { sync.token = null; throw new Error('sesion'); }
  if (r.status === 404) { const e = new Error('no encontrado'); e.status = 404; throw e; }
  if (!r.ok) throw new Error(`Drive ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return r;
}

function setSync(estado, error = '') {
  sync.estado = estado;
  sync.error = error;
  pintarSync();
}

function pintarSync() {
  const b = $('#sync');
  if (!b) return;
  if (!drive.conectado) { b.hidden = true; return; }
  b.hidden = false;
  b.className = 'sync';
  if (sync.ocupado) b.textContent = '☁ Sincronizando…';
  else if (sync.error) { b.textContent = '☁ Error — reintentar'; b.classList.add('err'); b.title = sync.error; }
  else if (!tokenValido()) { b.textContent = hayCambiosLocales() ? '☁ Cambios sin subir — conectar' : '☁ Conectar Drive'; b.classList.add('pend'); }
  else if (hayCambiosLocales()) { b.textContent = '☁ Cambios pendientes…'; b.classList.add('pend'); }
  else b.textContent = '☁ Guardado en Drive' + (drive.ultimaSync ? ' · ' + new Date(drive.ultimaSync).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '');
}

// Se llama tras cada cambio: sube a Drive pasados unos segundos
function programarSubida() {
  if (!drive.conectado) return;
  clearTimeout(sync.timer);
  pintarSync();
  if (!tokenValido()) return;
  sync.timer = setTimeout(() => sincronizar().catch(manejarError), 2500);
}

function manejarError(e) {
  sync.ocupado = false;
  if (e.message === 'sesion') setSync('', '');
  else setSync('', e.message);
}

async function conectarDrive() {
  if (!driveDisponible()) { alert('Google Drive solo funciona con la app publicada en https (GitHub Pages) o en localhost, no abriendo el archivo directamente.'); return; }
  try {
    sync.ocupado = true; setSync('');
    await pedirToken(drive.conectado ? '' : 'consent');
    drive.conectado = true; guardarDrive();
    await sincronizar(true);
  } catch (e) { manejarError(e); }
}

function desconectarDrive() {
  if (!confirm('¿Dejar de sincronizar con Drive en este dispositivo? El archivo de Drive no se borra.')) return;
  if (sync.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(sync.token, () => { });
  drive = { clientId: drive.clientId };
  guardarDrive();
  sync.token = null;
  render();
}

async function buscarArchivo() {
  const q = encodeURIComponent(`name='${DRIVE_ARCHIVO}' and trashed=false`);
  const j = await (await gfetch(`${API}/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&spaces=drive`)).json();
  return j.files[0] || null;
}

async function sincronizar(inicial = false) {
  if (sync.ocupado && !inicial) return;
  sync.ocupado = true; pintarSync();
  try {
    let meta = null;
    if (drive.fileId) {
      try { meta = await (await gfetch(`${API}/drive/v3/files/${drive.fileId}?fields=id,modifiedTime,trashed`)).json(); }
      catch (e) { if (e.status !== 404) throw e; }
      if (meta?.trashed) meta = null;
    }
    if (!meta && inicial) meta = await buscarArchivo();
    if (!meta) { drive.fileId = null; await subir(); return; }
    drive.fileId = meta.id;

    const remotoCambiado = meta.modifiedTime !== drive.remotoMod;
    if (remotoCambiado) {
      const remoto = normalizar(await (await gfetch(`${API}/drive/v3/files/${meta.id}?alt=media`)).json());
      const localVacio = !state.publicadores.length && !state.semanas.length;
      let usarRemoto = true;
      if (hayCambiosLocales() && !localVacio && remoto.modificado !== state.modificado) {
        usarRemoto = confirm(
          'Hay cambios en Drive (hechos desde otro dispositivo) y también cambios en este que no se habían subido.\n\n' +
          `Drive: ${remoto.publicadores.length} publicadores, ${remoto.semanas.length} semanas (${remoto.modificado ? new Date(remoto.modificado).toLocaleString('es') : 'sin fecha'})\n` +
          `Este dispositivo: ${state.publicadores.length} publicadores, ${state.semanas.length} semanas (${new Date(state.modificado).toLocaleString('es')})\n\n` +
          'Aceptar = usar los datos de Drive.\nCancelar = quedarse con los de este dispositivo y sobrescribir Drive.');
      }
      if (usarRemoto) {
        state = remoto;
        guardarLocal();
        drive.remotoMod = meta.modifiedTime;
        drive.subido = state.modificado;
        drive.ultimaSync = Date.now();
        guardarDrive();
        render();
      } else await subir();
    } else if (hayCambiosLocales()) await subir();
    else { drive.ultimaSync = Date.now(); guardarDrive(); }
  } finally {
    sync.ocupado = false;
    setSync('');
  }
}

async function carpetaId() {
  if (drive.folderId) return drive.folderId;
  const q = encodeURIComponent(`name='${DRIVE_CARPETA}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const j = await (await gfetch(`${API}/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`)).json();
  if (j.files[0]) return (drive.folderId = j.files[0].id);
  const r = await (await gfetch(`${API}/drive/v3/files?fields=id`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_CARPETA, mimeType: 'application/vnd.google-apps.folder' }),
  })).json();
  return (drive.folderId = r.id);
}

async function subir() {
  if (!state.modificado) state.modificado = new Date().toISOString();
  const cuerpo = JSON.stringify(state);
  const marca = state.modificado;
  let r;
  if (drive.fileId) {
    r = await gfetch(`${API}/upload/drive/v3/files/${drive.fileId}?uploadType=media&fields=id,modifiedTime`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: cuerpo,
    });
  } else {
    const limite = 'vmc' + uid();
    const metadata = { name: DRIVE_ARCHIVO, mimeType: 'application/json', parents: [await carpetaId()] };
    const body = `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${limite}\r\nContent-Type: application/json\r\n\r\n${cuerpo}\r\n--${limite}--`;
    r = await gfetch(`${API}/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`, {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${limite}` }, body,
    });
  }
  const j = await r.json();
  Object.assign(drive, { fileId: j.id, remotoMod: j.modifiedTime, subido: marca, ultimaSync: Date.now() });
  guardarDrive();
  // Si hubo cambios mientras se subía, vuelve a programar
  if (state.modificado !== marca) programarSubida();
}

function tarjetaDrive() {
  const disp = driveDisponible();
  return `<div class="card">
    <h2>Google Drive</h2>
    <p class="small muted" style="margin-top:0">Guarda automáticamente los datos en tu Drive (carpeta «${DRIVE_CARPETA}», archivo <code>${DRIVE_ARCHIVO}</code>) para no perderlos y usarlos desde el móvil y el ordenador. La app solo tiene acceso a los archivos que ella misma crea.</p>
    ${!disp ? `<p class="badge warn" style="white-space:normal">Ahora estás abriendo el archivo directamente: Drive solo funciona con la app publicada (GitHub Pages) o en localhost.</p>` : ''}
    <div class="row">
      ${drive.conectado
        ? `<button class="primary" data-act="drive-sync">☁ Sincronizar ahora</button><button data-act="drive-off">Desconectar</button>
           <span class="small muted">${drive.ultimaSync ? 'Última sincronización: ' + new Date(drive.ultimaSync).toLocaleString('es') : ''}</span>`
        : `<button class="primary" data-act="drive-on" ${disp ? '' : 'disabled'}>☁ Conectar con Google Drive</button>`}
    </div>
    ${sync.error ? `<p class="small" style="color:var(--danger)">${esc(sync.error)}</p>` : ''}
    <details style="margin-top:10px"><summary class="small muted">Avanzado: cliente OAuth</summary>
      <label class="field" style="margin-top:8px"><span>Client ID de Google (por defecto el de Agenda JW)</span>
        <input data-act="drive-client" value="${esc(drive.clientId || '')}" placeholder="${CLIENT_ID_DEF}"></label>
      <p class="small muted">El origen donde publiques la app (p. ej. <code>https://tu-usuario.github.io</code>) debe estar en «Orígenes de JavaScript autorizados» de ese cliente en Google Cloud Console.</p>
    </details>
  </div>`;
}
