import type { NextConfig } from "next";

/** Le foto dei saloni stanno nell'archivio di Supabase: passano da Next, che le ridimensiona per lo schermo (sul telefono pesano una frazione). */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabase ? [{ protocol: supabase.protocol.replace(":", "") as "http" | "https", hostname: supabase.hostname, port: supabase.port, pathname: "/storage/v1/object/public/**" }] : [],
    // in sviluppo l'archivio è sul computer (127.0.0.1)
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  /* config options here */
  cacheComponents: true,
  // L'indicatore di sviluppo copre la barra in basso del telefono.
  devIndicators: false,
  partialPrefetching: true,
};

export default nextConfig;
