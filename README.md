# KEBO

KEBO는 React 기반 사용자/관리자 웹, NestJS API, MySQL, Docker 인프라로 구성된 웹 서비스입니다. 사용자 서비스는 수집, 커뮤니티, 실시간 채팅, 전투형 콘텐츠, 보상 루프를 제공하고, 관리자 서비스는 운영 설정과 로그 조회를 담당합니다.

## 프로젝트 구조

| 경로 | 역할 |
| --- | --- |
| `apps/user-web` | 사용자 웹 클라이언트. React, Vite, Tailwind CSS 기반 |
| `apps/admin-web` | 관리자 웹 클라이언트. 운영 도구와 설정 화면 제공 |
| `apps/api` | NestJS API 서버. Prisma, MySQL, Socket.IO 사용 |
| `prisma` | 데이터베이스 스키마와 Prisma 관련 설정 |
| `docker-compose.yml` | 로컬 및 배포용 컨테이너 구성 |

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Lucide React, Recharts |
| Backend | NestJS, Prisma ORM, Socket.IO, JWT, Resend, Web Push |
| Database | MySQL |
| Infra | Docker Compose, AWS, Coolify |
| Package | npm workspaces |

## 주요 기능 현황

- 인증, 프로필, 칭호, 프로필 테두리, 언어 설정, 테마 설정
- 홈 대시보드, KP 가이드, 일일/주간 퀘스트 진행 현황
- 커뮤니티 게시글, 댓글, 좋아요, 이미지 업로드, 인기글/베스트 영역
- 케보몬 수집, 도감, 획득처 안내, 상세 정보, 보유/미보유 상태 관리
- 뽑기, 알, 교배, 픽업/시즌 배너, 기록 UI, 중복 보상 가치 안내
- 출석, 일일/주간 퀘스트, 콘텐츠 순환형 목표, 보상 수령 처리
- 라이브 채널, 실시간 채팅, 채널 입장, 이모티콘/스티커형 빠른 반응
- 원정, 지역 선택, 파티 편성, 시간 기반 보상, 이벤트/로그 UI
- 낚시, 물고기 도감, 등급별 결과 연출, 마일스톤 보상
- 로그라이크, 카드/유물/전투/상점/마일스톤 중심 진행
- 콜로세움/아레나, 상대 위험도, 자동 편성, 전투 로그, 시즌 보상 UI
- 1:1 카드배틀, 튜토리얼/AI 연습, 덱 난이도, 시즌 보상/랭킹 UI
- 랜덤 타워 디펜스, 4인 룸, 개인 영역/라이프, 서버 계산, 속도 옵션, 일일 KP 제한
- 관리자 운영 화면, 이벤트 설정, 콘텐츠 KPI, 밸런스 변경 이력, 보상 지급 로그 검색

## 타워 디펜스 운영 규칙

- 최대 4인 룸 구조이며 각 플레이어는 개인 전장, 개인 라이프, 개인 배치 영역을 사용합니다.
- 룸 생성 시 기본 속도, 2배속, 3배속 옵션을 선택할 수 있습니다.
- 티켓 소모 없이 반복 플레이할 수 있고, 일일 KP 획득 제한은 1,200KP입니다.
- 판당 획득 가능한 KP 상한은 400KP입니다.
- 일반 진행은 50라운드까지, 51라운드부터 100라운드까지는 무한 모드 구간으로 처리합니다.
- 아군 유닛 데이터는 도감 캐릭터와 등급 정보를 기준으로 매칭합니다.

## 로컬 실행

```bash
npm install
npm run prisma:generate
npm run dev:api
npm run dev:user
npm run dev:admin
```

기본 접속 주소:

| 서비스 | 주소 |
| --- | --- |
| 사용자 웹 | `http://localhost:5173` |
| 관리자 웹 | `http://localhost:5174` |
| API | `http://localhost:4000/api` |
| MySQL | `localhost:3306` |

## Docker 실행

```bash
cp .env.example .env
docker compose up --build
```

## 주요 환경 변수

```env
MYSQL_DATABASE=kebo
MYSQL_USER=kebo
MYSQL_PASSWORD=
MYSQL_ROOT_PASSWORD=

JWT_SECRET=
CORS_ORIGINS=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_IDS=
GOOGLE_CLIENT_SECRET=

RESEND_API_KEY=
VAPID_EMAIL=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

VITE_API_BASE_URL=
VITE_GOOGLE_CLIENT_ID=
VITE_VAPID_PUBLIC_KEY=
```

## 데이터베이스

Prisma 스키마 변경 후에는 다음 명령을 사용합니다.

```bash
npm run prisma:generate
npm run prisma:push
```

배포 환경에서는 DB URL, MySQL 계정, OAuth, JWT, Push, 메일 관련 환경 변수가 Coolify에 등록되어 있어야 합니다.

## 빌드 및 타입 체크

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/user-web/tsconfig.json --noEmit
npx tsc -p apps/admin-web/tsconfig.json --noEmit

npm run build:user
npm run build:admin
```

## 배포 메모

- 현재 배포 흐름은 GitHub `main` 브랜치 push를 기준으로 Coolify가 빌드/배포를 감지하는 방식입니다.
- 원격 브랜치가 앞서 있으면 먼저 `git pull --rebase origin main`으로 최신 커밋을 반영한 뒤 push합니다.
- Coolify 환경 변수 누락 시 프론트 API 주소, CORS, JWT, MySQL 접속, OAuth, Push 기능에서 런타임 오류가 발생할 수 있습니다.

## 운영 확인 항목

- 사용자 웹, 관리자 웹, API 타입 체크 통과 여부
- Docker 이미지 빌드 후 API 런타임 의존성 로딩 여부
- MySQL 연결 및 Prisma Client 생성 여부
- Socket.IO 기반 라이브 채팅과 타워 디펜스 룸 이벤트 동작 여부
- 언어 설정별 한국어, 일본어, 영어 주요 화면 문구 출력 여부
