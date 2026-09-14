// 部品を組み立てる道具 — client/src/props.js の part/box/cyl/sph/con/assemble に対応する。
//
// ★ Unity の CreatePrimitive は使わない。
//   分割数が three.js 側と揃わないと、同じ形にならないうえ三角形の予算も狂う。
//   （10 §5 の「同じ形は1つのジオメトリ」を守るには、頂点数まで一致させたい）
//
// ★ 陰は頂点カラーに焼く。動的な影を使わない代わりに
//   「低いところほど暗い」を焼いておく。これが無いと低ポリの部屋は書き割りに見える。
//
// ★ 巻き順は Unity の左手系に合わせて時計回り（外から見て表）。
//   three.js から数字をそのまま持ってくると裏返るので、ここで吸収している。

using System.Collections.Generic;
using UnityEngine;

namespace Hidamari.Runtime
{
    /// 組み立て途中の1部品。頂点・三角形・色だけを持つ
    public sealed class Piece
    {
        public readonly List<Vector3> V = new List<Vector3>();
        public readonly List<int> T = new List<int>();
        public Color Color = UnityEngine.Color.white;

        public Piece Add(Vector3 a, Vector3 b, Vector3 c, Vector3 d)
        {
            var i = V.Count;
            V.Add(a); V.Add(b); V.Add(c); V.Add(d);
            T.Add(i); T.Add(i + 1); T.Add(i + 2);
            T.Add(i); T.Add(i + 2); T.Add(i + 3);
            return this;
        }

        public Piece AddTri(Vector3 a, Vector3 b, Vector3 c)
        {
            var i = V.Count;
            V.Add(a); V.Add(b); V.Add(c);
            T.Add(i); T.Add(i + 1); T.Add(i + 2);
            return this;
        }

        /// 位置・回転・拡大を焼き込む（three.js 側の part() と同じ順: 回転 → 拡大 → 移動）
        public Piece Place(Vector3 pos, Vector3 eulerDeg = default, Vector3 scale = default)
        {
            var q = Quaternion.Euler(eulerDeg);
            var s = scale == default ? Vector3.one : scale;
            for (var i = 0; i < V.Count; i++)
                V[i] = q * Vector3.Scale(V[i], s) + pos;
            return this;
        }

        public Piece Paint(Color c) { Color = c; return this; }
    }

    public static class MeshKit
    {
        /// 箱。原点が中心
        public static Piece Box(float w, float h, float d)
        {
            var p = new Piece();
            float x = w / 2, y = h / 2, z = d / 2;
            var v = new[]
            {
                new Vector3(-x, -y, -z), new Vector3(x, -y, -z), new Vector3(x, y, -z), new Vector3(-x, y, -z),
                new Vector3(-x, -y,  z), new Vector3(x, -y,  z), new Vector3(x, y,  z), new Vector3(-x, y,  z),
            };
            p.Add(v[0], v[3], v[2], v[1]);   // -Z
            p.Add(v[5], v[6], v[7], v[4]);   // +Z
            p.Add(v[4], v[7], v[3], v[0]);   // -X
            p.Add(v[1], v[2], v[6], v[5]);   // +X
            p.Add(v[3], v[7], v[6], v[2]);   // +Y
            p.Add(v[4], v[0], v[1], v[5]);   // -Y
            return p;
        }

