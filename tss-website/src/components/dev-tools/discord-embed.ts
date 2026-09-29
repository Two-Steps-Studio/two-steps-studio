// Discord message + embed model: builds the webhook/API JSON and a
// discord.js (EmbedBuilder) snippet, checks Discord's documented limits,
// and tokenizes the markdown subset the preview renders.

export type EmbedField = { name: string; value: string; inline: boolean };

export type EmbedDraft = {
  content: string;
  authorName: string;
  authorIcon: string;
  title: string;
  url: string;
  description: string;
  color: string; // #rrggbb
  fields: EmbedField[];
  image: string;
  thumbnail: string;
  footer: string;
  footerIcon: string;
  timestamp: boolean;
};

export const EMPTY_EMBED: EmbedDraft = {
  content: "",
  authorName: "",
  authorIcon: "",
  title: "",
  url: "",
  description: "",
  color: "#1bbdbd",
  fields: [],
  image: "",
  thumbnail: "",
  footer: "",
  footerIcon: "",
  timestamp: false,
};

// https://discord.com/developers/docs/resources/message#embed-object-embed-limits
export const LIMITS = {
  content: 2000,
  title: 256,
  description: 4096,
  fields: 25,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  author: 256,
  total: 6000,
} as const;

const colorInt = (hex: string) => parseInt(hex.replace("#", ""), 16);
export const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

export function embedLength(d: EmbedDraft) {
  return d.title.length + d.description.length + d.footer.length + d.authorName.length + d.fields.reduce((n, f) => n + f.name.length + f.value.length, 0);
}

export function hasEmbed(d: EmbedDraft) {
  return embedLength(d) > 0 || !!d.image.trim() || !!d.thumbnail.trim();
}

// `what` names the draft property (or "embed" for the total), so the UI can
// show its own translated label; `index` is set for fields.
export type Problem =
  | { key: "tooLong"; what: keyof EmbedDraft | "fieldName" | "fieldValue" | "embed"; limit: number; index?: number }
  | { key: "fieldEmpty"; index: number }
  | { key: "badUrl"; what: "url" | "authorIcon" | "image" | "thumbnail" | "footerIcon" }
  | { key: "empty" };

export function validate(d: EmbedDraft): Problem[] {
  const problems: Problem[] = [];
  const long = (what: Extract<Problem, { key: "tooLong" }>["what"], value: string, limit: number, index?: number) =>
    value.length > limit && problems.push({ key: "tooLong", what, limit, ...(index !== undefined && { index }) });
  long("content", d.content, LIMITS.content);
  long("title", d.title, LIMITS.title);
  long("description", d.description, LIMITS.description);
  long("footer", d.footer, LIMITS.footer);
  long("authorName", d.authorName, LIMITS.author);
  d.fields.forEach((f, i) => {
    long("fieldName", f.name, LIMITS.fieldName, i);
    long("fieldValue", f.value, LIMITS.fieldValue, i);
    // Discord rejects the whole message if a field's name or value is empty.
    if (!f.name.trim() || !f.value.trim()) problems.push({ key: "fieldEmpty", index: i });
  });
  if (embedLength(d) > LIMITS.total) problems.push({ key: "tooLong", what: "embed", limit: LIMITS.total });
  for (const what of ["url", "authorIcon", "image", "thumbnail", "footerIcon"] as const) {
    if (d[what].trim() && !isUrl(d[what])) problems.push({ key: "badUrl", what });
  }
  if (!d.content.trim() && !hasEmbed(d)) problems.push({ key: "empty" });
  return problems;
}

// Webhook / REST API body. Empty parts are left out rather than sent as ""
// - Discord rejects some empty strings (field values, footer text).
export function toPayload(d: EmbedDraft, now = new Date()) {
  const embed: Record<string, unknown> = {};
  if (d.authorName.trim()) embed.author = { name: d.authorName, ...(d.authorIcon.trim() && { icon_url: d.authorIcon.trim() }) };
  if (d.title.trim()) embed.title = d.title;
  if (d.url.trim()) embed.url = d.url.trim();
  if (d.description.trim()) embed.description = d.description;
  embed.color = colorInt(d.color);
  if (d.fields.length) embed.fields = d.fields.map((f) => ({ name: f.name, value: f.value, ...(f.inline && { inline: true }) }));
  if (d.image.trim()) embed.image = { url: d.image.trim() };
  if (d.thumbnail.trim()) embed.thumbnail = { url: d.thumbnail.trim() };
  if (d.footer.trim()) embed.footer = { text: d.footer, ...(d.footerIcon.trim() && { icon_url: d.footerIcon.trim() }) };
  if (d.timestamp) embed.timestamp = now.toISOString();
  return {
    ...(d.content.trim() && { content: d.content }),
    ...(hasEmbed(d) && { embeds: [embed] }),
  };
}

