// 部屋の見た目はこれ1つ。テクスチャは1枚も使わない（10 §2）。
//
// ★ 色も陰も**頂点カラーに焼いてある**（RoomBuilder / MeshKit）。
//   シェーダがすることは「頂点カラーをそのまま Albedo にする」だけ。
//   URP の Unlit も Lit も頂点カラーを読まないので、自前で1枚持つ。
//
// ★ 組み込みレンダーパイプライン向け。URP を入れていないプロジェクトで開いても動く。
//   URP に移すときはここだけ書き換える（部屋の組み立て側は触らない）。

Shader "Hidamari/Room"
{
    Properties { _Tint ("Tint", Color) = (1,1,1,1) }

    SubShader
    {
        Tags { "RenderType" = "Opaque" }
        LOD 150

        CGPROGRAM
        #pragma surface surf Lambert vertex:vert
        #pragma target 3.0

        fixed4 _Tint;

        struct Input { fixed4 vcol; };

        void vert(inout appdata_full v, out Input o)
        {
            UNITY_INITIALIZE_OUTPUT(Input, o);
            o.vcol = v.color;
        }

        void surf(Input IN, inout SurfaceOutput o)
        {
            o.Albedo = IN.vcol.rgb * _Tint.rgb;
            o.Alpha = 1;
        }
        ENDCG
    }

    Fallback "Diffuse"
}
