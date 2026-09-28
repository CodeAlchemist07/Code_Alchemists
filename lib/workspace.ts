import type { Customer, Ticket } from './types';

export interface Requirement {
  id: string;
  description: string;
  status: 'Accepted' | 'In progress' | 'Proposed';
  priority: 'High' | 'Medium' | 'Low';
  owner: string;
  source: string;
  date: string;
  notes: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  focus: string;
  caseIds: string[];
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  branch: string;
  lastDeployment: string;
  recentChanges: number;
  context: string;
}

export interface CloudEnvironment {
  provider: 'Azure' | 'AWS';
  environment: string;
  region: string;
  cluster: string;
  services: string[];
  diagnostics: string[];
}

export interface ProjectWorkspace {
  id: string;
  name: string;
  customerId: string;
  subtitle: string;
  client: string;
  projectLead: string;
  technicalLead: string;
  phase: string;
  objectives: string[];
  constraints: string[];
  requirements: Requirement[];
  team: TeamMember[];
  repositories: Repository[];
  cloud: CloudEnvironment;
  financials: { contractValue: string; approvedBudget: string; consumed: string; remaining: string };
  aiUsage: { allocation: string; consumed: string; remaining: string; requests: string; tokens: string };
  activities: Array<{ time: string; text: string }>;
}

