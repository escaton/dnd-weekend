import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../../", "");
  if (env.CLOUDFLARE_ENV) {
    process.env.CLOUDFLARE_ENV = env.CLOUDFLARE_ENV;
  }
  if (env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE) {
    process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE =
      env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE;
  }

  return {
    plugins: [tanstackRouter(), react(), tailwindcss(), cloudflare()],
    build: {
      outDir: "dist",
    },
  };
});
