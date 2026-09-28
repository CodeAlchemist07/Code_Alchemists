"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Customer, HindsightMemoryResult, Message } from '../lib/types';
import type { AuthUser } from '../lib/auth';
import type { ProjectWorkspace } from '../lib/workspace';

type WorkspaceProject = ProjectWorkspace & { customer?: Customer };
type WorkspaceTab = 'Overview' | 'Cases' | 'Requirements' | 'Team' | 'Knowledge' | 'Repositories' | 'Cloud' | 'AI Usage' | 'Financials';

const tabs: WorkspaceTab[] = ['Overview', 'Cases', 'Requirements', 'Team', 'Knowledge', 'Repositories', 'Cloud', 'AI Usage', 'Financials'];
const navigation: Array<{ label: string; tab?: WorkspaceTab }> = [
  { label: 'My Work', tab: 'Overview' },
  { label: 'Projects', tab: 'Overview' },
  { label: 'Customers', tab: 'Overview' },
  { label: 'Cases', tab: 'Cases' },
  { label: 'AI Assistant', tab: 'Overview' },
  { label: 'Team', tab: 'Team' },
  { label: 'Knowledge', tab: 'Knowledge' },
  { label: 'Repositories', tab: 'Repositories' },
  { label: 'Cloud Environments', tab: 'Cloud' },
  { label: 'AI Usage', tab: 'AI Usage' },
  { label: 'Project Financials', tab: 'Financials' },
  { label: 'Settings' },
];

