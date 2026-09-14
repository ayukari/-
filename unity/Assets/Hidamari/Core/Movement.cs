// 移動の確定 — docs/design/09-protocol.md §5.1
//
// ★ server/src/core/movement.js の写し。UnityEngine を参照しない。
//   クライアントは「進みたい向き」しか送れない。座標は送れない。
//   ここで確定させるのは**予測**であって、権威はサーバにある。
//   だからこそ、サーバと1三角形の狂いも無く同じでなければならない。
//
// ★ 写し元と一致していることは shared/golden/movement.tsv で見張る。
//   `dotnet run --project unity/Tests.Headless` か、Unity の EditMode テスト。
//
// ★ double で計算する。JS の Number は double なので、float にすると表と合わない。

namespace Hidamari.Core
{
    public struct MoveResult
    {
        public double X, Y, Dir;
        public bool Moved, Clamped;
    }

    public static class Movement
    {
        /// タイル/秒
        public const double Speed = 4.2;
        /// RTT のゆらぎを吸収する許容係数
        public const double Tolerance = 1.2;
        /// 一括移動を認めない上限（秒）
        public const double MaxStepSec = 0.25;

        public static MoveResult Resolve(Grid grid, double x, double y, double dir,
                                         double dx, double dy, double dtSec)
        {
            // 入力の正規化。壊れた値でクライアントが壊れないようにする
            dx = ClampUnit(dx);
            dy = ClampUnit(dy);
            var dt = System.Math.Min(System.Math.Max(dtSec, 0), MaxStepSec);

            var len = System.Math.Sqrt(dx * dx + dy * dy);
            if (len == 0 || dt == 0)
                return new MoveResult { X = x, Y = y, Dir = dir, Moved = false, Clamped = false };

            // want と max は同じ式から出るので step は常に want。
            // 写し元のまま残してある（許容係数を上げたくなったときここを触る）
            var want = Speed * dt;
            var max = Speed * dt * Tolerance;
            var step = System.Math.Min(want, max);

            var nx = x + (dx / len) * step;
            var ny = y + (dy / len) * step;

            // 軸ごとに判定する（壁ずり）。斜めに詰まって止まらないようにするため
            double ox = x, oy = y;
            var clamped = false;
            if (!grid.IsBlocked(nx, y)) ox = nx; else clamped = true;
            if (!grid.IsBlocked(ox, ny)) oy = ny; else clamped = true;

            return new MoveResult
            {
                X = ox,
                Y = oy,
                // ★ Atan2 の引数の順が JS と同じ (dx, dy) であること。
                //   C# の癖で (dy, dx) と書くと、向きだけが 90 度ずれる
                Dir = System.Math.Atan2(dx, dy),
                Moved = ox != x || oy != y,
                Clamped = clamped,
            };
        }

        /// クライアントが主張した座標が、直前の確定座標から到達可能か
        public static bool IsReachable(double px, double py, double nx, double ny, double dtSec)
        {
            var max = Speed * System.Math.Min(System.Math.Max(dtSec, 0), MaxStepSec) * Tolerance;
            var d = System.Math.Sqrt((nx - px) * (nx - px) + (ny - py) * (ny - py));
            return d <= max + 1e-9;
        }

        static double ClampUnit(double v)
        {
            // JS の Number.isFinite と同じ扱い。NaN も Infinity も 0 にする
            if (double.IsNaN(v) || double.IsInfinity(v)) return 0;
            return System.Math.Min(1, System.Math.Max(-1, v));
        }
    }
}
