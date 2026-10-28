// Modular Template Configuration Architecture
// Supports individual positioning and line count per template

export interface TemplateElementPosition {
  x?: number | string; // e.g. 'center', 'left', 'right', or percentage/px
  y?: number | string; // e.g. 'top', 'bottom', or px/percentage
  width?: number | string;
  height?: number | string;
  align?: 'center' | 'left' | 'right';
  visible?: boolean;
}

export interface StudioTemplateConfig {
  id: string;
  name: string;
  description: string;
  badge: string;
  aspectRatio: '4:5' | '1:1' | '9:16' | '16:9';
  headlineLines: 2 | 3; // Configurable per template
  headline_max_lines: number;
  headline_area: string;
  headlinePosition: TemplateElementPosition;
  locationPosition: TemplateElementPosition;
  logoPosition: TemplateElementPosition;
  photoPosition: TemplateElementPosition;
  footerPosition: TemplateElementPosition;
  isActive: boolean; // Currently only default frame is active
}

export const REGISTERED_TEMPLATES: StudioTemplateConfig[] = [
  {
    id: 'jacket-default',
    name: 'डिफ़ॉल्ट फ्रेम (Default Frame)',
    description: 'आधिकारिक 4:5 अनुपात, टॉप लोगो, लोकेशन स्ट्रिप, 2-3 लाइन हेडलाइन व सेंटर-अलाइन्ड सोशल फुटर',
    badge: '★ डिफ़ॉल्ट',
    aspectRatio: '4:5',
    headlineLines: 3,
    headline_max_lines: 3,
    headline_area: '3-Line Headline Area (डिफ़ॉल्ट 4:5)',
    headlinePosition: { x: 'center', y: 'bottom', align: 'center', visible: true },
    locationPosition: { x: 'left', y: 'top', align: 'left', visible: true },
    logoPosition: { x: 'left', y: 'top', align: 'left', visible: true },
    photoPosition: { x: 'center', y: 'middle', align: 'center', visible: true },
    footerPosition: { x: 'center', y: 'bottom', align: 'center', visible: true },
    isActive: true,
  },
  {
    id: 'template-1',
    name: 'टेम्पलेट 1 (Template 1)',
    description: 'आगामी सैंपल फ्रेम डिज़ाइन (सैंपल डिज़ाइन प्राप्त होने पर सक्रिय होगी)',
    badge: '🔒 आगामी',
    aspectRatio: '4:5',
    headlineLines: 2,
    headline_max_lines: 2,
    headline_area: '2-Line Headline Area',
    headlinePosition: { x: 'center', y: 'bottom', align: 'center', visible: true },
    locationPosition: { x: 'left', y: 'top', align: 'left', visible: true },
    logoPosition: { x: 'right', y: 'top', align: 'right', visible: true },
    photoPosition: { x: 'center', y: 'middle', align: 'center', visible: true },
    footerPosition: { x: 'center', y: 'bottom', align: 'center', visible: true },
    isActive: false,
  },
  {
    id: 'template-2',
    name: 'टेम्पलेट 2 (Template 2)',
    description: 'आगामी सैंपल फ्रेम डिज़ाइन (सैंपल डिज़ाइन प्राप्त होने पर सक्रिय होगी)',
    badge: '🔒 आगामी',
    aspectRatio: '4:5',
    headlineLines: 3,
    headline_max_lines: 3,
    headline_area: '3-Line Headline Area',
    headlinePosition: { x: 'center', y: 'bottom', align: 'center', visible: true },
    locationPosition: { x: 'center', y: 'top', align: 'center', visible: true },
    logoPosition: { x: 'left', y: 'top', align: 'left', visible: true },
    photoPosition: { x: 'center', y: 'middle', align: 'center', visible: true },
    footerPosition: { x: 'center', y: 'bottom', align: 'center', visible: true },
    isActive: false,
  },
  {
    id: 'template-3',
    name: 'टेम्पलेट 3 (Template 3)',
    description: 'आगामी सैंपल फ्रेम डिज़ाइन (सैंपल डिज़ाइन प्राप्त होने पर सक्रिय होगी)',
    badge: '🔒 आगामी',
    aspectRatio: '4:5',
    headlineLines: 2,
    headline_max_lines: 2,
    headline_area: '2-Line Headline Area',
    headlinePosition: { x: 'center', y: 'bottom', align: 'center', visible: true },
    locationPosition: { x: 'left', y: 'bottom', align: 'left', visible: true },
    logoPosition: { x: 'left', y: 'top', align: 'left', visible: true },
    photoPosition: { x: 'center', y: 'top', align: 'center', visible: true },
    footerPosition: { x: 'center', y: 'bottom', align: 'center', visible: true },
    isActive: false,
  },
];

export function getTemplateConfig(id: string): StudioTemplateConfig {
  const found = REGISTERED_TEMPLATES.find((t) => t.id === id);
  return found || REGISTERED_TEMPLATES[0];
}
