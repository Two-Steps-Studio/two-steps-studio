"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  X,
  Download,
  ExternalLink,
  Copy,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Search,
  Play,
  Pause,
  Volume2,
  Settings,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Code,
  Archive,
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DevProjectFile } from "@/lib/types/dev-types";
import { useLanguage } from "@/hooks/use-translation";

// Sub-viewers
import { ImageViewer } from "./viewers/ImageViewer";
import { CodeViewer } from "./viewers/CodeViewer";
import { TextViewer } from "./viewers/TextViewer";
import { AudioViewer } from "./viewers/AudioViewer";
import { VideoViewer } from "./viewers/VideoViewer";
import { FallbackViewer } from "./viewers/FallbackViewer";

interface FileViewerProps {
  file: DevProjectFile | null;
  files: DevProjectFile[];
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (fileId: number) => void;
}

type FileType = "image" | "pdf" | "audio" | "video" | "code" | "text" | "office" | "archive" | "other";

function getFileType(file: DevProjectFile): FileType {
  const extension = file.name.split('.').pop()?.toLowerCase() || "";
  const mime = file.mime_type || "";

  // Images
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp"].includes(extension) || 
      mime.startsWith("image/")) {
    return "image";
  }

  // PDF
  if (extension === "pdf" || mime === "application/pdf") {
    return "pdf";
  }

  // Audio
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(extension) || 
      mime.startsWith("audio/")) {
    return "audio";
  }

  // Video
  if (["mp4", "webm", "mov", "avi", "mkv", "flv"].includes(extension) || 
      mime.startsWith("video/")) {
    return "video";
  }

  // Code files
  const codeExtensions = ["ts", "tsx", "js", "jsx", "json", "css", "scss", "html", "md", "xml", "yaml", "yml", "sql", "py", "cs", "cpp", "h", "java", "php", "sh", "rb", "go", "rs"];
  if (codeExtensions.includes(extension)) {
    return "code";
  }

  // Text files
  if (["txt", "log", "csv", "ini", "config", "env"].includes(extension) || 
      mime.startsWith("text/")) {
    return "text";
  }

  // Office files
  if (["docx", "doc", "xlsx", "xls", "pptx", "ppt"].includes(extension)) {
    return "office";
  }

  // Archives
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return "archive";
  }

  return "other";
}

function getFileIcon(type: FileType) {
  switch (type) {
    case "image": return <ImageIcon className="h-5 w-5" />;
    case "pdf": return <FileText className="h-5 w-5" />;
    case "audio": return <Music className="h-5 w-5" />;
    case "video": return <Film className="h-5 w-5" />;
    case "code": return <Code className="h-5 w-5" />;
    case "text": return <FileText className="h-5 w-5" />;
    case "office": return <FileText className="h-5 w-5" />;
    case "archive": return <Archive className="h-5 w-5" />;
    default: return <File className="h-5 w-5" />;
  }
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "-";
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function FileViewer({ file, files, isOpen, onClose, onDelete }: FileViewerProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Update current index when file changes
  useEffect(() => {
    if (file) {
      const index = files.findIndex(f => f.id === file.id);
      setCurrentIndex(index >= 0 ? index : 0);
      setIsLoading(true);
    }
  }, [file, files]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
          break;
        case "ArrowRight":
          if (currentIndex < files.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, files.length, onClose]);

  const currentFile = files[currentIndex] || file;
  const fileType = currentFile ? getFileType(currentFile) : "other";

  const handleCopyUrl = useCallback(() => {
    if (currentFile?.file_url) {
      navigator.clipboard.writeText(currentFile.file_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentFile]);

  const handleDownload = useCallback(() => {
    if (currentFile?.file_url) {
      const link = document.createElement("a");
      link.href = currentFile.file_url;
      link.download = currentFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [currentFile]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsLoading(true);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < files.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsLoading(true);
    }
  }, [currentIndex, files.length]);

  const handleDelete = useCallback(() => {
    if (onDelete && currentFile && confirm(`${t.compFileViewer.confirmDelete} "${currentFile.name}"?`)) {
      onDelete(currentFile.id);
      onClose();
    }
  }, [onDelete, currentFile, onClose]);

  if (!currentFile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-[var(--card-bg)] border-[var(--border-color)]">
        <DialogTitle className="sr-only">File viewer: {currentFile.name}</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-[var(--bg)]">
              {getFileIcon(fileType)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-[var(--text)] truncate">{currentFile.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatFileSize(currentFile.size_bytes)}</span>
                <span>•</span>
                <span>{formatDate(currentFile.created_at)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyUrl}
              className="text-[var(--text)] hover:bg-[var(--bg)]"
              title={t.compFileViewer.copyLink}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-[var(--text)] hover:bg-[var(--bg)]"
              title={t.compFileViewer.download}
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {currentFile.file_url && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(currentFile.file_url, "_blank")}
                className="text-[var(--text)] hover:bg-[var(--bg)]"
                title={t.compFileViewer.openInNewTab}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-red-500 hover:bg-red-500/10"
                title={t.compFileViewer.delete}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-[var(--text)] hover:bg-[var(--bg)]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden" ref={viewerRef}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--card-bg)] z-10">
              <div className="text-center">
                <Skeleton className="h-8 w-8 mx-auto mb-4 rounded-full" />
                <p className="text-sm text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {files.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--bg)]"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={currentIndex === files.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--bg)]"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* File counter */}
          {files.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
              <Badge variant="secondary" className="bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text)]">
                {currentIndex + 1} / {files.length}
              </Badge>
            </div>
          )}

          {/* Viewer content */}
          <div className="h-full overflow-auto">
            {fileType === "image" && (
              <ImageViewer file={currentFile} onLoad={() => setIsLoading(false)} />
            )}
            
            {fileType === "code" && (
              <CodeViewer file={currentFile} onLoad={() => setIsLoading(false)} />
            )}
            
            {fileType === "text" && (
              <TextViewer file={currentFile} onLoad={() => setIsLoading(false)} />
            )}
            
            {fileType === "audio" && (
              <AudioViewer file={currentFile} onLoad={() => setIsLoading(false)} />
            )}
            
            {fileType === "video" && (
              <VideoViewer file={currentFile} onLoad={() => setIsLoading(false)} />
            )}
            
            {(fileType === "pdf" || fileType === "office" || fileType === "archive" || fileType === "other") && (
              <FallbackViewer file={currentFile} fileType={fileType} onLoad={() => setIsLoading(false)} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
