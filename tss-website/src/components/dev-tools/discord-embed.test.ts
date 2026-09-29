import { describe, expect, it } from "vitest";
import { EMPTY_EMBED, parseMarkdown, toDiscordJs, toPayload, validate, type EmbedDraft } from "./discord-embed";

const draft = (patch: Partial<EmbedDraft>): EmbedDraft => ({ ...EMPTY_EMBED, ...patch });

describe("toPayload", () => {
  it("leaves out empty parts", () => {
    expect(toPayload(draft({ title: "Turniej", color: "#dc3545" }))).toEqual({ embeds: [{ title: "Turniej", color: 0xdc3545 }] });
  });

  it("sends plain content without an embed", () => {
    expect(toPayload(draft({ content: "Hej @everyone" }))).toEqual({ content: "Hej @everyone" });
  });

  it("builds a full embed", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    const payload = toPayload(
      draft({
        authorName: "TSS",
        authorIcon: "https://example.com/a.png",
        title: "Event",
        url: "https://twostepsstudio.pl",
        description: "Opis",
        fields: [{ name: "Kiedy", value: "Jutro", inline: true }],
        image: "https://example.com/i.png",
        footer: "Stopka",
        timestamp: true,
      }),
      now
    );
    expect(payload.embeds?.[0]).toMatchObject({
      author: { name: "TSS", icon_url: "https://example.com/a.png" },
      fields: [{ name: "Kiedy", value: "Jutro", inline: true }],
      image: { url: "https://example.com/i.png" },
      footer: { text: "Stopka" },
      timestamp: "2026-09-29T12:00:00.000Z",
    });
  });
});

describe("validate", () => {
  it("flags an empty message", () => {
    expect(validate(EMPTY_EMBED)).toEqual([{ key: "empty" }]);
  });

  it("flags limits, empty fields and bad URLs", () => {
    const problems = validate(draft({ title: "x".repeat(257), fields: [{ name: "a", value: " ", inline: false }], image: "not a url" }));
    expect(problems).toContainEqual({ key: "tooLong", what: "title", limit: 256 });
    expect(problems).toContainEqual({ key: "fieldEmpty", index: 0 });
    expect(problems).toContainEqual({ key: "badUrl", what: "image" });
  });

  it("enforces the 6000 character total", () => {
    const problems = validate(draft({ description: "x".repeat(4000), fields: [{ name: "n", value: "y".repeat(1024), inline: false }, { name: "n", value: "y".repeat(1024), inline: false }] }));
    expect(problems).toContainEqual({ key: "tooLong", what: "embed", limit: 6000 });
  });
});

describe("toDiscordJs", () => {
  it("escapes strings and chains builder calls", () => {
    const code = toDiscordJs(draft({ title: 'Say "hi"', fields: [{ name: "a", value: "b", inline: true }] }));
    expect(code).toContain('.setTitle("Say \\"hi\\"")');
    expect(code).toContain('{ name: "a", value: "b", inline: true },');
    expect(code).toContain("await channel.send({ embeds: [embed] });");
  });
});

describe("parseMarkdown", () => {
  it("parses nested inline formatting", () => {
    expect(parseMarkdown("a **b _c_** `d` [e](https://x.pl)")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", children: [{ type: "text", text: "b " }, { type: "italic", children: [{ type: "text", text: "c" }] }] },
      { type: "text", text: " " },
      { type: "code", text: "d" },
      { type: "text", text: " " },
      { type: "link", href: "https://x.pl", children: [{ type: "text", text: "e" }] },
    ]);
  });

  it("does not turn javascript: links into links", () => {
    expect(parseMarkdown("[x](javascript:alert(1))")).toEqual([{ type: "text", text: "[x](javascript:alert(1))" }]);
  });
});
