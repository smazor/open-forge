const BASE_URL = "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Skills ──────────────────────────────────────────────────
export function listSkills() {
  return request("/api/skills");
}

export function testSkill(name, input) {
  return request(`/api/skills/${name}/test`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

// ── Agents ──────────────────────────────────────────────────
export function listAgents() {
  return request("/api/agents");
}

export function getAgent(id) {
  return request(`/api/agents/${id}`);
}

export function createAgent(data) {
  return request("/api/agents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAgent(id, data) {
  return request(`/api/agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAgent(id) {
  return request(`/api/agents/${id}`, { method: "DELETE" });
}
