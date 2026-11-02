import json, math, sys
from shapely.geometry import shape, Polygon, MultiPolygon, mapping
from shapely.ops import unary_union
from shapely import affinity
from shapely.ops import polylabel
sgg = json.load(open(sys.argv[1])); out = sys.argv[2]
full = {f['properties']['k']: f for f in json.load(open(sys.argv[3]))['features'] if f['properties']['k'] == '47940'}
LAT0 = 36.0; C = math.cos(math.radians(LAT0)); S = 190.0
LON_MIN, LAT_MAX = 124.55, 38.66
def proj(g):
    return affinity.affine_transform(g, [C*S, 0, 0, -S, -LON_MIN*C*S, LAT_MAX*S])
SHORT = {'11':'서울','26':'부산','27':'대구','28':'인천','12':'전남광주','30':'대전','31':'울산','36':'세종','41':'경기','51':'강원','43':'충북','44':'충남','47':'경북','48':'경남','50':'제주','52':'전북'}
ORDER = ['11','28','41','51','43','44','30','36','52','12','47','27','31','48','26','50']
regs = []
ULL = '47940'
for f in sgg['features']:
    p = f['properties']; g = shape(f['geometry'])
    if p['k'] == '47940': g = shape(full['47940']['geometry']).simplify(0.0008)
    parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    if p['k'] == ULL:
        moved = []
        for q in parts:
            c = q.centroid
            if c.x > 131.5:   # 독도: 울릉도 동남쪽 가까이 옮기고 크게
                q = affinity.translate(q, 130.17 - 131.868, 37.70 - 37.242)
                q = affinity.scale(q, 8, 8, origin=(130.17, 37.70))
            else:              # 울릉도: 동해안 가까이
                q = affinity.translate(q, 129.95 - 130.86, 37.80 - 37.50)
            moved.append(q)
        parts = moved
    parts = [proj(q) for q in parts]
    big = max(parts, key=lambda q: q.area)
    keep = [q for q in parts if q.area >= (0.0 if p['k']==ULL else 1.2) or q is big]
    geom = unary_union(keep)
    regs.append((p, geom))
def path(g):
    polys = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    out = []
    for pl in polys:
        for ring in [pl.exterior] + list(pl.interiors):
            cs = list(ring.coords)[:-1]
            if len(cs) < 3: continue
            s = 'M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in cs) + 'Z'
            out.append(s)
    return ''.join(out)
def label(g):
    polys = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    big = max(polys, key=lambda q: q.area)
    pt = polylabel(big, tolerance=0.3)
    return round(pt.x, 1), round(pt.y, 1)
R = []
for p, g in regs:
    lx, ly = label(g); b = g.bounds
    R.append({'k': p['k'], 'n': p['n'], 's': p['s'], 'd': path(g), 'l': [lx, ly], 'b': [round(v, 1) for v in b], 'a': round(g.area, 1)})
SD = []
for s in ORDER:
    gs = unary_union([g.buffer(0.15) for p, g in regs if p['s'] == s]).buffer(-0.15)
    sn = next(p['sn'] for p, g in regs if p['s'] == s)
    lx, ly = label(gs); b = gs.bounds
    SD.append({'s': s, 'sn': sn, 'sh': SHORT[s], 'd': path(gs.simplify(0.3)), 'l': [lx, ly], 'b': [round(v, 1) for v in b]})
allb = unary_union([g for p, g in regs]).bounds
R.sort(key=lambda r: (ORDER.index(r['s']), r['k']))
js = '/* 구석구석 다 함께 찾아요 — 지도 데이터 (자동 생성: tools/build_map.py)\n   원본: vuski/admdongkor ver20261001 (통계청 행정동 경계 기반), 일반구는 시로 합침, 울릉도·독도는 옮겨 그림 */\n'
js += 'const MAP_BOUNDS = ' + json.dumps([round(v, 1) for v in allb]) + ';\n'
js += 'const SIDO = ' + json.dumps(SD, ensure_ascii=False) + ';\n'
js += 'const REGIONS = ' + json.dumps(R, ensure_ascii=False) + ';\n'
# 울릉도·독도 상자 위치
u = next(g for p, g in regs if p['k'] == ULL).bounds
js += 'const ULL_BOX = ' + json.dumps([round(u[0]-6,1), round(u[1]-6,1), round(u[2]+6,1), round(u[3]+14,1)]) + ';\n'
open(out, 'w').write(js)
print('bounds', allb, 'size', len(js), 'regions', len(R))
