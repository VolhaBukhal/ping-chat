import { expect, test, type Page } from "@playwright/test";
import { GreenApiMock } from "./greenApiMock";

async function login(page: Page, mock = new GreenApiMock()) {
  await mock.install(page);
  await page.goto("/");
  await page.getByRole("textbox", { name: "idInstance" }).fill("1101000001");
  await page
    .getByRole("textbox", { name: "apiTokenInstance" })
    .fill("test-token");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("logout")).toBeVisible();
  return mock;
}

async function openRecipient(page: Page, recipient: string) {
  await page.getByRole("textbox", { name: "Получатель" }).fill(recipient);
  await page.getByTestId("open-chat").click();
}

test.describe("login", () => {
  test("should log in and keep the session after reload", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Выберите собеседника")).toBeVisible();

    const stored = await page.evaluate(() =>
      sessionStorage.getItem("ping-chat.credentials"),
    );
    expect(stored).toContain("1101000001");
    expect(stored).not.toContain("api.green-api.com/waInstance");

    await page.reload();
    await expect(page.getByTestId("logout")).toBeVisible();
  });

  test("should reject empty fields, bad credentials, and an unauthorized instance", async ({
    page,
  }) => {
    const mock = new GreenApiMock();
    await mock.install(page);
    await page.goto("/");

    await page.getByTestId("login-submit").click();
    await expect(
      page.getByRole("heading", { name: "ping-chat" }),
    ).toBeVisible();
    await expect(page.getByTestId("logout")).toHaveCount(0);

    await page.getByRole("textbox", { name: "idInstance" }).fill("   ");
    await page.getByRole("textbox", { name: "apiTokenInstance" }).fill("   ");
    await page.getByTestId("login-submit").click();
    await expect(page.getByRole("alert")).toHaveText(
      "Введите idInstance и apiTokenInstance",
    );

    mock.loginStatus = 401;
    await page.getByRole("textbox", { name: "idInstance" }).fill("1101000001");
    await page
      .getByRole("textbox", { name: "apiTokenInstance" })
      .fill("bad-token");
    await page.getByTestId("login-submit").click();
    await expect(page.getByRole("alert")).toHaveText(
      "Неверные credentials или нет доступа к инстансу",
    );

    mock.loginStatus = 200;
    mock.state = "notAuthorized";
    await page.getByTestId("login-submit").click();
    await expect(page.getByRole("alert")).toHaveText(
      "Инстанс не авторизован в Telegram. Авторизуйте его в кабинете GREEN-API.",
    );
  });
});

test.describe("opening a chat", () => {
  test("should open a personal chat by phone, username, or numeric chatId", async ({
    page,
  }) => {
    const mock = await login(page);
    mock.checkAccount = { exist: true, chatId: "555001122" };

    await openRecipient(page, "79991234567");
    await expect(page.getByTestId("chat-item")).toContainText("555001122");
    await expect(page.getByText("Нет сообщений")).toBeVisible();

    mock.checkAccount = { exist: true, chatId: "777000111" };
    await openRecipient(page, "@vasilisa");
    await expect(page.getByTestId("chat-item")).toContainText("777000111");
    await expect(page.getByTestId("chat-item")).not.toContainText("555001122");

    await openRecipient(page, "10000000");
    await expect(page.getByTestId("chat-item")).toContainText("10000000");
  });

  test("should show an error for an unknown phone and a bad recipient", async ({
    page,
  }) => {
    const mock = await login(page);
    await expect(page.getByTestId("open-chat")).toBeDisabled();

    mock.checkAccount = { exist: false };
    await openRecipient(page, "+79990001122");
    await expect(page.getByRole("alert")).toHaveText(
      "Telegram-аккаунт на этом номере не найден",
    );
    await expect(page.getByText("Выберите собеседника")).toBeVisible();

    mock.checkAccount = { exist: false };
    await openRecipient(page, "@missing");
    await expect(page.getByRole("alert")).toHaveText(
      "Telegram-аккаунт с таким username не найден",
    );

    await openRecipient(page, "abc");
    await expect(page.getByRole("alert")).toContainText("Неверный формат");
  });
});

