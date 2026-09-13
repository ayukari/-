"""
アバターのパーツ一式を生成する — docs/design/10-assets.md

    blender --background --python assets/avatar.blend.py -- --out client/assets

■ 何を書き出すか
    体型ごとに1ファイル（avatar-body-{0,1,2}.glb）。
    中には「素体・髪・トップス・ボトムス・靴・小物」が別メッシュで入っていて、
    すべて同じ骨と同じ3クリップを共有する。

    クライアント（client/src/avatar.js）が、その人に合うパーツだけを選んで
    **1つのジオメトリに統合してから描く**。だからパーツを増やしても
    1人1ドローコールのまま変わらない。

■ 作りの決まり（10 §2 / §4）
    - テクスチャを1枚も使わない。色は全部 頂点カラー
    - 頂点カラーのアルファに「部位ID」を入れる。クライアントが色を塗り替える
    - マテリアルは1つだけ
    - 素体は「服から出る所」だけを持つ（頭・首・手・前腕・すね・素足）。
      胴と腿はトップス／ボトムス側が持つ。二重に描かないため

■ 寸法規約
    1ユニット = 1タイル ≒ 1.0m。全高 1.67m。+Z が正面（glTF 変換後）
"""
import bpy, math, sys, os
from mathutils import Vector

# ---- 部位ID。client/src/avatar.js の PART と対応する ----
SKIN, HAIR, TOP, BOTTOM, SHOES, EYE, WHITE, MOUTH, BLUSH, ACC, ACC2, DARK = range(12)
PART_N = 16

DEFAULT = {
    SKIN:  (0.98, 0.85, 0.76), HAIR:   (0.30, 0.22, 0.20), TOP:   (0.82, 0.55, 0.28),
    BOTTOM:(0.30, 0.34, 0.42), SHOES:  (0.22, 0.20, 0.22), EYE:   (0.17, 0.16, 0.26),
    WHITE: (1.00, 1.00, 1.00), MOUTH:  (0.72, 0.38, 0.38), BLUSH: (0.99, 0.72, 0.70),
    ACC:   (0.86, 0.36, 0.40), ACC2:   (0.93, 0.93, 0.95), DARK:  (0.16, 0.15, 0.17),
}

H = 1.67
EYE_Z = 1.428
FRINGE_Z = 1.515
HIP_Z, CHEST_Z, NECK_Z = 0.86, 1.24, 1.30
HEAD_Z, HEAD_R = 1.47, 0.20
HEAD_RX, HEAD_RY, HEAD_RZ = HEAD_R, HEAD_R * 0.94, HEAD_R * 1.02
CHIN_TOP, CHIN_LEN, CHIN_K = 1.45, 0.24, 0.30
SHOULDER_X, HIP_X = 0.165, 0.072
KNEE_Z, ANKLE_Z = 0.50, 0.095
ELBOW_Z, WRIST_Z = 0.975, 0.745
FRONT = -1.0

srgb = lambda c: tuple(v ** 2.2 for v in c)
D = math.radians


# ---------------------------------------------------------------- 下ごしらえ
def chin_k(z):
    t = max(0.0, (CHIN_TOP - z) / CHIN_LEN)
    return 1.0 - CHIN_K * t * t


def face_y(x, z, out=0.003):
    """(x,z) における頭の表面の y。顔の部品はここに貼る（手で深さを決めない）"""
    k = chin_k(z)
    q = 1.0 - ((z - HEAD_Z) / HEAD_RZ) ** 2 - (x / (k * HEAD_RX)) ** 2
    return FRONT * 0.02 if q <= 0 else FRONT * (k * HEAD_RY * math.sqrt(q) + out)


def face_yaw(x, z):
    """その位置の頭の表面が向いている角度。板を傾けて頭に沿わせる"""
    k = chin_k(z)
    return math.degrees(math.asin(max(-0.99, min(0.99, x / (k * HEAD_RX)))))


def tag(o, part, color=None):
    me = o.data
    col = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    r, g, b = srgb(color or DEFAULT[part])
    a = (part + 0.5) / PART_N
    for i in range(len(me.vertices)):
        col.data[i].color = (r, g, b, a)
    return o


def piece(o, part, bone, color=None):
    """1部品を仕上げる。座標を焼き、色（＝部位ID）を入れ、1本の骨に結びつける"""
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    tag(o, part, color)
    o.vertex_groups.new(name=bone).add(range(len(o.data.vertices)), 1.0, 'REPLACE')
    return o


def sphere(r, loc, scale=(1, 1, 1), seg=10, ring=6):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc)
    o = bpy.context.object; o.scale = scale
    for pl in o.data.polygons:
        pl.use_smooth = True          # 球だけ滑らかに。角ばった部品はフラットのまま
    return o


def cone(r1, r2, depth, loc, verts=8):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc)
    return bpy.context.object


def box(loc, scale, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    o = bpy.context.object
    o.scale = scale
    o.rotation_euler = tuple(D(v) for v in rot)
    return o


def disc(r, loc, scale=(1, 1, 1), verts=6, tilt=0.0):
    bpy.ops.mesh.primitive_circle_add(vertices=verts, radius=r, fill_type='NGON', location=loc)
    o = bpy.context.object
    o.rotation_euler = (D(90), 0, D(tilt))
    o.scale = scale
    return o


def torus(major, minor, loc, rot=(0, 0, 0), seg=10, ring=3):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                     major_segments=seg, minor_segments=ring,
                                     location=loc, rotation=tuple(D(v) for v in rot))
    o = bpy.context.object
    for pl in o.data.polygons:
        pl.use_smooth = True
    return o


