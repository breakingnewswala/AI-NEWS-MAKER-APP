import { NewsDraft, NewsCardData } from '../types';

const STORAGE_KEY_DRAFTS = 'ai_news_maker_saved_drafts_v1';

// Initial sample drafts to showcase the feature seamlessly
const DEFAULT_SAMPLE_DRAFTS: NewsDraft[] = [
  {
    id: 'draft-sample-1',
    title: 'सड़क सुरक्षा विशेष अभियान: प्रशासन सख्त',
    headline: 'शहडोल: नेशनल हाईवे पर चेकिंग अभियान तेज, ओवरलोडिंग पर भारी जुर्माना',
    category: 'प्रशासन',
    location: 'शहडोल, मप्र',
    summary: 'शहडोल जिले में यातायात नियमों के उल्लंघन पर पुलिस एवं परिवहन विभाग ने संयुक्त कार्रवाई की। नेशनल हाईवे पर चलने वाले भारी वाहनों की सघन जांच की गई।\n\nनियम तोड़ने वाले 25 से अधिक वाहनों पर चालानी कार्रवाई कर जुर्माना वसूला गया।',
    anchorScript: 'नमस्कार, मैं ब्रेकिंग न्यूज़ से। शहडोल से बड़ी खबर जहां नेशनल हाईवे पर प्रशासन ने अवैध ओवरलोडिंग और तेज रफ्तार वाहनों के खिलाफ बड़ा अभियान छेड़ दिया है। कई वाहनों पर जुर्माना लगाया गया है। आइए देखते हैं पूरी रिपोर्ट।',
    tags: ['#शहडोल', '#सड़कसुरक्षा', '#प्रशासन', '#BreakingNews', '#AINewsMaker'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
    cardData: {
      templateId: 'graphic_001',
      frameDesign: 'classic_breaking',
      headline: 'शहडोल: नेशनल हाईवे पर चेकिंग अभियान तेज, ओवरलोडिंग पर भारी जुर्माना',
      formattedHeadline: 'शहडोल: नेशनल हाईवे पर [yellow]चेकिंग अभियान तेज[/yellow], ओवरलोडिंग पर भारी जुर्माना',
      highlightWords: ['चेकिंग अभियान तेज'],
      location: 'शहडोल, मप्र',
      date: 'आज की ताज़ा ख़बर',
      category: 'प्रशासन',
      summary: 'शहडोल जिले में यातायात नियमों के उल्लंघन पर पुलिस एवं परिवहन विभाग ने संयुक्त कार्रवाई की।',
      photoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    } as any,
  },
  {
    id: 'draft-sample-2',
    title: 'कृषि विकास योजना: किसानों को अनुदान',
    headline: 'मध्य प्रदेश: सोलर पंप योजना पर 80% तक सब्सिडी, किसानों में खुशी की लहर',
    category: 'विकास',
    location: 'भोपाल, मप्र',
    summary: 'मध्य प्रदेश सरकार ने किसानों की सिंचाई सुविधा को सुगम बनाने के लिए सोलर पंप योजना के तहत भारी अनुदान की घोषणा की है।\n\nकृषि मंत्री ने कहा कि योजना से बिजली बिल का खर्च शून्य होगा और किसानों की आय में बढ़ोतरी होगी।',
    anchorScript: 'नमस्कार, किसानों के लिए बड़ी खुशखबरी। मध्य प्रदेश में सोलर पंप लगाने पर सरकार 80% तक की भारी सब्सिडी दे रही है। योजना का लाभ लेने के लिए किसान तुरंत ऑनलाइन आवेदन कर सकते हैं।',
    tags: ['#किसान', '#सोलरपंप', '#मध्यप्रदेश', '#विकास', '#AINewsMaker'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80',
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 24,
    cardData: {
      templateId: 'graphic_002',
      frameDesign: 'modern_red',
      headline: 'मध्य प्रदेश: सोलर पंप योजना पर 80% तक सब्सिडी, किसानों में खुशी की लहर',
      formattedHeadline: 'मध्य प्रदेश: सोलर पंप योजना पर [yellow]80% सब्सिडी[/yellow], किसानों में खुशी',
      highlightWords: ['80% सब्सिडी'],
      location: 'भोपाल, मप्र',
      date: 'विशेष रिपोर्ट',
      category: 'विकास',
      summary: 'मध्य प्रदेश सरकार ने किसानों की सिंचाई सुविधा के लिए सोलर पंप योजना शुरू की।',
      photoUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80',
    } as any,
  }
];

export function getSavedDrafts(): NewsDraft[] {
  if (typeof window === 'undefined') return DEFAULT_SAMPLE_DRAFTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(DEFAULT_SAMPLE_DRAFTS));
      return DEFAULT_SAMPLE_DRAFTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SAMPLE_DRAFTS;
  } catch (err) {
    console.error('Error reading drafts from localStorage:', err);
    return DEFAULT_SAMPLE_DRAFTS;
  }
}

export function saveDraft(
  cardData: NewsCardData,
  extraMeta?: {
    title?: string;
    anchorScript?: string;
    tags?: string[];
    thumbnailUrl?: string;
    existingDraftId?: string;
  }
): NewsDraft {
  const drafts = getSavedDrafts();
  const now = Date.now();
  const draftId = extraMeta?.existingDraftId || `draft-${now}-${Math.random().toString(36).substring(2, 6)}`;
  
  const title = extraMeta?.title || cardData.headline || 'अनाम न्यूज़ ड्राफ्ट';
  const headline = cardData.headline || 'ताज़ा समाचार हेडलाइन';
  const category = cardData.category || 'ताज़ा';
  const location = cardData.location || 'मध्य प्रदेश';
  const summary = cardData.summary || '';
  const anchorScript = extraMeta?.anchorScript || '';
  const tags = extraMeta?.tags || ['#BreakingNews', '#HindiNews', '#AINewsMaker'];
  const thumbnailUrl = extraMeta?.thumbnailUrl || cardData.photoUrl || '';

  const newDraft: NewsDraft = {
    id: draftId,
    title,
    headline,
    category,
    location,
    summary,
    anchorScript,
    tags,
    cardData: { ...cardData },
    thumbnailUrl,
    createdAt: now,
    updatedAt: now,
  };

  const existingIdx = drafts.findIndex((d) => d.id === draftId);
  let updatedDrafts: NewsDraft[];
  if (existingIdx >= 0) {
    newDraft.createdAt = drafts[existingIdx].createdAt;
    updatedDrafts = [...drafts];
    updatedDrafts[existingIdx] = newDraft;
  } else {
    updatedDrafts = [newDraft, ...drafts];
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(updatedDrafts));
      window.dispatchEvent(new CustomEvent('ai_news_drafts_updated', { detail: updatedDrafts }));
      // Background async sync with server
      fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDraft),
      }).catch((e) => console.log('Draft server sync deferred:', e));
    } catch (err) {
      console.error('Error saving draft:', err);
    }
  }

  return newDraft;
}

export function deleteDraft(id: string): void {
  const drafts = getSavedDrafts();
  const filtered = drafts.filter((d) => d.id !== id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('ai_news_drafts_updated', { detail: filtered }));
      fetch(`/api/drafts/${id}`, { method: 'DELETE' }).catch((e) => console.log('Draft server delete deferred:', e));
    } catch (err) {
      console.error('Error deleting draft:', err);
    }
  }
}

export function getDraftById(id: string): NewsDraft | undefined {
  const drafts = getSavedDrafts();
  return drafts.find((d) => d.id === id);
}
