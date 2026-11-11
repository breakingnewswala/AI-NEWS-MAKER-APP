function sanitizeFlattery(text) {
  return text
    .replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री|परम पूज्य|पूज्य)\s+/gu, " ")
    .replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, " ")
    .replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, "")
    .replace(/\s+जी(?=[,\s.!?।\n]|$)/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}