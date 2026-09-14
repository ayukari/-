# 引き継ぎ — Unity 版をローカルで進める

クラウド実行の Claude Code から、**あなたの PC 上で動く Claude Code** への引き継ぎ。
**2026-09-14 / ブランチ `claude/company-task-management-app-h5hvvy` / `e943538` 時点。**

---

## なぜ引き継ぐか

クラウド側の私は Linux コンテナの中にいて、**Unity Editor を起動できなかった**。
Unity はライセンス（無料の Personal でも）が無いと batchmode でも起動しないため、

- ✅ C# のコンパイルが通ることは確認できた（本物の Unity アセンブリに当てて）
- ⛔ **絵が正しく出るかは一度も確認していない**

ローカルなら Editor が動く。**最初の仕事はこの穴を埋めること。**

---

## いま何があるか

| | |
| --- | --- |
| ブラウザ版 | `client/` — three.js。**動いていて、見た目も仕上がっている**。捨てない |
| サーバ | `server/` — 権威判定・WebSocket。テスト **98件** すべて通る |
| Unity 版 | `unity/` — **論理と部屋だけ**。通信もアバターも無い |
| 公開プロトタイプ | https://claude.ai/code/artifact/c38b8b34-7a92-43ad-b0ac-bbcfc16f2858 |

```
unity/Assets/Hidamari/
  Core/       Grid.cs Movement.cs GoldenTable.cs   ← UnityEngine を参照しない（純粋）
  Runtime/    MeshKit.cs RoomBuilder.cs Props.cs CameraRig.cs
              FloorDef.cs RoomBootstrap.cs Room.shader
  Editor/     BuildRoomMenu.cs                      ← メニュー「ひだまり → 部屋を組む」
  Tests/EditMode/ MovementGoldenTests.cs
unity/Tests.Headless/         ← Unity 無しで正解表に通す（dotnet）
unity/Tests.EditModeCompile/  ← Unity のアセンブリに当ててコンパイルだけ見る（ライセンス不要）
```

---

## 最初にやること（順番どおりに）

### 1. 部屋が正しく描けているかを見る

```
Unity Hub → Add → <repo>/unity   （※ リポジトリの根ではなく unity フォルダ）
開いたら メニュー「ひだまり → 部屋を組む」（Ctrl/Cmd + Shift + H）
```

`ProjectVersion.txt` は **6000.6.0f1**。

**期待する絵**: 20×14 の部屋。板張りの床、奥と左右に壁、奥の壁の上に天井の庇、
手前は壁を立てず床に小口（厚み）。家具31種。カメラは部屋がちょうど収まる位置。
ブラウザ版（`client/solo.html` か上の公開版）と**同じ見た目になるはず**。

**疑うべきものと、その場所**:

| 症状 | ほぼ確実にここ |
| --- | --- |
| 面が抜ける・裏返る | `MeshKit.cs` の巻き順。**three.js は右手系、Unity は左手系。ここが一番怪しい** |
| 真っ黒 | 頂点カラーが `NaN`。`MeshKit.Clamp01` を通し忘れた `Mathf.Pow` を探す |
| 家具がピンク | `Shader.Find("Hidamari/Room")` が null。`Room.shader` のインポート |
| 何も映らない | `CameraRig.Apply`。`aspect` が 0 のときのフォールバックを入れてある |
| メニューが出ない | コンパイルエラー。Console を読む |

### 2. EditMode テストを実際に走らせる

Test Runner → EditMode → `MovementGoldenTests`。**一度も走らせていない。**

### 3. `Packages/manifest.json` が解決するか確かめる

バージョンの実在はレジストリで確認済み（`com.unity.test-framework@1.4.5`、
`com.unity.nuget.newtonsoft-json@3.2.2`）。**解決の実行は未確認。**

---

## 絶対に壊してはいけない決まり

### 移動の規則は「1つ」でなければならない

ブラウザ版はサーバとクライアントが `server/src/core/movement.js` を
**同じファイル**として読む。C# はそれを読めないので写した。
**規則が2つある状態**なので、入出力を `shared/golden/movement.tsv` で固定してある。

```
cd server && npm run dump:golden     # 表を作り直す（core/movement.js から機械的に）
cd server && npm test                # JS 側を照合
dotnet run --project unity/Tests.Headless          # C# 側を照合（ライセンス不要）
```

**表を手で編集しない。** 直すのは `core/movement.js` のほう。
表だけ直して通すのは、規則を2つ持つのと同じこと。

