// 家具 — client/src/props.js の PROPS の移植。
//
// ★ 形の定義は three.js 側と数字まで揃えてある。
//   「Unity 版は少し違う部屋」にすると、論理（タイル）と表現がずれたときに
//   どちらが正しいのか分からなくなる。10 §5 の寸法規約は1つ。
//
// ★ すべて「タイルの中心が原点・床が y=0・+Z が正面」で作る。
//   置く向きは呼び出し側が Y 回転で与える。

using System.Collections.Generic;
using UnityEngine;

namespace Hidamari.Runtime
{
    public static class C
    {
        public static readonly Color WoodLight = MeshKit.Hex("#C6A57C");
        public static readonly Color Wood = MeshKit.Hex("#A9865C");
        public static readonly Color WoodDark = MeshKit.Hex("#6F5639");
        public static readonly Color WoodWarm = MeshKit.Hex("#B8865A");
        public static readonly Color Metal = MeshKit.Hex("#8E94A1");
        public static readonly Color MetalDark = MeshKit.Hex("#5A606C");
        public static readonly Color FabricWarm = MeshKit.Hex("#C07E5E");
        public static readonly Color FabricCool = MeshKit.Hex("#6F8C9C");
        public static readonly Color FabricCream = MeshKit.Hex("#E0D2BC");
        public static readonly Color FabricSage = MeshKit.Hex("#8AA08A");
        public static readonly Color Felt = MeshKit.Hex("#C3CCD1");
        public static readonly Color RugWarm = MeshKit.Hex("#B0705C");
        public static readonly Color RugField = MeshKit.Hex("#E6D8C2");
        public static readonly Color Leaf = MeshKit.Hex("#5D8C58");
        public static readonly Color LeafDark = MeshKit.Hex("#456B44");
        public static readonly Color Pot = MeshKit.Hex("#B4705A");
        public static readonly Color Soil = MeshKit.Hex("#4A3B30");
        public static readonly Color ScreenOn = MeshKit.Hex("#8FB8CE");
        public static readonly Color Paper = MeshKit.Hex("#F3EEE4");
        public static readonly Color Ink = MeshKit.Hex("#3A3F47");
        public static readonly Color Glass = MeshKit.Hex("#BFD9EA");
        public static readonly Color Sky = MeshKit.Hex("#CFE3F0");
        public static readonly Color White = MeshKit.Hex("#EFEFEA");
        public static readonly Color Dark = MeshKit.Hex("#2C2A2D");
        public static readonly Color Accent = MeshKit.Hex("#C8873C");
        public static readonly Color Accent2 = MeshKit.Hex("#7A6FA8");
        public static readonly Color Red = MeshKit.Hex("#B25F6A");
        public static readonly Color Teal = MeshKit.Hex("#4F8299");
    }

    public static class Props
    {
        public const float DeskH = 0.72f, SeatH = 0.42f;

        static readonly Dictionary<string, Mesh> Cache = new Dictionary<string, Mesh>();

        /// 種別ごとのメッシュを1回だけ作る（10 §5: 同じ形は1ドローコール）
        public static Mesh Get(string kind)
        {
            if (Cache.TryGetValue(kind, out var m)) return m;
            m = Make(kind);
            Cache[kind] = m;
            return m;
        }

        public static void ClearCache() => Cache.Clear();

        /// 決まった種の乱数。props.js の rnd() と同じ漸化式（形を揃えるため）
        sealed class Rnd
        {
            long _x;
            public Rnd(int seed) { _x = seed; }
            public float Next() { _x = (_x * 1103515245 + 12345) & 0x7fffffff; return (float)_x / 0x7fffffff; }
        }

