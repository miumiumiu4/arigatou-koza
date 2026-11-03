// 予約・返信の型：問い合わせ文を読み、種類を見分けて、自分の店の情報と型で返信の下書きを作る
// 外のAIには送らない（決まりごとで読む）。読めなかった所は「確かめる質問」を下書きに足す
(function (root) {
  const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

  const KINDS = [
    { kind: "キャンセル", words: ["キャンセル", "取り消し", "取消", "やめ"] },
    { kind: "日程変更", words: ["変更", "ずらし", "別の日", "日にちを変え", "延期"] },
    { kind: "予約", words: ["予約", "お願いしたい", "来てほしい", "来ていただけ", "空いて", "伺って", "頼みたい"] },
    { kind: "料金", words: ["いくら", "料金", "値段", "費用", "見積", "価格"] },
  ];

  function classify(text) {
    for (const k of KINDS) if (k.words.some((w) => text.includes(w))) return k.kind;
    return "その他";
  }

  const z2h = (s) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/：/g, ":").replace(/[－ー―]/g, (c, i, str) => (/\d/.test(str[i - 1] || "") ? "-" : c));

  // 年は「今日から見て次に来るその日」
  function resolveDate(m, d, today) {
    const [ty] = today.split("-").map(Number);
    let y = ty;
    const s = (yy) => `${yy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (s(y) < today) y += 1;
    return s(y);
  }

  function extract(raw, today) {
    const text = z2h(raw);
    const r = { name: "", phone: "", email: "", date: "", time: "", count: "", items: [] };
    let m;
    if ((m = text.match(/([^\s、。,！!？?「」]{1,12}?)と申します/))) r.name = m[1].replace(/^(私は|わたしは|こんにちは)/, "");
    else if ((m = text.match(/^([^\s、。]{1,12}?)です[。、]/))) r.name = m[1];
    if ((m = text.match(/0\d{1,4}-?\d{1,4}-?\d{3,4}/))) r.phone = m[0];
    if ((m = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/))) r.email = m[0];
    if ((m = text.match(/(\d{1,2})月(\d{1,2})日/)) || (m = text.match(/(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/))) {
      const mo = Number(m[1]), d = Number(m[2]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) r.date = resolveDate(mo, d, today);
    }
    if ((m = text.match(/(\d{1,2}):(\d{2})/))) r.time = `${m[1].padStart(2, "0")}:${m[2]}`;
    else if ((m = text.match(/(午前|午後)?\s*(\d{1,2})時(半)?/))) {
      let h = Number(m[2]);
      if (m[1] === "午後" && h < 12) h += 12;
      r.time = `${String(h).padStart(2, "0")}:${m[3] ? "30" : "00"}`;
    } else if (/午前/.test(text)) r.time = "午前";
    else if (/午後/.test(text)) r.time = "午後";
    if ((m = text.match(/(\d+)\s*(台|か所|箇所|部屋|名|人)/))) r.count = m[1] + m[2];
    return r;
  }

  function weekday(date) {
    const [y, mo, d] = date.split("-").map(Number);
    return WEEK[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  }

  const jp = (date) => { const [, mo, d] = date.split("-").map(Number); return `${mo}月${d}日（${weekday(date)}）`; };

  function priceLines(shop, text) {
    const hit = (shop.prices || []).filter((p) => text.includes(p.item));
    return (hit.length ? hit : shop.prices || []).map((p) => `・${p.item}：${Number(p.price).toLocaleString("ja-JP")}円（税込）`);
  }

  const DEFAULT_TEMPLATES = {
    料金: "{あいさつ}\n{店名}です。お問い合わせありがとうございます。\n\n料金は次のとおりです。\n{料金}\n\n{確認}ご予約をご希望でしたら、ご希望の日時をお知らせください。\n{しめ}",
    予約: "{あいさつ}\n{店名}です。ご予約のご希望ありがとうございます。\n\n{希望日時}\n{確認}\n{しめ}",
    日程変更: "{あいさつ}\n{店名}です。ご連絡ありがとうございます。\n\n日程の変更、承知しました。\n{希望日時}\n{確認}\n{しめ}",
    キャンセル: "{あいさつ}\n{店名}です。ご連絡ありがとうございます。\n\nキャンセルのご連絡、承知しました。またご都合のよいときに、いつでもお声がけください。\n{しめ}",
    その他: "{あいさつ}\n{店名}です。お問い合わせありがとうございます。\n\n内容を確認し、あらためてご連絡いたします。\n{確認}\n{しめ}",
  };

  function draft(text, shop, today, templates) {
    const kind = classify(text);
    const info = extract(text, today);
    const ask = [];
    let wish = "";
    if (kind === "予約" || kind === "日程変更") {
      if (info.date) {
        const wd = weekday(info.date);
        if ((shop.holidays || []).includes(wd)) {
          wish = `ご希望の${jp(info.date)}は定休日のため、申し訳ありません。ほかのご都合のよい日を2〜3つお知らせいただけますか。`;
        } else {
          wish = `ご希望の${jp(info.date)}${info.time ? " " + info.time : ""}で、仮のご予約としてお受けします。担当の空きを確かめ、確定のご連絡をいたします。`;
          if (!info.time) ask.push("ご希望の時間帯（午前・午後など）");
        }
      } else {
        wish = "ありがとうございます。日程を調整いたします。";
        ask.push("ご希望の日にち（2〜3つ）と時間帯");
      }
      if (!info.phone && !info.email) ask.push("当日つながるお電話番号");
      if (!info.count && (shop.askCount || "")) ask.push(shop.askCount);
    }
    if (kind === "その他" && !info.phone && !info.email) ask.push("ご連絡先（お電話番号）");
    const t = (templates || DEFAULT_TEMPLATES)[kind];
    const body = t
      .replace("{あいさつ}", info.name ? `${info.name}様` : "お問い合わせいただいたお客様")
      .replace("{店名}", shop.name || "（店名）")
      .replace("{料金}", priceLines(shop, text).join("\n"))
      .replace("{希望日時}", wish)
      .replace("{確認}", ask.length ? `お手数ですが、次の点をお知らせください。\n${ask.map((a) => "・" + a).join("\n")}\n` : "")
      .replace("{しめ}", `\n営業時間：${shop.hours || "-"}（定休日：${(shop.holidays || []).join("・") || "なし"}）\n${shop.name || ""}${shop.phone ? "　" + shop.phone : ""}`)
      .replace(/\n{3,}/g, "\n\n");
    return { kind, info, ask, body };
  }

  // 予約の記録にする（予約・日程変更のとき）
  function toBooking(result, text, now) {
    if (!["予約", "日程変更"].includes(result.kind)) return null;
    const i = result.info;
    return { id: now, kind: result.kind, name: i.name, phone: i.phone, email: i.email, date: i.date, time: i.time, count: i.count, status: "仮", text };
  }

  const api = { classify, extract, draft, toBooking, weekday, resolveDate, DEFAULT_TEMPLATES };
  if (typeof module !== "undefined") module.exports = api;
  else root.Reply = api;
})(this);
