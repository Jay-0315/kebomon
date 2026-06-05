import re, sys
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')

# ── 타입별 이름 풀 (en, kr, jp) ─────────────────────────────
# 각 타입당 14개 (일부 타입은 13개만 사용)
NAMES = {

'slime': dict(
  en=['Amorphex','Viscora','Osmole','Acidrex','Plazmor','Gellia','Chrysol','Apeiron',
      'Lympha','Aethex','Pyrooze','Toxmire','Fermont','Brimvex'],
  kr=['아모르펙스','비스코라','오스몰','아시드렉스','플라즈모','겔리아','크리솔','아페이론',
      '림파','에테렉스','파이루즈','톡스미르','퍼몬트','브림벡스'],
  jp=['アモルフェクス','ビスコラ','オスモル','アシドレクス','プラズモ','ゲルリア',
      'クリソル','アペイロン','リンパ','エーテレクス','パイルーズ','トクスミア',
      'ファーモント','ブリムヴェクス'],
),

'fish': dict(
  en=['Abyssal','Tidecrest','Coralspike','Glaukos','Deepveil','Lusterfang',
      'Mirewraith','Spinewave','Pelagor','Driftgale','Tempestfin','Voidray','Seaspire','Levian'],
  kr=['어비살','조류왕','산호가시','글라우코스','심층막','광택이빨',
      '늪귀신','가시파도','펠라고르','부표폭풍','폭풍지느러미','허공선','바다첨탑','리바이안'],
  jp=['アビサル','タイドクレスト','コーラルスパイク','グラウコス','ディープヴェイル','ラスターファング',
      'ミアスマフィッシュ','スパインウェーブ','ペラゴル','ドリフトゲイル','テンペストフィン',
      'ヴォイドレイ','シースパイア','レビアン'],
),

'rabbit': dict(
  en=['Quickmere','Lunara','Flashpaw','Zephyr','Mercurio','Argos','Swifthollow',
      'Stardash','Veloth','Nimbus','Aryo','Galehop','Breeze'],
  kr=['퀵미어','루나라','섬광발','제피르','메르쿠리오','아르고스','스위프트호로',
      '별질주','벨로스','님버스','아리오','게일홉','브리즈'],
  jp=['クイックミア','ルナラ','フラッシュポー','ゼフィル','メルクリオ','アルゴス',
      'スウィフトホロ','スターダッシュ','ヴェロス','ニンバス','アリオ','ゲイルホップ','ブリーズ'],
),

'cat': dict(
  en=['Shadeveil','Nyxara','Mistryx','Lyxis','Eclipsaw','Umbrath','Vapora','Fogshroud',
      'Selenix','Shadowmere','Mystral','Luximera','Veldra','Noctis'],
  kr=['어둠막','닉사라','미스트릭스','릭시스','일식발톱','엄브라스','바포라','안개수의',
      '셀레닉스','그림자야','미스트랄','럭시메라','벨드라','녹티스'],
  jp=['シェイドヴェイル','ニクサラ','ミストリクス','リクシス','エクリプスクロー','アンブラス',
      'ヴァポラ','フォグシュラウド','セレニクス','シャドウミア','ミストラル',
      'ルキシメラ','ヴェルドラ','ノクティス'],
),

'plant': dict(
  en=['Verdalis','Briarthorn','Mycelite','Gaiavex','Dryador','Floravik','Germinal',
      'Chlorex','Verdura','Sporeling','Phytom','Tendraxis','Bloomshard'],
  kr=['베르달리스','가시덩굴','균사체','가이아벡스','드리아도르','플로라빅','제르미날',
      '클로렉스','베르두라','포자링','파이톰','덩굴축','꽃파편'],
  jp=['ヴェルダリス','ブライアーソーン','マイシライト','ガイアヴェクス','ドリアドール',
      'フローラヴィク','ジャーミナル','クロレクス','ヴェルドゥーラ',
      'スポアリング','フィトム','テンドラキシス','ブルームシャード'],
),

'ghost': dict(
  en=['Spectrex','Eidolon','Phantrel','Revanth','Shadeform','Polterex','Remnath',
      'Wraithveil','Balora','Echoshade','Liminal','Umbrix','Voidmere'],
  kr=['스펙트렉스','에이돌론','팬트렐','레반스','어둠체','폴터렉스','렘나스',
      '망령막','발로라','에코그늘','경계체','엄브릭스','허공야'],
  jp=['スペクトレクス','エイドロン','ファントレル','レヴァンス','シェイドフォーム',
      'ポルターレクス','レムナス','レイスヴェイル','バロラ','エコシェード',
      'リミナル','アンブリクス','ヴォイドミア'],
),

'turtle': dict(
  en=['Archonyx','Kalpas','Aionos','Pangurex','Kosmoral','Eterniback','Granshell',
      'Ordovex','Metashell','Anguishell','Tectonis','Crustalis','Carapace'],
  kr=['아르코닉스','칼파스','아이오노스','판구렉스','코스모랄','영원등','그란쉘',
      '오르도벡스','메타쉘','앵귀쉘','텍토니스','크러스탈리스','카라파스'],
  jp=['アルコニクス','カルパス','アイオノス','パングレクス','コスモラル','エタニバック',
      'グランシェル','オルドヴェクス','メタシェル','アンギュイシェル',
      'テクトニス','クラスタリス','カラパス'],
),

'owl': dict(
  en=['Arcanix','Grimoire','Sophavex','Runemark','Oraclum','Noctumor','Glyphis',
      'Savantrix','Occulis','Visorix','Spellcraft','Limburex','Augural'],
  kr=['아르카닉스','그리무아르','소파벡스','룬마크','오라쿨룸','녹투모르','글리피스',
      '사반트릭스','오쿨리스','비소릭스','마법사','림버렉스','빼미'],
  jp=['アルカニクス','グリモワール','ソーファヴェクス','ルーンマーク','オラクラム',
      'ノクトゥモル','グリフィス','サヴァントリクス','オキュリス','ヴィソリクス',
      'スペルクラフト','リンブレクス','オーガラル'],
),

'bear': dict(
  en=['Gormrak','Ursavex','Bjornath','Berzerkal','Kodiakon','Grimclaw','Thorvald',
      'Ulfhark','Valkavar','Keltrak','Bloodpaw','Gigawrath','Growlmor'],
  kr=['고름락','우르사벡스','비요르나스','버저칼','코디아콘','냉혹발','토르발드',
      '울프하크','발카바르','켈트락','핏발바닥','기가분노','그롤모르'],
  jp=['ゴルムラク','ウルサヴェクス','ビョルナス','バーザーカル','コディアコン',
      'グリムクロー','トールヴァルド','ウルフハーク','ヴァルカヴァル','ケルトラク',
      'ブラッドポー','ギガラス','グロウルモア'],
),

'whale': dict(
  en=['Leviatar','Krakenor','Abyssoral','Mobivex','Titandepth','Drednor','Okeanos',
      'Deepthrone','Tartrex','Vortexfin','Pelagorix','Mindepth','Cosmocean','Boundless'],
  kr=['리바이타르','크라케노르','아비소랄','모비벡스','심해왕좌','드레드노르','오케아노스',
      '심연왕','타르트렉스','회오리지느러미','펠라고릭스','무한심','코스모해','무경계'],
  jp=['レビアタール','クラケノール','アビソラル','モビヴェクス','タイタンデプス',
      'ドレッドノール','オケアノス','ディープスローン','タルトレクス',
      'ヴォーテックスフィン','ペラゴリクス','マインデプス','コスモシアン','バウンドレス'],
),

'boar': dict(
  en=['Fierak','Calvidor','Grunmark','Tuskrage','Truffex','Wildbore','Eorcan',
      'Bramblix','Swinehall','Ragepig','Grimtusk','Ironboar','Chargemaw','Relentex'],
  kr=['피에락','칼비도르','그런마크','엄니분노','트러펙스','야생멧돼','에오르칸',
      '브램블릭스','돼지왕','분노돼지','냉혹엄니','철멧돼','돌진턱','렐렌텍스'],
  jp=['フィーラク','カルヴィドール','グランマーク','タスクレイジ','トリュフェクス',
      'ワイルドボア','エオルカン','ブランブリクス','スワインホール','レイジピッグ',
      'グリムタスク','アイアンボア','チャージモー','リレンテクス'],
),

'deer': dict(
  en=['Cervinal','Sylvantler','Elysifer','Gloamhoof','Arborex','Ferngrace','Thornleap',
      'Velvetrack','Forestmere','Moondrift','Siltpath','Druidhoof','Gracilorn'],
  kr=['서비날','실반틀러','엘리시퍼','황혼발굽','아르보렉스','양치우아','가시도약',
      '벨벳길','숲속야','달표류','실트길','드루이드발굽','그라실로른'],
  jp=['セルヴィナル','シルヴァントラー','エリシファー','グロームフーフ','アルボレクス',
      'ファーングレイス','ソーンリープ','ヴェルヴェトラック','フォレストミア',
      'ムーンドリフト','シルトパス','ドルイドフーフ','グラシロルン'],
),

'beetle': dict(
  en=['Scarabex','Kephrion','Chitinak','Onyxcarab','Carapax','Mandiblex','Scaralith',
      'Tombguard','Dungerak','Ironshell','Gemdor','Coloscarab','Obsidian','Groundwarden'],
  kr=['스카라벡스','케프리온','키티낙','오닉스딱정','카라팍스','만디블렉스','스카라리스',
      '무덤수호','던저락','철갑각','보석딱','콜로스카라브','옵시디안','땅수호자'],
  jp=['スカラベクス','ケフリオン','キチナク','オニックスカラブ','カラパクス','マンディブレクス',
      'スカラリス','トゥームガード','ダンジェラク','アイアンシェル','ジェムドル',
      'コロスカラブ','オブシディアン','グラウンドウォーデン'],
),

'monkey': dict(
  en=['Kongaxis','Hanurath','Lokimper','Trickspry','Agilimon','Flipspark','Bouncevex',
      'Gymnix','Snappix','Jinkster','Nimblehand','Rascalix','Caprilex','Deviant'],
  kr=['콩액시스','하누라스','로키임퍼','트릭스프리','아길리몬','플립스파크','바운스벡스',
      '짐닉스','스냅픽스','진크스터','날쌘손','래스칼릭스','카프릴렉스','괴짜'],
  jp=['コングアクシス','ハヌラス','ロキインパー','トリックスプリー','アギリモン',
      'フリップスパーク','バウンスヴェクス','ジムニクス','スナッピクス','ジンクスター',
      'ニンブルハンド','ラスカリクス','カプリレクス','ディヴィアント'],
),

'crocodile': dict(
  en=['Sebakov','Sobekan','Nilecrest','Apephrak','Deathroll','Scalegrim','Abyssmaw',
      'Morasvex','Saurodex','Primalgap','Scalesoul','Reptilax','Marshking','Armoredhide'],
  kr=['세바코프','소베칸','나일마루','아페프락','죽음구르기','비늘냉혹','어비스턱',
      '모라스벡스','사우로덱스','원시틈','비늘혼','렙틸락스','늪왕','철갑피'],
  jp=['セバコフ','ソベカン','ナイルクレスト','アペフラク','デスロール','スケイルグリム',
      'アビスモー','モラスヴェクス','サウロデクス','プライマルギャップ',
      'スケイルソウル','レプティラクス','マーシュキング','アーモードハイド'],
),

'fox': dict(
  en=['Kitsurai','Vulpexis','Illusor','Voitura','Arimaki','Selkivex','Luceroth',
      'Valenox','Mirrorveil','Phantrix','Trickfang','Glimmerrun','Foxfire','Shadowsneek'],
  kr=['키츠라이','불펙시스','일루소르','부아투라','아리마키','셀키벡스','루세로스',
      '발레노스','거울막','팬트릭스','속임이빨','반짝달리기','여우불','그림자슬'],
  jp=['キツライ','ヴルペクシス','イルゾール','ヴォワチュラ','アリマキ','セルキヴェクス',
      'ルセロス','ヴァレノクス','ミラーヴェイル','ファントリクス','トリックファング',
      'グリマーラン','キツネビ','シャドウスニーク'],
),

'raven': dict(
  en=['Munivex','Hugrath','Corvaith','Omenveil','Duskprophet','Nevoral','Darkquill',
      'Sablewing','Harrowcry','Grimomen','Obsidianfeather','Knelltide','Morrath','Umbravane'],
  kr=['무니벡스','후그라스','코르바이스','흉조막','황혼예언자','네보랄','어둠깃',
      '검은날개','공포의 울음','냉혹조짐','흑요석깃','조종파도','모르라스','엄브라베인'],
  jp=['ムニヴェクス','フグラス','コルヴァイス','オーメンヴェイル','ダスクプロフェット',
      'ネヴォラル','ダークキル','セーブルウィング','ハロウクライ','グリムオーメン',
      'オブシディアンフェザー','ネルタイド','モーラス','アンブラヴェイン'],
),

'wolf': dict(
  en=['Fenraxis','Greymantle','Alpharex','Lunarex','Packlord','Howlmere','Skaulmaw',
      'Frostbane','Voidhowl','Badelrun','Beowrath','Moonglare','Ashclaw','Stormfang'],
  kr=['펜락시스','잿빛망토','알파렉스','루나렉스','무리군주','울부짖음야','스콜턱',
      '서리재앙','허공울음','배들런','베오라스','달빛눈','재발톱','폭풍이빨'],
  jp=['フェンラクシス','グレイマントル','アルファレクス','ルナレクス','パックロード',
      'ハウルミア','スカウルモー','フロストベーン','ヴォイドハウル','バデルラン',
      'ベオラス','ムーングレア','アッシュクロー','ストームファング'],
),

'tiger': dict(
  en=['Vajrakon','Thunderfang','Ignavex','Pyrotiga','Blazeclaw','Tempeststripe','Strikemaw',
      'Stormchaser','Anarvex','Shaktikos','Wrathroar','Ironclad','Giantpaw'],
  kr=['바즈라콘','뇌전이빨','이그나벡스','파이로티가','화염발톱','폭풍줄무늬','강타턱',
      '폭풍추적자','아나르벡스','샥티코스','분노포효','철갑호','거대발'],
  jp=['ヴァジュラコン','サンダーファング','イグナヴェクス','パイロティガー','ブレイズクロー',
      'テンペストストライプ','ストライクモー','ストームチェイサー','アナルヴェクス',
      'シャクティコス','ラスロアー','アイアンクラッド','ジャイアントポー'],
),

'eagle': dict(
  en=['Garudax','Aquilonis','Skyreign','Stormsoar','Maestros','Aeolean','Sunspire',
      'Irontalon','Emblazon','Whitegale','Radarvex','Princewing','Airborne','Cerulean'],
  kr=['가루닥스','아퀼로니스','하늘군림','폭풍비상','마에스트로스','에올레안','태양첨탑',
      '철발톱','엠블레이즌','흰바람','레이더벡스','왕자날개','에어본','세룰레안'],
  jp=['ガルダクス','アクィロニス','スカイレイン','ストームソアー','マエストロス',
      'エオーリアン','サンスパイア','アイアンタロン','エンブレイゾン','ホワイトゲイル',
      'レーダーヴェクス','プリンスウィング','エアボーン','セルリアン'],
),

'elephant': dict(
  en=['Eiravarx','Ganeshor','Mammothex','Colossrak','Fortressis','Panzerix','Boulderak',
      'Stompvex','Titanwall','Landmarkon','Ivorius','Graysire','Runningmound'],
  kr=['에이라바르크스','가네쇼르','매머덱스','콜로스락','요새라크','판저릭스','볼더락',
      '스톰프벡스','타이탄벽','랜드마콘','아이보리우스','회색주군','이동대지'],
  jp=['エイラヴァルクス','ガネショール','マンモデクス','コロスラク','フォートレシス',
      'パンツェリクス','ボルダーラク','ストンプヴェクス','タイタンウォール',
      'ランドマコン','アイヴォリウス','グレイシレ','ランニングマウンド'],
),

'horse': dict(
  en=['Pegaxos','Cheirax','Rosinan','Gallorin','Epinax','Swiftmane','Zephyllos',
      'Alborakon','Tempestride','Grimhoof','Galecharge','Pallomere','Velbayo'],
  kr=['페가소스','케이락스','로시난','갈로린','에피낙스','스위프트갈기','제필로스',
      '알보라콘','폭풍질주','냉혹발굽','질풍돌격','팔로미어','벨바요'],
  jp=['ペガコス','ケイラクス','ロシナン','ガロリン','エピナクス','スウィフトメイン','ゼフィロス',
      'アルボラコン','テンペストライド','グリムフーフ','ゲイルチャージ','パロミア','ヴェルバヨ'],
),

'snake': dict(
  en=['Uroboros','Basilrex','Nagavex','Asklipion','Cobraxis','Anacornex','Amphisbane',
      'Vinorath','Pythaxis','Erixomor','Serpentus','Viperix','Constrictor'],
  kr=['우로보로스','바실렉스','나가벡스','아스클리피온','코브락시스','아나코넥스','암피스베인',
      '비노라스','피삭시스','에릭소모르','서펜투스','바이퍼릭스','구렁이왕'],
  jp=['ウロボロス','バシルレクス','ナーガヴェクス','アスクレピオン','コブラクシス',
      'アナコーネクス','アンフィスベーン','ヴィノラス','ピサクシス','エリクソモル',
      'サーペンタス','ヴァイパリクス','コンストリクター'],
),

'robot': dict(
  en=['Nexros','Axiomex','Ciphervex','Forgeron','Coilax','Apexdrive','Echoplex',
      'Voltaric','Prismcore','Helixon','Gridlock','Pulsebit','Vectorium'],
  kr=['넥스로스','악시오멕스','사이퍼벡스','포지론','코일락스','에이펙스드라이브','에코플렉스',
      '볼타릭','프리즘코어','헬릭손','그리드락','펄스비트','벡토리움'],
  jp=['ネクスロス','アクシオメクス','サイファーヴェクス','フォージェロン','コイラクス',
      'エイペックスドライヴ','エコプレックス','ヴォルタリック','プリズムコア',
      'ヘリクソン','グリッドロック','パルスビット','ヴェクトリウム'],
),

'lion': dict(
  en=['Leonidax','Solarex','Imperion','Rimvex','Akuravex','Mahestus','Sekhmetis',
      'Nemearos','Magnora','Imperaxis','Orovane','Solaris','Glorymane'],
  kr=['레오니닥스','솔라렉스','임페리온','림벡스','아쿠라벡스','마에스투스','세크메티스',
      '네메아로스','마그노라','임페락시스','오로베인','솔라리스','영광갈기'],
  jp=['レオニダクス','ソラレクス','インペリオン','リムヴェクス','アクラヴェクス','マエストゥス',
      'セクメティス','ネメアロス','マグノーラ','インペラクシス','オーロヴェイン',
      'ソラリス','グローリーメイン'],
),

'dragon': dict(
  en=['Fafnirak','Smaugvex','Igdrasil','Bahamutex','Leviark','Falcoros','Midgardian',
      'Titanscale','Anjukar','Drakhon','Empyrax','Pyredrake','Voidwyrm'],
  kr=['파프니락','스마우그벡스','이그드라실','바하무텍스','리바이아크','팔코로스','미드가르디안',
      '타이탄비늘','안주카르','드라콘','엠파이락스','파이어드레이크','허공용'],
  jp=['ファフニラク','スマウグヴェクス','イグドラシル','バハムテクス','レビアーク','ファルコロス',
      'ミドガルディアン','タイタンスケール','アンジュカル','ドラコン','エンパイラクス',
      'パイアドレイク','ヴォイドワーム'],
),

'phoenix': dict(
  en=['Pyraflare','Simurgath','Imuros','Benuvex','Caeneuros','Phoenixia','Eternafire',
      'Solflame','Requiem','Gloriax','Empyrean','Rebornex','Ashlord'],
  kr=['파이라플레어','시무르가스','이무로스','베누벡스','카에네우로스','피닉시아','영원불꽃',
      '태양화염','레퀴엠','글로리악스','엠피리언','리보르넥스','재군주'],
  jp=['パイラフレア','シムルガス','イムロス','ベヌヴェクス','カエネウロス','フェニキシア',
      'エターナファイア','ソルフレイム','レクイエム','グロリアクス','エンピリアン',
      'リボーネクス','アッシュロード'],
),

'unicorn': dict(
  en=['Alikornis','Kiraxis','Celestrix','Luminara','Aurohorn','Crystalspire','Eclipsor',
      'Solarhorn','Lunahorn','Cosmoveil','Artelune','Miraclorn','Stardawn'],
  kr=['알리코르니스','키락시스','셀레스트릭스','루미나라','오로라뿔','수정첨탑','이클립소르',
      '태양뿔','달뿔','코스모베일','아르테루네','미라클로른','별새벽'],
  jp=['アリコルニス','キラクシス','セレストリクス','ルミナーラ','オーロラホーン','クリスタルスパイア',
      'エクリプソール','ソラーホーン','ルナホーン','コスモヴェイル','アルテルーン',
      'ミラクロルン','スターダウン'],
),

'demon': dict(
  en=['Malephiros','Abandax','Molochvex','Beliarex','Asmodeon','Marathos','Thanatrix',
      'Lucifrak','Diabolos','Gehennax','Abyssking','Judgeron','Infernum','Dreadlord'],
  kr=['말레피로스','아반닥스','몰로크벡스','벨리아렉스','아스모데온','마라토스','타나트릭스',
      '루시프락','디아볼로스','게헨나크스','나락왕','심판자','인페르눔','드레드로드'],
  jp=['マレフィロス','アバンダクス','モロクヴェクス','ベリアレクス','アスモデオン',
      'マラトス','タナトリクス','ルシフラク','ディアボロス','ゲヘンナクス',
      'アビスキング','ジャッジェロン','インフェルナム','ドレッドロード'],
),

'angel': dict(
  en=['Seraphaxis','Gabrielon','Urielux','Raphaeon','Cassielix','Arielon','Barakiax',
      'Zerachion','Sandalix','Nightwarden','Selestion','Anaelion','Irenael','Luminarch'],
  kr=['세라팍시스','가브리엘론','우리엘룩스','라파에온','카시엘릭스','아리엘론','바라키악스',
      '제라키온','산달릭스','밤수호자','셀레스티온','아나엘리온','이레나엘','루미나르크'],
  jp=['セラファクシス','ガブリエロン','ウリエルクス','ラファエオン','カシエリクス','アリエロン',
      'バラキアクス','ゼラキオン','サンダリクス','ナイトウォーデン','セレスティオン',
      'アナエリオン','イレナエル','ルミナーク'],
),

}

