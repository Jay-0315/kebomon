import type { ReactElement } from "react";

export interface PixelEmojiDef {
  key: string;
  Component: () => ReactElement;
}

const px = { imageRendering: "pixelated" as const };
const SZ = 28;

/* ── Face base (oval) ── */
function faceBase(c: string): ReactElement {
  return (
    <>
      <rect x="3" y="1" width="10" height="14" fill={c}/>
      <rect x="1" y="4" width="14" height="8" fill={c}/>
      <rect x="2" y="2" width="12" height="12" fill={c}/>
    </>
  );
}

/* ── 1. Happy ── */
function PxHappy(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {faceBase("#FFD700")}
      {/* eyes */}
      <rect x="4" y="5" width="2" height="2" fill="#1A1A1A"/>
      <rect x="10" y="5" width="2" height="2" fill="#1A1A1A"/>
      {/* eye shine */}
      <rect x="5" y="5" width="1" height="1" fill="#FFFFFF"/>
      <rect x="11" y="5" width="1" height="1" fill="#FFFFFF"/>
      {/* cheeks */}
      <rect x="2" y="8" width="2" height="1" fill="#FFB3BA"/>
      <rect x="12" y="8" width="2" height="1" fill="#FFB3BA"/>
      {/* smile arc */}
      <rect x="4" y="9" width="1" height="1" fill="#1A1A1A"/>
      <rect x="5" y="10" width="6" height="1" fill="#1A1A1A"/>
      <rect x="11" y="9" width="1" height="1" fill="#1A1A1A"/>
    </svg>
  );
}

/* ── 2. Sleepy ── */
function PxSleep(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {faceBase("#9DB2E6")}
      {/* closed curved eyes */}
      <rect x="3" y="7" width="4" height="1" fill="#1A1A1A"/>
      <rect x="4" y="6" width="2" height="1" fill="#1A1A1A"/>
      <rect x="9" y="7" width="4" height="1" fill="#1A1A1A"/>
      <rect x="10" y="6" width="2" height="1" fill="#1A1A1A"/>
      {/* open snoring mouth */}
      <rect x="5" y="10" width="5" height="1" fill="#1A1A1A"/>
      <rect x="6" y="11" width="3" height="1" fill="#1A1A1A"/>
      {/* Z z (outside face top-right) */}
      <rect x="12" y="0" width="3" height="1" fill="#FFFFFF"/>
      <rect x="13" y="1" width="1" height="1" fill="#FFFFFF"/>
      <rect x="12" y="2" width="3" height="1" fill="#FFFFFF"/>
      <rect x="14" y="3" width="2" height="1" fill="#C8D8FF"/>
      <rect x="14" y="4" width="1" height="1" fill="#C8D8FF"/>
      <rect x="13" y="5" width="2" height="1" fill="#C8D8FF"/>
    </svg>
  );
}

/* ── 3. Sad / Cry ── */
function PxSad(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {faceBase("#6BAED6")}
      {/* dot eyes */}
      <rect x="4" y="5" width="2" height="2" fill="#1A1A1A"/>
      <rect x="10" y="5" width="2" height="2" fill="#1A1A1A"/>
      {/* teardrop left */}
      <rect x="5" y="7" width="1" height="2" fill="#ADE8F4"/>
      <rect x="4" y="9" width="2" height="1" fill="#ADE8F4"/>
      {/* frown */}
      <rect x="4" y="11" width="1" height="1" fill="#1A1A1A"/>
      <rect x="5" y="10" width="6" height="1" fill="#1A1A1A"/>
      <rect x="11" y="11" width="1" height="1" fill="#1A1A1A"/>
    </svg>
  );
}

