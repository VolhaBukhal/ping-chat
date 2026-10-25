import type {
  Credentials,
  DeleteNotificationResponse,
  GetStateInstanceResponse,
  GreenApiErrorBody,
  ReceiveNotificationResponse,
  SendMessageResponse,
} from "../types";

export class GreenApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GreenApiError";
    this.status = status;
  }
}

function buildPath(
  credentials: Credentials,
  method: string,
  extraPath = "",
): string {
  const { idInstance, apiTokenInstance } = credentials;
  return `/green-api/waInstance${idInstance}/${method}/${apiTokenInstance}${extraPath}`;
}

async function request<T>(
  credentials: Credentials,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Green-Api-Url": credentials.apiUrl,
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const body = data as GreenApiErrorBody | string | null;
    let message =
      (typeof body === "object" && body && (body.message || body.error)) ||
      (typeof body === "string" && body) ||
      `GREEN-API error ${response.status}`;
    if (typeof message === "string" && /<html/i.test(message)) {
      message = `GREEN-API HTTP ${response.status}`;
    }
    throw new GreenApiError(String(message), response.status);
  }

  return data as T;
}

export type CheckAccountResponse = {
  exist?: boolean;
  chatId?: string;
  username?: string;
  phoneNumber?: number;
  status?: boolean;
  reason?: string;
};

export async function getStateInstance(
  credentials: Credentials,
): Promise<GetStateInstanceResponse> {
  return request(credentials, buildPath(credentials, "getStateInstance"));
}

/** Resolve phone / @username to Telegram chatId. */
export async function checkAccount(
  credentials: Credentials,
  params: { phoneNumber?: number; username?: string },
): Promise<CheckAccountResponse> {
  return request(credentials, buildPath(credentials, "checkAccount"), {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
): Promise<SendMessageResponse> {
  return request(credentials, buildPath(credentials, "sendMessage"), {
    method: "POST",
    body: JSON.stringify({ chatId, message }),
  });
}

export async function receiveNotification(
  credentials: Credentials,
  receiveTimeout = 20,
  signal?: AbortSignal,
): Promise<ReceiveNotificationResponse> {
  const path = `${buildPath(credentials, "receiveNotification")}?receiveTimeout=${receiveTimeout}`;
  return request(credentials, path, { signal });
}

export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
): Promise<DeleteNotificationResponse> {
  return request(
    credentials,
    buildPath(credentials, "deleteNotification", `/${receiptId}`),
    { method: "DELETE" },
  );
}
