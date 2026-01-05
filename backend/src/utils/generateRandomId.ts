export const generateRandomId = (length = 4) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
};

export const generateOrderId = () => {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);

  return `ORD-${time}-${random}`.toUpperCase();
};
