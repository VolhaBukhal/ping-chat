import { type SubmitEvent, useState } from "react";
import { getStateInstance, GreenApiError } from "../../api/greenApi";
import { DEFAULT_API_URL, saveCredentials } from "../../lib/credentials";
import type { Credentials } from "../../types";
import styles from "./LoginForm.module.css";

type Props = {
  onSuccess: (credentials: Credentials) => void;
};

export function LoginForm({ onSuccess }: Props) {
  const [idInstance, setIdInstance] = useState("");
  const [apiTokenInstance, setApiTokenInstance] = useState("");
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);

    const credentials: Credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: (apiUrl.trim() || DEFAULT_API_URL).replace(/\/$/, ""),
    };

    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setError("Введите idInstance и apiTokenInstance");
      return;
    }

    setLoading(true);
    try {
      const state = await getStateInstance(credentials);
      if (state.stateInstance === "notAuthorized") {
        setError(
          "Инстанс не авторизован в Telegram. Авторизуйте его в кабинете GREEN-API.",
        );
        return;
      }
      saveCredentials(credentials);
      onSuccess(credentials);
    } catch (err) {
      if (err instanceof GreenApiError) {
        setError(
          err.status === 401 || err.status === 403
            ? "Неверные credentials или нет доступа к инстансу"
            : err.message,
        );
      } else if (err instanceof TypeError) {
        setError("Сеть недоступна. Проверьте соединение и proxy Vite.");
      } else {
        setError(err instanceof Error ? err.message : "Не удалось войти");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.brand}>
          <h1 className={styles.logo}>ping-chat</h1>
          <p className={styles.tagline}>
            Текстовый чат Telegram через GREEN-API. Credentials хранятся только
            в sessionStorage этой вкладки.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span className={styles.label}>idInstance</span>
            <input
              className={styles.input}
              name="idInstance"
              autoComplete="off"
              inputMode="numeric"
              placeholder="1101000000"
              value={idInstance}
              onChange={(e) => setIdInstance(e.target.value)}
              disabled={loading}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>apiTokenInstance</span>
            <input
              className={styles.input}
              name="apiTokenInstance"
              type="password"
              autoComplete="off"
              placeholder="токен из кабинета GREEN-API"
              value={apiTokenInstance}
              onChange={(e) => setApiTokenInstance(e.target.value)}
              disabled={loading}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>apiUrl</span>
            <input
              className={styles.input}
              name="apiUrl"
              autoComplete="off"
              placeholder={DEFAULT_API_URL}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              disabled={loading}
            />
            <span className={styles.hint}>
              Хост из консоли GREEN-API (обычно {DEFAULT_API_URL}). Запросы идут
              через Vite proxy из‑за CORS.
            </span>
          </label>

          {error ? (
            <div className={styles.error} role="alert">
              {error}
            </div>
          ) : null}

          <button
            className={styles.submit}
            type="submit"
            data-test-id="login-submit"
            disabled={loading}
          >
            {loading ? "Проверяем…" : "Войти"}
          </button>
        </form>

        <p className={styles.footer}>
          Нужен Telegram-инстанс в{" "}
          <a href="https://green-api.com/" target="_blank" rel="noreferrer">
            GREEN-API
          </a>
          . Секреты не коммитятся.
        </p>
      </div>
    </div>
  );
}
