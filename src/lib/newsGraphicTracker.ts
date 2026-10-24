// News Graphic Creation Tracker per User
export const getCleanEmailKey = (email?: string): string => {
  if (!email) return 'guest';
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
};

export const markNewsGraphicCreated = (email?: string, newsId?: string): void => {
  if (!newsId) return;
  try {
    const key = `ai_news_created_graphics_${getCleanEmailKey(email)}`;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(newsId)) {
      list.push(newsId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Error marking news graphic created:', err);
  }
};

export const isNewsGraphicCreated = (email?: string, newsId?: string): boolean => {
  if (!newsId) return false;
  try {
    const key = `ai_news_created_graphics_${getCleanEmailKey(email)}`;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return Array.isArray(list) && list.includes(newsId);
  } catch {
    return false;
  }
};

export const getCreatedNewsGraphicIds = (email?: string): string[] => {
  try {
    const key = `ai_news_created_graphics_${getCleanEmailKey(email)}`;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};