def join(objs, name):
    objs = [o for o in objs if o]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.object
    o.name = o.data.name = name
    return o


def carve(o, z_min, y_max):
    """前髪の下端を切り揃える。球をそのまま被せると目まで覆ってしまう"""
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for v in o.data.vertices:
        if v.co.y < y_max and v.co.z < z_min:
            v.co.z = z_min
    return o


def limb(r1, r2, z0, z1, x, part, bone, cap=True, verts=8, color=None):
    ps = [cone(r1, r2, z0 - z1, (x, 0, (z0 + z1) / 2), verts)]
    if cap:
        ps.append(sphere(r1, (x, 0, z0), seg=6, ring=4))
    return piece(join(ps, 'tmp'), part, bone, color)


# ================================================================ 素体
def build_base(w):
    """服から出る所も、服の下に隠れる所も持つ細身の体。衣服はこの上に被せる"""
    ps = []

    # --- 頭 ---
    head = sphere(HEAD_R, (0, 0, HEAD_Z), (1.0, 0.94, 1.02), 12, 7)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for v in head.data.vertices:                 # あごをすぼめる
        k = chin_k(v.co.z)
        v.co.x *= k
        v.co.y *= k
    ps.append(piece(head, SKIN, 'head'))
    ps.append(piece(cone(0.062, 0.058, 0.10, (0, 0, NECK_Z - 0.02), 6), SKIN, 'neck'))

    # --- 顔。すべて face_y() で頭の表面に貼る ---
    EX, BROW_Z, MOUTH_Z, BLUSH_Z = 0.078, 1.484, 1.376, 1.390
    for s in (1, -1):
        x = s * EX
        yaw = face_yaw(x, EYE_Z)
        ps.append(piece(disc(0.040, (x, face_y(x, EYE_Z, 0.006), EYE_Z),
                             (0.78, 1.06, 1), 10, tilt=yaw), EYE, 'head'))
        ps.append(piece(disc(0.0125, (x + s * 0.011, face_y(x, EYE_Z, 0.013), EYE_Z + 0.014),
                             (1, 1, 1), 6, tilt=yaw), WHITE, 'head'))
        ps.append(piece(disc(0.028, (x, face_y(x, BROW_Z, 0.005), BROW_Z),
                             (1.25, 0.15, 1), 4, tilt=face_yaw(x, BROW_Z)), HAIR, 'head'))
        bx = s * 0.118
        ps.append(piece(disc(0.028, (bx, face_y(bx, BLUSH_Z, 0.004), BLUSH_Z),
                             (1.0, 0.50, 1), 6, tilt=face_yaw(bx, BLUSH_Z)), BLUSH, 'head'))
    ps.append(piece(disc(0.018, (0, face_y(0, MOUTH_Z, 0.004), MOUTH_Z), (1.2, 0.55, 1), 6),
                    MOUTH, 'head'))

    # --- 胴（服の下。細め） ---
    # 胴と腰は必ずトップス／ボトムスに隠れる。隙間を埋めるだけの最小形にする
    ps.append(piece(cone(0.138 * w, 0.166 * w, CHEST_Z - HIP_Z + 0.02,
                         (0, 0, (HIP_Z + CHEST_Z) / 2), 6), SKIN, 'chest'))
    ps.append(piece(sphere(0.140 * w, (0, 0, HIP_Z + 0.015), (1, 0.85, 0.8), 6, 4),
                    SKIN, 'hips'))

    # --- 腕 ---
    for s, side in ((1, 'L'), (-1, 'R')):
        x = s * SHOULDER_X * w
        # 肩の丸みはトップス側が持っているので、素体側には要らない
        ps.append(limb(0.050 * w, 0.044 * w, ARM_TOP, ELBOW_Z, x, SKIN, f'upperarm.{side}',
                       cap=False, verts=6))
        ps.append(limb(0.044 * w, 0.040 * w, ELBOW_Z, WRIST_Z, x, SKIN, f'lowerarm.{side}', verts=6))
        ps.append(piece(sphere(0.048 * w, (x, 0, WRIST_Z - 0.033), (1, 0.85, 1.05), 6, 4),
                        SKIN, f'hand.{side}'))

    # --- 脚と素足 ---
    for s, side in ((1, 'L'), (-1, 'R')):
        x = s * HIP_X * w
        ps.append(limb(0.070 * w, 0.056 * w, HIP_Z - 0.03, KNEE_Z, x, SKIN, f'upperleg.{side}',
                       cap=False, verts=6))
        ps.append(limb(0.056 * w, 0.045 * w, KNEE_Z, ANKLE_Z, x, SKIN, f'lowerleg.{side}', verts=6))
        ps.append(piece(box((x, FRONT * 0.018, 0.036), (0.092, 0.132, 0.072)), SKIN, f'foot.{side}'))

    return join(ps, 'base')


# ================================================================ 髪
def hair_cap(ps, vol=1.0, line=FRINGE_Z):
    """頭に被さる部分。vol で毛量を変える。上から見下ろすカメラでは、
    ここの大きさの差が髪型の違いとしていちばん効く"""
    cap = sphere(HEAD_R * (1.04 + 0.06 * vol), (0, 0.008 * vol, HEAD_Z + 0.020 * vol),
                 (1.0, 1.0, 0.97), 10, 6)
    ps.append(piece(carve(cap, line, -0.02), HAIR, 'head'))