// Same message for the TSS bot (discord.js v14).
export function toDiscordJs(d: EmbedDraft) {
  const s = JSON.stringify;
  const lines = ["const embed = new EmbedBuilder()", `  .setColor(0x${d.color.replace("#", "").toLowerCase()})`];
  if (d.authorName.trim()) lines.push(`  .setAuthor({ name: ${s(d.authorName)}${d.authorIcon.trim() ? `, iconURL: ${s(d.authorIcon.trim())}` : ""} })`);
  if (d.title.trim()) lines.push(`  .setTitle(${s(d.title)})`);
  if (d.url.trim()) lines.push(`  .setURL(${s(d.url.trim())})`);
  if (d.description.trim()) lines.push(`  .setDescription(${s(d.description)})`);
  if (d.thumbnail.trim()) lines.push(`  .setThumbnail(${s(d.thumbnail.trim())})`);
  if (d.fields.length) {
    lines.push("  .addFields(");
    for (const f of d.fields) lines.push(`    { name: ${s(f.name)}, value: ${s(f.value)}${f.inline ? ", inline: true" : ""} },`);
    lines.push("  )");
  }
  if (d.image.trim()) lines.push(`  .setImage(${s(d.image.trim())})`);
  if (d.timestamp) lines.push("  .setTimestamp()");
  if (d.footer.trim()) lines.push(`  .setFooter({ text: ${s(d.footer)}${d.footerIcon.trim() ? `, iconURL: ${s(d.footerIcon.trim())}` : ""} })`);
  lines[lines.length - 1] += ";";
  const send = [d.content.trim() && `content: ${s(d.content)}`, hasEmbed(d) && "embeds: [embed]"].filter(Boolean).join(", ");
  return `${hasEmbed(d) ? `${lines.join("\n")}\n\n` : ""}await channel.send({ ${send} });`;
}

/* ------------------------------ Markdown subset ------------------------------ */

export type Token =
  | { type: "text"; text: string }
  | { type: "bold" | "italic" | "underline" | "strike" | "spoiler"; children: Token[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; children: Token[] };

// Order matters: ** before *, __ before _. [\s\S] instead of the `s` flag,
// which the ES2017 target doesn't allow - formatting can span lines.
const PATTERN = /\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|\*([\s\S]+?)\*|_([\s\S]+?)_|~~([\s\S]+?)~~|\|\|([\s\S]+?)\|\||`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;

// Inline formatting Discord renders in embed text: bold, italic,
// underline, strikethrough, spoilers, inline code and masked links.
// Headings, lists and code blocks are left as plain text.
export function parseMarkdown(text: string): Token[] {
  const out: Token[] = [];
  let rest = text;
  while (rest) {
    const m = PATTERN.exec(rest);
    if (!m) {
      out.push({ type: "text", text: rest });
      break;
    }
    if (m.index > 0) out.push({ type: "text", text: rest.slice(0, m.index) });
    const [, bold, underline, italicStar, italicUnderscore, strike, spoiler, code, linkText, href] = m;
    if (bold !== undefined) out.push({ type: "bold", children: parseMarkdown(bold) });
    else if (underline !== undefined) out.push({ type: "underline", children: parseMarkdown(underline) });
    else if (italicStar !== undefined || italicUnderscore !== undefined) out.push({ type: "italic", children: parseMarkdown(italicStar ?? italicUnderscore) });
    else if (strike !== undefined) out.push({ type: "strike", children: parseMarkdown(strike) });
    else if (spoiler !== undefined) out.push({ type: "spoiler", children: parseMarkdown(spoiler) });
    else if (code !== undefined) out.push({ type: "code", text: code });
    else out.push({ type: "link", href, children: parseMarkdown(linkText) });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}
