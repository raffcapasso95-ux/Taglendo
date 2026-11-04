import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // L'indicatore di sviluppo copre la barra in basso del telefono.
  devIndicators: false,
  partialPrefetching: true,
};

export default nextConfig;
