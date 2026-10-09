// Support Inquiry & Admin Support Inbox Manager
// Handles User Help/Inquiry with Voice Speech-to-Text, Attachments, and Admin Management

export interface SupportInquiry {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userMobile?: string;
  message: string;
  voiceTranscript?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: number;
  adminResponse?: string;
}

const STORAGE_KEY_INQUIRIES = 'ai_news_support_inquiries_v1';

export function getSupportInquiries(): SupportInquiry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INQUIRIES);
    if (!raw) return [];
    const list: SupportInquiry[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn('Error reading support inquiries:', e);
    return [];
  }
}

export async function fetchRemoteSupportInquiries(userId?: string, role?: string): Promise<SupportInquiry[]> {
  try {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (role) params.set('role', role);
    const res = await fetch(`/api/support/requests?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(data.requests));
        }
        return data.requests;
      }
    }
  } catch (e) {
    console.warn('Could not fetch remote support inquiries:', e);
  }
  return getSupportInquiries();
}

export function saveSupportInquiry(data: Omit<SupportInquiry, 'id' | 'createdAt' | 'status'>): SupportInquiry {
  const newInquiry: SupportInquiry = {
    id: `inq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: data.userId || '',
    userName: data.userName || 'अनाम यूज़र',
    userEmail: data.userEmail || '',
    userMobile: data.userMobile || '',
    message: data.message || '',
    voiceTranscript: data.voiceTranscript,
    attachmentUrl: data.attachmentUrl,
    attachmentName: data.attachmentName,
    status: 'pending',
    createdAt: Date.now(),
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = getSupportInquiries();
      const updated = [newInquiry, ...existing];
      localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ai_news_support_inquiry_added', { detail: newInquiry }));
    } catch (e) {
      console.warn('Error saving inquiry locally:', e);
    }

    // Remote sync
    fetch('/api/support/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInquiry),
    }).catch((err) => console.warn('Remote inquiry sync failed:', err));
  }

  return newInquiry;
}

export function updateInquiryStatus(
  inquiryId: string,
  status: 'pending' | 'in_progress' | 'resolved',
  adminResponse?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const inquiries = getSupportInquiries();
    const updated = inquiries.map((inq) => {
      if (inq.id === inquiryId) {
        return {
          ...inq,
          status,
          adminResponse: adminResponse !== undefined ? adminResponse : inq.adminResponse,
        };
      }
      return inq;
    });
    localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ai_news_support_inquiry_updated'));

    // Remote sync
    fetch(`/api/support/requests/${encodeURIComponent(inquiryId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminResponse }),
    }).catch((err) => console.warn('Remote inquiry update failed:', err));
  } catch (e) {
    console.warn('Error updating inquiry status:', e);
  }
}

export function deleteInquiry(inquiryId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const inquiries = getSupportInquiries();
    const filtered = inquiries.filter((inq) => inq.id !== inquiryId);
    localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('ai_news_support_inquiry_updated'));
  } catch (e) {
    console.warn('Error deleting inquiry:', e);
  }
}
