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

export function saveSupportInquiry(data: Omit<SupportInquiry, 'id' | 'createdAt' | 'status'>): SupportInquiry {
  const newInquiry: SupportInquiry = {
    id: `inq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
      console.warn('Error saving inquiry:', e);
    }
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