test.describe("sending", () => {
  test("should send a text message and mark a failed send", async ({ page }) => {
    const mock = await login(page);
    mock.checkAccount = { exist: true, chatId: "555001122" };
    await openRecipient(page, "79991234567");

    await expect(page.getByTestId("send-message")).toBeDisabled();
    await page
      .getByRole("textbox", { name: "Текст сообщения" })
      .fill("Привет из ping-chat");
    await page.getByTestId("send-message").click();

    await expect(page.getByRole("log")).toContainText("Привет из ping-chat");
    await expect
      .poll(() => mock.sent.at(-1))
      .toEqual({
        chatId: "555001122",
        message: "Привет из ping-chat",
      });

    mock.sendStatus = 502;
    await page
      .getByRole("textbox", { name: "Текст сообщения" })
      .fill("Это не уйдёт");
    await page.getByTestId("send-message").click();
    await expect(page.getByRole("log")).toContainText("Это не уйдёт");
    await expect(page.getByText("ошибка")).toBeVisible();
  });
});

test.describe("receiving", () => {
  test("should show a personal reply and hide group comments and other chats", async ({
    page,
  }) => {
    const mock = await login(page);
    await openRecipient(page, "10000000");
    await page
      .getByRole("textbox", { name: "Текст сообщения" })
      .fill("Жду ответ");
    await page.getByTestId("send-message").click();

    mock.pushText({
      receiptId: 1,
      chatId: "-10000000000000",
      chatType: "channel",
      senderPhoneNumber: 0,
      text: "Комментарий в группе",
    });
    mock.pushText({
      receiptId: 2,
      chatId: "888000111",
      chatType: "user",
      senderPhoneNumber: 70001112233,
      text: "Чужой чат",
    });
    mock.pushText({
      receiptId: 3,
      chatId: "10000000",
      chatType: "user",
      senderPhoneNumber: 79991234567,
      text: "Ответ адресата",
    });

    await expect(page.getByRole("log")).toContainText("Ответ адресата");
    await expect(page.getByRole("log")).toContainText("Жду ответ");
    await expect(page.getByText("Комментарий в группе")).toHaveCount(0);
    await expect(page.getByText("Чужой чат")).toHaveCount(0);
    await expect
      .poll(() => [...new Set(mock.deleted)].sort((a, b) => a - b))
      .toEqual([1, 2, 3]);
  });

  test("should match a phone chat to the numeric reply and ignore a group comment from the same phone", async ({
    page,
  }) => {
    const mock = await login(page);
    mock.checkAccount = { exist: true };
    await openRecipient(page, "79991234567");
    await expect(page.getByTestId("chat-item")).toContainText("+79991234567");

    await page
      .getByRole("textbox", { name: "Текст сообщения" })
      .fill("Себе в Избранное");
    await page.getByTestId("send-message").click();
    await expect.poll(() => mock.sent.at(-1)?.chatId).toBe("79991234567@c.us");

    mock.pushText({
      receiptId: 11,
      chatId: "-100999",
      chatType: "supergroup",
      senderPhoneNumber: 79991234567,
      text: "Комментарий того же человека",
    });
    mock.pushText({
      receiptId: 12,
      chatId: "555001122",
      chatType: "user",
      senderPhoneNumber: 79991234567,
      text: "Ответ из Избранного",
    });

    await expect(page.getByRole("log")).toContainText("Ответ из Избранного");
    await expect(page.getByRole("log")).toContainText("Себе в Избранное");
    await expect(page.getByText("Комментарий того же человека")).toHaveCount(0);
    await expect(page.getByTestId("chat-item")).toContainText("555001122");
    await expect(page.getByTestId("chat-item")).not.toContainText(
      "+79991234567",
    );
  });

  test("should show a receive error and clear the session on logout", async ({
    page,
  }) => {
    const mock = await login(page);
    await openRecipient(page, "10000000");

    mock.failReceive = true;
    await expect(page.getByRole("status")).toContainText(
      "Приём: Очередь недоступна",
    );

    await page.getByTestId("logout").click();
    await expect(page.getByTestId("login-submit")).toBeVisible();
    const stored = await page.evaluate(() =>
      sessionStorage.getItem("ping-chat.credentials"),
    );
    expect(stored).toBeNull();

    await page.reload();
    await expect(page.getByTestId("login-submit")).toBeVisible();
  });
});
