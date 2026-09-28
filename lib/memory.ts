import { HindsightService, type HindsightRecallResult, type MemoryToStore } from './hindsight';

export async function retrieveMemories(customerId: string, message: string): Promise<HindsightRecallResult> {
  return new HindsightService().retrieveMemories(customerId, message);
}

export async function storeMemory(customerId: string, memory: MemoryToStore): Promise<{ success: boolean; documentId?: string; reason?: string }> {
  return new HindsightService().storeMemory(customerId, memory);
}
