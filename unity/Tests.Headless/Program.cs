// C# 版の移動が、正解表（shared/golden/movement.tsv）と一致するかを確かめる。
//
// ★ Unity を開かずに走る。CI にもここを置ける。
//   Unity の EditMode テストは同じ表・同じ照合をするが、実行に Editor が要る。
//
//   dotnet run --project unity/Tests.Headless

using System;
using System.IO;
using Hidamari.Core;

static class Program
{
    static int _failed;

    static int Main(string[] args)
    {
        var path = args.Length > 0 ? args[0] : FindTable();
        if (path == null || !File.Exists(path))
        {
            Console.Error.WriteLine("正解表が見つからない: shared/golden/movement.tsv");
            return 2;
        }

        var g = GoldenTable.Load(path);
        Console.WriteLine($"表: {path}");
        Console.WriteLine($"  移動 {g.Moves.Count} 件 / 到達可能 {g.Reaches.Count} 件");

        Check("速度", Movement.Speed, g.Speed);
        Check("許容", Movement.Tolerance, g.Tolerance);

        var grid = g.MakeGrid();
        foreach (var c in g.Moves)
        {
            var r = Movement.Resolve(grid, c.X, c.Y, 0, c.Dx, c.Dy, c.Dt);
            Check($"move {c} x", GoldenTable.R6(r.X), c.OutX);
            Check($"move {c} y", GoldenTable.R6(r.Y), c.OutY);
            Check($"move {c} dir", GoldenTable.R6(r.Dir), c.OutDir);
            Check($"move {c} moved", r.Moved, c.Moved);
            Check($"move {c} clamped", r.Clamped, c.Clamped);
        }
        foreach (var c in g.Reaches)
            Check($"reach {c}", Movement.IsReachable(c.Px, c.Py, c.Nx, c.Ny, c.Dt), c.Ok);

        if (_failed > 0)
        {
            Console.Error.WriteLine($"\n✗ {_failed} 件ずれている。"
                + "C# 版と core/movement.js が別のことをしている。");
            return 1;
        }
        Console.WriteLine("\n✓ すべて一致。移動の規則は1つのまま。");
        return 0;
    }

    static void Check(string label, object got, object want)
    {
        if (Equals(got, want)) return;
        _failed++;
        Console.Error.WriteLine($"✗ {label}: {got} ≠ {want}");
    }

    /// リポジトリの中から表を探す。実行場所に依存させない
    static string FindTable()
    {
        var dir = AppContext.BaseDirectory;
        for (var i = 0; i < 10 && dir != null; i++)
        {
            var p = Path.Combine(dir, "shared", "golden", "movement.tsv");
            if (File.Exists(p)) return p;
            dir = Path.GetDirectoryName(dir.TrimEnd(Path.DirectorySeparatorChar));
        }
        return null;
    }
}
