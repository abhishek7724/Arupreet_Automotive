Replace only lib/api.js and lib/data.js with these files. Keep config.js unchanged. Then hard refresh (Ctrl+Shift+R).

Fixes:
1) declares lastMeta before use (previously caused ReferenceError after successful Apps Script responses)
2) defines snapshot helpers
3) adds 15s request timeout
4) saves last successful data snapshot
