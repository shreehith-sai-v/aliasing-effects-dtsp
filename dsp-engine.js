/**
 * DSP Engine — Sampling Theorem & Aliasing Laboratory
 * Pure mathematics: no DOM, no UI dependencies.
 * All algorithms are numerically precise implementations of DSP theory.
 */

'use strict';

const DSP = (() => {

  // ─── Constants ────────────────────────────────────────────────────────────
  const TWO_PI = 2 * Math.PI;
  const EPSILON = 1e-10;

  // ─── Signal Generation ────────────────────────────────────────────────────

  /**
   * Generate a continuous (high-resolution) signal for display.
   * @param {number} freq - Frequency in Hz
   * @param {number} amplitude - Peak amplitude
   * @param {number} phase - Phase offset in radians
   * @param {number} duration - Duration in seconds
   * @param {number} renderRate - Points per second (for smooth display)
   * @param {string} waveform - 'sine'|'square'|'triangle'|'sawtooth'
   * @returns {{ t: Float64Array, x: Float64Array }}
   */
  function generateContinuousSignal(freq, amplitude = 1, phase = 0, duration = 1, renderRate = 4000, waveform = 'sine') {
    const N = Math.floor(duration * renderRate);
    const t = new Float64Array(N);
    const x = new Float64Array(N);
    const dt = duration / N;

    for (let i = 0; i < N; i++) {
      t[i] = i * dt;
      const arg = TWO_PI * freq * t[i] + phase;
      switch (waveform) {
        case 'square':
          x[i] = amplitude * Math.sign(Math.sin(arg));
          break;
        case 'triangle':
          x[i] = amplitude * (2 / Math.PI) * Math.asin(Math.sin(arg));
          break;
        case 'sawtooth':
          x[i] = amplitude * (2 * ((freq * t[i] + phase / TWO_PI) % 1) - 1);
          break;
        default: // sine
          x[i] = amplitude * Math.sin(arg);
      }
    }
    return { t, x };
  }

  /**
   * Generate a multi-tone continuous signal (sum of sinusoids).
   * @param {Array<{freq, amplitude, phase}>} tones
   * @param {number} duration
   * @param {number} renderRate
   * @returns {{ t: Float64Array, x: Float64Array }}
   */
  function generateMultiToneSignal(tones, duration = 1, renderRate = 4000) {
    const N = Math.floor(duration * renderRate);
    const t = new Float64Array(N);
    const x = new Float64Array(N);
    const dt = duration / N;

    for (let i = 0; i < N; i++) {
      t[i] = i * dt;
      let sum = 0;
      for (const tone of tones) {
        sum += (tone.amplitude || 1) * Math.sin(TWO_PI * (tone.freq || 0) * t[i] + (tone.phase || 0));
      }
      x[i] = sum;
    }
    return { t, x };
  }

  // ─── Sampling ─────────────────────────────────────────────────────────────

  /**
   * Sample a continuous signal at a given sampling frequency.
   * @param {{ t: Float64Array, x: Float64Array }} continuous
   * @param {number} fs - Sampling frequency in Hz
   * @returns {{ t: Float64Array, x: Float64Array, indices: Int32Array }}
   */
  function sampleSignal(continuous, fs) {
    const { t: tc, x: xc } = continuous;
    const duration = tc[tc.length - 1];
    const numSamples = Math.floor(duration * fs) + 1;

    const t = new Float64Array(numSamples);
    const x = new Float64Array(numSamples);
    const indices = new Int32Array(numSamples);
    const dt_cont = tc[1] - tc[0];

    for (let i = 0; i < numSamples; i++) {
      t[i] = i / fs;
      // Find nearest index in continuous signal
      const idx = Math.min(Math.round(t[i] / dt_cont), xc.length - 1);
      x[i] = xc[idx];
      indices[i] = idx;
    }
    return { t, x, indices };
  }

  /**
   * Sample a signal analytically (precise, without needing continuous array).
   * @param {number} freq - Hz
   * @param {number} amplitude
   * @param {number} phase
   * @param {number} fs - Sampling frequency
   * @param {number} duration
   * @param {string} waveform
   * @returns {{ t: Float64Array, x: Float64Array }}
   */
  function sampleSignalAnalytic(freq, amplitude = 1, phase = 0, fs, duration = 1, waveform = 'sine') {
    const N = Math.floor(duration * fs) + 1;
    const t = new Float64Array(N);
    const x = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      t[i] = i / fs;
      const arg = TWO_PI * freq * t[i] + phase;
      switch (waveform) {
        case 'square':   x[i] = amplitude * Math.sign(Math.sin(arg)); break;
        case 'triangle': x[i] = amplitude * (2 / Math.PI) * Math.asin(Math.sin(arg)); break;
        case 'sawtooth': x[i] = amplitude * (2 * ((freq * t[i] + phase / TWO_PI) % 1) - 1); break;
        default:         x[i] = amplitude * Math.sin(arg);
      }
    }
    return { t, x };
  }

  // ─── Aliasing ─────────────────────────────────────────────────────────────

  /**
   * Compute the aliased frequency when signal at `f` Hz is sampled at `fs` Hz.
   * Uses the modulo-based aliasing formula.
   * @param {number} f - True signal frequency (Hz)
   * @param {number} fs - Sampling frequency (Hz)
   * @returns {number} Aliased frequency (Hz), always in [0, fs/2]
   */
  function computeAliasedFrequency(f, fs) {
    if (fs <= 0) return 0;
    // Reduce f modulo fs
    const fMod = ((f % fs) + fs) % fs;
    // Fold into [0, fs/2]
    return fMod > fs / 2 ? fs - fMod : fMod;
  }

  /**
   * Compute frequency folding path — keyframes showing how f folds at fs/2.
   * Returns an array of {f, label} pairs for animation.
   * @param {number} f - Signal frequency
   * @param {number} fs - Sampling frequency
   * @returns {Array<{freq: number, step: string, description: string}>}
   */
  function computeFrequencyFoldingPath(f, fs) {
    const fN = fs / 2; // Nyquist frequency
    const steps = [];

    steps.push({ freq: f, step: 'original', description: `Original: ${f.toFixed(2)} Hz` });

    // How many times does the folding occur?
    let current = f;
    let iteration = 0;
    const maxIter = 20;

    while (current > fN + EPSILON && iteration < maxIter) {
      current = fs - current;
      if (current < 0) current = -current;
      iteration++;
      steps.push({
        freq: current,
        step: `fold_${iteration}`,
        description: `After fold ${iteration}: ${current.toFixed(2)} Hz`
      });
      if (current > fN) {
        current = ((current % fs) + fs) % fs;
        if (current > fN) current = fs - current;
      }
    }

    const aliased = computeAliasedFrequency(f, fs);
    steps.push({ freq: aliased, step: 'aliased', description: `Aliased: ${aliased.toFixed(2)} Hz` });

    return steps;
  }

  /**
   * Compute the apparent aliased waveform — the low-frequency signal that
   * appears when undersampling. This is what the sampler "thinks" it sees.
   * @param {number} f - True frequency
   * @param {number} fs - Sampling frequency
   * @param {number} amplitude
   * @param {number} duration
   * @param {number} renderRate
   * @returns {{ t: Float64Array, x: Float64Array, aliasedFreq: number }}
   */
  function computeAliasedSignal(f, fs, amplitude = 1, duration = 1, renderRate = 4000) {
    const aliasedFreq = computeAliasedFrequency(f, fs);
    const signal = generateContinuousSignal(aliasedFreq, amplitude, 0, duration, renderRate);
    return { ...signal, aliasedFreq };
  }

  // ─── Fast Fourier Transform ───────────────────────────────────────────────

  /**
   * Cooley-Tukey Radix-2 DIT FFT.
   * Input length must be a power of 2 (zero-pad if needed).
   * @param {Float64Array} real - Real part of input
   * @param {Float64Array} imag - Imaginary part (usually zeros)
   * @returns {{ real: Float64Array, imag: Float64Array }}
   */
  function fft(real, imag) {
    const N = real.length;
    const re = new Float64Array(real);
    const im = new Float64Array(imag || new Float64Array(N));

    // Bit-reversal permutation
    let j = 0;
    for (let i = 1; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }

    // FFT butterfly
    for (let len = 2; len <= N; len <<= 1) {
      const ang = -TWO_PI / len;
      const wRe = Math.cos(ang);
      const wIm = Math.sin(ang);
      for (let i = 0; i < N; i += len) {
        let curRe = 1, curIm = 0;
        for (let k = 0; k < len / 2; k++) {
          const uRe = re[i + k];
          const uIm = im[i + k];
          const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
          const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
          re[i + k] = uRe + vRe;
          im[i + k] = uIm + vIm;
          re[i + k + len / 2] = uRe - vRe;
          im[i + k + len / 2] = uIm - vIm;
          const newCurRe = curRe * wRe - curIm * wIm;
          curIm = curRe * wIm + curIm * wRe;
          curRe = newCurRe;
        }
      }
    }
    return { real: re, imag: im };
  }

  /**
   * Next power of 2 >= n
   */
  function nextPow2(n) {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
  }

  /**
   * Compute the one-sided magnitude spectrum of a signal.
   * @param {Float64Array} signal - Time-domain samples
   * @param {number} fs - Sampling frequency (Hz)
   * @param {number} [fftSize] - FFT size (default: next power of 2)
   * @returns {{ freqs: Float64Array, magnitude: Float64Array, phase: Float64Array }}
   */
  function computeSpectrum(signal, fs, fftSize) {
    const N = fftSize || nextPow2(signal.length);
    const padded = new Float64Array(N);
    padded.set(signal.subarray(0, Math.min(signal.length, N)));

    const { real, imag } = fft(padded, new Float64Array(N));

    const half = Math.floor(N / 2) + 1;
    const freqs = new Float64Array(half);
    const magnitude = new Float64Array(half);
    const phase = new Float64Array(half);

    for (let i = 0; i < half; i++) {
      freqs[i] = (i * fs) / N;
      const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / N;
      magnitude[i] = i === 0 ? mag : 2 * mag; // one-sided correction
      phase[i] = Math.atan2(imag[i], real[i]);
    }

    return { freqs, magnitude, phase };
  }

  /**
   * Compute spectral replicas: copies of the spectrum centered at k*fs.
   * @param {{ freqs, magnitude }} spectrum - Base spectrum
   * @param {number} fs - Sampling frequency
   * @param {number} numReplicas - Number of positive replicas (each side)
   * @returns {Array<{ freqs: Float64Array, magnitude: Float64Array, center: number }>}
   */
  function computeSpectralReplicas(spectrum, fs, numReplicas = 3) {
    const replicas = [];
    for (let k = -numReplicas; k <= numReplicas; k++) {
      const center = k * fs;
      const shiftedFreqs = new Float64Array(spectrum.freqs.length);
      for (let i = 0; i < spectrum.freqs.length; i++) {
        shiftedFreqs[i] = spectrum.freqs[i] + center;
      }
      replicas.push({
        freqs: shiftedFreqs,
        magnitude: spectrum.magnitude,
        center,
        k,
        isBase: k === 0
      });
    }
    return replicas;
  }

  /**
   * Detect spectral overlap — does the baseband replica overlap with adjacent ones?
   * @param {number} fmax - Maximum frequency in signal
   * @param {number} fs - Sampling frequency
   * @returns {{ overlap: boolean, overlapAmount: number, nyquistFreq: number }}
   */
  function detectSpectralOverlap(fmax, fs) {
    const nyquistFreq = fs / 2;
    const overlap = fmax > nyquistFreq;
    const overlapAmount = overlap ? fmax - nyquistFreq : 0;
    return { overlap, overlapAmount, nyquistFreq };
  }

  // ─── Sinc Reconstruction ─────────────────────────────────────────────────

  /**
   * Whittaker-Shannon sinc interpolation (ideal reconstruction).
   * Reconstructs the continuous signal from samples.
   * @param {{ t: Float64Array, x: Float64Array }} samples - Discrete samples
   * @param {number} fs - Sampling frequency
   * @param {number} duration - Reconstruction duration
   * @param {number} renderRate - Output sample rate for display
   * @returns {{ t: Float64Array, x: Float64Array }}
   */
  function sincReconstruct(samples, fs, duration, renderRate = 2000) {
    const { t: ts, x: xs } = samples;
    const N_out = Math.floor(duration * renderRate);
    const t_out = new Float64Array(N_out);
    const x_out = new Float64Array(N_out);
    const dt = duration / N_out;

    for (let i = 0; i < N_out; i++) {
      t_out[i] = i * dt;
      let sum = 0;
      for (let k = 0; k < xs.length; k++) {
        const arg = Math.PI * (t_out[i] * fs - k);
        const sincVal = Math.abs(arg) < EPSILON ? 1 : Math.sin(arg) / arg;
        sum += xs[k] * sincVal;
      }
      x_out[i] = sum;
    }
    return { t: t_out, x: x_out };
  }

  /**
   * Fast sinc reconstruction using truncated sinc (limited lobes).
   * Significantly faster than full reconstruction.
   * @param {{ t: Float64Array, x: Float64Array }} samples
   * @param {number} fs
   * @param {number} duration
   * @param {number} renderRate
   * @param {number} numLobes - Number of sinc lobes each side (default 8)
   */
  function sincReconstructFast(samples, fs, duration, renderRate = 2000, numLobes = 8) {
    const { t: ts, x: xs } = samples;
    const N_out = Math.floor(duration * renderRate);
    const t_out = new Float64Array(N_out);
    const x_out = new Float64Array(N_out);
    const dt = duration / N_out;
    const Ts = 1 / fs;

    for (let i = 0; i < N_out; i++) {
      t_out[i] = i * dt;
      let sum = 0;
      const n_center = t_out[i] / Ts;
      const n_start = Math.max(0, Math.floor(n_center) - numLobes);
      const n_end = Math.min(xs.length - 1, Math.ceil(n_center) + numLobes);

      for (let k = n_start; k <= n_end; k++) {
        const arg = Math.PI * (t_out[i] * fs - k);
        const sincVal = Math.abs(arg) < EPSILON ? 1 : Math.sin(arg) / arg;
        sum += xs[k] * sincVal;
      }
      x_out[i] = sum;
    }
    return { t: t_out, x: x_out };
  }

  // ─── Error Metrics ────────────────────────────────────────────────────────

  /**
   * Compute Root Mean Square Error between original and reconstructed signals.
   * Signals must be evaluated at the same time points.
   * @param {Float64Array} original
   * @param {Float64Array} reconstructed
   * @returns {number} RMSE value
   */
  function computeRMSE(original, reconstructed) {
    const N = Math.min(original.length, reconstructed.length);
    if (N === 0) return 0;
    let sumSq = 0;
    for (let i = 0; i < N; i++) {
      const diff = original[i] - reconstructed[i];
      sumSq += diff * diff;
    }
    return Math.sqrt(sumSq / N);
  }

  /**
   * Compute signal power (RMS).
   */
  function computeRMS(signal) {
    const N = signal.length;
    if (N === 0) return 0;
    let sumSq = 0;
    for (let i = 0; i < N; i++) sumSq += signal[i] * signal[i];
    return Math.sqrt(sumSq / N);
  }

  /**
   * Signal-to-Noise Ratio in dB.
   * @param {Float64Array} original
   * @param {Float64Array} reconstructed
   * @returns {number} SNR in dB
   */
  function computeSNR(original, reconstructed) {
    const N = Math.min(original.length, reconstructed.length);
    let signalPow = 0, noisePow = 0;
    for (let i = 0; i < N; i++) {
      signalPow += original[i] * original[i];
      const err = original[i] - reconstructed[i];
      noisePow += err * err;
    }
    if (noisePow < EPSILON) return Infinity;
    return 10 * Math.log10(signalPow / noisePow);
  }

  /**
   * Compute RMSE sweep across a range of sampling frequencies.
   * @param {number} signalFreq - Signal frequency (Hz)
   * @param {number} amplitude
   * @param {number} fsMin - Minimum sampling frequency
   * @param {number} fsMax - Maximum sampling frequency
   * @param {number} steps - Number of fs values to evaluate
   * @param {number} duration
   * @returns {{ fs: Float64Array, rmse: Float64Array, snr: Float64Array }}
   */
  function computeRMSESweep(signalFreq, amplitude = 1, fsMin, fsMax, steps = 100, duration = 1) {
    const fsArr = new Float64Array(steps);
    const rmseArr = new Float64Array(steps);
    const snrArr = new Float64Array(steps);
    const renderRate = 2000;

    // Original continuous signal for reference
    const original = generateContinuousSignal(signalFreq, amplitude, 0, duration, renderRate);

    for (let i = 0; i < steps; i++) {
      const fs = fsMin + (i / (steps - 1)) * (fsMax - fsMin);
      fsArr[i] = fs;

      if (fs < 2) {
        rmseArr[i] = amplitude * Math.SQRT2;
        snrArr[i] = -20;
        continue;
      }

      const samples = sampleSignalAnalytic(signalFreq, amplitude, 0, fs, duration);
      const reconstructed = sincReconstructFast(samples, fs, duration, renderRate, 6);

      // Evaluate original at same time points as reconstruction
      const origAtOut = new Float64Array(reconstructed.t.length);
      const dt_cont = original.t[1] - original.t[0];
      for (let j = 0; j < reconstructed.t.length; j++) {
        const idx = Math.min(Math.round(reconstructed.t[j] / dt_cont), original.x.length - 1);
        origAtOut[j] = original.x[idx];
      }

      rmseArr[i] = computeRMSE(origAtOut, reconstructed.x);
      snrArr[i] = computeSNR(origAtOut, reconstructed.x);
    }

    return { fs: fsArr, rmse: rmseArr, snr: snrArr };
  }

  // ─── Diagnostic Computations ─────────────────────────────────────────────

  /**
   * Compute all Nyquist-related diagnostics for a signal/sampling pair.
   * @param {number} signalFreq - Hz
   * @param {number} fs - Hz
   * @returns {Object} Complete diagnostics object
   */
  function computeDiagnostics(signalFreq, fs) {
    const nyquistRate = 2 * signalFreq;     // Minimum fs required
    const nyquistFreq = fs / 2;              // Maximum representable freq
    const aliasedFreq = computeAliasedFrequency(signalFreq, fs);
    const oversampling = fs / nyquistRate;
    const { overlap, overlapAmount } = detectSpectralOverlap(signalFreq, fs);
    const isAliased = signalFreq > nyquistFreq;
    const samplingEfficiency = Math.min(1, nyquistFreq / signalFreq);

    return {
      signalFreq,
      fs,
      nyquistRate,
      nyquistFreq,
      aliasedFreq,
      oversampling,
      overlap,
      overlapAmount,
      isAliased,
      samplingEfficiency,
      period: 1 / signalFreq,
      samplingPeriod: 1 / fs,
      status: isAliased ? 'ALIASING' : oversampling >= 2 ? 'NOMINAL' : 'CRITICAL'
    };
  }

  /**
   * Compute where a multi-tone signal aliases to.
   * @param {Array<{freq, amplitude}>} tones
   * @param {number} fs
   * @returns {Array<{originalFreq, aliasedFreq, amplitude, isAliased}>}
   */
  function computeMultiToneAliasing(tones, fs) {
    return tones.map(tone => {
      const aliasedFreq = computeAliasedFrequency(tone.freq, fs);
      const nyquistFreq = fs / 2;
      return {
        originalFreq: tone.freq,
        aliasedFreq,
        amplitude: tone.amplitude || 1,
        isAliased: tone.freq > nyquistFreq,
        difference: Math.abs(tone.freq - aliasedFreq)
      };
    });
  }

  /**
   * Generate data for the frequency folding diagram.
   * @param {number} fs
   * @param {number} fmax - Maximum frequency to show
   * @returns {{ foldPoints: Array, nyquistFreq: number }}
   */
  function generateFoldingDiagram(fs, fmax) {
    const fN = fs / 2;
    const foldPoints = [];

    for (let f = 0; f <= fmax; f += 0.1) {
      const aliased = computeAliasedFrequency(f, fs);
      foldPoints.push({ f, aliased });
    }

    return { foldPoints, nyquistFreq: fN, fs };
  }

  // ─── Anti-Aliasing Filter ─────────────────────────────────────────────────

  /**
   * Apply an ideal (brick-wall) anti-aliasing filter.
   * Removes all frequency components above fs/2.
   * @param {{ t: Float64Array, x: Float64Array }} signal
   * @param {number} fs - Sampling frequency (determines cutoff = fs/2)
   * @param {number} renderRate - Original signal render rate
   * @returns {{ t: Float64Array, x: Float64Array }}
   */
  function applyIdealAntiAliasingFilter(signal, fs, renderRate = 4000) {
    const cutoff = fs / 2;
    const N = nextPow2(signal.x.length);
    const padded = new Float64Array(N);
    padded.set(signal.x);

    const { real, imag } = fft(padded, new Float64Array(N));

    // Zero out frequencies above cutoff
    for (let i = 0; i < N / 2 + 1; i++) {
      const freq = (i * renderRate) / N;
      if (freq > cutoff) {
        real[i] = 0; imag[i] = 0;
        real[N - i] = 0; imag[N - i] = 0;
      }
    }

    // Inverse FFT (conjugate → FFT → conjugate → scale)
    for (let i = 0; i < N; i++) imag[i] = -imag[i];
    const { real: re2, imag: im2 } = fft(real, imag);
    const result = new Float64Array(signal.x.length);
    for (let i = 0; i < signal.x.length; i++) {
      result[i] = re2[i] / N;
    }

    return { t: signal.t, x: result };
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  /**
   * Linearly interpolate a Float64Array signal to a new length.
   */
  function resampleLinear(signal, newLength) {
    const out = new Float64Array(newLength);
    const ratio = (signal.length - 1) / (newLength - 1);
    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio;
      const lo = Math.floor(pos);
      const hi = Math.min(lo + 1, signal.length - 1);
      const t = pos - lo;
      out[i] = signal[lo] * (1 - t) + signal[hi] * t;
    }
    return out;
  }

  /**
   * Format a frequency value with appropriate units.
   */
  function formatFreq(f) {
    if (f >= 1000) return `${(f / 1000).toFixed(2)} kHz`;
    return `${f.toFixed(2)} Hz`;
  }

  /**
   * Format RMSE with scientific notation when small.
   */
  function formatRMSE(r) {
    if (r < 0.001) return r.toExponential(3);
    return r.toFixed(4);
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    generateContinuousSignal,
    generateMultiToneSignal,
    sampleSignal,
    sampleSignalAnalytic,
    computeAliasedFrequency,
    computeFrequencyFoldingPath,
    computeAliasedSignal,
    fft,
    nextPow2,
    computeSpectrum,
    computeSpectralReplicas,
    detectSpectralOverlap,
    sincReconstruct,
    sincReconstructFast,
    computeRMSE,
    computeRMS,
    computeSNR,
    computeRMSESweep,
    computeDiagnostics,
    computeMultiToneAliasing,
    generateFoldingDiagram,
    applyIdealAntiAliasingFilter,
    resampleLinear,
    formatFreq,
    formatRMSE
  };

})();

// Make available globally
window.DSP = DSP;
