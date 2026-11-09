// ブラウザ用の小さなテスト（✓／✗ を一覧に出す）
function runTests(cases, box) {
  box.innerHTML = cases.map(([name, fn]) => { let ok = false, msg = ""; try { ok = fn() === true; if (!ok) msg = "（答えと合いません）"; } catch (e) { msg = "（" + e.message + "）"; }
    return '<li class="' + (ok ? "ok" : "ng") + '">' + (ok ? "✓ " : "✗ ") + name + msg + "</li>"; }).join("");
}
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
