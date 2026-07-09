"use client";

import { useEffect, useState } from "react";
import {
  uploadDocument,
  fetchDocuments,
  analyzeDocument,
} from "@/services/documents-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Document {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  created_at: string;
  summary?: string | null;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
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
    } catch (err) {
      setError("Analysis failed");
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Documents</h1>
      <p className="text-muted-foreground mt-2">
        Upload and manage your investigation documents.
      </p>

      <div className="mt-6">
        <label htmlFor="file-upload">
          <Button asChild disabled={uploading}>
            <span>{uploading ? "Uploading..." : "Upload Document"}</span>
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

      {error && <p className="text-sm text-danger mt-4">{error}</p>}

      <div className="mt-6 space-y-3">
        {documents.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No documents uploaded yet.
          </p>
        )}
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {doc.filename}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {doc.file_type} · {doc.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                  {doc.status !== "analyzed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={analyzingId === doc.id}
                      onClick={() => handleAnalyze(doc.id)}
                    >
                      {analyzingId === doc.id ? "Analyzing..." : "Analyze"}
                    </Button>
                  )}
                </div>
              </div>

              {doc.summary && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {doc.summary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
