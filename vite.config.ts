import { defineConfig } from "vite-plus";
import { lint, fmt } from "@saeris/configs";

export default defineConfig({
  fmt: {
    ...fmt,
    // The guide markdown uses custom remark syntax (definition lists, alerts,
    // attributes, extended tables, captions) that oxfmt would mangle.
    ignorePatterns: [...(fmt.ignorePatterns ?? []), "public/**/*.md"]
  },
  lint
});
