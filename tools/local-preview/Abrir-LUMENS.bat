@echo off
setlocal
set "composeFile=%~dp0tools\local-preview\compose.yaml"
if exist "%~dp0compose.yaml" set "composeFile=%~dp0compose.yaml"
if not defined LUMENS_PREVIEW_PORT set "LUMENS_PREVIEW_PORT=3000"

docker info >nul 2>&1
if errorlevel 1 (
  echo Abre Docker Desktop y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

echo Preparando la torre de LUMENS OS. La primera vez puede tardar unos minutos.
docker compose -f "%composeFile%" up -d --build --wait
if errorlevel 1 (
  echo La torre no termino de arrancar. Revisa el error de Docker arriba.
  pause
  exit /b 1
)

start "" "http://localhost:%LUMENS_PREVIEW_PORT%/"
