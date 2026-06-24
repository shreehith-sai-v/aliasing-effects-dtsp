/**
 * Experiments — All 9 interactive laboratory modules
 * Each module binds controls, runs DSP, and updates visualizations.
 */

'use strict';

const Experiments = (() => {

  // ─── Shared state ────────────────────────────────────────────────────────
  const state = {
    exp1: { freq: 5, amplitude: 1, phase: 0, waveform: 'sine', duration: 1 },
    exp2: { freq: 5, fs: 20, amplitude: 1, waveform: 'sine', duration: 1 },
    exp3: { freq: 10, fs: 8, amplitude: 1, waveform: 'sine', duration: 1 },
    exp4: { freqs: [5], amplitudes: [1], fs: 20, numReplicas: 3 },
    exp5: { freq: 5, fs: 20, amplitude: 1, numLobes: 8, duration: 1 },
    exp6: { freq: 5, amplitude: 1 },
    exp7: { tones: [
      { freq: 3, amplitude: 1 },
      { freq: 7, amplitude: 0.7 },
      { freq: 13, amplitude: 0.5 },
    ], fs: 12 },
    exp8: { freq: 5, amplitude: 1, fsA: 6, fsB: 10, fsC: 30, duration: 1 },
    exp9: { fs: 12, fmax: 40, highlightFreq: 5 },
    exp10: { freq: 12, fs: 20, amplitude: 1, duration: 1 }
  };

  // ─── Helper: update a numeric display ────────────────────────────────────
  function setVal(id, value, unit = '') {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof value === 'number'
      ? (Math.abs(value) < 0.001 && value !== 0 ? value.toExponential(3) : value.toFixed(value < 100 ? 3 : 1))
      : value;
  }

  function setClass(id, cls) {
    const el = document.getElementById(id);
    if (el) { el.className = el.className.replace(/\b(ok|warn|danger)\b/g, ''); if (cls) el.classList.add(cls); }
  }

  function sliderBind(sliderId, displayId, onChange) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    if (!slider) return;
    const update = () => {
      if (display) display.textContent = parseFloat(slider.value).toFixed(
        slider.step && parseFloat(slider.step) < 1 ? 2 : 1
      );
      onChange(parseFloat(slider.value));
    };
    slider.addEventListener('input', update);
    update(); // init
  }

  // ─── Global Diagnostics Bar ──────────────────────────────────────────────
  function updateDiagnosticsBar(freq, fs) {
    const d = DSP.computeDiagnostics(freq, fs);
    setVal('diag-fs', d.fs);
    setVal('diag-fmax', d.signalFreq);
    setVal('diag-nyquist-rate', d.nyquistRate);
    setVal('diag-nyquist-freq', d.nyquistFreq);
    setVal('diag-alias-freq', d.aliasedFreq);

    const statusEl = document.getElementById('diag-status');
    if (statusEl) {
      statusEl.textContent = d.status;
      statusEl.className = 'diag-status-chip ' + (
        d.status === 'NOMINAL' ? 'chip-ok' :
        d.status === 'CRITICAL' ? 'chip-warn' : 'chip-danger'
      );
    }
    setClass('diag-alias-freq', d.isAliased ? 'danger' : 'ok');
  }

  // ─── Nyquist Banner ──────────────────────────────────────────────────────
  function updateNyquistBanner(bannerId, freq, fs) {
    const el = document.getElementById(bannerId);
    if (!el) return;
    const d = DSP.computeDiagnostics(freq, fs);
    const nyq = d.nyquistFreq;

    if (!d.isAliased && d.oversampling >= 4) {
      el.className = 'nyquist-banner ok';
      el.innerHTML = `<span class="nyquist-banner-icon">✓</span>
        <span>fs = <b>${fs} Hz</b> &gt; 2f = <b>${d.nyquistRate} Hz</b> — Nyquist criterion satisfied (×${d.oversampling.toFixed(1)} oversampled)</span>`;
    } else if (!d.isAliased) {
      el.className = 'nyquist-banner warn';
      el.innerHTML = `<span class="nyquist-banner-icon">⚠</span>
        <span>fs = <b>${fs} Hz</b> ≥ 2f = <b>${d.nyquistRate} Hz</b> — Just above Nyquist. Minimal margin.</span>`;
    } else {
      el.className = 'nyquist-banner danger';
      el.innerHTML = `<span class="nyquist-banner-icon">⚡</span>
        <span>ALIASING DETECTED — fs = <b>${fs} Hz</b> &lt; 2f = <b>${d.nyquistRate} Hz</b>.
        f = ${freq} Hz aliases to <b>${d.aliasedFreq.toFixed(2)} Hz</b></span>`;
    }
  }

  // ─── Experiment 1: Continuous Signal ─────────────────────────────────────
  function initExp1() {
    const s = state.exp1;

    sliderBind('e1-freq', 'e1-freq-val', v => { s.freq = v; renderExp1(); });
    sliderBind('e1-amplitude', 'e1-amplitude-val', v => { s.amplitude = v; renderExp1(); });
    sliderBind('e1-phase', 'e1-phase-val', v => { s.phase = v * Math.PI / 180; renderExp1(); });

    const wf = document.getElementById('e1-waveform');
    if (wf) wf.addEventListener('change', e => { s.waveform = e.target.value; renderExp1(); });

    renderExp1();
  }

  function renderExp1() {
    const s = state.exp1;
    Visualizer.plotContinuousSignal('chart-e1', s.freq, s.amplitude, s.phase, s.waveform, s.duration);
    setVal('e1-period', 1 / s.freq * 1000); // ms
    setVal('e1-freq-out', s.freq);
    setVal('e1-amplitude-out', s.amplitude);
    updateDiagnosticsBar(s.freq, 4 * s.freq); // use 4x Nyquist as default fs for diag
  }

  // ─── Experiment 2: Above Nyquist ─────────────────────────────────────────
  function initExp2() {
    const s = state.exp2;

    sliderBind('e2-freq', 'e2-freq-val', v => { s.freq = v; renderExp2(); });
    sliderBind('e2-fs', 'e2-fs-val', v => { s.fs = v; renderExp2(); });

    const wf = document.getElementById('e2-waveform');
    if (wf) wf.addEventListener('change', e => { s.waveform = e.target.value; renderExp2(); });

    renderExp2();
  }

  function renderExp2() {
    const s = state.exp2;
    const d = DSP.computeDiagnostics(s.freq, s.fs);

    const fsSlider = document.getElementById('e2-fs');
    if (fsSlider) {
      fsSlider.className = d.isAliased ? 'danger' : d.oversampling < 2.5 ? 'warn' : 'ok';
    }

    Visualizer.plotSampling('chart-e2', s.freq, s.amplitude, s.fs, s.duration, s.waveform);
    updateNyquistBanner('banner-e2', s.freq, s.fs);

    setVal('e2-nyquist-rate', d.nyquistRate);
    setVal('e2-nyquist-rate2', d.nyquistRate);
    setVal('e2-nyquist-freq', d.nyquistFreq);
    setVal('e2-oversampling', d.oversampling.toFixed(2));
    setVal('e2-num-samples', Math.floor(s.fs * s.duration));

    updateDiagnosticsBar(s.freq, s.fs);
  }

  // ─── Experiment 3: Below Nyquist ─────────────────────────────────────────
  function initExp3() {
    const s = state.exp3;

    sliderBind('e3-freq', 'e3-freq-val', v => { s.freq = v; renderExp3(); });
    sliderBind('e3-fs', 'e3-fs-val', v => { s.fs = v; renderExp3(); });

    renderExp3();
  }

  function renderExp3() {
    const s = state.exp3;
    const d = DSP.computeDiagnostics(s.freq, s.fs);

    Visualizer.plotSampling('chart-e3-main', s.freq, s.amplitude, s.fs, s.duration, 'sine');
    updateNyquistBanner('banner-e3', s.freq, s.fs);

    // FFT of sampled signal
    const samp = DSP.sampleSignalAnalytic(s.freq, s.amplitude, 0, s.fs, s.duration);
    Visualizer.plotSpectrum('chart-e3-fft', samp.x, s.fs, 512, `FFT @ fs=${s.fs}Hz`);

    setVal('e3-aliased-freq', d.aliasedFreq);
    setVal('e3-nyquist-freq', d.nyquistFreq);
    setVal('e3-fold-freq', (s.fs / 2).toFixed(2));
    setVal('e3-overlap', d.overlapAmount.toFixed(2));

    setClass('e3-aliased-freq', d.isAliased ? 'danger' : 'ok');
    updateDiagnosticsBar(s.freq, s.fs);
  }

  // ─── Experiment 4: Spectral Replicas ─────────────────────────────────────
  function initExp4() {
    const s = state.exp4;

    sliderBind('e4-freq1', 'e4-freq1-val', v => { s.freqs[0] = v; renderExp4(); });
    sliderBind('e4-fs', 'e4-fs-val', v => { s.fs = v; renderExp4(); });
    sliderBind('e4-replicas', 'e4-replicas-val', v => { s.numReplicas = Math.round(v); renderExp4(); });

    renderExp4();
  }

  function renderExp4() {
    const s = state.exp4;
    Visualizer.plotSpectralReplicas('chart-e4', s.freqs, s.amplitudes, s.fs, s.numReplicas);

    const overlap = DSP.detectSpectralOverlap(Math.max(...s.freqs), s.fs);
    setVal('e4-nyquist-freq', (s.fs / 2).toFixed(1));
    setVal('e4-overlap', overlap.overlap ? 'YES' : 'NO');
    setClass('e4-overlap', overlap.overlap ? 'danger' : 'ok');
    setVal('e4-overlap-amt', overlap.overlapAmount.toFixed(2));

    updateDiagnosticsBar(s.freqs[0], s.fs);
  }

  // ─── Experiment 5: Sinc Reconstruction ───────────────────────────────────
  function initExp5() {
    const s = state.exp5;

    sliderBind('e5-freq', 'e5-freq-val', v => { s.freq = v; renderExp5(); });
    sliderBind('e5-fs', 'e5-fs-val', v => { s.fs = v; renderExp5(); });
    sliderBind('e5-lobes', 'e5-lobes-val', v => { s.numLobes = Math.round(v); renderExp5(); });

    renderExp5();
  }

  function renderExp5() {
    const s = state.exp5;
    const metrics = Visualizer.plotReconstruction(
      'chart-e5-orig', 'chart-e5-recon',
      s.freq, s.amplitude, s.fs, s.duration, s.numLobes
    );

    setVal('e5-rmse', metrics.rmse);
    setVal('e5-snr', isFinite(metrics.snr) ? metrics.snr.toFixed(1) : '∞');
    setVal('e5-fidelity', metrics.fidelity.toFixed(1));

    const fidelityEl = document.getElementById('e5-fidelity');
    if (fidelityEl) {
      const cls = metrics.fidelity > 95 ? 'ok' : metrics.fidelity > 70 ? 'warn' : 'danger';
      setClass('e5-fidelity', cls);
    }

    updateNyquistBanner('banner-e5', s.freq, s.fs);
    updateDiagnosticsBar(s.freq, s.fs);
  }

  // ─── Experiment 6: RMSE Sweep ─────────────────────────────────────────────
  let sweepRunning = false;

  function initExp6() {
    const s = state.exp6;

    sliderBind('e6-freq', 'e6-freq-val', v => { s.freq = v; renderExp6(); });
    sliderBind('e6-amplitude', 'e6-amplitude-val', v => { s.amplitude = v; });

    const btn = document.getElementById('e6-sweep-btn');
    if (btn) btn.addEventListener('click', runSweepAnimation);

    renderExp6();
  }

  function renderExp6() {
    const s = state.exp6;
    Visualizer.plotRMSESweep('chart-e6', s.freq, s.amplitude);
    setVal('e6-nyquist-rate', 2 * s.freq);
    updateDiagnosticsBar(s.freq, 2 * s.freq);
  }

  function runSweepAnimation() {
    if (sweepRunning) return;
    sweepRunning = true;
    const bar = document.getElementById('e6-progress-bar');
    if (bar) { bar.style.width = '0%'; }
    let pct = 0;
    const interval = setInterval(() => {
      pct += 2;
      if (bar) bar.style.width = pct + '%';
      if (pct >= 100) {
        clearInterval(interval);
        sweepRunning = false;
        renderExp6();
      }
    }, 40);
  }

  // ─── Experiment 7: Multi-Tone ─────────────────────────────────────────────
  function initExp7() {
    const s = state.exp7;

    sliderBind('e7-fs', 'e7-fs-val', v => { s.fs = v; renderExp7(); });
    sliderBind('e7-f1', 'e7-f1-val', v => { s.tones[0].freq = v; renderExp7(); });
    sliderBind('e7-f2', 'e7-f2-val', v => { s.tones[1].freq = v; renderExp7(); });
    sliderBind('e7-f3', 'e7-f3-val', v => { s.tones[2].freq = v; renderExp7(); });

    renderExp7();
  }

  function renderExp7() {
    const s = state.exp7;
    const results = Visualizer.plotMultiToneAliasing('chart-e7-time', 'chart-e7-fft', s.tones, s.fs);

    // Update tone badges
    results.forEach((r, i) => {
      const badge = document.getElementById(`e7-badge-${i + 1}`);
      if (badge) {
        badge.textContent = r.isAliased ? `→ ${r.aliasedFreq.toFixed(1)} Hz` : 'Clean';
        badge.className = `tone-alias-badge ${r.isAliased ? 'aliased' : 'clean'}`;
      }
    });

    const anyAliased = results.some(r => r.isAliased);
    setVal('e7-nyquist-freq', (s.fs / 2).toFixed(1));
    setVal('e7-aliased-count', results.filter(r => r.isAliased).length);
    updateDiagnosticsBar(Math.max(...s.tones.map(t => t.freq)), s.fs);
  }

  // ─── Experiment 8: Rate Comparison ───────────────────────────────────────
  function initExp8() {
    const s = state.exp8;

    sliderBind('e8-freq', 'e8-freq-val', v => { s.freq = v; renderExp8(); });
    sliderBind('e8-fsa', 'e8-fsa-val', v => { s.fsA = v; renderExp8(); });
    sliderBind('e8-fsb', 'e8-fsb-val', v => { s.fsB = v; renderExp8(); });
    sliderBind('e8-fsc', 'e8-fsc-val', v => { s.fsC = v; renderExp8(); });

    renderExp8();
  }

  function renderExp8() {
    const s = state.exp8;
    Visualizer.plotRateComparison(
      ['chart-e8a', 'chart-e8b', 'chart-e8c'],
      s.freq, s.amplitude,
      [s.fsA, s.fsB, s.fsC],
      s.duration
    );

    [['e8a', s.fsA], ['e8b', s.fsB], ['e8c', s.fsC]].forEach(([prefix, fs]) => {
      const d = DSP.computeDiagnostics(s.freq, fs);
      setVal(`${prefix}-status`, d.status);
      setClass(`${prefix}-status`, d.status === 'NOMINAL' ? 'ok' : 'danger');
      setVal(`${prefix}-alias`, d.isAliased ? d.aliasedFreq.toFixed(2) : '—');
    });

    updateDiagnosticsBar(s.freq, s.fsB);
  }

  // ─── Experiment 9: Frequency Folding ─────────────────────────────────────
  function initExp9() {
    const s = state.exp9;

    sliderBind('e9-fs', 'e9-fs-val', v => { s.fs = v; renderExp9(); });
    sliderBind('e9-freq', 'e9-freq-val', v => { s.highlightFreq = v; renderExp9(); });
    sliderBind('e9-fmax', 'e9-fmax-val', v => { s.fmax = v; renderExp9(); });

    renderExp9();
  }

  function renderExp9() {
    const s = state.exp9;
    Visualizer.plotFoldingDiagram('chart-e9', s.fs, s.fmax, s.highlightFreq);

    const aliased = DSP.computeAliasedFrequency(s.highlightFreq, s.fs);
    const fN = s.fs / 2;
    const isAliased = s.highlightFreq > fN;

    setVal('e9-input-freq', s.highlightFreq);
    setVal('e9-nyquist-freq', fN.toFixed(1));
    setVal('e9-alias-freq', aliased.toFixed(3));
    setVal('e9-fold-eq',
      `f_alias = |((${s.highlightFreq} + ${fN}) mod ${s.fs}) − ${fN}| = ${aliased.toFixed(2)} Hz`
    );

    const path = DSP.computeFrequencyFoldingPath(s.highlightFreq, s.fs);
    const pathEl = document.getElementById('e9-fold-path');
    if (pathEl) {
      pathEl.innerHTML = path.map((p, i) =>
        `<div style="padding:3px 0; color:${i === 0 ? '#34D399' : i === path.length-1 ? '#F87171' : '#FBBF24'}">${p.description}</div>`
      ).join('→');
    }

    setClass('e9-alias-freq', isAliased ? 'danger' : 'ok');
    updateDiagnosticsBar(s.highlightFreq, s.fs);
  }

  // ─── Experiment 10: Anti-Aliasing Filter ──────────────────────────────────
  function initExp10() {
    const s = state.exp10;

    sliderBind('e10-freq', 'e10-freq-val', v => { s.freq = v; renderExp10(); });
    sliderBind('e10-fs', 'e10-fs-val', v => { s.fs = v; renderExp10(); });

    renderExp10();
  }

  function renderExp10() {
    const s = state.exp10;
    const cutoff = s.fs / 2;
    const isFiltered = s.freq > cutoff;

    Visualizer.plotAntiAliasing('chart-e10-before', 'chart-e10-after', s.freq, s.amplitude, s.fs, s.duration);

    setVal('e10-cutoff', cutoff);
    const actionEl = document.getElementById('e10-action');
    if (actionEl) {
      if (isFiltered) {
        actionEl.textContent = 'ATTENUATED (f > fs/2)';
        actionEl.className = 'danger';
      } else {
        actionEl.textContent = 'PASSED (f <= fs/2)';
        actionEl.className = 'ok';
      }
    }

    updateDiagnosticsBar(s.freq, s.fs);
  }

  // ─── Init All ─────────────────────────────────────────────────────────────
  function initAll() {
    initExp1();
    initExp2();
    initExp3();
    initExp4();
    initExp5();
    initExp6();
    initExp7();
    initExp8();
    initExp9();
    initExp10();
  }

  return { initAll, state, updateDiagnosticsBar };

})();

window.Experiments = Experiments;
