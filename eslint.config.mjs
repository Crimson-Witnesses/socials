import { defineConfig } from "eslint/config";
import { astro, base, stylistic, typeAware } from "@saeris/eslint-config";

export default defineConfig([astro, base, stylistic, typeAware]);