/* ── 4. Cool (sunglasses) ── */
function PxCool(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {faceBase("#FFD700")}
      {/* left lens */}
      <rect x="2" y="5" width="5" height="3" fill="#1A1A1A"/>
      {/* right lens */}
      <rect x="9" y="5" width="5" height="3" fill="#1A1A1A"/>
      {/* bridge */}
      <rect x="7" y="6" width="2" height="1" fill="#1A1A1A"/>
      {/* frame top bar */}
      <rect x="1" y="5" width="1" height="1" fill="#555555"/>
      <rect x="14" y="5" width="1" height="1" fill="#555555"/>
      {/* lens shine */}
      <rect x="3" y="5" width="1" height="1" fill="#4A4A4A"/>
      <rect x="10" y="5" width="1" height="1" fill="#4A4A4A"/>
      {/* smirk */}
      <rect x="7" y="10" width="4" height="1" fill="#1A1A1A"/>
      <rect x="11" y="9" width="1" height="1" fill="#1A1A1A"/>
    </svg>
  );
}

/* ── 5. Angry ── */
function PxAngry(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {faceBase("#E53E3E")}
      {/* angled brows */}
      <rect x="3" y="4" width="1" height="1" fill="#1A1A1A"/>
      <rect x="4" y="5" width="3" height="1" fill="#1A1A1A"/>
      <rect x="12" y="4" width="1" height="1" fill="#1A1A1A"/>
      <rect x="9" y="5" width="3" height="1" fill="#1A1A1A"/>
      {/* eyes */}
      <rect x="4" y="6" width="2" height="2" fill="#1A1A1A"/>
      <rect x="10" y="6" width="2" height="2" fill="#1A1A1A"/>
      {/* steam veins */}
      <rect x="2" y="7" width="1" height="1" fill="#C0392B"/>
      <rect x="13" y="7" width="1" height="1" fill="#C0392B"/>
      {/* frown */}
      <rect x="4" y="11" width="1" height="1" fill="#1A1A1A"/>
      <rect x="5" y="10" width="6" height="1" fill="#1A1A1A"/>
      <rect x="11" y="11" width="1" height="1" fill="#1A1A1A"/>
    </svg>
  );
}

/* ── 6. Heart ── */
function PxHeart(): ReactElement {
  const R = "#E53E3E", L = "#FF8080";
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* left bump */}
      <rect x="1" y="3" width="6" height="5" fill={R}/>
      <rect x="2" y="2" width="4" height="1" fill={R}/>
      <rect x="3" y="1" width="2" height="1" fill={R}/>
      {/* right bump */}
      <rect x="9" y="3" width="6" height="5" fill={R}/>
      <rect x="10" y="2" width="4" height="1" fill={R}/>
      <rect x="11" y="1" width="2" height="1" fill={R}/>
      {/* wide middle */}
      <rect x="0" y="5" width="16" height="3" fill={R}/>
      {/* taper down */}
      <rect x="1" y="8" width="14" height="2" fill={R}/>
      <rect x="2" y="10" width="12" height="1" fill={R}/>
      <rect x="3" y="11" width="10" height="1" fill={R}/>
      <rect x="4" y="12" width="8" height="1" fill={R}/>
      <rect x="5" y="13" width="6" height="1" fill={R}/>
      <rect x="6" y="14" width="4" height="1" fill={R}/>
      <rect x="7" y="15" width="2" height="1" fill={R}/>
      {/* shine */}
      <rect x="3" y="4" width="3" height="2" fill={L}/>
      <rect x="10" y="4" width="2" height="2" fill={L}/>
    </svg>
  );
}

/* ── 7. Fire ── */
function PxFire(): ReactElement {
  const [R, O, Y, W] = ["#C0392B", "#E67E22", "#F1C40F", "#FFFDE7"];
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* red base */}
      <rect x="3" y="10" width="10" height="6" fill={R}/>
      <rect x="2" y="8" width="12" height="4" fill={R}/>
      <rect x="4" y="7" width="8" height="2" fill={R}/>
      {/* side tongues */}
      <rect x="2" y="10" width="2" height="3" fill={R}/>
      <rect x="12" y="10" width="2" height="3" fill={R}/>
      {/* orange mid */}
      <rect x="4" y="5" width="8" height="5" fill={O}/>
      <rect x="3" y="6" width="10" height="4" fill={O}/>
      <rect x="5" y="3" width="6" height="3" fill={O}/>
      {/* yellow inner */}
      <rect x="5" y="6" width="6" height="4" fill={Y}/>
      <rect x="6" y="4" width="4" height="3" fill={Y}/>
      {/* white tip */}
      <rect x="7" y="1" width="2" height="4" fill={W}/>
      <rect x="6" y="2" width="4" height="2" fill={W}/>
    </svg>
  );
}