def fringe(ps, kind, vol=1.0):
    if kind == 'none':
        return
    if kind == 'straight':
        ps.append(piece(sphere(HEAD_R * 0.84 * vol, (0, FRONT * 0.075, FRINGE_Z + 0.072),
                               (1.12, 0.92, 0.54), 10, 4), HAIR, 'head'))
    elif kind == 'parted':
        for s in (1, -1):                       # 真ん中を空けて分け目を見せる
            ps.append(piece(sphere(HEAD_R * 0.50 * vol, (s * 0.078, FRONT * 0.068, FRINGE_Z + 0.090),
                                   (0.92, 0.92, 0.70), 8, 4), HAIR, 'head'))
    elif kind == 'swept':
        ps.append(piece(sphere(HEAD_R * 0.86 * vol, (0.052, FRONT * 0.068, FRINGE_Z + 0.082),
                               (1.05, 0.92, 0.58), 10, 4), HAIR, 'head'))
        ps.append(piece(sphere(HEAD_R * 0.36, (-0.112, FRONT * 0.075, FRINGE_Z + 0.018),
                               (0.80, 0.85, 1.25), 6, 4), HAIR, 'head'))
    elif kind == 'spiky':
        for x, hgt in ((-0.095, 0.13), (-0.034, 0.17), (0.034, 0.17), (0.095, 0.13)):
            ps.append(piece(cone(0.040, 0.005, hgt, (x, FRONT * 0.055, FRINGE_Z + 0.055 + hgt / 2), 5),
                            HAIR, 'head'))
    elif kind == 'curly':
        for x, z in ((-0.086, 0.050), (-0.030, 0.082), (0.030, 0.082), (0.086, 0.050)):
            ps.append(piece(sphere(HEAD_R * 0.30, (x, FRONT * 0.068, FRINGE_Z + z),
                                   (1, 1, 0.95), 6, 4), HAIR, 'head'))


def sides(ps, length):
    if length <= 0:
        return
    for s in (1, -1):
        ps.append(piece(sphere(HEAD_R * 0.32, (s * 0.162, FRONT * 0.030,
                                               HEAD_Z + 0.010 - 0.085 * (length - 1)),
                               (0.78, 0.92, length), 6, 4), HAIR, 'head'))


def back(ps, vol):
    if vol <= 0:
        return
    ps.append(piece(sphere(HEAD_R * 0.62, (0, 0.140, HEAD_Z - 0.030 - 0.16 * vol),
                           (1.02, 0.74, 0.55 + 1.5 * vol), 8, 5), HAIR, 'head'))


def extra_hair(ps, kind):
    if kind is None:
        return
    if kind == 'pony':
        ps.append(piece(sphere(HEAD_R * 0.40, (0, 0.195, HEAD_Z + 0.050), (0.85, 0.9, 0.92), 8, 5),
                        HAIR, 'head'))
        ps.append(piece(cone(HEAD_R * 0.30, HEAD_R * 0.09, 0.32, (0, 0.245, HEAD_Z - 0.115), 6),
                        HAIR, 'head'))
    elif kind == 'sidetail':
        ps.append(piece(cone(HEAD_R * 0.28, HEAD_R * 0.09, 0.30, (0.165, 0.115, HEAD_Z - 0.130), 6),
                        HAIR, 'head'))
    elif kind == 'twin':
        for s in (1, -1):
            ps.append(piece(sphere(HEAD_R * 0.26, (s * 0.185, 0.075, HEAD_Z + 0.060),
                                   (0.9, 0.9, 0.9), 6, 4), HAIR, 'head'))
            ps.append(piece(cone(HEAD_R * 0.24, HEAD_R * 0.08, 0.28, (s * 0.205, 0.095, HEAD_Z - 0.095), 6),
                            HAIR, 'head'))
    elif kind == 'bun':
        ps.append(piece(sphere(HEAD_R * 0.42, (0, 0.135, HEAD_Z + 0.150), (1, 1, 0.9), 8, 5),
                        HAIR, 'head'))
    elif kind == 'braid':
        for i in range(3):
            ps.append(piece(sphere(HEAD_R * (0.26 - i * 0.04), (0, 0.175, HEAD_Z - 0.13 - i * 0.115),
                                   (0.85, 0.85, 1.0), 6, 4), HAIR, 'head'))
    elif kind == 'wave':
        for s in (1, -1):
            ps.append(piece(sphere(HEAD_R * 0.30, (s * 0.150, 0.105, HEAD_Z - 0.325),
                                   (0.8, 0.8, 1.1), 6, 4), HAIR, 'head'))


# name,     前髪,        横の長さ, 後ろの量, 追加,       毛量
HAIR_DEFS = [
    ('short',  'straight', 0.95, 0.0, None,       1.00),
    ('parted', 'parted',   1.00, 0.0, None,       1.02),
    ('bob',    'straight', 1.85, 0.6, None,       1.06),
    ('long',   'straight', 3.00, 1.4, None,       1.06),
    ('pony',   'swept',    1.05, 0.2, 'pony',     1.00),
    ('twin',   'straight', 1.20, 0.2, 'twin',     1.00),
    ('bun',    'parted',   0.90, 0.2, 'bun',      0.98),
    ('braid',  'straight', 1.60, 0.8, 'braid',    1.02),
    ('spiky',  'spiky',    0.80, 0.0, None,       0.94),
    ('wavy',   'swept',    2.40, 1.1, 'wave',     1.14),
    ('buzz',   'none',     0.00, 0.0, None,       0.82),
    ('curly',  'curly',    1.10, 0.4, None,       1.16),
    ('half',   'parted',   2.00, 1.0, 'bun',      1.06),
    ('side',   'swept',    1.40, 0.5, 'sidetail', 1.03),
]


