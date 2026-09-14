// グリッド — 盤面の規則。純粋。
//
// ★ server/src/core/grid.js の写し。
//   UnityEngine を **参照しない**。理由は2つある。
//     1. Unity を開かずに `dotnet run --project unity/Tests.Headless` で検証できる
//     2. 論理レイヤーが表現レイヤーを知らない、という分離（04 §4.5）がそのまま形になる
//
// ★ 写しなので、規則がこの世に2つある。ずれると「歩いたら引き戻される」になる。
//   shared/golden/movement.tsv がその見張り。

using System.Collections.Generic;

namespace Hidamari.Core
{
    public sealed class SpaceObject
    {
        public string Id;
        public string Kind;
        public int X;
        public int Y;
        public int Rot;
    }

    public sealed class Area
    {
        public string Id;
        public int X, Y, W, H;
        public string Kind;
        public string Name;
    }

    public sealed class Grid
    {
        public readonly int Width;
        public readonly int Height;
        public readonly List<Area> Areas = new List<Area>();
        public readonly List<SpaceObject> Objects = new List<SpaceObject>();

        readonly HashSet<long> _blocked = new HashSet<long>();
        readonly Dictionary<long, SpaceObject> _objectAt = new Dictionary<long, SpaceObject>();

        public Grid(int width, int height, IEnumerable<(int x, int y)> blocked)
        {
            Width = width;
            Height = height;

            // 外周は常に壁。呼び出し側が blocked に入れ忘れても塞がる（grid.js と同じ）
            for (var x = 0; x < Width; x++)
            {
                _blocked.Add(Key(x, 0));
                _blocked.Add(Key(x, Height - 1));
            }
            for (var y = 0; y < Height; y++)
            {
                _blocked.Add(Key(0, y));
                _blocked.Add(Key(Width - 1, y));
            }
            if (blocked != null)
                foreach (var (x, y) in blocked) _blocked.Add(Key(x, y));
        }

        public void AddObject(SpaceObject o)
        {
            Objects.Add(o);
            _objectAt[Key(o.X, o.Y)] = o;
        }

        /// 範囲外も「通行不可」として扱う
        public bool IsBlocked(double x, double y)
        {
            var cx = (int)System.Math.Floor(x);
            var cy = (int)System.Math.Floor(y);
            if (cx < 0 || cy < 0 || cx >= Width || cy >= Height) return true;
            return _blocked.Contains(Key(cx, cy));
        }

        public Area AreaAt(double x, double y)
        {
            foreach (var a in Areas)
                if (x >= a.X && x < a.X + a.W && y >= a.Y && y < a.Y + a.H) return a;
            return null;
        }

        public SpaceObject ObjectAt(double x, double y)
        {
            var k = Key((int)System.Math.Floor(x), (int)System.Math.Floor(y));
            return _objectAt.TryGetValue(k, out var o) ? o : null;
        }

        public SpaceObject ObjectById(string id)
        {
            foreach (var o in Objects) if (o.Id == id) return o;
            return null;
        }

        // タイル座標を1つの long に畳む。文字列キーより速く、割り当ても出ない
        static long Key(int x, int y) => ((long)x << 32) ^ (uint)y;
    }
}
