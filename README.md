# Cuadrante VMC

App personal para preparar el cuadrante de la reunión **Vida y Ministerio Cristiano**.

Abre `index.html` con doble clic (o publícalo en GitHub Pages). No necesita servidor ni instalación.

## Qué hace

- **Publicadores**: familia, sala preferida, semanas mínimas entre partes, sexo, privilegio (anciano, siervo ministerial, publicador, no bautizado), precursor, *solo ayudante*, activo/inactivo, ausencias con fechas y las asignaciones que puede hacer (con botón para aplicar las típicas de su privilegio).
- **Cuadrante semanal**: plantilla configurable o importada de jw.org. Vista **Semana** (edición) y vista **Mes** (cuadrícula con todos los nombres). Una tira con las **próximas 8 semanas** indica cuáles tienen puestos libres, problemas o avisos pendientes.
- **Sugerencias**: cada puesto ordena a los candidatos por tiempo sin esa parte y sin intervenir, restando su carga de los últimos 6 meses. Penaliza tener otra parte demasiado cerca (semanas mínimas configurables, también por persona), repetir pareja, la sala no preferida y repetir sala. Excluye a no habilitados, ausentes, ya asignados esa semana y ayudantes de distinto sexo salvo que sean de la misma **familia**. El botón 🔍 explica el porqué de cada candidato. «✨ Sugerir vacíos» rellena primero los puestos más difíciles de cubrir, y «Rellenar varias semanas» reparte las partes de hasta 12 semanas.
- **Sala auxiliar**: se activa por semana; las partes de estudiante de ambas salas se editan juntas, y el programa impreso las muestra en dos columnas.
- **Problemas**: la semana avisa si hay alguien ausente, inactivo, no habilitado, repetido o en una pareja no válida.
- **Estadísticas**: más y menos participaciones, partes por mes y por tipo, mapa de quién hace qué, reparto entre sala principal y auxiliar, parejas más repetidas y sustituciones (motivos, a quién y quién cubre). Por periodo (3, 6, 12 meses, año de servicio o todo).
- **Importar historial** desde Excel (.xlsx) o CSV, en formato cuadrante (una fila por semana) o lista (una fila por asignación). Ver el formato en [ayuda.html](ayuda.html).
- **Semanas especiales**: visita del superintendente (cambia el día y pone su discurso en lugar del estudio), asamblea y Conmemoración, marcadas con antelación.
- **Hoja del presidente** con la hora de cada momento de la reunión, y **calendario (.ics)** del mes o de cada publicador con recordatorios.
- **Sincronización automática**: al volver a la app recoge los cambios hechos en Drive desde otro dispositivo.
- **Modo demostración** (`?demo=1`) con una congregación inventada y **guía de uso** con capturas y PDF de ejemplo en [ayuda.html](ayuda.html).
- **Deshacer** (botón o Ctrl+Z), **exportar el historial a CSV** e **instalable** en el móvil (funciona sin conexión).
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
