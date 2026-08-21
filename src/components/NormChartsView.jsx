import React, { useState } from 'react';
import Modal from './Modal';
import { CHARTS } from '../normCharts';
import { t } from '../i18n';

// v2.12: the reference shows the ACTIVE battery only — the 1RM strength
// standards. Mass charts remain in CHARTS (frozen-record audit trail + in-file
// documentation) but are no longer displayed. Rendered FROM the CHARTS data the
// scoring engine uses, so the reference can never drift from what the app
// actually scores (v2.9.6 two-sources trap).
const ONE_RM_TESTS = ['bench1rm', 'squat1rm', 'deadlift1rm'];
const TEST_LABELS = { bench1rm: 'testBench', squat1rm: 'testSquat1rm', deadlift1rm: 'testDeadlift' };

export default function NormChartsView({ lang, onClose }) {
  const [gender, setGender] = useState('male');

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

      <div style={{ fontSize: 11, color: 'var(--t5)', marginBottom: 10 }}>
        {t(lang, 'oneRmStandardsLabel')}
      </div>

      {/* One row per lift: threshold ratios to REACH levels 2..5 (below min2 = level 1).
          Values are 1RM ÷ bodyweight — flat for all ages (pull-up chart precedent). */}
      <div style={{ display: 'flex', fontSize: 11, fontWeight: 600, color: 'var(--t3)',
        borderBottom: '2px solid var(--bar)', padding: '4px 0' }}>
        <div style={{ flex: 1.4 }} />
        {[2, 3, 4, 5].map(n => (
          <div key={n} style={{ flex: 1, textAlign: 'center' }}>{t(lang, `level${n}`)}</div>
        ))}
      </div>
      {ONE_RM_TESTS.map(testId => (
        <div key={testId} style={{ display: 'flex', fontSize: 12, color: 'var(--t2)',
          borderBottom: '2px solid var(--bar)', padding: '6px 0' }}>
          <div style={{ flex: 1.4, color: 'var(--t4)' }}>{t(lang, TEST_LABELS[testId])}</div>
          {CHARTS[testId][gender][0].t.map((min, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>≥{min}{t(lang, 'bwRatio')}</div>
          ))}
        </div>
      ))}
    </Modal>
  );
}
