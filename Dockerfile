FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && npm install -g corepack@latest
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm run -r build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/build .
COPY --from=builder /app/package.json .
CMD [ "node", "index.js" ]