export default function Page() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('meridian');
  const [selectedCaseId, setSelectedCaseId] = useState('2217');
  const [tab, setTab] = useState<WorkspaceTab>('Overview');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [memoryResults, setMemoryResults] = useState<HindsightMemoryResult[]>([]);
  const [recommendedActions, setRecommendedActions] = useState<string[]>([]);
  const [memoryCandidates, setMemoryCandidates] = useState<Array<{ text: string; caseId: string; type: string }>>([]);
  const [memoryStored, setMemoryStored] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("The deployment is failing again after today's configuration update.");
  const [responsePreview, setResponsePreview] = useState('');
  const [mode, setMode] = useState<'with-memory' | 'without-memory'>('with-memory');
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);

  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? projects[0], [projects, selectedProjectId]);
  const selectedCase = selectedProject?.customer?.tickets.find((ticket) => ticket.id === selectedCaseId) ?? selectedProject?.customer?.tickets[0];

  useEffect(() => {
    fetch('/api/auth/me').then(async (response) => {
      if (response.ok) setUser((await response.json()).user);
    }).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    fetch('/api/workspace').then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to load workspace');
      setProjects(data.projects);
      const first = data.projects[0] as WorkspaceProject | undefined;
      if (first) {
        setSelectedProjectId((current) => data.projects.some((project: WorkspaceProject) => project.id === current) ? current : first.id);
        setSelectedCaseId(first.customer?.tickets[0]?.id ?? '');
      }
    }).catch((cause: Error) => setError(cause.message)).finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => {
    const ticket = selectedProject?.customer?.tickets.find((entry) => entry.id === selectedCaseId) ?? selectedProject?.customer?.tickets[0];
    setMessages(ticket?.messages ?? []);
    if (ticket) setSelectedCaseId(ticket.id);
  }, [selectedProject, selectedCaseId]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
    const data = await response.json();
    if (!response.ok) setLoginError(data.error ?? 'Sign in failed');
    else setUser(data.user);
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setProjects([]);
  };

  const approveMemoryCandidate = async (candidate: { text: string; caseId: string; type: string }) => {
    if (!selectedProject?.customer) return;
    const response = await fetch('/api/support/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approved: true,
        customerId: selectedProject.customerId,
        projectId: selectedProject.id,
        caseId: candidate.caseId,
        type: candidate.type,
        text: candidate.text,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Unable to store memory in Hindsight.');
      return;
    }
    setMemoryStored(`Stored in Hindsight as ${data.documentId}.`);
    setMemoryCandidates((current) => current.filter((item) => item.caseId !== candidate.caseId || item.type !== candidate.type));
  };

  const handleSend = async () => {
    const customer = selectedProject?.customer;
    if (!customer || !selectedCase || !draft.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const chatResponse = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, projectId: selectedProject.id, caseId: selectedCase.id, message: draft, mode }),
      });
      const chatData = await chatResponse.json();
      if (!chatResponse.ok) throw new Error(chatData.error ?? 'Support chat failed');
      setMemoryResults(chatData.memoriesUsed ?? []);
      setRecommendedActions(chatData.recommendedActions ?? []);
      setMemoryCandidates(chatData.memoryCandidates ?? []);
      setMessages((current) => [...current, { id: `local-${Date.now()}`, speaker: 'customer', text: draft, createdAt: new Date().toISOString() }]);
      setResponsePreview(chatData.response);
      setMessages((current) => [...current, { id: `agent-${Date.now()}`, speaker: 'agent', text: chatData.response, createdAt: new Date().toISOString() }]);
      setDraft('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete investigation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runAction = (name: string) => {
    setAction(name);
    if (name === 'Find similar cases') setMode('with-memory');
    if (name === 'Check requirements') setTab('Requirements');
    if (name === 'Inspect code') setTab('Repositories');
    if (name === 'Inspect cloud context') setTab('Cloud');
    if (name === 'Find teammate') setTab('Team');
    if (name === 'Draft customer response') setDraft('Please draft a concise customer update based on the evidence in this case.');
  };

  if (isLoading) return <main className="center-state">Loading workspace...</main>;

  if (!user) {
    return (
      <main className="login-screen">
        <form className="login-form panel" onSubmit={handleLogin}>
          <div className="brand">SupportMemory</div>
          <h1>Sign in to Apex Consulting</h1>
          <p className="login-copy">Use your Apex Consulting work account to access assigned projects and client cases.</p>
          <label>Work email<input name="email" type="email" autoComplete="email" placeholder="you@apex.consulting" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          {loginError && <div className="error">{loginError}</div>}
          <button className="primary-btn" type="submit" disabled={loginLoading}>{loginLoading ? 'Signing in...' : 'Sign in'}</button>
          <div className="or-divider">or</div>
          <button className="secondary-btn" type="button" disabled>Continue with Microsoft</button>
          <button className="secondary-btn" type="button" disabled>Continue with Google</button>
          <button className="text-btn" type="button" onClick={() => setLoginError('Password recovery is handled by your Apex Consulting identity provider.')}>Forgot password?</button>
        </form>
      </main>
    );
  }

  if (!selectedProject) return <main className="center-state">No projects are assigned to this account.</main>;
  const customer = selectedProject.customer;
  const activeTicket = customer?.tickets.find((ticket) => ticket.id === selectedCaseId) ?? customer?.tickets[0];

  return (
    <main className="enterprise-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand"><strong>SupportMemory</strong><span>Apex Consulting</span></div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => <button key={item.label} className={item.tab === tab ? 'nav-item active' : 'nav-item'} onClick={() => item.tab && setTab(item.tab)}>{item.label}</button>)}
        </nav>
        <div className="sidebar-user"><strong>{user.name}</strong><span>{user.role}</span><button className="text-btn" onClick={handleLogout}>Sign out</button></div>
      </aside>

      <section className="enterprise-content">
        <header className="workspace-header"><div><div className="eyebrow">{user.role} / My Work</div><h1>Good morning, {user.name.split(' ')[0]}</h1></div><div className="header-context"><span>{selectedProject.name}</span><span>{selectedProject.phase}</span></div></header>
        <section className="work-strip"><div><span className="eyebrow">Assigned cases</span><strong>{customer?.tickets.length ?? 0}</strong><span>in selected project</span></div><div><span className="eyebrow">AI budget remaining</span><strong>{selectedProject.aiUsage.remaining}</strong><span>{selectedProject.aiUsage.requests} requests</span></div><div><span className="eyebrow">Recent activity</span><strong>{selectedProject.activities[0]?.time}</strong><span>{selectedProject.activities[0]?.text}</span></div></section>
        <div className="project-switcher"><span className="eyebrow">Assigned projects</span>{projects.map((project) => <button key={project.id} className={project.id === selectedProject.id ? 'project-tab active' : 'project-tab'} onClick={() => { setSelectedProjectId(project.id); setSelectedCaseId(project.customer?.tickets[0]?.id ?? ''); }}>{project.name}</button>)}</div>
        <section className="project-heading"><div><div className="eyebrow">Project workspace</div><h2>{selectedProject.name}</h2><p>{selectedProject.subtitle} · {selectedProject.phase}</p></div><div className="project-people"><span>Project lead <strong>{selectedProject.projectLead}</strong></span><span>Technical lead <strong>{selectedProject.technicalLead}</strong></span></div></section>
        <div className="workspace-tabs" role="tablist">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>

        {tab === 'Overview' && <Overview project={selectedProject} />}
        {tab === 'Requirements' && <Requirements project={selectedProject} />}
        {tab === 'Team' && <Team project={selectedProject} onAction={runAction} />}
        {tab === 'Repositories' && <Repositories project={selectedProject} />}
        {tab === 'Cloud' && <Cloud project={selectedProject} />}
        {tab === 'AI Usage' && <Usage project={selectedProject} />}
        {tab === 'Financials' && <Financials project={selectedProject} />}
        {tab === 'Knowledge' && <Knowledge project={selectedProject} />}
        {tab === 'Cases' && <CaseList project={selectedProject} onSelect={(id) => { setSelectedCaseId(id); setTab('Overview'); }} />}

        <div className="memory-mode" role="group" aria-label="Support memory mode"><button type="button" aria-pressed={mode === 'with-memory'} onClick={() => setMode('with-memory')}>With memory</button><button type="button" aria-pressed={mode === 'without-memory'} onClick={() => setMode('without-memory')}>Without memory</button></div>
        <section className="case-workbench"><div className="case-title"><div><div className="eyebrow">Case workspace</div><h2>#{activeTicket?.id ?? '---'} {activeTicket?.summary ?? 'No active case'}</h2><p>{customer?.name} · {activeTicket?.status ?? 'Unassigned'}</p></div><button className="secondary-btn" onClick={() => setStuckOpen(true)}>I'm stuck</button></div><div className="workbench-grid"><div className="conversation-panel"><div className="panel-title">Conversation</div><div className="conversation">{messages.map((message) => <div key={message.id} className={`message-row ${message.speaker}`}><div className="bubble"><strong>{message.speaker === 'customer' ? 'Customer' : 'SupportMemory'}</strong>{message.text}</div></div>)}</div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} /><button className="primary-btn" onClick={handleSend} disabled={isSubmitting || !activeTicket}>{isSubmitting ? 'Investigating...' : 'Investigate with AI'}</button></div><aside className="copilot-panel"><div className="panel-title">AI support copilot</div><div className="context-checks"><span>✓ Current case</span><span>✓ Project context</span><span>{mode === 'with-memory' ? '✓ Hindsight recall' : '○ Memory disabled'}</span><span>✓ Requirements available</span></div><div className="action-grid">{['Investigate', 'Find similar cases', 'Check requirements', 'Inspect code', 'Inspect cloud context', 'Find teammate', 'Draft customer response', 'Suggest resolution'].map((item) => <button key={item} onClick={() => runAction(item)}>{item}</button>)}</div>{action && <div className="action-result"><strong>{action}</strong><p>{action === 'Find teammate' ? 'Priya Sharma is recommended: same project, Cloud Platform Engineer, and linked to Case #1842.' : action === 'Check requirements' ? 'REQ-104 applies: production deployments must use approved maintenance windows.' : action === 'Inspect cloud context' ? selectedProject.cloud.diagnostics[0] : action === 'Inspect code' ? 'Authorized repository context: Terraform modules and AKS deployment manifests on main.' : 'Ready to use the current case, project context, requirements, and permitted memory.'}</p></div>}{responsePreview && <div className="action-result"><strong>Reasoning context</strong><p>{responsePreview}</p></div>}</aside></div><div className="case-subtabs"><button className="active">Team Discussion</button><button>Memory ({memoryResults.length})</button><button>Requirements</button><button>Code</button><button>Cloud</button></div>{memoryResults.length > 0 && <div className="memory-evidence"><strong>Hindsight evidence</strong>{memoryResults.map((memory) => <div key={memory.id}>{memory.document_id ?? 'Historical memory'}: {memory.text}</div>)}</div>}</section>
        {recommendedActions.length > 0 && <section className="content-section full"><div className="section-title"><h3>Recommended next steps</h3></div>{recommendedActions.map((item) => <div className="line-item" key={item}>{item}</div>)}</section>}
        {memoryCandidates.map((candidate) => <section className="content-section full" key={`${candidate.caseId}-${candidate.type}`}><div className="section-title"><h3>Memory candidate · approval required</h3><button className="primary-btn" onClick={() => approveMemoryCandidate(candidate)}>Approve and store</button></div><p>{candidate.text}</p></section>)}
        {memoryStored && <p className="notice">{memoryStored}</p>}
      </section>
      {stuckOpen && <div className="modal-backdrop" role="dialog"><div className="modal panel"><div className="section-header"><h2>What do you need help with?</h2><button className="text-btn" onClick={() => setStuckOpen(false)}>Close</button></div>{["I don't know the likely cause", 'I tried something and it failed', 'Find similar incidents', 'Find someone who solved this before', 'Check the client requirements', 'Check the code', 'Check cloud configuration'].map((item) => <button key={item} className="modal-choice" onClick={() => { setStuckOpen(false); runAction(item); }}>{item}</button>)}</div></div>}
    </main>
  );
}

