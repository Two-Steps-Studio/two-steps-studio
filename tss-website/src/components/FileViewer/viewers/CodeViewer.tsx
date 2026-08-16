"use client";

import { useState, useEffect, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { 
  vscDarkPlus, 
  vs,
  oneDark, 
  oneLight,
  dracula
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Search, WrapText, Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DevProjectFile } from "@/lib/types/dev-types";

interface CodeViewerProps {
  file: DevProjectFile;
  onLoad?: () => void;
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  css: "css",
  scss: "scss",
  html: "html",
  md: "markdown",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  sql: "sql",
  py: "python",
  cs: "csharp",
  cpp: "cpp",
  h: "c",
  java: "java",
  php: "php",
  sh: "bash",
  rb: "ruby",
  go: "go",
  rs: "rust",
};

const THEMES = {
  dark: {
    "VS Code Dark": vscDarkPlus,
    "One Dark": oneDark,
    "Dracula": dracula,
  },
  light: {
    "VS Code Light": vs,
    "One Light": oneLight,
  }
};

export function CodeViewer({ file, onLoad }: CodeViewerProps) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState("VS Code Dark");
  const [isDark, setIsDark] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const extension = file.name.split('.').pop()?.toLowerCase() || "";
  const language = LANGUAGE_MAP[extension] || "text";

  useEffect(() => {
    const fetchCode = async () => {
      try {
        if (file.file_url) {
          const response = await fetch(file.file_url);
          const text = await response.text();
          setCode(text);
        }
      } catch (error) {
        console.error("Failed to fetch code:", error);
        setCode("// Failed to load file content");
      } finally {
        setIsLoading(false);
        onLoad?.();
      }
    };

    fetchCode();
  }, [file.file_url, onLoad]);

  // Detect system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const currentTheme = isDark ? THEMES.dark[theme as keyof typeof THEMES.dark] : THEMES.light[theme as keyof typeof THEMES.light];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-dev)] mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[var(--bg)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)] bg-[var(--card-bg)]">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {language}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {code.split('\n').length} lines
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="flex items-center gap-2 mr-2">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 bg-[var(--bg)] border-[var(--border-color)] text-[var(--text)]"
              />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="text-[var(--text)] hover:bg-[var(--bg)]"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWrapLines(!wrapLines)}
            className={`text-[var(--text)] hover:bg-[var(--bg)] ${wrapLines ? "bg-[var(--bg)]" : ""}`}
            title="Wrap lines"
          >
            <WrapText className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`text-[var(--text)] hover:bg-[var(--bg)] ${showLineNumbers ? "bg-[var(--bg)]" : ""}`}
            title="Line numbers"
          >
            <span className="text-xs font-mono">#</span>
          </Button>

          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="h-8 w-8 border-none p-0">
              <Settings className="h-4 w-4 text-[var(--text)]" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--card-bg)] border-[var(--border-color)]">
              {Object.keys(isDark ? THEMES.dark : THEMES.light).map((t) => (
                <SelectItem key={t} value={t} className="text-[var(--text)]">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="text-[var(--text)] hover:bg-[var(--bg)]"
            title="Copy code"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={currentTheme || vscDarkPlus}
          showLineNumbers={showLineNumbers}
          wrapLines={wrapLines}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "14px",
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
          }}
          codeTagProps={{
            style: {
              fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
