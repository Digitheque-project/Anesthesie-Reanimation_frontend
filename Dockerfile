# --- Étape 1 : dépendances ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Étape 2 : build ---
# Les variables NEXT_PUBLIC_* sont figées dans le bundle au moment du build (Next.js) : elles
# doivent donc être fournies en --build-arg. Une seule variable réseau désormais
# (NEXT_PUBLIC_GATEWAY_URL, voir lib/gateway.ts) — plus d'URL directe de service tiers en
# variable séparée, y compris côté serveur (app/api/accueil, app/api/users), qui la réutilisent
# à l'exécution.
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_GATEWAY_URL
ARG NEXT_PUBLIC_CENTRAL_LOGIN_URL
ARG NEXT_PUBLIC_SERVICE_NAME
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL \
    NEXT_PUBLIC_CENTRAL_LOGIN_URL=$NEXT_PUBLIC_CENTRAL_LOGIN_URL \
    NEXT_PUBLIC_SERVICE_NAME=$NEXT_PUBLIC_SERVICE_NAME

RUN npm run build

# --- Étape 3 : image d'exécution allégée (sortie "standalone", voir next.config.ts) ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Le serveur standalone de Next.js ecoute sur $HOSTNAME, que Docker remplit avec le nom
# interne du conteneur : l'hebergeur (Render) ne pouvait pas le joindre (502). On ecoute donc
# sur toutes les interfaces ; le port reste celui fourni par l'hebergeur ($PORT).
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