薄い表は見張りにならない、を実地で踏んだ。壁ずりの作法を固定する3件を
足して初めて、`IsBlocked(ox, ny)` → `IsBlocked(nx, ny)` の書き換えが落ちるようになった。
**表を足したら、わざと壊して落ちることを必ず確かめる。**

### サーバが権威

クライアントは「進みたい向き」しか送らない。座標は送らない。
マップもサーバが持つ（`server/src/world.js` → `/api/floor`）。
`npm run dump:floor` は `client/floor.json` と
`unity/Assets/StreamingAssets/floor.json` の**両方**に書く。片方だけ古いと別の部屋が出る。

### プロダクトの原則（`docs/design/00-overview.md`）

- 近づいても勝手にマイクが繋がらない（着席して初めて通話）
- 「集中中」の人には届かない
- **行動ログを取らない。** 違反の記録に永続化の経路が無いことをテストで見張っている
- トークンを localStorage に置かない / orgId・userId をクライアントのメッセージから読まない
- **外部 CDN・外部フォントを使わない**

### 表現レイヤーが2つある

`client/src/props.js`（31種）と `unity/.../Props.cs`（31種）。
**片方に家具を足したら必ずもう片方にも足す。**
`server/test/unity-parity.test.js` が種別の一致を見張っている。

---

## 未解決の判断（まだ答えが出ていない）

### WebGL か、配布アプリか

ここが決まらないと通信の作り方が変わる。

| | WebGL | デスクトップ配布 |
| --- | --- | --- |
| 初回DL 5MB（`10 §1`） | **入らない**。最小でも 5〜10MB | 関係ない |
| 壁4「ブラウザのみ・情シス審査」 | 保てる | **配布物の審査が新しく要る** |
| 壁6「VDI で 2D に縮退」 | 受け皿を別に作る必要 | 同上 |
| `System.Net.WebSockets` | **使えない**（JS ブリッジが要る） | そのまま使える |

**クラウド側の私の意見**（採用されなかったが記録として）: この製品は部屋も家具も
アバターも手続き生成でダウンロード0バイト・テクスチャ0枚なので、Unity が得意な
「エディタで作り込む」部分を使わない。ブラウザ版を続けるほうが壁4と壁6を閉じたまま
進められる。**ユーザーは Unity で進めると決めた。その判断に従うこと。**

### Phase 0 の本丸が未了

`docs/design/06-roadmap.md` の DoD:
**「低スペック実機（内蔵GPU / VDI）で 3D が 30fps を維持できることを確認済み」が未了。**
ユーザーからは「fps は全然問題ない」との報告があるが、**機種が特定できていない**。
Unity 版を積み上げる前に、ここを実測しておくほうが安全。

---

## 次の実装（部屋が正しく出たあと）

1. **通信** — `docs/design/09-protocol.md`。`server/src/gateway/` が相手。
   `intent`（9バイト）だけ送る。座標は送らない
2. **アバター** — `client/assets/*.glb` を glTFast（`com.unity.cloud.gltfast@6.0.0`）で読む。
   骨18本・クリップ3つ（idle / walk / sit）。頂点カラーのアルファに
   「部位ID + 焼き込みの陰」が入っている（`docs/design/10-assets.md §4`）

---

## 踏んだ罠（同じ穴に落ちないように）

| 罠 | 症状 |
| --- | --- |
| `y ** 0.55` に微小な負の数 | float32 の誤差で `-7e-10` → `NaN` → **その頂点が真っ黒** |
| `UnityEngine.Grid` との名前衝突 | `using UnityEngine;` と並べると `CS0104`。**EditMode テストが一度も通っていなかった** |
| asmdef が URP を参照 | manifest に URP は無い。**開いた瞬間に asmdef エラー** |
| `AddComponent` では `Awake` が呼ばれない | エディタで組んだ直後だけカメラが未設定 |
| `.gitignore` の `*.csproj` | 手で書いた検査用 csproj が**コミットから消える** |
| 席の `rot` を渡していなかった | 椅子だけ南を向き、**全員が背もたれに正対して座る** |
| 円錐の上下を取り違え | 毛束が「先が太く根元がとがった刃物」になる |
| 症状から原因を1つ思いついて確かめずに進む | 「壁が無い」と誤診した。実際は `Grid` が外周を必ず塞いでいて、**壁はずっと建っていた**。真因は上の `NaN` だった |

---

## 手癖

- コメントは**日本語**。「何をしているか」ではなく「**なぜそうなっているか**」を書く
- 不具合を直したら、**同じ不具合が二度と入らないテスト**を足す
- テストを足したら、**わざと壊して落ちることを確かめる**
- 確かめていないことを「動くはず」と書かない。「**未実行**」と書く