def build_hair(i):
    name, fr, side, bk, ex, vol = HAIR_DEFS[i]
    ps = []
    hair_cap(ps, vol, FRINGE_Z + (0.055 if fr == 'none' else 0.0))
    fringe(ps, fr, vol)
    sides(ps, side)
    back(ps, bk)
    extra_hair(ps, ex)
    return join(ps, f'hair_{i:02d}')


# ================================================================ トップス
SLEEVE_END = 0.78          # 袖を伸ばしきったときの下端
ARM_TOP = CHEST_Z - 0.045


def top_r(z, rb, rt, z0, z1):
    """胴の円錐の、その高さでの半径"""
    k = max(0.0, min(1.0, (z - z0) / max(1e-6, z1 - z0)))
    return rb + (rt - rb) * k


def front_y(z, rb, rt, z0, z1, out=0.006):
    """前身頃の飾り（前立て・ポケット・合わせ）を置く y。

    固定の深さに置いていたときは、胴の太さが変わる服（ジャケット・パーカー）で
    飾りが中に埋もれて見えなかった。高さごとに表面を計算して外に出す。
    """
    return FRONT * (top_r(z, rb, rt, z0, z1) + out)


def collar_of(ps, kind, w, t):
    if kind == 'crew':
        ps.append(piece(sphere(0.070, (0, 0, CHEST_Z + 0.012), (1.05, 1.0, 0.35), 6, 4), TOP, 'chest'))
    elif kind == 'wide':
        ps.append(piece(sphere(0.092, (0, 0, CHEST_Z - 0.012), (1.15, 1.0, 0.22), 6, 4), TOP, 'chest'))
    elif kind == 'turtle':
        ps.append(piece(cone(0.072, 0.070, 0.11, (0, 0, CHEST_Z + 0.038), 6), TOP, 'chest'))
    elif kind == 'shirt':
        for s in (1, -1):
            ps.append(piece(box((s * 0.048, FRONT * 0.072, CHEST_Z - 0.020),
                                (0.085, 0.050, 0.075), rot=(0, 0, s * 18)), TOP, 'chest'))
    elif kind == 'open':
        pass          # 前合わせは build_top 側で胴の表面に沿わせて作る
    elif kind == 'vneck':
        ps.append(piece(disc(0.055, (0, FRONT * 0.130 * w, CHEST_Z - 0.055), (1.0, 1.3, 1), 3),
                        SKIN, 'chest'))


TOP_DEFS = [
    # name,       sleeve, thick, collar,   hem,  extra
    ('tee',       0.32, 1.00, 'crew',   0.00, None),
    ('longtee',   1.00, 1.00, 'crew',   0.00, None),
    ('tank',      0.00, 0.96, 'wide',   0.00, None),
    ('hoodie',    1.00, 1.12, 'hood',   0.03, 'pocket'),
    ('shirt',     0.95, 1.02, 'shirt',  0.02, 'placket'),
    ('sweater',   1.00, 1.16, 'turtle', 0.02, None),
    ('cardigan',  0.98, 1.12, 'open',   0.04, 'inner'),
    ('dress',     0.30, 1.02, 'crew',   0.00, 'skirt'),
    ('jacket',    1.00, 1.20, 'open',   0.03, 'zip'),
    ('vest',      0.00, 1.12, 'vneck',  0.02, 'inner'),
]


