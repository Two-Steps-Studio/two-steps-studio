import type { GameCategory, GameStatus } from "@/types/games-records";
import type { TranslationT } from "@/hooks/use-translation";

export function getGameCategoryLabels(t: TranslationT): Record<GameCategory, string> {
  return {
    action: t.gamesCatalog.categories.akcja,
    adventure: t.gamesCatalog.categories.przygodowa,
    rpg: t.gamesCatalog.categories.rpg,
    strategy: t.gamesCatalog.categories.strategia,
    simulation: t.gamesCatalog.categories.symulacja,
    sports: t.gamesCatalog.categories.sportowa,
    racing: t.gamesCatalog.categories.wyscigi,
    puzzle: t.gamesCatalog.categories.logiczna,
    horror: t.gamesCatalog.categories.horror,
    indie: t.gamesCatalog.categories.indie,
    other: t.gamesCatalog.categories.inne,
  };
}

export function getGameStatusLabels(t: TranslationT): Record<GameStatus, string> {
  return {
    draft: t.gamesCatalog.statuses.szkic,
    published: t.gamesCatalog.statuses.opublikowana,
    archived: t.gamesCatalog.statuses.zarchiwizowana,
    coming_soon: t.gamesCatalog.statuses.wkrotce,
  };
}
