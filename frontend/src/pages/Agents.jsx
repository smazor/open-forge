import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bot,
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Sparkles,
  Save,
  Thermometer,
  FileJson,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  listAgents,
  listSkills,
  createAgent,
  updateAgent,
  deleteAgent,
} from "../api/client";
import JsonBlock from "../components/JsonBlock";

const PROMPT_MAX = 1000;

export default function Agents() {
  const [agents, setAgents] = useState(null);
  const [skills, setSkills] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | agent id

  const load = () => {
    listAgents().then(setAgents).catch(() => setAgents([]));
    listSkills().then(setSkills).catch(() => setSkills([]));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    await deleteAgent(id);
    if (editing === id) setEditing(null);
    load();
  };

  const loading = agents === null;

  return (
    <div className="flex h-full">
      {/* ── Agent list (left panel) ──────────────────────── */}
      <div className="w-72 shrink-0 border-r border-border bg-surface-raised/50 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-semibold">Agents</h1>
            {agents && (
              <span className="px-2 py-0.5 rounded-full bg-surface-overlay text-[11px] font-mono text-text-muted">
                {agents.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setEditing("new")}
            className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-surface-overlay transition-colors"
            title="New Agent"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : agents.length === 0 && editing !== "new" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Bot className="w-8 h-8 text-text-muted mb-3 opacity-40" />
            <p className="text-xs text-text-muted mb-3">No agents yet</p>
            <button
              onClick={() => setEditing("new")}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-dim transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Agent
            </button>
          </div>
        ) : (
          <nav className="flex-1 p-2 space-y-0.5">
            {/* New agent entry */}
            {editing === "new" && (
              <div className="px-3 py-3 rounded-lg bg-accent/10 border border-accent/25">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-sm font-medium text-accent">
                    New Agent
                  </span>
                </div>
              </div>
            )}

            {agents.map((agent, i) => (
              <div
                key={agent.id}
                className="animate-card-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <button
                  onClick={() => setEditing(agent.id)}
                  className={[
                    "w-full text-left px-3 py-3 rounded-lg transition-colors",
                    editing === agent.id
                      ? "bg-accent/10 border border-accent/25"
                      : "border border-transparent hover:bg-surface-overlay",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {agent.name}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {agent.skill_names.length} skill
                        {agent.skill_names.length !== 1 && "s"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Link
                        to={`/chat/${agent.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-text-muted hover:text-accent transition-colors"
                        title="Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(agent.id);
                        }}
                        className="p-1 rounded text-text-muted hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </nav>
        )}
      </div>

      {/* ── Editor panel (right) ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {editing !== null ? (
          <AgentEditor
            key={editing}
            agentId={editing}
            agents={agents || []}
            availableSkills={skills}
            onSaved={() => {
              load();
            }}
            setEditing={setEditing}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm gap-3">
            <Bot className="w-8 h-8 opacity-30" />
            Select an agent to edit or create a new one
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Agent Editor                                              */
/* ═══════════════════════════════════════════════════════════ */

function AgentEditor({
  agentId,
  agents,
  availableSkills,
  onSaved,
  setEditing,
}) {
  const navigate = useNavigate();
  const isNew = agentId === "new";
  const existing = isNew ? null : agents.find((a) => a.id === agentId);

  const [name, setName] = useState(existing?.name ?? "");
  const [systemPrompt, setSystemPrompt] = useState(
    existing?.system_prompt ?? "",
  );
  const [selectedSkills, setSelectedSkills] = useState(
    existing?.skill_names ?? [],
  );
  const [temperature, setTemperature] = useState(existing?.temperature ?? 1.0);
  const [saving, setSaving] = useState(false);

  const toggleSkill = (skillName) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName)
        ? prev.filter((s) => s !== skillName)
        : [...prev, skillName],
    );
  };

  const configPayload = {
    name: name || "Untitled Agent",
    system_prompt: systemPrompt,
    skill_names: selectedSkills,
    temperature,
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let result;
      if (isNew) {
        result = await createAgent(configPayload);
      } else {
        result = await updateAgent(agentId, configPayload);
      }
      onSaved();
      navigate(`/chat/${result.id}`);
    } catch {
      setSaving(false);
    }
  };

  const tempLabel =
    temperature <= 0.3
      ? "Precise"
      : temperature <= 0.7
        ? "Balanced"
        : "Creative";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Form (3 cols) ──────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              {isNew ? (
                <Sparkles className="w-5 h-5 text-accent" />
              ) : (
                <Pencil className="w-5 h-5 text-accent" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isNew ? "Create Agent" : "Edit Agent"}
              </h2>
              <p className="text-xs text-text-secondary">
                {isNew
                  ? "Configure a new AI agent with custom skills."
                  : `Editing agent #${agentId}`}
              </p>
            </div>
          </div>

          {/* Name */}
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="e.g. Research Assistant"
            />
          </Field>

          {/* System Prompt */}
          <Field
            label="System Prompt"
            hint={
              <span
                className={
                  systemPrompt.length > PROMPT_MAX
                    ? "text-danger"
                    : "text-text-muted"
                }
              >
                {systemPrompt.length} / {PROMPT_MAX}
              </span>
            }
          >
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors resize-none leading-relaxed"
              placeholder="You are a helpful assistant that..."
            />
          </Field>

          {/* Skills */}
          <Field label="Skills">
            <div className="space-y-2">
              {availableSkills.map((skill) => {
                const active = selectedSkills.includes(skill.name);
                return (
                  <label
                    key={skill.name}
                    className={[
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      active
                        ? "bg-accent/5 border-accent/30"
                        : "bg-surface border-border hover:border-border-bright/30",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleSkill(skill.name)}
                      className="mt-0.5 accent-accent"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {skill.name}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                        {skill.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </Field>

          {/* Temperature */}
          <Field
            label="Temperature"
            hint={
              <span className="font-mono">
                {temperature.toFixed(1)}{" "}
                <span className="text-text-muted font-sans">({tempLabel})</span>
              </span>
            }
          >
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>0.0 Precise</span>
                <span>0.5 Balanced</span>
                <span>1.0 Creative</span>
              </div>
            </div>
          </Field>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isNew ? "Create & Chat" : "Save & Chat"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ── Preview panel (2 cols) ─────────────────────── */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-text-muted" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Config Preview
              </h3>
            </div>
            <JsonBlock
              data={
                isNew
                  ? configPayload
                  : { id: agentId, ...configPayload }
              }
            />
            {selectedSkills.length > 0 && (
              <div className="text-[11px] text-text-muted leading-relaxed px-1">
                This agent will have access to{" "}
                <span className="text-text-secondary font-medium">
                  {selectedSkills.length}
                </span>{" "}
                tool{selectedSkills.length !== 1 && "s"} when chatting.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Shared                                                    */
/* ═══════════════════════════════════════════════════════════ */

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-text-secondary">
          {label}
        </label>
        {hint && <span className="text-[11px]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="p-2 space-y-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-lg bg-surface-overlay animate-pulse"
        />
      ))}
    </div>
  );
}
