/**
 * Visualizer — Plotly chart factory & animation engine
 * All chart theming, layout, and real-time animation loops.
 */

'use strict';

const Visualizer = (() => {

  // ─── Plotly Dark Theme ────────────────────────────────────────────────────
  const PLOT_LAYOUT_BASE = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor:  'rgba(0,0,0,0)',
    font: { family: 'JetBrains Mono, Inter, monospace', size: 11, color: '#60748A' },
    margin: { l: 52, r: 18, t: 28, b: 44 },
    xaxis: {
      gridcolor: 'rgba(255,255,255,0.05)',
      linecolor: 'rgba(255,255,255,0.08)',
      tickcolor: 'rgba(255,255,255,0.08)',
      zerolinecolor: 'rgba(255,255,255,0.12)',
      tickfont: { size: 10, color: '#60748A' },
      title: { font: { size: 11, color: '#60748A' } }
    },
    yaxis: {
      gridcolor: 'rgba(255,255,255,0.05)',
      linecolor: 'rgba(255,255,255,0.08)',
      tickcolor: 'rgba(255,255,255,0.08)',
      zerolinecolor: 'rgba(255,255,255,0.12)',
      tickfont: { size: 10, color: '#60748A' },
      title: { font: { size: 11, color: '#60748A' } }
    },
    legend: {
      bgcolor: 'rgba(0,0,0,0)',
      bordercolor: 'rgba(255,255,255,0.07)',
      borderwidth: 1,
      font: { size: 10, color: '#8899AA' }
    },
    hoverlabel: {
      bgcolor: 'rgba(10,13,20,0.95)',
      bordercolor: 'rgba(0,212,220,0.4)',
      font: { family: 'JetBrains Mono', size: 11, color: '#E2E8F0' }
    },
    hovermode: 'closest',
    dragmode: 'zoom',
    modebar: { bgcolor: 'rgba(0,0,0,0)', color: '#60748A', activecolor: '#00D4DC' }
  };

  const PLOTLY_CONFIG = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'resetScale2d'],
    modeBarButtonsToAdd: [],
    toImageButtonOptions: { format: 'png', filename: 'dsp_lab', scale: 2 }
  };

  // Color palette
  const C = {
    signal:  '#34D399',  // green
    sampled: '#FBBF24',  // amber
    aliased: '#F87171',  // red
    recon:   '#22D3EE',  // cyan
    error:   '#F472B6',  // pink
    nyquist: '#FDE68A',  // yellow
    violet:  '#A78BFA',  // violet
    replica: [
      'rgba(0,212,220,0.65)',
      'rgba(130,80,255,0.55)',
      'rgba(248,113,113,0.5)',
      'rgba(251,191,36,0.5)',
      'rgba(52,211,153,0.45)',
      'rgba(244,114,182,0.5)',
      'rgba(56,189,248,0.5)',
    ]
  };

  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  function layout(overrides = {}) {
    const baseCopy = JSON.parse(JSON.stringify(PLOT_LAYOUT_BASE));
    return deepMerge(baseCopy, overrides);
  }

  // ─── Hero Canvas Animation ────────────────────────────────────────────────
  let heroAnimId = null;
  let heroPhase = 0;

  function startHeroCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    function drawFrame() {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      // Background subtle glow
      const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.6);
      grad.addColorStop(0, 'rgba(0,212,220,0.03)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const f1 = 3, f2 = 7, f3 = 13;
      const fs = 10;
      const duration = 2;
      const renderRate = 400;

      // Draw continuous signal
      ctx.beginPath();
      ctx.lineWidth = 2;
      const grd = ctx.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, 'rgba(52,211,153,0.3)');
      grd.addColorStop(0.5, 'rgba(52,211,153,0.9)');
      grd.addColorStop(1, 'rgba(52,211,153,0.3)');
      ctx.strokeStyle = grd;

      for (let i = 0; i <= renderRate; i++) {
        const t = (i / renderRate) * duration;
        const x_coord = (i / renderRate) * w;
        const y_val = 0.28 * Math.sin(2*Math.PI*f1*t + heroPhase)
                    + 0.15 * Math.sin(2*Math.PI*f2*t + heroPhase*1.3)
                    + 0.08 * Math.sin(2*Math.PI*f3*t + heroPhase*0.7);
        const y_coord = h/2 - y_val * h * 0.7;
        i === 0 ? ctx.moveTo(x_coord, y_coord) : ctx.lineTo(x_coord, y_coord);
      }
      ctx.stroke();

      // Draw sampling impulses
      const numSamples = Math.floor(duration * fs);
      for (let k = 0; k <= numSamples; k++) {
        const t = k / fs;
        const x_coord = (t / duration) * w;
        const y_val = 0.28 * Math.sin(2*Math.PI*f1*t + heroPhase)
                    + 0.15 * Math.sin(2*Math.PI*f2*t + heroPhase*1.3)
                    + 0.08 * Math.sin(2*Math.PI*f3*t + heroPhase*0.7);
        const y_coord = h/2 - y_val * h * 0.7;

        // Stem
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(251,191,36,0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.moveTo(x_coord, h/2);
        ctx.lineTo(x_coord, y_coord);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dot
        ctx.beginPath();
        ctx.fillStyle = '#FBBF24';
        ctx.arc(x_coord, y_coord, 3.5, 0, Math.PI*2);
        ctx.fill();

        // Glow
        const glow = ctx.createRadialGradient(x_coord, y_coord, 0, x_coord, y_coord, 10);
        glow.addColorStop(0, 'rgba(251,191,36,0.4)');
        glow.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = glow;
        ctx.arc(x_coord, y_coord, 10, 0, Math.PI*2);
        ctx.fill();
      }

      // Nyquist line
      const nyqX = (0.5 / duration) * w; // half-duration
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(253,230,138,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.moveTo(0, h * 0.06);
      ctx.lineTo(w, h * 0.06);
      ctx.stroke();
      ctx.setLineDash([]);

      heroPhase += 0.018;
      heroAnimId = requestAnimationFrame(drawFrame);
    }

    drawFrame();
  }

  function stopHeroCanvas() {
    if (heroAnimId) { cancelAnimationFrame(heroAnimId); heroAnimId = null; }
  }

  // ─── Mini Charts (Hero) ──────────────────────────────────────────────────

  function initMiniCharts() {
    const signal = DSP.generateContinuousSignal(5, 1, 0, 1, 800);
    const samples = DSP.sampleSignalAnalytic(5, 1, 0, 14, 1);
    const spectrum = DSP.computeSpectrum(samples.x, 14, 256);

    // Mini 1: Continuous signal
    Plotly.newPlot('mini-chart-1', [{
      x: Array.from(signal.t), y: Array.from(signal.x),
      type: 'scatter', mode: 'lines',
      line: { color: C.signal, width: 1.5 },
      name: 'x(t)', hovertemplate: 't=%{x:.3f}s<br>x=%{y:.3f}<extra></extra>'
    }], layout({
      margin: { l:30,r:8,t:8,b:28 },
      xaxis: { title: 't (s)', showgrid: true },
      yaxis: { title: 'x(t)', showgrid: true },
      showlegend: false
    }), { ...PLOTLY_CONFIG, displayModeBar: false });

    // Mini 2: Sampled signal
    Plotly.newPlot('mini-chart-2', [
      { x: Array.from(signal.t), y: Array.from(signal.x), type: 'scatter', mode: 'lines',
        line: { color: 'rgba(52,211,153,0.3)', width: 1 }, showlegend: false },
      { x: Array.from(samples.t), y: Array.from(samples.x), type: 'scatter', mode: 'markers',
        marker: { color: C.sampled, size: 5, symbol: 'circle' },
        name: 'x[n]', hovertemplate: 'n=%{x:.3f}s<br>x=%{y:.3f}<extra></extra>' }
    ], layout({
      margin: { l:30,r:8,t:8,b:28 },
      xaxis: { title: 't (s)' },
      yaxis: { title: 'x[n]' },
      showlegend: false
    }), { ...PLOTLY_CONFIG, displayModeBar: false });

    // Mini 3: FFT spectrum
    Plotly.newPlot('mini-chart-3', [{
      x: Array.from(spectrum.freqs), y: Array.from(spectrum.magnitude),
      type: 'scatter', mode: 'lines', fill: 'tozeroy',
      fillcolor: 'rgba(0,212,220,0.06)',
      line: { color: C.recon, width: 1.5 },
      name: '|X(f)|', hovertemplate: 'f=%{x:.1f}Hz<br>|X|=%{y:.3f}<extra></extra>'
    }], layout({
      margin: { l:30,r:8,t:8,b:28 },
      xaxis: { title: 'f (Hz)', range: [0, 14] },
      yaxis: { title: '|X(f)|' },
      showlegend: false
    }), { ...PLOTLY_CONFIG, displayModeBar: false });
  }

  // ─── Experiment 1: Continuous Signal ─────────────────────────────────────

  function plotContinuousSignal(divId, freq, amplitude, phase, waveform, duration = 1) {
    const sig = DSP.generateContinuousSignal(freq, amplitude, phase, duration, 2000, waveform);
    const traces = [{
      x: Array.from(sig.t), y: Array.from(sig.x),
      type: 'scatter', mode: 'lines',
      line: { color: C.signal, width: 2 },
      name: 'x(t)',
      hovertemplate: '<b>t</b> = %{x:.4f} s<br><b>x(t)</b> = %{y:.4f}<extra></extra>'
    }];

    // Zero line
    traces.push({
      x: [0, duration], y: [0, 0],
      type: 'scatter', mode: 'lines',
      line: { color: 'rgba(255,255,255,0.08)', width: 1, dash: 'dot' },
      showlegend: false, hoverinfo: 'skip'
    });

    const ly = layout({
      title: { text: `x(t) = ${amplitude}·${waveform}(2π·${freq}·t + ${phase.toFixed(2)})`,
               font: { size: 12, color: '#8899AA' }, x: 0.5 },
      xaxis: { title: 'Time (s)', range: [0, duration] },
      yaxis: { title: 'Amplitude', range: [-amplitude*1.4, amplitude*1.4] },
      showlegend: false
    });

    Plotly.react(divId, traces, ly, PLOTLY_CONFIG);
  }

  // ─── Experiment 2 & 3: Sampling (Above / Below Nyquist) ──────────────────

  function plotSampling(divId, freq, amplitude, fs, duration = 1, waveform = 'sine') {
    const cont = DSP.generateContinuousSignal(freq, amplitude, 0, duration, 2000, waveform);
    const samp = DSP.sampleSignalAnalytic(freq, amplitude, 0, fs, duration, waveform);
    const nyquistFreq = fs / 2;
    const isAliased = freq > nyquistFreq;

    const traces = [
      {
        x: Array.from(cont.t), y: Array.from(cont.x),
        type: 'scatter', mode: 'lines',
        line: { color: isAliased ? 'rgba(52,211,153,0.4)' : C.signal, width: 1.5 },
        name: 'x(t) — continuous',
        hovertemplate: 't=%{x:.4f}s, x=%{y:.4f}<extra>Continuous</extra>'
      },
      // Stem lines (vertical bars at each sample)
      {
        x: samp.t.reduce((a, v) => { a.push(v, v, null); return a; }, []),
        y: samp.x.reduce((a, v, i) => { a.push(0, v, null); return a; }, []),
        type: 'scatter', mode: 'lines',
        line: { color: isAliased ? 'rgba(248,113,113,0.4)' : 'rgba(251,191,36,0.35)', width: 1 },
        showlegend: false, hoverinfo: 'skip'
      },
      {
        x: Array.from(samp.t), y: Array.from(samp.x),
        type: 'scatter', mode: 'markers',
        marker: {
          color: isAliased ? C.aliased : C.sampled,
          size: 7,
          symbol: 'circle',
          line: { color: isAliased ? 'rgba(248,113,113,0.5)' : 'rgba(251,191,36,0.4)', width: 1 }
        },
        name: `x[n] @ fs=${fs}Hz`,
        hovertemplate: 'n=%{x:.3f}s<br>x[n]=%{y:.4f}<extra>Sample</extra>'
      }
    ];

    // If aliased, overlay the apparent aliased signal
    if (isAliased) {
      const aliasedSig = DSP.computeAliasedSignal(freq, fs, amplitude, duration, 2000);
      traces.push({
        x: Array.from(aliasedSig.t), y: Array.from(aliasedSig.x),
        type: 'scatter', mode: 'lines',
        line: { color: C.aliased, width: 2, dash: 'dash' },
        name: `Apparent alias @ ${aliasedSig.aliasedFreq.toFixed(2)}Hz`,
        hovertemplate: 't=%{x:.4f}s, alias=%{y:.4f}<extra>Aliased</extra>'
      });
    }

    const ly = layout({
      xaxis: { title: 'Time (s)', range: [0, duration] },
      yaxis: { title: 'Amplitude', range: [-amplitude*1.5, amplitude*1.5] },
      showlegend: true,
      legend: { x: 0.01, y: 0.99, xanchor: 'left', yanchor: 'top' }
    });

    Plotly.react(divId, traces, ly, PLOTLY_CONFIG);
  }

  // ─── Experiment 4: Spectral Replicas ─────────────────────────────────────

  function plotSpectralReplicas(divId, freqs, amplitudes, fs, numReplicas = 3) {
    // Build multi-tone spectrum
    const tones = freqs.map((f, i) => ({ freq: f, amplitude: amplitudes[i] || 1 }));
    const sig = DSP.generateMultiToneSignal(tones, 1, 2048);
    const spectrum = DSP.computeSpectrum(sig.x, fs, 2048);
    const replicas = DSP.computeSpectralReplicas(spectrum, fs, numReplicas);

    const traces = [];
    const colors = C.replica;

    replicas.forEach((rep, idx) => {
      const alpha = rep.isBase ? 1 : Math.max(0.2, 1 - Math.abs(rep.k) * 0.22);
      const color = colors[Math.abs(rep.k) % colors.length];
      const lineColor = rep.isBase ? C.recon : color;
      traces.push({
        x: Array.from(rep.freqs),
        y: Array.from(rep.magnitude),
        type: 'scatter', mode: 'lines',
        fill: 'tozeroy',
        fillcolor: rep.isBase
          ? 'rgba(34,211,238,0.08)'
          : `rgba(${Math.abs(rep.k) % 2 === 0 ? '130,80,255' : '248,113,113'},0.04)`,
        line: { color: lineColor, width: rep.isBase ? 2 : 1.2, dash: rep.isBase ? 'solid' : 'dot' },
        name: rep.k === 0 ? 'Baseband (k=0)' : `Replica k=${rep.k}`,
        opacity: alpha,
        hovertemplate: `f=%{x:.2f}Hz<br>|X|=%{y:.4f}<extra>k=${rep.k}</extra>`
      });
    });

    // Nyquist boundary lines
    const maxMag = Math.max(...Array.from(spectrum.magnitude));
    traces.push({
      x: [fs/2, fs/2], y: [0, maxMag * 1.4],
      type: 'scatter', mode: 'lines',
      line: { color: 'rgba(253,230,138,0.5)', width: 1.5, dash: 'dash' },
      name: `fN = ${(fs/2).toFixed(1)} Hz`,
      hovertemplate: `Nyquist @ ${(fs/2).toFixed(1)}Hz<extra></extra>`
    });
    traces.push({
      x: [-fs/2, -fs/2], y: [0, maxMag * 1.4],
      type: 'scatter', mode: 'lines',
      line: { color: 'rgba(253,230,138,0.5)', width: 1.5, dash: 'dash' },
      showlegend: false, hoverinfo: 'skip'
    });

    const fRange = fs * (numReplicas + 0.6);
    const ly = layout({
      xaxis: { title: 'Frequency (Hz)', range: [-fRange, fRange] },
      yaxis: { title: 'Magnitude', rangemode: 'nonnegative' },
      showlegend: true,
      legend: { x: 0.01, y: 0.99, xanchor: 'left', yanchor: 'top' }
    });

    Plotly.react(divId, traces, ly, PLOTLY_CONFIG);
  }

  // ─── Experiment 5: Sinc Reconstruction ───────────────────────────────────

  function plotReconstruction(origDivId, reconDivId, freq, amplitude, fs, duration = 1, numLobes = 8) {
    const cont = DSP.generateContinuousSignal(freq, amplitude, 0, duration, 1500);
    const samp = DSP.sampleSignalAnalytic(freq, amplitude, 0, fs, duration);
    const recon = DSP.sincReconstructFast(samp, fs, duration, 1500, numLobes);

    // Evaluate original at reconstruction time points
    const origAtRecon = new Float64Array(recon.t.length);
    const dt = cont.t[1] - cont.t[0];
    for (let i = 0; i < recon.t.length; i++) {
      const idx = Math.min(Math.round(recon.t[i] / dt), cont.x.length - 1);
      origAtRecon[i] = cont.x[idx];
    }

    const rmse = DSP.computeRMSE(origAtRecon, recon.x);
    const snr  = DSP.computeSNR(origAtRecon, recon.x);
    const rms  = DSP.computeRMS(cont.x);
    const fidelity = Math.max(0, Math.min(100, 100 * (1 - rmse / (rms + 1e-10))));

    // Error signal
    const error = new Float64Array(recon.t.length);
    for (let i = 0; i < recon.t.length; i++) error[i] = origAtRecon[i] - recon.x[i];

    // Original chart
    Plotly.react(origDivId, [
      { x: Array.from(cont.t), y: Array.from(cont.x), type: 'scatter', mode: 'lines',
        line: { color: C.signal, width: 2 }, name: 'Original x(t)',
        hovertemplate: 't=%{x:.4f}s<br>x=%{y:.4f}<extra>Original</extra>' },
      { x: Array.from(samp.t), y: Array.from(samp.x), type: 'scatter', mode: 'markers',
        marker: { color: C.sampled, size: 7 }, name: `Samples @${fs}Hz`,
        hovertemplate: 't=%{x:.3f}s<br>x[n]=%{y:.4f}<extra>Sample</extra>' }
    ], layout({
      xaxis: { title: 'Time (s)', range: [0, duration] },
      yaxis: { title: 'Amplitude' },
      showlegend: true, legend: { x: 0.01, y: 0.99, xanchor:'left', yanchor:'top' }
    }), PLOTLY_CONFIG);

    // Reconstructed chart
    Plotly.react(reconDivId, [
      { x: Array.from(cont.t), y: Array.from(cont.x), type: 'scatter', mode: 'lines',
        line: { color: 'rgba(52,211,153,0.25)', width: 1.5 }, name: 'Original (ref)',
        hovertemplate: 't=%{x:.4f}s<br>x=%{y:.4f}<extra>Original</extra>' },
      { x: Array.from(recon.t), y: Array.from(recon.x), type: 'scatter', mode: 'lines',
        line: { color: C.recon, width: 2.5 }, name: 'Reconstructed x̂(t)',
        hovertemplate: 't=%{x:.4f}s<br>x̂=%{y:.4f}<extra>Reconstructed</extra>' },
      { x: Array.from(recon.t), y: Array.from(error), type: 'scatter', mode: 'lines',
        line: { color: C.error, width: 1, dash: 'dot' }, name: 'Error e(t)',
        hovertemplate: 't=%{x:.4f}s<br>e=%{y:.4f}<extra>Error</extra>',
        yaxis: 'y2' }
    ], layout({
      xaxis: { title: 'Time (s)', range: [0, duration] },
      yaxis: { title: 'Amplitude' },
      yaxis2: { title: 'Error', overlaying: 'y', side: 'right',
                tickfont: { color: C.error }, titlefont: { color: C.error },
                showgrid: false },
      showlegend: true, legend: { x: 0.01, y: 0.99, xanchor:'left', yanchor:'top' }
    }), PLOTLY_CONFIG);

    return { rmse, snr, fidelity };
  }

  // ─── Experiment 6: RMSE Sweep ─────────────────────────────────────────────

  function plotRMSESweep(divId, signalFreq, amplitude) {
    const nyquist = 2 * signalFreq;
    const fsMin = 0.5 * signalFreq;
    const fsMax = 8 * signalFreq;

    const sweep = DSP.computeRMSESweep(signalFreq, amplitude, fsMin, fsMax, 80, 1);

    const traces = [
      {
        x: Array.from(sweep.fs).map(f => f / nyquist), // normalized to Nyquist rate
        y: Array.from(sweep.rmse),
        type: 'scatter', mode: 'lines',
        line: { color: C.error, width: 2 },
        name: 'RMSE',
        fill: 'tozeroy', fillcolor: 'rgba(244,114,182,0.05)',
        hovertemplate: 'fs/fN=%{x:.2f}<br>RMSE=%{y:.4f}<extra>RMSE</extra>'
      },
      // Nyquist criterion line
      { x: [1, 1], y: [0, Math.max(...Array.from(sweep.rmse))*1.2],
        type: 'scatter', mode: 'lines',
        line: { color: 'rgba(253,230,138,0.7)', width: 2, dash: 'dash' },
        name: 'Nyquist Rate (fs=2f)',
        hovertemplate: 'Nyquist Rate<extra></extra>' },
      // SNR secondary axis
      {
        x: Array.from(sweep.fs).map(f => f / nyquist),
        y: Array.from(sweep.snr).map(v => Math.max(-40, Math.min(60, v))),
        type: 'scatter', mode: 'lines',
        line: { color: C.signal, width: 1.5, dash: 'dot' },
        name: 'SNR (dB)', yaxis: 'y2',
        hovertemplate: 'fs/fN=%{x:.2f}<br>SNR=%{y:.1f}dB<extra>SNR</extra>'
      }
    ];

    const ly = layout({
      xaxis: { title: 'fs / Nyquist Rate', dtick: 0.5 },
      yaxis: { title: 'RMSE', rangemode: 'nonnegative' },
      yaxis2: { title: 'SNR (dB)', overlaying: 'y', side: 'right',
                tickfont: { color: C.signal }, titlefont: { color: C.signal }, showgrid: false },
      showlegend: true,
      legend: { x: 0.65, y: 0.99, xanchor:'left', yanchor:'top' },
      shapes: [
        { type: 'rect', x0: 0, x1: 1, y0: 0, y1: 10,
          fillcolor: 'rgba(248,113,113,0.04)', line: { width: 0 } }
      ]
    });

    Plotly.react(divId, traces, ly, PLOTLY_CONFIG);
  }

  // ─── Experiment 7: Multi-Tone Aliasing ───────────────────────────────────

  function plotMultiToneAliasing(timeDivId, fftDivId, tones, fs, duration = 1) {
    const toneColors = [C.signal, C.sampled, C.violet, C.error];
    const aliasResults = DSP.computeMultiToneAliasing(tones, fs);

    const timeTraces = [];
    const fftTraces  = [];

    tones.forEach((tone, i) => {
      const sig = DSP.generateContinuousSignal(tone.freq, tone.amplitude || 1, 0, duration, 1500);
      const samp = DSP.sampleSignalAnalytic(tone.freq, tone.amplitude || 1, 0, fs, duration);
      const spectrum = DSP.computeSpectrum(samp.x, fs, 1024);

      timeTraces.push({
        x: Array.from(sig.t), y: Array.from(sig.x),
        type: 'scatter', mode: 'lines',
        line: { color: toneColors[i], width: 1.5 },
        name: `f=${tone.freq}Hz`
      });

      const isAliased = aliasResults[i].isAliased;
      fftTraces.push({
        x: Array.from(spectrum.freqs), y: Array.from(spectrum.magnitude),
        type: 'scatter', mode: 'lines', fill: 'tozeroy',
        fillcolor: `${toneColors[i]}18`,
        line: { color: toneColors[i], width: 2, dash: isAliased ? 'dash' : 'solid' },
        name: isAliased
          ? `f=${tone.freq}Hz → alias ${aliasResults[i].aliasedFreq.toFixed(1)}Hz`
          : `f=${tone.freq}Hz (clean)`
      });
    });

    // Combined signal
    const multiSig = DSP.generateMultiToneSignal(tones, duration, 1500);
    timeTraces.unshift({
      x: Array.from(multiSig.t), y: Array.from(multiSig.x),
      type: 'scatter', mode: 'lines',
      line: { color: 'rgba(255,255,255,0.25)', width: 1 },
      name: 'Combined x(t)', visible: 'legendonly'
    });

    // Nyquist line on FFT
    fftTraces.push({
      x: [fs/2, fs/2], y: [0, 2],
      type: 'scatter', mode: 'lines',
      line: { color: 'rgba(253,230,138,0.6)', width: 1.5, dash: 'dash' },
      name: `fN=${(fs/2).toFixed(1)}Hz`
    });

    Plotly.react(timeDivId, timeTraces, layout({
      xaxis: { title: 'Time (s)', range: [0, duration] },
      yaxis: { title: 'Amplitude' },
      showlegend: true, legend: { x: 0.01, y: 0.99, xanchor:'left', yanchor:'top' }
    }), PLOTLY_CONFIG);

    Plotly.react(fftDivId, fftTraces, layout({
      xaxis: { title: 'Frequency (Hz)', range: [0, fs/2 * 1.1] },
      yaxis: { title: 'Magnitude', rangemode: 'nonnegative' },
      showlegend: true, legend: { x: 0.65, y: 0.99, xanchor:'left', yanchor:'top' }
    }), PLOTLY_CONFIG);

    return aliasResults;
  }

  // ─── Experiment 8: Sampling Rate Comparison ───────────────────────────────

  function plotRateComparison(divIds, freq, amplitude, fsValues, duration = 1) {
    fsValues.forEach((fs, i) => {
      if (!divIds[i]) return;
      const cont = DSP.generateContinuousSignal(freq, amplitude, 0, duration, 1500);
      const samp = DSP.sampleSignalAnalytic(freq, amplitude, 0, fs, duration);
      const nyquistFreq = fs / 2;
      const isAliased = freq > nyquistFreq;

      const traces = [
        { x: Array.from(cont.t), y: Array.from(cont.x), type: 'scatter', mode: 'lines',
          line: { color: 'rgba(52,211,153,0.35)', width: 1.5 }, name: 'x(t)', showlegend: false },
        { x: samp.t.reduce((a,v)=>{a.push(v,v,null);return a;},[]),
          y: samp.x.reduce((a,v)=>{a.push(0,v,null);return a;},[]),
          type: 'scatter', mode: 'lines',
          line: { color: isAliased ? 'rgba(248,113,113,0.35)' : 'rgba(251,191,36,0.35)', width: 1 },
          showlegend: false, hoverinfo: 'skip' },
        { x: Array.from(samp.t), y: Array.from(samp.x), type: 'scatter', mode: 'markers',
          marker: { color: isAliased ? C.aliased : C.sampled, size: 6 },
          name: `fs=${fs}Hz`, showlegend: false }
      ];

      if (isAliased) {
        const ali = DSP.computeAliasedSignal(freq, fs, amplitude, duration, 1500);
        traces.push({ x: Array.from(ali.t), y: Array.from(ali.x), type: 'scatter', mode: 'lines',
          line: { color: C.aliased, width: 2, dash: 'dash' }, name: `alias`, showlegend: false });
      }

      const statusColor = isAliased ? C.aliased : C.sampled;
      const status = isAliased ? 'ALIASING' : freq < nyquistFreq * 0.5 ? 'OVERSAMPLED' : 'NOMINAL';

      Plotly.react(divIds[i], traces, layout({
        title: { text: `fs = ${fs} Hz — <span style="color:${statusColor}">${status}</span>`,
                 font: { size: 11 }, x: 0.5 },
        margin: { l:42, r:12, t:36, b:36 },
        xaxis: { title: 't (s)', range: [0, duration] },
        yaxis: { title: 'Amplitude', range: [-amplitude*1.5, amplitude*1.5] },
        showlegend: false
      }), PLOTLY_CONFIG);
    });
  }

  // ─── Experiment 9: Frequency Folding ─────────────────────────────────────

  let foldingAnimId = null;
  let foldingArrowPos = 0;

  function plotFoldingDiagram(divId, fs, fmax, highlightFreq) {
    const data = DSP.generateFoldingDiagram(fs, fmax);
    const fN = fs / 2;

    const traces = [
      // Folding function
      { x: data.foldPoints.map(p => p.f), y: data.foldPoints.map(p => p.aliased),
        type: 'scatter', mode: 'lines',
        line: { color: C.recon, width: 2.5 },
        name: 'f_alias(f)',
        hovertemplate: 'f=%{x:.2f}Hz<br>f_alias=%{y:.2f}Hz<extra></extra>' },
      // 45-degree reference
      { x: [0, fN], y: [0, fN],
        type: 'scatter', mode: 'lines',
        line: { color: 'rgba(255,255,255,0.1)', width: 1, dash: 'dot' },
        name: 'f = f_alias', showlegend: false },
      // Nyquist boundary
      { x: [fN, fN], y: [0, fN],
        type: 'scatter', mode: 'lines',
        line: { color: 'rgba(253,230,138,0.5)', width: 1.5, dash: 'dash' },
        name: `fN = ${fN.toFixed(1)} Hz` }
    ];

    // Highlight current frequency
    if (highlightFreq !== undefined) {
      const aliasedF = DSP.computeAliasedFrequency(highlightFreq, fs);
      traces.push({
        x: [highlightFreq, highlightFreq, 0],
        y: [0, aliasedF, aliasedF],
        type: 'scatter', mode: 'lines+markers',
        line: { color: C.aliased, width: 2 },
        marker: { color: C.aliased, size: 10, symbol: 'circle' },
        name: `f=${highlightFreq}Hz → ${aliasedF.toFixed(2)}Hz`,
        hovertemplate: '%{y:.2f} Hz<extra>Aliased freq</extra>'
      });

      // Annotation
      traces.push({
        x: [highlightFreq], y: [aliasedF],
        type: 'scatter', mode: 'markers',
        marker: {
          color: C.aliased, size: 14, symbol: 'circle',
          line: { color: 'rgba(248,113,113,0.6)', width: 2 }
        },
        name: '', showlegend: false,
        hovertemplate: `f_alias = ${aliasedF.toFixed(2)} Hz<extra></extra>`
      });
    }

    const ly = layout({
      xaxis: { title: 'Input Frequency f (Hz)', range: [0, fmax], dtick: fN },
      yaxis: { title: 'Aliased Frequency f_alias (Hz)', range: [0, fN * 1.05] },
      showlegend: true,
      legend: { x: 0.01, y: 0.99, xanchor:'left', yanchor:'top' },
      shapes: [
        // Aliasing zone shading
        { type: 'rect', x0: fN, x1: fmax, y0: 0, y1: fN,
          fillcolor: 'rgba(248,113,113,0.04)', line: { width: 0 } }
      ],
      annotations: highlightFreq !== undefined ? [
        { x: highlightFreq, y: 0, xref:'x', yref:'y',
          text: `f = ${highlightFreq} Hz`, showarrow: true,
          arrowhead: 2, arrowcolor: C.aliased,
          font: { color: C.aliased, size: 10 }, ax: 0, ay: 30 }
      ] : []
    });

    Plotly.react(divId, traces, ly, PLOTLY_CONFIG);
  }

  // ─── FFT Spectrum Plot ────────────────────────────────────────────────────

  function plotSpectrum(divId, signal_x, fs, fftSize, label = 'Magnitude Spectrum') {
    const spec = DSP.computeSpectrum(signal_x, fs, fftSize);

    Plotly.react(divId, [
      { x: Array.from(spec.freqs), y: Array.from(spec.magnitude),
        type: 'scatter', mode: 'lines', fill: 'tozeroy',
        fillcolor: 'rgba(34,211,238,0.06)',
        line: { color: C.recon, width: 2 },
        name: '|X(f)|',
        hovertemplate: 'f=%{x:.2f}Hz<br>|X|=%{y:.4f}<extra></extra>' }
    ], layout({
      xaxis: { title: 'Frequency (Hz)', range: [0, fs/2] },
      yaxis: { title: 'Magnitude', rangemode: 'nonnegative' },
      showlegend: false,
      title: { text: label, font: { size: 11, color: '#8899AA' }, x: 0.5 }
    }), PLOTLY_CONFIG);

    return spec;
  }

  // ─── Anti-Aliasing Demo ───────────────────────────────────────────────────

  function plotAntiAliasing(beforeDivId, afterDivId, freq, amplitude, fs, duration = 1) {
    const cont = DSP.generateContinuousSignal(freq, amplitude, 0, duration, 4000);
    const filtered = DSP.applyIdealAntiAliasingFilter(cont, fs, 4000);

    const sampRaw  = DSP.sampleSignal(cont, fs);
    const sampFilt = DSP.sampleSignal(filtered, fs);

    // Before filter
    Plotly.react(beforeDivId, [
      { x: Array.from(cont.t), y: Array.from(cont.x), type: 'scatter', mode: 'lines',
        line: { color: C.signal, width: 1.5 }, name: 'x(t) — raw' },
      { x: Array.from(sampRaw.t), y: Array.from(sampRaw.x), type: 'scatter', mode: 'markers',
        marker: { color: C.aliased, size: 6 }, name: 'Samples (aliased)' }
    ], layout({
      xaxis: { title: 't (s)', range: [0, duration] },
      yaxis: { title: 'Amplitude' },
      showlegend: true, title: { text: 'Without Anti-Aliasing Filter', font:{size:11,color:'#8899AA'}, x:0.5 }
    }), PLOTLY_CONFIG);

    // After filter
    Plotly.react(afterDivId, [
      { x: Array.from(filtered.t), y: Array.from(filtered.x), type: 'scatter', mode: 'lines',
        line: { color: C.recon, width: 1.5 }, name: 'x_filtered(t)' },
      { x: Array.from(sampFilt.t), y: Array.from(sampFilt.x), type: 'scatter', mode: 'markers',
        marker: { color: C.signal, size: 6 }, name: 'Samples (clean)' }
    ], layout({
      xaxis: { title: 't (s)', range: [0, duration] },
      yaxis: { title: 'Amplitude' },
      showlegend: true, title: { text: 'With Ideal Anti-Aliasing Filter', font:{size:11,color:'#8899AA'}, x:0.5 }
    }), PLOTLY_CONFIG);
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    C,
    layout,
    PLOTLY_CONFIG,
    startHeroCanvas,
    stopHeroCanvas,
    initMiniCharts,
    plotContinuousSignal,
    plotSampling,
    plotSpectralReplicas,
    plotReconstruction,
    plotRMSESweep,
    plotMultiToneAliasing,
    plotRateComparison,
    plotFoldingDiagram,
    plotSpectrum,
    plotAntiAliasing
  };

})();

window.Visualizer = Visualizer;
