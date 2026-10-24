# Cuadrante VMC

App personal para preparar el cuadrante de la reunión **Vida y Ministerio Cristiano**.

Abre `index.html` con doble clic (o publícalo en GitHub Pages). No necesita servidor ni instalación.

## Qué hace

- **Publicadores**: sexo, privilegio (anciano, siervo ministerial, publicador, no bautizado), precursor, *solo ayudante*, activo/inactivo, ausencias con fechas y las asignaciones que puede hacer (con botón para aplicar las típicas de su privilegio).
- **Cuadrante semanal**: plantilla configurable (partes de maestros y de vida cristiana, sala auxiliar). Cada puesto muestra primero a los **sugeridos**: quien más tiempo lleva sin esa parte y sin ninguna parte, excluyendo no habilitados, ausentes, ya asignados esa semana o de distinto sexo que el titular. «✨ Sugerir vacíos» rellena todo lo libre.
- **Publicar / sustituciones**: una semana publicada queda bloqueada; cambiar a alguien se hace con «Sustituir», que pide motivo y queda registrado.
- **Historial**: resumen por publicador (ordenado por quién lleva más tiempo sin intervenir, con recuento por tipo de parte), detalle filtrable y lista de sustituciones.
- **Imprimir**: programa mensual listo para imprimir o guardar como PDF.

## Datos

Se guardan en el `localStorage` del navegador. **Descarga copias de seguridad** desde *Ajustes* (archivo `.json`) y restáuralas allí mismo. La app avisa si pasan más de 14 días sin copia.

Ojo: si abres la app desde otra ruta o en otro navegador, verá otros datos (vacíos); usa la copia de seguridad para moverlos.