def build_top(i, w):
    name, sleeve, thick, collar, hem, extra = TOP_DEFS[i]
    ps = []
    rb, rt = 0.150 * w * thick, 0.178 * w * thick
    z0, z1 = HIP_Z - hem, CHEST_Z

    ps.append(piece(cone(rb, rt, z1 - z0, (0, 0, (z0 + z1) / 2), 8), TOP, 'chest'))
    ps.append(piece(sphere(rt, (0, 0, z1 - 0.045), (1, 0.86, 0.74), 8, 5), TOP, 'chest'))
    ps.append(piece(sphere(rb, (0, 0, z0 + 0.015), (1, 0.88, 0.42), 6, 4), TOP, 'hips'))
    collar_of(ps, collar, w, thick)

    # 袖
    for s, side in ((1, 'L'), (-1, 'R')):
        x = s * SHOULDER_X * w
        ps.append(piece(sphere(0.060 * w * thick, (x, 0, ARM_TOP), (1, 0.9, 0.95), 6, 4),
                        TOP, f'upperarm.{side}'))     # 肩は袖が無くても要る
        if sleeve <= 0:
            continue
        end = ARM_TOP - sleeve * (ARM_TOP - SLEEVE_END)
        if end < ELBOW_Z:
            ps.append(limb(0.058 * w * thick, 0.050 * w * thick, ARM_TOP, ELBOW_Z, x,
                           TOP, f'upperarm.{side}', cap=False, verts=6))
            ps.append(limb(0.050 * w * thick, 0.046 * w * thick, ELBOW_Z, end, x,
                           TOP, f'lowerarm.{side}', cap=False, verts=6))
        else:
            ps.append(limb(0.058 * w * thick, 0.052 * w * thick, ARM_TOP, end, x,
                           TOP, f'upperarm.{side}', cap=False, verts=6))

    if collar == 'hood':
        ps.append(piece(sphere(0.072, (0, 0, CHEST_Z + 0.012), (1.10, 1.0, 0.38), 6, 4), TOP, 'chest'))
        ps.append(piece(sphere(0.135, (0, 0.085, CHEST_Z + 0.010), (1.05, 0.82, 0.62), 8, 4),
                        TOP, 'chest'))
    fy = lambda z, out=0.006: front_y(z, rb, rt, z0, z1, out)

    if collar == 'open':
        # 前を開けた形。差し色の当て布を V に置き、両脇に合わせの縁を立てる
        zc = CHEST_Z - 0.060
        ps.append(piece(disc(0.060, (0, fy(zc, 0.004), zc), (1.0, 1.5, 1), 3), ACC2, 'chest'))
        for s in (1, -1):
            for k in range(2):              # 太さが変わるので短く分けて表面に沿わせる
                zz = HIP_Z + 0.085 + k * 0.17
                ps.append(piece(box((s * 0.050, fy(zz), zz), (0.034, 0.022, 0.175)), TOP, 'chest'))
    if extra == 'pocket':
        zz = HIP_Z + 0.085
        ps.append(piece(box((0, fy(zz, 0.010), zz), (0.150, 0.026, 0.090)), TOP, 'chest'))
    if extra == 'placket':
        for k in range(2):
            zz = HIP_Z + 0.090 + k * 0.17
            ps.append(piece(box((0, fy(zz), zz), (0.030, 0.022, 0.175)), ACC2, 'chest'))
    if extra == 'zip':
        for k in range(2):
            zz = HIP_Z + 0.090 + k * 0.17
            ps.append(piece(box((0, fy(zz), zz), (0.018, 0.020, 0.175)), DARK, 'chest'))
    if extra == 'inner':
        # 前開きの中に見える1枚。開けた合わせの間に差し色を出す
        for k in range(2):
            zz = HIP_Z + 0.100 + k * 0.16
            ps.append(piece(box((0, fy(zz, 0.002), zz), (0.076, 0.018, 0.165)), ACC2, 'chest'))
    if extra == 'skirt':
        ps.append(piece(cone(0.158 * w, 0.218 * w, 0.34, (0, 0, HIP_Z - 0.115), 10), TOP, 'hips'))

    return join(ps, f'top_{i:02d}')


# ================================================================ ボトムス
BOTTOM_DEFS = [
    # name,        len,  flare, kind,    extra
    ('pants',      1.00, 1.00, 'pants',  None),
    ('shorts',     0.30, 1.08, 'pants',  None),
    ('crop',       0.78, 1.02, 'pants',  None),
    ('wide',       1.00, 1.34, 'pants',  None),
    ('legging',    1.00, 0.90, 'pants',  None),
    ('skirt',      0.42, 1.00, 'skirt',  None),
    ('longskirt',  0.80, 1.00, 'skirt',  None),
    ('cargo',      1.00, 1.12, 'pants',  'pocket'),
]


def build_bottom(i, w):
    name, ln, flare, kind, extra = BOTTOM_DEFS[i]
    ps = []
    top_z = HIP_Z + 0.035
    ps.append(piece(sphere(0.152 * w, (0, 0, HIP_Z + 0.010), (1, 0.88, 0.78), 8, 4),
                    BOTTOM, 'hips'))

    if kind == 'skirt':
        depth = 0.16 + 0.42 * ln
        ps.append(piece(cone(0.150 * w, (0.185 + 0.09 * ln) * w, depth,
                             (0, 0, top_z - depth / 2), 10), BOTTOM, 'hips'))
    else:
        end = HIP_Z - ln * (HIP_Z - (ANKLE_Z + 0.012))
        for s, side in ((1, 'L'), (-1, 'R')):
            x = s * HIP_X * w
            if end < KNEE_Z:
                ps.append(limb(0.082 * w * flare, 0.068 * w * flare, HIP_Z - 0.02, KNEE_Z, x,
                               BOTTOM, f'upperleg.{side}', cap=False, verts=6))
                ps.append(limb(0.068 * w * flare, 0.062 * w * flare, KNEE_Z, end, x,
                               BOTTOM, f'lowerleg.{side}', cap=False, verts=6))
            else:
                ps.append(limb(0.082 * w * flare, 0.072 * w * flare, HIP_Z - 0.02, end, x,
                               BOTTOM, f'upperleg.{side}', cap=False, verts=6))

    if extra == 'pocket':
        # 腿の横ポケット。トップスに隠れない位置なので、どの服と合わせても見える
        # （最初はサロペットの胸当てにしていたが、厚い上着の中に埋もれて見えなかった）
        for s, side in ((1, 'L'), (-1, 'R')):
            ps.append(piece(box((s * (HIP_X * w + 0.080 * flare), FRONT * 0.010, HIP_Z - 0.185),
                                (0.030, 0.105, 0.105)), DARK, f'upperleg.{side}'))

    return join(ps, f'bottom_{i:02d}')


# ================================================================ 靴
# name, 高さ, 奥行き, 幅（m）
SHOE_DEFS = [
    ('sneaker', 0.090, 0.215, 0.104),
    ('loafer',  0.066, 0.208, 0.098),
    ('boot',    0.200, 0.205, 0.102),
    ('sandal',  0.052, 0.210, 0.100),
    ('hightop', 0.140, 0.212, 0.106),
]


