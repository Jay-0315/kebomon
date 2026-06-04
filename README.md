# KEBO

환율 기능이 있는 가계부&커뮤니티 서비스 **KEBO**의 모노레포입니다.
사용자 웹, 관리자 웹, API 앱으로 구성되며, 이후 `Capacitor`로 모바일 앱 패키징을 염두에 두고 있습니다.

## Apps

| 앱               | 설명                                         |
| ---------------- | -------------------------------------------- |
| `apps/user-web`  | 사용자용 가계부/커뮤니티 웹앱 (React + Vite) |
| `apps/admin-web` | 관리자용 운영 웹앱 스캐폴드                  |
| `apps/api`       | 백엔드 REST API (NestJS + Prisma)            |

## Stack

| 구분     | 기술                                                                             |
| -------- | -------------------------------------------------------------------------------- |
| Frontend | React 18, TypeScript 6, Vite 6, Tailwind CSS v4, React Router v7, Motion, Tiptap v3, MUI v7, Recharts |
| Backend  | NestJS v11, Prisma ORM v6, JWT 인증, Socket.io v4 (WebSocket)                   |
| Database | MySQL 8.4                                                                        |
| 기타     | Docker Compose, npm workspaces                                                   |

---

## Local Run

```bash
# 의존성 설치
npm install

# 사용자 웹 개발 서버
npm run dev:user

# API 개발 서버
npm run dev:api

# Prisma 클라이언트 재생성
npm run prisma:generate
```

## Docker Run

```bash
# 1. 환경 파일 준비
cp .env.example .env

# 2. 사용자 웹 + API + MySQL 실행
docker compose up --build
```

| 서비스    | 주소                      |
| --------- | ------------------------- |
| 사용자 웹 | http://localhost:5173     |
| API       | http://localhost:4000/api |
| MySQL     | localhost:3306            |

### 환경 변수 (.env)

```
# DB
MYSQL_DATABASE=kebo
MYSQL_USER=kebo
MYSQL_PASSWORD=kebo1234
MYSQL_ROOT_PASSWORD=root1234

# API
JWT_SECRET=kebo-dev-secret
GOOGLE_CLIENT_ID=               # Google OAuth 클라이언트 ID (선택)
GOOGLE_CLIENT_IDS=              # 복수 클라이언트 ID (선택, 쉼표 구분)
GOOGLE_CLIENT_SECRET=           # Google OAuth 시크릿 (선택)

# Frontend
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=          # Google OAuth 클라이언트 ID (선택)

# 포트 커스터마이징 (기본값)
FRONTEND_PORT=5173
API_PORT=4000
MYSQL_PORT=3306
```

---

## Database Migration

| 상황               | 방법                                                       |
| ------------------ | ---------------------------------------------------------- |
| 신규 설치          | `docker compose up --build` — `mysql-schema.sql` 자동 적용 |
| 기존 DB 업그레이드 | `docs/migrations/migrations.sql` 참고하여 수동 적용        |

```bash
# 마이그레이션 파일을 컨테이너에서 실행
docker cp docs/migrations/migrations.sql kebo-mysql:/tmp/migration.sql
docker exec kebo-mysql mysql -ukebo -pkebo1234 kebo -e "source /tmp/migration.sql;"

# 스키마 변경 후 Prisma 클라이언트 재생성 (Docker 환경)
docker exec kebo-api sh -c "cd /app/apps/api && node_modules/.bin/prisma generate"
docker restart kebo-api
```

---

## Features

### 인증

- 이메일 회원가입 / 로그인 (JWT)
- Google OAuth 소셜 로그인 및 계정 연동
- 회원 탈퇴 — DB 데이터 완전 삭제 (지출, 게시글, 리워드 등 Cascade)

### 가계부 탭

- 지출 기록 CRUD — 날짜, 카테고리, 금액, 국가, 메모, 영수증 이미지
- 국가별 통화 지원 + 환율 자동 계산 (KRW ↔ JPY)
- 환율 실시간 연동 (open.er-api.com, 1시간 캐시 / API 오류 시 fallback 값 사용)
- 기준 통화 변경 시 기존 지출 전체 자동 재환산
- 카테고리 필터 / 월별 조회

### 커뮤니티 탭

