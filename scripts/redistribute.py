import re, sys
from collections import defaultdict, Counter
sys.stdout.reconfigure(encoding='utf-8')

COLORS_KR = ['초록','빨간','파란','노란','보라','주황','분홍','하얀','검은','금빛','은빛','청록','진홍','하늘']
COLORS_EN = ['Green','Red','Blue','Yellow','Purple','Orange','Pink','White','Black','Gold','Silver','Teal','Crimson','Sky']
COLORS_JP = ['緑の','赤い','青い','黄色い','紫の','オレンジの','ピンクの','白い','黒い','金の','銀の','青緑の','深紅の','空色の']

TYPE_KR = {'slime':'슬라임','fish':'물고기','rabbit':'토끼','cat':'고양이','plant':'새싹',
           'ghost':'유령','turtle':'거북이','owl':'부엉이','bear':'곰','whale':'고래',
           'boar':'멧돼지','deer':'사슴','beetle':'딱정벌레','monkey':'원숭이',
           'crocodile':'악어','fox':'여우','raven':'까마귀','wolf':'늑대','tiger':'호랑이',
           'eagle':'독수리','elephant':'코끼리','horse':'말','snake':'뱀','robot':'로봇',
           'lion':'사자','dragon':'드래곤','phoenix':'피닉스','unicorn':'유니콘',
           'demon':'악마','angel':'천사'}
TYPE_JP  = {'slime':'スライム','fish':'魚','rabbit':'ウサギ','cat':'ネコ','plant':'新芽',
            'ghost':'ゴースト','turtle':'カメ','owl':'フクロウ','bear':'クマ','whale':'クジラ',
            'boar':'イノシシ','deer':'シカ','beetle':'カブトムシ','monkey':'サル',
            'crocodile':'ワニ','fox':'キツネ','raven':'カラス','wolf':'オオカミ','tiger':'トラ',
            'eagle':'ワシ','elephant':'ゾウ','horse':'ウマ','snake':'ヘビ','robot':'ロボット',
            'lion':'ライオン','dragon':'ドラゴン','phoenix':'フェニックス','unicorn':'ユニコーン',
            'demon':'デーモン','angel':'エンジェル'}

TARGET = {
    'slime':13,'fish':13,'rabbit':13,'cat':13,'plant':13,'ghost':13,'turtle':13,'owl':13,'bear':13,
    'whale':14,'boar':14,'deer':13,'beetle':14,'monkey':14,'crocodile':14,
    'fox':13,'raven':14,'wolf':13,'tiger':13,'eagle':14,'elephant':14,
    'horse':13,'snake':13,'robot':13,'lion':13,
    'dragon':13,'phoenix':13,'unicorn':13,'demon':14,'angel':14,
}
assert sum(TARGET.values()) == 400

RARITY_PLAN = {
    'slime':    [('common',13)],
    'fish':     [('common',13)],
    'rabbit':   [('common',13)],
    'cat':      [('common',13)],
    'plant':    [('common',13)],
    'ghost':    [('common',13)],
    'turtle':   [('common',13)],
    'owl':      [('common',13)],
    'bear':     [('common',6),('uncommon',7)],
    'whale':    [('uncommon',14)],
    'boar':     [('uncommon',14)],
    'deer':     [('uncommon',13)],
    'fox':      [('uncommon',13)],
    'wolf':     [('uncommon',13)],
    'monkey':   [('uncommon',14)],
    'tiger':    [('uncommon',2),('rare',11)],
    'raven':    [('rare',14)],
    'beetle':   [('rare',14)],
    'crocodile':[('rare',14)],
    'elephant': [('rare',14)],
    'eagle':    [('rare',13),('epic',1)],
    'horse':    [('epic',13)],
    'snake':    [('epic',13)],
    'robot':    [('epic',13)],
    'lion':     [('epic',13)],
    'dragon':   [('epic',7),('legendary',6)],
    'phoenix':  [('legendary',13)],
    'unicorn':  [('legendary',13)],
    'demon':    [('legendary',8),('mythic',6)],
    'angel':    [('mythic',14)],
}
rc = Counter()
for plans in RARITY_PLAN.values():
    for r,n in plans: rc[r]+=n
assert rc == {'common':110,'uncommon':90,'rare':80,'epic':60,'legendary':40,'mythic':20}, rc

GACHA = {'common':60,'uncommon':50,'rare':40,'epic':30,'legendary':20,'mythic':12}

with open('c:/Users/info/kebo/apps/user-web/src/app/data/characters.ts', encoding='utf-8') as f:
    content = f.read()

C_PAT = re.compile(
    r' *c\(\s*(\d+)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*(\w+)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\),'
)
chars = []
for m in C_PAT.finditer(content):
    chars.append({
        'id': int(m.group(1)), 'name': m.group(2), 'korname': m.group(3),
        'ctype': m.group(4), 'hidden': m.group(5), 'desc': m.group(6),
        'p': m.group(7), 's': m.group(8), 'a': m.group(9),
    })
