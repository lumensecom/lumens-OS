#!/usr/bin/env bash
set -euo pipefail

scripts=(/opt/lumens/init.sql /opt/lumens/migrations/*.sql /opt/lumens/seed.sql)
files=()
for script in "${scripts[@]}"; do
  files+=(-f "$script")
done

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --no-password \
  --set ON_ERROR_STOP=1 --single-transaction "${files[@]}"
