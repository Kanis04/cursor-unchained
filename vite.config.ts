import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { enhancedImages } from "@sveltejs/enhanced-img";

export default defineConfig(({ mode }) => {
  // Load env vars from .env file
  const env = loadEnv(mode, process.cwd(), "");

  // Populate process.env with loaded env vars for server-side code
  // This ensures env vars are available in both SvelteKit and scripts
  if (env.CURSOR_BEARER_TOKEN)
    process.env.CURSOR_BEARER_TOKEN = env.CURSOR_BEARER_TOKEN;
  if (env.X_CURSOR_CLIENT_VERSION)
    process.env.X_CURSOR_CLIENT_VERSION = env.X_CURSOR_CLIENT_VERSION;
  if (env.X_REQUEST_ID) process.env.X_REQUEST_ID = env.X_REQUEST_ID;
  if (env.X_SESSION_ID) process.env.X_SESSION_ID = env.X_SESSION_ID;

  return {
    plugins: [enhancedImages(), sveltekit(), tailwindcss()],
  };
});