print(f"파싱: {len(chars)}마리")

by_type = defaultdict(list)
for c in chars:
    by_type[c['ctype']].append(c)
for t in by_type:
    by_type[t].sort(key=lambda x: x['id'])

kept_ids = set()
pool = []
new_chars = {}

for ctype, group in by_type.items():
    keep_n = TARGET[ctype]
    for c in group[:keep_n]:
        kept_ids.add(c['id'])
        new_chars[c['id']] = dict(c, new_type=ctype, new_name=c['name'], new_korname=c['korname'], new_jp=None)
    for c in group[keep_n:]:
        pool.append(c)

pool.sort(key=lambda x: x['id'])
print(f"재배치 대상: {len(pool)}마리")

fill_order = []
for ctype in RARITY_PLAN:
    current = len(by_type.get(ctype, []))
    need = TARGET[ctype] - current
    if need > 0:
        fill_order.extend([ctype] * need)

assert len(fill_order) == len(pool), f"fill={len(fill_order)} pool={len(pool)}"

type_added_count = defaultdict(int)
for char, new_type in zip(pool, fill_order):
    idx = type_added_count[new_type]
    type_added_count[new_type] += 1
    ci = idx % len(COLORS_KR)
    new_chars[char['id']] = dict(
        char, new_type=new_type,
        new_name=f"{COLORS_EN[ci]} {new_type.capitalize()}",
        new_korname=f"{COLORS_KR[ci]} {TYPE_KR[new_type]}",
        new_jp=f"{COLORS_JP[ci]}{TYPE_JP[new_type]}",
    )

new_by_type = defaultdict(list)
for data in new_chars.values():
    new_by_type[data['new_type']].append(data)
for t in new_by_type:
    new_by_type[t].sort(key=lambda x: x['id'])

for ctype, group in new_by_type.items():
    idx = 0
    for (rarity, count) in RARITY_PLAN[ctype]:
        for c in group[idx:idx+count]:
            c['new_rarity'] = rarity
        idx += count

new_by_rarity = defaultdict(list)
for data in new_chars.values():
    new_by_rarity[data['new_rarity']].append(data)
for r in new_by_rarity:
    new_by_rarity[r].sort(key=lambda x: x['id'])
for rarity, group in new_by_rarity.items():
    tg = GACHA[rarity]
    for j, c in enumerate(group):
        c['new_obtain'] = 'gacha' if j < tg else 'achievement'

# JP 이름 섹션 갱신
jp_section_start = content.index('export const CHARACTER_JP_NAMES')
jp_section_end   = content.index('\n};\n', jp_section_start) + 4
jp_pat = re.compile(r'(\d+): "([^"]*)"')
old_jp = {int(m.group(1)): m.group(2) for m in jp_pat.finditer(content[jp_section_start:jp_section_end])}

jp_lines = ['export const CHARACTER_JP_NAMES: Record<number, string> = {']
for cid in sorted(new_chars.keys()):
    data = new_chars[cid]
    jp_name = data.get('new_jp') or old_jp.get(cid, data['new_korname'])
    jp_lines.append(f'  {cid}: "{jp_name}",')
jp_lines.append('};')
new_jp_section = '\n'.join(jp_lines) + '\n'

# CHARACTERS 배열 재정렬
RARITY_ORDER = {'common':0,'uncommon':1,'rare':2,'epic':3,'legendary':4,'mythic':5}
sorted_chars = sorted(new_chars.values(),
    key=lambda c: (RARITY_ORDER[c['new_rarity']], c['new_type'], c['id']))

arr_start = content.index('export const CHARACTERS: CharacterDef[] = [\n')
arr_end   = content.index('\n];', arr_start) + 3

new_lines = []
for data in sorted_chars:
    line = (f"  c({data['id']:3}, \"{data['new_name']}\", \"{data['new_korname']}\","
            f" \"{data['new_type']}\", \"{data['new_rarity']}\", \"{data['new_obtain']}\","
            f" {data['hidden']}, \"{data['desc']}\","
            f" \"{data['p']}\", \"{data['s']}\", \"{data['a']}\"),")
    new_lines.append(line)

new_arr = 'export const CHARACTERS: CharacterDef[] = [\n' + '\n'.join(new_lines) + '\n];'

result = content[:jp_section_start] + new_jp_section + content[jp_section_end:]
arr_start2 = result.index('export const CHARACTERS: CharacterDef[] = [\n')
arr_end2   = result.index('\n];', arr_start2) + 3
result = result[:arr_start2] + new_arr + result[arr_end2:]

with open('c:/Users/info/kebo/apps/user-web/src/app/data/characters.ts', 'w', encoding='utf-8') as f:
    f.write(result)

dist = Counter(data['new_type'] for data in new_chars.values())
print("\n=== 타입별 최종 분포 ===")
for t in sorted(dist, key=lambda x: -dist[x]):
    print(f"  {t:12} {dist[t]:3}마리")
print(f"\n총 {sum(dist.values())}마리, {len(dist)}종 | 저장 완료")
