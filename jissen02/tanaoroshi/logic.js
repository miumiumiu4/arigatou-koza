// 時間の棚卸し：仕事｜1回の分数｜週の回数｜任せられ度（◎○△）
(function (root) {
  const RATE = { "◎": 0.8, "○": 0.5, "△": 0 };
  function parse(text) {
    const ok = [], ng = [];
    String(text || "").split(/\r?\n/).forEach((line, i) => {
      const no = i + 1;
      if (!line.trim()) return;
      const c = line.split(/[,\t]/).map(s => s.trim());
      if (no === 1 && c[0] === "仕事") return;
      const [name, min, times, level] = c;
      if (!name) return ng.push({ line: no, why: "仕事の名前がない" });
      const m = Number(min), t = Number(times);
      if (!(m > 0)) return ng.push({ line: no, why: "1回の分数がおかしい" });
      if (!(t > 0)) return ng.push({ line: no, why: "週の回数がおかしい" });
      if (!(level in RATE)) return ng.push({ line: no, why: "任せられ度は ◎ ○ △ のどれか" });
      ok.push({ name, min: m, times: t, level });
    });
    return { ok, ng };
  }
  function analyze(jobs) {
    const rows = jobs.map(j => ({ ...j, week: j.min * j.times, save: Math.round(j.min * j.times * RATE[j.level]) }));
    const total = rows.reduce((a, r) => a + r.week, 0), saved = rows.reduce((a, r) => a + r.save, 0);
    const top3 = rows.filter(r => r.save > 0).sort((a, b) => b.save - a.save || b.week - a.week).slice(0, 3);
    return { rows: rows.sort((a, b) => b.week - a.week), total, saved, top3 };
  }
  const hm = m => (m >= 60 ? Math.floor(m / 60) + "時間" + (m % 60 ? (m % 60) + "分" : "") : m + "分");
  const handoff = r => "「" + r.name + "」を任せたいので、型メーカーの手順で質問して、頼み方1枚にして";
  const api = { parse, analyze, hm, handoff, RATE };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Tana = api;
})(this);
