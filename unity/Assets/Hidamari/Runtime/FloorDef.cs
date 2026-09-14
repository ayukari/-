// フロア定義 — サーバの /api/floor が返す形。client/floor.json と同じ。
//
// ★ マップはサーバが持つ。クライアントは受け取るだけで、自分でマップを持たない。
//   当たり判定の正はサーバにしかない（server/src/world.js）。

using System;
using System.Collections.Generic;
using Hidamari.Core;
using Newtonsoft.Json;

namespace Hidamari.Runtime
{
    [Serializable]
    public sealed class FloorDef
    {
        public string id;
        public string name;
        public Spawn spawn;
        public GridDef grid;
        public List<AreaDef> areas = new List<AreaDef>();
        public List<ObjectDef> objects = new List<ObjectDef>();

        [Serializable] public sealed class Spawn { public double x, y; }

        [Serializable]
        public sealed class GridDef
        {
            public int width, height;
            /// [[x,y], …]。JsonUtility では読めないので Newtonsoft を使っている
            public List<List<int>> blocked = new List<List<int>>();
        }

        [Serializable]
        public sealed class AreaDef
        {
            public string id, kind, name;
            public int x, y, w, h;
        }

        [Serializable]
        public sealed class ObjectDef
        {
            public string id, kind;
            public int x, y;
            public int rot;
        }

        public static FloorDef Parse(string json) => JsonConvert.DeserializeObject<FloorDef>(json);

        /// 論理側の Grid を組む。外周は Grid 側が必ず塞ぐ
        public Grid MakeGrid()
        {
            var blocked = new List<(int, int)>();
            foreach (var b in grid.blocked)
                if (b != null && b.Count >= 2) blocked.Add((b[0], b[1]));
            var g = new Grid(grid.width, grid.height, blocked);
            foreach (var a in areas)
                g.Areas.Add(new Area { Id = a.id, X = a.x, Y = a.y, W = a.w, H = a.h, Kind = a.kind, Name = a.name });
            foreach (var o in objects)
                g.AddObject(new SpaceObject { Id = o.id, Kind = o.kind, X = o.x, Y = o.y, Rot = o.rot });
            return g;
        }
    }
}
