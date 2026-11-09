import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const T = createRequire(import.meta.url)("./logic.js");
const DATA = `仕事,1回の分数,週の回数,任せられ度
見積もりの返信,20,12,◎
SNS投稿,30,6,◎
請求書づくり,30,5,◎
現場作業,90,5,△
予約の電話,10,10,○
帳簿つけ,60,1,○
道具の手入れ,30,2,△
口コミのお礼,5,6,○
移動,,3,○`;
test("読み取り", () => { const r = T.parse(DATA); assert.equal(r.ok.length, 8); assert.deepEqual(r.ng, [{ line: 10, why: "1回の分数がおかしい" }]); });
test("合計と浮く時間", () => { const a = T.analyze(T.parse(DATA).ok); assert.equal(a.total, 1270); assert.equal(T.hm(a.total), "21時間10分"); assert.equal(a.saved, 551); assert.equal(T.hm(a.saved), "9時間11分"); });
test("トップ3", () => { const a = T.analyze(T.parse(DATA).ok); assert.deepEqual(a.top3.map(r => [r.name, r.week, r.save]), [["見積もりの返信", 240, 192], ["SNS投稿", 180, 144], ["請求書づくり", 150, 120]]); });
test("型メーカーへ渡す文", () => { assert.equal(T.handoff({ name: "見積もりの返信" }), "「見積もりの返信」を任せたいので、型メーカーの手順で質問して、頼み方1枚にして"); });
