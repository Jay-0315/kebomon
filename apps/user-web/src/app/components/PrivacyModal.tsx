import { Shield, X } from "lucide-react";
import { useLang } from "../context/LangContext";

interface Props {
  onClose: () => void;
}

export default function PrivacyModal({ onClose }: Props) {
  const { t, lang } = useLang();

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-md max-w-lg w-full shadow-2xl border border-border flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3>{t("settings.privacy")}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 text-sm leading-relaxed">
          {lang === "ja" ? (
            <>
              <p className="text-muted-foreground text-xs">最終更新日：2026年5月29日</p>
              <p className="text-muted-foreground">KEBO（以下「本サービス」）は、個人情報の保護に関する法律（APPI）に基づき、以下のとおり個人情報を取り扱います。</p>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">1. 収集する個人情報の項目と利用目的</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>メールアドレス・パスワード（ハッシュ化） — 会員識別・認証</li>
                  <li>ニックネーム・プロフィール画像 — サービス内表示</li>
                  <li>Googleアカウント情報（ID・メール） — ソーシャルログイン連携</li>
                  <li>投稿・コメント・ケボモンリワード情報 — コミュニティ・ゲーム機能の提供</li>
                  <li>アクセスログ・接続環境情報 — 不正利用防止・サービス改善</li>
                </ul>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">2. 保有期間と利用停止</h4>
                <p className="text-muted-foreground">退会時に速やかに削除します。法令上の保存義務がある場合は当該期間保有します。ご本人から利用停止の請求があった場合は、遅滞なく対応します。</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">3. 個人情報の削除（廃棄）手順</h4>
                <p className="text-muted-foreground">退会処理時、データベース上の個人情報（投稿・コメント・リワード等）をカスケード削除します。電子ファイルは復元不可能な方法で削除されます。</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">4. 第三者への提供</h4>
                <p className="text-muted-foreground">原則として第三者に提供しません。Google OAuth連携を利用する場合、Googleの<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-primary underline">プライバシーポリシー</a>が適用されます。</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">5. 業務委託</h4>
                <p className="text-muted-foreground">現在、個人情報の取り扱いを外部に委託していません。</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">6. ご本人の権利と行使方法</h4>
                <p className="text-muted-foreground">個人情報の開示・訂正・利用停止・削除を請求できます。設定画面の「退会」から全データを即時削除できます。その他の請求はお問い合わせ先までご連絡ください。</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">7. 安全管理措置</h4>
                <p className="text-muted-foreground">パスワードはbcryptでハッシュ化して保存します。通信はHTTPS（TLS）で暗号化します。JWTによるアクセス制御を実施しています。</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">8. 個人情報保護管理者・お問い合わせ</h4>
                <p className="text-muted-foreground">メール: support@kebo.app</p>
              </section>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-xs">최종 수정일: 2026년 5월 29일</p>
              <p className="text-muted-foreground">KEBO(이하 "서비스")는 「개인정보 보호법」 제30조에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속하게 처리하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.</p>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">1. 수집하는 개인정보 항목 및 이용 목적</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>이메일 주소·비밀번호(해시 저장) — 회원 식별 및 인증</li>
                  <li>닉네임·프로필 사진 — 서비스 내 표시</li>
                  <li>Google 계정 정보(ID·이메일) — 소셜 로그인 연동</li>
                  <li>게시글·댓글·케보몬 리워드 정보 — 커뮤니티·게임 기능 제공</li>
                  <li>접속 로그·접속 환경 정보 — 부정 이용 방지 및 서비스 개선</li>
                </ul>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">2. 개인정보의 처리 및 보유 기간</h4>
                <p className="text-muted-foreground">회원 탈퇴 시 지체 없이 파기합니다. 관련 법령에 따라 보존 의무가 있는 경우 해당 기간 동안 보유합니다.</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">3. 개인정보의 파기 절차 및 방법</h4>
                <p className="text-muted-foreground">회원 탈퇴 처리 시 데이터베이스에서 개인정보(게시글·댓글·리워드 등)를 즉시 삭제(CASCADE)합니다. 전자파일은 복구 불가능한 방법으로 영구 삭제합니다.</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">4. 개인정보의 제3자 제공</h4>
                <p className="text-muted-foreground">원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. Google OAuth 연동 시 Google의 <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-primary underline">개인정보처리방침</a>이 적용됩니다.</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">5. 개인정보 처리 위탁</h4>
                <p className="text-muted-foreground">현재 개인정보 처리를 외부에 위탁하지 않습니다.</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">6. 정보주체의 권리·의무 및 행사 방법</h4>
                <p className="text-muted-foreground">이용자는 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 설정 화면의 회원 탈퇴를 통해 모든 데이터를 즉시 삭제할 수 있으며, 그 외 요청은 아래 문의처로 연락해주세요.</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">7. 개인정보의 안전성 확보 조치</h4>
                <p className="text-muted-foreground">비밀번호는 bcrypt로 암호화하여 저장합니다. 통신 구간은 HTTPS(TLS)로 암호화합니다. JWT 기반 접근 제어를 적용합니다.</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">8. 개인정보보호책임자</h4>
                <p className="text-muted-foreground">이메일: support@kebo.app</p>
              </section>
              <section className="space-y-1.5">
                <h4 className="font-semibold text-foreground">9. 권익침해 구제 방법</h4>
                <p className="text-muted-foreground">개인정보 침해로 인한 구제를 받기 위해 아래 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>개인정보분쟁조정위원회: <a href="https://www.kopico.go.kr" target="_blank" rel="noreferrer" className="text-primary underline">www.kopico.go.kr</a> / 1833-6972</li>
                  <li>개인정보침해신고센터: <a href="https://privacy.kisa.or.kr" target="_blank" rel="noreferrer" className="text-primary underline">privacy.kisa.or.kr</a> / 118</li>
                  <li>대검찰청 사이버수사과: <a href="https://www.spo.go.kr" target="_blank" rel="noreferrer" className="text-primary underline">www.spo.go.kr</a> / 1301</li>
                  <li>경찰청 사이버안전국: <a href="https://ecrm.cyber.go.kr" target="_blank" rel="noreferrer" className="text-primary underline">ecrm.cyber.go.kr</a> / 182</li>
                </ul>
              </section>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {lang === "ja" ? "閉じる" : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
