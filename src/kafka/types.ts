import { UserMetrics } from "../core/types";

export interface InboundMessageEvent {
  type: "inbound_message";
  userId: string;
  conversationId: string;
  text: string;
  timestamp: number;
}

export interface StatUpdateEvent {
  type: "stat_update";
  userId: string;
  metric: keyof UserMetrics;
  delta: number;
  source: string;
  timestamp: number;
}

export type AppEvent = InboundMessageEvent | StatUpdateEvent;

// Series Kafka event format (from Series Sandbox Messaging Environment)
// See: Series Hackathon Dashboard.pdf for actual event structure
export interface SeriesKafkaEvent {
  api_version: string;
  created_at: string;
  event_id: string;
  event_type: 'message.received' | 'typing_indicator.received' | 'typing_indicator.removed';
  data: {
    attachments?: any[];
    chat_handles: Array<{
      display_name: string;
      identifier: string;
      is_me: boolean;
    }>;
    chat_id: string;
    from_phone: string;
    id: string;
    is_read: boolean;
    reaction_id: string | null;
    sent_at: string;
    service: string;
    text: string;
    display?: boolean;
    timestamp?: string;
  };
}
