import { AccountHistoryItem, UserProfile } from '../types';

const ACCOUNT_HISTORY_KEY = 'ai_student_account_history';
const SAVED_ACCOUNTS_KEY = 'ai_student_saved_accounts';

export const getAccountHistory = (): AccountHistoryItem[] => {
  try {
    const raw = localStorage.getItem(ACCOUNT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse account history', e);
    return [];
  }
};

export const saveAccountToHistory = (
  email: string,
  displayName?: string,
  avatarColor?: string
): AccountHistoryItem[] => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return getAccountHistory();

    const accounts = getAccountHistory();
    const existingIndex = accounts.findIndex(
      (a) => a.email.toLowerCase() === cleanEmail
    );

    const name = displayName?.trim() || cleanEmail.split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const color = avatarColor || 'from-indigo-600 to-purple-600';

    if (existingIndex >= 0) {
      const existing = accounts[existingIndex];
      accounts[existingIndex] = {
        ...existing,
        displayName: name || existing.displayName,
        avatarColor: avatarColor || existing.avatarColor,
        lastActive: Date.now(),
        loginCount: (existing.loginCount || 1) + 1,
      };
      // Move to top of history
      const updated = accounts.splice(existingIndex, 1)[0];
      accounts.unshift(updated);
    } else {
      accounts.unshift({
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        email: cleanEmail,
        displayName: name,
        avatarColor: color,
        firstLogin: Date.now(),
        lastActive: Date.now(),
        loginCount: 1,
      });
    }

    localStorage.setItem(ACCOUNT_HISTORY_KEY, JSON.stringify(accounts));

    // Also sync with saved emails list for autocomplete/recovery
    try {
      const savedMailsRaw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      const savedMails: string[] = savedMailsRaw ? JSON.parse(savedMailsRaw) : [];
      const updatedList = Array.from(new Set([cleanEmail, ...savedMails])).slice(0, 10);
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedList));
    } catch {
      // ignore
    }

    // Dispatch global event so HistoryView & Navbar update automatically
    window.dispatchEvent(new CustomEvent('ai_student_accounts_updated', {
      detail: { email: cleanEmail, accounts }
    }));

    return accounts;
  } catch (e) {
    console.warn('Failed to save account to history', e);
    return getAccountHistory();
  }
};

export const removeAccountFromHistory = (email: string): AccountHistoryItem[] => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getAccountHistory().filter(
      (a) => a.email.toLowerCase() !== cleanEmail
    );

    localStorage.setItem(ACCOUNT_HISTORY_KEY, JSON.stringify(accounts));

    try {
      const savedMailsRaw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      if (savedMailsRaw) {
        const savedMails: string[] = JSON.parse(savedMailsRaw);
        const filtered = savedMails.filter((m) => m.toLowerCase() !== cleanEmail);
        localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }

    window.dispatchEvent(new CustomEvent('ai_student_accounts_updated', {
      detail: { email: cleanEmail, accounts }
    }));

    return accounts;
  } catch (e) {
    console.warn('Failed to remove account from history', e);
    return getAccountHistory();
  }
};

export const syncExistingAccountsOnBoot = (currentUser: UserProfile | null) => {
  try {
    if (currentUser?.email) {
      saveAccountToHistory(currentUser.email, currentUser.displayName, currentUser.avatarColor);
    }
  } catch {
    // ignore
  }
};
