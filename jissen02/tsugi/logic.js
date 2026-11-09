// 数字の次の一手：数字の名前｜先週｜今週｜向き（増えるとよい／減るとよい）
(function (root) {
  const yen = n => n.toLocaleString("ja-JP");
  function parse(text) {
    const ok = [], ng = [];
    String(text || "").split(/\r?\n/).forEach((line, i) => {
      const no = i + 1; if (!line.trim()) return;
      const c = line.split(/[,\t]/).map(s => s.trim());
      if (no === 1 && c[0] === "数字の名前") return;
      const [name, a, b, dir] = c;
      if (!name) return ng.push({ line: no, why: "名前がない" });
      if (a === "" || a === undefined || isNaN(+a) || b === "" || b === undefined || isNaN(+b)) return ng.push({ line: no, why: "数字がおかしい" });
      if (dir !== "増えるとよい" && dir !== "減るとよい") return ng.push({ line: no, why: "向きは「増えるとよい」か「減るとよい」" });
      ok.push({ name, last: +a, now: +b, good: dir === "増えるとよい" ? 1 : -1 });
    });
    if (ok.length > 3) return { ok: ok.slice(0, 3), ng: ng.concat([{ line: 0, why: "数字は3つまで（4つ目からは使わない）" }]) };
    return { ok, ng };
  }
  function compare(items) {
    return items.map(it => {
      const pct = it.last === 0 ? null : Math.round((it.now - it.last) / it.last * 100);
      const sign = pct === null ? "" : pct > 0 ? "+" + pct + "%" : pct < 0 ? "−" + Math.abs(pct) + "%" : "±0%";
      const line = it.name + "：" + yen(it.last) + " → " + yen(it.now) + "（" + (pct === null ? "先週が0なので割合は出せません" : sign) + "）";
      const score = pct === null ? 0 : pct * it.good; // ＋なら良くなった
      return { ...it, pct, line, score };
    });
  }
  function nextActions(items) {
    const c = compare(items), out = [];
    c.filter(x => x.score <= -10).sort((a, b) => a.score - b.score).forEach(x => out.push({ what: "「" + x.name + "」が" + Math.abs(x.pct) + "%悪くなりました。理由を1つ書き出して、手を1つ打つ", when: "月曜", check: "来週の" + x.name }));
    c.filter(x => x.score >= 10).sort((a, b) => b.score - a.score).forEach(x => out.push({ what: "「" + x.name + "」が" + Math.abs(x.pct) + "%良くなりました。効いたことを1つ書き出して続ける", when: "毎日", check: "来週の" + x.name }));
    while (out.length < 3) out.push({ what: "来週の目標を1つ決める", when: "月曜の朝", check: "いちばん大事な数字" });
    return out.slice(0, 3).map(a => ({ who: "自分", ...a }));
  }
  const api = { parse, compare, nextActions };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Tsugi = api;
})(this);
