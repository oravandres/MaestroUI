import { z } from "zod";
import { fetchJson } from "@/api/client";
import { jsonObjectSchema, paginationSchema, parseApiResponse } from "@/api/parse";

export const eventSchema = z.object({
  id: z.string(),
  source: z.string(),
  level: z.string(),
  event_type: z.string(),
  message: z.string(),
  metadata: jsonObjectSchema,
  created_at: z.string(),
});

const eventsResponseSchema = z.object({
  items: z.array(eventSchema),
  pagination: paginationSchema,
});

export type PlatformEvent = z.infer<typeof eventSchema>;
export type EventsResponse = z.infer<typeof eventsResponseSchema>;

export async function fetchMonitoringEvents(limit = 10): Promise<EventsResponse> {
  const data = await fetchJson<unknown>(
    `/api/v1/monitoring/events?limit=${limit}`
  );
  return parseApiResponse(eventsResponseSchema, data, "monitoring events");
}
