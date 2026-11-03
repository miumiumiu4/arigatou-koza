// 架空のデータで計算を確かめる：node --test test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const Inv = createRequire(import.meta.url)("./logic.js");

const a = {
  no: "INV-202610-001", client: "株式会社サンプル商事", issueDate: "2026-10-31", dueDate: "2026-11-30", paidDate: "",
  items: [
    { name: "エアコン清掃（壁掛け）", qty: 3, price: 12800, rate: 10 },
    { name: "出張費", qty: 1, price: 3000, rate: 10 },
    { name: "お茶菓子", qty: 2, price: 540, rate: 8 },
  ],
};
const b = { no: "INV-202610-002", client: "テスト不動産", issueDate: "2026-10-01", dueDate: "2026-10-31", paidDate: "", items: [{ name: "退去清掃", qty: 1, price: 50000, rate: 10 }] };
const c = { no: "INV-202609-001", client: "テスト不動産", issueDate: "2026-09-01", dueDate: "2026-09-30", paidDate: "2026-09-28", items: [{ name: "退去清掃", qty: 2, price: 45000, rate: 10 }] };
const all = [a, b, c];
const TODAY = "2026-11-03";

test("10%と8%がまじった請求書の合計", () => {
  const t = Inv.totals(a);
  assert.deepEqual(t.rates, [{ rate: 10, subtotal: 41400, tax: 4140 }, { rate: 8, subtotal: 1080, tax: 86 }]);
  assert.equal(t.subtotal, 42480);
  assert.equal(t.tax, 4226);
  assert.equal(t.total, 46706);
});

test("消費税は請求書ごと・税率ごとに1回だけ切り捨て", () => {
  const t = Inv.totals({ items: [{ name: "A", qty: 1, price: 105, rate: 10 }, { name: "B", qty: 1, price: 105, rate: 10 }] });
  assert.equal(t.tax, 21); // 1行ずつ切り捨てると 20 になってしまう
  assert.equal(Inv.totals({ items: [{ name: "C", qty: 3, price: 333, rate: 10 }] }).total, 999 + 99);
});

test("請求書番号は発行月ごとに続き番号", () => {
  assert.equal(Inv.nextNo(all, "2026-10-15"), "INV-202610-003");
  assert.equal(Inv.nextNo(all, "2026-11-01"), "INV-202611-001");
});

test("入金の状態", () => {
  assert.equal(Inv.status(a, TODAY), "未入金");
  assert.equal(Inv.status(b, TODAY), "期限切れ");
  assert.equal(Inv.status(c, TODAY), "入金済み");
});

test("一覧の集計（請求・入金済み・未入金・期限切れ）", () => {
  const s = Inv.summary(all, TODAY);
  assert.equal(s.billed, 46706 + 55000 + 99000);
  assert.equal(s.paid, 99000);
  assert.equal(s.unpaid, 46706 + 55000);
  assert.equal(s.overdue, 55000);
  assert.deepEqual(s.overdueList, ["INV-202610-002"]);
});

test("翌月末の支払期限（年またぎ・2月）", () => {
  assert.equal(Inv.endOfNextMonth("2026-10-31"), "2026-11-30");
  assert.equal(Inv.endOfNextMonth("2026-12-15"), "2027-01-31");
  assert.equal(Inv.endOfNextMonth("2027-01-31"), "2027-02-28");
});

test("入力のまちがいを教える", () => {
  assert.deepEqual(Inv.validate(a), []);
  const e = Inv.validate({ client: "", issueDate: "2026-11-10", dueDate: "2026-11-01", items: [{ name: "X", qty: 0, price: -1, rate: 5 }] });
  assert.equal(e.length, 5);
});
