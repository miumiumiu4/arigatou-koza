// 請求書の計算と管理（画面とテストの両方から使う）
// 請求書 = { no, client, issueDate, dueDate, items:[{name, qty, price, rate}], paidDate, memo }
// rate は 10 か 8（%）。消費税は「1枚の請求書につき、税率ごとに1回」端数を切り捨てる（インボイスのきまり）
(function (root) {
  const yen = (n) => "¥" + Math.round(n).toLocaleString("ja-JP");

  function lineAmount(it) {
    return Math.round(Number(it.qty) * Number(it.price));
  }

  function validate(inv) {
    const errs = [];
    if (!String(inv.client || "").trim()) errs.push("取引先を入れてください");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inv.issueDate || "")) errs.push("発行日を入れてください");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inv.dueDate || "")) errs.push("支払期限を入れてください");
    if (inv.issueDate && inv.dueDate && inv.dueDate < inv.issueDate) errs.push("支払期限が発行日より前です");
    const items = (inv.items || []).filter((it) => String(it.name || "").trim());
    if (!items.length) errs.push("品目を1つ以上入れてください");
    items.forEach((it, i) => {
      if (!(Number(it.qty) > 0)) errs.push(`${i + 1}行目：数量は0より大きい数字です`);
      if (!(Number(it.price) >= 0)) errs.push(`${i + 1}行目：単価は0以上の数字です`);
      if (![10, 8].includes(Number(it.rate))) errs.push(`${i + 1}行目：税率は10か8です`);
    });
    return errs;
  }

  function totals(inv) {
    const byRate = {};
    for (const it of inv.items || []) {
      if (!String(it.name || "").trim()) continue;
      const r = Number(it.rate);
      byRate[r] = byRate[r] || { rate: r, subtotal: 0, tax: 0 };
      byRate[r].subtotal += lineAmount(it);
    }
    const rates = Object.values(byRate).sort((a, b) => b.rate - a.rate);
    for (const g of rates) g.tax = Math.floor((g.subtotal * g.rate) / 100);
    const subtotal = rates.reduce((s, g) => s + g.subtotal, 0);
    const tax = rates.reduce((s, g) => s + g.tax, 0);
    return { rates, subtotal, tax, total: subtotal + tax };
  }

  // 請求書番号：発行月ごとに 001 から
  function nextNo(invoices, issueDate) {
    const ym = issueDate.slice(0, 7).replace("-", "");
    const used = invoices.map((v) => v.no).filter((n) => n && n.startsWith(`INV-${ym}-`)).map((n) => Number(n.slice(-3)));
    return `INV-${ym}-${String((used.length ? Math.max(...used) : 0) + 1).padStart(3, "0")}`;
  }

  function status(inv, today) {
    if (inv.paidDate) return "入金済み";
    if (inv.dueDate < today) return "期限切れ";
    return "未入金";
  }

  // 一覧の集計（未入金・期限切れの合計）
  function summary(invoices, today) {
    const s = { count: invoices.length, billed: 0, paid: 0, unpaid: 0, overdue: 0, overdueList: [] };
    for (const v of invoices) {
      const t = totals(v).total;
      s.billed += t;
      const st = status(v, today);
      if (st === "入金済み") s.paid += t;
      else {
        s.unpaid += t;
        if (st === "期限切れ") { s.overdue += t; s.overdueList.push(v.no); }
      }
    }
    return s;
  }

  // 月末締め・翌月末払いの期限
  function endOfNextMonth(issueDate) {
    const [y, m] = issueDate.split("-").map(Number);
    const d = new Date(Date.UTC(y, m + 1, 0));
    return d.toISOString().slice(0, 10);
  }

  const api = { yen, lineAmount, validate, totals, nextNo, status, summary, endOfNextMonth };
  if (typeof module !== "undefined") module.exports = api;
  else root.Inv = api;
})(this);