function Overview({ project }: { project: WorkspaceProject }) { return <div className="overview-grid"><section className="content-section"><div className="section-title"><h3>Objectives</h3><span>{project.team.length} members</span></div>{project.objectives.map((item) => <div className="line-item" key={item}>• {item}</div>)}<div className="section-title spaced"><h3>Project constraints</h3></div>{project.constraints.map((item) => <div className="constraint" key={item}>{item}</div>)}</section><section className="content-section"><div className="section-title"><h3>Current issues</h3><button className="text-btn">Open all</button></div>{project.customer?.tickets.map((ticket) => <div className="issue-line" key={ticket.id}><strong>#{ticket.id}</strong><span>{ticket.summary}</span><em>{ticket.status}</em></div>)}</section></div>; }
function Requirements({ project }: { project: WorkspaceProject }) { return <section className="content-section full"><div className="section-title"><div><h3>Client requirements</h3><p>Trace every recommendation back to what the client actually asked for.</p></div></div>{project.requirements.map((requirement) => <div className="requirement" key={requirement.id}><strong>{requirement.id}</strong><div><h4>{requirement.description}</h4><span>{requirement.status} · {requirement.priority} priority · Owner {requirement.owner}</span><small>{requirement.source} · {requirement.date} · {requirement.notes}</small></div></div>)}</section>; }
function Team({ project, onAction }: { project: WorkspaceProject; onAction: (name: string) => void }) { return <section className="content-section full"><div className="section-title"><h3>Project team</h3><button className="secondary-btn" onClick={() => onAction('Find teammate')}>Find someone who can help</button></div><div className="team-grid">{project.team.map((member) => <div className="team-member" key={member.id}><strong>{member.name}</strong><span>{member.role}</span><small>{member.focus}</small><small>Linked cases: {member.caseIds.map((id) => `#${id}`).join(', ')}</small><button className="text-btn" onClick={() => onAction(`Ask ${member.name}`)}>Ask {member.name.split(' ')[0]}</button></div>)}</div></section>; }
function Repositories({ project }: { project: WorkspaceProject }) { return <section className="content-section full"><div className="section-title"><h3>Repositories</h3><span>Authorized project context</span></div>{project.repositories.map((repo) => <div className="repo-row" key={repo.id}><div><strong>{repo.name}</strong><span>{repo.url}</span></div><div><span>Branch {repo.branch}</span><span>Last deployment {repo.lastDeployment}</span><span>{repo.recentChanges} recent changes</span></div><button className="secondary-btn">Ask AI about repository</button></div>)}</section>; }
function Cloud({ project }: { project: WorkspaceProject }) { return <section className="content-section full"><div className="section-title"><h3>Cloud environment</h3><span>Read-only diagnostic context</span></div><div className="cloud-summary"><div><span>Provider</span><strong>{project.cloud.provider}</strong></div><div><span>Environment</span><strong>{project.cloud.environment}</strong></div><div><span>Region</span><strong>{project.cloud.region}</strong></div><div><span>Cluster</span><strong>{project.cloud.cluster}</strong></div></div><div className="diagnostics">{project.cloud.services.map((service) => <span key={service}>{service}</span>)}{project.cloud.diagnostics.map((item) => <p key={item}>{item}</p>)}</div></section>; }
function Usage({ project }: { project: WorkspaceProject }) { return <section className="content-section full"><div className="section-title"><h3>AI usage</h3><span>Project cost control</span></div><div className="usage-grid"><Metric label="Monthly allocation" value={project.aiUsage.allocation} /><Metric label="Consumed" value={project.aiUsage.consumed} /><Metric label="Remaining" value={project.aiUsage.remaining} /><Metric label="Requests" value={project.aiUsage.requests} /><Metric label="Token usage" value={project.aiUsage.tokens} /></div><p className="notice">Approval required at 90% of allocation. Staged retrieval is preferred for expensive investigations.</p></section>; }
function Financials({ project }: { project: WorkspaceProject }) { return <section className="content-section full"><div className="section-title"><h3>Project financials</h3><span>Read-only authorized context</span></div><div className="usage-grid"><Metric label="Contract value" value={project.financials.contractValue} /><Metric label="Approved budget" value={project.financials.approvedBudget} /><Metric label="Consumed" value={project.financials.consumed} /><Metric label="Remaining" value={project.financials.remaining} /></div></section>; }
function Knowledge({ project }: { project: WorkspaceProject }) { return <section className="content-section full"><div className="section-title"><h3>Knowledge</h3><span>Project documentation</span></div>{['AKS deployment runbook', 'Production change procedure', 'Architecture and data residency notes', 'Previous resolution: Case #1842'].map((item) => <div className="line-item" key={item}>{item}<button className="text-btn">Open source</button></div>)}</section>; }
function CaseList({ project, onSelect }: { project: WorkspaceProject; onSelect: (id: string) => void }) { return <section className="content-section full"><div className="section-title"><h3>Cases</h3></div>{project.customer?.tickets.map((ticket) => <button className="case-list-row" key={ticket.id} onClick={() => onSelect(ticket.id)}><strong>#{ticket.id}</strong><span>{ticket.summary}</span><em>{ticket.status}</em></button>)}</section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
