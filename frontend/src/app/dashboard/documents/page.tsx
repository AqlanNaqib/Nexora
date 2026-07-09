"use client";

import { useEffect, useState } from "react";
import {
  uploadDocument,
  fetchDocuments,
  analyzeDocument,
  deleteDocument,
} from "@/services/documents-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Upload,
  ChevronDown,
  ChevronRight,
  FileUp,
  Trash2,
} from "lucide-react";

interface Document {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  created_at: string;
  summary?: string | null;
}

function StatusDot({ status }: { status: string }) {
  const isAnalyzed = status === "analyzed";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isAnalyzed ? "bg-success" : "bg-muted-foreground/50"
        }`}
      />
      {isAnalyzed ? "Analyzed" : "Uploaded"}
    </span>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function startFetching() {
      try {
        const data = await fetchDocuments();
        if (!ignore) setDocuments(data);
      } catch (err) {
        if (!ignore) setError("Failed to load documents");
      }
    }

    startFetching();

    return () => {
      ignore = true;
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await uploadDocument(file);
      const data = await fetchDocuments();
      setDocuments(data);
    } catch (err) {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async (documentId: string) => {
    setAnalyzingId(documentId);
    setError(null);
    try {
      const updated = await analyzeDocument(documentId);
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === documentId ? updated : doc))
      );
      setExpandedIds((prev) => new Set(prev).add(documentId));
    } catch (err) {
      setError("Analysis failed");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;

    setDeletingId(documentId);
    setError(null);
    try {
      await deleteDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err) {
      setError("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpanded = (documentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  };

  const analyzedCount = documents.filter((d) => d.status === "analyzed").length;

  return (
    <div>
      <div className="flex items-start justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {documents.length} document{documents.length !== 1 && "s"}
            {documents.length > 0 && ` · ${analyzedCount} analyzed`}
          </p>
        </div>

        <label htmlFor="file-upload">
          <Button asChild disabled={uploading} size="sm">
            <span className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload"}
            </span>
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {error && (
        <p className="text-sm text-danger mt-4 border border-danger/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-4">
        {documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg">
            <FileUp className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-foreground text-sm font-medium">
              No documents yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a document to begin analysis
            </p>
          </div>
        )}

        {documents.map((doc) => {
          const isExpanded = expandedIds.has(doc.id);
          const canExpand = doc.status === "analyzed" && doc.summary;

          return (
            <Card
              key={doc.id}
              className="border-border border-x-0 border-t-0 rounded-none first:rounded-t-md last:rounded-b-md shadow-none"
            >
              <CardContent className="p-0">
                <div
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${
                    canExpand ? "cursor-pointer hover:bg-surface-hover" : ""
                  }`}
                  onClick={() => canExpand && toggleExpanded(doc.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {canExpand ? (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <StatusDot status={doc.status} />
                    {doc.status !== "analyzed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={analyzingId === doc.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyze(doc.id);
                        }}
                      >
                        {analyzingId === doc.id ? "Analyzing..." : "Analyze"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={deletingId === doc.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  </div>
                </div>

                {isExpanded && doc.summary && (
                  <div className="px-4 pb-4 pl-11">
                    <div className="bg-surface border border-border rounded-md px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Summary
                      </p>
                      <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                        {doc.summary}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
