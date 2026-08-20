"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, Upload, FileJson } from "lucide-react";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

interface LanguageSelectProps {
  showImport?: boolean;
  customUploadUrl?: string;
}

export function LanguageSelect({
  showImport = false,
  customUploadUrl,
}: LanguageSelectProps) {
  const { t, availableLanguages, language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang as keyof typeof t);
    setIsOpen(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      // Tutaj możesz dodać logikę importu tłumaczeń
      console.log("Importowanie tłumaczeń z:", file.name);
      console.log("Treść pliku:", text);

      // Możesz dodać tutaj wywołanie importTranslations z use-language
    } catch (error) {
      console.error("Błąd podczas importu tłumaczeń:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative rounded-2xl w-11 h-11 bg-[var(--bg)] border border-[var(--border-color)] transition-all cursor-pointer",
          )}
        >
          <Languages size={20} />
          <span className="absolute -top-1 -right-1 bg-[var(--color-general)] text-white text-[10px] px-1.5 rounded-full font-black">
            {language.toUpperCase()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-80 p-0 overflow-hidden bg-[var(--bg)] border border-[var(--border-color)] shadow-2xl rounded-2xl max-w-[calc(100vw-2rem)]",
        )}
        align="end"
      >
        {/* Lista języków */}
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-2 text-sm font-bold text-[var(--text)] border-[var(--border-color)]">
            {t.settings.language}
          </div>
          {availableLanguages.map((locale) => (
            <motion.button
              key={locale}
              onClick={() => handleLanguageSelect(locale)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                language === locale
                  ? "bg-[var(--color-general)]/20 text-[var(--color-general)]"
                  : "hover:bg-white/5 hover:text-white dark:hover:text-black",
              )}
            >
              {locale.toUpperCase()}
            </motion.button>
          ))}
        </div>

        {/* Import translations */}
        {showImport && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 pt-2 border-t border-white/10"
          >
            <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Importuj własne tłumaczenia
            </div>
            <div className="space-y-2 px-1">
              <label
                htmlFor="translation-upload"
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all",
                  "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20",
                  "text-white/80 hover:text-white",
                )}
              >
                <Upload size={14} />
                <span>Wybierz plik .json</span>
                <input
                  id="translation-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="text-[10px] text-muted-foreground px-2">
                <p className="mb-1">Format JSON:</p>
                <pre className={cn(
                  "text-[10px] p-2 rounded bg-black/30 overflow-auto max-h-[80px]",
                  "font-mono text-white/70",
                )}>
{`{
  "settings": {
    "title": "Moja tytuł",
    "subtitle": "Moje podtytuł",
    ...
  },
  "nav": {
    "home": "Moja główna",
    ...
  },
  ...
}`}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </PopoverContent>
    </Popover>
  );
}
