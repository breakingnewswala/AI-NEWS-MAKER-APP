const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.resolve(__dirname, '../AI-NEWS-MAKER-APP-main/web_studio/src/components/InlineAiNewsTools.tsx'),
  path.resolve(__dirname, '../AI-NEWS-MAKER-APP-main/src/components/InlineAiNewsTools.tsx')
];

targetFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    return;
  }
  let content = fs.readFileSync(file, 'utf8');

  // Normalize line endings for replacement operations, but preserve file format
  const isCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  // 1. Add insufficientCoins handling after data parsing in handleRegenerateHeadlines
  const dataParseTarget = `      } catch (fetchErr) {
        console.warn('Network or endpoint fetch error in regenerate-headlines:', fetchErr);
        data = null;
      }`;
  const dataParseReplacement = `      } catch (fetchErr) {
        console.warn('Network or endpoint fetch error in regenerate-headlines:', fetchErr);
        data = null;
      }

      if (data && data.insufficientCoins) {
        setError(data.error || 'अपर्याप्त कॉइन बैलेंस! कृपया कॉइन्स प्राप्त करें या प्लान अपग्रेड करें।');
        setIsRegenerating(false);
        return;
      }`;
  if (content.includes(dataParseTarget) && !content.includes('data.insufficientCoins')) {
    content = content.replace(dataParseTarget, dataParseReplacement);
  }

  // 2. Append new headlines instead of replacing them (Part 4.5)
  const replaceHeadlinesTarget = `      if (newOptions.length > 0) {
        setHeadlineOptions(newOptions);
        setSelectedHeadlineIndex(0);
        const topH = newOptions[0];
        setResult((prev) =>
          prev
            ? {
                ...prev,
                headline: topH,
                formattedHeadline: topH,
                headlineOptions: newOptions,
                canonicalContext: (data && data.canonicalContext) || activeCtx,
              }
            : null
        );
        if (data && data.actualProvider) {
          setActiveGeneratedProvider(data.actualProvider);
        }
        onChange({ headline: topH, formattedHeadline: topH });
        setRegenSuccessMsg('5 नए संतुलित हेडलाइन विकल्प सफलतापूर्वक तैयार किए गए!');
        setTimeout(() => setRegenSuccessMsg(null), 3500);`;
  
  const replaceHeadlinesReplacement = `      if (newOptions.length > 0) {
        // Part 4.5: Append new headlines to list without replacing or erasing existing options!
        const combined = [...headlineOptions, ...newOptions];
        setHeadlineOptions(combined);
        const newIdx = headlineOptions.length;
        setSelectedHeadlineIndex(newIdx < combined.length ? newIdx : 0);
        const topH = combined[newIdx < combined.length ? newIdx : 0] || combined[0];
        setResult((prev) =>
          prev
            ? {
                ...prev,
                headline: topH,
                formattedHeadline: topH,
                headlineOptions: combined,
                canonicalContext: (data && data.canonicalContext) || activeCtx,
              }
            : null
        );
        if (data && data.actualProvider) {
          setActiveGeneratedProvider(data.actualProvider);
        }
        onChange({ headline: topH, formattedHeadline: topH });
        const coinsMsg = data && data.coinsDeducted > 0 ? \` (\${data.coinsDeducted} कॉइन्स कटे, शेष: \${data.remainingCoins})\` : '';
        setRegenSuccessMsg(\`5 नए संतुलित हेडलाइन विकल्प सफलतापूर्वक जोड़े गए!\${coinsMsg}\`);
        setTimeout(() => setRegenSuccessMsg(null), 4000);`;

  if (content.includes(replaceHeadlinesTarget)) {
    content = content.replace(replaceHeadlinesTarget, replaceHeadlinesReplacement);
  }

  // 3. In catch fallback: also append instead of replace
  const fallbackTarget = `        if (fitted.length > 0) {
          setHeadlineOptions(fitted.slice(0, 5));
          setSelectedHeadlineIndex(0);
          const topH = fitted[0];
          setResult((prev) => (prev ? { ...prev, headline: topH, formattedHeadline: topH, headlineOptions: fitted } : null));
          onChange({ headline: topH, formattedHeadline: topH });
          setRegenSuccessMsg('5 नए संतुलित हेडलाइन विकल्प तैयार किए गए!');
          setTimeout(() => setRegenSuccessMsg(null), 3500);
          return;
        }`;

  const fallbackReplacement = `        if (fitted.length > 0) {
          const combined = [...headlineOptions, ...fitted.slice(0, 5)];
          setHeadlineOptions(combined);
          const newIdx = headlineOptions.length;
          setSelectedHeadlineIndex(newIdx < combined.length ? newIdx : 0);
          const topH = combined[newIdx < combined.length ? newIdx : 0] || combined[0];
          setResult((prev) => (prev ? { ...prev, headline: topH, formattedHeadline: topH, headlineOptions: combined } : null));
          onChange({ headline: topH, formattedHeadline: topH });
          setRegenSuccessMsg('5 नए संतुलित हेडलाइन विकल्प सफलतापूर्वक जोड़े गए!');
          setTimeout(() => setRegenSuccessMsg(null), 3500);
          return;
        }`;

  if (content.includes(fallbackTarget)) {
    content = content.replace(fallbackTarget, fallbackReplacement);
  }

  if (isCRLF) {
    content = content.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated:', file);
});
