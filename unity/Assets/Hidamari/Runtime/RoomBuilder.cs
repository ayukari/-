// 部屋の造作 — client/src/props.js の buildFloor / buildWalls / buildCeiling / skirt の移植。
//
// ★ 陰は頂点カラーに焼く。動的な影を使わない代わりに、
//   「低いところほど暗い」「通れないタイルの際ほど暗い」「窓から差す日なた」を焼いておく。
//   これが無いと、低ポリの部屋は書き割りにしか見えない。
//
// ★ 手前の壁は立てない。見下ろしのカメラで全周に壁を立てると中が見えない。
//   代わりに床の外周に小口（厚み）を回して、台に載った模型に見せる。

using System.Collections.Generic;
using Hidamari.Core;
using UnityEngine;

namespace Hidamari.Runtime
{
    public static class RoomBuilder
    {
        /// 立ち上がる壁の高さ。天井の庇はこのすぐ上に載る
        public const float WallTop = 2.90f;

        public static Mesh Floor(Grid g, IEnumerable<FloorDef.ObjectDef> objects, IEnumerable<FloorDef.AreaDef> areas)
        {
            int W = g.Width, H = g.Height;
            var baseCol = MeshKit.Hex("#A8845C");
            var warm = MeshKit.Hex("#F2DCAE");            // 日なたの色
            var windows = new List<Vector2>();
            if (objects != null)
                foreach (var o in objects)
                    if (o.kind == "window") windows.Add(new Vector2(o.x, o.y));

            var verts = new List<Vector3>();
            var tris = new List<int>();
            var cols = new List<Color>();
            var tint = new[] { 0.96f, 1.0f, 1.04f, 0.99f, 1.02f };
            long rndState = 11;
            float Rnd() { rndState = (rndState * 1103515245 + 12345) & 0x7fffffff; return (float)rndState / 0x7fffffff; }

            // 板の目地から下が透けるので、暗い下地を1枚敷く
            Quad(verts, tris, cols, 0, -0.004f, 0, W, H, baseCol, 0.44f, g, windows, areas, warm, 1, 1);

            for (float z = 0; z < H; z += 0.34f)
            {
                float x = 0;
                while (x < W - 0.01f)
                {
                    float len = Mathf.Min(W - x, 1.3f + Rnd() * 2.0f);
                    float shade = tint[(int)(Rnd() * tint.Length)];
                    int nx = Mathf.Max(3, Mathf.RoundToInt(len * 4));
                    Quad(verts, tris, cols, x + 0.013f, 0, z + 0.012f, len - 0.026f, 0.316f,
                         baseCol, shade, g, windows, areas, warm, nx, 2);
                    x += len;
                }
            }
            Skirt(verts, tris, cols, W, H);
            return MeshKit.Build(verts, tris, cols, "floor");
        }

        /// 床の一区画。分割して頂点ごとに陰と日なたを焼く
        static void Quad(List<Vector3> verts, List<int> tris, List<Color> cols,
                         float x0, float y, float z0, float w, float d,
                         Color baseCol, float shade, Grid g, List<Vector2> windows,
                         IEnumerable<FloorDef.AreaDef> areas, Color warm, int nx, int nz)
        {
            int start = verts.Count;
            for (var j = 0; j <= nz; j++)
            for (var i = 0; i <= nx; i++)
            {
                float px = x0 + w * i / nx, pz = z0 + d * j / nz;
                verts.Add(new Vector3(px, y, pz));
                cols.Add(FloorColor(px, pz, baseCol, shade, g, windows, areas, warm));
            }
            for (var j = 0; j < nz; j++)
            for (var i = 0; i < nx; i++)
            {
                int a = start + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, dd = c + 1;
                tris.Add(a); tris.Add(c); tris.Add(b);
                tris.Add(b); tris.Add(c); tris.Add(dd);
            }
        }

