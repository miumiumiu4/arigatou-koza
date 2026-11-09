import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const T = createRequire(import.meta.url)("./logic.js");
const DATA = `数字の名前,先週,今週,向き
売上,200000,170000,増えるとよい
件数,10,12,増えるとよい
問い合わせ,8,8,増えるとよい
広告費,,5000,減るとよい`;
test("読み取り", () => { const r = T.parse(DATA); assert.equal(r.ok.length, 3); assert.deepEqual(r.ng, [{ line: 5, why: "数字がおかしい" }]); });
test("くらべ3行", () => { assert.deepEqual(T.compare(T.parse(DATA).ok).map(x => x.line), ["売上：200,000 → 170,000（−15%）", "件数：10 → 12（+20%）", "問い合わせ：8 → 8（±0%）"]); });
test("来週やること3つ", () => { const a = T.nextActions(T.parse(DATA).ok); assert.equal(a.length, 3); assert.match(a[0].what, /売上」が15%悪く/); assert.match(a[1].what, /件数」が20%良く/); assert.equal(a[2].what, "来週の目標を1つ決める"); assert.equal(a[0].who, "自分"); assert.equal(a[0].check, "来週の売上"); });
test("減るとよい数字", () => { const a = T.nextActions([{ name: "経費", last: 50000, now: 60000, good: -1 }]); assert.match(a[0].what, /経費」が20%悪く/); });
test("先週が0", () => { assert.equal(T.compare([{ name: "紹介", last: 0, now: 3, good: 1 }])[0].line, "紹介：0 → 3（先週が0なので割合は出せません）"); });
