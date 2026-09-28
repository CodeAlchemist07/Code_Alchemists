import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSupportMessages, generateSupportReply, type SupportAgentInput } from '../lib/agent';

const sampleInput: SupportAgentInput = {
  mode: 'with-memory',
  customerName: 'Acme Cloud',
  projectName: 'Acme Platform Support',
  caseId: '2217',
  issue: 'Deployment failed after a configuration update.',
  ticket: { summary: 'Deployment instability', status: 'Open', messages: [] },
  memories: [{
    id: 'm-1042',
    text: 'Previous deployment failure was caused by container memory exhaustion.',
    document_id: 'ticket-1042',
    metadata: { customer: 'acme' },
  }],
  requirements: ['REQ-201: production changes outside business hours'],
  constraints: ['Avoid unverified production changes.'],
  repositories: [{ name: 'Acme Platform', branch: 'main', context: 'Node.js deployment configuration.', lastDeployment: 'Today' }],
  cloud: { provider: 'AWS', environment: 'Production', region: 'ap-south-1', cluster: 'acme-prod', services: ['EKS'], diagnostics: ['Pods restarted with OOMKilled.'] },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('support agent', () => {
  it('includes recalled evidence only in memory-enabled context', () => {
    const withMemory = buildSupportMessages(sampleInput).map((message) => message.content).join('\n');
    const withoutMemory = buildSupportMessages({ ...sampleInput, mode: 'without-memory' }).map((message) => message.content).join('\n');

    expect(withMemory).toContain('ticket-1042');
    expect(withMemory).toContain('memory exhaustion');
    expect(withoutMemory).not.toContain('ticket-1042');
    expect(withoutMemory).not.toContain('memory exhaustion');
    expect(withoutMemory).toContain('REQ-201');
  });

  it('calls the configured chat-completions model and returns its answer', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    vi.stubEnv('OPENAI_MODEL', 'test-model');
    vi.stubEnv('OPENAI_BASE_URL', 'https://example.test/v1/');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'Check the pod memory limit before changing it.' } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateSupportReply(sampleInput)).resolves.toBe('Check the pod memory limit before changing it.');
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/v1/chat/completions', expect.objectContaining({ method: 'POST' }));
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.model).toBe('test-model');
    expect(JSON.stringify(request.messages)).toContain('ticket-1042');
  });

  it('fails clearly rather than returning a canned response without an API key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    await expect(generateSupportReply(sampleInput)).rejects.toThrow('Set OPENAI_API_KEY');
  });
});