# LUMENS OS local

Necesitas Docker Desktop abierto en Windows o macOS. En Linux, usa Docker con el complemento Compose.

- **Windows:** extrae todos los archivos del ZIP y haz doble clic en `Abrir-LUMENS.bat`.
- **macOS y Linux:** abre una terminal en la carpeta extraída y ejecuta `bash abrir-lumens.sh`.

La primera vez se descargan las dependencias y se compila la aplicación. Después se abre http://localhost:3000/ en el navegador de tu computador. La torre usa una base PostgreSQL local con datos de demostración y guarda su historial en un volumen de Docker.

Puedes abrir la torre en dos pestañas. En una, selecciona la oficina de Dirección de operaciones y ejecuta el Brief de la mañana. En la otra, la ejecución aparece automáticamente en Actividad reciente.

Para liberar el puerto sin borrar el historial, ejecuta `docker compose -f tools/local-preview/compose.yaml stop` desde la carpeta extraída. Si el puerto 3000 está ocupado, puedes cambiarlo con la variable `LUMENS_PREVIEW_PORT` antes de abrir la torre.
