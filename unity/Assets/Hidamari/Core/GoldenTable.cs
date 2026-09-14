// 正解表の読み手 — shared/golden/movement.tsv
//
// ★ 表は TSV。JSON ではない。
//   Unity の JsonUtility は数値と文字列が混ざる欄（nan を書く欄）を読めず、
//   System.Text.Json は Unity に標準で入っていない。
//   **表のために外部ライブラリを増やすのは本末転倒**なので、行指向にしてある。
//
// ★ ここは表を「読む」だけ。照合する側（テスト）は Tests.Headless と EditMode にある。

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

namespace Hidamari.Core
{
    public sealed class GoldenTable
    {
        public double Speed;
        public double Tolerance;
        public int Width, Height;
        public readonly List<(int x, int y)> Blocked = new List<(int, int)>();

        public struct MoveCase
        {
            public double X, Y, Dx, Dy, Dt;
            public double OutX, OutY, OutDir;
            public bool Moved, Clamped;
            public override string ToString() =>
                $"dx={Dx} dy={Dy} dt={Dt} @({X},{Y})";
        }

        public struct ReachCase
        {
            public double Px, Py, Nx, Ny, Dt;
            public bool Ok;
            public override string ToString() => $"prev=({Px},{Py}) next=({Nx},{Ny}) dt={Dt}";
        }

        public readonly List<MoveCase> Moves = new List<MoveCase>();
        public readonly List<ReachCase> Reaches = new List<ReachCase>();

        public static GoldenTable Load(string path)
        {
            var t = new GoldenTable();
            foreach (var raw in File.ReadAllLines(path))
            {
                if (raw.Length == 0 || raw[0] == '#') continue;
                var c = raw.Split('\t');
                switch (c[0])
                {
                    case "speed": t.Speed = N(c[1]); break;
                    case "tolerance": t.Tolerance = N(c[1]); break;
                    case "grid": t.Width = (int)N(c[1]); t.Height = (int)N(c[2]); break;
                    case "blocked": t.Blocked.Add(((int)N(c[1]), (int)N(c[2]))); break;
                    case "move":
                        t.Moves.Add(new MoveCase
                        {
                            X = N(c[1]), Y = N(c[2]), Dx = N(c[3]), Dy = N(c[4]), Dt = N(c[5]),
                            OutX = N(c[6]), OutY = N(c[7]), OutDir = N(c[8]),
                            Moved = c[9] == "1", Clamped = c[10] == "1",
                        });
                        break;
                    case "reach":
                        t.Reaches.Add(new ReachCase
                        {
                            Px = N(c[1]), Py = N(c[2]), Nx = N(c[3]), Ny = N(c[4]),
                            Dt = N(c[5]), Ok = c[6] == "1",
                        });
                        break;
                }
            }
            return t;
        }

        public Grid MakeGrid() => new Grid(Width, Height, Blocked);

        /// 表の綴りを数に戻す。NaN / Infinity はそのまま書けないので語で持っている
        static double N(string s)
        {
            if (s == "nan") return double.NaN;
            if (s == "inf") return double.PositiveInfinity;
            if (s == "-inf") return double.NegativeInfinity;
            // ★ 必ず InvariantCulture。小数点がカンマの地域設定だと全部 0 になる
            return double.Parse(s, CultureInfo.InvariantCulture);
        }

        /// 表は 6 桁で切ってある。照合する側も同じ桁で切る
        public static double R6(double v) => Math.Round(v * 1e6) / 1e6;
    }
}