export const projectWorkspaces: ProjectWorkspace[] = [
  {
    id: 'meridian',
    name: 'Meridian Health Systems',
    customerId: 'meridian',
    subtitle: 'Cloud Transformation',
    client: 'Meridian Health Systems',
    projectLead: 'Maya Rao',
    technicalLead: 'Priya Sharma',
    phase: 'Platform modernization',
    objectives: ['Migrate workloads to Azure', 'Modernize AKS platform', 'Improve deployment reliability', 'Reduce repetitive support work'],
    constraints: ['Production changes must be coordinated with clinical operations.', 'Customer-facing changes require approval.'],
    requirements: [
      { id: 'REQ-104', description: 'Production deployments must support approved maintenance windows.', status: 'Accepted', priority: 'High', owner: 'Maya Rao', source: 'Statement of work', date: '2026-08-14', notes: 'Clinical operations approval is required before production changes.' },
      { id: 'REQ-117', description: 'All application data must remain within the approved Azure region.', status: 'Accepted', priority: 'High', owner: 'Priya Sharma', source: 'Architecture review', date: '2026-08-18', notes: 'Approved region is Central India.' },
      { id: 'REQ-132', description: 'Support team must provide audit history for production changes.', status: 'In progress', priority: 'Medium', owner: 'Kevin Rao', source: 'Customer workshop', date: '2026-08-22', notes: 'Case activity and deployment records must be linked.' },
    ],
    team: [
      { id: 'priya', name: 'Priya Sharma', role: 'Cloud Platform Engineer', focus: 'AKS and Terraform', caseIds: ['2217', '1842'] },
      { id: 'maya', name: 'Maya Rao', role: 'Delivery Lead', focus: 'Delivery governance', caseIds: ['2217'] },
      { id: 'arjun', name: 'Arjun Mehta', role: 'Backend Engineer', focus: '.NET services and Azure SQL', caseIds: ['2208'] },
    ],
    repositories: [
      { id: 'meridian-api', name: 'Meridian Platform API', url: 'github.com/apex/meridian-api', branch: 'main', lastDeployment: '2 hours ago', recentChanges: 8, context: '.NET 9 API with Azure SQL integration.' },
      { id: 'meridian-infra', name: 'Meridian Infrastructure', url: 'github.com/apex/meridian-infra', branch: 'main', lastDeployment: '2 hours ago', recentChanges: 8, context: 'Terraform modules and AKS deployment manifests.' },
      { id: 'deployment-services', name: 'Deployment Services', url: 'github.com/apex/meridian-deploy', branch: 'main', lastDeployment: 'Yesterday', recentChanges: 3, context: 'Release orchestration and change approval checks.' },
    ],
    cloud: { provider: 'Azure', environment: 'Production', region: 'Central India', cluster: 'meridian-prod', services: ['AKS', 'Azure SQL', 'Key Vault'], diagnostics: ['Deployment meridian-api is in CrashLoopBackOff.', 'Latest pod terminated after its memory limit was exceeded.'] },
    financials: { contractValue: '₹82,00,000', approvedBudget: '₹70,00,000', consumed: '₹48,40,000', remaining: '₹21,60,000' },
    aiUsage: { allocation: '$500', consumed: '$327.42', remaining: '$172.58', requests: '4,218', tokens: '18.7M' },
    activities: [{ time: '09:42', text: 'Meridian case #2217 updated' }, { time: '09:31', text: 'Maya commented on case #2217' }, { time: '09:18', text: 'AI recalled case #1842' }],
  },
  {
    id: 'acme', name: 'Acme Cloud', customerId: 'acme', subtitle: 'Platform Support', client: 'Acme Cloud', projectLead: 'Omar Mehta', technicalLead: 'Kevin Rao', phase: 'Active support operations', objectives: ['Keep production deployments reliable', 'Reduce repeat configuration incidents'], constraints: ['Production changes should be outside business hours.'], requirements: [{ id: 'REQ-201', description: 'Production changes must be scheduled outside business hours.', status: 'Accepted', priority: 'High', owner: 'Omar Mehta', source: 'Customer preference', date: '2026-08-10', notes: 'Notify customer before the maintenance window.' }], team: [{ id: 'kevin', name: 'Kevin Rao', role: 'Support Engineer', focus: 'EKS and deployment support', caseIds: ['1042'] }], repositories: [{ id: 'acme-platform', name: 'Acme Platform', url: 'github.com/apex/acme-platform', branch: 'main', lastDeployment: 'Today', recentChanges: 4, context: 'Node.js service deployment configuration.' }], cloud: { provider: 'AWS', environment: 'Production', region: 'ap-south-1', cluster: 'acme-prod', services: ['EKS', 'RDS'], diagnostics: ['Pods restarted with OOMKilled in the latest deployment.'] }, financials: { contractValue: '₹42,00,000', approvedBudget: '₹35,00,000', consumed: '₹21,80,000', remaining: '₹13,20,000' }, aiUsage: { allocation: '$250', consumed: '$211', remaining: '$39', requests: '1,982', tokens: '8.4M' }, activities: [{ time: '10:15', text: 'Acme deployment case updated' }],
  },
  {
    id: 'northstar', name: 'Northstar Labs', customerId: 'northstar', subtitle: 'Operations', client: 'Northstar Labs', projectLead: 'Maya Rao', technicalLead: 'Arjun Mehta', phase: 'Monitoring and rollout', objectives: ['Stabilize staging migrations'], constraints: ['Avoid migrations during business hours.'], requirements: [{ id: 'REQ-301', description: 'Schema migrations require a documented rollback path.', status: 'In progress', priority: 'Medium', owner: 'Arjun Mehta', source: 'Operations runbook', date: '2026-08-27', notes: 'Attach rollback evidence to the case.' }], team: [{ id: 'arjun', name: 'Arjun Mehta', role: 'Backend Engineer', focus: 'Postgres migrations', caseIds: ['2041'] }], repositories: [{ id: 'northstar-ops', name: 'Northstar Operations', url: 'github.com/apex/northstar-ops', branch: 'main', lastDeployment: 'Yesterday', recentChanges: 5, context: 'Kubernetes and Postgres migration workflows.' }], cloud: { provider: 'Azure', environment: 'Staging', region: 'East US', cluster: 'northstar-staging', services: ['Kubernetes', 'Postgres'], diagnostics: ['Migration lock is blocking the deployment.'] }, financials: { contractValue: '₹26,00,000', approvedBudget: '₹22,00,000', consumed: '₹14,10,000', remaining: '₹7,90,000' }, aiUsage: { allocation: '$170', consumed: '$118', remaining: '$52', requests: '1,102', tokens: '4.9M' }, activities: [{ time: 'Yesterday', text: 'Staging migration case moved to monitoring' }],
  },
];

export function getProjectWorkspace(projectId: string): ProjectWorkspace | undefined {
  return projectWorkspaces.find((project) => project.id === projectId);
}

export function getCaseById(customers: Customer[], caseId: string): { customer: Customer; ticket: Ticket } | undefined {
  for (const customer of customers) {
    const ticket = customer.tickets.find((entry) => entry.id === caseId);
    if (ticket) return { customer, ticket };
  }
  return undefined;
}
