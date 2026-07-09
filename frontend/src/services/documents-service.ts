import axios from "axios";
import { supabase } from "@/lib/supabase";

const API_URL = "http://127.0.0.1:8000";

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { Authorization: `Bearer ${token}` };
}

export async function uploadDocument(file: File, investigationId?: string) {
  const headers = await getAuthHeader();
  const formData = new FormData();
  formData.append("file", file);
  if (investigationId) {
    formData.append("investigation_id", investigationId);
  }

  const response = await axios.post(`${API_URL}/documents/upload`, formData, {
    headers: {
      ...headers,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function fetchDocuments() {
  const headers = await getAuthHeader();
  const response = await axios.get(`${API_URL}/documents`, { headers });
  return response.data;
}

export async function analyzeDocument(documentId: string) {
  const headers = await getAuthHeader();
  const response = await axios.post(
    `${API_URL}/documents/${documentId}/analyze`,
    {},
    { headers },
  );
  return response.data;
}

export async function deleteDocument(documentId: string) {
  const headers = await getAuthHeader();
  const response = await axios.delete(`${API_URL}/documents/${documentId}`, {
    headers,
  });
  return response.data;
}


export async function resetAllAnalysis() {
  const headers = await getAuthHeader();
  const response = await axios.post(
    `${API_URL}/documents/reset-analysis`,
    {},
    { headers }
  );
  return response.data;
}
