// eslint-disable-next-line import/no-unresolved
import { z, defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const guideSchema = z.object({
  title: z.string(),
  year: z.number(),
  city: z.string()
});

export type GuidePage = z.infer<typeof guideSchema>;

export const collections = {
  guides: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./public/guides" }),
    schema: guideSchema
  })
};
