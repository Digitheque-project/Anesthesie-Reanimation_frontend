import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image de sortie minimale (juste les fichiers nécessaires à l'exécution) — indispensable pour
  // un Dockerfile multi-étapes léger, voir blocope-front/Dockerfile.
  output: 'standalone',
};

export default nextConfig;