/* ── 8. Star (4-point sparkle) ── */
function PxStar(): ReactElement {
  const [Y, W] = ["#FFD700", "#FFEE58"];
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* center diamond */}
      <rect x="5" y="5" width="6" height="6" fill={Y}/>
      <rect x="4" y="6" width="8" height="4" fill={Y}/>
      <rect x="6" y="4" width="4" height="8" fill={Y}/>
      {/* top spike */}
      <rect x="7" y="0" width="2" height="4" fill={Y}/>
      <rect x="6" y="1" width="4" height="2" fill={Y}/>
      {/* bottom spike */}
      <rect x="7" y="12" width="2" height="4" fill={Y}/>
      <rect x="6" y="13" width="4" height="2" fill={Y}/>
      {/* left spike */}
      <rect x="0" y="7" width="4" height="2" fill={Y}/>
      <rect x="1" y="6" width="2" height="4" fill={Y}/>
      {/* right spike */}
      <rect x="12" y="7" width="4" height="2" fill={Y}/>
      <rect x="13" y="6" width="2" height="4" fill={Y}/>
      {/* bright center */}
      <rect x="6" y="6" width="4" height="4" fill={W}/>
    </svg>
  );
}

/* ── 9. Coin (₩) ── */
function PxCoin(): ReactElement {
  const [G, D, S] = ["#FFD700", "#B8860B", "#FFF9C4"];
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* coin body */}
      <rect x="3" y="1" width="10" height="14" fill={G}/>
      <rect x="1" y="4" width="14" height="8" fill={G}/>
      <rect x="2" y="2" width="12" height="12" fill={G}/>
      {/* rim */}
      <rect x="3" y="1" width="10" height="1" fill={D}/>
      <rect x="3" y="14" width="10" height="1" fill={D}/>
      <rect x="1" y="4" width="1" height="8" fill={D}/>
      <rect x="14" y="4" width="1" height="8" fill={D}/>
      <rect x="2" y="2" width="1" height="2" fill={D}/>
      <rect x="13" y="2" width="1" height="2" fill={D}/>
      <rect x="2" y="12" width="1" height="2" fill={D}/>
      <rect x="13" y="12" width="1" height="2" fill={D}/>
      {/* W shape (₩) */}
      <rect x="4" y="5" width="2" height="5" fill={D}/>
      <rect x="10" y="5" width="2" height="5" fill={D}/>
      <rect x="7" y="7" width="2" height="3" fill={D}/>
      <rect x="4" y="8" width="8" height="1" fill={D}/>
      <rect x="4" y="10" width="8" height="1" fill={D}/>
      <rect x="4" y="11" width="8" height="1" fill={D}/>
      {/* shine */}
      <rect x="3" y="3" width="3" height="2" fill={S}/>
    </svg>
  );
}

/* ── 10. Bowl of noodles ── */
function PxBowl(): ReactElement {
  const [BW, IN, ST, NL] = ["#8B4513", "#FFF8E1", "#CFD8DC", "#D2691E"];
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* steam */}
      <rect x="3" y="0" width="1" height="3" fill={ST}/>
      <rect x="7" y="0" width="1" height="4" fill={ST}/>
      <rect x="11" y="0" width="1" height="3" fill={ST}/>
      {/* bowl opening */}
      <rect x="1" y="5" width="14" height="2" fill={BW}/>
      <rect x="2" y="4" width="12" height="1" fill={BW}/>
      {/* bowl inside */}
      <rect x="2" y="7" width="12" height="4" fill={IN}/>
      {/* noodles */}
      <rect x="3" y="7" width="10" height="1" fill={NL}/>
      <rect x="3" y="9" width="8" height="1" fill={NL}/>
      <rect x="5" y="8" width="6" height="1" fill={NL}/>
      {/* bowl bottom */}
      <rect x="2" y="11" width="12" height="2" fill={BW}/>
      <rect x="4" y="13" width="8" height="1" fill={BW}/>
      <rect x="6" y="14" width="4" height="1" fill={BW}/>
    </svg>
  );
}