# ── 파일 파싱 ─────────────────────────────────────────────────
with open('c:/Users/info/kebo/apps/user-web/src/app/data/characters.ts', encoding='utf-8') as f:
    content = f.read()

# 캐릭터 파싱 (이름, 한국이름, 타입, 나머지 포함)
C_PAT = re.compile(
    r'( *c\(\s*(\d+)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*)(,\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*\w+\s*,\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*"[^"]*"\s*\),)'
)
chars = []
for m in C_PAT.finditer(content):
    chars.append({
        'id': int(m.group(2)),
        'name': m.group(3),
        'korname': m.group(4),
        'ctype': m.group(5),
        'pre': m.group(1),
        'post': m.group(6),
        'match': m,
    })
print(f"파싱: {len(chars)}마리")

# ── 타입별 위치 인덱스 계산 ───────────────────────────────────
from collections import defaultdict
by_type = defaultdict(list)
for c in chars:
    by_type[c['ctype']].append(c)
for t in by_type:
    by_type[t].sort(key=lambda x: x['id'])

# ── 이름 할당 ─────────────────────────────────────────────────
new_names = {}  # id → (en, kr)
for ctype, group in by_type.items():
    pool = NAMES.get(ctype)
    if not pool:
        print(f"WARNING: no names for type {ctype}")
        for i, c in enumerate(group):
            new_names[c['id']] = (c['name'], c['korname'])
        continue
    en_list = pool['en']
    kr_list = pool['kr']
    for i, c in enumerate(group):
        new_names[c['id']] = (en_list[i % len(en_list)], kr_list[i % len(kr_list)])

