import raw from "../../CHANGELOG.md?raw";

export interface ChangelogSection { heading: string; items: string[] }
export interface ChangelogEntry { version: string; date: string; sections: ChangelogSection[] }

export function parseChangelog(text: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let entry: ChangelogEntry | null = null;
  let section: ChangelogSection | null = null;
  for (const line of text.split("\n")) {
    const v = line.match(/^##\s+\[?v?([\d.]+)\]?\s*-\s*(\S+)/);
    if (v) { entry = { version: v[1], date: v[2], sections: [] }; entries.push(entry); section = null; continue; }
    if (!entry) continue;
    const h = line.match(/^###\s+(.+)/);
    if (h) { section = { heading: h[1].trim(), items: [] }; entry.sections.push(section); continue; }
    const b = line.match(/^\s*-\s+(.+)/);
    if (b) {
      if (!section) { section = { heading: "", items: [] }; entry.sections.push(section); }
      section.items.push(b[1].trim());
    }
  }
  return entries;
}

export const changelog = parseChangelog(raw);
export const currentVersion = changelog[0]?.version ?? "0.0.0";