/* ── 11. Airplane ── */
function PxPlane(): ReactElement {
  const [W, G] = ["#ECEFF1", "#90A4AE"];
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* fuselage */}
      <rect x="1" y="7" width="11" height="2" fill={W}/>
      <rect x="2" y="6" width="9" height="4" fill={W}/>
      {/* nose cone */}
      <rect x="12" y="7" width="2" height="2" fill={W}/>
      <rect x="13" y="7" width="2" height="2" fill={G}/>
      <rect x="14" y="8" width="2" height="1" fill={G}/>
      {/* upper main wing */}
      <rect x="3" y="3" width="7" height="3" fill={G}/>
      <rect x="5" y="2" width="5" height="1" fill={G}/>
      <rect x="7" y="1" width="3" height="1" fill={G}/>
      {/* lower main wing */}
      <rect x="3" y="10" width="7" height="3" fill={G}/>
      <rect x="5" y="13" width="5" height="1" fill={G}/>
      <rect x="7" y="14" width="3" height="1" fill={G}/>
      {/* tail fin */}
      <rect x="1" y="5" width="3" height="2" fill={G}/>
      <rect x="1" y="9" width="3" height="2" fill={G}/>
      {/* windows */}
      <rect x="7" y="7" width="2" height="2" fill="#B3E5FC"/>
      <rect x="4" y="7" width="2" height="2" fill="#B3E5FC"/>
      {/* stripe */}
      <rect x="2" y="8" width="12" height="1" fill="#EF5350"/>
    </svg>
  );
}

/* ── 12. Trophy ── */
function PxTrophy(): ReactElement {
  const [G, D, S] = ["#FFD700", "#B8860B", "#FFF9C4"];
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* cup body */}
      <rect x="4" y="1" width="8" height="7" fill={G}/>
      <rect x="3" y="2" width="10" height="5" fill={G}/>
      {/* handles */}
      <rect x="1" y="2" width="2" height="4" fill={G}/>
      <rect x="2" y="6" width="2" height="2" fill={G}/>
      <rect x="13" y="2" width="2" height="4" fill={G}/>
      <rect x="12" y="6" width="2" height="2" fill={G}/>
      {/* cup taper */}
      <rect x="5" y="8" width="6" height="1" fill={G}/>
      <rect x="6" y="9" width="4" height="1" fill={G}/>
      {/* stem */}
      <rect x="7" y="10" width="2" height="3" fill={D}/>
      {/* base */}
      <rect x="4" y="13" width="8" height="2" fill={D}/>
      <rect x="3" y="14" width="10" height="1" fill={D}/>
      {/* shine */}
      <rect x="5" y="2" width="2" height="4" fill={S}/>
      {/* star on cup */}
      <rect x="8" y="3" width="2" height="1" fill={D}/>
      <rect x="7" y="4" width="4" height="1" fill={D}/>
      <rect x="8" y="5" width="2" height="1" fill={D}/>
    </svg>
  );
}

/* ── 13. Lightning bolt ── */
function PxLightning(): ReactElement {
  const [Y, W] = ["#FFD700", "#FFEE58"];
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* bolt top */}
      <rect x="8" y="0" width="5" height="1" fill={Y}/>
      <rect x="7" y="1" width="5" height="1" fill={Y}/>
      <rect x="6" y="2" width="5" height="1" fill={Y}/>
      <rect x="5" y="3" width="5" height="1" fill={Y}/>
      <rect x="4" y="4" width="5" height="1" fill={Y}/>
      {/* middle bulge */}
      <rect x="4" y="5" width="8" height="1" fill={Y}/>
      <rect x="5" y="6" width="7" height="1" fill={Y}/>
      <rect x="5" y="7" width="6" height="1" fill={Y}/>
      {/* bolt bottom */}
      <rect x="6" y="8" width="5" height="1" fill={Y}/>
      <rect x="5" y="9" width="5" height="1" fill={Y}/>
      <rect x="4" y="10" width="5" height="1" fill={Y}/>
      <rect x="3" y="11" width="5" height="1" fill={Y}/>
      <rect x="3" y="12" width="4" height="1" fill={Y}/>
      {/* bright inner */}
      <rect x="6" y="2" width="3" height="1" fill={W}/>
      <rect x="5" y="5" width="4" height="1" fill={W}/>
      <rect x="5" y="9" width="3" height="1" fill={W}/>
    </svg>
  );
}

