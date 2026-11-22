FROM postgres:17-trixie

RUN rm -f /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-cron \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=postgres:postgres supabase/migrations/ /opt/lumens/migrations/
COPY --chown=postgres:postgres tools/local-preview/init.sql tools/local-preview/seed.sql /opt/lumens/
COPY --chmod=755 tools/local-preview/init.sh /docker-entrypoint-initdb.d/10-lumens.sh

CMD ["postgres", "-c", "shared_preload_libraries=pg_cron", "-c", "cron.use_background_workers=on"]
