export interface AppEvent {
  type: string;
  timestamp: string;
  [key: string]: any;
}

export interface InboundMessageEvent extends AppEvent {
  type: 'inbound_message';
  userId: string;
  channelId: string;
  message: string;
  messageId: string;
}

export interface StatUpdateEvent extends AppEvent {
  type: 'stat_update';
  userId: string;
  archetype: string;
  metric: string;
  value: number;
}

// Series Kafka event format
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

