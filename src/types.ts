export type Credentials = {
  idInstance: string;
  apiTokenInstance: string;
  /** GREEN-API host from the console, e.g. https://api.green-api.com */
  apiUrl: string;
};

export type MessageStatus = "sending" | "sent" | "failed";

export type ChatMessage = {
  id: string;
  chatId: string;
  text: string;
  direction: "outgoing" | "incoming";
  timestamp: number;
  status?: MessageStatus;
  error?: string;
};

export type GreenApiErrorBody = {
  message?: string;
  error?: string;
};

export type SendMessageResponse = {
  idMessage: string;
};

export type ReceiveNotificationResponse = {
  receiptId: number;
  body: IncomingNotification;
} | null;

export type IncomingNotification = {
  typeWebhook: string;
  timestamp: number;
  idMessage?: string;
  senderData?: {
    chatId?: string;
    chatType?: string;
    chatName?: string;
    sender?: string;
    senderName?: string;
    senderPhoneNumber?: number;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: {
      textMessage?: string;
    };
    extendedTextMessageData?: {
      text?: string;
    };
  };
};

export type DeleteNotificationResponse = {
  result: boolean;
  reason?: string;
};

export type GetStateInstanceResponse = {
  stateInstance: string;
};
