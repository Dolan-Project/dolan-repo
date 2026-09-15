import type { HomeStreamItem, ItineraryTemplateSummary, PostCard } from "@dolan/shared";

export function mixHomeStream(
  posts: PostCard[],
  templates: ItineraryTemplateSummary[],
  railHighlight = 3,
): HomeStreamItem[] {
  const highlighted = new Set(templates.slice(0, railHighlight).map((item) => item.id));
  const pool = templates.filter((item) => !highlighted.has(item.id));
  const insertPool = pool.length > 0 ? pool : templates;

  if (posts.length === 0) {
    return insertPool.slice(0, 3).map((template) => ({ kind: "plan" as const, template }));
  }

  const items: HomeStreamItem[] = [];
  let planIndex = 0;
  let sincePlan = 0;
  for (const post of posts) {
    items.push({ kind: "post", post });
    sincePlan += 1;
    if (sincePlan < 4 || insertPool.length === 0) continue;
    const template = insertPool[planIndex % insertPool.length];
    const previous = items.at(-1);
    if (
      !template ||
      (previous?.kind === "plan" && previous.template.id === template.id)
    ) {
      continue;
    }
    items.push({ kind: "plan", template });
    planIndex += 1;
    sincePlan = 0;
  }
  return items;
}
