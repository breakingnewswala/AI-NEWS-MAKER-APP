const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.resolve(__dirname, '../AI-NEWS-MAKER-APP-main/web_studio/src/components/HomeScreenWeb.tsx'),
  path.resolve(__dirname, '../AI-NEWS-MAKER-APP-main/src/components/HomeScreenWeb.tsx')
];

targetFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  const isCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  const oldTarget = `                    <textarea
                      rows={2}
                      value={editingPost.approvedCaptionShort || ''}
                      placeholder="संक्षिप्त मुख्य बिंदु कैप्शन..."
                      onChange={(e) => setEditingPost({ ...editingPost, approvedCaptionShort: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>
                </div>
                  </div>
                )}

                {/* Photos & Layout Selection */}`;

  const newTarget = `                    <textarea
                      rows={2}
                      value={editingPost.approvedCaptionShort || ''}
                      placeholder="संक्षिप्त मुख्य बिंदु कैप्शन..."
                      onChange={(e) => setEditingPost({ ...editingPost, approvedCaptionShort: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Photos & Layout Selection */}`;

  if (content.includes(oldTarget)) {
    content = content.replace(oldTarget, newTarget);
    if (isCRLF) content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully fixed dangling JSX in:', file);
  } else {
    console.warn('Target not found in:', file);
  }
});
