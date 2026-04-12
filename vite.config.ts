import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    // In dev, le Edge Functions su supabase.co sono cross-origin: il proxy evita errori CORS / "Failed to fetch".
    server: {
      proxy: supabaseUrl
        ? {
            "/__supabase": {
              target: supabaseUrl,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/__supabase/, ""),
            },
          }
        : undefined,
    },
    preview: {
      proxy: supabaseUrl
        ? {
            "/__supabase": {
              target: supabaseUrl,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/__supabase/, ""),
            },
          }
        : undefined,
    },
  };
});
