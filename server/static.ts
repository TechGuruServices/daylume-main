import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  // import.meta.url works in ESM (tsx dev) AND in esbuild's CJS output —
  // esbuild automatically shims it to: require('url').pathToFileURL(__filename).href
  const distPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "public"
  );

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // Fall through to index.html for client-side routing
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}