        /// 円柱・円錐。rt が上（+Y）、rb が下（-Y）の半径。
        /// ★ three.js の CylinderGeometry(radiusTop, radiusBottom, …) と同じ並び。
        ///   取り違えると、毛束が「先が太く根元がとがった楔」になる（実際にやった）
        public static Piece Cyl(float rt, float rb, float h, int seg)
        {
            var p = new Piece();
            float y = h / 2;
            for (var i = 0; i < seg; i++)
            {
                float a0 = Mathf.PI * 2 * i / seg, a1 = Mathf.PI * 2 * (i + 1) / seg;
                Vector3 t0 = new Vector3(Mathf.Cos(a0) * rt, y, Mathf.Sin(a0) * rt);
                Vector3 t1 = new Vector3(Mathf.Cos(a1) * rt, y, Mathf.Sin(a1) * rt);
                Vector3 b0 = new Vector3(Mathf.Cos(a0) * rb, -y, Mathf.Sin(a0) * rb);
                Vector3 b1 = new Vector3(Mathf.Cos(a1) * rb, -y, Mathf.Sin(a1) * rb);
                if (rt > 0 && rb > 0) p.Add(b0, t0, t1, b1);
                else if (rt > 0) p.AddTri(b0, t0, t1);
                else p.AddTri(t0, b1, b0);
                if (rt > 0) p.AddTri(new Vector3(0, y, 0), t1, t0);     // 上ぶた
                if (rb > 0) p.AddTri(new Vector3(0, -y, 0), b0, b1);    // 下ぶた
            }
            return p;
        }

        public static Piece Cone(float r, float h, int seg) => Cyl(0, r, h, seg);

        /// 球。seg が経線、ring が緯線の数（three.js の SphereGeometry と同じ意味）
        public static Piece Sphere(float r, int seg, int ring)
        {
            var p = new Piece();
            for (var j = 0; j < ring; j++)
            {
                float p0 = Mathf.PI * j / ring, p1 = Mathf.PI * (j + 1) / ring;
                for (var i = 0; i < seg; i++)
                {
                    float a0 = Mathf.PI * 2 * i / seg, a1 = Mathf.PI * 2 * (i + 1) / seg;
                    Vector3 v00 = Pt(r, a0, p0), v01 = Pt(r, a1, p0);
                    Vector3 v10 = Pt(r, a0, p1), v11 = Pt(r, a1, p1);
                    if (j == 0) p.AddTri(v00, v10, v11);
                    else if (j == ring - 1) p.AddTri(v00, v10, v01);
                    else p.Add(v00, v10, v11, v01);
                }
            }
            return p;
        }

        static Vector3 Pt(float r, float a, float phi) =>
            new Vector3(r * Mathf.Sin(phi) * Mathf.Cos(a), r * Mathf.Cos(phi), r * Mathf.Sin(phi) * Mathf.Sin(a));

        /// 0〜1 に丸める。
        /// ★ 負を通すと Pow が NaN になり、その頂点が真っ黒に描かれる。
        ///   three.js 側で実際に壁が全部黒くなった（10 §5）。float なので同じ罠がある
        public static float Clamp01(float v) => v > 1 ? 1 : v > 0 ? v : 0;

        /// 部品をまとめて1つのメッシュにする。ここで陰を頂点カラーに焼く。
        /// <param name="top">この家具のいちばん高いところ（陰の勾配の基準）</param>
        public static Mesh Assemble(IEnumerable<Piece> pieces, float top = 1f, string name = "prop")
        {
            var verts = new List<Vector3>();
            var tris = new List<int>();
            var cols = new List<Color>();
            foreach (var p in pieces)
            {
                var off = verts.Count;
                foreach (var v in p.V)
                {
                    verts.Add(v);
                    // 低いところほど暗い。1つの勾配だけで脚の付け根や棚の内側が落ちる
                    var k = 0.62f + 0.38f * Mathf.Pow(Clamp01(v.y / top), 0.7f);
                    cols.Add(new Color(p.Color.r * k, p.Color.g * k, p.Color.b * k, 1f));
                }
                foreach (var t in p.T) tris.Add(t + off);
            }
            return Build(verts, tris, cols, name);
        }

        public static Mesh Build(List<Vector3> verts, List<int> tris, List<Color> cols, string name)
        {
            var m = new Mesh { name = name };
            if (verts.Count > 65000) m.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
            m.SetVertices(verts);
            m.SetTriangles(tris, 0);
            m.SetColors(cols);
            m.RecalculateNormals();
            m.RecalculateBounds();
            return m;
        }

        /// #RRGGBB を Color に。失敗したらマゼンタ（気づけるように）
        public static Color Hex(string hex) =>
            ColorUtility.TryParseHtmlString(hex, out var c) ? c : Color.magenta;
    }
}
