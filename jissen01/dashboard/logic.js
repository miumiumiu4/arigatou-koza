// 数字ダッシュボードの計算（画面とテストの両方から使う）
// 1件 = { date: "2026-10-05", kind: "売上" | "経費", category: "材料費", amount: 12000, memo: "" }
(function (root) {
  const yen = (n) => Math.round(n).toLocaleString("ja-JP") + "円";

  function monthOf(date) {
    return String(date).slice(0, 7); // "2026-10"
  }

  function prevMonth(ym) {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function validate(e) {
    const errs = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) errs.push("日付は 2026-10-05 の形で入れてください");
    if (e.kind !== "売上" && e.kind !== "経費") errs.push("種類は「売上」か「経費」です");
    if (!Number.isFinite(e.amount) || e.amount < 0) errs.push("金額は0以上の数字です");
    if (!String(e.category || "").trim()) errs.push("項目（例：材料費）を入れてください");
    return errs;
  }

  // 1か月の集計
  function summarize(entries, ym) {
    const rows = entries.filter((e) => monthOf(e.date) === ym);
    let sales = 0, cost = 0;
    const byCat = {};
    for (const e of rows) {
      if (e.kind === "売上") sales += e.amount;
      else {
        cost += e.amount;
        byCat[e.category] = (byCat[e.category] || 0) + e.amount;
      }
    }
    const costRank = Object.entries(byCat)
      .map(([category, amount]) => ({ category, amount, share: cost ? amount / cost : 0 }))
      .sort((a, b) => b.amount - a.amount);
    const profit = sales - cost;
    return { ym, count: rows.length, sales, cost, profit, margin: sales ? profit / sales : null, costRank };
  }

  // 月ごとの推移（新しい月が最後）
  function monthly(entries) {
    const months = [...new Set(entries.map((e) => monthOf(e.date)))].sort();
    return months.map((m) => summarize(entries, m));
  }

  // 「次の一手」：決まりごとで出す（外のAIには送らない）
  function nextActions(entries, ym) {
    const cur = summarize(entries, ym);
    const prev = summarize(entries, prevMonth(ym));
    const out = [];
    if (!cur.count) return ["この月の記録がまだありません。まず売上と経費を入れてください。"];
    if (cur.profit < 0) out.push(`赤字です（${yen(cur.profit)}）。経費のいちばん大きい「${cur.costRank[0]?.category}」から見直しましょう。`);
    else if (cur.margin !== null && cur.margin < 0.1) out.push(`利益率が${Math.round(cur.margin * 100)}%と低めです。値付けか、大きい経費を1つ見直しましょう。`);
    const top = cur.costRank[0];
    if (top && top.share >= 0.4) out.push(`経費の${Math.round(top.share * 100)}%が「${top.category}」です。ここを1割減らすと利益が${yen(top.amount * 0.1)}増えます。`);
    if (prev.count) {
      if (prev.sales && cur.sales < prev.sales * 0.9) out.push(`売上が前の月より${Math.round((1 - cur.sales / prev.sales) * 100)}%減りました。前の月によく売れたものを、もう一度案内しましょう。`);
      if (prev.sales && cur.sales > prev.sales * 1.1) out.push(`売上が前の月より${Math.round((cur.sales / prev.sales - 1) * 100)}%増えました。増えた理由を1行メモに残し、来月も同じ手を打ちましょう。`);
      for (const c of cur.costRank) {
        const p = prev.costRank.find((x) => x.category === c.category);
        if (p && c.amount > p.amount * 1.3 && c.amount - p.amount >= 10000) {
          out.push(`「${c.category}」が前の月より${yen(c.amount - p.amount)}増えています。理由を確かめましょう。`);
        }
      }
    }
    if (!out.length) out.push("大きな問題は見当たりません。利益が出ている今のうちに、来月の売上の目標を1つ決めましょう。");
    return out;
  }

  // 貼り付けた表（日付,種類,項目,金額,メモ）を読む。タブ区切りもOK
  function parseCSV(text) {
    const entries = [], errors = [];
    text.split(/\r?\n/).forEach((line, i) => {
      if (!line.trim() || /^日付/.test(line)) return;
      const c = line.split(/\t|,/).map((s) => s.trim());
      const e = { date: c[0].replace(/\//g, "-"), kind: c[1], category: c[2], amount: Number(String(c[3]).replace(/[,円¥]/g, "")), memo: c[4] || "" };
      const errs = validate(e);
      if (errs.length) errors.push(`${i + 1}行目：${errs.join("／")}`);
      else entries.push(e);
    });
    return { entries, errors };
  }

  const api = { monthOf, prevMonth, validate, summarize, monthly, nextActions, parseCSV, yen };
  if (typeof module !== "undefined") module.exports = api;
  else root.Dash = api;
})(this);
