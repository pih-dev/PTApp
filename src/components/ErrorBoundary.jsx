import React from 'react';

// Top-level boundary so a render-time crash (e.g. corrupted localStorage producing
// invalid state, or a bad migration) doesn't leave the user looking at a blank
// white screen with no escape hatch. We deliberately do NOT pull in i18n, CSS
// vars, or shared components here — any of those could be the thing that crashed.
// All copy is hardcoded EN+AR; all styling is inline with a safe dark palette.
class ErrorBoundary extends React.Component {
  state = { error: null, info: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log for devtools — user can also expand "Error details" below
    console.error('[ErrorBoundary] App crashed:', error, info);
    this.setState({ info });
  }

  downloadBackup = () => {
    try {
      const raw = localStorage.getItem('ptapp-data') || '{}';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ptapp-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Backup download failed: ' + e.message);
    }
  };

  reload = () => window.location.reload();

  resetData = () => {
    const ok = window.confirm(
      'Erase ALL local data and reload?\n\n' +
      'This cannot be undone unless you have a backup file.\n\n' +
      '— — —\n\n' +
      'سيتم محو جميع البيانات المحلية وإعادة تحميل التطبيق.\n' +
      'لا يمكن التراجع عن ذلك إلا إذا كان لديك ملف نسخة احتياطية.'
    );
    if (!ok) return;
    try {
      localStorage.removeItem('ptapp-data');
      window.location.reload();
    } catch (e) {
      alert('Reset failed: ' + e.message);
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    const stack = (this.state.error && this.state.error.stack) || String(this.state.error);
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <h1 style={s.title}>⚠ Something went wrong</h1>
          <p style={s.text}>
            The app hit an error and stopped. Your data is still saved in this browser.
            Download a backup before trying Reset.
          </p>
          <p style={{ ...s.text, ...s.textAr }}>
            توقف التطبيق بسبب خطأ. بياناتك لا تزال محفوظة في هذا المتصفح.
            حمّل نسخة احتياطية قبل تجربة "إعادة الضبط".
          </p>

          <div style={s.btnCol}>
            <button onClick={this.downloadBackup} style={s.btnPrimary}>
              ⬇ Download backup / تحميل نسخة احتياطية
            </button>
            <button onClick={this.reload} style={s.btnSecondary}>
              ⟳ Try again / إعادة المحاولة
            </button>
            <button onClick={this.resetData} style={s.btnDanger}>
              ⨉ Reset (erase local data) / إعادة الضبط
            </button>
          </div>

          <details style={s.details}>
            <summary style={s.summary}>Error details</summary>
            <pre style={s.pre}>{stack}</pre>
          </details>
        </div>
      </div>
    );
  }
}

// Inline styles — boundary must work even if styles.css failed to load.
// Safe dark palette (no CSS vars), system font, generous padding for touch targets.
const s = {
  wrap: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    padding: '24px 16px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  card: {
    maxWidth: 480,
    margin: '0 auto',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  title: { fontSize: 22, margin: '0 0 12px', fontWeight: 700 },
  text: { margin: '0 0 12px', opacity: 0.85, fontSize: 14, lineHeight: 1.55 },
  textAr: { direction: 'rtl', opacity: 0.7, marginBottom: 24 },
  btnCol: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 },
  btnPrimary: {
    padding: '14px 16px', fontSize: 15, fontWeight: 600,
    border: 'none', borderRadius: 10, cursor: 'pointer',
    fontFamily: 'inherit', background: '#2563EB', color: 'white',
  },
  btnSecondary: {
    padding: '14px 16px', fontSize: 15, fontWeight: 600,
    border: 'none', borderRadius: 10, cursor: 'pointer',
    fontFamily: 'inherit', background: 'rgba(255,255,255,0.12)', color: 'white',
  },
  btnDanger: {
    padding: '14px 16px', fontSize: 15, fontWeight: 600,
    border: 'none', borderRadius: 10, cursor: 'pointer',
    fontFamily: 'inherit', background: '#EF4444', color: 'white',
  },
  details: { fontSize: 12, opacity: 0.65 },
  summary: { cursor: 'pointer', padding: '4px 0' },
  pre: {
    marginTop: 8, padding: 12,
    background: 'rgba(0,0,0,0.4)', borderRadius: 6,
    fontSize: 11, lineHeight: 1.4,
    overflow: 'auto', maxHeight: 240,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
};

export default ErrorBoundary;
