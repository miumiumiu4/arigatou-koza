// 発信の1週間まとめ書き：曜日｜場所｜本文｜タグ｜写真案
(function (root) {
  const DAYS = ["月", "火", "水", "木", "金", "土", "日"];
  const LIMIT = { Instagram: 2200, X: 140, LINE: 500, お知らせ: 0 }; // 0＝上限なし
  const TAG_MAX = 10;
  const len = s => Array.from(String(s || "")).length;
  function parse(text) {
    const ok = [], ng = [];
    String(text || "").split(/\r?\n/).forEach((line, i) => {
      const no = i + 1; if (!line.trim()) return;
      const c = line.split(/[|｜]/).map(s => s.trim());
      if (no === 1 && c[0] === "曜日") return;
      const [day, place, body, tags = "", photo = ""] = c;
      if (DAYS.indexOf(day) < 0) return ng.push({ line: no, why: "曜日は 月〜日 の1文字" });
      if (!(place in LIMIT)) return ng.push({ line: no, why: "場所は Instagram・X・LINE・お知らせ のどれか" });
      if (!body) return ng.push({ line: no, why: "本文がない" });
      ok.push({ day, place, body, tags: tags.split(/\s+/).filter(t => t.startsWith("#")), photo });
    });
    ok.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
    return { ok, ng };
  }
  function check(p) {
    const warn = [], n = len(p.body) + (p.place === "X" && p.tags.length ? len(" " + p.tags.join(" ")) : 0), lim = LIMIT[p.place];
    if (lim && n > lim) warn.push(p.place + "は" + lim + "字まで。" + (n - lim) + "字オーバー");
    if (p.tags.length > TAG_MAX) warn.push("タグが" + p.tags.length + "個。多すぎ（目安" + TAG_MAX + "個）");
    return { chars: n, warn };
  }
  const copyText = p => p.body + (p.tags.length ? "\n\n" + p.tags.join(" ") : "");
  const api = { parse, check, copyText, len, DAYS, LIMIT };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Hasshin = api;
})(this);
