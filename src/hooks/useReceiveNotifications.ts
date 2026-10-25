import { useEffect, useRef } from "react";
import { deleteNotification, receiveNotification } from "../api/greenApi";
import { isSamePersonalChat } from "../lib/chatId";
import type { ChatMessage, Credentials, IncomingNotification } from "../types";

function extractText(notification: IncomingNotification): string | null {
  const type = notification.messageData?.typeMessage;
  if (type === "textMessage") {
    return notification.messageData?.textMessageData?.textMessage ?? null;
  }
  if (type === "extendedTextMessage") {
    return notification.messageData?.extendedTextMessageData?.text ?? null;
  }
  return null;
}

type Options = {
  credentials: Credentials | null;
  activeChatId: string | null;
  enabled: boolean;
  onIncoming: (message: ChatMessage) => void;
  onPollError?: (error: string) => void;
};

export function useReceiveNotifications({
  credentials,
  activeChatId,
  enabled,
  onIncoming,
  onPollError,
}: Options): void {
  const onIncomingRef = useRef(onIncoming);
  const onPollErrorRef = useRef(onPollError);
  const activeChatIdRef = useRef(activeChatId);
  onIncomingRef.current = onIncoming;
  onPollErrorRef.current = onPollError;
  activeChatIdRef.current = activeChatId;

  useEffect(() => {
    if (!credentials || !enabled) return;

    const controller = new AbortController();
    let cancelled = false;

    const loop = async () => {
      while (!cancelled) {
        try {
          const notification = await receiveNotification(
            credentials,
            20,
            controller.signal,
          );

          if (cancelled) break;
          if (!notification) continue;

          const { receiptId, body } = notification;

          try {
            if (
              body.typeWebhook === "incomingMessageReceived" &&
              isSamePersonalChat(activeChatIdRef.current, body.senderData)
            ) {
              const text = extractText(body);
              const chatId = body.senderData?.chatId;
              if (text && chatId) {
                onIncomingRef.current({
                  id: body.idMessage ?? `in-${receiptId}`,
                  chatId,
                  text,
                  direction: "incoming",
                  timestamp: (body.timestamp || Date.now() / 1000) * 1000,
                });
              }
            }
          } finally {
            await deleteNotification(credentials, receiptId);
          }
        } catch (err) {
          if (cancelled || controller.signal.aborted) break;
          const message =
            err instanceof Error ? err.message : "Ошибка приёма сообщений";
          onPollErrorRef.current?.(message);
          // Back off briefly on errors so we don't spin
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    };

    void loop();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [credentials, enabled]);
}
