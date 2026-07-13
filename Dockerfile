# Funil Sustentare — imagem de produção (Next.js + Prisma/MySQL)

FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- Dependências ----
FROM base AS deps
COPY package*.json ./
RUN npm install

# ---- Build ----
FROM base AS build
# URL dummy só para o Prisma generate/next build (não conecta ao banco no build)
ENV DATABASE_URL="mysql://build:build@localhost:3306/build"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:prod

# ---- Runner ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
