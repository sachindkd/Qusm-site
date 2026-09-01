export type CmsField = { key: string; label: string; type?: "text" | "textarea" | "url" | "date" | "time" | "number" | "select"; options?: string[] };
export type CmsSection = { id: string; label: string; permission: string; fields: CmsField[] };

const cocFields: CmsField[] = [
  { key: "title", label: "Position / Level" },
  { key: "name", label: "Assigned Person" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "active", label: "Status", type: "select", options: ["active", "inactive"] },
  { key: "order", label: "Display order", type: "number" },
];
const commonSiteFields: CmsField[] = [
  { key: "eyebrow", label: "Eyebrow" }, { key: "slug", label: "URL slug" }, { key: "title", label: "Title" },
  { key: "description", label: "Description", type: "textarea" }, { key: "layout", label: "Layout", type: "select", options: ["wide", "split", "feature", "grid", "story"] },
  { key: "accent", label: "Accent" }, { key: "published", label: "Published", type: "select", options: ["true", "false"] }, { key: "order", label: "Display order", type: "number" },
];

export const CMS_SECTIONS: CmsSection[] = [
  { id: "org", label: "Site", permission: "site:edit", fields: [{key:"name",label:"Short name"},{key:"fullName",label:"Full name"},{key:"owner",label:"Owner"},{key:"coOwner",label:"Co-owner"},{key:"heroEyebrow",label:"Hero eyebrow"},{key:"heroTitle",label:"Hero title"},{key:"heroDescription",label:"Hero description",type:"textarea"},{key:"recruitmentUrl",label:"Recruitment URL",type:"url"},{key:"footerText",label:"Footer text"},{key:"status",label:"Status",type:"select",options:["active","maintenance","closed"]}] },
  { id: "announcements", label: "Announcements", permission: "announcements:manage", fields: [{key:"title",label:"Title"},{key:"body",label:"Announcement",type:"textarea"},{key:"published",label:"Status",type:"select",options:["draft","published"]},{key:"createdAt",label:"Date",type:"date"}] },
  { id: "calendar", label: "Operations", permission: "calendar:manage", fields: [{key:"title",label:"Event title"},{key:"date",label:"Date",type:"date"},{key:"time",label:"Time",type:"time"},{key:"location",label:"Location"},{key:"description",label:"Description",type:"textarea"},{key:"status",label:"Status",type:"select",options:["draft","published"]}] },
  { id: "cocLeadership", label: "Leadership CoC", permission: "site:edit", fields: cocFields },
  { id: "cocStaff", label: "Staff CoC", permission: "site:edit", fields: cocFields },
  { id: "cocRoleplay", label: "Roleplay CoC", permission: "site:edit", fields: cocFields },
  { id: "leadership", label: "Command", permission: "leadership:edit", fields: [{key:"title",label:"Position"},{key:"name",label:"Name"},{key:"discordId",label:"Discord ID"},{key:"division",label:"Division"},{key:"rank",label:"Rank"},{key:"description",label:"Description",type:"textarea"},{key:"active",label:"Status",type:"select",options:["active","inactive"]},{key:"order",label:"Display order",type:"number"}] },
  { id: "divisions", label: "Divisions", permission: "divisions:edit", fields: [{key:"code",label:"Code"},{key:"name",label:"Division name"},{key:"description",label:"Description",type:"textarea"},{key:"status",label:"Status",type:"select",options:["active","inactive","temporary"]},{key:"leadership",label:"Leadership"},{key:"logoUrl",label:"Logo URL",type:"url"},{key:"order",label:"Display order",type:"number"}] },
  { id: "rules", label: "Rulebook", permission: "site:edit", fields: [{key:"title",label:"Rule title"},{key:"category",label:"Category"},{key:"body",label:"Rule",type:"textarea"},{key:"order",label:"Display order",type:"number"}] },
  { id: "government", label: "Government", permission: "site:edit", fields: [{key:"name",label:"Name"},{key:"role",label:"Role"},{key:"department",label:"Department"},{key:"description",label:"Description",type:"textarea"},{key:"order",label:"Display order",type:"number"}] },
  { id: "ranks", label: "Ranks", permission: "site:edit", fields: [{key:"name",label:"Rank"},{key:"level",label:"Level"},{key:"description",label:"Description",type:"textarea"},{key:"insigniaUrl",label:"Insignia URL",type:"url"},{key:"order",label:"Display order",type:"number"}] },
  { id: "news", label: "News", permission: "site:edit", fields: [{key:"title",label:"Headline"},{key:"excerpt",label:"Summary",type:"textarea"},{key:"body",label:"Article",type:"textarea"},{key:"date",label:"Date",type:"date"},{key:"imageUrl",label:"Image URL",type:"url"},{key:"order",label:"Display order",type:"number"}] },
  { id: "media", label: "Media", permission: "media:manage", fields: [{key:"title",label:"Title"},{key:"caption",label:"Caption",type:"textarea"},{key:"imageUrl",label:"Image URL",type:"url"},{key:"videoUrl",label:"Video URL",type:"url"},{key:"category",label:"Category"},{key:"order",label:"Display order",type:"number"}] },
  { id: "shop", label: "Store", permission: "shop:manage", fields: [{key:"name",label:"Faction / Family name"},{key:"type",label:"Type",type:"select",options:["faction","family"]},{key:"description",label:"Description",type:"textarea"},{key:"price",label:"Price / Gamepass ID"},{key:"gamepassUrl",label:"Gamepass link",type:"url"},{key:"imageUrl",label:"Image URL",type:"url"},{key:"status",label:"Status",type:"select",options:["active","inactive","sold-out"]},{key:"order",label:"Display order",type:"number"}] },
  { id: "applications", label: "Applications", permission: "applications:manage", fields: [{key:"name",label:"Applicant"},{key:"type",label:"Application type"},{key:"status",label:"Status",type:"select",options:["pending","approved","rejected"]},{key:"notes",label:"Staff notes",type:"textarea"}] },
  { id: "customSections", label: "Custom Sections", permission: "site:edit", fields: commonSiteFields },
];

export const CMS_SECTION_BY_ID = Object.fromEntries(CMS_SECTIONS.map(section => [section.id, section]));
export const CMS_SECTION_IDS = CMS_SECTIONS.map(section => section.id);