- 게시글 카테고리 3종 — 자랑(`brag`) / 팁 공유(`tip`) / 잡담(`chat`)
- 게시글 작성·수정·삭제, Tiptap 리치 텍스트 에디터 (서식·이미지 삽입)
- 이미지 첨부 — 클라이언트에서 1280px·75% JPEG 압축 후 base64 저장
- 게시글 목록 페이지네이션 (서버 사이드, 페이지당 n개)
- 목록에서 게시글 첫 번째 이미지 썸네일 미리보기
- 좋아요 토글
- 댓글 + 대댓글(1단계) — 이미지 첨부, 텍스트 없이 이미지만 제출 가능, 수정/삭제
- 목록에서 최근 댓글 3개 미리보기 (이미지 댓글은 `(사진)`/`(写真)` 표시)
- 게시글 상세: 전체 댓글 페이지네이션 (페이지당 10개)
- 작성자 프로필 사진 목록·상세 전체 표시

### 그룹 탭

- 그룹 생성 / 삭제 / 탈퇴
- 초대 코드로 즉시 입장 또는 가입 신청 → 호스트 승인/거절
- 공개 그룹 검색
- 호스트 권한 이전
- 그룹별 공유 지출 내역 관리
- 멤버 목록에 장착 케보몬 표시 (아바타 우측 겹침)
- 호스트 → "그룹 관리" / 일반 멤버 → "그룹 설정" UI 분리
- WebSocket 실시간 연동 — 가입 신청 즉시 호스트 알림, 승인/거절 시 새로고침 없이 즉시 반영

### 케보몬 탭

캐릭터 수집 & 리워드 시스템

| 항목        | 내용                                                                |
| ----------- | ------------------------------------------------------------------- |
| 캐릭터 종류 | 400종 (30가지 타입 × 6등급)                                         |
| 등급        | 커먼 / 언커먼 / 레어 / 에픽 / 레전더리 / 신화                       |
| 획득 방법   | 스타터 선택 / 업적 달성 / 가챠                                      |
| 가챠 비용   | 단챠 120P / 10연챠 1200P                                            |
| 확률        | 커먼 35% / 언커먼 26% / 레어 20% / 에픽 10% / 레전더리 6% / 신화 3% |
| 천장        | 80연 내 레전더리 이상 1종 보장                                      |
| 10연 보장   | 언커먼 이상 1종 보장                                                |
| 중복 보상   | 등급별 포인트 환산 (커먼 10P ~ 신화 100P)                           |

**업적** (188종)

- 카테고리 — 출석 / 연속 출석 / 지출 횟수 / 공유 횟수 / 게시글 / 포인트
- 카테고리별 접기/펼치기 토글, 진행도 프로그레스 바 표시
- 히든 업적 별도 섹션

**칭호** (30종)

- 등급 — 일반 / 희귀 / 영웅 / 전설 / 신화
- 신화 칭호: 무지개 shimmer 애니메이션
- 등급별 접기/펼치기 토글
- 마이페이지·게시글·댓글에 장착 칭호 뱃지 표시

**미션 포인트 획득 방법**

- 출석 체크 (로그인 시 KST 00시 기준) +50P
- 지출 기록 +50P
- 커뮤니티 게시글 작성 +50P
- 연속 출석 streak +20P/일

### 마이페이지

- 프로필 사진 업로드/삭제 (base64 로컬 저장)
- 닉네임 인라인 수정
- 장착 칭호 선택 (등급별 접기/펼치기 토글)
- 케보몬 도감 바로가기 카드 (현재 장착 캐릭터 미리보기)
- 월별 지출 바차트 — 테마 색상 연동
- 이번 달 총 지출 / 평균 지출 요약
- 내가 작성한 게시글 목록

### 설정

- **테마 색상** 10종 — 에메랄드, 로즈, 오션, 포레스트, 베리, 플레임, 슬레이트, 코랄, 핑크(sage), 망고
- **다크/라이트 모드** 토글
- **언어** — 한국어 / 日本語 (게임 UI, 카테고리명, 상대시간 등 전체 대응)
- 알림 설정 / 자동 백업 설정 (DB 영속화)
- 기준 국가·통화 변경
- Google 소셜 계정 연동
- 회원 탈퇴 (DB 완전 삭제)