def build_shoe(i, w):
    name, h, toe, wd = SHOE_DEFS[i]
    ps = []
    for s, side in ((1, 'L'), (-1, 'R')):
        x = s * HIP_X * w
        # ★ 寸法はそのまま「幅・奥行き・高さ」。素足（0.092 × 0.132）より一回り大きくする
        ps.append(piece(box((x, FRONT * 0.020, h / 2), (wd * w, toe, h)), SHOES, f'foot.{side}'))
        if h > 0.10:                        # 長い靴は足首側を細くして脚に沿わせる
            ps.append(piece(cone(0.058 * w, 0.052 * w, h * 0.9, (x, 0, h * 0.95), 6),
                            SHOES, f'lowerleg.{side}'))
        else:
            ps.append(piece(box((x, FRONT * 0.024, 0.014), (wd * 1.06 * w, toe * 1.04, 0.028)),
                            DARK, f'foot.{side}'))
    return join(ps, f'shoe_{i:02d}')


# ================================================================ 小物
ACC_DEFS = ['none', 'glasses', 'headphones', 'cap', 'beanie', 'ribbon', 'scarf', 'hairpin']


def build_acc(i, w):
    """小物。上から見下ろすカメラでも正面からも見えるように、
    髪より外側（頭の半径 × 1.2 以上）に置く。
    最初の版は帽子が髪に埋もれ、マフラーはあごに隠れて見えなかった。
    """
    kind = ACC_DEFS[i]
    if kind == 'none':
        return None
    ps = []
    HAIR_OUT = HEAD_R * 1.11        # いちばん毛量の多い髪型の外径

    if kind == 'glasses':
        for s in (1, -1):
            x = s * 0.080
            ps.append(piece(torus(0.050, 0.007, (x, face_y(x, EYE_Z, 0.016), EYE_Z),
                                  rot=(90, 0, face_yaw(x, EYE_Z)), seg=8, ring=3), DARK, 'head'))
        ps.append(piece(box((0, face_y(0, EYE_Z, 0.014), EYE_Z + 0.008), (0.062, 0.010, 0.009)),
                        DARK, 'head'))
        for s in (1, -1):
            ps.append(piece(box((s * 0.150, 0.020, EYE_Z + 0.014), (0.012, 0.170, 0.010)),
                            DARK, 'head'))

    elif kind == 'headphones':
        # 頭をまたぐ弓。下半分は頭の中に入るので、見えるのは上の弧だけ
        ps.append(piece(torus(HEAD_R * 1.20, 0.020, (0, 0.010, HEAD_Z + 0.030),
                              rot=(90, 0, 0), seg=12, ring=3), DARK, 'head'))
        for s in (1, -1):
            ps.append(piece(sphere(0.062, (s * HEAD_R * 1.22, 0.010, HEAD_Z + 0.010),
                                   (0.55, 1, 1), 8, 5), ACC, 'head'))

    elif kind == 'cap':
        ps.append(piece(sphere(HEAD_R * 1.24, (0, 0.010, HEAD_Z + 0.100), (1, 1, 0.70), 10, 5),
                        ACC, 'head'))
        ps.append(piece(box((0, FRONT * 0.238, HEAD_Z + 0.152), (0.250, 0.205, 0.026),
                            rot=(-5, 0, 0)), ACC, 'head'))

    elif kind == 'beanie':
        ps.append(piece(sphere(HEAD_R * 1.25, (0, 0.006, HEAD_Z + 0.104), (1, 1, 0.84), 10, 5),
                        ACC, 'head'))
        ps.append(piece(cone(HEAD_R * 1.27, HEAD_R * 1.23, 0.060, (0, 0.006, HEAD_Z + 0.070), 10),
                        ACC2, 'head'))

    elif kind == 'ribbon':
        # 横につける。正面と見下ろしの両方から見える位置
        cx, cz = 0.140, HEAD_Z + 0.150
        for s in (1, -1):
            ps.append(piece(sphere(0.056, (cx + s * 0.052, 0.020, cz + s * 0.026),
                                   (1, 0.55, 0.85), 6, 4), ACC, 'head'))
        ps.append(piece(sphere(0.026, (cx, 0.018, cz), (1, 1, 1), 5, 3), ACC, 'head'))

    elif kind == 'scarf':
        # あごの下に隠れないよう、首より少し下・少し太く
        ps.append(piece(torus(0.118, 0.042, (0, 0, NECK_Z - 0.040), seg=10, ring=4), ACC, 'neck'))
        ps.append(piece(box((0.058, FRONT * 0.165, CHEST_Z - 0.105), (0.078, 0.040, 0.215)),
                        ACC, 'chest'))

    elif kind == 'hairpin':
        for k in range(2):
            x = 0.098
            ps.append(piece(box((x, face_y(x, FRINGE_Z + 0.050, 0.030) - k * 0.002,
                                 FRINGE_Z + 0.066 - k * 0.036),
                                (0.078, 0.014, 0.014), rot=(0, 0, 16)), ACC, 'head'))
    return join(ps, f'acc_{i:02d}')


# ================================================================ 骨
BONES = [
    ('root',  (0, 0, 0),            (0, 0, 0.10),          None),
    ('hips',  (0, 0, HIP_Z),        (0, 0, HIP_Z + 0.09),  'root'),
    ('spine', (0, 0, HIP_Z + 0.09), (0, 0, 1.10),          'hips'),
    ('chest', (0, 0, 1.10),         (0, 0, CHEST_Z),       'spine'),
    ('neck',  (0, 0, CHEST_Z),      (0, 0, NECK_Z),        'chest'),
    ('head',  (0, 0, NECK_Z),       (0, 0, H),             'neck'),
]
for _s, _side in ((1, 'L'), (-1, 'R')):
    _x = _s * SHOULDER_X
    BONES += [
        (f'upperarm.{_side}', (_x, 0, ARM_TOP),  (_x, 0, ELBOW_Z), 'chest'),
        (f'lowerarm.{_side}', (_x, 0, ELBOW_Z),  (_x, 0, WRIST_Z), f'upperarm.{_side}'),
        (f'hand.{_side}',     (_x, 0, WRIST_Z),  (_x, 0, 0.665),   f'lowerarm.{_side}'),
    ]