        static Piece B(float w, float h, float d, Color c, Vector3 pos, Vector3 rot = default, Vector3 sc = default)
            => MeshKit.Box(w, h, d).Place(pos, rot, sc).Paint(c);
        static Piece Cy(float rt, float rb, float h, int seg, Color c, Vector3 pos, Vector3 rot = default)
            => MeshKit.Cyl(rt, rb, h, seg).Place(pos, rot).Paint(c);
        static Piece Sp(float r, int seg, int ring, Color c, Vector3 pos, Vector3 rot = default, Vector3 sc = default)
            => MeshKit.Sphere(r, seg, ring).Place(pos, rot, sc).Paint(c);
        static Piece Cn(float r, float h, int seg, Color c, Vector3 pos, Vector3 rot = default)
            => MeshKit.Cone(r, h, seg).Place(pos, rot).Paint(c);

        static Mesh Make(string kind)
        {
            var ps = new List<Piece>();
            switch (kind)
            {
                case "desk":
                    ps.Add(B(1.86f, 0.055f, 0.86f, C.WoodLight, new Vector3(0, DeskH, 0)));
                    ps.Add(B(1.80f, 0.03f, 0.80f, C.Wood, new Vector3(0, DeskH - 0.05f, 0)));
                    foreach (var (x, z) in Legs(0.86f, 0.37f))
                        ps.Add(B(0.07f, DeskH, 0.07f, C.WoodDark, new Vector3(x, DeskH / 2, z)));
                    ps.Add(B(1.70f, 0.30f, 0.04f, C.Wood, new Vector3(0, 0.42f, -0.38f)));   // 幕板
                    return MeshKit.Assemble(ps, DeskH + 0.06f, kind);

                case "seat":      // 席は椅子と同じ形。当たり判定だけ持たない
                case "chair":
                    ps.Add(B(0.46f, 0.07f, 0.44f, C.WoodLight, new Vector3(0, SeatH, 0)));
                    ps.Add(B(0.44f, 0.42f, 0.055f, C.WoodLight, new Vector3(0, SeatH + 0.26f, -0.20f), new Vector3(5.7f, 0, 0)));
                    foreach (var (x, z) in Legs(0.18f, 0.17f))
                        ps.Add(Cy(0.022f, 0.026f, SeatH, 6, C.MetalDark, new Vector3(x, SeatH / 2, z)));
                    return MeshKit.Assemble(ps, SeatH + 0.5f, kind);

                case "monitor":
                    ps.Add(B(0.60f, 0.36f, 0.035f, C.Dark, new Vector3(0, DeskH + 0.30f, -0.02f)));
                    ps.Add(B(0.55f, 0.31f, 0.01f, C.ScreenOn, new Vector3(0, DeskH + 0.30f, 0.005f)));
                    ps.Add(Cy(0.03f, 0.03f, 0.14f, 8, C.Metal, new Vector3(0, DeskH + 0.08f, -0.02f)));
                    ps.Add(B(0.26f, 0.018f, 0.16f, C.Metal, new Vector3(0, DeskH + 0.01f, -0.02f)));
                    return MeshKit.Assemble(ps, DeskH + 0.5f, kind);

                case "laptop":
                    ps.Add(B(0.34f, 0.018f, 0.24f, C.Metal, new Vector3(0, DeskH + 0.03f, 0.03f)));
                    ps.Add(B(0.33f, 0.22f, 0.012f, C.Dark, new Vector3(0, DeskH + 0.14f, -0.08f), new Vector3(-12.6f, 0, 0)));
                    ps.Add(B(0.30f, 0.19f, 0.006f, C.ScreenOn, new Vector3(0, DeskH + 0.14f, -0.072f), new Vector3(-12.6f, 0, 0)));
                    return MeshKit.Assemble(ps, DeskH + 0.3f, kind);

                case "mug":
                    ps.Add(Cy(0.042f, 0.036f, 0.10f, 10, C.White, new Vector3(0, DeskH + 0.05f, 0)));
                    ps.Add(Cy(0.038f, 0.038f, 0.01f, 10, C.Accent, new Vector3(0, DeskH + 0.098f, 0)));
                    return MeshKit.Assemble(ps, DeskH + 0.12f, kind);

                case "plant":
                {
                    var r = new Rnd(7);
                    for (var i = 0; i < 9; i++)
                    {
                        float a = (i / 9f) * Mathf.PI * 2 + r.Next() * 0.4f;
                        float lean = 0.45f + r.Next() * 0.5f, len = 0.42f + r.Next() * 0.28f;
                        ps.Add(Sp(0.5f, 6, 4, i % 2 == 1 ? C.Leaf : C.LeafDark,
                            new Vector3(Mathf.Sin(a) * len * 0.42f, 0.46f + len * 0.42f * Mathf.Cos(lean), Mathf.Cos(a) * len * 0.42f),
                            new Vector3(lean * Mathf.Cos(a) * Mathf.Rad2Deg, -a * Mathf.Rad2Deg, -lean * Mathf.Sin(a) * Mathf.Rad2Deg),
                            new Vector3(0.19f, 0.09f, len * 0.62f)));
                    }
                    ps.Add(Cn(0.24f, 0.34f, 10, C.Pot, new Vector3(0, 0.17f, 0), new Vector3(180, 0, 0)));
                    ps.Add(Cy(0.21f, 0.21f, 0.05f, 10, C.Soil, new Vector3(0, 0.33f, 0)));
                    return MeshKit.Assemble(ps, 1.1f, kind);
                }

                case "plantS":
                    ps.Add(Cy(0.07f, 0.055f, 0.10f, 8, C.Pot, new Vector3(0, DeskH + 0.05f, 0)));
                    ps.Add(Sp(0.09f, 8, 6, C.Leaf, new Vector3(0, DeskH + 0.16f, 0), default, new Vector3(1, 0.85f, 1)));
                    return MeshKit.Assemble(ps, DeskH + 0.28f, kind);

                case "shelf":
                {
                    var r = new Rnd(3);
                    for (var s = 0; s < 3; s++)
                    {
                        float x = -0.42f;
                        while (x < 0.38f)
                        {
                            float w = 0.035f + r.Next() * 0.03f, h = 0.20f + r.Next() * 0.08f;
                            var c = new[] { C.Red, C.Teal, C.Accent, C.Accent2, C.FabricCream, C.LeafDark }[(int)(r.Next() * 6)];
                            ps.Add(B(w, h, 0.20f, c, new Vector3(x + w / 2, 0.30f + s * 0.42f + h / 2, 0)));
                            x += w + 0.006f;
                        }
                    }
                    ps.Add(B(1.00f, 1.50f, 0.30f, C.Wood, new Vector3(0, 0.75f, -0.02f)));
                    for (var i = 0; i < 4; i++)
                        ps.Add(B(0.96f, 0.035f, 0.30f, C.WoodLight, new Vector3(0, 0.28f + i * 0.42f, 0.01f)));
                    return MeshKit.Assemble(ps, 1.5f, kind);
                }

                case "sofa":
                    ps.Add(B(1.80f, 0.32f, 0.82f, C.FabricWarm, new Vector3(0, 0.28f, 0)));
                    ps.Add(B(1.80f, 0.52f, 0.20f, C.FabricWarm, new Vector3(0, 0.62f, -0.31f), new Vector3(6.9f, 0, 0)));
                    ps.Add(B(0.18f, 0.28f, 0.82f, C.FabricWarm, new Vector3(-0.81f, 0.58f, 0)));
                    ps.Add(B(0.18f, 0.28f, 0.82f, C.FabricWarm, new Vector3(0.81f, 0.58f, 0)));
                    ps.Add(B(0.80f, 0.10f, 0.70f, C.FabricCream, new Vector3(-0.42f, 0.48f, 0.03f)));
                    ps.Add(B(0.80f, 0.10f, 0.70f, C.FabricCream, new Vector3(0.42f, 0.48f, 0.03f)));
                    foreach (var (x, z) in Legs(0.72f, 0.30f))
                        ps.Add(Cy(0.035f, 0.03f, 0.12f, 6, C.WoodDark, new Vector3(x, 0.06f, z)));
                    return MeshKit.Assemble(ps, 0.9f, kind);

                case "lowTable":
                    ps.Add(B(1.10f, 0.05f, 0.62f, C.WoodLight, new Vector3(0, 0.38f, 0)));
                    ps.Add(B(1.00f, 0.03f, 0.54f, C.Wood, new Vector3(0, 0.20f, 0)));
                    foreach (var (x, z) in Legs(0.48f, 0.25f))
                        ps.Add(B(0.05f, 0.38f, 0.05f, C.WoodDark, new Vector3(x, 0.19f, z)));
                    return MeshKit.Assemble(ps, 0.45f, kind);

                case "rug":
                    ps.Add(B(2.90f, 0.012f, 1.90f, C.RugWarm, new Vector3(0, 0.006f, 0)));
                    ps.Add(B(2.62f, 0.014f, 1.64f, C.RugField, new Vector3(0, 0.009f, 0)));
                    ps.Add(B(2.62f, 0.016f, 0.16f, C.RugWarm, new Vector3(0, 0.011f, -0.46f)));
                    ps.Add(B(2.62f, 0.016f, 0.16f, C.RugWarm, new Vector3(0, 0.011f, 0.46f)));
                    ps.Add(B(1.30f, 0.018f, 0.34f, C.FabricSage, new Vector3(0, 0.013f, 0)));
                    return MeshKit.Assemble(ps, 0.05f, kind);

                case "rugBig":
                    ps.Add(B(4.86f, 0.012f, 3.86f, C.FabricSage, new Vector3(0, 0.006f, 0)));
                    ps.Add(B(4.58f, 0.014f, 3.58f, C.RugField, new Vector3(0, 0.009f, 0)));
                    ps.Add(B(4.58f, 0.016f, 0.18f, C.FabricSage, new Vector3(0, 0.011f, -1.42f)));
                    ps.Add(B(4.58f, 0.016f, 0.18f, C.FabricSage, new Vector3(0, 0.011f, 1.42f)));
                    return MeshKit.Assemble(ps, 0.05f, kind);

                case "lamp":
                    ps.Add(Cy(0.18f, 0.20f, 0.03f, 12, C.MetalDark, new Vector3(0, 0.015f, 0)));
                    ps.Add(Cy(0.022f, 0.022f, 1.30f, 6, C.Metal, new Vector3(0, 0.65f, 0)));
                    ps.Add(Cy(0.16f, 0.24f, 0.28f, 12, C.FabricCream, new Vector3(0, 1.40f, 0)));
                    ps.Add(Cy(0.15f, 0.15f, 0.02f, 12, C.ScreenOn, new Vector3(0, 1.27f, 0)));
                    return MeshKit.Assemble(ps, 1.6f, kind);

                case "pendant":
                    ps.Add(Cy(0.012f, 0.012f, 1.05f, 5, C.MetalDark, new Vector3(0, 2.36f, 0)));
                    ps.Add(Cy(0.09f, 0.34f, 0.30f, 12, C.Accent, new Vector3(0, 1.74f, 0)));
                    ps.Add(Cy(0.31f, 0.31f, 0.02f, 12, C.ScreenOn, new Vector3(0, 1.60f, 0)));
                    return MeshKit.Assemble(ps, 2.9f, kind);

                case "cabinet":
                    ps.Add(B(1.00f, 0.80f, 0.42f, C.Wood, new Vector3(0, 0.40f, 0)));
                    ps.Add(B(0.46f, 0.66f, 0.03f, C.WoodLight, new Vector3(-0.25f, 0.42f, 0.21f)));
                    ps.Add(B(0.46f, 0.66f, 0.03f, C.WoodLight, new Vector3(0.25f, 0.42f, 0.21f)));
                    ps.Add(Cy(0.018f, 0.018f, 0.10f, 6, C.Metal, new Vector3(-0.06f, 0.42f, 0.24f), new Vector3(0, 0, 90)));
                    ps.Add(Cy(0.018f, 0.018f, 0.10f, 6, C.Metal, new Vector3(0.06f, 0.42f, 0.24f), new Vector3(0, 0, 90)));
                    ps.Add(B(1.04f, 0.04f, 0.46f, C.WoodLight, new Vector3(0, 0.82f, 0)));
                    return MeshKit.Assemble(ps, 0.86f, kind);

                case "partition":
                    ps.Add(B(0.96f, 1.24f, 0.05f, C.Felt, new Vector3(0, 0.74f, 0)));
                    ps.Add(B(1.02f, 1.34f, 0.03f, C.WoodLight, new Vector3(0, 0.73f, -0.02f)));
                    ps.Add(B(1.04f, 0.06f, 0.12f, C.WoodDark, new Vector3(0, 0.05f, 0)));
                    ps.Add(B(1.04f, 0.05f, 0.10f, C.WoodLight, new Vector3(0, 1.42f, 0)));
                    return MeshKit.Assemble(ps, 1.45f, kind);

                /* --- 壁に付くもの。壁は -Z 側にある前提 --- */
                case "window":
                    ps.Add(B(1.70f, 1.25f, 0.06f, C.White, new Vector3(0, 1.25f, -0.44f)));
                    ps.Add(B(1.52f, 1.08f, 0.02f, C.Sky, new Vector3(0, 1.25f, -0.41f)));
                    ps.Add(B(0.05f, 1.08f, 0.03f, C.White, new Vector3(0, 1.25f, -0.40f)));
                    ps.Add(B(1.52f, 0.05f, 0.03f, C.White, new Vector3(0, 1.25f, -0.40f)));
                    ps.Add(B(1.84f, 0.06f, 0.20f, C.WoodLight, new Vector3(0, 0.62f, -0.38f)));
                    return MeshKit.Assemble(ps, 1.95f, kind);

                case "poster":
                    ps.Add(B(0.66f, 0.90f, 0.03f, C.Paper, new Vector3(0, 1.35f, -0.45f)));
                    ps.Add(B(0.54f, 0.50f, 0.01f, C.Accent, new Vector3(0, 1.50f, -0.43f)));
                    ps.Add(B(0.54f, 0.10f, 0.01f, C.Ink, new Vector3(0, 1.12f, -0.43f)));
                    return MeshKit.Assemble(ps, 1.9f, kind);

                case "clock":
                    ps.Add(Cy(0.17f, 0.17f, 0.05f, 16, C.White, new Vector3(0, 1.70f, -0.44f), new Vector3(90, 0, 0)));
                    ps.Add(B(0.02f, 0.11f, 0.01f, C.Ink, new Vector3(0, 1.75f, -0.41f)));
                    ps.Add(B(0.08f, 0.02f, 0.01f, C.Ink, new Vector3(0.03f, 1.70f, -0.41f)));
                    return MeshKit.Assemble(ps, 1.9f, kind);

                case "whiteboard":
                    ps.Add(B(1.90f, 1.15f, 0.05f, C.White, new Vector3(0, 1.30f, -0.44f)));
                    ps.Add(B(1.98f, 0.06f, 0.08f, C.Metal, new Vector3(0, 0.70f, -0.42f)));
                    ps.Add(B(1.80f, 1.02f, 0.01f, C.Paper, new Vector3(0, 1.32f, -0.41f)));
                    ps.Add(B(0.70f, 0.05f, 0.005f, C.Teal, new Vector3(-0.4f, 1.60f, -0.40f)));
                    ps.Add(B(0.50f, 0.05f, 0.005f, C.Red, new Vector3(-0.5f, 1.46f, -0.40f)));
                    return MeshKit.Assemble(ps, 1.95f, kind);

                case "board":
                    ps.Add(B(1.30f, 0.90f, 0.05f, C.WoodDark, new Vector3(0, 1.25f, -0.44f)));
                    ps.Add(B(1.18f, 0.78f, 0.01f, C.FabricCream, new Vector3(0, 1.25f, -0.41f)));
                    ps.Add(B(0.22f, 0.28f, 0.008f, C.Paper, new Vector3(-0.32f, 1.34f, -0.40f)));
                    ps.Add(B(0.22f, 0.28f, 0.008f, C.Paper, new Vector3(0.02f, 1.22f, -0.40f), new Vector3(0, 0, 4.6f)));
                    ps.Add(B(0.22f, 0.28f, 0.008f, C.Accent, new Vector3(0.34f, 1.36f, -0.40f), new Vector3(0, 0, -3.4f)));
                    return MeshKit.Assemble(ps, 1.8f, kind);

                case "note":
                    ps.Add(B(0.46f, 0.62f, 0.05f, C.WoodLight, new Vector3(0, 1.05f, 0)));
                    ps.Add(B(0.38f, 0.52f, 0.01f, C.Paper, new Vector3(0, 1.08f, 0.031f)));
                    ps.Add(Cy(0.03f, 0.03f, 0.90f, 6, C.MetalDark, new Vector3(0, 0.45f, 0)));
                    ps.Add(Cy(0.16f, 0.18f, 0.04f, 10, C.MetalDark, new Vector3(0, 0.02f, 0)));
                    return MeshKit.Assemble(ps, 1.4f, kind);

                case "sign":
                    ps.Add(B(0.52f, 0.34f, 0.05f, C.Accent, new Vector3(0, 1.18f, 0)));
                    ps.Add(B(0.44f, 0.26f, 0.01f, C.Paper, new Vector3(0, 1.18f, 0.031f)));
                    ps.Add(Cy(0.025f, 0.025f, 1.02f, 6, C.Metal, new Vector3(0, 0.51f, 0)));
                    ps.Add(Cy(0.14f, 0.16f, 0.035f, 10, C.MetalDark, new Vector3(0, 0.018f, 0)));
                    return MeshKit.Assemble(ps, 1.4f, kind);

                case "counter":
                    ps.Add(B(1.90f, 0.90f, 0.62f, C.Wood, new Vector3(0, 0.45f, 0)));
                    ps.Add(B(2.00f, 0.06f, 0.70f, C.WoodLight, new Vector3(0, 0.93f, 0)));
                    ps.Add(B(1.80f, 0.03f, 0.58f, C.WoodDark, new Vector3(0, 0.62f, 0)));
                    ps.Add(B(0.36f, 0.30f, 0.26f, C.Dark, new Vector3(-0.55f, 1.11f, -0.06f)));
                    ps.Add(B(0.30f, 0.06f, 0.22f, C.Metal, new Vector3(-0.55f, 0.99f, -0.06f)));
                    ps.Add(Cy(0.09f, 0.09f, 0.20f, 10, C.Glass, new Vector3(-0.55f, 1.06f, 0.10f)));
                    var mugs = new[] { C.White, C.Accent, C.Teal };
                    for (var i = 0; i < 3; i++)
                        ps.Add(Cy(0.042f, 0.036f, 0.10f, 8, mugs[i], new Vector3(0.22f + i * 0.16f, 1.01f, 0.08f)));
                    ps.Add(Cy(0.10f, 0.12f, 0.22f, 10, C.FabricCream, new Vector3(0.78f, 1.07f, -0.04f)));
                    return MeshKit.Assemble(ps, 1.2f, kind);

                case "cooler":
                    ps.Add(B(0.34f, 0.90f, 0.34f, C.White, new Vector3(0, 0.45f, 0)));
                    ps.Add(B(0.24f, 0.16f, 0.04f, C.MetalDark, new Vector3(0, 0.72f, 0.17f)));
                    ps.Add(Cy(0.14f, 0.11f, 0.34f, 10, C.Glass, new Vector3(0, 1.10f, 0)));
                    ps.Add(Cy(0.07f, 0.09f, 0.08f, 10, C.Metal, new Vector3(0, 0.92f, 0)));
                    return MeshKit.Assemble(ps, 1.3f, kind);

                case "rack":
                    ps.Add(Cy(0.03f, 0.03f, 1.62f, 8, C.MetalDark, new Vector3(-0.55f, 0.81f, 0)));
                    ps.Add(Cy(0.03f, 0.03f, 1.62f, 8, C.MetalDark, new Vector3(0.55f, 0.81f, 0)));
                    ps.Add(Cy(0.02f, 0.02f, 1.16f, 6, C.Metal, new Vector3(0, 1.58f, 0), new Vector3(0, 0, 90)));
                    ps.Add(B(0.14f, 0.10f, 0.34f, C.MetalDark, new Vector3(-0.55f, 0.05f, 0)));
                    ps.Add(B(0.14f, 0.10f, 0.34f, C.MetalDark, new Vector3(0.55f, 0.05f, 0)));
                    ps.Add(B(0.26f, 0.72f, 0.14f, C.FabricCool, new Vector3(-0.30f, 1.16f, 0)));
                    ps.Add(B(0.26f, 0.72f, 0.14f, C.Red, new Vector3(0.02f, 1.16f, 0)));
                    ps.Add(B(0.26f, 0.72f, 0.14f, C.LeafDark, new Vector3(0.32f, 1.16f, 0)));
                    return MeshKit.Assemble(ps, 1.7f, kind);

                case "beanbag":
                    ps.Add(Sp(0.46f, 10, 7, C.FabricCool, new Vector3(0, 0.30f, 0), default, new Vector3(1, 0.62f, 1)));
                    ps.Add(Sp(0.34f, 10, 6, C.FabricCool, new Vector3(0, 0.46f, -0.10f), default, new Vector3(1, 0.70f, 1)));
                    return MeshKit.Assemble(ps, 0.7f, kind);

                case "cushion":
                    ps.Add(B(0.62f, 0.14f, 0.62f, C.FabricWarm, new Vector3(0, 0.07f, 0)));
                    ps.Add(B(0.50f, 0.03f, 0.50f, C.FabricCream, new Vector3(0, 0.15f, 0)));
                    return MeshKit.Assemble(ps, 0.2f, kind);

                case "books":
                    ps.Add(B(0.30f, 0.05f, 0.22f, C.Red, new Vector3(0, 0.025f, 0)));
                    ps.Add(B(0.28f, 0.05f, 0.21f, C.Teal, new Vector3(0.01f, 0.075f, 0.01f)));
                    ps.Add(B(0.29f, 0.05f, 0.22f, C.Accent, new Vector3(-0.01f, 0.125f, -0.01f), new Vector3(0, 6.9f, 0)));
                    ps.Add(B(0.26f, 0.04f, 0.20f, C.FabricCream, new Vector3(0, 0.17f, 0), new Vector3(0, -4.6f, 0)));
                    return MeshKit.Assemble(ps, 0.22f, kind);

                case "crate":
                    ps.Add(B(0.56f, 0.40f, 0.50f, C.WoodWarm, new Vector3(0, 0.20f, 0)));
                    ps.Add(B(0.58f, 0.04f, 0.52f, C.WoodDark, new Vector3(0, 0.40f, 0)));
                    ps.Add(B(0.44f, 0.34f, 0.40f, C.Wood, new Vector3(0.04f, 0.59f, -0.03f), new Vector3(0, 12.6f, 0)));
                    ps.Add(B(0.46f, 0.04f, 0.42f, C.WoodDark, new Vector3(0.04f, 0.77f, -0.03f), new Vector3(0, 12.6f, 0)));
                    return MeshKit.Assemble(ps, 0.8f, kind);

                default:
                    Debug.LogWarning($"[ひだまり] 知らない家具の種別: {kind}（props.js にあって Props.cs に無い）");
                    return null;
            }
        }

        static IEnumerable<(float, float)> Legs(float x, float z)
        {
            yield return (-x, -z); yield return (x, -z); yield return (-x, z); yield return (x, z);
        }
    }
}
