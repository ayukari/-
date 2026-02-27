 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/README.md b/README.md
new file mode 100644
index 0000000000000000000000000000000000000000..64fa896c2592118345eba7e838553cc8dc710b13
--- /dev/null
+++ b/README.md
@@ -0,0 +1,50 @@
+# XP Bank (Forge 1.20.1)
+
+このMODは **Minecraft Forge 1.20.1** 用です。  
+プレイヤーの経験値を「経験値バンク」ブロックに預けて、好きな時に取り出せます。
+
+## 使い方
+- 右クリック: プレイヤーの経験値をすべて預ける
+- しゃがみ + 右クリック: 保存された経験値をすべて引き出す
+- ブロックを壊す: 保存XPは経験値オーブとしてドロップ
+
+## クラフト
+```text
+A E A
+E S E
+A E A
+A = アメジストの欠片
+E = エンチャントの瓶
+S = スカルク
+```
+
+## ダウンロード（① GitHub Releases 方式）
+配布ページ（jarダウンロード先）は GitHub Releases を使います。
+
+- 公開URL（この形式で作成）: `https://github.com/<OWNER>/<REPO>/releases`
+- 例: `https://github.com/example-user/xpbank-forge-1.20.1/releases`
+
+> `<OWNER>` と `<REPO>` を自分のGitHubリポジトリに置き換えてください。  
+> Releasesページにアップロードした `xpbank-<version>.jar` を配布ファイルとして使えます。
+
+## Releasesページの作り方
+1. GitHubでこのリポジトリを作成してpush
+2. 右側の **Releases** → **Create a new release**
+3. Tagを作成（例: `v1.0.0`）
+4. `build/libs/xpbank-<version>.jar` を Assets にアップロード
+5. Publish release
+
+作成後は、以下のリンクが配布サイトになります。
+
+- `https://github.com/<OWNER>/<REPO>/releases`
+
+## ビルド
+```bash
+./gradlew build
+```
+生成物: `build/libs/xpbank-<version>.jar`
+
+## 導入（DLしたjarの入れ方）
+1. Minecraft 1.20.1 用 Forge をインストール
+2. `build/libs/` の jar (またはReleasesで配布したjar) を `.minecraft/mods/` に入れる
+3. Forgeプロファイルで起動
 
EOF
)