        static Color FloorColor(float x, float z, Color baseCol, float shade, Grid g,
                                List<Vector2> windows, IEnumerable<FloorDef.AreaDef> areas, Color warm)
        {
            // 近くに通れないタイルがあるほど暗くする（際の陰）
            float near = 9;
            for (var dx = -2; dx <= 2; dx++)
            for (var dz = -2; dz <= 2; dz++)
            {
                int tx = Mathf.FloorToInt(x) + dx, tz = Mathf.FloorToInt(z) + dz;
                if (!g.IsBlocked(tx, tz)) continue;
                float cx = Mathf.Max(tx, Mathf.Min(tx + 1, x)), cz = Mathf.Max(tz, Mathf.Min(tz + 1, z));
                near = Mathf.Min(near, Mathf.Sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz)));
            }
            float k = shade * (0.58f + 0.42f * Mathf.Pow(MeshKit.Clamp01(near / 1.15f), 0.6f));
            // 際の陰が濃いところ（家具の下）には日は差さない
            float sun = SunAt(x, z, windows) * MeshKit.Clamp01((k / shade - 0.72f) / 0.28f);
            var c = baseCol * (k * (1 + 0.40f * sun));
            c = Color.Lerp(c, warm, sun * 0.58f);
            if (areas != null)
                foreach (var a in areas)
                {
                    if (x < a.x || x > a.x + a.w || z < a.y || z > a.y + a.h) continue;
                    float edge = Mathf.Min(Mathf.Min(x - a.x, a.x + a.w - x), Mathf.Min(z - a.y, a.y + a.h - z));
                    float line = edge < 0.14f ? 1 : edge < 0.28f ? (0.28f - edge) / 0.14f : 0;
                    var ac = MeshKit.Hex(a.kind == "MEETING" ? "#D9A868" : "#8FB6CC");
                    c = Color.Lerp(c, ac, 0.10f + 0.20f * line);
                    break;
                }
            c.a = 1;
            return c;
        }

        /// 窓から差し込む光。0（日陰）〜1（いちばん明るいところ）
        static float SunAt(float x, float z, List<Vector2> windows)
        {
            float m = 0;
            foreach (var w in windows)
            {
                float t = (z - (w.y + 0.5f)) / 4.4f;        // 窓ぎわ 0 → 伸びた先 1
                if (t < 0 || t > 1) continue;
                float cx = w.x + 0.5f + 2.1f * t;           // 光は斜めに差す
                float half = 0.95f + 0.55f * t;
                float dd = Mathf.Abs(x - cx) / half;
                if (dd >= 1) continue;
                m = Mathf.Max(m, Mathf.Pow(1 - dd, 0.55f) * Mathf.Pow(1 - t * t, 0.7f));
            }
            return m;
        }

        /// 床の小口。手前の壁を立てないので、これが無いと床が紙一枚に見える
        static void Skirt(List<Vector3> verts, List<int> tris, List<Color> cols, int W, int H)
        {
            const float T = 0.22f;
            var side = MeshKit.Hex("#7A6047");
            var ps = new List<Piece>
            {
                MeshKit.Box(W + 0.24f, T, 0.12f).Place(new Vector3(W / 2f, -T / 2, H + 0.06f)).Paint(side),
                MeshKit.Box(0.12f, T, H + 0.12f).Place(new Vector3(-0.06f, -T / 2, H / 2f)).Paint(side),
                MeshKit.Box(0.12f, T, H + 0.12f).Place(new Vector3(W + 0.06f, -T / 2, H / 2f)).Paint(side),
            };
            foreach (var p in ps)
            {
                int off = verts.Count;
                foreach (var v in p.V)
                {
                    verts.Add(v);
                    float k = 0.72f + 0.28f * MeshKit.Clamp01((v.y + T) / T);
                    var c = p.Color * k; c.a = 1;
                    cols.Add(c);
                }
                foreach (var t in p.T) tris.Add(t + off);
            }
        }

        /// 壁。手前と手前寄りの左右は低くするか、立てない（切り取った模型）
        public static Mesh Walls(Grid g)
        {
            int W = g.Width, H = g.Height;
            var wall = MeshKit.Hex("#E6DED1");
            var baseC = MeshKit.Hex("#B9AE9C");
            var rail = MeshKit.Hex("#D2C5B0");
            var ps = new List<Piece>();

            float WallH(int x, int z)
            {
                if (z == H - 1) return 0;                    // 手前は立てない（断面）
                if (x == 0 || x == W - 1)
                {
                    if (z >= H - 3) return 0;
                    if (z >= H - 7) return 1.42f;
                }
                return WallTop;
            }

            for (var x = 0; x < W; x++)
            for (var z = 0; z < H; z++)
            {
                if (!g.IsBlocked(x, z)) continue;
                if (!(x == 0 || z == 0 || x == W - 1 || z == H - 1)) continue;
                float h = WallH(x, z);
                if (h == 0) continue;
                ps.Add(MeshKit.Box(1.0f, h, 1.0f).Place(new Vector3(x + 0.5f, h / 2, z + 0.5f)).Paint(wall));
                ps.Add(MeshKit.Box(1.02f, 0.13f, 1.02f).Place(new Vector3(x + 0.5f, 0.065f, z + 0.5f)).Paint(baseC));
                // 低い壁には天端、高い壁には腰の見切り。線が1本あるだけで「板」が「壁」になる
                ps.Add(MeshKit.Box(1.02f, h > 1 ? 0.05f : 0.07f, 1.06f)
                    .Place(new Vector3(x + 0.5f, h > 1 ? 1.02f : h + 0.02f, z + 0.5f)).Paint(rail));
            }

            var verts = new List<Vector3>(); var tris = new List<int>(); var cols = new List<Color>();
            foreach (var p in ps)
            {
                int off = verts.Count;
                foreach (var v in p.V)
                {
                    verts.Add(v);
                    // 上ほど明るい。床からの照り返しが届かない下側が落ちる。
                    // ★ Clamp01 を外すと float の誤差で負になり Pow が NaN、その頂点が真っ黒になる
                    float k = 0.66f + 0.34f * Mathf.Pow(MeshKit.Clamp01(v.y / WallTop), 0.55f);
                    var c = p.Color * k; c.a = 1; cols.Add(c);
                }
                foreach (var t in p.T) tris.Add(t + off);
            }
            return MeshKit.Build(verts, tris, cols, "walls");
        }

        /// 天井の庇。★ 奥の壁より手前には出さない。出すと部屋の中身が全部隠れる
        public static Mesh Ceiling(int W, int H)
        {
            const float T = 0.34f, Back = 22f;
            var face = MeshKit.Hex("#C4B8A6");
            var soff = MeshKit.Hex("#9E9184");
            var p = MeshKit.Box(W + 14, T, Back).Place(new Vector3(W / 2f, WallTop + T / 2, 1 - Back / 2));
            var verts = new List<Vector3>(p.V);
            var cols = new List<Color>();
            foreach (var v in p.V)
            {
                bool isFace = Mathf.Abs(v.z - 1) < 1e-3f;
                var c = isFace ? face : soff;
                if (!isFace && v.y < WallTop + T / 2) c *= 0.82f;
                c.a = 1; cols.Add(c);
            }
            return MeshKit.Build(verts, new List<int>(p.T), cols, "ceiling");
        }
    }
}
