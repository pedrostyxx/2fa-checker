import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurações para produção
  output: 'standalone',
  
  // Configurações de imagem para Docker
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
