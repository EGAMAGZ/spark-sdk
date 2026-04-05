export function convertHtmlToAspx(html: string): string {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch ? headMatch[1] : '';
  const extraHeadTags = extractExternalAssets(headContent);

  return [].filter((line) => line !== null)
    .join('\n');
}

function extractExternalAssets(headHtml: string): string {
  const tags: string[] = [];

  const linkMatches = headHtml.matchAll(
    /<link[^>]+href="https?:\/\/[^"]*"[^>]*>/gi,
  );
  for (const match of linkMatches) {
    tags.push(match[0]);
  }

  return tags.join('\n ');
}
