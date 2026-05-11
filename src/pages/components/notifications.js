const NOTIFICATION_DURATION = 5000;
export const NOTIFICATION_EXIT_DURATION = 240;

const notificationSubscribers = new Set();
let notificationSeed = 0;
let notificationStore = [];

function updateNotificationStore(updater) {
  notificationStore = updater(notificationStore);
  notificationSubscribers.forEach((subscriber) => subscriber(notificationStore));
}

export function subscribeToNotifications(subscriber) {
  notificationSubscribers.add(subscriber);
  subscriber(notificationStore);

  return () => {
    notificationSubscribers.delete(subscriber);
  };
}

export function getNotificationContentKey(content) {
  if (content === null || content === undefined || content === false) return "";
  if (typeof content === "string" || typeof content === "number") return String(content);
  if (Array.isArray(content)) return content.map(getNotificationContentKey).join("|");
  return content?.key ? `node:${content.key}` : "node";
}

export function dismissNotification(id, { notifySource = false } = {}) {
  const notification = notificationStore.find((item) => item.id === id);
  if (!notification || notification.exiting) return;

  updateNotificationStore((current) =>
    current.map((item) => (item.id === id ? { ...item, exiting: true } : item)),
  );

  window.setTimeout(() => {
    updateNotificationStore((current) => current.filter((item) => item.id !== id));
    if (notifySource) notification.onClose?.();
  }, NOTIFICATION_EXIT_DURATION);
}

export function notify(input) {
  const options = typeof input === "string" ? { message: input } : input;
  const id = notificationSeed + 1;
  notificationSeed = id;

  const notification = {
    id,
    type: options?.type || "info",
    message: options?.message ?? options?.text,
    duration: options?.duration ?? NOTIFICATION_DURATION,
    onClose: options?.onClose,
    exiting: false,
  };

  updateNotificationStore((current) => [notification, ...current]);
  return id;
}
