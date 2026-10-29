/*
 * Настройки Discipline.
 * pushServer — адрес вашего push-сервера на Cloudflare (его выдаст `npx wrangler deploy` в папке server/),
 * например 'https://discipline-push.mikeplanner.workers.dev'.
 * Пусто — приложение работает без сервера: напоминания показываются баннером внутри приложения.
 */
window.DISCIPLINE_CONFIG = {
  pushServer: '',
};