# ── JP 이름 섹션 갱신 ─────────────────────────────────────────
jp_section_start = content.index('export const CHARACTER_JP_NAMES')
jp_section_end   = content.index('\n};\n', jp_section_start) + 4
jp_pat = re.compile(r'(\d+): "([^"]*)"')
old_jp = {int(m.group(1)): m.group(2) for m in jp_pat.finditer(content[jp_section_start:jp_section_end])}

jp_lines = ['export const CHARACTER_JP_NAMES: Record<number, string> = {']
for cid in sorted(new_names.keys()):
    ctype = next(c['ctype'] for c in chars if c['id'] == cid)
    pool = NAMES.get(ctype)
    if pool:
        group_ids = sorted(c['id'] for c in by_type[ctype])
        idx = group_ids.index(cid)
        jp_name = pool['jp'][idx % len(pool['jp'])]
    else:
        jp_name = old_jp.get(cid, new_names[cid][1])
    jp_lines.append(f'  {cid}: "{jp_name}",')
jp_lines.append('};')
new_jp_section = '\n'.join(jp_lines) + '\n'

# ── 캐릭터 이름 치환 (역순) ───────────────────────────────────
result = content
for c in reversed(chars):
    m = c['match']
    en, kr = new_names[c['id']]
    new_pre = f"  c({c['id']:3}, \"{en}\", \"{kr}\", \"{c['ctype']}\""
    new_str = new_pre + c['post']
    result = result[:m.start()] + new_str + result[m.end():]

# JP 섹션도 갱신
result2 = result
jp2_start = result2.index('export const CHARACTER_JP_NAMES')
jp2_end   = result2.index('\n};\n', jp2_start) + 4
result2 = result2[:jp2_start] + new_jp_section + result2[jp2_end:]

with open('c:/Users/info/kebo/apps/user-web/src/app/data/characters.ts', 'w', encoding='utf-8') as f:
    f.write(result2)

# 검증 출력
print("\n=== 샘플 이름 (타입별 첫 3개) ===")
for ctype in ['slime','dragon','angel','robot','lion']:
    group = sorted(by_type[ctype], key=lambda x: x['id'])[:3]
    for c in group:
        print(f"  {ctype:12} {new_names[c['id']][1]:20} / {new_names[c['id']][0]}")
print("\n저장 완료")