/* ── 14. Map pin ── */
function PxPin(): ReactElement {
  const [R, D, W] = ["#E53E3E", "#B91C1C", "#FFFFFF"];
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* pin circle */}
      <rect x="4" y="1" width="8" height="8" fill={R}/>
      <rect x="3" y="2" width="10" height="6" fill={R}/>
      <rect x="5" y="0" width="6" height="1" fill={R}/>
      <rect x="5" y="9" width="6" height="1" fill={R}/>
      {/* inner hole */}
      <rect x="6" y="3" width="4" height="4" fill={D}/>
      <rect x="5" y="4" width="6" height="2" fill={D}/>
      <rect x="6" y="4" width="4" height="2" fill="#FF9999"/>
      {/* shine */}
      <rect x="5" y="2" width="2" height="2" fill={W}/>
      {/* pin tail */}
      <rect x="7" y="10" width="2" height="2" fill={R}/>
      <rect x="7" y="12" width="2" height="2" fill={D}/>
      <rect x="8" y="14" width="1" height="2" fill={D}/>
    </svg>
  );
}

/* ── 15. Camera ── */
function PxCamera(): ReactElement {
  const [B, G, L] = ["#37474F", "#546E7A", "#B3E5FC"];
  return (
    <svg viewBox="0 0 16 16" width={SZ} height={SZ} style={px}>
      {/* camera body */}
      <rect x="1" y="4" width="14" height="10" fill={B}/>
      {/* viewfinder hump */}
      <rect x="4" y="2" width="5" height="3" fill={B}/>
      {/* flash */}
      <rect x="10" y="2" width="3" height="2" fill="#FFD54F"/>
      {/* lens outer ring */}
      <rect x="4" y="6" width="8" height="6" fill={G}/>
      <rect x="3" y="7" width="10" height="4" fill={G}/>
      {/* lens inner */}
      <rect x="5" y="7" width="6" height="4" fill="#0D47A1"/>
      <rect x="4" y="8" width="8" height="2" fill="#0D47A1"/>
      {/* lens glass reflection */}
      <rect x="6" y="8" width="3" height="2" fill={L}/>
      <rect x="5" y="9" width="2" height="1" fill={L}/>
      {/* shutter button */}
      <rect x="11" y="5" width="2" height="1" fill="#EF5350"/>
    </svg>
  );
}

/* ── Export list ── */
export const PIXEL_EMOJI_LIST: PixelEmojiDef[] = [
  { key: "happy",     Component: PxHappy     },
  { key: "sleep",     Component: PxSleep     },
  { key: "sad",       Component: PxSad       },
  { key: "cool",      Component: PxCool      },
  { key: "angry",     Component: PxAngry     },
  { key: "heart",     Component: PxHeart     },
  { key: "fire",      Component: PxFire      },
  { key: "star",      Component: PxStar      },
  { key: "coin",      Component: PxCoin      },
  { key: "bowl",      Component: PxBowl      },
  { key: "plane",     Component: PxPlane     },
  { key: "trophy",    Component: PxTrophy    },
  { key: "lightning", Component: PxLightning },
  { key: "pin",       Component: PxPin       },
  { key: "camera",    Component: PxCamera    },
];

/** key → 픽셀 이모지 컴포넌트 반환 (없으면 null) */
export function getPixelEmoji(key: string): PixelEmojiDef | undefined {
  return PIXEL_EMOJI_LIST.find((e) => e.key === key);
}
