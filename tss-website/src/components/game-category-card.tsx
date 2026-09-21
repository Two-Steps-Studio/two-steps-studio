import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export function GameCategoryCard({
  title,
  description,
  count,
  category,
  href
}: {
  title: string;
  description: string;
  count: string;
  category: string;
  href: string;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-[2.5rem] bg-white/0 dark:bg-black/40 border-2 border-black dark:border-[var(--color-games)]/10 hover:border-[var(--color-games)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-games)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-700">
        <Gamepad2 size={120} className="text-[var(--color-games)]" />
      </div>

      <CardHeader className="relative z-10 pb-4">
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-2xl font-bold font-[family-name:var(--font-space)] text-[var(--text)] group-hover:text-[var(--color-games)] transition-colors line-clamp-1">
            {title}
          </CardTitle>
          <Badge variant="secondary" className="bg-[var(--color-games)]/10 text-[var(--color-games)] border border-[var(--color-games)]/20 shrink-0">
            {category}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)] font-[family-name:var(--font-outfit)] text-sm">
          <Calendar size={14} />
          <span className="text-[var(--text-muted)]">Dostępna od premiery</span>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-0 flex-1 flex flex-col justify-between">
        <p className="text-[var(--text-muted)] font-[family-name:var(--font-outfit)] leading-relaxed line-clamp-3">
          {description}
        </p>

        <div className="mt-6 pt-6 border-t border-[var(--border-color)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">{count}</span>
          <Link
            href={href}
            className="h-8 w-8 rounded-full bg-[var(--color-games)]/10 flex items-center justify-center text-[var(--color-games)] opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}