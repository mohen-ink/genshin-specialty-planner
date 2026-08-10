import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createReadStream, existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const mobileDevHost = process.env.TAURI_DEV_HOST;
const appRoot = fileURLToPath(new URL(".", import.meta.url));
const nativeImageDirectory = resolve(appRoot, "native-assets", "UI");

function nativeImagesPlugin(): Plugin {
  return {
    name: "native-client-images",
    configureServer(server) {
      server.middlewares.use("/native-assets/UI/", (request, response, next) => {
        const filename = basename(decodeURIComponent(request.url?.split("?", 1)[0] ?? ""));
        if (!/^[A-Za-z0-9_.-]+\.png$/.test(filename)) {
          next();
          return;
        }

        const imagePath = resolve(nativeImageDirectory, filename);
        if (!existsSync(imagePath)) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", "image/png");
        response.setHeader("Cache-Control", "no-cache");
        createReadStream(imagePath).pipe(response);
      });
    },
    generateBundle() {
      for (const filename of readdirSync(nativeImageDirectory).sort()) {
        if (!filename.endsWith(".png")) continue;
        this.emitFile({
          type: "asset",
          fileName: `native-assets/UI/${filename}`,
          source: readFileSync(resolve(nativeImageDirectory, filename)),
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isTauriBuild = mode === "tauri";

  return {
    base: "./",
    plugins: [react(), ...(isTauriBuild ? [nativeImagesPlugin()] : [])],
    build: {
      outDir: isTauriBuild ? "dist-tauri" : "dist",
    },
    server: {
      host: mobileDevHost || false,
      port: 5173,
      strictPort: true,
      hmr: mobileDevHost
        ? {
            protocol: "ws",
            host: mobileDevHost,
            port: 5173,
          }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
    test: {
      environment: "node",
    },
  };
});
