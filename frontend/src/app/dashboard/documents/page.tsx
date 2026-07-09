"use client";

import { useEffect, useState } from "react";
import { uploadDocument, fetchDocuments } from "@/services/documents-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Document {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
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
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{doc.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.file_type} · {doc.status}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(doc.created_at).toLocaleDateString()}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
