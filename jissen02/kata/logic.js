// 型メーカーの「型の棚」：頼み方1枚（名前／目的／材料／手順／出来上がりの形／チェック項目／使う場面）
(function (root) {
  const KEYS = ["名前", "目的", "材料", "手順", "出来上がりの形", "チェック項目", "使う場面"];
  const NEED = KEYS.slice(0, 6);
  function parseOne(text) {
    const card = {}; let cur = null;
    String(text || "").split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*(名前|目的|材料|手順|出来上がりの形|チェック項目|使う場面)\s*[：:]\s*(.*)$/);
      if (m) { cur = m[1]; card[cur] = m[2].trim(); }
      else if (cur && line.trim()) card[cur] = (card[cur] ? card[cur] + "\n" : "") + line.trim();
    });
    return card;
  }
  const parseMany = text => String(text || "").split(/^\s*-{3,}\s*$/m).map(parseOne).filter(c => Object.keys(c).length);
  const missing = card => NEED.filter(k => !String(card[k] || "").trim());
  function search(cards, word) {
    const w = String(word || "").trim().toLowerCase(); if (!w) return cards;
    return cards.filter(c => KEYS.some(k => String(c[k] || "").toLowerCase().includes(w)));
  }
  const copyText = c => "次の頼み方で、この仕事をお願いします。\n" + KEYS.filter(k => c[k]).map(k => "【" + k + "】" + c[k]).join("\n");
  const api = { parseOne, parseMany, missing, search, copyText, KEYS, NEED };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Kata = api;
})(this);
