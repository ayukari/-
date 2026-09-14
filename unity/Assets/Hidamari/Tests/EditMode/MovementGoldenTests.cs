// C# 版の移動が、正解表（shared/golden/movement.tsv）と一致するか。
//
// ★ 中身は unity/Tests.Headless/Program.cs と同じ照合をしている。
//   置き場所が2つあるのは、走らせたい場面が2つあるため。
//     - Editor の Test Runner … Unity を開いて作業しているとき
//     - dotnet（Tests.Headless）  … CI と、Unity を開かない人
//   どちらも同じ表・同じ Hidamari.Core を見ているので、食い違いようがない。

using System.IO;
using NUnit.Framework;
using UnityEngine;
using Hidamari.Core;
// ★ UnityEngine にも Grid がある（タイルマップの Grid コンポーネント）。
//   `using UnityEngine;` と併せると CS0104 で**コンパイルが通らない**。
//   論理側の Grid だと明示する。名前は grid.js と揃えたいので変えない。
using Grid = Hidamari.Core.Grid;

namespace Hidamari.Tests
{
    public class MovementGoldenTests
    {
        GoldenTable _g;
        Grid _grid;

        /// Assets/ から2つ上がリポジトリの根。Editor でしか走らないのでこれで足りる
        static string TablePath =>
            Path.GetFullPath(Path.Combine(Application.dataPath, "../../shared/golden/movement.tsv"));

        [SetUp]
        public void Load()
        {
            Assert.IsTrue(File.Exists(TablePath),
                $"正解表が無い: {TablePath}（`npm run dump:golden` で作る）");
            _g = GoldenTable.Load(TablePath);
            _grid = _g.MakeGrid();
        }

        [Test]
        public void 速度と許容の定数が表と一致する()
        {
            Assert.AreEqual(_g.Speed, Movement.Speed);
            Assert.AreEqual(_g.Tolerance, Movement.Tolerance);
        }

        [Test]
        public void 表に載っている移動がすべて一致する()
        {
            Assert.GreaterOrEqual(_g.Moves.Count, 15, "表が薄すぎる");
            foreach (var c in _g.Moves)
            {
                var r = Movement.Resolve(_grid, c.X, c.Y, 0, c.Dx, c.Dy, c.Dt);
                Assert.AreEqual(c.OutX, GoldenTable.R6(r.X), $"{c} の x");
                Assert.AreEqual(c.OutY, GoldenTable.R6(r.Y), $"{c} の y");
                Assert.AreEqual(c.OutDir, GoldenTable.R6(r.Dir), $"{c} の dir");
                Assert.AreEqual(c.Moved, r.Moved, $"{c} の moved");
                Assert.AreEqual(c.Clamped, r.Clamped, $"{c} の clamped");
            }
        }

        [Test]
        public void 到達可能判定も表と一致する()
        {
            foreach (var c in _g.Reaches)
                Assert.AreEqual(c.Ok, Movement.IsReachable(c.Px, c.Py, c.Nx, c.Ny, c.Dt), c.ToString());
        }

        [Test]
        public void 外周は_blocked_に書かれていなくても塞がっている()
        {
            // JS 側の Grid と同じ約束。ここがずれると、壁の絵と当たり判定がずれる
            Assert.IsTrue(_grid.IsBlocked(0, 2));
            Assert.IsTrue(_grid.IsBlocked(_g.Width - 1, 2));
            Assert.IsTrue(_grid.IsBlocked(2, 0));
            Assert.IsTrue(_grid.IsBlocked(2, _g.Height - 1));
            Assert.IsTrue(_grid.IsBlocked(-1, -1), "範囲外も通行不可");
            Assert.IsFalse(_grid.IsBlocked(1.5, 1.5));
        }
    }
}
