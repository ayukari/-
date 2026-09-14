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

`Packages/manifest.json` に書いたバージョンは、Unity のレジストリに問い合わせて
実在を確かめてある（`com.unity.test-framework` は 1.4.5、最新は 1.4.6）。
`com.unity.modules.*` は組み込みなので常に解決する。

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

## 3段構えで見張る

Unity の Test Runner は Editor が要り、Editor はライセンスが要る。
**ライセンス無しでも捕まえられるものは、ライセンス無しで捕まえる。**

| | 何を見る | ライセンス | 走らせ方 |
| --- | --- | --- | --- |
| `Tests.Headless` | 論理が正解表と一致するか | 不要 | `dotnet run --project unity/Tests.Headless` |
| `Tests.EditModeCompile` | **C# 全部**が本物の Unity アセンブリでコンパイルできるか | 不要 | `UNITY_DATA=<Editor/Data> dotnet build unity/Tests.EditModeCompile` |
| `server/test/unity-parity.test.js` | 家具の種別がブラウザ版と揃っているか | 不要 | `cd server && npm test` |
| Test Runner（EditMode） | 実際に走るか | **要る** | Editor → Test Runner → EditMode |

> **真ん中が無いと何を見逃すか、実地で踏んだ。**
> `UnityEngine` にも `Grid`（タイルマップのコンポーネント）があるので、
> `using UnityEngine;` と `using Hidamari.Core;` を並べた時点で `CS0104` になり、
> EditMode テストは**一度も通らない状態**だった。
> `Tests.Headless` は `UnityEngine` を参照しないので気づけず、
> Test Runner はライセンスが無くて走らせられない。
> **本物のアセンブリに当ててコンパイルするだけ**で出た。

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
| 部屋の造作（床・壁・天井の庇・小口・日なた） | ✅ コンパイル検証済 | `RoomBuilder.cs`。props.js の焼き込みをそのまま移植 |
| 家具 **31種** | ✅ コンパイル検証済 | `Props.cs`。props.js と種別が一致することをテストで見張る |
| カメラ（「部屋が収まる距離」） | ✅ コンパイル検証済 | `CameraRig.cs` |
| フロア定義の読み込み | ✅ コンパイル検証済 | `FloorDef.cs`。StreamingAssets の floor.json を読む |
| **絵が出ているかの確認** | ⛔ **ライセンス待ち** | Editor を起動できないので、**一度も描画していない** |
| EditMode テストの**実行** | ⛔ **ライセンス待ち** | 同上 |
| `Packages/manifest.json` | ⚠️ 半分 | バージョンの実在はレジストリで確認済。**解決の実行**は Editor が要る |
| 通信（WebSocket・[09](../docs/design/09-protocol.md) のメッセージ） | ⛔ 未着手 | |
| アバター（glTF の読み込み・3クリップ） | ⛔ 未着手 | `client/assets/*.glb` をそのまま使える見込み |

> **⛔「絵が出ているかの確認」が本丸。**
> コンパイルが通ることと、部屋が正しく見えることは別である。
> 巻き順が裏返っていれば面が消えるし、頂点カラーが `NaN` になれば真っ黒になる
> （ブラウザ版で実際に両方やった）。**ライセンスが入るまでは「動くはず」としか言えない。**

## 使い方（Unity を開ける人向け）

1. Unity Hub → **Add project from disk** → この `unity/` フォルダ
2. 開く（初回はパッケージの解決で数分かかる）
3. メニュー **ひだまり → 部屋を組む**（`Ctrl/Cmd + Shift + H`）
4. 空のシーンに床・壁・天井・家具31種と、規則どおりのカメラが組まれる

`.unity` のシーンファイルは置いていない。Unity の YAML を手で書くと壊れやすく、
壊れたときに原因が分からないため、**メニューから組む**形にしてある。

### 想定される引っかかり

| 症状 | 原因と直し方 |
| --- | --- |
| Hub が「別のバージョンで作られた」と言う | `ProjectVersion.txt` は 6000.3.24f1。手元の **Unity 6 なら upgrade でよい**。Unity 2022 以前では開かない |
| Package Manager がバージョンを解決できない | `Packages/manifest.json` の版を手元にあるものに直す。実在は確認済みだが、解決の実行は未検証 |
| 部屋が**真っ黒**／面が**抜けている** | 頂点カラーが `NaN`（`Clamp01` 漏れ）か、三角形の巻き順が逆。ブラウザ版で両方やった。**スクリーンショットがあれば直せる** |
| 家具が**ピンク** | `Hidamari/Room` シェーダが見つかっていない。`Assets/Hidamari/Runtime/Room.shader` がインポートされているか |
| メニューに「ひだまり」が出ない | コンパイルが通っていない。Console のエラーを見る |

### ライセンスについて

Unity 6000.3.24f1 の Linux Editor は入れてある（`/opt/unity/Editor/Unity`）が、
**Unity は無ライセンスでは起動しない**（batchmode でも同じ）。

```
[Licensing::Client] Error: Code 404 (Found 0 entitlement groups and 0 free entitlements)
No valid Unity Editor license found. Please activate your license.
```

アクティベーション要求ファイル（`.alf`）は作ってある。手順は3つ。

1. `Unity_v6000.3.24f1.alf` を https://license.unity3d.com/manual に上げる（Unity アカウントでサインイン）
2. 返ってきた `.ulf` を受け取る
3. `Unity -batchmode -nographics -quit -manualLicenseFile <その .ulf>`

**パスワードやシリアルは要らないし、渡さないでほしい。** 1 と 2 はブラウザでの作業で、
こちらが要るのは `.ulf` ファイルだけ。`.ulf` はアカウントに紐づくので、
渡すかどうかは持ち主が決めること。渡さない場合は、手元の Unity で
Test Runner を開いてもらえれば同じことが確かめられる。

## まだ決めていないこと — WebGL か、配布アプリか

ここが決まらないと、この先の作り方が変わる。

| | WebGL | デスクトップ配布 |
| --- | --- | --- |
| 初回ダウンロード 5MB（[10 §1](../docs/design/10-assets.md)） | **入らない。** 最小構成でも 5〜10MB、URP を足せば 20MB 超 | 関係ない |
| 壁4「ブラウザのみ・情シス審査」（[02](../docs/design/02-problem-solving.md)） | 保てる | **配布物の審査が新しく要る** |
| 壁6「VDI で 2D・リストへ縮退」 | 縮退先を別に作る必要がある | 同上 |
| `System.Net.WebSockets` | **使えない**（JS 側のブリッジが要る） | そのまま使える |

**ブラウザ版（`client/`）は消さない。** どちらに転んでも、縮退先として要る。
