import json, re, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
for f in d['features']:
    p = f['properties']
    sido, sgg, code = p['sidonm'], p['sggnm'], p['sgg']
    name = sgg
    if not re.search(r'(광역시|특별시|통합특별시)$', sido) or sido == '세종특별자치시':
        m = re.match(r'^(.+시)(.+구)$', sgg)
        if m:
            name = m.group(1); code = code[:4] + '0'
    if sido == '세종특별자치시': name = '세종특별자치시'
    f['properties'] = {'k': code, 'n': name, 's': p['sido'], 'sn': sido}
json.dump(d, open(out, 'w'), ensure_ascii=False)
