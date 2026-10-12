/* Synthetic public JS bundle for Phase A OSINT BFF-edge mapping.
 * Placeholders only (example.com). Discovery/documentation — no auth, no tokens reused.
 * Scout: /workspace/ai-security-agent-build/SCOUT-passive-osint-techniques.md §B6
 */
(function () {
  const VITE_API_BASE = "https://api.example.com";
  async function checkStatus() {
    const res = await fetch("/api/v1/status");
    return res.json();
  }
  window.__fixtureLab = { VITE_API_BASE, checkStatus };
})();
