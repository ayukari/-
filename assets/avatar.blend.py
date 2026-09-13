"""
アバターの生成 — docs/design/10-assets.md の寸法規約・予算に合わせて手続き的に作る。

    blender --background --python assets/avatar.blend.py -- --out client/assets

なぜ手続き的に作るのか:
  - 寸法規約（1タイル = 1ユニット ≒ 1.0m、+Z が正面）を人手で守らせない
  - ライセンスの出所が問題にならない（10 §7 の「商用可・改変可・再配布可」を自前で満たす）
  - 予算（三角形数・ドローコール・DLサイズ）を測りながら作れる

作りの方針:
  - テクスチャを1枚も使わない。色は全部 頂点カラー に入れる
    → 初回DL が小さく、CSP の許可リストも増えない（03 の Won't「外部CDN禁止」と整合）
  - 頂点カラーのアルファに「部位ID」を入れておく。
    クライアントはこれを見て、人ごとに肌・髪・服の色を塗り替える（テクスチャ差し替え不要）
  - マテリアルは1つだけ。1人 = 1ドローコール
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector

# ---- 部位ID。クライアントの塗り替えと対応する（client/src/avatar.js） ----
SKIN, HAIR, SHIRT, PANTS, SHOES, EYE, WHITE, MOUTH, BLUSH = range(9)
PART_N = 16          # アルファに入れる分母。増やすときはクライアント側も直す

# 既定色（クライアントが塗り替えなくても見られる状態にしておく）
DEFAULT = {
    SKIN:  (0.98, 0.85, 0.76), HAIR:  (0.30, 0.22, 0.20), SHIRT: (0.82, 0.55, 0.28),
    PANTS: (0.30, 0.34, 0.42), SHOES: (0.22, 0.20, 0.22), EYE:   (0.17, 0.16, 0.26),
    WHITE: (1.00, 1.00, 1.00), MOUTH: (0.72, 0.38, 0.38), BLUSH: (0.99, 0.72, 0.70),
}

H = 1.67            # 全高（m）。頭 0.40 なので約 4.2頭身 — 見下ろしでも顔が読める比率
EYE_Z = 1.428       # 目の高さ。あご(1.27)から見て頭の 39% — アニメ寄りの配置
FRINGE_Z = 1.515    # 前髪の下端。ここで切り揃える
HIP_Z, CHEST_Z, NECK_Z = 0.86, 1.24, 1.30
HEAD_Z, HEAD_R = 1.47, 0.20
SHOULDER_X, HIP_X = 0.165, 0.072
FRONT = -1.0        # Blender の -Y が正面。glTF 変換後に +Z になる（10 §5）

srgb = lambda c: tuple(v ** 2.2 for v in c)   # 頂点カラーは線形で入れる


# ---------------------------------------------------------------- 部品づくり
def tag(o, part, color=None):
    """部位IDと既定色を頂点カラーに書き込む"""
    me = o.data
    col = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    r, g, b = srgb(color or DEFAULT[part])
    a = (part + 0.5) / PART_N
    for i in range(len(me.vertices)):
        col.data[i].color = (r, g, b, a)
    return o


def bind(o, bone):
    """この部品を1本のボーンに剛体スキニングする"""
    vg = o.vertex_groups.new(name=bone)
    vg.add(range(len(o.data.vertices)), 1.0, 'REPLACE')
    return o


def finish(o, part, bone, color=None):
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    tag(o, part, color); bind(o, bone)
    return o


def sphere(r, loc, scale=(1, 1, 1), seg=12, ring=8):
    """球は滑らかに。角ばった部品（円錐・箱）はフラットのままにして低ポリらしさを残す"""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc)
    o = bpy.context.object; o.scale = scale
    for pl in o.data.polygons:
        pl.use_smooth = True
    return o


def cone(r1, r2, depth, loc, verts=10):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc)
    return bpy.context.object


HEAD_RX, HEAD_RY, HEAD_RZ = HEAD_R * 1.0, HEAD_R * 0.94, HEAD_R * 1.02
CHIN_TOP, CHIN_LEN, CHIN_K = 1.45, 0.24, 0.30


def chin_k(z):
    """あごのすぼまり。build_body の頭の変形と同じ式（2箇所に書かない）"""
    t = max(0.0, (CHIN_TOP - z) / CHIN_LEN)
    return 1.0 - CHIN_K * t * t


def face_y(x, z, out=0.003):
    """(x,z) における頭の表面の y。顔の部品はここに貼る。

    手で深さを決めていたときは、ほお紅や口が輪郭から浮いていた。
    表面から出す量（out）だけを決めれば、どこに置いても浮かない。
    """
    k = chin_k(z)
    rz = (z - HEAD_Z) / HEAD_RZ
    rx = x / (k * HEAD_RX)
    q = 1.0 - rz * rz - rx * rx
    if q <= 0:
        return FRONT * 0.02
    return FRONT * (k * HEAD_RY * math.sqrt(q) + out)


def face_yaw(x, z):
    """その位置の頭の表面が向いている角度（度）。

    板を頭に平行に置くと、外側が頭にめり込んで目が欠ける。
    表面の法線に合わせて傾ければ、板のまま頭に沿う。
    """
    k = chin_k(z)
    return math.degrees(math.asin(max(-0.99, min(0.99, x / (k * HEAD_RX)))))


def disc(r, loc, scale=(1, 1, 1), verts=6, tilt=0.0):
    """平たい円板。正面からしか見えない部品（ハイライト・ほお・口）に使う"""
    bpy.ops.mesh.primitive_circle_add(vertices=verts, radius=r, fill_type='NGON', location=loc)
    o = bpy.context.object
    o.rotation_euler = (math.radians(90), 0, math.radians(tilt))
    o.scale = scale
    return o


def box(size, loc, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cube_add(size=size, location=loc)
    o = bpy.context.object; o.scale = scale
    return o


def limb(r1, r2, z0, z1, x, part, bone, color=None, cap=None):
    """上から下へ伸びる手足。

    関節側にだけ球を置く。反対の端は次の部品が重なって隠れるので持たない。
    1体 1,200三角形（10 §4）に収めるには、ここの球が一番効く。
    """
    parts = [cone(r1, r2, z0 - z1, (x, 0, (z0 + z1) / 2), 8)]
    if cap is not False:
        parts.append(sphere(r1, (x, 0, z0), seg=6, ring=4))
    return finish(join(parts), part, bone, color)


def join(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    return bpy.context.object


# ---------------------------------------------------------------- 髪型
def carve(o, z_min, y_max):
    """前髪の下端を切り揃える。

    球をそのまま被せると目まで覆ってしまうので、正面側の低い頂点を持ち上げて
    まっすぐな前髪の線を作る。アニメ寄りの顔にはこの線が要る。
    """
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for v in o.data.vertices:
        if v.co.y < y_max and v.co.z < z_min:
            v.co.z = z_min
    return o


def hair_cap(parts):
    """頭に被さる部分。どの髪型にも共通"""
    cap = sphere(HEAD_R * 1.06, (0, 0.008, HEAD_Z + 0.022), (1.0, 1.0, 0.97), 12, 6)
    parts.append(finish(carve(cap, FRINGE_Z, -0.02), HAIR, 'head'))
    # 前髪のふくらみ。切り揃えた線のすぐ上に乗せる
    parts.append(finish(sphere(HEAD_R * 0.80, (0, FRONT * 0.075, FRINGE_Z + 0.075),
                               (1.10, 0.92, 0.52), 10, 4), HAIR, 'head'))


def side_lock(parts, s, length, z):
    """顔の横に落ちる毛束。輪郭を作るので、これが有ると一気に人に見える"""
    parts.append(finish(sphere(HEAD_R * 0.30, (s * 0.168, FRONT * 0.045, z),
                               (0.62, 1.05, length), 6, 5), HAIR, 'head'))


def hair_short(parts):
    hair_cap(parts)
    for s in (1, -1):
        side_lock(parts, s, 0.95, HEAD_Z + 0.010)


def hair_bob(parts):
    hair_cap(parts)
    for s in (1, -1):
        side_lock(parts, s, 1.85, HEAD_Z - 0.055)
    parts.append(finish(sphere(HEAD_R * 0.62, (0, 0.145, HEAD_Z - 0.060),
                               (1.02, 0.72, 1.30), 10, 5), HAIR, 'head'))


def hair_pony(parts):
    hair_cap(parts)
    for s in (1, -1):
        side_lock(parts, s, 1.05, HEAD_Z + 0.005)
    parts.append(finish(sphere(HEAD_R * 0.40, (0, 0.195, HEAD_Z + 0.050),
                               (0.85, 0.9, 0.92), 8, 5), HAIR, 'head'))
    parts.append(finish(cone(HEAD_R * 0.30, HEAD_R * 0.09, 0.32, (0, 0.245, HEAD_Z - 0.115), 6),
                        HAIR, 'head'))


HAIRS = [hair_short, hair_bob, hair_pony]


# ---------------------------------------------------------------- からだ
def build_body(variant):
    """variant 0=細め 1=ふつう 2=丸め。太さだけを変える（骨は共通）"""
    w = [0.90, 1.0, 1.12][variant]
    parts = []

    # 胴。腰から肩へ向かって少し広がる
    parts.append(finish(cone(0.148 * w, 0.178 * w, CHEST_Z - HIP_Z + 0.02,
                             (0, 0, (HIP_Z + CHEST_Z) / 2), 10), SHIRT, 'chest'))
    parts.append(finish(sphere(0.150 * w, (0, 0, HIP_Z + 0.015), (1, 0.85, 0.8), 8, 5),
                        PANTS, 'hips'))
    parts.append(finish(sphere(0.182 * w, (0, 0, CHEST_Z - 0.070), (1, 0.86, 0.74), 10, 5),
                        SHIRT, 'chest'))
    parts.append(finish(cone(0.062, 0.058, 0.10, (0, 0, NECK_Z - 0.02), 6), SKIN, 'neck'))

    # 頭。あご側を少しすぼめる
    head = sphere(HEAD_R, (0, 0, HEAD_Z), (1.0, 0.94, 1.02), 12, 8)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = head.data
    for v in me.vertices:                       # 下half を細くしてあごを作る
        k = chin_k(v.co.z)
        v.co.x *= k
        v.co.y *= k
    parts.append(finish(head, SKIN, 'head'))

    # 顔。すべて face_y() で頭の表面に貼る。
    # 目は板。この固定斜め見下ろしのカメラでは、球にしても差が出ずに三角形だけ増える
    EX, BROW_Z, MOUTH_Z, BLUSH_Z = 0.078, 1.484, 1.376, 1.390
    for s in (1, -1):
        x = s * EX
        yaw = face_yaw(x, EYE_Z)
        parts.append(finish(disc(0.040, (x, face_y(x, EYE_Z, 0.006), EYE_Z),
                                 (0.78, 1.06, 1), 10, tilt=yaw), EYE, 'head'))
        parts.append(finish(disc(0.0125, (x + s * 0.011, face_y(x, EYE_Z, 0.013), EYE_Z + 0.014),
                                 (1, 1, 1), 6, tilt=yaw), WHITE, 'head'))
        parts.append(finish(disc(0.028, (x, face_y(x, BROW_Z, 0.005), BROW_Z),
                                 (1.25, 0.15, 1), 4, tilt=face_yaw(x, BROW_Z)), HAIR, 'head'))
        bx = s * 0.118
        parts.append(finish(disc(0.028, (bx, face_y(bx, BLUSH_Z, 0.004), BLUSH_Z),
                                 (1.0, 0.50, 1), 6, tilt=face_yaw(bx, BLUSH_Z)), BLUSH, 'head'))
    parts.append(finish(disc(0.018, (0, face_y(0, MOUTH_Z, 0.004), MOUTH_Z), (1.2, 0.55, 1), 6),
                        MOUTH, 'head'))

    # 腕。肩を少し外に出してから下ろす
    for s, side in ((1, 'L'), (-1, 'R')):
        x = s * SHOULDER_X * w
        parts.append(limb(0.056 * w, 0.048 * w, CHEST_Z - 0.045, 0.975, x, SHIRT, f'upperarm.{side}'))
        parts.append(limb(0.048 * w, 0.042 * w, 0.975, 0.745, x, SKIN, f'lowerarm.{side}'))
        parts.append(finish(sphere(0.050 * w, (x, 0, 0.712), (1, 0.85, 1.05), 6, 5),
                            SKIN, f'hand.{side}'))

    # 脚
    for s, side in ((1, 'L'), (-1, 'R')):
        x = s * HIP_X * w
        parts.append(limb(0.077 * w, 0.062 * w, HIP_Z - 0.03, 0.50, x, PANTS, f'upperleg.{side}',
                          cap=False))
        parts.append(limb(0.062 * w, 0.050 * w, 0.50, 0.095, x, PANTS, f'lowerleg.{side}'))
        shoe = box(1.0, (x, FRONT * 0.022, 0.040), (0.105, 0.150, 0.080))
        parts.append(finish(shoe, SHOES, f'foot.{side}'))

    HAIRS[variant](parts)
    o = join(parts)
    o.name = 'avatar'
    return o


# ---------------------------------------------------------------- 骨
# 18本。10 §5 の上限に合わせてある（指・表情の骨は持たない）
BONES = [
    ('root',        (0, 0, 0),              (0, 0, 0.10),          None),
    ('hips',        (0, 0, HIP_Z),          (0, 0, HIP_Z + 0.09),  'root'),
    ('spine',       (0, 0, HIP_Z + 0.09),   (0, 0, 1.10),          'hips'),
    ('chest',       (0, 0, 1.10),           (0, 0, CHEST_Z),       'spine'),
    ('neck',        (0, 0, CHEST_Z),        (0, 0, NECK_Z),        'chest'),
    ('head',        (0, 0, NECK_Z),         (0, 0, H),             'neck'),
]
for _s, _side in ((1, 'L'), (-1, 'R')):
    _x = _s * SHOULDER_X
    BONES += [
        (f'upperarm.{_side}', (_x, 0, CHEST_Z - 0.045), (_x, 0, 0.975), 'chest'),
        (f'lowerarm.{_side}', (_x, 0, 0.975),           (_x, 0, 0.745), f'upperarm.{_side}'),
        (f'hand.{_side}',     (_x, 0, 0.745),           (_x, 0, 0.665), f'lowerarm.{_side}'),
    ]
for _s, _side in ((1, 'L'), (-1, 'R')):
    _x = _s * HIP_X
    BONES += [
        (f'upperleg.{_side}', (_x, 0, HIP_Z - 0.03), (_x, 0, 0.50),  'hips'),
        (f'lowerleg.{_side}', (_x, 0, 0.50),         (_x, 0, 0.095), f'upperleg.{_side}'),
        (f'foot.{_side}',     (_x, 0, 0.095),        (_x, FRONT * 0.13, 0.05), f'lowerleg.{_side}'),
    ]
assert len(BONES) == 18, len(BONES)


def build_armature():
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = 'rig'
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    eb.remove(eb[0])                       # armature_add が作る既定の骨を捨てる
    for name, head, tail, parent in BONES:
        b = eb.new(name)
        b.head, b.tail, b.roll = Vector(head), Vector(tail), 0.0
        if parent:
            b.parent = eb[parent]
            b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


# ---------------------------------------------------------------- 動き
D = math.radians


def key(arm, frame, pose):
    """pose: {bone: (rx,ry,rz) 度} / 'hips' だけ位置も動かせる {'hips@loc': (x,y,z)}"""
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
    """NLA トラックに積む。glTF はこれを見て全クリップを書き出す"""
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
    A = 8.0     # 腕を少しだけ外に開く（体にめり込ませない）
    for f, k in ((1, 0.0), (31, 1.0), (61, 0.0)):
        key(arm, f, {
            'hips@loc': (0, 0, -0.010 * k),
            'chest': (1.2 * k, 0, 0),
            'neck': (-0.8 * k, 0, 0),
            'head': (1.5 * k - 0.7, 0, 2.0 * math.sin(k * math.pi)),
            'upperarm.L': (2.5 * k, 0, -A), 'upperarm.R': (2.5 * k, 0, A),
            'lowerarm.L': (3.0 * k, 0, -2), 'lowerarm.R': (3.0 * k, 0, 2),
        })
    return act


def anim_walk(arm):
    """歩き。24フレーム = 0.8秒で1往復。移動速度 4.2タイル/秒 に対して速すぎない歩幅"""
    act = new_action(arm, 'walk')
    rest(arm)
    A = 6.0
    STEP, KNEE, SWING = 22.0, 32.0, 17.0
    for i in range(25):
        f = i + 1
        p = i / 24.0 * math.tau
        sw = math.sin(p)                       # 左脚の前後
        key(arm, f, {
            'hips@loc': (0, 0, -0.018 * abs(math.sin(p * 2 + math.pi / 2)) - 0.004),
            'hips': (0, 0, 2.2 * math.sin(p)),
            'chest': (2.0, 0, -1.6 * math.sin(p)),
            'head': (-1.2, 0, 0),
            'upperleg.L': (STEP * sw, 0, 0),
            'upperleg.R': (-STEP * sw, 0, 0),
            # ひざは後ろにしか曲がらない。前に出ている間は伸ばす
            'lowerleg.L': (-KNEE * max(0.0, -sw) - 5.0, 0, 0),
            'lowerleg.R': (-KNEE * max(0.0, sw) - 5.0, 0, 0),
            'foot.L': (12.0 * max(0.0, -sw), 0, 0),
            'foot.R': (12.0 * max(0.0, sw), 0, 0),
            'upperarm.L': (-SWING * sw, 0, -A), 'upperarm.R': (SWING * sw, 0, A),
            'lowerarm.L': (-10.0 + 8.0 * sw, 0, -2), 'lowerarm.R': (-10.0 - 8.0 * sw, 0, 2),
        })
    return act


def anim_sit(arm):
    """着席。椅子の高さ 0.42m に合わせて腰を落とす"""
    act = new_action(arm, 'sit')
    rest(arm)
    # 椅子の座面は 0.42m。腰の骨（立位 0.86m）をその少し上へ落とす
    pose = {
        'hips@loc': (0, 0, -0.39),
        'hips': (-7, 0, 0), 'chest': (6, 0, 0), 'head': (-3, 0, 0),
        'upperleg.L': (-80, 0, 4), 'upperleg.R': (-80, 0, -4),
        # すねは腿から見て「下へ」曲げる。walk と符号が逆になる
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


# ---------------------------------------------------------------- 組み立てと書き出し
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
    # ★ アルファを使う経路を作っておかないと、エクスポータが COLOR_0 を VEC3 に落とす。
    #   部位IDはそのアルファに入っているので、落ちると誰も色が変わらなくなる。
    nt.links.new(ca.outputs['Alpha'], bsdf.inputs['Alpha'])
    m.blend_method = 'BLEND'
    m.use_backface_culling = True      # 裏面は描かない。doubleSided は塗る面積が倍になる
    return m


def build(variant):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    arm = build_armature()
    mesh = build_body(variant)

    mesh.data.materials.append(material())
    mesh.parent = arm
    mesh.modifiers.new('Armature', 'ARMATURE').object = arm

    for fn, name in ((anim_idle, 'idle'), (anim_walk, 'walk'), (anim_sit, 'sit')):
        stash(arm, fn(arm), name)
    rest(arm)
    return arm, mesh


def export(arm, mesh, path):
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True); mesh.select_set(True)
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


def stats(mesh):
    me = mesh.data
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    return len(me.vertices), tris


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out = 'client/assets'
    if '--out' in argv:
        out = argv[argv.index('--out') + 1]
    os.makedirs(out, exist_ok=True)
    total = 0
    for v in range(3):
        arm, mesh = build(v)
        path = os.path.abspath(os.path.join(out, f'avatar-{v}.glb'))
        export(arm, mesh, path)
        verts, tris = stats(mesh)
        size = os.path.getsize(path)
        total += size
        print(f'avatar-{v}.glb  頂点 {verts:5d}  三角形 {tris:5d}  {size/1024:7.1f} KB')
        if '--preview' in argv:
            preview(arm, mesh, os.path.join(out, f'preview-{v}.png'))
    print(f'合計 {total/1024:.1f} KB  (10 §2 の予算 4.8MB のうち)')


def preview(arm, mesh, path):
    """確認用のレンダ。ポーズが破綻していないかを目で見るためだけのもの"""
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'VERTEX'
    sc.render.resolution_x, sc.render.resolution_y = 420, 560
    sc.render.film_transparent = False
    sc.display.shading.background_type = 'VIEWPORT'
    sc.display.shading.background_color = (0.86, 0.88, 0.91)
    bpy.ops.object.camera_add(location=(2.1, -3.0, 2.25), rotation=(D(69), 0, D(35)))
    sc.camera = bpy.context.object
    sc.camera.data.lens = 62
    for frame, tag_ in ((1, ''),):
        sc.frame_set(frame)
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)


main()
