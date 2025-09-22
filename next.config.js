/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Otimizações para containers Docker
  webpack: (config, { isServer }) => {
    // Reduzir paralelismo para evitar bus errors
    config.parallelism = 1;
    
    // Configurações de otimização mais conservadoras
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        minimizer: config.optimization.minimizer?.map(minimizer => {
          if (minimizer.constructor.name === 'TerserPlugin') {
            minimizer.options.parallel = false;
            minimizer.options.terserOptions = {
              ...minimizer.options.terserOptions,
              compress: {
                passes: 1, // Reduzir passes de compressão
              },
            };
          }
          return minimizer;
        }),
      };
    }
    
    return config;
  },
}

module.exports = nextConfig