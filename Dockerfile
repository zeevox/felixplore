FROM node:22-alpine AS builder

LABEL stage="builder"
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npx svelte-kit sync

RUN npm run build

FROM node:22-alpine AS final

LABEL stage="production"

RUN addgroup -S --gid 1001 appgroup && \
    adduser -S --uid 1001 --ingroup appgroup appuser

WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

RUN npm ci --omit=dev

COPY --from=builder --chown=appuser:appgroup /app/build ./build

USER appuser

EXPOSE ${PORT}

CMD ["node", "build/index.js"]
