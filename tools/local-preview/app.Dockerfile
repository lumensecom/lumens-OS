FROM node:24-bookworm-slim

WORKDIR /app
RUN --mount=type=secret,id=lumens_build_ca \
    if [ -r /run/secrets/lumens_build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/lumens_build_ca; fi \
    && npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=secret,id=lumens_build_ca \
    if [ -r /run/secrets/lumens_build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/lumens_build_ca; fi \
    && pnpm install --frozen-lockfile

COPY .eslintrc.json next.config.mjs middleware.ts postcss.config.mjs tailwind.config.ts tsconfig.json ./
COPY app ./app
COPY components ./components
COPY --chown=node:node lib ./lib
COPY --chown=node:node docs/landing/plantillas/simple-*.liquid ./docs/landing/plantillas/
COPY tools/local-preview/gateway.mjs ./gateway.mjs

ENV LUMENS_LOCAL_PREVIEW=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:45433 \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=lumens-local-preview
RUN pnpm build && chown -R node:node .next

RUN chmod a+r /app/*.json /app/*.mjs

ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "gateway.mjs"]
