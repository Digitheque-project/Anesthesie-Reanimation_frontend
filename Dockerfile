# --- Étape 1 : dépendances ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Étape 2 : build ---
# Les variables NEXT_PUBLIC_* sont figées dans le bundle au moment du build (Next.js) : elles
# doivent donc être fournies en --build-arg, contrairement aux variables serveur (ACCUEIL_API_URL,
# USER_SERVICE_API_URL...) qui restent lues à l'exécution et se passent en simple env au lancement.
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CENTRAL_LOGIN_URL
ARG NEXT_PUBLIC_DOSSIER_PATIENT_API_URL
ARG NEXT_PUBLIC_HOSPITALISATION_API_URL
ARG NEXT_PUBLIC_NOTIFICATION_WS_URL
ARG NEXT_PUBLIC_PRESCRIPTION_API_URL
ARG NEXT_PUBLIC_PRISE_EN_CHARGE_API_URL
ARG NEXT_PUBLIC_SERVICE_CHU_API_BASE_URL
ARG NEXT_PUBLIC_SERVICE_ID
ARG NEXT_PUBLIC_UPLOAD_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_CENTRAL_LOGIN_URL=$NEXT_PUBLIC_CENTRAL_LOGIN_URL \
    NEXT_PUBLIC_DOSSIER_PATIENT_API_URL=$NEXT_PUBLIC_DOSSIER_PATIENT_API_URL \
    NEXT_PUBLIC_HOSPITALISATION_API_URL=$NEXT_PUBLIC_HOSPITALISATION_API_URL \
    NEXT_PUBLIC_NOTIFICATION_WS_URL=$NEXT_PUBLIC_NOTIFICATION_WS_URL \
    NEXT_PUBLIC_PRESCRIPTION_API_URL=$NEXT_PUBLIC_PRESCRIPTION_API_URL \
    NEXT_PUBLIC_PRISE_EN_CHARGE_API_URL=$NEXT_PUBLIC_PRISE_EN_CHARGE_API_URL \
    NEXT_PUBLIC_SERVICE_CHU_API_BASE_URL=$NEXT_PUBLIC_SERVICE_CHU_API_BASE_URL \
    NEXT_PUBLIC_SERVICE_ID=$NEXT_PUBLIC_SERVICE_ID \
    NEXT_PUBLIC_UPLOAD_API_URL=$NEXT_PUBLIC_UPLOAD_API_URL

RUN npm run build

# --- Étape 3 : image d'exécution allégée (sortie "standalone", voir next.config.ts) ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
