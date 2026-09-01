export type CanonicalSection = {
  id: string;
  label: string;
  source: "org" | "records" | "custom";
  permission: string;
  fields: string[];
  public: boolean;
  removable?: boolean;
};

export const CANONICAL_SECTIONS: CanonicalSection[] = [
  { id: "org", label: "Site", source: "org", permission: "site:edit", fields: ["name","fullName","owner","coOwner","heroEyebrow","heroTitle","heroDescription","recruitmentUrl","footerText","status"], public: true, removable: false },
  { id: "announcements", label: "Announcements", source: "records", permission: "announcements:manage", fields: ["title","body","published","createdAt"], public: true },
  { id: "calendar", label: "Operations", source: "records", permission: "calendar:manage", fields: ["title","date","time","location","description","status"], public: true },
  { id: "leadership", label: "Command", source: "records", permission: "leadership:edit", fields: ["title","name","discordId","division","rank","description","active","order"], public: true },
  { id: "divisions", label: "Divisions", source: "records", permission: "divisions:edit", fields: ["code","name","description","status","leadership","logoUrl","order"], public: true },
  { id: "rules", label: "Rulebook", source: "records", permission: "site:edit", fields: ["title","category","body","order"], public: true, removable: false },
  { id: "government", label: "Government", source: "records", permission: "site:edit", fields: ["name","role","department","description","order"], public: true },
  { id: "ranks", label: "Military Ranks", source: "records", permission: "site:edit", fields: ["name","level","description","insigniaUrl","order"], public: true },
  { id: "news", label: "News", source: "records", permission: "site:edit", fields: ["title","excerpt","body","date","imageUrl","order"], public: true },
  { id: "media", label: "Media", source: "records", permission: "media:manage", fields: ["title","caption","imageUrl","videoUrl","category","order"], public: true },
  { id: "shop", label: "Shop", source: "records", permission: "site:edit", fields: ["name","type","description","price","gamepassUrl","imageUrl","status","order"], public: true },
  { id: "applications", label: "Applications", source: "records", permission: "applications:manage", fields: ["name","type","status","notes"], public: false },
  { id: "cocLeadership", label: "Leadership CoC", source: "records", permission: "site:edit", fields: ["title","name","description","active","order"], public: true },
  { id: "cocStaff", label: "Staff CoC", source: "records", permission: "site:edit", fields: ["title","name","description","active","order"], public: true },
  { id: "cocRoleplay", label: "Roleplay CoC", source: "records", permission: "site:edit", fields: ["title","name","description","active","order"], public: true },
  { id: "customSections", label: "Custom Sections", source: "custom", permission: "site:edit", fields: [], public: true },
];

export function getCanonicalSection(id: string) {
  return CANONICAL_SECTIONS.find(section => section.id === id) ?? null;
}

export function getCustomSectionEditorSections(customSections: unknown): CanonicalSection[] {
  const custom = Array.isArray(customSections) ? customSections : [];
  const dynamic: CanonicalSection[] = custom
    .map((section: any) => ({
      id: String(section?.id || section?.slug || "").trim(),
      label: String(section?.title || section?.slug || "Untitled section").trim(),
      source: "custom" as const,
      permission: "site:edit",
      fields: ["eyebrow","slug","title","description","layout","accent","published","order","blocks"],
      public: section?.published === true,
    }))
    .filter(section => section.id);
  return [...CANONICAL_SECTIONS.filter(section => section.id !== "customSections"), ...dynamic, CANONICAL_SECTIONS.find(section => section.id === "customSections")!];
}
