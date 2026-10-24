# Cuadrante VMC

App personal para preparar el cuadrante de la reunión **Vida y Ministerio Cristiano**.

Abre `index.html` con doble clic (o publícalo en GitHub Pages). No necesita servidor ni instalación.

## Qué hace

- **Publicadores**: sexo, privilegio (anciano, siervo ministerial, publicador, no bautizado), precursor, *solo ayudante*, activo/inactivo, ausencias con fechas y las asignaciones que puede hacer (con botón para aplicar las típicas de su privilegio).
- **Cuadrante semanal**: plantilla configurable (partes de maestros y de vida cristiana, sala auxiliar). Cada puesto muestra primero a los **sugeridos**: quien más tiempo lleva sin esa parte y sin ninguna parte, excluyendo no habilitados, ausentes, ya asignados esa semana o de distinto sexo que el titular. «✨ Sugerir vacíos» rellena todo lo libre.
- **Publicar / sustituciones**: una semana publicada queda bloqueada; cambiar a alguien se hace con «Sustituir», que pide motivo y queda registrado.
- **Historial**: resumen por publicador (ordenado por quién lleva más tiempo sin intervenir, con recuento por tipo de parte), detalle filtrable y lista de sustituciones.
- **Importar de jw.org**: en *Cuadrante → 📥 Importar de jw.org* eliges la Guía de actividades, pulsas «Descargar EPUB» y cargas el archivo. Se crean las semanas con todas las partes (número, título, minutos, lección y lectura semanal). Si la semana ya existía, se conservan las personas asignadas. (jw.org no permite que la app descargue el EPUB por sí sola; por eso es en dos pasos.)
- **Avisos**: en cada semana hay una lista de asignados con botón *WhatsApp* (mensaje ya redactado al teléfono del publicador) o *Copiar*, y se marca quién está avisado. Si cambias a alguien, su aviso vuelve a pendiente.
- **Imprimir**: programa mensual y **hojas de asignación S-89** (4 por folio) para las partes de estudiante, listas para imprimir o guardar como PDF.
- **Google Drive**: en *Ajustes* conectas tu cuenta y los datos se guardan solos en `Cuadrante VMC/cuadrante-vmc.json` de tu Drive; así puedes usarla en el móvil y en el ordenador. Si hay cambios en los dos lados, la app pregunta con cuáles quedarse.

## Publicar (necesario para Drive)

Google solo permite iniciar sesión desde una web `https`. Sube esta carpeta a un repositorio de GitHub y activa GitHub Pages (Settings → Pages → rama `main`). Se usa el mismo cliente OAuth que Agenda JW, así que si `https://<usuario>.github.io` ya está en sus *Orígenes de JavaScript autorizados*, funciona sin tocar nada. Se puede cambiar el Client ID en *Ajustes → Avanzado*.

## Datos

Se guardan en el `localStorage` del navegador. **Descarga copias de seguridad** desde *Ajustes* (archivo `.json`) y restáuralas allí mismo. La app avisa si pasan más de 14 días sin copia.

Ojo: si abres la app desde otra ruta o en otro navegador, verá otros datos (vacíos); usa la copia de seguridad para moverlos.
