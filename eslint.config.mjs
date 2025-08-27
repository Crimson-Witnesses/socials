import { defineConfig } from "eslint/config";
import { base, next, stylistic, typeAware } from "@saeris/eslint-config";

export default defineConfig([
  base,
  next,
  stylistic,
  typeAware,
  {
    rules: {
      "@stylistic/jsx-curly-spacing": `off`,
      "jsx-a11y/no-static-element-interactions": `off`
    }
  }
]);
