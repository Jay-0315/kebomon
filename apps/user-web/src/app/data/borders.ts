export const BORDER_STYLES: Record<string, { image: string }> = {
  s1_silver: { image: "/silver.png" },
  s1_gold: { image: "/gold.png" },
  s1_platinum: { image: "/platinum.png" },
  s1_diamond: { image: "/diamond.png" },
  s1_master: { image: "/master.png" },
  s1_challenger: { image: "/challenger.png" },
  s2_silver: { image: "/silver.png" },
  s2_gold: { image: "/gold.png" },
  s2_platinum: { image: "/platinum.png" },
  s2_diamond: { image: "/diamond.png" },
  s2_master: { image: "/master.png" },
  s2_challenger: { image: "/challenger.png" },
  s3_silver: { image: "/silver.png" },
  s3_gold: { image: "/gold.png" },
  s3_platinum: { image: "/platinum.png" },
  s3_diamond: { image: "/diamond.png" },
  s3_master: { image: "/master.png" },
  s3_challenger: { image: "/challenger.png" },
  gm: { image: "/GM.png" },
};

export const BORDER_HOLE_GEOMETRY: Record<
  string,
  { canvasW: number; canvasH: number; holeW: number; holeH: number; holeCx: number; holeCy: number }
> = {
  "/silver.png": { canvasW: 511, canvasH: 488, holeW: 231, holeH: 244, holeCx: 255, holeCy: 241.5 },
  "/gold.png": { canvasW: 511, canvasH: 488, holeW: 231, holeH: 244, holeCx: 255, holeCy: 241.5 },
  "/platinum.png": { canvasW: 511, canvasH: 488, holeW: 231, holeH: 245, holeCx: 255, holeCy: 242 },
  "/diamond.png": { canvasW: 501, canvasH: 381, holeW: 198, holeH: 198, holeCx: 253.5, holeCy: 193.5 },
  "/master.png": { canvasW: 225, canvasH: 204, holeW: 94, holeH: 102, holeCx: 114.5, holeCy: 100.5 },
  "/challenger.png": { canvasW: 184, canvasH: 204, holeW: 90, holeH: 92, holeCx: 92.5, holeCy: 98.5 },
  "/GM.png": { canvasW: 511, canvasH: 488, holeW: 231, holeH: 247, holeCx: 255, holeCy: 240 },
};

export interface BorderLayout {
  containerSize: number;
  frameW: number;
  frameH: number;
  frameLeft: number;
  frameTop: number;
  photoSize: number;
  photoLeft: number;
  photoTop: number;
}

export function getBorderLayout(imagePath: string, containerSize: number): BorderLayout {
  const g = BORDER_HOLE_GEOMETRY[imagePath];
  if (!g) {
    return {
      containerSize,
      frameW: containerSize,
      frameH: containerSize,
      frameLeft: 0,
      frameTop: 0,
      photoSize: containerSize,
      photoLeft: 0,
      photoTop: 0,
    };
  }
  const scale = Math.min(containerSize / g.canvasW, containerSize / g.canvasH);
  const frameW = g.canvasW * scale;
  const frameH = g.canvasH * scale;
  const frameLeft = (containerSize - frameW) / 2;
  const frameTop = (containerSize - frameH) / 2;
  const photoSize = ((g.holeW + g.holeH) / 2) * scale;
  return {
    containerSize,
    frameW,
    frameH,
    frameLeft,
    frameTop,
    photoSize,
    photoLeft: frameLeft + g.holeCx * scale - photoSize / 2,
    photoTop: frameTop + g.holeCy * scale - photoSize / 2,
  };
}

export const BORDER_NAMES: Record<string, { ko: string; ja: string; en: string }> = {
  s1_silver: { ko: "S1 실버", ja: "S1 シルバー", en: "S1 Silver" },
  s1_gold: { ko: "S1 골드", ja: "S1 ゴールド", en: "S1 Gold" },
  s1_platinum: { ko: "S1 플래티넘", ja: "S1 プラチナ", en: "S1 Platinum" },
  s1_diamond: { ko: "S1 다이아몬드", ja: "S1 ダイヤ", en: "S1 Diamond" },
  s1_master: { ko: "S1 마스터", ja: "S1 マスター", en: "S1 Master" },
  s1_challenger: { ko: "S1 챌린저", ja: "S1 チャレンジャー", en: "S1 Challenger" },
  s2_silver: { ko: "S2 실버", ja: "S2 シルバー", en: "S2 Silver" },
  s2_gold: { ko: "S2 골드", ja: "S2 ゴールド", en: "S2 Gold" },
  s2_platinum: { ko: "S2 플래티넘", ja: "S2 プラチナ", en: "S2 Platinum" },
  s2_diamond: { ko: "S2 다이아몬드", ja: "S2 ダイヤ", en: "S2 Diamond" },
  s2_master: { ko: "S2 마스터", ja: "S2 マスター", en: "S2 Master" },
  s2_challenger: { ko: "S2 챌린저", ja: "S2 チャレンジャー", en: "S2 Challenger" },
  s3_silver: { ko: "S3 실버", ja: "S3 シルバー", en: "S3 Silver" },
  s3_gold: { ko: "S3 골드", ja: "S3 ゴールド", en: "S3 Gold" },
  s3_platinum: { ko: "S3 플래티넘", ja: "S3 プラチナ", en: "S3 Platinum" },
  s3_diamond: { ko: "S3 다이아몬드", ja: "S3 ダイヤ", en: "S3 Diamond" },
  s3_master: { ko: "S3 마스터", ja: "S3 マスター", en: "S3 Master" },
  s3_challenger: { ko: "S3 챌린저", ja: "S3 チャレンジャー", en: "S3 Challenger" },
  gm: { ko: "GM", ja: "GM", en: "GM" },
};
