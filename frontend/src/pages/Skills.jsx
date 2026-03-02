import { useEffect, useState } from "react";
import {
  Wrench,
  Blocks,
  Eye,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Braces,
  FileJson,
  FlaskConical,
} from "lucide-react";
import { listSkills, testSkill } from "../api/client";
import JsonBlock from "../components/JsonBlock";

export default function Skills() {
  const [skills, setSkills] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    listSkills()
      .then((data) => {
        setSkills(data);
        if (data.length > 0) setSelected(data[0].name);
      })
      .catch(() => setSkills([]));
  }, []);

  const loading = skills === null;
  const active = skills?.find((s) => s.name === selected);

  return (
    <div className="flex h-full">
      {/* ── Skill list (left panel) ──────────────────────── */}
      <div className="w-72 shrink-0 border-r border-border bg-surface-raised/50 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-semibold">Skills</h1>
            {skills && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-surface-overlay text-[11px] font-mono text-text-muted">
                {skills.length}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <SkillListSkeleton />
        ) : skills.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted">
            No skills registered.
            <br />
            Start the backend to load skills.
          </div>
        ) : (
          <nav className="p-2 space-y-0.5">
            {skills.map((skill, i) => (
              <button
                key={skill.name}
                onClick={() => setSelected(skill.name)}
                className={[
                  "animate-card-in w-full text-left px-3 py-3 rounded-lg transition-colors",
                  selected === skill.name
                    ? "bg-accent/10 border border-accent/25"
                    : "border border-transparent hover:bg-surface-overlay",
                ].join(" ")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-2.5">
                  <Blocks className="w-4 h-4 text-text-muted shrink-0" />
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-medium truncate">
                      {skill.name}
                    </div>
                    <div className="text-[11px] text-text-muted truncate mt-0.5">
                      {Object.keys(skill.parameters?.properties || {}).length} param
                      {Object.keys(skill.parameters?.properties || {}).length !== 1 && "s"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* ── Detail panel (right) ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {active ? (
          <SkillDetail skill={active} />
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Select a skill to view details
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Skill Detail                                              */
/* ═══════════════════════════════════════════════════════════ */

function SkillDetail({ skill }) {
  // Build the Anthropic tool definition
  const toolDef = {
    name: skill.name,
    description: skill.description,
    input_schema: skill.parameters,
  };

  const properties = skill.parameters?.properties || {};
  const required = skill.parameters?.required || [];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-mono">{skill.name}</h2>
            <p className="text-sm text-text-secondary">{skill.description}</p>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <DetailSection icon={Braces} title="Parameters">
        {Object.keys(properties).length === 0 ? (
          <p className="text-xs text-text-muted">
            This skill takes no parameters.
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(properties).map(([name, schema]) => (
              <div
                key={name}
                className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-overlay text-text-muted">
                      {schema.type}
                    </span>
                    {required.includes(name) && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">
                        required
                      </span>
                    )}
                  </div>
                  {schema.description && (
                    <p className="text-xs text-text-secondary mt-1">
                      {schema.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Tool Definition */}
      <DetailSection icon={FileJson} title="Anthropic Tool Definition">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20">
            <Eye className="w-3.5 h-3.5 text-accent shrink-0" />
            <p className="text-xs text-accent">
              This is what Claude sees when deciding to use this skill.
              The <code className="font-mono bg-accent/10 px-1 py-0.5 rounded">input_schema</code> tells
              Claude what arguments to pass.
            </p>
          </div>
          <JsonBlock data={toolDef} />
        </div>
      </DetailSection>

      {/* Test Panel */}
      <DetailSection icon={FlaskConical} title="Test">
        <TestPanel skill={skill} />
      </DetailSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Test Panel                                                */
/* ═══════════════════════════════════════════════════════════ */

function TestPanel({ skill }) {
  const properties = skill.parameters?.properties || {};
  const paramNames = Object.keys(properties);

  const [values, setValues] = useState(() =>
    Object.fromEntries(paramNames.map((k) => [k, ""]))
  );
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  // Reset when skill changes
  useEffect(() => {
    setValues(Object.fromEntries(paramNames.map((k) => [k, ""])));
    setOutput(null);
    setError(null);
  }, [skill.name]);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    setError(null);
    try {
      const res = await testSkill(skill.name, values);
      setOutput(res.output);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Input fields */}
      {paramNames.map((name) => {
        const schema = properties[name];
        return (
          <div key={name}>
            <label className="block text-xs text-text-secondary mb-1">
              <span className="font-mono">{name}</span>
              <span className="text-text-muted ml-1.5">({schema.type})</span>
            </label>
            {schema.type === "string" && (name === "code" || name === "system_prompt") ? (
              <textarea
                value={values[name]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [name]: e.target.value }))
                }
                rows={4}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-accent resize-none"
                placeholder={schema.description}
              />
            ) : (
              <input
                value={values[name]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [name]: e.target.value }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-accent"
                placeholder={schema.description}
              />
            )}
          </div>
        );
      })}

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={running}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
      >
        {running ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {running ? "Running..." : "Test"}
      </button>

      {/* Output */}
      {output !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Result
          </div>
          <pre className="text-sm font-mono bg-surface border border-border rounded-lg p-4 overflow-x-auto whitespace-pre-wrap text-text-primary">
            {output}
          </pre>
        </div>
      )}

      {error && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-danger">
            <AlertCircle className="w-3.5 h-3.5" />
            Error
          </div>
          <pre className="text-sm font-mono bg-surface border border-danger/30 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap text-danger">
            {error}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Shared components                                         */
/* ═══════════════════════════════════════════════════════════ */

function DetailSection({ icon: Icon, title, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-text-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function SkillListSkeleton() {
  return (
    <div className="p-2 space-y-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-lg bg-surface-overlay animate-pulse"
        />
      ))}
    </div>
  );
}
