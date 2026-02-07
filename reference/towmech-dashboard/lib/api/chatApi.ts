// towmech-admin-dashboard/lib/api/chatApi.ts
import api from "./axios";

/**
 * ✅ Types
 * Backend message field could be:
 * - text (preferred)
 * - message (older UI)
 * This type supports both.
 */

export type AdminChatUserRef = {
  _id?: string;
  name?: string;
  role?: string;
};

export type AdminChatMessage = {
  _id: string;

  thread?: string;
  threadId?: string;

  job?: any;
  jobId?: string;

  sender?: AdminChatUserRef | any;
  senderId?: string;

  senderRole?: string;

  // ✅ IMPORTANT: support both
  text?: string;
  message?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type AdminChatThread = {
  _id: string;

  job?: any;
  customer?: any;
  provider?: any;

  status?: "ACTIVE" | "CLOSED" | string;
  lastMessageAt?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type AdminThreadsResponse = {
  threads?: AdminChatThread[];
  items?: AdminChatThread[];
};

export type AdminMessagesResponse = {
  messages?: AdminChatMessage[];
  items?: AdminChatMessage[];
};

const ADMIN_CHATS_BASE = "/api/admin/chats";

/**
 * ✅ Fetch all threads
 */
export async function fetchAdminChatThreads() {
  const res = await api.get<AdminThreadsResponse>(`${ADMIN_CHATS_BASE}/threads`);
  const data = res.data || {};

  return {
    threads: data.threads ?? data.items ?? [],
  };
}

/**
 * ✅ Fetch messages for a thread
 */
export async function fetchAdminChatMessages(threadId: string) {
  if (!threadId) throw new Error("threadId is required");

  const res = await api.get<AdminMessagesResponse>(
    `${ADMIN_CHATS_BASE}/threads/${threadId}/messages`
  );

  const data = res.data || {};

  // ✅ normalize message field so UI can always read `.text`
  const items = (data.messages ?? data.items ?? []).map((m) => ({
    ...m,
    text: m.text ?? m.message ?? "",
    message: m.message ?? m.text ?? "",
  }));

  return { messages: items };
}