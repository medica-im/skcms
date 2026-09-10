# --- ÉTAPE 1 : Base commune ---
FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PROTOCOL_HEADER=x-forwarded-proto
ENV HOST_HEADER=x-forwarded-host
RUN corepack enable && npm install -g corepack@latest
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- ÉTAPE 2 : Build de l'application ---
FROM base AS builder
ARG ENV_FILE=.env
# Read by svelte.config.js as kit.version.name, so the built app can tell it has
# been superseded. Declared here rather than only in the production stage below,
# where GIT_SHA and SUBMODULE_SHA become labels: this one has to exist while the
# build runs. ENV, not ARG alone, because the config reads process.env.
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
RUN [ "${ENV_FILE}" = ".env" ] || [ "$(readlink -f ${ENV_FILE})" = "$(readlink -f .env)" ] || cp ${ENV_FILE} .env
RUN pnpm run -r build

# --- ÉTAPE 3 : Image de PRODUCTION ---
FROM node:22-slim AS production
ARG GIT_SHA
ARG SUBMODULE_SHA
LABEL git.sha=$GIT_SHA
LABEL git.submodule.sha=$SUBMODULE_SHA
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
RUN corepack enable && npm install -g corepack@latest
WORKDIR /app
COPY --from=builder /app/package.json .
COPY --from=builder /app/pnpm-lock.yaml .
COPY --from=builder /app/patches ./patches
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile
COPY --from=builder /app/build .
CMD [ "node", "index.js" ]
