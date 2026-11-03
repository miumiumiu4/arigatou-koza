// 架空のデータで計算を確かめる：node --test test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const Dash = createRequire(import.meta.url)("./logic.js");

const csv = `日付,種類,項目,金額,メモ
2026-09-05,売上,施工代,120000,
2026-09-20,売上,施工代,100000,
2026-09-10,経費,広告費,20000,
2026-09-12,経費,材料費,15000,
2026-10-01,売上,施工代,55000,
2026-10-8,売上,施工代,1,日付の形がおかしい行
2026-10-08,売上,施工代,88000,
2026-10-21,売上,施工代,33000,
2026-10-03,経費,材料費,12000,洗剤
2026-10-15,経費,材料費,8000,
2026-10-10,経費,広告費,"50,000",
2026-10-11,経費,ガソリン代,6000,
2026-10-12,支出,材料費,100,種類がおかしい行`;

test("貼り付けた表を読む（おかしい行ははじく）", () => {
  const r = Dash.parseCSV(csv.replace('"50,000"', "50000"));
  assert.equal(r.entries.length, 11);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0], /^7行目/);
  assert.match(r.errors[1], /^14行目/);
});

const { entries } = Dash.parseCSV(csv.replace('"50,000"', "50000"));

test("10月の合計・利益・利益率", () => {
  const s = Dash.summarize(entries, "2026-10");
  assert.equal(s.sales, 176000);
  assert.equal(s.cost, 76000);
  assert.equal(s.profit, 100000);
  assert.equal(Math.round(s.margin * 1000), 568);
});

test("経費の高い順", () => {
  const s = Dash.summarize(entries, "2026-10");
  assert.deepEqual(s.costRank.map((r) => [r.category, r.amount]), [["広告費", 50000], ["材料費", 20000], ["ガソリン代", 6000]]);
  assert.equal(Math.round(s.costRank[0].share * 100), 66);
});

test("月ごとの推移", () => {
  const m = Dash.monthly(entries);
  assert.deepEqual(m.map((x) => [x.ym, x.sales, x.cost, x.profit]), [["2026-09", 220000, 35000, 185000], ["2026-10", 176000, 76000, 100000]]);
});

test("次の一手（広告費の割合・売上の減少・広告費の増加）", () => {
  const a = Dash.nextActions(entries, "2026-10");
  assert.equal(a.length, 3);
  assert.match(a[0], /経費の66%が「広告費」.*5,000円/);
  assert.match(a[1], /売上が前の月より20%減りました/);
  assert.match(a[2], /「広告費」が前の月より30,000円増えて/);
});

test("赤字の月", () => {
  const e = [{ date: "2026-11-01", kind: "売上", category: "施工代", amount: 30000 }, { date: "2026-11-02", kind: "経費", category: "外注費", amount: 45000 }];
  const s = Dash.summarize(e, "2026-11");
  assert.equal(s.profit, -15000);
  assert.match(Dash.nextActions(e, "2026-11")[0], /赤字です（-15,000円）.*外注費/);
});

test("記録のない月・年またぎ", () => {
  assert.match(Dash.nextActions(entries, "2026-12")[0], /記録がまだありません/);
  assert.equal(Dash.prevMonth("2026-01"), "2025-12");
});
