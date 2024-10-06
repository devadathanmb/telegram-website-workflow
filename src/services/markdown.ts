import type { JsonData } from '../types';

export function generateMarkdown(jsonData: JsonData): string {
  let markdown = `---
layout: ../layouts/LinksLayout.astro
title: "Cool Links"

---

The below is a collection of links that I find interesting or useful. More like a bookmarking page for myself but you might find it useful too.

---

## Table of contents
`;

  jsonData.sections.forEach(section => {
    markdown += `\n## ${section.name}\n`;
    markdown += `${section.description}\n`;

    section.subsections.forEach(subsection => {
      markdown += `### ${subsection.name}\n`;
      subsection.links.forEach((link, index) => {
        markdown += `${index + 1}. ${link.title} - [${link.type}](${link.url})\n`;
      });
    });
  });

  return markdown;
}
