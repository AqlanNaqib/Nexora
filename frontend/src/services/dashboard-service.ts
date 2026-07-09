import axios from "axios";
import { supabase } from "@/lib/supabase";

const API_URL = "http://127.0.0.1:8000";

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { Authorization: `Bearer ${token}` };
}

export async function fetchDashboardSummary() {
  const headers = await getAuthHeader();
  const response = await axios.get(`${API_URL}/dashboard/summary`, {
    headers,
  });
  return response.data;
}


export async function fetchEntitiesSummary() {
  const headers = await getAuthHeader();
  const response = await axios.get(`${API_URL}/entities/summary`, {
    headers,
  });
  return response.data;
}
