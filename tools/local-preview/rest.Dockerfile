FROM postgrest/postgrest:v14.5
COPY --chmod=644 postgrest.conf /lumens-postgrest.conf
