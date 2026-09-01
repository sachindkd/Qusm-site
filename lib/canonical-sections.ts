export type CanonicalSection = {
  id: string;
  title: string;
  editor: "content" | "custom";
  permission: string;
};

/**
 * Canonical section metadata shared by Staff Management and site editors.
 * Persisted custom sections should be merged into this registry by the content store;
 * consumers must not maintain their own hard-coded section lists.
 */
export const CORE_SECTIONS: readonly CanonicalSection[] = [
  { id: "org", title: "Organization", editor: "content", permission: "site:edit" },
  { id: "leadership", title: "Leadership", editor: "content", permission: "leadership:edit" },
  { id: "divisions", title: "Divisions", editor: "content", permission: "divisions:edit" },
  { id: "rules", title: "Rulebook", editor: "content", permission: "site:edit" },
  { id: "government", title: "Government", editor: "content", permission: "site:edit" },
  { id: "ranks", title: "Ranks", editor: "content", permission: "site:edit" },
  { id: "news", title: "News", editor: "content", permission: "site:edit" },
  { id: "announcements", title: "Announcements", editor: "content", permission: "announcements:manage" },
  { id: "calendar", title: "Calendar", editor: "content", permission: "calendar:manage" },
  { id: "media", title: "Media", editor: "content", permission: "media:manage" },
  { id: "applications", title: "Applications", editor: "content", permission: "applications:manage" },
];

export function getCoreSection(id: string) {
  return CORE_SECTIONS.find((section) => section.id === id);
}
