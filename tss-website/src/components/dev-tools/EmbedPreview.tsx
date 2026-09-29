"use client";

import type { ReactNode } from "react";
import { hasEmbed, isUrl, parseMarkdown, type EmbedDraft, type Token } from "./discord-embed";

// Discord's own dark-theme colors, hard-coded on purpose: this is a
// picture of Discord, not part of the site's theme.

function render(tokens: Token[]): ReactNode[] {
  return tokens.map((t, i) => {
    switch (t.type) {
      case "text":
        return t.text;
      case "bold":
        return <strong key={i}>{render(t.children)}</strong>;
      case "italic":
        return <em key={i}>{render(t.children)}</em>;
      case "underline":
        return <u key={i}>{render(t.children)}</u>;
      case "strike":
        return <s key={i}>{render(t.children)}</s>;
      case "spoiler":
        return (
          <span key={i} className="rounded bg-[#1e1f22] px-0.5 text-transparent transition-colors hover:text-inherit">
            {render(t.children)}
          </span>
        );
      case "code":
        return (
          <code key={i} className="rounded bg-[#1e1f22] px-1 py-0.5 font-mono text-[0.85em]">
            {t.text}
          </code>
        );
      case "link":
        return (
          <a key={i} href={t.href} target="_blank" rel="noopener noreferrer nofollow" className="text-[#00a8fc] hover:underline">
            {render(t.children)}
          </a>
        );
    }
  });
}

const Markdown = ({ text }: { text: string }) => <>{render(parseMarkdown(text))}</>;

// Plain <img> on purpose: arbitrary user-supplied URLs, shown as-is like
// Discord would (next/image would need every host allow-listed).
export function EmbedPreview({ draft, now }: { draft: EmbedDraft; now: string }) {
  const d = draft;
  // Discord lays inline fields out three per row; a non-inline field
  // takes a full row.
  return (
    <div className="rounded-2xl bg-[#313338] p-4 text-[0.9375rem] leading-[1.375rem] text-[#dbdee1]">
      <div className="flex gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1bbdbd] text-sm font-bold text-black">TSS</div>
        <div className="min-w-0 flex-1">
          <p>
            <span className="font-medium text-white">Two Steps Studio</span>
            <span className="ml-1 rounded bg-[#5865f2] px-1 py-px align-middle text-[0.625rem] font-semibold text-white">APP</span>
            <span className="ml-2 text-xs text-[#949ba4]">{now}</span>
          </p>
          {d.content.trim() && (
            <p className="break-words whitespace-pre-wrap">
              <Markdown text={d.content} />
            </p>
          )}
          {hasEmbed(d) && (
            <div className="mt-1 grid max-w-[32rem] rounded border-l-4 bg-[#2b2d31] py-2 pr-4 pl-3" style={{ borderLeftColor: d.color }}>
              <div className="flex gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  {d.authorName.trim() && (
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      {isUrl(d.authorIcon) && <img src={d.authorIcon} alt="" className="size-6 rounded-full" />}
                      {d.authorName}
                    </p>
                  )}
                  {d.title.trim() && (
                    <p className="font-semibold break-words text-white">
                      {isUrl(d.url) ? (
                        <a href={d.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[#00a8fc] hover:underline">
                          <Markdown text={d.title} />
                        </a>
                      ) : (
                        <Markdown text={d.title} />
                      )}
                    </p>
                  )}
                  {d.description.trim() && (
                    <p className="text-sm break-words whitespace-pre-wrap">
                      <Markdown text={d.description} />
                    </p>
                  )}
                  {d.fields.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {d.fields.map((f, i) => (
                        <div key={i} className={f.inline ? "min-w-0" : "col-span-3"}>
                          <p className="text-sm font-semibold break-words text-white">
                            <Markdown text={f.name} />
                          </p>
                          <p className="text-sm break-words whitespace-pre-wrap">
                            <Markdown text={f.value} />
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isUrl(d.thumbnail) && <img src={d.thumbnail} alt="" className="size-20 shrink-0 rounded object-cover" />}
              </div>
              {isUrl(d.image) && <img src={d.image} alt="" className="mt-4 max-h-80 w-full rounded object-cover" />}
              {(d.footer.trim() || d.timestamp) && (
                <p className="mt-2 flex items-center gap-2 text-xs text-[#dbdee1]">
                  {isUrl(d.footerIcon) && <img src={d.footerIcon} alt="" className="size-5 rounded-full" />}
                  {d.footer}
                  {d.footer.trim() && d.timestamp && " • "}
                  {d.timestamp && now}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