for _s, _side in ((1, 'L'), (-1, 'R')):
    _x = _s * HIP_X
    BONES += [
        (f'upperleg.{_side}', (_x, 0, HIP_Z - 0.03), (_x, 0, KNEE_Z),  'hips'),
        (f'lowerleg.{_side}', (_x, 0, KNEE_Z),       (_x, 0, ANKLE_Z), f'upperleg.{_side}'),
        (f'foot.{_side}',     (_x, 0, ANKLE_Z),      (_x, FRONT * 0.13, 0.05), f'lowerleg.{_side}'),
    ]
assert len(BONES) == 18, len(BONES)


def build_armature():
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = 'rig'
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    eb.remove(eb[0])
    for name, head, tail, parent in BONES:
        b = eb.new(name)
        b.head, b.tail, b.roll = Vector(head), Vector(tail), 0.0
        if parent:
            b.parent = eb[parent]
            b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


# ================================================================ 動き
def key(arm, frame, pose):
    for name, val in pose.items():
        if name.endswith('@loc'):
            pb = arm.pose.bones[name[:-4]]
            pb.location = Vector(val)
            pb.keyframe_insert('location', frame=frame)
        else:
            pb = arm.pose.bones[name]
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (D(val[0]), D(val[1]), D(val[2]))
            pb.keyframe_insert('rotation_euler', frame=frame)


def new_action(arm, name):
    if not arm.animation_data:
        arm.animation_data_create()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data.action = act
    return act


def stash(arm, act, name):
    arm.animation_data.action = None
    tr = arm.animation_data.nla_tracks.new()
    tr.name = name
    tr.strips.new(name, int(act.frame_range[0]), act)


def rest(arm):
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)


def anim_idle(arm):
    """立ち。呼吸で胸と肩がわずかに動く。止まって見えないことが大事"""
    act = new_action(arm, 'idle')
    rest(arm)
    A = 8.0
    for f, k in ((1, 0.0), (31, 1.0), (61, 0.0)):
        key(arm, f, {
            'hips@loc': (0, 0, -0.010 * k),
            'chest': (1.2 * k, 0, 0), 'neck': (-0.8 * k, 0, 0),
            'head': (1.5 * k - 0.7, 0, 2.0 * math.sin(k * math.pi)),
            'upperarm.L': (2.5 * k, 0, -A), 'upperarm.R': (2.5 * k, 0, A),
            'lowerarm.L': (3.0 * k, 0, -2), 'lowerarm.R': (3.0 * k, 0, 2),
        })
    return act


def anim_walk(arm):
    """歩き。24フレーム = 0.8秒で1往復"""
    act = new_action(arm, 'walk')
    rest(arm)
    A, STEP, KNEE, SWING = 6.0, 22.0, 32.0, 17.0
    for i in range(25):
        p = i / 24.0 * math.tau
        sw = math.sin(p)
        key(arm, i + 1, {
            'hips@loc': (0, 0, -0.018 * abs(math.sin(p * 2 + math.pi / 2)) - 0.004),
            'hips': (0, 0, 2.2 * math.sin(p)),
            'chest': (2.0, 0, -1.6 * math.sin(p)), 'head': (-1.2, 0, 0),
            'upperleg.L': (STEP * sw, 0, 0), 'upperleg.R': (-STEP * sw, 0, 0),
            'lowerleg.L': (-KNEE * max(0.0, -sw) - 5.0, 0, 0),
            'lowerleg.R': (-KNEE * max(0.0, sw) - 5.0, 0, 0),
            'foot.L': (12.0 * max(0.0, -sw), 0, 0), 'foot.R': (12.0 * max(0.0, sw), 0, 0),
            'upperarm.L': (-SWING * sw, 0, -A), 'upperarm.R': (SWING * sw, 0, A),
            'lowerarm.L': (-10.0 + 8.0 * sw, 0, -2), 'lowerarm.R': (-10.0 - 8.0 * sw, 0, 2),
        })
    return act


def anim_sit(arm):
    """着席。椅子の座面 0.42m に合わせて腰を落とす。
    すねは腿から見て「下へ」曲げる（walk と符号が逆）"""
    act = new_action(arm, 'sit')
    rest(arm)
    pose = {
        'hips@loc': (0, 0, -0.39),
        'hips': (-7, 0, 0), 'chest': (6, 0, 0), 'head': (-3, 0, 0),
        'upperleg.L': (-80, 0, 4), 'upperleg.R': (-80, 0, -4),
        'lowerleg.L': (78, 0, 0), 'lowerleg.R': (78, 0, 0),
        'foot.L': (2, 0, 0), 'foot.R': (2, 0, 0),
        'upperarm.L': (-16, 0, -10), 'upperarm.R': (-16, 0, 10),
        'lowerarm.L': (-34, 0, -4), 'lowerarm.R': (-34, 0, 4),
    }
    key(arm, 1, pose)
    key(arm, 31, dict(pose, **{'chest': (7.5, 0, 0), 'head': (-2, 0, 1.5),
                               'hips@loc': (0, 0, -0.383)}))
    key(arm, 61, pose)
    return act


