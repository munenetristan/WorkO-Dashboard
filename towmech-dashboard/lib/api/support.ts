// lib/api/support.ts
import api from "@/lib/api/axios";

export async function fetchAdminTickets(params?: {
  status?: string;
  type?: string;
  priority?: string;
}) {
  const res = await api.get("/api/admin/support/tickets", { params });
  return res.data;
}

export async function assignTicket(ticketId: string, adminId?: string) {
  const res = await api.patch(`/api/admin/support/tickets/${ticketId}/assign`, {
    adminId,
  });
  return res.data;
}

export async function updateTicket(
  ticketId: string,
  payload: { status?: string; adminNote?: string }
) {
  const res = await api.patch(
    `/api/admin/support/tickets/${ticketId}/update`,
    payload
  );
  return res.data;
}

// ✅ NEW: fetch single ticket (includes thread messages)
export async function fetchAdminTicketById(ticketId: string) {
  const res = await api.get(`/api/admin/support/tickets/${ticketId}`);
  return res.data; // { ticket }
}

// ✅ NEW: admin reply to ticket thread
// Body must contain ONLY: { message: "..." }
export async function replyAdminToTicket(ticketId: string, message: string) {
  const res = await api.post(`/api/admin/support/tickets/${ticketId}/reply`, {
    message,
  });
  return res.data; // { message, ticket }
}