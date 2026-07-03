import { db } from "@/lib/mock-data";

// This is a mock API client.
// Once the backend is ready, you can replace these with actual fetch/axios calls.
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const apiClient = {
  get: async <T>(url: string): Promise<T> => {
    await delay(500); // Simulate network latency
    // In the future, implement actual GET request here
    throw new Error("Not implemented");
  },
  post: async <T>(url: string, data: any): Promise<T> => {
    await delay(500);
    throw new Error("Not implemented");
  },
  // ... add put, delete, etc.
};
