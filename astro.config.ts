import { readFileSync } from "node:fs";
import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import vercel from "@astrojs/vercel/serverless";
import react from "@astrojs/react";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import {
  remarkDefinitionList,
  defListHastHandlers
} from "remark-definition-list";
import remarkAlerts from "remark-alerts";
import remarkSqueezeParagraphs from "remark-squeeze-paragraphs";
import remarkFlexibleMarkers from "remark-flexible-markers";
import remarkEmbedder from "@remark-embedder/core";
import oembedTransformer from "@remark-embedder/transformer-oembed";
import remarkSectionize from "remark-sectionize";
import remarkCaptions from "remark-captions";
import remarkDirective from "remark-directive";
import {
  remarkExtendedTable,
  extendedTableHandlers
} from "remark-extended-table";

// https://astro.build/config
export default defineConfig({
  markdown: {
    remarkPlugins: [
      remarkDirective,
      [
        remarkAlerts,
        {
          icons: {
            note: readFileSync(`./src/icons/info.svg`).toString(),
            tip: readFileSync(`./src/icons/tip.svg`).toString(),
            important: readFileSync(`./src/icons/success.svg`).toString(),
            warning: readFileSync(`./src/icons/warning.svg`).toString(),
            caution: readFileSync(`./src/icons/danger.svg`).toString()
          }
        }
      ],
      remarkDefinitionList,
      remarkFlexibleMarkers,
      remarkSqueezeParagraphs,
      remarkExtendedTable,
      remarkSectionize,
      remarkCaptions,
      [
        // @ts-expect-error
        remarkEmbedder.default,
        {
          // @ts-expect-error
          transformers: [oembedTransformer.default]
        }
      ]
    ],
    rehypePlugins: [
      rehypeHeadingIds,
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: `wrap`
        }
      ]
    ],
    remarkRehype: {
      handlers: {
        ...defListHastHandlers,
        ...extendedTableHandlers
      }
    }
  },
  integrations: [AstroPWA(), mdx({}), react()],
  // Process images with sharp: https://docs.astro.build/en/guides/assets/#using-sharp
  image: {
    service: {
      entrypoint: `astro/assets/services/sharp`
    }
  },
  devToolbar: {
    enabled: false
  },
  output: `server`,
  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  })
});
