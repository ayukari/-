# ひだまり — Unity 版

ブラウザ版（`client/`）と**同じサーバ・同じ規則**で動く、もう1つの表現レイヤー。
[04 §4.5](../docs/design/04-architecture.md) の「論理と表現の分離」を、
別の実行系でもう一度やるとどうなるかの実物。

> **いまの状態: 論理の芯だけが入っている。** 部屋も人もまだ描かない。
> 何が終わっていて何が終わっていないかは、いちばん下の表に書いてある。

## 開き方

```
Unity Hub → Add project from disk → このフォルダ（unity/）
```

`ProjectSettings/ProjectVersion.txt` は `6000.0.0f1` と書いてある。
手元の Unity 6 が別のパッチ版なら、Hub がアップグレードを勧めてくる。そのままでよい。

> **`Packages/manifest.json` のバージョンは検証できていない。**
> この作業環境に Unity が無いので、パッケージが解決できるかを確かめられなかった。
> Package Manager が文句を言ったら、手元にあるバージョンに直してほしい。

## 移動の規則が2つになる問題

ブラウザ版では、サーバとクライアントが `core/movement.js` を
**同じファイルとして**読んでいる。だから移動の規則はこの世に1つしかない。
ここが「歩いていたら引き戻される」を RTT 分に抑えている。

**C# はそのファイルを読めない。** 書き写すしかなく、規則が2つになる。
2つになると、片方を直したときもう片方が置き去りになり、ずれが常態化する。

書き写しは避けられないので、**入出力のほうを固定してある。**

| | |
| --- | --- |
| 正解表 | [`shared/golden/movement.tsv`](../shared/golden/movement.tsv)（移動22件＋到達可能5件） |
| 作る | `cd server && npm run dump:golden`（`core/movement.js` から機械的に出す。**手で編集しない**） |
| JS 側の見張り | `cd server && npm test`（`test/golden.test.js`） |
| C# 側の見張り（Unity 無し） | `dotnet run --project unity/Tests.Headless` |
| C# 側の見張り（Editor） | Test Runner → EditMode → `MovementGoldenTests` |

表には**壁ずり・外周・入力の丸め・`NaN`/`Infinity`・`dt` の頭打ち**が入っている。
素直に歩くケースだけの表は、写した人が同じ勘違いをすれば通ってしまう。
実際、最初の表は「2軸目を更新後の x で判定する」という壁ずりの作法を固定できておらず、
`IsBlocked(ox, ny)` を `IsBlocked(nx, ny)` と書き換えても通ってしまった。
いまはその3件を足してあり、次の書き間違いは落ちる。

- `Math.Atan2` の引数を入れ替える → 10件落ちる
- 2軸目を更新前の x で判定する → 4件落ちる
- X より先に Y を確定する → 2件落ちる

## `Hidamari.Core` は UnityEngine を参照しない

`Assets/Hidamari/Core/Hidamari.Core.asmdef` に `"noEngineReferences": true` が入っている。
**設計の約束を、Unity のコンパイラに守らせている。**

おかげで同じ `.cs` を素の .NET でもコンパイルでき、
`unity/Tests.Headless` が Unity 抜きで正解表に通せる（写しは増えていない。同じファイルを見ている）。

```
dotnet run --project unity/Tests.Headless
```

## 何が終わっていて、何が終わっていないか

| | 状態 | 備考 |
| --- | --- | --- |
| `Core/Grid.cs` | ✅ 移植・検証済 | 外周は常に塞ぐ。範囲外も通行不可 |
| `Core/Movement.cs` | ✅ 移植・検証済 | 正解表の27件すべて一致 |
| `Core/GoldenTable.cs` | ✅ | TSV の読み手。依存ライブラリ無し |
| EditMode テスト | ⚠️ **未実行** | 書いてあるが、この作業環境に Unity が無いので走らせていない |
| `Packages/manifest.json` | ⚠️ **未検証** | パッケージのバージョンを確かめられていない |
| 通信（WebSocket・[09](../docs/design/09-protocol.md) のメッセージ） | ⛔ 未着手 | |
| 部屋の造作（`client/src/props.js` 相当） | ⛔ 未着手 | |
| アバター（glTF の読み込み・3クリップ） | ⛔ 未着手 | `client/assets/*.glb` をそのまま使える見込み |
| カメラ（`render3d.js` の「部屋が収まる距離」） | ⛔ 未着手 | |

> **⚠️ の2つは、誰かが一度 Unity で開けば分かる。**
> この環境には Unity が無く、私には確かめようがない。
> 「動くはず」と書かずに「未実行」と書いてあるのはそのため。

## まだ決めていないこと — WebGL か、配布アプリか

ここが決まらないと、この先の作り方が変わる。

| | WebGL | デスクトップ配布 |
| --- | --- | --- |
| 初回ダウンロード 5MB（[10 §1](../docs/design/10-assets.md)） | **入らない。** 最小構成でも 5〜10MB、URP を足せば 20MB 超 | 関係ない |
| 壁4「ブラウザのみ・情シス審査」（[02](../docs/design/02-problem-solving.md)） | 保てる | **配布物の審査が新しく要る** |
| 壁6「VDI で 2D・リストへ縮退」 | 縮退先を別に作る必要がある | 同上 |
| `System.Net.WebSockets` | **使えない**（JS 側のブリッジが要る） | そのまま使える |

**ブラウザ版（`client/`）は消さない。** どちらに転んでも、縮退先として要る。