# ================================================================ 組み立てと書き出し
def material():
    m = bpy.data.materials.new('avatar')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 1.0
    bsdf.inputs['Metallic'].default_value = 0.0
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], bsdf.inputs['Base Color'])
    # ★ アルファを使う経路が無いと、エクスポータが COLOR_0 を VEC3 に落とす。
    #   部位IDはそのアルファに入っているので、落ちると全員が同じ色になる
    nt.links.new(ca.outputs['Alpha'], bsdf.inputs['Alpha'])
    m.blend_method = 'BLEND'
    m.use_backface_culling = True
    return m


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def scene(animated):
    """空のシーンに骨を立てる。動きは共通ファイルにだけ入れる"""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    arm = build_armature()
    if animated:
        for fn, name in ((anim_idle, 'idle'), (anim_walk, 'walk'), (anim_sit, 'sit')):
            stash(arm, fn(arm), name)
        rest(arm)
    return arm


def attach(arm, meshes):
    mat = material()
    for m in meshes:
        m.data.materials.append(mat)
        m.parent = arm
        m.modifiers.new('Armature', 'ARMATURE').object = arm
    return meshes


def build_common():
    """体型に依らないパーツ（髪・靴・小物）と、3つのクリップ。

    ★ 体型ごとのファイルに入れると同じ形が3回ダウンロードされる。
      骨の並びは全ファイルで同じなので、クライアントはここの骨に全部を結びつけられる。
    """
    arm = scene(animated=True)
    meshes = [build_hair(i) for i in range(len(HAIR_DEFS))]
    meshes += [build_shoe(i, 1.0) for i in range(len(SHOE_DEFS))]
    meshes += [m for m in (build_acc(i, 1.0) for i in range(len(ACC_DEFS))) if m]
    return arm, attach(arm, meshes)


def build_body(variant):
    """体型に依るパーツ（素体・トップス・ボトムス）"""
    arm = scene(animated=False)
    w = [0.90, 1.0, 1.12][variant]
    meshes = [build_base(w)]
    meshes += [build_top(i, w) for i in range(len(TOP_DEFS))]
    meshes += [build_bottom(i, w) for i in range(len(BOTTOM_DEFS))]
    return arm, attach(arm, meshes)


def export(arm, meshes, path):
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = arm
    opts = dict(filepath=path, export_format='GLB', use_selection=True,
                export_apply=True, export_animations=True, export_nla_strips=True,
                export_yup=True, export_skins=True, export_normals=True,
                export_materials='EXPORT', export_texcoords=False,
                export_force_sampling=True, export_frame_range=False)
    for extra in ({'export_vertex_color': 'ACTIVE'}, {'export_colors': True}, {}):
        try:
            bpy.ops.export_scene.gltf(**opts, **extra)
            return
        except TypeError:
            continue
    raise SystemExit('glTF エクスポータの引数が合わない')


def worst_case(groups):
    """いちばん重い組み合わせ。これが 10 §4 の上限に収まっていればよい"""
    by = {}
    for meshes in groups:
        for m in meshes:
            by.setdefault(m.name.split('_')[0], []).append(tris(m))
    total = by['base'][0]
    for kind in ('hair', 'top', 'bottom', 'shoe', 'acc'):
        total += max(by.get(kind, [0]))
    return total, by


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out = argv[argv.index('--out') + 1] if '--out' in argv else 'client/assets'
    os.makedirs(out, exist_ok=True)

    sizes, groups, names = {}, [], []
    arm, meshes = build_common()
    path = os.path.abspath(os.path.join(out, 'avatar-common.glb'))
    export(arm, meshes, path)
    sizes['avatar-common.glb'] = os.path.getsize(path)
    groups.append([(m.name, tris(m)) for m in meshes])
    common_n = len(meshes)

    body_n = 0
    for v in range(3):
        arm, meshes = build_body(v)
        path = os.path.abspath(os.path.join(out, f'avatar-body-{v}.glb'))
        export(arm, meshes, path)
        sizes[f'avatar-body-{v}.glb'] = os.path.getsize(path)
        if v == 0:
            groups.append([(m.name, tris(m)) for m in meshes])
        body_n = len(meshes)

    by = {}
    for g in groups:
        for name, t in g:
            by.setdefault(name.split('_')[0], []).append(t)
    worst = by['base'][0] + sum(max(by.get(k, [0])) for k in ('hair', 'top', 'bottom', 'shoe', 'acc'))

    for f, n in sizes.items():
        print(f'{f:22s} {n/1024:7.1f} KB')
    for kind in ('base', 'hair', 'top', 'bottom', 'shoe', 'acc'):
        xs = by.get(kind, [])
        if xs:
            print(f'  {kind:7s} {len(xs):2d}種  三角形 {min(xs):4d}〜{max(xs):4d}')

    total = sum(sizes.values())
    parts = common_n + body_n * 3
    combos = 3 * len(HAIR_DEFS) * len(TOP_DEFS) * len(BOTTOM_DEFS) * len(SHOE_DEFS) * len(ACC_DEFS)
    print(f'パーツ {parts}（うち共通 {common_n}）  '
          f'最重の組合せ {worst} 三角形  形の組合せ {combos:,} 通り')
    print(f'ダウンロード {total/1024:.1f} KB / アバターの取り分 1,229 KB（10 §1）')


main()
