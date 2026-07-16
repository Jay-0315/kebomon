/**
 * 업로드 이미지를 리사이즈 + 재인코딩해서 base64 데이터 URL로 반환.
 * 프로필 사진 등은 DB에 원본 그대로 저장되면 게시글 목록 응답에 매번 통째로 실려서
 * 페이지 로딩이 크게 느려지므로(예: 원본 폰카메라 사진 수 MB), 업로드 시점에 압축한다.
 */
export function compressImage(file: File, maxSize = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("파일을 읽을 수 없습니다."));
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        reject(new Error("파일을 읽을 수 없습니다."));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // 캔버스를 못 쓰면(구형 브라우저 등) 압축 없이 원본 반환
          resolve(dataUrl);
          return;
        }
        // JPEG는 투명 배경을 지원하지 않으므로 흰 배경을 먼저 깔아준다
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
