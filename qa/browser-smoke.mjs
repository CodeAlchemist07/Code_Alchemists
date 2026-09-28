export default async function run(page, ui) {
  await page.getByLabel('Work email').fill('kevin@apex.consulting');
  await page.getByLabel('Password').fill('ApexDemo123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('AI support copilot').waitFor();

  const apiChecks = await page.evaluate(async () => {
    const chatResponse = await fetch('/api/support/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: 'acme', projectId: 'acme', caseId: '1042', message: 'Deployment is failing after the latest config change.' }),
    });
    const chat = await chatResponse.json();
    return {
      chatStatus: chatResponse.status,
      contractKeysPresent: ['response', 'memoriesUsed', 'recommendedActions', 'memoryCandidates'].every((key) => key in chat),
      memoryStatusReported: ['available', 'unavailable'].includes(chat.memoryStatus),
      memoryStatus: chat.memoryStatus,
    };
  });

  const workspaceText = (await page.locator('body').innerText()).toLowerCase();
  const hasWorkbench = workspaceText.includes('meridian health systems') && workspaceText.includes('ai support copilot') && workspaceText.includes('case workspace');

  await page.getByRole('button', { name: 'Requirements' }).first().click();
  const requirementsVisible = await page.getByText('REQ-104').isVisible();
  await page.getByRole('button', { name: 'Team' }).first().click();
  const teamVisible = await page.getByText('Project team').isVisible();
  await page.getByRole('button', { name: "I'm stuck" }).click();
  const stuckVisible = await page.getByRole('dialog').isVisible();

  return { ...apiChecks, hasWorkbench, requirementsVisible, teamVisible, stuckVisible };
}
