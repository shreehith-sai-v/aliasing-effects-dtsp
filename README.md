# DSP Sampling & Aliasing Laboratory

A premium, interactive, single-page Discrete-Time Signal Processing (DTSP) engineering laboratory dedicated to demonstrating and analyzing the **Sampling Theorem**, **Nyquist-Shannon Criterion**, **Aliasing**, **Frequency Folding**, and **Signal Reconstruction**.

Built with a futuristic engineering aesthetic (dark mode, glassmorphism) and publication-quality, GPU-accelerated interactive Plotly charts, the application functions entirely as a zero-dependency client-side experience.

---

## Key DSP Implementations (`dsp-engine.js`)
All mathematical operations are implemented from first principles in pure JavaScript using typed arrays (`Float64Array`) for optimal numerical performance:
*   **FFT Engine**: Cooley-Tukey Radix-2 Decimation-in-Time (DIT) Fast Fourier Transform.
*   **Ideal Reconstruction**: Whittaker-Shannon Sinc Interpolation:
    $$\hat{x}(t) = \sum_{n=-\infty}^{\infty} x[n] \text{sinc}\left(\frac{t - n T_s}{T_s}\right)$$
*   **Aliasing Formula**: Modulo-based calculation of apparent frequency:
    $$f_{\text{alias}} = \left| \left( \left( f + \frac{f_s}{2} \right) \bmod f_s \right) - \frac{f_s}{2} \right|$$
*   **Anti-Aliasing Filter**: Ideal brick-wall low-pass filter operating in the frequency domain via forward FFT, zeroing bins above $f_s/2$, and reconstructing via Inverse FFT (IFFT).

---

## 10 Interactive Experiments

1.  **Continuous Signal Generation**: Adjust amplitude, frequency ($1 - 50\text{ Hz}$), phase, and waveform type (Sine, Square, Triangle, Sawtooth).
2.  **Sampling Above Nyquist ($f_s \ge 2f$)**: Shows impulse sampling stems matching the continuous signal. Green markers indicate Nyquist criterion is fully satisfied.
3.  **Sampling Below Nyquist (Aliasing)**: Demonstrates the aliased waveform overlaid on the original high-frequency wave, along with the spectrum showing spectral leakage.
4.  **Spectral Replicas**: Visualizes the periodic copies of the baseband spectrum centered at $k \cdot f_s$ and highlights Nyquist boundaries.
5.  **Sinc Reconstruction**: Computes the reconstructed wave from discrete samples in real time. Displays side-by-side reconstruction error $e(t) = x(t) - \hat{x}(t)$, RMS Error (RMSE), and Signal-to-Noise Ratio (SNR).
6.  **Reconstruction Error Sweep**: Maps the RMSE and SNR curves as $f_s$ sweeps from $0.5f$ to $8f$, showing the sharp transition at $f_s = 2f$ (the Nyquist limit).
7.  **Multi-Tone Aliasing**: Analyzes how a complex signal with 3 adjustable frequency components behaves under a single sampling rate.
8.  **Sampling Rate Comparison**: A side-by-side dashboard comparing three different sampling rates (A, B, C) applied to the same input signal.
9.  **Frequency Folding Analysis**: An animated folding diagram mapping $f_{\text{alias}}$ vs. input frequency. Shows the live step-by-step path as a frequency folds past boundaries.
10. **Anti-Aliasing Filter**: A side-by-side comparison showing how an ideal low-pass filter with $f_c = f_s / 2$ applied *before* sampling successfully prevents aliasing.

---

## Navigation & Keyboard Shortcuts

Press the corresponding number keys on your keyboard to instantly jump to sections:
*   `1` — Continuous Signal Generation
*   `2` — Sampling Above Nyquist
*   `3` — Sampling Below Nyquist
*   `4` — Spectral Replicas
*   `5` — Sinc Reconstruction
*   `6` — Error Sweep
*   `7` — Multi-Tone Aliasing
*   `8` — Rate Comparison
*   `9` — Frequency Folding
*   `0` — Anti-Aliasing Filter

---

## Running Locally

### Option 1: Direct File Launch
Double-click `index.html` to run the application directly in any browser via the `file://` protocol. No build step or installation required.

### Option 2: Local Node.js Server
For a cleaner browser environment (resolving potential local asset policies), start the included lightweight server:
```bash
node -e "const http = require('http'), fs = require('fs'), path = require('path'); http.createServer((req, res) => { let p = path.join('.', req.url === '/' ? 'index.html' : req.url); fs.readFile(p, (err, data) => { if (err) { res.statusCode = 404; res.end('Not Found'); } else { let ext = path.extname(p); res.writeHead(200, {'Content-Type': ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'text/html'}); res.end(data); } }); }).listen(8080); console.log('Running at http://localhost:8080/');"
```
Then open `http://localhost:8080/` in your browser.

---

## File Structure
```
d:/MCS Project/
├── index.html          # Main layout, sidebar navigation, and container cards
├── style.css           # Glassmorphism dark theme styles, animations, responsive grid
├── dsp-engine.js       # Core mathematical algorithms (FFT, sinc, aliasing, AA filter)
├── visualizer.js       # Plotly chart configurations, custom theming, and drawing logic
├── experiments.js      # Slider event bindings, UI status managers, and rendering loops
└── app.js              # Routing, intersection observer, and animation bootstrapper
```
