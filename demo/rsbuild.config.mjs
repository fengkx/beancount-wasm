import { defineConfig } from "@rsbuild/core";

export default defineConfig({
  source: {
    entry: {
      index: "./main.js",
    },
  },
  html: {
    template: "./index.html",
  },
});
