// エディタのメニューから部屋を組む。
//
// ★ .unity のシーンファイルを手で書き起こさない。
//   Unity の YAML を人が書くと壊れやすく、壊れたときに原因が分からない。
//   空のシーンにメニューから組むほうが、確かめるのも作り直すのも速い。

using Hidamari.Runtime;
using UnityEditor;
using UnityEngine;

namespace Hidamari.EditorTools
{
    public static class BuildRoomMenu
    {
        [MenuItem("ひだまり/部屋を組む %#h")]
        public static void BuildRoom()
        {
            var root = GameObject.Find("Room") ?? new GameObject("Room");
            var boot = root.GetComponent<RoomBootstrap>() ?? root.AddComponent<RoomBootstrap>();
            if (boot.Build() == null) return;

            var camGo = Camera.main != null ? Camera.main.gameObject : new GameObject("Main Camera");
            if (camGo.GetComponent<Camera>() == null) camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
            var rig = camGo.GetComponent<CameraRig>() ?? camGo.AddComponent<CameraRig>();
            rig.roomWidth = boot.Grid.Width;
            rig.roomHeight = boot.Grid.Height;
            rig.Apply(false);

            EnsureLights();
            Selection.activeGameObject = root;
            Debug.Log($"[ひだまり] 部屋を組んだ: {boot.Floor.name} " +
                      $"{boot.Grid.Width}×{boot.Grid.Height}・家具 {boot.Floor.objects.Count} 個");
        }

        /// 3灯。動的な影は焼かないので、光の当て方だけで立体を出す（10 §2）
        static void EnsureLights()
        {
            if (GameObject.Find("ひだまり/灯り") != null) return;
            var root = new GameObject("ひだまり/灯り");

            var key = new GameObject("key").AddComponent<Light>();
            key.transform.SetParent(root.transform);
            key.type = LightType.Directional;
            key.color = MeshKit.Hex("#FFF1DA");
            key.intensity = 1.15f;
            key.transform.rotation = Quaternion.Euler(50, -30, 0);
            key.shadows = LightShadows.None;

            var rim = new GameObject("rim").AddComponent<Light>();
            rim.transform.SetParent(root.transform);
            rim.type = LightType.Directional;
            rim.color = MeshKit.Hex("#BED4EC");
            rim.intensity = 0.45f;
            rim.transform.rotation = Quaternion.Euler(20, 160, 0);
            rim.shadows = LightShadows.None;

            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = MeshKit.Hex("#FFF3E4");
            RenderSettings.ambientEquatorColor = MeshKit.Hex("#E7E2D9");
            RenderSettings.ambientGroundColor = MeshKit.Hex("#C3A183");
        }
    }
}
