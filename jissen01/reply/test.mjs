// 架空の問い合わせ文で確かめる：node --test test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const R = createRequire(import.meta.url)("./logic.js");

const TODAY = "2026-11-03"; // 火曜
const shop = {
  name: "サンプルクリーニング", hours: "9:00〜18:00", holidays: ["日"], phone: "000-0000-0000", askCount: "台数（エアコンなら何台か）",
  prices: [{ item: "エアコン", price: 12000 }, { item: "お風呂", price: 15000 }, { item: "キッチン", price: 18000 }],
};

test("種類を見分ける", () => {
  assert.equal(R.classify("エアコンの掃除はいくらですか"), "料金");
  assert.equal(R.classify("来週の予約をお願いしたいです"), "予約");
  assert.equal(R.classify("予約していた日を変更できますか"), "日程変更");
  assert.equal(R.classify("先日の予約をキャンセルしたいです"), "キャンセル");
  assert.equal(R.classify("駐車場はありますか"), "その他");
});

test("名前・日付・時間・台数・電話を読む（全角の数字も）", () => {
  const i = R.extract("山田花子と申します。１１月１２日の午後２時に、エアコン２台の掃除をお願いしたいです。電話は000-1234-5678です。", TODAY);
  assert.deepEqual(i, { name: "山田花子", phone: "000-1234-5678", email: "", date: "2026-11-12", time: "14:00", count: "2台", items: [] });
});

test("年をまたぐ日付と 1/15 の書き方", () => {
  assert.equal(R.extract("1/15 10:30でお願いします", TODAY).date, "2027-01-15");
  assert.equal(R.extract("1/15 10:30でお願いします", TODAY).time, "10:30");
});

test("料金の下書き：聞かれた品目だけ載せる", () => {
  const d = R.draft("お風呂の掃除はいくらですか？", shop, TODAY);
  assert.equal(d.kind, "料金");
  assert.match(d.body, /お風呂：15,000円/);
  assert.doesNotMatch(d.body, /エアコン：/);
});

test("予約の下書き：日時を仮で受け、足りない連絡先を聞く", () => {
  const text = "佐藤と申します。11月12日の10時にエアコン2台の掃除を予約したいです。";
  const d = R.draft(text, shop, TODAY);
  assert.equal(d.kind, "予約");
  assert.match(d.body, /^佐藤様/);
  assert.match(d.body, /11月12日（木） 10:00で、仮のご予約/);
  assert.deepEqual(d.ask, ["当日つながるお電話番号"]);
  const b = R.toBooking(d, text, 1);
  assert.equal(b.status, "仮");
  assert.equal(b.date, "2026-11-12");
  assert.equal(b.count, "2台");
});

test("定休日の希望日は別の日をお願いする", () => {
  const d = R.draft("11月15日に予約できますか。000-0000-1111", shop, TODAY);
  assert.match(d.body, /11月15日（日）は定休日/);
});

test("日付がない予約は日にちと台数をたずねる", () => {
  const d = R.draft("エアコン掃除の予約をお願いしたいです", shop, TODAY);
  assert.deepEqual(d.ask, ["ご希望の日にち（2〜3つ）と時間帯", "当日つながるお電話番号", "台数（エアコンなら何台か）"]);
  assert.equal(R.toBooking(R.draft("料金はいくら？", shop, TODAY), "", 1), null);
});
