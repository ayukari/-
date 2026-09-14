// カメラ — client/src/render3d.js のカメラ規則の移植。
//
// ★ 距離を手で決めない。**部屋の幅が画角に収まる距離**を毎フレーム計算する。
//   幅だけを見て引くと、縦持ちで画面の下半分が部屋の外になる。
//   奥行きだけを見て寄ると、横持ちで部屋の左右が切れる。両方の min を取る。

using UnityEngine;

namespace Hidamari.Runtime
{
    [RequireComponent(typeof(Camera))]
    public sealed class CameraRig : MonoBehaviour
    {
        /// 見下ろす角度。寝かせると床ばかり、立てると机の側面が消える
        public float pitchDeg = 56f;
        public int roomWidth = 20;
        public int roomHeight = 14;
        /// 追う相手。null なら部屋の中心を見る
        public Transform target;
        public float follow = 0.10f;

        Camera _cam;
        bool _ready;

        void Awake() => Setup();

        /// ★ エディタで AddComponent しても Awake は呼ばれない。
        ///   Awake 頼みにすると、メニューから組んだ直後だけカメラが設定されないまま残る。
        ///   使う側から必ず通るここで用意する
        Camera Setup()
        {
            if (_cam == null) _cam = GetComponent<Camera>();
            _cam.fieldOfView = 38f;                 // 画角を狭くすると遠近が弱まり、箱庭に見える
            _cam.nearClipPlane = 0.5f;
            _cam.farClipPlane = 140f;
            return _cam;
        }

        void LateUpdate() => Apply(Time.deltaTime > 0);

        public void Apply(bool smooth)
        {
            var cam = Setup();
            float pitch = pitchDeg * Mathf.Deg2Rad;
            float halfV = cam.fieldOfView * Mathf.Deg2Rad / 2;
            // ★ エディタでは aspect が 0 のことがある。0 で割ると距離が Infinity になり、
            //   カメラが原点から吹き飛んで「何も映らない」状態になる
            float aspect = cam.aspect > 0.01f ? cam.aspect : 16f / 9f;
            float tanH = Mathf.Tan(halfV) * aspect;

            float fitW = (roomWidth / 2f + 1.4f) / tanH;
            float fillD = (roomHeight / 2f + 0.6f) * Mathf.Sin(pitch) / Mathf.Tan(halfV);
            float dist = Mathf.Clamp(Mathf.Min(fitW, fillD), 13f, 27f);
            float h = dist * Mathf.Sin(pitch), d = dist * Mathf.Cos(pitch);

            // いま画面に入る広さ。これが部屋より広ければ追う必要はない
            float vw = dist * tanH;
            float vd = dist * Mathf.Tan(halfV) / Mathf.Sin(pitch);

            float mx = target != null ? target.position.x : roomWidth / 2f;
            float mz = target != null ? target.position.z : roomHeight / 2f;
            float cx = Mathf.Clamp(mx, Mathf.Min(vw, roomWidth / 2f), Mathf.Max(roomWidth - vw, roomWidth / 2f));
            float cz = Mathf.Clamp(mz, Mathf.Min(vd, roomHeight / 2f), Mathf.Max(roomHeight - vd, roomHeight / 2f));

            // 注視点を少し手前に。真ん中を見ると遠近のぶん手前が詰まって切れる
            var look = new Vector3(cx, 0.55f, cz + 0.9f);
            var want = new Vector3(cx, h, cz + d);
            transform.position = !_ready || !smooth
                ? want
                : Vector3.Lerp(transform.position, want, follow);
            _ready = true;
            transform.LookAt(look);
        }
    }
}
