import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Hammer,
  Wrench,
  Bot,
  MessageSquare,
  Plus,
  Blocks,
  Sparkles,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { listSkills, listAgents } from "../api/client";

export default function Dashboard() {
  const [skills, setSkills] = useState(null);
  const [agents, setAgents] = useState(null);

  useEffect(() => {
    listSkills().then(setSkills).catch(() => setSkills([]));
    listAgents().then(setAgents).catch(() => setAgents([]));
  }, []);

  const loading = skills === null || agents === null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Hammer className="w-5 h-5 text-accent" />
          </div>
          <h1 className="text-2xl font-bold">Mission Control</h1>
        </div>
        <p className="text-text-secondary text-sm">
          Overview of your agents and skills. Launch a chat or configure new
          agents.
        </p>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* ── Agents section ──────────────────────────────── */}
          <Section
            icon={Bot}
            title="Agents"
            count={agents.length}
            action={
              <Link
                to="/agents"
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dim transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Agent
              </Link>
            }
          >
            {agents.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="No agents yet"
                description="Create your first agent to start chatting with AI powered by custom skills."
                actionLabel="Create Agent"
                actionTo="/agents"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent, i) => (
                  <AgentCard key={agent.id} agent={agent} index={i} />
                ))}
              </div>
            )}
          </Section>

          {/* ── Skills section ──────────────────────────────── */}
          <Section
            icon={Wrench}
            title="Skills"
            count={skills.length}
            action={
              <Link
                to="/skills"
                className="text-sm text-text-secondary hover:text-accent transition-colors flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {skills.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No skills registered"
                description="Skills are tools your agents can use. Start the backend to load the built-in skill set."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {skills.map((skill, i) => (
                  <SkillCard
                    key={skill.name}
                    skill={skill}
                    index={i}
                    baseDelay={agents.length}
                  />
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

/* ── Section wrapper ─────────────────────────────────────── */

function Section({ icon: Icon, title, count, action, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            {title}
          </h2>
          {count > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-surface-overlay text-xs font-mono text-text-muted">
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Agent card ──────────────────────────────────────────── */

function AgentCard({ agent, index }) {
  const paramTotal = agent.skill_names.length;

  return (
    <div
      className="animate-card-in group relative flex flex-col justify-between p-5 rounded-xl bg-surface-raised border border-border hover:border-accent/40 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.06)]"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      {/* Top row */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded-md bg-surface-overlay">
            id:{agent.id}
          </span>
        </div>

        <div>
          <h3 className="font-semibold text-[15px] leading-tight">
            {agent.name}
          </h3>
          <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
            {agent.system_prompt || "No system prompt configured"}
          </p>
        </div>
      </div>

      {/* Skills pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {agent.skill_names.map((name) => (
          <span
            key={name}
            className="px-2 py-0.5 rounded-md bg-surface-overlay text-[11px] font-mono text-text-muted"
          >
            {name}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {paramTotal} skill{paramTotal !== 1 && "s"}
        </span>
        <Link
          to={`/chat/${agent.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
        >
          <MessageSquare className="w-3 h-3" />
          Chat
        </Link>
      </div>
    </div>
  );
}

/* ── Skill card ──────────────────────────────────────────── */

function SkillCard({ skill, index, baseDelay }) {
  const paramCount = Object.keys(skill.parameters?.properties || {}).length;

  return (
    <Link
      to="/skills"
      className="animate-card-in group flex flex-col p-4 rounded-xl bg-surface-raised border border-border hover:border-accent/40 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.06)]"
      style={{ animationDelay: `${(baseDelay + index) * 75}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center">
          <Blocks className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
        </div>
        <span className="text-[11px] font-mono text-text-muted">
          {paramCount} param{paramCount !== 1 && "s"}
        </span>
      </div>
      <h3 className="font-mono text-sm font-medium">{skill.name}</h3>
      <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
        {skill.description}
      </p>
    </Link>
  );
}

/* ── Empty state ─────────────────────────────────────────── */

function EmptyState({ icon: Icon, title, description, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border border-dashed border-border bg-surface-raised/50 text-center">
      <div className="w-12 h-12 rounded-xl bg-surface-overlay flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-text-muted" />
      </div>
      <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
      <p className="text-xs text-text-muted mt-1 max-w-xs">{description}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dim transition-colors"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/* ── Loading skeleton ────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="space-y-10">
      {[3, 4].map((count, s) => (
        <div key={s} className="space-y-4">
          <div className="h-4 w-24 rounded bg-surface-overlay animate-pulse" />
          <div
            className={`grid gap-4 ${s === 0 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}
          >
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-xl bg-surface-raised border border-border animate-pulse"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
