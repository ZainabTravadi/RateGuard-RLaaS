import { api } from "@/lib/api"; // whatever axios/fetch wrapper you use

export async function fetchAlertRules(environmentId: string) {
  const res = await api(`/alerts/rules?environmentId=${environmentId}`, { method: 'GET' });
  return res;
}

export async function fetchAlertHistory(environmentId: string) {
  const res = await api(`/alerts/history?environmentId=${environmentId}`, { method: 'GET' });
  return res;
}

export async function toggleAlertRule(id: string) {
  await api(`/alerts/rules/${id}/toggle`, { method: 'PATCH' });
}
