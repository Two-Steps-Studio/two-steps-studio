"use client";

import { useState, useEffect } from "react";
import { Download, Copy, ExternalLink, FileText, Archive, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DevProjectFile } from "@/lib/types/dev-types";

interface FallbackViewerProps {
  file: DevProjectFile;
  fileType: "pdf" | "office" | "archive" | "other";
  onLoad?: () => void;
}

export function FallbackViewer({ file, fileType, onLoad }: FallbackViewerProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    onLoad?.();
  }, [onLoad]);

  const handleCopy = () => {
    if (file.file_url) {
      navigator.clipboard.writeText(file.file_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (file.file_url) {
      const link = document.createElement("a");
      link.href = file.file_url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInNewTab = () => {
    if (file.file_url) {
      window.open(file.file_url, "_blank");
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case "pdf":
        return <FileText className="h-16 w-16 text-red-500" />;
      case "office":
        return <FileText className="h-16 w-16 text-blue-500" />;
      case "archive":
        return <Archive className="h-16 w-16 text-yellow-500" />;
      default:
        return <File className="h-16 w-16 text-gray-500" />;
    }
  };

  const getFileTypeLabel = () => {
    switch (fileType) {
      case "pdf":
        return "PDF Document";
      case "office":
        return "Office Document";
      case "archive":
        return "Archive";
      default:
        return file.mime_type || "Unknown";
    }
  };

  const getDescription = () => {
    switch (fileType) {
      case "pdf":
        return "This PDF file cannot be previewed in the browser. Download it to view the content.";
      case "office":
        return "Office documents (DOCX, XLSX, PPTX) cannot be previewed directly. Download the file to view it.";
      case "archive":
        return "Archive files contain multiple files. Download to extract and view the contents.";
      default:
        return "This file type cannot be previewed. Download it to view the content.";
    }
  };

  return (
    <div className="h-full bg-[var(--bg)] flex items-center justify-center p-8">
      <Card className="max-w-md w-full bg-[var(--card-bg)] border-[var(--border-color)]">
        <CardContent className="p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            {getFileIcon()}
          </div>

          {/* File info */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-[var(--text)]">{file.name}</h3>
            <Badge variant="outline" className="text-xs">
              {getFileTypeLabel()}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {getDescription()}
          </p>

          {/* File details */}
          <div className="space-y-2 text-sm text-left bg-[var(--bg)] p-4 rounded-lg border border-[var(--border-color)]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span className="text-[var(--text)]">{formatFileSize(file.size_bytes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="text-[var(--text)]">{file.mime_type || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Added:</span>
              <span className="text-[var(--text)]">{formatDate(file.created_at)}</span>
            </div>
            {file.category && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="text-[var(--text)] capitalize">{file.category}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleDownload}
              className="w-full bg-[var(--color-dev)] hover:bg-[var(--color-dev)]/80"
            >
              <Download className="mr-2 h-4 w-4" />
              Download File
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleOpenInNewTab}
                className="flex-1 border-[var(--border-color)] text-[var(--text)] hover:bg-[var(--bg)]"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>

              <Button
                variant="outline"
                onClick={handleCopy}
                className="flex-1 border-[var(--border-color)] text-[var(--text)] hover:bg-[var(--bg)]"
              >
                {copied ? (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
