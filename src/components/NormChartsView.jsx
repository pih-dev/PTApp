import React, { useState } from 'react';
import Modal from './Modal';
import { CHARTS, formatRunTime } from '../normCharts';
import { t } from '../i18n';

const TEST_LABELS = {
  pushup: 'testPushup', pullup: 'testPullup', invertedRow: 'testInvertedRow',
  squat: 'testSquat', run: 'testRun', sitReach: 'testSitReach',
};

const bandLabel = (b) => {
  if (b.minAge === 0 && b.maxAge === 999) return '—';
  if (b.maxAge === 999) return `${b.minAge}+`;
  if (b.minAge === 0) return `≤${b.maxAge}`;
  return `${b.minAge}–${b.maxAge}`;
};

// App-wide read-only norm-chart reference (opened from General).
// Rendered FROM the CHARTS data the scoring engine uses, so the reference can
// never drift from what the app actually scores (v2.9.6 two-sources trap).
// Rep/cm tests: columns = "reach level N at ≥ threshold". Run: max times per verdict.
export default function NormChartsView({ lang, onClose }) {
  const [gender, setGender] = useState('male');
  const [openTest, setOpenTest] = useState('pushup');

  const headerRow = (cols) => (
    <div style={{ display: 'flex', fontSize: 11, fontWeight: 600, color: 'var(--t3)',
      borderBottom: '1px solid var(--sep)', padding: '4px 0' }}>
      <div style={{ flex: 1 }}>{t(lang, 'ageHeader')}</div>
      {cols.map(c => <div key={c} style={{ flex: 1, textAlign: 'center' }}>{c}</div>)}
    </div>
  );

  return (
    <Modal title={t(lang, 'normCharts')} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['male', 'female'].map(g => (
          <button key={g} className={`filter-tab${gender === g ? ' active' : ''}`} style={{ flex: 1 }}
            onClick={() => setGender(g)}>
            {t(lang, g === 'male' ? 'men' : 'women')}
          </button>
        ))}
      </div>

      {Object.keys(CHARTS).map(testId => (
        <div key={testId} style={{ marginBottom: 10 }}>
          <button className="btn-secondary" style={{ width: '100%', fontSize: 13, padding: '10px 14px' }}
            onClick={() => setOpenTest(openTest === testId ? null : testId)}>
            {t(lang, TEST_LABELS[testId])}
            {testId === 'sitReach' ? ` · ${t(lang, 'ymcaLabel')}` : ''}
          </button>
          {openTest === testId && (
            <div style={{ padding: '8px 4px' }}>
              {testId === 'run'
                ? headerRow([t(lang, 'level5'), t(lang, 'level4'), t(lang, 'level3'), t(lang, 'runPoor')])
                : headerRow([t(lang, 'level2'), t(lang, 'level3'), t(lang, 'level4'), t(lang, 'level5')])}
              {CHARTS[testId][gender].map(band => (
                <div key={band.minAge} style={{ display: 'flex', fontSize: 12, color: 'var(--t2)',
                  borderBottom: '1px solid var(--sep)', padding: '5px 0' }}>
                  <div style={{ flex: 1, color: 'var(--t4)' }}>{bandLabel(band)}</div>
                  {testId === 'run' ? (
                    <>
                      <div style={{ flex: 1, textAlign: 'center' }}>{'<' + formatRunTime(band.t[0])}</div>
                      <div style={{ flex: 1, textAlign: 'center' }}>{'≤' + formatRunTime(band.t[1])}</div>
                      <div style={{ flex: 1, textAlign: 'center' }}>{'≤' + formatRunTime(band.t[2])}</div>
                      <div style={{ flex: 1, textAlign: 'center' }}>{'>' + formatRunTime(band.t[2])}</div>
                    </>
                  ) : band.t.map((min, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>≥{min}</div>
                  ))}
                </div>
              ))}
              {testId === 'sitReach' && (
                <div style={{ fontSize: 11, color: 'var(--t5)', marginTop: 6 }}>
                  {t(lang, 'sitReachHint')}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </Modal>
  );
}
