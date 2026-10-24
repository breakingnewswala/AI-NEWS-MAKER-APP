export interface NewsCompositionProps {
  headline: string;
  subHeadline?: string;
  tickerText: string;
  category?: string;
  channelName?: string;
  reporterName?: string;
  location?: string;
  dateStr?: string;
  accentColor?: string;
  secondaryColor?: string;
  textColor?: string;
  tickerBgColor?: string;
  tickerTextColor?: string;
  logoUrl?: string;
  mainImageUrl?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export const defaultNewsCompositionProps: NewsCompositionProps = {
  headline: "देश में नई तकनीकी क्रांति: AI से बना न्यूज़ बुलेटिन तैयार",
  subHeadline: "Remotion इंजन के साथ अब हर ख़बर बनेगी सुपरफास्ट और हाई-डेफिनिशन वीडियो",
  tickerText: "🔴 BREAKING NEWS • आज की सबसे बड़ी ख़बर • AI News Maker Studio में Remotion का सफल एकीकरण • लाइव प्रसारण 24x7",
  category: "ब्रेकिंग न्यूज़",
  channelName: "AI NEWS 24",
  reporterName: "डिजिटल संवाददाता",
  location: "नई दिल्ली",
  dateStr: "आज का ताज़ा बुलेटिन",
  accentColor: "#dc2626", // Red 600
  secondaryColor: "#1e293b", // Slate 800
  textColor: "#ffffff",
  tickerBgColor: "#fbbf24", // Yellow 400
  tickerTextColor: "#0f172a", // Slate 900
  aspectRatio: '16:9',
};
