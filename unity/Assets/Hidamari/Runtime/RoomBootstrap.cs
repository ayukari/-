// 部屋を1つ組み立てる。フロア定義を読んで、床・壁・天井・家具を置く。
//
// ★ 家具は種別ごとに1つの Mesh を共有する（10 §5: 同じ形は1ドローコール）。
//   数が増えてもドローコールは種類数のまま変わらない。

using System.Collections.Generic;
using System.IO;
using Hidamari.Core;
using UnityEngine;

namespace Hidamari.Runtime
{
    public sealed class RoomBootstrap : MonoBehaviour
    {
        [Tooltip("StreamingAssets の中のフロア定義。サーバに繋ぐまではこれを読む")]
        public string floorFile = "floor.json";

        public FloorDef Floor { get; private set; }
        public Grid Grid { get; private set; }

        void Start() => Build();

        public GameObject Build(string json = null)
        {
            json ??= ReadFloorJson();
            if (json == null) return null;
            Floor = FloorDef.Parse(json);
            Grid = Floor.MakeGrid();
            return BuildInto(gameObject, Floor, Grid);
        }

        string ReadFloorJson()
        {
            var p = Path.Combine(Application.streamingAssetsPath, floorFile);
            if (File.Exists(p)) return File.ReadAllText(p);
            Debug.LogError($"[ひだまり] フロア定義が無い: {p}\n" +
                           "`cd server && npm run dump:floor` で作って StreamingAssets に置く");
            return null;
        }

        /// 実際に組む。Editor のメニューからも呼ぶので static にしてある
        public static GameObject BuildInto(GameObject root, FloorDef floor, Grid grid)
        {
            foreach (Transform t in root.transform)
            {
                if (Application.isPlaying) Destroy(t.gameObject); else DestroyImmediate(t.gameObject);
            }

            // 頂点カラーだけで塗る。テクスチャは1枚も使わない（10 §2）
            var shader = Shader.Find("Hidamari/Room");
            if (shader == null)
            {
                Debug.LogError("[ひだまり] Hidamari/Room シェーダが見つからない。"
                    + "Assets/Hidamari/Runtime/Room.shader がインポートされているか確かめる");
                return root;
            }
            var mat = new Material(shader) { name = "ひだまり/部屋" };

            Add(root, "floor", RoomBuilder.Floor(grid, floor.objects, floor.areas), mat);
            Add(root, "walls", RoomBuilder.Walls(grid), mat);
            Add(root, "ceiling", RoomBuilder.Ceiling(grid.Width, grid.Height), mat);

            // 家具は種別ごとにまとめる
            var byKind = new Dictionary<string, List<FloorDef.ObjectDef>>();
            foreach (var o in floor.objects)
            {
                if (!byKind.TryGetValue(o.kind, out var list)) byKind[o.kind] = list = new List<FloorDef.ObjectDef>();
                list.Add(o);
            }
            foreach (var pair in byKind)
            {
                var mesh = Props.Get(pair.Key);
                if (mesh == null) continue;
                var parent = new GameObject(pair.Key);
                parent.transform.SetParent(root.transform, false);
                foreach (var o in pair.Value)
                {
                    var go = new GameObject(o.id);
                    go.transform.SetParent(parent.transform, false);
                    go.transform.SetPositionAndRotation(
                        new Vector3(o.x + 0.5f, 0, o.y + 0.5f), Quaternion.Euler(0, o.rot, 0));
                    go.AddComponent<MeshFilter>().sharedMesh = mesh;
                    go.AddComponent<MeshRenderer>().sharedMaterial = mat;
                }
            }
            return root;
        }

        static void Add(GameObject root, string name, Mesh mesh, Material mat)
        {
            var go = new GameObject(name);
            go.transform.SetParent(root.transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
        }
    }
}
