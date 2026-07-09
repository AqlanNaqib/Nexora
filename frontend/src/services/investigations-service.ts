import axios from "axios";
import { supabase } from "@/lib/supabase";

const API_URL = "http://127.0.0.1:8000";

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { Authorization: `Bearer ${token}` };
}

export async function createInvestigation(title: string, description?: string) {
  const headers = await getAuthHeader();
  const response = await axios.post(
    `${API_URL}/investigations`,
    { title, description },
    { headers }
  );
  return response.data;
}

export async function fetchInvestigations() {
  const headers = await getAuthHeader();
  const response = await axios.get(`${API_URL}/investigations`, { headers });
  return response.data;
}

export async function fetchInvestigation(id: string) {
  const headers = await getAuthHeader();
  const response = await axios.get(`${API_URL}/investigations/${id}`, {
    headers,
  });
  return response.data;
}

export async function deleteInvestigation(id: string) {
  const headers = await getAuthHeader();
  const response = await axios.delete(`${API_URL}/investigations/${id}`, {
    headers,
  });
  return response.data;
}


export async function synthesizeInvestigation(id: string) {
  const headers = await getAuthHeader();
  const response = await axios.post(
    `${API_URL}/investigations/${id}/synthesize`,
    {},
    { headers }
  );
  return response.data;
}
