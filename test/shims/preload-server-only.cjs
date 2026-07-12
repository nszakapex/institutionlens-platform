/**
 * Preload shim so Node scripts can import modules that declare `server-only`.
 * Used only by offline validation scripts — never for production browser bundles.
 */
const Module = require("node:module");
const path = require("node:path");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return originalLoad(path.join(__dirname, "server-only.ts"), parent, isMain);
  }
  return originalLoad(request, parent, isMain);
};
