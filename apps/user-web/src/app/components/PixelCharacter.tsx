import { useState, type ReactElement } from "react";
import { CHARACTERS } from "../data/characters";
import type { CharacterType, CharacterRarity } from "../data/characters";

interface Colors { p: string; s: string; a: string }
type Frame = "idle" | "react";
type Renderer = (c: Colors, sz: number, f: Frame) => ReactElement;

const B = "#1a1a1a";
const W = "#FFFFFF";

export const TYPE_COLORS: Record<CharacterType, Colors> = {
  slime:     { p: "#7CC88A", s: "#5EA06B", a: "#E8D84A" },
  cat:       { p: "#D4996A", s: "#A67048", a: "#FFD0A0" },
  rabbit:    { p: "#F0DEC8", s: "#C8B49A", a: "#FF9EAA" },
  ghost:     { p: "#B8C8E0", s: "#8FA5BC", a: "#7DE8EA" },
  plant:     { p: "#5A9E6F", s: "#3D7A50", a: "#FDD835" },
  fish:      { p: "#4A90D9", s: "#2E6BA6", a: "#FFB347" },
  owl:       { p: "#8B7355", s: "#6B5840", a: "#FFE880" },
  bear:      { p: "#A0724A", s: "#7A5436", a: "#F5DEB3" },
  turtle:    { p: "#5B7A3C", s: "#3E5829", a: "#C8A84B" },
  fox:       { p: "#D4722A", s: "#A85520", a: "#F5F0E0" },
  wolf:      { p: "#707C8C", s: "#505A6A", a: "#C8D0D8" },
  robot:     { p: "#8090A8", s: "#606D80", a: "#00E5FF" },
  dragon:    { p: "#6B5B95", s: "#4A3E6E", a: "#FF6B35" },
  phoenix:   { p: "#CC4A1A", s: "#A83510", a: "#FFD700" },
  unicorn:   { p: "#C8A8D0", s: "#A088B0", a: "#FFE4F0" },
  horse:     { p: "#8B6914", s: "#6B5010", a: "#F8F8F0" },
  tiger:     { p: "#D4801A", s: "#A0600E", a: "#1A1A1A" },
  lion:      { p: "#C8962A", s: "#A07020", a: "#FFFFF0" },
  snake:     { p: "#4A8040", s: "#2E5F2C", a: "#FFE066" },
  deer:      { p: "#A07048", s: "#7A5234", a: "#F0E8C8" },
  raven:     { p: "#2A2A3A", s: "#1A1A2A", a: "#5050FF" },
  eagle:     { p: "#7A5A20", s: "#5A3F10", a: "#F5F5DC" },
  whale:     { p: "#3A6480", s: "#244860", a: "#E0E8F8" },
  boar:      { p: "#7A6050", s: "#5A4438", a: "#FF9090" },
  elephant:  { p: "#808090", s: "#606070", a: "#F0E0D0" },
  monkey:    { p: "#8B6040", s: "#6B4828", a: "#FFB8A0" },
  beetle:    { p: "#2A4A2A", s: "#1A3A1A", a: "#00CC77" },
  crocodile: { p: "#4A7040", s: "#304C28", a: "#E8D870" },
  demon:     { p: "#8A2020", s: "#6A1010", a: "#FF6020" },
  angel:     { p: "#F0E8D0", s: "#D0C8B0", a: "#FFE060" },
};

/* ─── SLIME ─── */
const slime: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* left mini-slime */}
    <rect x="6" y="14" width="12" height="4" fill={s} />
    <rect x="2" y="18" width="20" height="4" fill={p} />
    <rect x="0" y="22" width="24" height="14" fill={p} />
    <rect x="2" y="36" width="20" height="4" fill={p} />
    <rect x="2" y="40" width="6" height="4" fill={p} />
    <rect x="16" y="40" width="6" height="4" fill={p} />
    {/* left highlight */}
    <rect x="4" y="22" width="8" height="6" fill={W} fillOpacity={0.3} />
    {/* left eyes */}
    <rect x="4" y="26" width="6" height="6" fill={B} />
    <rect x="14" y="26" width="6" height="6" fill={B} />
    <rect x="4" y="26" width="3" height="3" fill={W} />
    <rect x="14" y="26" width="3" height="3" fill={W} />
    <rect x="6" y="28" width="2" height="2" fill={B} />
    <rect x="16" y="28" width="2" height="2" fill={B} />
    {/* left mouth */}
    <rect x="6" y="34" width="10" height="3" fill={a} />
    {/* right mini-slime */}
    <rect x="46" y="14" width="12" height="4" fill={s} />
    <rect x="42" y="18" width="20" height="4" fill={p} />
    <rect x="40" y="22" width="24" height="14" fill={p} />
    <rect x="42" y="36" width="20" height="4" fill={p} />
    <rect x="42" y="40" width="6" height="4" fill={p} />
    <rect x="56" y="40" width="6" height="4" fill={p} />
    <rect x="44" y="22" width="8" height="6" fill={W} fillOpacity={0.3} />
    <rect x="44" y="26" width="6" height="6" fill={B} />
    <rect x="54" y="26" width="6" height="6" fill={B} />
    <rect x="44" y="26" width="3" height="3" fill={W} />
    <rect x="54" y="26" width="3" height="3" fill={W} />
    <rect x="46" y="28" width="2" height="2" fill={B} />
    <rect x="56" y="28" width="2" height="2" fill={B} />
    <rect x="46" y="34" width="10" height="3" fill={a} />
    {/* split gap dots */}
    <rect x="28" y="22" width="4" height="4" fill={s} fillOpacity={0.8} />
    <rect x="30" y="30" width="4" height="4" fill={s} fillOpacity={0.6} />
    <rect x="28" y="38" width="4" height="4" fill={s} fillOpacity={0.4} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* antennae */}
    <rect x="22" y="8" width="4" height="6" fill={s} />
    <rect x="38" y="8" width="4" height="6" fill={s} />
    <rect x="20" y="6" width="8" height="4" fill={s} />
    <rect x="36" y="6" width="8" height="4" fill={s} />
    {/* body */}
    <rect x="18" y="14" width="28" height="4" fill={p} />
    <rect x="14" y="18" width="36" height="4" fill={p} />
    <rect x="10" y="22" width="44" height="18" fill={p} />
    <rect x="14" y="40" width="36" height="4" fill={p} />
    <rect x="18" y="44" width="28" height="4" fill={p} />
    {/* feet nubs */}
    <rect x="14" y="48" width="10" height="4" fill={p} />
    <rect x="28" y="48" width="8" height="4" fill={p} />
    <rect x="40" y="48" width="10" height="4" fill={p} />
    {/* highlight dome */}
    <rect x="18" y="22" width="16" height="8" fill={W} fillOpacity={0.3} />
    <rect x="18" y="22" width="8" height="4" fill={W} fillOpacity={0.2} />
    {/* shadow bottom */}
    <rect x="14" y="36" width="36" height="6" fill={B} fillOpacity={0.1} />
    {/* eyes */}
    <rect x="20" y="26" width="8" height="8" fill={B} />
    <rect x="36" y="26" width="8" height="8" fill={B} />
    <rect x="20" y="26" width="4" height="4" fill={W} />
    <rect x="36" y="26" width="4" height="4" fill={W} />
    <rect x="22" y="28" width="3" height="3" fill={B} />
    <rect x="38" y="28" width="3" height="3" fill={B} />
    <rect x="22" y="28" width="1" height="1" fill={W} />
    <rect x="38" y="28" width="1" height="1" fill={W} />
    {/* mouth */}
    <rect x="26" y="36" width="12" height="3" fill={a} />
    <rect x="28" y="39" width="8" height="2" fill={a} />
  </svg>
);

/* ─── CAT ─── */
const cat: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="10" y="6" width="10" height="14" fill={p} />
    <rect x="44" y="6" width="10" height="14" fill={p} />
    <rect x="13" y="9" width="5" height="8" fill={a} />
    <rect x="46" y="9" width="5" height="8" fill={a} />
    {/* head */}
    <rect x="12" y="18" width="40" height="22" fill={p} />
    <rect x="8" y="22" width="48" height="14" fill={p} />
    {/* face highlight */}
    <rect x="18" y="20" width="12" height="8" fill={W} fillOpacity={0.2} />
    {/* focused slit eyes */}
    <rect x="18" y="22" width="10" height="12" fill={B} />
    <rect x="36" y="22" width="10" height="12" fill={B} />
    <rect x="18" y="22" width="5" height="5" fill={W} />
    <rect x="36" y="22" width="5" height="5" fill={W} />
    <rect x="21" y="25" width="3" height="6" fill={B} />
    <rect x="39" y="25" width="3" height="6" fill={B} />
    <rect x="21" y="25" width="2" height="2" fill={W} />
    <rect x="39" y="25" width="2" height="2" fill={W} />
    {/* whiskers */}
    <rect x="6" y="30" width="12" height="2" fill={s} />
    <rect x="46" y="30" width="12" height="2" fill={s} />
    <rect x="4" y="34" width="14" height="2" fill={s} />
    <rect x="46" y="34" width="14" height="2" fill={s} />
    {/* nose + mouth */}
    <rect x="28" y="30" width="8" height="4" fill={a} />
    <rect x="26" y="34" width="4" height="4" fill={s} />
    <rect x="34" y="34" width="4" height="4" fill={s} />
    {/* body */}
    <rect x="16" y="40" width="28" height="16" fill={p} />
    {/* extended swipe arm */}
    <rect x="44" y="34" width="16" height="10" fill={p} />
    <rect x="52" y="26" width="10" height="10" fill={p} />
    {/* claws */}
    <rect x="56" y="22" width="4" height="4" fill={a} />
    <rect x="60" y="26" width="4" height="4" fill={a} />
    <rect x="56" y="30" width="4" height="4" fill={a} />
    {/* paws */}
    <rect x="18" y="56" width="10" height="4" fill={s} />
    <rect x="36" y="56" width="10" height="4" fill={s} />
    {/* tail */}
    <rect x="44" y="40" width="10" height="4" fill={s} />
    <rect x="50" y="44" width="10" height="8" fill={s} />
    <rect x="54" y="52" width="8" height="4" fill={s} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="10" y="6" width="10" height="14" fill={p} />
    <rect x="44" y="6" width="10" height="14" fill={p} />
    <rect x="13" y="9" width="5" height="8" fill={a} />
    <rect x="46" y="9" width="5" height="8" fill={a} />
    {/* head */}
    <rect x="12" y="18" width="40" height="22" fill={p} />
    <rect x="8" y="22" width="48" height="14" fill={p} />
    <rect x="18" y="20" width="12" height="8" fill={W} fillOpacity={0.2} />
    {/* eyes */}
    <rect x="18" y="22" width="10" height="10" fill={B} />
    <rect x="36" y="22" width="10" height="10" fill={B} />
    <rect x="18" y="22" width="5" height="5" fill={W} />
    <rect x="36" y="22" width="5" height="5" fill={W} />
    <rect x="21" y="25" width="4" height="4" fill={B} />
    <rect x="39" y="25" width="4" height="4" fill={B} />
    <rect x="21" y="25" width="2" height="2" fill={W} />
    <rect x="39" y="25" width="2" height="2" fill={W} />
    {/* whiskers */}
    <rect x="6" y="30" width="12" height="2" fill={s} />
    <rect x="46" y="30" width="12" height="2" fill={s} />
    <rect x="4" y="34" width="14" height="2" fill={s} />
    <rect x="46" y="34" width="14" height="2" fill={s} />
    {/* nose + mouth */}
    <rect x="28" y="30" width="8" height="4" fill={a} />
    <rect x="26" y="34" width="4" height="3" fill={s} />
    <rect x="34" y="34" width="4" height="3" fill={s} />
    {/* body */}
    <rect x="14" y="40" width="36" height="16" fill={p} />
    <rect x="14" y="40" width="36" height="6" fill={W} fillOpacity={0.1} />
    <rect x="14" y="50" width="36" height="6" fill={B} fillOpacity={0.1} />
    {/* tail */}
    <rect x="44" y="40" width="10" height="4" fill={s} />
    <rect x="50" y="44" width="10" height="8" fill={s} />
    <rect x="54" y="52" width="8" height="4" fill={s} />
    {/* paws */}
    <rect x="18" y="56" width="10" height="4" fill={s} />
    <rect x="36" y="56" width="10" height="4" fill={s} />
  </svg>
);

/* ─── RABBIT ─── */
const rabbit: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears swept back */}
    <rect x="30" y="0" width="8" height="18" fill={p} />
    <rect x="42" y="0" width="8" height="18" fill={p} />
    <rect x="31" y="3" width="4" height="11" fill={a} />
    <rect x="43" y="3" width="4" height="11" fill={a} />
    {/* head leaning forward */}
    <rect x="34" y="16" width="26" height="22" fill={p} />
    <rect x="30" y="20" width="30" height="14" fill={p} />
    <rect x="36" y="18" width="12" height="8" fill={W} fillOpacity={0.2} />
    {/* eye */}
    <rect x="38" y="20" width="8" height="8" fill={B} />
    <rect x="38" y="20" width="4" height="4" fill={W} />
    <rect x="40" y="22" width="3" height="3" fill={B} />
    <rect x="40" y="22" width="1" height="1" fill={W} />
    {/* muzzle */}
    <rect x="50" y="24" width="10" height="8" fill={s} />
    <rect x="52" y="30" width="6" height="4" fill={a} />
    {/* body horizontal - dashing */}
    <rect x="10" y="24" width="30" height="18" fill={p} />
    <rect x="6" y="28" width="34" height="10" fill={p} />
    <rect x="12" y="26" width="14" height="8" fill={W} fillOpacity={0.15} />
    {/* belly */}
    <rect x="14" y="30" width="16" height="8" fill={s} />
    {/* back legs pushing off */}
    <rect x="0" y="28" width="14" height="18" fill={s} />
    <rect x="4" y="24" width="10" height="8" fill={s} />
    {/* speed lines */}
    <rect x="0" y="14" width="20" height="3" fill={s} fillOpacity={0.6} />
    <rect x="0" y="18" width="12" height="2" fill={s} fillOpacity={0.4} />
    <rect x="0" y="48" width="24" height="3" fill={s} fillOpacity={0.6} />
    <rect x="0" y="52" width="16" height="2" fill={s} fillOpacity={0.4} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="18" y="0" width="10" height="22" fill={p} />
    <rect x="36" y="0" width="10" height="22" fill={p} />
    <rect x="20" y="3" width="5" height="15" fill={a} />
    <rect x="38" y="3" width="5" height="15" fill={a} />
    {/* head */}
    <rect x="14" y="20" width="36" height="22" fill={p} />
    <rect x="10" y="24" width="44" height="14" fill={p} />
    <rect x="18" y="22" width="14" height="10" fill={W} fillOpacity={0.2} />
    {/* eyes */}
    <rect x="18" y="24" width="10" height="10" fill={B} />
    <rect x="36" y="24" width="10" height="10" fill={B} />
    <rect x="18" y="24" width="5" height="5" fill={W} />
    <rect x="36" y="24" width="5" height="5" fill={W} />
    <rect x="21" y="27" width="4" height="4" fill={B} />
    <rect x="39" y="27" width="4" height="4" fill={B} />
    <rect x="21" y="27" width="2" height="2" fill={W} />
    <rect x="39" y="27" width="2" height="2" fill={W} />
    {/* nose */}
    <rect x="28" y="34" width="8" height="4" fill={a} />
    {/* body */}
    <rect x="10" y="42" width="44" height="16" fill={p} />
    <rect x="10" y="42" width="44" height="6" fill={W} fillOpacity={0.15} />
    {/* belly */}
    <rect x="18" y="44" width="28" height="10" fill={s} />
    {/* side puffs */}
    <rect x="2" y="42" width="10" height="14" fill={s} />
    <rect x="52" y="42" width="10" height="14" fill={s} />
    {/* feet */}
    <rect x="14" y="58" width="14" height="4" fill={s} />
    <rect x="36" y="58" width="14" height="4" fill={s} />
  </svg>
);

/* ─── GHOST ─── */
const ghost: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* body raised, arms stretched wide */}
    <rect x="18" y="2" width="28" height="4" fill={p} fillOpacity={0.9} />
    <rect x="14" y="6" width="36" height="4" fill={p} fillOpacity={0.92} />
    <rect x="10" y="10" width="44" height="30" fill={p} fillOpacity={0.95} />
    {/* arms out */}
    <rect x="0" y="18" width="10" height="10" fill={p} fillOpacity={0.9} />
    <rect x="54" y="18" width="10" height="10" fill={p} fillOpacity={0.9} />
    {/* wavy bottom */}
    <rect x="10" y="40" width="10" height="10" fill={p} fillOpacity={0.95} />
    <rect x="22" y="40" width="10" height="10" fill={p} fillOpacity={0.95} />
    <rect x="34" y="40" width="10" height="10" fill={p} fillOpacity={0.95} />
    <rect x="46" y="40" width="8" height="10" fill={p} fillOpacity={0.95} />
    {/* inner glow */}
    <rect x="18" y="10" width="28" height="18" fill={W} fillOpacity={0.12} />
    {/* wide eyes */}
    <rect x="14" y="14" width="14" height="14" fill={B} />
    <rect x="36" y="14" width="14" height="14" fill={B} />
    <rect x="14" y="14" width="7" height="7" fill={a} />
    <rect x="36" y="14" width="7" height="7" fill={a} />
    <rect x="17" y="17" width="5" height="5" fill={W} />
    <rect x="39" y="17" width="5" height="5" fill={W} />
    <rect x="18" y="18" width="3" height="3" fill={B} />
    <rect x="40" y="18" width="3" height="3" fill={B} />
    <rect x="18" y="18" width="1" height="1" fill={W} />
    <rect x="40" y="18" width="1" height="1" fill={W} />
    {/* wailing mouth */}
    <rect x="18" y="32" width="28" height="4" fill={B} />
    <rect x="18" y="36" width="6" height="4" fill={B} />
    <rect x="40" y="36" width="6" height="4" fill={B} />
    <rect x="24" y="36" width="16" height="4" fill={s} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* body */}
    <rect x="18" y="6" width="28" height="4" fill={p} fillOpacity={0.88} />
    <rect x="14" y="10" width="36" height="4" fill={p} fillOpacity={0.9} />
    <rect x="10" y="14" width="44" height="30" fill={p} fillOpacity={0.95} />
    {/* wavy bottom */}
    <rect x="10" y="44" width="10" height="10" fill={p} fillOpacity={0.95} />
    <rect x="22" y="44" width="10" height="10" fill={p} fillOpacity={0.95} />
    <rect x="34" y="44" width="10" height="10" fill={p} fillOpacity={0.95} />
    <rect x="46" y="44" width="8" height="10" fill={p} fillOpacity={0.95} />
    {/* inner glow */}
    <rect x="18" y="14" width="28" height="18" fill={W} fillOpacity={0.12} />
    {/* eyes */}
    <rect x="16" y="18" width="12" height="14" fill={B} />
    <rect x="36" y="18" width="12" height="14" fill={B} />
    <rect x="16" y="18" width="6" height="6" fill={a} />
    <rect x="36" y="18" width="6" height="6" fill={a} />
    <rect x="18" y="20" width="4" height="4" fill={W} />
    <rect x="38" y="20" width="4" height="4" fill={W} />
    <rect x="19" y="21" width="2" height="2" fill={B} />
    <rect x="39" y="21" width="2" height="2" fill={B} />
    <rect x="19" y="21" width="1" height="1" fill={W} />
    <rect x="39" y="21" width="1" height="1" fill={W} />
    {/* calm mouth */}
    <rect x="22" y="36" width="20" height="4" fill={s} />
  </svg>
);

/* ─── PLANT ─── */
const plant: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* pot */}
    <rect x="18" y="46" width="28" height="10" fill={s} />
    <rect x="14" y="52" width="36" height="8" fill={s} />
    <rect x="18" y="46" width="28" height="4" fill="#5D4037" />
    <rect x="22" y="50" width="20" height="4" fill="#4E342E" />
    {/* main stem */}
    <rect x="28" y="28" width="8" height="18" fill="#2E7D32" />
    <rect x="30" y="28" width="4" height="18" fill="#388E3C" />
    {/* left vine whipping out */}
    <rect x="2" y="20" width="28" height="8" fill="#2E7D32" />
    <rect x="2" y="20" width="28" height="3" fill="#388E3C" />
    <rect x="0" y="14" width="8" height="10" fill="#2E7D32" />
    <rect x="0" y="10" width="8" height="6" fill={p} />
    <rect x="2" y="6" width="10" height="8" fill={p} />
    {/* right vine */}
    <rect x="34" y="16" width="28" height="8" fill="#2E7D32" />
    <rect x="34" y="16" width="28" height="3" fill="#388E3C" />
    <rect x="56" y="12" width="8" height="10" fill="#2E7D32" />
    <rect x="54" y="6" width="10" height="8" fill={p} />
    {/* flower head */}
    <rect x="22" y="6" width="20" height="4" fill={a} />
    <rect x="18" y="10" width="28" height="10" fill={a} />
    <rect x="22" y="20" width="20" height="4" fill={a} />
    <rect x="26" y="4" width="12" height="4" fill={a} />
    {/* flower center */}
    <rect x="26" y="10" width="12" height="10" fill="#FFF176" />
    <rect x="28" y="12" width="8" height="6" fill="#FFD600" />
    <rect x="30" y="13" width="4" height="4" fill="#FF8F00" />
    {/* face */}
    <rect x="26" y="12" width="4" height="4" fill={B} />
    <rect x="34" y="12" width="4" height="4" fill={B} />
    <rect x="26" y="12" width="2" height="2" fill={W} />
    <rect x="34" y="12" width="2" height="2" fill={W} />
    {/* thorns */}
    <rect x="8" y="18" width="4" height="4" fill={a} />
    <rect x="16" y="16" width="4" height="4" fill={a} />
    <rect x="44" y="12" width="4" height="4" fill={a} />
    <rect x="52" y="14" width="4" height="4" fill={a} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* pot */}
    <rect x="18" y="46" width="28" height="10" fill={s} />
    <rect x="14" y="52" width="36" height="8" fill={s} />
    <rect x="18" y="46" width="28" height="4" fill="#5D4037" />
    <rect x="22" y="50" width="20" height="4" fill="#4E342E" />
    {/* stem */}
    <rect x="28" y="26" width="8" height="20" fill="#2E7D32" />
    <rect x="30" y="26" width="4" height="20" fill="#388E3C" />
    {/* leaves */}
    <rect x="10" y="26" width="18" height="10" fill={p} />
    <rect x="10" y="22" width="14" height="10" fill={p} />
    <rect x="36" y="22" width="18" height="10" fill={p} />
    <rect x="36" y="18" width="14" height="8" fill={p} />
    {/* leaf highlight */}
    <rect x="12" y="24" width="8" height="4" fill={W} fillOpacity={0.2} />
    <rect x="38" y="20" width="8" height="4" fill={W} fillOpacity={0.2} />
    {/* flower */}
    <rect x="22" y="6" width="20" height="4" fill={a} />
    <rect x="18" y="10" width="28" height="10" fill={a} />
    <rect x="22" y="20" width="20" height="4" fill={a} />
    <rect x="26" y="4" width="12" height="4" fill={a} />
    <rect x="26" y="10" width="12" height="10" fill="#FFF176" />
    <rect x="28" y="12" width="8" height="6" fill="#FFD600" />
    <rect x="30" y="13" width="4" height="4" fill="#FF8F00" />
    {/* face */}
    <rect x="26" y="12" width="4" height="4" fill={B} />
    <rect x="34" y="12" width="4" height="4" fill={B} />
    <rect x="26" y="12" width="2" height="2" fill={W} />
    <rect x="34" y="12" width="2" height="2" fill={W} />
  </svg>
);

/* ─── FISH ─── */
const fish: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* tail */}
    <rect x="0" y="18" width="14" height="10" fill={s} />
    <rect x="0" y="36" width="14" height="10" fill={s} />
    <rect x="2" y="28" width="10" height="8" fill={s} />
    <rect x="4" y="26" width="6" height="12" fill={a} fillOpacity={0.5} />
    {/* body */}
    <rect x="10" y="18" width="38" height="28" fill={p} />
    <rect x="6" y="22" width="46" height="20" fill={p} />
    {/* scale pattern */}
    <rect x="14" y="22" width="10" height="8" fill={a} fillOpacity={0.4} />
    <rect x="28" y="22" width="10" height="8" fill={a} fillOpacity={0.4} />
    <rect x="20" y="30" width="10" height="8" fill={a} fillOpacity={0.3} />
    {/* top fin */}
    <rect x="18" y="10" width="18" height="8" fill={s} />
    <rect x="22" y="6" width="10" height="6" fill={s} />
    {/* body highlight */}
    <rect x="14" y="22" width="24" height="6" fill={W} fillOpacity={0.2} />
    {/* eye wide open */}
    <rect x="42" y="22" width="10" height="10" fill={W} />
    <rect x="44" y="24" width="6" height="6" fill={B} />
    <rect x="44" y="24" width="3" height="3" fill={W} />
    <rect x="46" y="26" width="3" height="3" fill={B} />
    <rect x="46" y="26" width="1" height="1" fill={W} />
    {/* mouth open */}
    <rect x="46" y="34" width="6" height="6" fill={B} />
    <rect x="46" y="36" width="6" height="4" fill="#DC143C" />
    {/* bubbles */}
    <rect x="50" y="16" width="8" height="8" fill={W} fillOpacity={0.8} />
    <rect x="52" y="18" width="4" height="4" fill="#ADD8E6" />
    <rect x="52" y="18" width="2" height="2" fill={W} />
    <rect x="54" y="28" width="8" height="8" fill={W} fillOpacity={0.7} />
    <rect x="56" y="30" width="4" height="4" fill="#ADD8E6" />
    <rect x="54" y="40" width="8" height="8" fill={W} fillOpacity={0.6} />
    <rect x="56" y="42" width="4" height="4" fill="#ADD8E6" />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* tail */}
    <rect x="0" y="18" width="14" height="10" fill={s} />
    <rect x="0" y="36" width="14" height="10" fill={s} />
    <rect x="2" y="28" width="10" height="8" fill={s} />
    <rect x="4" y="26" width="6" height="12" fill={a} fillOpacity={0.5} />
    {/* body */}
    <rect x="10" y="18" width="38" height="28" fill={p} />
    <rect x="6" y="22" width="46" height="20" fill={p} />
    {/* scales */}
    <rect x="14" y="22" width="10" height="8" fill={a} fillOpacity={0.35} />
    <rect x="28" y="22" width="10" height="8" fill={a} fillOpacity={0.35} />
    <rect x="20" y="30" width="10" height="8" fill={a} fillOpacity={0.25} />
    {/* top fin */}
    <rect x="18" y="10" width="18" height="8" fill={s} />
    <rect x="22" y="6" width="10" height="6" fill={s} />
    {/* highlight */}
    <rect x="14" y="22" width="24" height="6" fill={W} fillOpacity={0.2} />
    {/* eye */}
    <rect x="42" y="22" width="10" height="10" fill={W} />
    <rect x="44" y="24" width="6" height="6" fill={B} />
    <rect x="44" y="24" width="3" height="3" fill={W} />
    <rect x="46" y="26" width="3" height="3" fill={B} />
    <rect x="46" y="26" width="1" height="1" fill={W} />
    {/* mouth */}
    <rect x="50" y="34" width="4" height="4" fill={B} />
  </svg>
);

/* ─── OWL ─── */
const owl: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* head tufts */}
    <rect x="14" y="2" width="10" height="10" fill={p} />
    <rect x="40" y="2" width="10" height="10" fill={p} />
    {/* head facing backward - rotated */}
    <rect x="14" y="10" width="36" height="22" fill={p} />
    <rect x="10" y="14" width="44" height="14" fill={p} />
    {/* motion blur lines at sides */}
    <rect x="6" y="8" width="4" height="10" fill={s} fillOpacity={0.6} />
    <rect x="54" y="8" width="4" height="10" fill={s} fillOpacity={0.6} />
    <rect x="4" y="12" width="4" height="8" fill={s} fillOpacity={0.4} />
    <rect x="56" y="12" width="4" height="8" fill={s} fillOpacity={0.4} />
    {/* eye discs */}
    <rect x="14" y="10" width="16" height="18" fill={s} />
    <rect x="34" y="10" width="16" height="18" fill={s} />
    {/* eye rings */}
    <rect x="18" y="14" width="10" height="10" fill={B} />
    <rect x="36" y="14" width="10" height="10" fill={B} />
    {/* iris - pupils shifted for "looking back" effect */}
    <rect x="22" y="14" width="6" height="6" fill={W} />
    <rect x="40" y="14" width="6" height="6" fill={W} />
    <rect x="24" y="16" width="4" height="4" fill={B} />
    <rect x="42" y="16" width="4" height="4" fill={B} />
    <rect x="24" y="16" width="2" height="2" fill={W} />
    <rect x="42" y="16" width="2" height="2" fill={W} />
    {/* beak angled up */}
    <rect x="26" y="10" width="12" height="6" fill={a} />
    <rect x="28" y="6" width="8" height="6" fill={a} />
    {/* wings */}
    <rect x="2" y="32" width="14" height="22" fill={s} />
    <rect x="48" y="32" width="14" height="22" fill={s} />
    <rect x="16" y="32" width="32" height="20" fill={p} />
    {/* wing feather detail */}
    <rect x="4" y="36" width="10" height="4" fill={p} fillOpacity={0.3} />
    <rect x="4" y="42" width="10" height="4" fill={p} fillOpacity={0.3} />
    <rect x="50" y="36" width="10" height="4" fill={p} fillOpacity={0.3} />
    <rect x="50" y="42" width="10" height="4" fill={p} fillOpacity={0.3} />
    {/* belly */}
    <rect x="20" y="36" width="24" height="12" fill={s} />
    {/* talons */}
    <rect x="18" y="52" width="10" height="8" fill={a} />
    <rect x="36" y="52" width="10" height="8" fill={a} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* head tufts */}
    <rect x="14" y="2" width="10" height="10" fill={p} />
    <rect x="40" y="2" width="10" height="10" fill={p} />
    {/* head */}
    <rect x="14" y="10" width="36" height="22" fill={p} />
    <rect x="10" y="14" width="44" height="14" fill={p} />
    {/* face highlight */}
    <rect x="20" y="12" width="24" height="10" fill={W} fillOpacity={0.1} />
    {/* eye discs */}
    <rect x="14" y="10" width="16" height="18" fill={s} />
    <rect x="34" y="10" width="16" height="18" fill={s} />
    {/* eyes */}
    <rect x="18" y="14" width="10" height="10" fill={B} />
    <rect x="36" y="14" width="10" height="10" fill={B} />
    <rect x="18" y="14" width="5" height="5" fill={W} />
    <rect x="36" y="14" width="5" height="5" fill={W} />
    <rect x="20" y="16" width="4" height="4" fill={B} />
    <rect x="38" y="16" width="4" height="4" fill={B} />
    <rect x="20" y="16" width="2" height="2" fill={W} />
    <rect x="38" y="16" width="2" height="2" fill={W} />
    {/* beak */}
    <rect x="26" y="24" width="12" height="6" fill={a} />
    <rect x="28" y="20" width="8" height="6" fill={a} />
    {/* wings */}
    <rect x="2" y="32" width="14" height="22" fill={s} />
    <rect x="48" y="32" width="14" height="22" fill={s} />
    <rect x="16" y="32" width="32" height="20" fill={p} />
    <rect x="4" y="36" width="10" height="4" fill={p} fillOpacity={0.3} />
    <rect x="4" y="42" width="10" height="4" fill={p} fillOpacity={0.3} />
    <rect x="50" y="36" width="10" height="4" fill={p} fillOpacity={0.3} />
    <rect x="50" y="42" width="10" height="4" fill={p} fillOpacity={0.3} />
    <rect x="20" y="36" width="24" height="12" fill={s} />
    {/* talons */}
    <rect x="18" y="52" width="10" height="8" fill={a} />
    <rect x="36" y="52" width="10" height="8" fill={a} />
  </svg>
);

/* ─── BEAR ─── */
const bear: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="10" y="6" width="14" height="10" fill={p} />
    <rect x="40" y="6" width="14" height="10" fill={p} />
    <rect x="14" y="9" width="6" height="5" fill={a} />
    <rect x="44" y="9" width="6" height="5" fill={a} />
    {/* head */}
    <rect x="10" y="14" width="44" height="22" fill={p} />
    <rect x="6" y="18" width="52" height="14" fill={p} />
    <rect x="16" y="16" width="20" height="10" fill={W} fillOpacity={0.15} />
    {/* eyes */}
    <rect x="16" y="18" width="10" height="10" fill={B} />
    <rect x="38" y="18" width="10" height="10" fill={B} />
    <rect x="16" y="18" width="5" height="5" fill={W} />
    <rect x="38" y="18" width="5" height="5" fill={W} />
    <rect x="19" y="21" width="4" height="4" fill={B} />
    <rect x="41" y="21" width="4" height="4" fill={B} />
    <rect x="19" y="21" width="2" height="2" fill={W} />
    <rect x="41" y="21" width="2" height="2" fill={W} />
    {/* snout */}
    <rect x="20" y="28" width="24" height="8" fill={s} />
    <rect x="26" y="30" width="12" height="4" fill={B} />
    {/* body */}
    <rect x="10" y="36" width="44" height="18" fill={p} />
    <rect x="6" y="40" width="52" height="10" fill={p} />
    <rect x="12" y="36" width="40" height="8" fill={W} fillOpacity={0.12} />
    {/* belly */}
    <rect x="18" y="38" width="28" height="12" fill={s} fillOpacity={0.5} />
    {/* arms slammed down */}
    <rect x="0" y="34" width="10" height="18" fill={p} />
    <rect x="54" y="34" width="10" height="18" fill={p} />
    {/* paw pads */}
    <rect x="0" y="52" width="14" height="4" fill={s} />
    <rect x="50" y="52" width="14" height="4" fill={s} />
    {/* shockwave */}
    <rect x="0" y="56" width="8" height="4" fill={a} fillOpacity={0.8} />
    <rect x="56" y="56" width="8" height="4" fill={a} fillOpacity={0.8} />
    {/* feet */}
    <rect x="14" y="54" width="14" height="6" fill={s} />
    <rect x="36" y="54" width="14" height="6" fill={s} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="10" y="6" width="14" height="10" fill={p} />
    <rect x="40" y="6" width="14" height="10" fill={p} />
    <rect x="14" y="9" width="6" height="5" fill={a} />
    <rect x="44" y="9" width="6" height="5" fill={a} />
    {/* head */}
    <rect x="10" y="14" width="44" height="22" fill={p} />
    <rect x="6" y="18" width="52" height="14" fill={p} />
    <rect x="16" y="16" width="20" height="10" fill={W} fillOpacity={0.15} />
    {/* eyes */}
    <rect x="16" y="18" width="10" height="10" fill={B} />
    <rect x="38" y="18" width="10" height="10" fill={B} />
    <rect x="16" y="18" width="5" height="5" fill={W} />
    <rect x="38" y="18" width="5" height="5" fill={W} />
    <rect x="19" y="21" width="4" height="4" fill={B} />
    <rect x="41" y="21" width="4" height="4" fill={B} />
    <rect x="19" y="21" width="2" height="2" fill={W} />
    <rect x="41" y="21" width="2" height="2" fill={W} />
    {/* snout */}
    <rect x="20" y="28" width="24" height="8" fill={s} />
    <rect x="26" y="30" width="12" height="4" fill={B} />
    {/* body */}
    <rect x="10" y="36" width="44" height="18" fill={p} />
    <rect x="6" y="40" width="52" height="10" fill={p} />
    <rect x="12" y="36" width="40" height="8" fill={W} fillOpacity={0.12} />
    <rect x="18" y="38" width="28" height="12" fill={s} fillOpacity={0.4} />
    {/* arms */}
    <rect x="0" y="34" width="10" height="18" fill={p} />
    <rect x="54" y="34" width="10" height="18" fill={p} />
    {/* feet */}
    <rect x="14" y="54" width="14" height="6" fill={s} />
    <rect x="36" y="54" width="14" height="6" fill={s} />
  </svg>
);

/* ─── TURTLE ─── */
const turtle: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* shell spinning - head and legs retracted */}
    <rect x="10" y="10" width="44" height="44" fill={s} />
    <rect x="6" y="14" width="52" height="36" fill={s} />
    {/* shell highlight */}
    <rect x="14" y="12" width="22" height="12" fill={W} fillOpacity={0.2} />
    {/* spinning pattern - cross */}
    <rect x="28" y="10" width="8" height="44" fill={p} />
    <rect x="10" y="28" width="44" height="8" fill={p} />
    {/* diagonal blocks */}
    <rect x="14" y="14" width="12" height="12" fill={p} fillOpacity={0.7} />
    <rect x="38" y="40" width="12" height="12" fill={p} fillOpacity={0.7} />
    <rect x="38" y="14" width="12" height="12" fill={a} fillOpacity={0.8} />
    <rect x="14" y="40" width="12" height="12" fill={a} fillOpacity={0.8} />
    {/* outer shell edge detail */}
    <rect x="10" y="10" width="44" height="4" fill={p} fillOpacity={0.4} />
    <rect x="10" y="50" width="44" height="4" fill={B} fillOpacity={0.2} />
    {/* motion lines */}
    <rect x="2" y="10" width="4" height="4" fill={a} fillOpacity={0.7} />
    <rect x="58" y="10" width="4" height="4" fill={a} fillOpacity={0.7} />
    <rect x="0" y="26" width="6" height="8" fill={a} fillOpacity={0.6} />
    <rect x="58" y="26" width="6" height="8" fill={a} fillOpacity={0.6} />
    <rect x="2" y="48" width="4" height="4" fill={a} fillOpacity={0.5} />
    <rect x="58" y="48" width="4" height="4" fill={a} fillOpacity={0.5} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* shell */}
    <rect x="14" y="14" width="36" height="32" fill={s} />
    <rect x="10" y="18" width="44" height="24" fill={s} />
    {/* shell highlight */}
    <rect x="16" y="16" width="20" height="10" fill={W} fillOpacity={0.2} />
    {/* shell grid pattern */}
    <rect x="18" y="18" width="28" height="4" fill={p} fillOpacity={0.5} />
    <rect x="14" y="26" width="36" height="4" fill={p} fillOpacity={0.5} />
    <rect x="18" y="34" width="28" height="4" fill={p} fillOpacity={0.5} />
    <rect x="28" y="18" width="4" height="24" fill={p} fillOpacity={0.5} />
    <rect x="18" y="42" width="6" height="4" fill={a} />
    <rect x="40" y="42" width="6" height="4" fill={a} />
    {/* head */}
    <rect x="16" y="4" width="18" height="10" fill={p} />
    <rect x="20" y="8" width="14" height="10" fill={p} />
    <rect x="16" y="4" width="6" height="6" fill={B} />
    <rect x="16" y="4" width="3" height="3" fill={W} />
    {/* legs */}
    <rect x="2" y="22" width="12" height="10" fill={p} />
    <rect x="50" y="22" width="12" height="10" fill={p} />
    <rect x="10" y="42" width="14" height="10" fill={p} />
    <rect x="40" y="42" width="14" height="10" fill={p} />
  </svg>
);

/* ─── FOX ─── */
const fox: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="10" y="2" width="14" height="18" fill={p} />
    <rect x="40" y="2" width="14" height="18" fill={p} />
    <rect x="14" y="5" width="6" height="10" fill={W} />
    <rect x="44" y="5" width="6" height="10" fill={W} />
    {/* head */}
    <rect x="10" y="18" width="40" height="18" fill={p} />
    <rect x="6" y="22" width="48" height="10" fill={p} />
    <rect x="14" y="20" width="16" height="8" fill={W} fillOpacity={0.15} />
    {/* muzzle */}
    <rect x="18" y="28" width="24" height="14" fill={s} />
    {/* eyes */}
    <rect x="18" y="22" width="10" height="10" fill={B} />
    <rect x="36" y="22" width="10" height="10" fill={B} />
    <rect x="18" y="22" width="5" height="5" fill={W} />
    <rect x="36" y="22" width="5" height="5" fill={W} />
    <rect x="21" y="25" width="4" height="4" fill={B} />
    <rect x="39" y="25" width="4" height="4" fill={B} />
    <rect x="21" y="25" width="2" height="2" fill={W} />
    <rect x="39" y="25" width="2" height="2" fill={W} />
    {/* nose */}
    <rect x="27" y="32" width="10" height="6" fill={B} />
    <rect x="29" y="34" width="2" height="2" fill={W} />
    {/* body */}
    <rect x="14" y="36" width="30" height="18" fill={p} />
    {/* tail */}
    <rect x="44" y="26" width="18" height="22" fill={a} />
    <rect x="48" y="22" width="14" height="6" fill={a} />
    <rect x="50" y="48" width="14" height="6" fill={W} />
    <rect x="44" y="48" width="8" height="6" fill={W} />
    {/* foxfire orb */}
    <rect x="0" y="14" width="14" height="14" fill={a} fillOpacity={0.3} />
    <rect x="2" y="16" width="10" height="10" fill={a} />
    <rect x="4" y="18" width="6" height="6" fill="#90EE90" />
    <rect x="5" y="19" width="4" height="4" fill={W} fillOpacity={0.8} />
    {/* orb glow corners */}
    <rect x="0" y="12" width="4" height="4" fill={a} fillOpacity={0.5} />
    <rect x="14" y="12" width="4" height="4" fill={a} fillOpacity={0.5} />
    <rect x="0" y="28" width="4" height="4" fill={a} fillOpacity={0.5} />
    <rect x="14" y="28" width="4" height="4" fill={a} fillOpacity={0.5} />
    {/* feet */}
    <rect x="18" y="54" width="10" height="6" fill={s} />
    <rect x="32" y="54" width="10" height="6" fill={s} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="10" y="2" width="14" height="18" fill={p} />
    <rect x="40" y="2" width="14" height="18" fill={p} />
    <rect x="14" y="5" width="6" height="10" fill={W} />
    <rect x="44" y="5" width="6" height="10" fill={W} />
    {/* head */}
    <rect x="10" y="18" width="40" height="18" fill={p} />
    <rect x="6" y="22" width="48" height="10" fill={p} />
    <rect x="14" y="20" width="16" height="8" fill={W} fillOpacity={0.15} />
    {/* muzzle */}
    <rect x="18" y="28" width="24" height="14" fill={s} />
    {/* eyes */}
    <rect x="18" y="22" width="10" height="10" fill={B} />
    <rect x="36" y="22" width="10" height="10" fill={B} />
    <rect x="18" y="22" width="5" height="5" fill={W} />
    <rect x="36" y="22" width="5" height="5" fill={W} />
    <rect x="21" y="25" width="4" height="4" fill={B} />
    <rect x="39" y="25" width="4" height="4" fill={B} />
    <rect x="21" y="25" width="2" height="2" fill={W} />
    <rect x="39" y="25" width="2" height="2" fill={W} />
    {/* nose */}
    <rect x="27" y="32" width="10" height="6" fill={B} />
    <rect x="29" y="34" width="2" height="2" fill={W} />
    {/* body */}
    <rect x="14" y="36" width="30" height="18" fill={p} />
    {/* tail */}
    <rect x="44" y="26" width="18" height="22" fill={a} />
    <rect x="48" y="22" width="14" height="6" fill={a} />
    <rect x="50" y="48" width="14" height="6" fill={W} />
    <rect x="44" y="48" width="8" height="6" fill={W} />
    {/* feet */}
    <rect x="18" y="54" width="10" height="6" fill={s} />
    <rect x="32" y="54" width="10" height="6" fill={s} />
  </svg>
);

/* ─── WOLF ─── */
const wolf: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears pointed */}
    <rect x="10" y="0" width="14" height="18" fill={p} />
    <rect x="40" y="0" width="14" height="18" fill={p} />
    <rect x="14" y="3" width="6" height="10" fill={s} />
    <rect x="44" y="3" width="6" height="10" fill={s} />
    {/* head raised for howl */}
    <rect x="14" y="10" width="36" height="18" fill={p} />
    <rect x="10" y="14" width="44" height="10" fill={p} />
    {/* eye markings */}
    <rect x="14" y="14" width="10" height="6" fill={a} />
    <rect x="40" y="14" width="10" height="6" fill={a} />
    {/* howl pose eyes - closed/squinting */}
    <rect x="16" y="16" width="8" height="3" fill={B} />
    <rect x="40" y="16" width="8" height="3" fill={B} />
    {/* muzzle raised */}
    <rect x="18" y="26" width="28" height="12" fill={s} />
    <rect x="22" y="36" width="20" height="6" fill={s} />
    {/* open mouth howling */}
    <rect x="26" y="28" width="12" height="10" fill={B} />
    <rect x="26" y="32" width="12" height="6" fill="#DC143C" />
    <rect x="26" y="38" width="12" height="2" fill={B} />
    {/* fangs */}
    <rect x="28" y="28" width="4" height="4" fill={W} />
    <rect x="32" y="28" width="4" height="4" fill={W} />
    {/* body */}
    <rect x="10" y="40" width="44" height="18" fill={p} />
    <rect x="10" y="40" width="44" height="6" fill={s} fillOpacity={0.5} />
    {/* tail */}
    <rect x="50" y="38" width="10" height="14" fill={p} />
    <rect x="54" y="34" width="6" height="6" fill={p} />
    {/* feet */}
    <rect x="14" y="58" width="14" height="4" fill={s} />
    <rect x="36" y="58" width="14" height="4" fill={s} />
    {/* howl sound waves */}
    <rect x="2" y="2" width="4" height="16" fill={s} fillOpacity={0.7} />
    <rect x="0" y="0" width="2" height="22" fill={s} fillOpacity={0.5} />
    <rect x="58" y="2" width="4" height="16" fill={s} fillOpacity={0.7} />
    <rect x="62" y="0" width="2" height="22" fill={s} fillOpacity={0.5} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="10" y="0" width="14" height="18" fill={p} />
    <rect x="40" y="0" width="14" height="18" fill={p} />
    <rect x="14" y="3" width="6" height="10" fill={s} />
    <rect x="44" y="3" width="6" height="10" fill={s} />
    {/* head */}
    <rect x="10" y="16" width="44" height="18" fill={p} />
    <rect x="6" y="20" width="52" height="10" fill={p} />
    <rect x="14" y="14" width="10" height="6" fill={a} />
    <rect x="40" y="14" width="10" height="6" fill={a} />
    <rect x="16" y="18" width="10" height="10" fill={B} />
    <rect x="38" y="18" width="10" height="10" fill={B} />
    <rect x="16" y="18" width="5" height="5" fill={W} />
    <rect x="38" y="18" width="5" height="5" fill={W} />
    <rect x="19" y="21" width="4" height="4" fill={B} />
    <rect x="41" y="21" width="4" height="4" fill={B} />
    <rect x="19" y="21" width="2" height="2" fill={W} />
    <rect x="41" y="21" width="2" height="2" fill={W} />
    {/* muzzle */}
    <rect x="16" y="30" width="32" height="10" fill={s} />
    <rect x="26" y="36" width="12" height="4" fill={B} />
    {/* body */}
    <rect x="10" y="40" width="44" height="18" fill={p} />
    <rect x="10" y="40" width="44" height="6" fill={s} fillOpacity={0.5} />
    <rect x="50" y="38" width="10" height="14" fill={p} />
    <rect x="54" y="34" width="6" height="6" fill={p} />
    {/* feet */}
    <rect x="14" y="58" width="14" height="4" fill={s} />
    <rect x="36" y="58" width="14" height="4" fill={s} />
  </svg>
);

/* ─── ROBOT ─── */
const robot: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* antenna */}
    <rect x="28" y="0" width="8" height="8" fill={s} />
    <rect x="22" y="4" width="20" height="4" fill={a} />
    <rect x="30" y="0" width="4" height="4" fill="#FF2200" />
    {/* head box */}
    <rect x="10" y="8" width="44" height="26" fill={p} />
    <rect x="6" y="12" width="52" height="18" fill={p} />
    {/* panel lines */}
    <rect x="10" y="8" width="44" height="3" fill={s} fillOpacity={0.4} />
    <rect x="10" y="31" width="44" height="3" fill={B} fillOpacity={0.3} />
    {/* eyes charging red */}
    <rect x="14" y="12" width="14" height="14" fill="#FF2200" />
    <rect x="36" y="12" width="14" height="14" fill="#FF2200" />
    <rect x="18" y="16" width="6" height="6" fill="#FF8800" />
    <rect x="40" y="16" width="6" height="6" fill="#FF8800" />
    <rect x="20" y="18" width="3" height="3" fill="#FFFF00" />
    <rect x="42" y="18" width="3" height="3" fill="#FFFF00" />
    {/* laser beams */}
    <rect x="50" y="14" width="14" height="4" fill="#FF2200" />
    <rect x="50" y="18" width="14" height="4" fill="#FF8800" fillOpacity={0.8} />
    <rect x="50" y="10" width="12" height="4" fill="#FF4400" fillOpacity={0.6} />
    {/* mouth panel */}
    <rect x="18" y="26" width="28" height="5" fill={B} />
    <rect x="22" y="27" width="4" height="3" fill={p} />
    <rect x="30" y="27" width="4" height="3" fill={p} />
    <rect x="38" y="27" width="4" height="3" fill={p} />
    {/* torso */}
    <rect x="10" y="34" width="44" height="26" fill={p} />
    <rect x="6" y="38" width="52" height="18" fill={p} />
    {/* chest panel */}
    <rect x="18" y="38" width="28" height="18" fill={s} />
    <rect x="26" y="42" width="12" height="10" fill={a} />
    <rect x="28" y="44" width="8" height="6" fill="#00FFFF" fillOpacity={0.6} />
    {/* arms */}
    <rect x="0" y="34" width="10" height="22" fill={p} />
    <rect x="54" y="34" width="10" height="22" fill={p} />
    <rect x="0" y="34" width="10" height="4" fill={s} fillOpacity={0.4} />
    <rect x="54" y="34" width="10" height="4" fill={s} fillOpacity={0.4} />
    {/* feet */}
    <rect x="14" y="60" width="14" height="4" fill={s} />
    <rect x="36" y="60" width="14" height="4" fill={s} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* antenna */}
    <rect x="28" y="0" width="8" height="8" fill={s} />
    <rect x="22" y="4" width="20" height="4" fill={a} />
    {/* head box */}
    <rect x="10" y="8" width="44" height="26" fill={p} />
    <rect x="6" y="12" width="52" height="18" fill={p} />
    <rect x="10" y="8" width="44" height="3" fill={W} fillOpacity={0.15} />
    <rect x="10" y="31" width="44" height="3" fill={B} fillOpacity={0.2} />
    {/* eyes */}
    <rect x="14" y="12" width="14" height="14" fill={a} />
    <rect x="36" y="12" width="14" height="14" fill={a} />
    <rect x="18" y="16" width="6" height="6" fill={W} />
    <rect x="40" y="16" width="6" height="6" fill={W} />
    <rect x="20" y="18" width="3" height="3" fill={a} fillOpacity={0.6} />
    <rect x="42" y="18" width="3" height="3" fill={a} fillOpacity={0.6} />
    {/* mouth panel */}
    <rect x="18" y="26" width="28" height="5" fill={B} />
    <rect x="22" y="27" width="4" height="3" fill={p} />
    <rect x="30" y="27" width="4" height="3" fill={p} />
    <rect x="38" y="27" width="4" height="3" fill={p} />
    {/* torso */}
    <rect x="10" y="34" width="44" height="26" fill={p} />
    <rect x="6" y="38" width="52" height="18" fill={p} />
    <rect x="10" y="34" width="44" height="5" fill={W} fillOpacity={0.12} />
    <rect x="18" y="38" width="28" height="18" fill={s} />
    <rect x="26" y="42" width="12" height="10" fill={a} />
    <rect x="28" y="44" width="8" height="6" fill={W} fillOpacity={0.4} />
    {/* arms */}
    <rect x="0" y="34" width="10" height="22" fill={p} />
    <rect x="54" y="34" width="10" height="22" fill={p} />
    {/* feet */}
    <rect x="14" y="60" width="14" height="4" fill={s} />
    <rect x="36" y="60" width="14" height="4" fill={s} />
  </svg>
);

/* ─── DRAGON ─── */
const dragon: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* horns */}
    <rect x="18" y="2" width="6" height="10" fill={a} />
    <rect x="40" y="2" width="6" height="10" fill={a} />
    <rect x="20" y="0" width="4" height="4" fill={W} fillOpacity={0.5} />
    <rect x="42" y="0" width="4" height="4" fill={W} fillOpacity={0.5} />
    {/* head */}
    <rect x="18" y="10" width="28" height="14" fill={p} />
    <rect x="14" y="14" width="36" height="10" fill={p} />
    <rect x="22" y="12" width="14" height="6" fill={W} fillOpacity={0.15} />
    {/* snout scales */}
    <rect x="18" y="10" width="6" height="6" fill={a} fillOpacity={0.6} />
    {/* glowing eye react */}
    <rect x="34" y="12" width="8" height="8" fill="#FF4444" />
    <rect x="36" y="14" width="4" height="4" fill="#FF8888" />
    <rect x="37" y="15" width="2" height="2" fill={W} />
    {/* normal eye */}
    <rect x="20" y="12" width="8" height="8" fill={B} />
    <rect x="20" y="12" width="4" height="4" fill={W} />
    <rect x="22" y="14" width="3" height="3" fill={B} />
    <rect x="22" y="14" width="1" height="1" fill={W} />
    {/* body */}
    <rect x="14" y="24" width="36" height="22" fill={p} />
    <rect x="10" y="28" width="44" height="14" fill={p} />
    <rect x="18" y="24" width="22" height="10" fill={W} fillOpacity={0.12} />
    {/* belly scales */}
    <rect x="22" y="28" width="20" height="14" fill={s} />
    <rect x="24" y="30" width="16" height="4" fill={s} fillOpacity={0.5} />
    {/* wings */}
    <rect x="2" y="22" width="14" height="18" fill={s} fillOpacity={0.8} />
    <rect x="2" y="22" width="14" height="6" fill={a} fillOpacity={0.5} />
    <rect x="48" y="22" width="14" height="18" fill={s} fillOpacity={0.8} />
    <rect x="0" y="26" width="8" height="14" fill={a} fillOpacity={0.6} />
    <rect x="56" y="26" width="8" height="14" fill={a} fillOpacity={0.6} />
    {/* fire breath */}
    <rect x="42" y="26" width="10" height="10" fill="#FF6600" />
    <rect x="48" y="20" width="14" height="20" fill="#FF6600" fillOpacity={0.9} />
    <rect x="52" y="16" width="12" height="28" fill="#FF4400" fillOpacity={0.8} />
    <rect x="56" y="20" width="8" height="20" fill="#FFD700" fillOpacity={0.7} />
    <rect x="58" y="24" width="6" height="12" fill={W} fillOpacity={0.5} />
    {/* legs */}
    <rect x="18" y="46" width="10" height="14" fill={p} />
    <rect x="36" y="46" width="10" height="14" fill={p} />
    <rect x="16" y="56" width="14" height="4" fill={a} fillOpacity={0.6} />
    <rect x="34" y="56" width="14" height="4" fill={a} fillOpacity={0.6} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* horns */}
    <rect x="18" y="2" width="6" height="10" fill={a} />
    <rect x="40" y="2" width="6" height="10" fill={a} />
    <rect x="20" y="0" width="4" height="4" fill={W} fillOpacity={0.5} />
    <rect x="42" y="0" width="4" height="4" fill={W} fillOpacity={0.5} />
    {/* head */}
    <rect x="18" y="10" width="28" height="14" fill={p} />
    <rect x="14" y="14" width="36" height="10" fill={p} />
    <rect x="22" y="12" width="14" height="6" fill={W} fillOpacity={0.15} />
    <rect x="18" y="10" width="6" height="6" fill={a} fillOpacity={0.6} />
    {/* eyes */}
    <rect x="20" y="12" width="8" height="8" fill={B} />
    <rect x="36" y="12" width="8" height="8" fill={B} />
    <rect x="20" y="12" width="4" height="4" fill={W} />
    <rect x="36" y="12" width="4" height="4" fill={W} />
    <rect x="22" y="14" width="3" height="3" fill={B} />
    <rect x="38" y="14" width="3" height="3" fill={B} />
    <rect x="22" y="14" width="1" height="1" fill={W} />
    <rect x="38" y="14" width="1" height="1" fill={W} />
    {/* body */}
    <rect x="14" y="24" width="36" height="22" fill={p} />
    <rect x="10" y="28" width="44" height="14" fill={p} />
    <rect x="18" y="24" width="22" height="10" fill={W} fillOpacity={0.12} />
    <rect x="22" y="28" width="20" height="14" fill={s} />
    {/* wings */}
    <rect x="2" y="22" width="14" height="18" fill={s} fillOpacity={0.8} />
    <rect x="48" y="22" width="14" height="18" fill={s} fillOpacity={0.8} />
    <rect x="0" y="26" width="8" height="14" fill={a} fillOpacity={0.6} />
    <rect x="56" y="26" width="8" height="14" fill={a} fillOpacity={0.6} />
    {/* tail */}
    <rect x="42" y="32" width="10" height="4" fill={p} />
    <rect x="48" y="36" width="10" height="4" fill={p} />
    <rect x="54" y="40" width="10" height="8" fill={a} />
    {/* legs */}
    <rect x="18" y="46" width="10" height="14" fill={p} />
    <rect x="36" y="46" width="10" height="14" fill={p} />
    <rect x="16" y="56" width="14" height="4" fill={a} fillOpacity={0.6} />
    <rect x="34" y="56" width="14" height="4" fill={a} fillOpacity={0.6} />
  </svg>
);

/* ─── PHOENIX ─── */
const phoenix: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* crest feathers */}
    <rect x="22" y="0" width="20" height="8" fill={a} />
    <rect x="18" y="2" width="8" height="6" fill={a} />
    <rect x="38" y="2" width="8" height="6" fill={a} />
    <rect x="26" y="0" width="12" height="4" fill="#FFD700" />
    {/* head */}
    <rect x="18" y="8" width="28" height="16" fill={p} />
    <rect x="14" y="12" width="36" height="8" fill={p} />
    <rect x="22" y="10" width="14" height="8" fill={W} fillOpacity={0.18} />
    {/* eyes */}
    <rect x="22" y="12" width="6" height="6" fill={B} />
    <rect x="36" y="12" width="6" height="6" fill={B} />
    <rect x="22" y="12" width="3" height="3" fill={W} />
    <rect x="36" y="12" width="3" height="3" fill={W} />
    <rect x="24" y="14" width="2" height="2" fill={B} />
    <rect x="38" y="14" width="2" height="2" fill={B} />
    <rect x="24" y="14" width="1" height="1" fill={W} />
    <rect x="38" y="14" width="1" height="1" fill={W} />
    {/* beak */}
    <rect x="27" y="20" width="10" height="4" fill={a} />
    <rect x="29" y="24" width="6" height="3" fill="#FF8800" />
    {/* body */}
    <rect x="18" y="24" width="28" height="20" fill={p} />
    <rect x="14" y="28" width="36" height="12" fill={p} />
    <rect x="20" y="24" width="18" height="10" fill={W} fillOpacity={0.15} />
    {/* flame corona - rebirth */}
    <rect x="2" y="10" width="16" height="30" fill="#FF6600" fillOpacity={0.9} />
    <rect x="46" y="10" width="16" height="30" fill="#FF6600" fillOpacity={0.9} />
    <rect x="0" y="14" width="8" height="22" fill="#FF4400" fillOpacity={0.8} />
    <rect x="56" y="14" width="8" height="22" fill="#FF4400" fillOpacity={0.8} />
    <rect x="6" y="6" width="8" height="8" fill="#FFD700" fillOpacity={0.9} />
    <rect x="50" y="6" width="8" height="8" fill="#FFD700" fillOpacity={0.9} />
    <rect x="2" y="2" width="6" height="6" fill="#FFD700" fillOpacity={0.6} />
    <rect x="56" y="2" width="6" height="6" fill="#FFD700" fillOpacity={0.6} />
    {/* tail */}
    <rect x="22" y="44" width="20" height="8" fill={s} />
    <rect x="18" y="50" width="28" height="8" fill={a} />
    <rect x="22" y="58" width="20" height="4" fill={a} />
    <rect x="22" y="44" width="6" height="14" fill={p} fillOpacity={0.6} />
    <rect x="36" y="44" width="6" height="14" fill={p} fillOpacity={0.6} />
    {/* flame under tail */}
    <rect x="14" y="52" width="10" height="10" fill="#FF6600" fillOpacity={0.8} />
    <rect x="40" y="52" width="10" height="10" fill="#FF6600" fillOpacity={0.8} />
    <rect x="26" y="60" width="12" height="4" fill="#FFD700" fillOpacity={0.9} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* crest */}
    <rect x="22" y="0" width="20" height="8" fill={a} />
    <rect x="18" y="2" width="8" height="6" fill={a} />
    <rect x="38" y="2" width="8" height="6" fill={a} />
    <rect x="26" y="0" width="12" height="4" fill="#FFD700" />
    {/* head */}
    <rect x="18" y="8" width="28" height="16" fill={p} />
    <rect x="14" y="12" width="36" height="8" fill={p} />
    <rect x="22" y="10" width="14" height="8" fill={W} fillOpacity={0.18} />
    {/* eyes */}
    <rect x="22" y="12" width="6" height="6" fill={B} />
    <rect x="36" y="12" width="6" height="6" fill={B} />
    <rect x="22" y="12" width="3" height="3" fill={W} />
    <rect x="36" y="12" width="3" height="3" fill={W} />
    <rect x="24" y="14" width="2" height="2" fill={B} />
    <rect x="38" y="14" width="2" height="2" fill={B} />
    <rect x="24" y="14" width="1" height="1" fill={W} />
    <rect x="38" y="14" width="1" height="1" fill={W} />
    {/* beak */}
    <rect x="27" y="20" width="10" height="4" fill={a} />
    {/* body */}
    <rect x="18" y="24" width="28" height="20" fill={p} />
    <rect x="14" y="28" width="36" height="12" fill={p} />
    <rect x="20" y="24" width="18" height="10" fill={W} fillOpacity={0.15} />
    {/* wings half-spread */}
    <rect x="2" y="20" width="18" height="22" fill={s} />
    <rect x="44" y="20" width="18" height="22" fill={s} />
    <rect x="0" y="24" width="8" height="18" fill={a} fillOpacity={0.7} />
    <rect x="56" y="24" width="8" height="18" fill={a} fillOpacity={0.7} />
    {/* wing highlight */}
    <rect x="4" y="22" width="12" height="6" fill={W} fillOpacity={0.15} />
    <rect x="48" y="22" width="12" height="6" fill={W} fillOpacity={0.15} />
    {/* tail */}
    <rect x="22" y="44" width="20" height="8" fill={s} />
    <rect x="18" y="50" width="28" height="8" fill={a} />
    <rect x="22" y="58" width="20" height="4" fill={a} />
    <rect x="22" y="44" width="6" height="14" fill={p} fillOpacity={0.6} />
    <rect x="36" y="44" width="6" height="14" fill={p} fillOpacity={0.6} />
  </svg>
);

/* ─── UNICORN ─── */
const unicorn: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* horn glowing */}
    <rect x="14" y="0" width="6" height="14" fill="#FFD700" />
    <rect x="18" y="2" width="6" height="10" fill="#FFD700" />
    <rect x="22" y="2" width="6" height="14" fill={a} />
    <rect x="26" y="6" width="6" height="16" fill={a} />
    <rect x="30" y="2" width="6" height="14" fill="#FFD93D" />
    <rect x="16" y="2" width="4" height="4" fill={W} fillOpacity={0.7} />
    {/* magic beam from horn tip */}
    <rect x="0" y="0" width="14" height="4" fill="#FFD700" />
    <rect x="0" y="4" width="10" height="4" fill="#FFD93D" fillOpacity={0.8} />
    <rect x="0" y="8" width="14" height="4" fill={W} fillOpacity={0.9} />
    {/* sparkle trail */}
    <rect x="0" y="0" width="4" height="4" fill={W} />
    <rect x="6" y="6" width="4" height="4" fill={W} fillOpacity={0.7} />
    <rect x="2" y="12" width="4" height="4" fill="#FFD700" fillOpacity={0.6} />
    {/* head - horse-like */}
    <rect x="10" y="12" width="36" height="18" fill={s} />
    <rect x="6" y="16" width="44" height="10" fill={s} />
    <rect x="14" y="14" width="20" height="8" fill={W} fillOpacity={0.2} />
    {/* eye */}
    <rect x="14" y="16" width="10" height="10" fill={B} />
    <rect x="14" y="16" width="5" height="5" fill={W} />
    <rect x="17" y="19" width="4" height="4" fill={B} />
    <rect x="17" y="19" width="2" height="2" fill={W} />
    {/* muzzle */}
    <rect x="36" y="22" width="14" height="10" fill={s} fillOpacity={0.7} />
    <rect x="38" y="26" width="8" height="4" fill={a} />
    {/* body */}
    <rect x="10" y="30" width="36" height="22" fill={s} />
    <rect x="6" y="34" width="44" height="14" fill={s} />
    <rect x="14" y="30" width="22" height="10" fill={W} fillOpacity={0.18} />
    {/* mane */}
    <rect x="46" y="30" width="10" height="6" fill={a} />
    <rect x="50" y="36" width="10" height="14" fill={a} />
    <rect x="52" y="46" width="10" height="8" fill="#FFD93D" />
    {/* legs */}
    <rect x="18" y="52" width="10" height="12" fill={p} />
    <rect x="30" y="52" width="10" height="12" fill={p} />
    <rect x="42" y="52" width="10" height="12" fill={p} />
    {/* sparkles around horn */}
    <rect x="34" y="0" width="4" height="4" fill="#FFD700" />
    <rect x="42" y="4" width="4" height="4" fill="#FFD700" fillOpacity={0.8} />
    <rect x="38" y="10" width="4" height="4" fill={a} fillOpacity={0.7} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* horn */}
    <rect x="14" y="0" width="6" height="14" fill="#FFD700" />
    <rect x="18" y="2" width="6" height="10" fill="#FFD700" />
    <rect x="22" y="2" width="6" height="14" fill={a} />
    <rect x="26" y="6" width="6" height="16" fill={a} />
    <rect x="30" y="2" width="6" height="14" fill="#FFD93D" />
    <rect x="16" y="2" width="4" height="4" fill={W} fillOpacity={0.6} />
    {/* head */}
    <rect x="10" y="12" width="36" height="18" fill={s} />
    <rect x="6" y="16" width="44" height="10" fill={s} />
    <rect x="14" y="14" width="20" height="8" fill={W} fillOpacity={0.2} />
    {/* eye */}
    <rect x="14" y="16" width="10" height="10" fill={B} />
    <rect x="14" y="16" width="5" height="5" fill={W} />
    <rect x="17" y="19" width="4" height="4" fill={B} />
    <rect x="17" y="19" width="2" height="2" fill={W} />
    {/* muzzle */}
    <rect x="36" y="22" width="14" height="10" fill={s} fillOpacity={0.7} />
    {/* body */}
    <rect x="10" y="30" width="36" height="22" fill={s} />
    <rect x="6" y="34" width="44" height="14" fill={s} />
    <rect x="14" y="30" width="22" height="10" fill={W} fillOpacity={0.18} />
    {/* mane */}
    <rect x="46" y="30" width="10" height="6" fill={a} />
    <rect x="50" y="36" width="10" height="14" fill={a} />
    <rect x="52" y="46" width="10" height="8" fill="#FFD93D" />
    {/* legs */}
    <rect x="18" y="52" width="10" height="12" fill={p} />
    <rect x="30" y="52" width="10" height="12" fill={p} />
    <rect x="42" y="52" width="10" height="12" fill={p} />
    {/* sparkles */}
    <rect x="34" y="0" width="4" height="4" fill="#FFD700" fillOpacity={0.7} />
    <rect x="42" y="4" width="4" height="4" fill="#FFD700" fillOpacity={0.5} />
  </svg>
);

/* ─── HORSE ─── */
const horse: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="10" y="4" width="6" height="10" fill={p} />
    <rect x="20" y="4" width="6" height="10" fill={p} />
    <rect x="12" y="6" width="2" height="4" fill={a} />
    <rect x="22" y="6" width="2" height="4" fill={a} />
    {/* mane back */}
    <rect x="4" y="10" width="8" height="22" fill={a} />
    <rect x="2" y="14" width="6" height="18" fill={a} />
    <rect x="6" y="32" width="8" height="14" fill={a} />
    {/* head */}
    <rect x="8" y="12" width="22" height="22" fill={p} />
    <rect x="10" y="10" width="18" height="2" fill={p} />
    <rect x="6" y="16" width="26" height="14" fill={p} />
    <rect x="12" y="14" width="14" height="6" fill={W} fillOpacity={0.2} />
    {/* eye - reacting (wide) */}
    <rect x="12" y="18" width="8" height="8" fill={B} />
    <rect x="13" y="19" width="4" height="4" fill={W} />
    <rect x="14" y="20" width="2" height="2" fill={B} />
    {/* muzzle */}
    <rect x="22" y="22" width="12" height="10" fill={s} />
    <rect x="24" y="26" width="6" height="3" fill={a} />
    <rect x="32" y="20" width="4" height="4" fill={W} fillOpacity={0.5} />
    {/* body */}
    <rect x="14" y="34" width="40" height="16" fill={p} />
    <rect x="10" y="38" width="48" height="10" fill={p} />
    <rect x="18" y="34" width="24" height="8" fill={W} fillOpacity={0.18} />
    {/* mane top of body */}
    <rect x="20" y="32" width="8" height="6" fill={a} />
    <rect x="14" y="32" width="6" height="4" fill={a} />
    {/* legs galloping */}
    <rect x="18" y="50" width="6" height="10" fill={p} />
    <rect x="26" y="50" width="6" height="14" fill={p} />
    <rect x="38" y="50" width="6" height="14" fill={p} />
    <rect x="46" y="50" width="6" height="10" fill={p} />
    <rect x="18" y="60" width="6" height="3" fill={B} />
    <rect x="46" y="60" width="6" height="3" fill={B} />
    {/* tail */}
    <rect x="54" y="36" width="8" height="6" fill={a} />
    <rect x="56" y="42" width="6" height="14" fill={a} />
    {/* dust */}
    <rect x="14" y="60" width="4" height="4" fill={W} fillOpacity={0.6} />
    <rect x="50" y="60" width="4" height="4" fill={W} fillOpacity={0.6} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="10" y="6" width="6" height="10" fill={p} />
    <rect x="20" y="6" width="6" height="10" fill={p} />
    <rect x="12" y="8" width="2" height="4" fill={a} />
    <rect x="22" y="8" width="2" height="4" fill={a} />
    {/* mane */}
    <rect x="4" y="12" width="8" height="22" fill={a} />
    <rect x="2" y="16" width="6" height="18" fill={a} />
    <rect x="6" y="34" width="8" height="14" fill={a} />
    {/* head */}
    <rect x="8" y="14" width="22" height="22" fill={p} />
    <rect x="6" y="18" width="26" height="14" fill={p} />
    <rect x="12" y="16" width="14" height="6" fill={W} fillOpacity={0.2} />
    {/* eye */}
    <rect x="14" y="20" width="6" height="6" fill={B} />
    <rect x="14" y="20" width="3" height="3" fill={W} />
    <rect x="15" y="21" width="2" height="2" fill={B} />
    {/* muzzle */}
    <rect x="22" y="24" width="12" height="10" fill={s} />
    <rect x="24" y="28" width="6" height="3" fill={a} />
    {/* body */}
    <rect x="14" y="36" width="40" height="16" fill={p} />
    <rect x="10" y="40" width="48" height="10" fill={p} />
    <rect x="18" y="36" width="24" height="8" fill={W} fillOpacity={0.18} />
    {/* mane on body */}
    <rect x="20" y="34" width="8" height="4" fill={a} />
    {/* legs */}
    <rect x="18" y="52" width="6" height="12" fill={p} />
    <rect x="28" y="52" width="6" height="12" fill={p} />
    <rect x="38" y="52" width="6" height="12" fill={p} />
    <rect x="46" y="52" width="6" height="12" fill={p} />
    <rect x="18" y="62" width="6" height="2" fill={B} />
    <rect x="28" y="62" width="6" height="2" fill={B} />
    <rect x="38" y="62" width="6" height="2" fill={B} />
    <rect x="46" y="62" width="6" height="2" fill={B} />
    {/* tail */}
    <rect x="54" y="38" width="8" height="6" fill={a} />
    <rect x="56" y="44" width="6" height="14" fill={a} />
  </svg>
);

/* ─── TIGER ─── */
const tiger: Renderer = ({ p, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="6" y="6" width="10" height="10" fill={p} />
    <rect x="48" y="6" width="10" height="10" fill={p} />
    <rect x="9" y="9" width="4" height="4" fill={a} />
    <rect x="51" y="9" width="4" height="4" fill={a} />
    {/* head */}
    <rect x="10" y="12" width="44" height="28" fill={p} />
    <rect x="6" y="16" width="52" height="20" fill={p} />
    {/* stripes */}
    <rect x="10" y="14" width="4" height="14" fill={B} />
    <rect x="20" y="14" width="4" height="10" fill={B} />
    <rect x="40" y="14" width="4" height="10" fill={B} />
    <rect x="50" y="14" width="4" height="14" fill={B} />
    <rect x="6" y="28" width="6" height="3" fill={B} />
    <rect x="52" y="28" width="6" height="3" fill={B} />
    {/* face cream */}
    <rect x="22" y="22" width="20" height="12" fill={W} fillOpacity={0.85} />
    {/* fierce eyes */}
    <rect x="18" y="22" width="10" height="10" fill={a} />
    <rect x="36" y="22" width="10" height="10" fill={a} />
    <rect x="20" y="24" width="6" height="6" fill={B} />
    <rect x="38" y="24" width="6" height="6" fill={B} />
    <rect x="20" y="24" width="3" height="3" fill={W} />
    <rect x="38" y="24" width="3" height="3" fill={W} />
    {/* nose */}
    <rect x="28" y="32" width="8" height="4" fill={B} />
    {/* roar mouth */}
    <rect x="22" y="36" width="20" height="6" fill={B} />
    <rect x="24" y="38" width="4" height="4" fill={W} />
    <rect x="36" y="38" width="4" height="4" fill={W} />
    {/* body w/ stripes */}
    <rect x="14" y="42" width="36" height="16" fill={p} />
    <rect x="14" y="44" width="3" height="14" fill={B} />
    <rect x="22" y="44" width="3" height="14" fill={B} />
    <rect x="30" y="44" width="3" height="14" fill={B} />
    <rect x="38" y="44" width="3" height="14" fill={B} />
    <rect x="46" y="44" width="3" height="14" fill={B} />
    {/* paws raised */}
    <rect x="10" y="44" width="6" height="10" fill={p} />
    <rect x="48" y="44" width="6" height="10" fill={p} />
    {/* claws */}
    <rect x="10" y="42" width="2" height="4" fill={W} />
    <rect x="13" y="42" width="2" height="4" fill={W} />
    <rect x="49" y="42" width="2" height="4" fill={W} />
    <rect x="52" y="42" width="2" height="4" fill={W} />
    {/* tail */}
    <rect x="50" y="56" width="12" height="4" fill={p} />
    <rect x="58" y="50" width="4" height="10" fill={p} />
    <rect x="56" y="58" width="4" height="2" fill={B} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="6" y="8" width="10" height="10" fill={p} />
    <rect x="48" y="8" width="10" height="10" fill={p} />
    <rect x="9" y="11" width="4" height="4" fill={a} />
    <rect x="51" y="11" width="4" height="4" fill={a} />
    {/* head */}
    <rect x="10" y="14" width="44" height="26" fill={p} />
    <rect x="6" y="18" width="52" height="18" fill={p} />
    {/* stripes */}
    <rect x="10" y="16" width="4" height="12" fill={B} />
    <rect x="20" y="16" width="4" height="8" fill={B} />
    <rect x="40" y="16" width="4" height="8" fill={B} />
    <rect x="50" y="16" width="4" height="12" fill={B} />
    {/* face cream */}
    <rect x="22" y="24" width="20" height="12" fill={W} fillOpacity={0.85} />
    {/* eyes */}
    <rect x="18" y="24" width="8" height="8" fill={B} />
    <rect x="38" y="24" width="8" height="8" fill={B} />
    <rect x="18" y="24" width="4" height="4" fill={W} />
    <rect x="38" y="24" width="4" height="4" fill={W} />
    <rect x="20" y="26" width="3" height="3" fill={a} />
    <rect x="40" y="26" width="3" height="3" fill={a} />
    {/* nose */}
    <rect x="28" y="32" width="8" height="4" fill={B} />
    {/* mouth */}
    <rect x="26" y="36" width="12" height="2" fill={B} />
    {/* body */}
    <rect x="14" y="42" width="36" height="18" fill={p} />
    <rect x="10" y="46" width="44" height="12" fill={p} />
    <rect x="14" y="44" width="3" height="14" fill={B} />
    <rect x="22" y="44" width="3" height="14" fill={B} />
    <rect x="30" y="44" width="3" height="14" fill={B} />
    <rect x="38" y="44" width="3" height="14" fill={B} />
    <rect x="46" y="44" width="3" height="14" fill={B} />
    {/* paws */}
    <rect x="14" y="58" width="10" height="6" fill={p} />
    <rect x="40" y="58" width="10" height="6" fill={p} />
    {/* tail */}
    <rect x="50" y="50" width="12" height="4" fill={p} />
    <rect x="56" y="46" width="4" height="6" fill={p} />
  </svg>
);

/* ─── LION ─── */
const lion: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* mane - full halo, spiky */}
    <rect x="6" y="6" width="52" height="40" fill={s} />
    <rect x="2" y="10" width="60" height="32" fill={s} />
    <rect x="4" y="14" width="56" height="28" fill={a} />
    {/* mane spikes */}
    <rect x="0" y="14" width="4" height="6" fill={a} />
    <rect x="60" y="14" width="4" height="6" fill={a} />
    <rect x="0" y="24" width="4" height="6" fill={a} />
    <rect x="60" y="24" width="4" height="6" fill={a} />
    <rect x="0" y="34" width="4" height="6" fill={a} />
    <rect x="60" y="34" width="4" height="6" fill={a} />
    <rect x="14" y="2" width="6" height="8" fill={a} />
    <rect x="26" y="0" width="6" height="8" fill={a} />
    <rect x="36" y="0" width="6" height="8" fill={a} />
    <rect x="44" y="2" width="6" height="8" fill={a} />
    {/* head */}
    <rect x="16" y="16" width="32" height="26" fill={p} />
    <rect x="12" y="20" width="40" height="18" fill={p} />
    <rect x="16" y="18" width="20" height="6" fill={W} fillOpacity={0.2} />
    {/* fierce eyes */}
    <rect x="20" y="22" width="9" height="9" fill={B} />
    <rect x="35" y="22" width="9" height="9" fill={B} />
    <rect x="20" y="22" width="4" height="4" fill={a} />
    <rect x="35" y="22" width="4" height="4" fill={a} />
    <rect x="22" y="24" width="2" height="3" fill={W} />
    <rect x="37" y="24" width="2" height="3" fill={W} />
    {/* muzzle pale */}
    <rect x="24" y="32" width="16" height="8" fill={W} fillOpacity={0.7} />
    {/* nose */}
    <rect x="28" y="32" width="8" height="4" fill={B} />
    {/* roar mouth open */}
    <rect x="24" y="38" width="16" height="6" fill={B} />
    <rect x="26" y="40" width="3" height="4" fill={W} />
    <rect x="35" y="40" width="3" height="4" fill={W} />
    {/* body */}
    <rect x="18" y="44" width="28" height="14" fill={p} />
    <rect x="14" y="48" width="36" height="10" fill={p} />
    {/* legs */}
    <rect x="16" y="56" width="8" height="8" fill={p} />
    <rect x="40" y="56" width="8" height="8" fill={p} />
    <rect x="26" y="58" width="6" height="6" fill={p} />
    <rect x="32" y="58" width="6" height="6" fill={p} />
    {/* tail w/ tuft */}
    <rect x="48" y="50" width="10" height="4" fill={p} />
    <rect x="54" y="44" width="4" height="10" fill={p} />
    <rect x="52" y="40" width="8" height="6" fill={a} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* mane */}
    <rect x="6" y="8" width="52" height="38" fill={s} />
    <rect x="2" y="12" width="60" height="30" fill={s} />
    <rect x="4" y="16" width="56" height="26" fill={a} />
    <rect x="0" y="18" width="4" height="20" fill={a} />
    <rect x="60" y="18" width="4" height="20" fill={a} />
    <rect x="14" y="4" width="6" height="6" fill={a} />
    <rect x="28" y="2" width="8" height="6" fill={a} />
    <rect x="44" y="4" width="6" height="6" fill={a} />
    {/* head */}
    <rect x="16" y="18" width="32" height="24" fill={p} />
    <rect x="12" y="22" width="40" height="16" fill={p} />
    <rect x="16" y="20" width="20" height="6" fill={W} fillOpacity={0.2} />
    {/* eyes */}
    <rect x="20" y="24" width="8" height="8" fill={B} />
    <rect x="36" y="24" width="8" height="8" fill={B} />
    <rect x="20" y="24" width="4" height="4" fill={W} />
    <rect x="36" y="24" width="4" height="4" fill={W} />
    <rect x="22" y="26" width="2" height="2" fill={a} />
    <rect x="38" y="26" width="2" height="2" fill={a} />
    {/* muzzle */}
    <rect x="24" y="32" width="16" height="8" fill={W} fillOpacity={0.7} />
    <rect x="28" y="32" width="8" height="4" fill={B} />
    <rect x="26" y="36" width="12" height="2" fill={B} />
    {/* body */}
    <rect x="18" y="44" width="28" height="14" fill={p} />
    <rect x="14" y="48" width="36" height="10" fill={p} />
    {/* legs */}
    <rect x="16" y="58" width="10" height="6" fill={p} />
    <rect x="38" y="58" width="10" height="6" fill={p} />
    {/* tail */}
    <rect x="48" y="50" width="10" height="4" fill={p} />
    <rect x="54" y="46" width="4" height="6" fill={p} />
    <rect x="52" y="42" width="8" height="4" fill={a} />
  </svg>
);

/* ─── SNAKE ─── */
const snake: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* tail coil bottom */}
    <rect x="8" y="52" width="48" height="8" fill={p} />
    <rect x="4" y="48" width="6" height="14" fill={p} />
    <rect x="54" y="48" width="6" height="14" fill={p} />
    <rect x="12" y="46" width="40" height="8" fill={s} fillOpacity={0.6} />
    {/* coil middle */}
    <rect x="10" y="38" width="44" height="10" fill={p} />
    <rect x="14" y="36" width="36" height="6" fill={s} fillOpacity={0.5} />
    {/* coil upper */}
    <rect x="14" y="28" width="36" height="10" fill={p} />
    <rect x="18" y="26" width="28" height="6" fill={s} fillOpacity={0.5} />
    {/* head rearing up */}
    <rect x="22" y="6" width="20" height="22" fill={p} />
    <rect x="18" y="10" width="28" height="14" fill={p} />
    <rect x="24" y="8" width="14" height="6" fill={W} fillOpacity={0.25} />
    {/* hood/frill (cobra) */}
    <rect x="14" y="12" width="6" height="12" fill={s} />
    <rect x="44" y="12" width="6" height="12" fill={s} />
    <rect x="12" y="16" width="4" height="6" fill={s} fillOpacity={0.8} />
    <rect x="48" y="16" width="4" height="6" fill={s} fillOpacity={0.8} />
    {/* angry eyes (react) */}
    <rect x="24" y="14" width="6" height="6" fill={a} />
    <rect x="34" y="14" width="6" height="6" fill={a} />
    <rect x="25" y="15" width="2" height="4" fill={B} />
    <rect x="37" y="15" width="2" height="4" fill={B} />
    {/* fangs */}
    <rect x="26" y="24" width="3" height="6" fill={W} />
    <rect x="35" y="24" width="3" height="6" fill={W} />
    {/* forked tongue */}
    <rect x="30" y="22" width="4" height="4" fill={a} />
    <rect x="28" y="26" width="3" height="3" fill={a} />
    <rect x="33" y="26" width="3" height="3" fill={a} />
    {/* scales pattern */}
    <rect x="20" y="40" width="4" height="4" fill={a} fillOpacity={0.6} />
    <rect x="28" y="40" width="4" height="4" fill={a} fillOpacity={0.6} />
    <rect x="36" y="40" width="4" height="4" fill={a} fillOpacity={0.6} />
    <rect x="44" y="40" width="4" height="4" fill={a} fillOpacity={0.6} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* bottom coil */}
    <rect x="6" y="52" width="52" height="8" fill={p} />
    <rect x="2" y="48" width="6" height="14" fill={p} />
    <rect x="56" y="48" width="6" height="14" fill={p} />
    <rect x="10" y="46" width="44" height="8" fill={s} fillOpacity={0.6} />
    {/* middle coil */}
    <rect x="8" y="38" width="48" height="10" fill={p} />
    <rect x="12" y="36" width="40" height="6" fill={s} fillOpacity={0.5} />
    {/* upper coil */}
    <rect x="14" y="28" width="36" height="10" fill={p} />
    <rect x="18" y="26" width="28" height="6" fill={s} fillOpacity={0.5} />
    {/* head */}
    <rect x="22" y="10" width="20" height="20" fill={p} />
    <rect x="18" y="14" width="28" height="12" fill={p} />
    <rect x="24" y="12" width="14" height="6" fill={W} fillOpacity={0.25} />
    {/* hood */}
    <rect x="14" y="16" width="6" height="10" fill={s} />
    <rect x="44" y="16" width="6" height="10" fill={s} />
    {/* eyes */}
    <rect x="24" y="18" width="6" height="6" fill={B} />
    <rect x="34" y="18" width="6" height="6" fill={B} />
    <rect x="24" y="18" width="3" height="3" fill={a} />
    <rect x="34" y="18" width="3" height="3" fill={a} />
    {/* tongue */}
    <rect x="30" y="26" width="4" height="4" fill={a} />
    {/* scales */}
    <rect x="20" y="40" width="4" height="4" fill={a} fillOpacity={0.6} />
    <rect x="28" y="40" width="4" height="4" fill={a} fillOpacity={0.6} />
    <rect x="36" y="40" width="4" height="4" fill={a} fillOpacity={0.6} />
    <rect x="44" y="40" width="4" height="4" fill={a} fillOpacity={0.6} />
  </svg>
);

/* ─── DEER ─── */
const deer: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* antlers - large branching */}
    <rect x="8" y="0" width="4" height="14" fill={a} />
    <rect x="4" y="4" width="4" height="6" fill={a} />
    <rect x="0" y="0" width="4" height="6" fill={a} />
    <rect x="12" y="2" width="4" height="4" fill={a} />
    <rect x="52" y="0" width="4" height="14" fill={a} />
    <rect x="56" y="4" width="4" height="6" fill={a} />
    <rect x="60" y="0" width="4" height="6" fill={a} />
    <rect x="48" y="2" width="4" height="4" fill={a} />
    {/* sparkle on antler */}
    <rect x="0" y="0" width="2" height="2" fill={W} />
    <rect x="62" y="0" width="2" height="2" fill={W} />
    {/* ears */}
    <rect x="16" y="8" width="6" height="10" fill={p} />
    <rect x="42" y="8" width="6" height="10" fill={p} />
    <rect x="18" y="10" width="2" height="6" fill={a} fillOpacity={0.5} />
    <rect x="44" y="10" width="2" height="6" fill={a} fillOpacity={0.5} />
    {/* head */}
    <rect x="18" y="14" width="28" height="22" fill={p} />
    <rect x="14" y="18" width="36" height="14" fill={p} />
    <rect x="20" y="16" width="14" height="6" fill={W} fillOpacity={0.2} />
    {/* eyes wide */}
    <rect x="20" y="20" width="8" height="8" fill={B} />
    <rect x="36" y="20" width="8" height="8" fill={B} />
    <rect x="22" y="22" width="4" height="4" fill={W} />
    <rect x="38" y="22" width="4" height="4" fill={W} />
    <rect x="22" y="22" width="2" height="2" fill={B} />
    <rect x="38" y="22" width="2" height="2" fill={B} />
    {/* muzzle */}
    <rect x="26" y="28" width="12" height="8" fill={s} />
    <rect x="28" y="32" width="8" height="3" fill={B} />
    {/* spots on head */}
    <rect x="14" y="22" width="3" height="3" fill={W} />
    <rect x="48" y="22" width="3" height="3" fill={W} />
    {/* body */}
    <rect x="14" y="36" width="36" height="16" fill={p} />
    <rect x="10" y="40" width="44" height="10" fill={p} />
    {/* spots on body */}
    <rect x="18" y="40" width="3" height="3" fill={W} />
    <rect x="26" y="42" width="3" height="3" fill={W} />
    <rect x="34" y="40" width="3" height="3" fill={W} />
    <rect x="42" y="42" width="3" height="3" fill={W} />
    {/* legs leaping */}
    <rect x="14" y="52" width="6" height="12" fill={p} />
    <rect x="22" y="52" width="6" height="10" fill={p} />
    <rect x="34" y="52" width="6" height="10" fill={p} />
    <rect x="44" y="52" width="6" height="12" fill={p} />
    <rect x="14" y="60" width="6" height="3" fill={B} />
    <rect x="44" y="60" width="6" height="3" fill={B} />
    {/* tail */}
    <rect x="50" y="40" width="6" height="4" fill={W} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* antlers */}
    <rect x="8" y="2" width="4" height="12" fill={a} />
    <rect x="4" y="6" width="4" height="6" fill={a} />
    <rect x="0" y="2" width="4" height="6" fill={a} />
    <rect x="52" y="2" width="4" height="12" fill={a} />
    <rect x="56" y="6" width="4" height="6" fill={a} />
    <rect x="60" y="2" width="4" height="6" fill={a} />
    {/* ears */}
    <rect x="16" y="10" width="6" height="10" fill={p} />
    <rect x="42" y="10" width="6" height="10" fill={p} />
    {/* head */}
    <rect x="18" y="14" width="28" height="22" fill={p} />
    <rect x="14" y="18" width="36" height="14" fill={p} />
    <rect x="20" y="16" width="14" height="6" fill={W} fillOpacity={0.2} />
    {/* eyes */}
    <rect x="20" y="22" width="7" height="7" fill={B} />
    <rect x="37" y="22" width="7" height="7" fill={B} />
    <rect x="21" y="23" width="3" height="3" fill={W} />
    <rect x="38" y="23" width="3" height="3" fill={W} />
    {/* muzzle */}
    <rect x="26" y="28" width="12" height="8" fill={s} />
    <rect x="28" y="32" width="8" height="3" fill={B} />
    {/* body */}
    <rect x="14" y="36" width="36" height="18" fill={p} />
    <rect x="10" y="40" width="44" height="12" fill={p} />
    {/* spots */}
    <rect x="18" y="42" width="3" height="3" fill={W} />
    <rect x="26" y="44" width="3" height="3" fill={W} />
    <rect x="34" y="42" width="3" height="3" fill={W} />
    <rect x="42" y="44" width="3" height="3" fill={W} />
    {/* legs */}
    <rect x="16" y="54" width="6" height="10" fill={p} />
    <rect x="24" y="54" width="6" height="10" fill={p} />
    <rect x="34" y="54" width="6" height="10" fill={p} />
    <rect x="42" y="54" width="6" height="10" fill={p} />
    <rect x="16" y="62" width="6" height="2" fill={B} />
    <rect x="24" y="62" width="6" height="2" fill={B} />
    <rect x="34" y="62" width="6" height="2" fill={B} />
    <rect x="42" y="62" width="6" height="2" fill={B} />
    {/* tail */}
    <rect x="50" y="40" width="6" height="4" fill={W} />
  </svg>
);

/* ─── RAVEN ─── */
const raven: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* spread wings */}
    <rect x="0" y="20" width="14" height="6" fill={p} />
    <rect x="2" y="14" width="12" height="6" fill={p} />
    <rect x="50" y="20" width="14" height="6" fill={p} />
    <rect x="50" y="14" width="12" height="6" fill={p} />
    <rect x="0" y="26" width="6" height="4" fill={s} />
    <rect x="58" y="26" width="6" height="4" fill={s} />
    {/* body */}
    <rect x="16" y="18" width="32" height="26" fill={p} />
    <rect x="12" y="22" width="40" height="20" fill={p} />
    <rect x="18" y="20" width="20" height="6" fill={W} fillOpacity={0.15} />
    {/* head feather tuft */}
    <rect x="22" y="12" width="6" height="6" fill={p} />
    <rect x="36" y="12" width="6" height="6" fill={p} />
    <rect x="28" y="8" width="8" height="6" fill={p} />
    {/* angry eyes */}
    <rect x="18" y="22" width="9" height="9" fill={a} />
    <rect x="37" y="22" width="9" height="9" fill={a} />
    <rect x="20" y="24" width="5" height="5" fill={B} />
    <rect x="39" y="24" width="5" height="5" fill={B} />
    <rect x="20" y="24" width="2" height="2" fill={W} />
    <rect x="39" y="24" width="2" height="2" fill={W} />
    {/* beak open */}
    <rect x="28" y="32" width="8" height="4" fill={s} />
    <rect x="30" y="36" width="4" height="4" fill={s} />
    <rect x="28" y="38" width="8" height="2" fill={B} />
    {/* legs */}
    <rect x="22" y="44" width="4" height="10" fill={s} />
    <rect x="38" y="44" width="4" height="10" fill={s} />
    <rect x="18" y="54" width="10" height="3" fill={s} />
    <rect x="36" y="54" width="10" height="3" fill={s} />
    {/* tail feathers */}
    <rect x="24" y="56" width="16" height="6" fill={p} />
    <rect x="28" y="62" width="8" height="2" fill={p} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* folded wings */}
    <rect x="8" y="22" width="10" height="20" fill={p} />
    <rect x="46" y="22" width="10" height="20" fill={p} />
    <rect x="6" y="26" width="6" height="12" fill={s} />
    <rect x="52" y="26" width="6" height="12" fill={s} />
    {/* body */}
    <rect x="16" y="18" width="32" height="26" fill={p} />
    <rect x="14" y="22" width="36" height="20" fill={p} />
    <rect x="18" y="20" width="20" height="6" fill={W} fillOpacity={0.15} />
    {/* head tuft */}
    <rect x="24" y="12" width="6" height="6" fill={p} />
    <rect x="34" y="12" width="6" height="6" fill={p} />
    <rect x="28" y="8" width="8" height="6" fill={p} />
    {/* eyes */}
    <rect x="20" y="24" width="8" height="8" fill={B} />
    <rect x="36" y="24" width="8" height="8" fill={B} />
    <rect x="20" y="24" width="4" height="4" fill={a} />
    <rect x="36" y="24" width="4" height="4" fill={a} />
    <rect x="22" y="26" width="2" height="2" fill={W} />
    <rect x="38" y="26" width="2" height="2" fill={W} />
    {/* beak */}
    <rect x="28" y="32" width="8" height="4" fill={s} />
    <rect x="30" y="36" width="4" height="3" fill={s} />
    {/* legs */}
    <rect x="24" y="44" width="4" height="12" fill={s} />
    <rect x="36" y="44" width="4" height="12" fill={s} />
    <rect x="20" y="56" width="12" height="3" fill={s} />
    <rect x="32" y="56" width="12" height="3" fill={s} />
    {/* tail */}
    <rect x="26" y="60" width="12" height="4" fill={p} />
  </svg>
);

/* ─── EAGLE ─── */
const eagle: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* wide spread wings */}
    <rect x="0" y="12" width="16" height="8" fill={p} />
    <rect x="2" y="20" width="14" height="8" fill={p} />
    <rect x="0" y="6" width="10" height="8" fill={s} />
    <rect x="48" y="12" width="16" height="8" fill={p} />
    <rect x="48" y="20" width="14" height="8" fill={p} />
    <rect x="54" y="6" width="10" height="8" fill={s} />
    <rect x="2" y="14" width="12" height="2" fill={B} />
    <rect x="50" y="14" width="12" height="2" fill={B} />
    {/* white head */}
    <rect x="18" y="14" width="28" height="14" fill={W} />
    <rect x="16" y="18" width="32" height="8" fill={W} />
    <rect x="22" y="12" width="20" height="4" fill={W} />
    {/* dark crown */}
    <rect x="22" y="10" width="20" height="4" fill={p} />
    <rect x="26" y="6" width="12" height="4" fill={p} />
    {/* fierce eyes */}
    <rect x="20" y="18" width="9" height="9" fill={a} />
    <rect x="35" y="18" width="9" height="9" fill={a} />
    <rect x="22" y="20" width="5" height="5" fill={B} />
    <rect x="37" y="20" width="5" height="5" fill={B} />
    {/* hooked yellow beak */}
    <rect x="26" y="26" width="12" height="6" fill={a} />
    <rect x="28" y="32" width="8" height="4" fill={a} />
    <rect x="30" y="36" width="4" height="3" fill={B} />
    {/* body */}
    <rect x="18" y="32" width="28" height="18" fill={p} />
    <rect x="16" y="36" width="32" height="12" fill={p} />
    <rect x="20" y="34" width="12" height="6" fill={W} fillOpacity={0.2} />
    {/* talons grasping */}
    <rect x="18" y="50" width="6" height="10" fill={a} />
    <rect x="26" y="50" width="6" height="10" fill={a} />
    <rect x="34" y="50" width="6" height="10" fill={a} />
    <rect x="42" y="50" width="6" height="10" fill={a} />
    <rect x="18" y="60" width="6" height="3" fill={B} />
    <rect x="26" y="60" width="6" height="3" fill={B} />
    <rect x="34" y="60" width="6" height="3" fill={B} />
    <rect x="42" y="60" width="6" height="3" fill={B} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* folded wings */}
    <rect x="6" y="20" width="12" height="24" fill={p} />
    <rect x="46" y="20" width="12" height="24" fill={p} />
    <rect x="4" y="24" width="6" height="16" fill={s} />
    <rect x="54" y="24" width="6" height="16" fill={s} />
    {/* white head */}
    <rect x="18" y="14" width="28" height="16" fill={W} />
    <rect x="16" y="18" width="32" height="10" fill={W} />
    <rect x="22" y="12" width="20" height="4" fill={W} />
    {/* crown */}
    <rect x="22" y="10" width="20" height="4" fill={p} />
    <rect x="26" y="8" width="12" height="2" fill={p} />
    {/* eyes */}
    <rect x="22" y="20" width="7" height="7" fill={B} />
    <rect x="35" y="20" width="7" height="7" fill={B} />
    <rect x="22" y="20" width="3" height="3" fill={a} />
    <rect x="35" y="20" width="3" height="3" fill={a} />
    {/* beak */}
    <rect x="26" y="26" width="12" height="5" fill={a} />
    <rect x="28" y="31" width="8" height="3" fill={a} />
    {/* body */}
    <rect x="18" y="32" width="28" height="20" fill={p} />
    <rect x="16" y="36" width="32" height="14" fill={p} />
    <rect x="20" y="34" width="12" height="6" fill={W} fillOpacity={0.2} />
    {/* talons */}
    <rect x="22" y="52" width="6" height="10" fill={a} />
    <rect x="36" y="52" width="6" height="10" fill={a} />
    <rect x="22" y="62" width="6" height="2" fill={B} />
    <rect x="36" y="62" width="6" height="2" fill={B} />
  </svg>
);

/* ─── WHALE ─── */
const whale: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* water spout */}
    <rect x="22" y="0" width="4" height="6" fill={a} />
    <rect x="20" y="2" width="8" height="4" fill={a} />
    <rect x="18" y="6" width="12" height="4" fill={a} fillOpacity={0.7} />
    <rect x="20" y="0" width="2" height="2" fill={W} />
    {/* body massive */}
    <rect x="8" y="20" width="44" height="28" fill={p} />
    <rect x="4" y="26" width="52" height="18" fill={p} />
    <rect x="12" y="22" width="32" height="8" fill={W} fillOpacity={0.2} />
    {/* belly */}
    <rect x="10" y="40" width="40" height="10" fill={s} />
    <rect x="14" y="44" width="2" height="6" fill={B} fillOpacity={0.3} />
    <rect x="20" y="44" width="2" height="6" fill={B} fillOpacity={0.3} />
    <rect x="26" y="44" width="2" height="6" fill={B} fillOpacity={0.3} />
    <rect x="32" y="44" width="2" height="6" fill={B} fillOpacity={0.3} />
    <rect x="38" y="44" width="2" height="6" fill={B} fillOpacity={0.3} />
    {/* eye - happy */}
    <rect x="14" y="28" width="6" height="6" fill={B} />
    <rect x="14" y="28" width="3" height="3" fill={W} />
    {/* smile */}
    <rect x="8" y="36" width="8" height="2" fill={B} />
    <rect x="6" y="34" width="2" height="4" fill={B} />
    {/* fin top */}
    <rect x="28" y="14" width="10" height="8" fill={p} />
    <rect x="32" y="10" width="6" height="6" fill={p} />
    {/* side fin */}
    <rect x="14" y="38" width="10" height="6" fill={p} />
    {/* tail flukes high */}
    <rect x="50" y="14" width="8" height="6" fill={p} />
    <rect x="56" y="10" width="6" height="10" fill={p} />
    <rect x="50" y="20" width="14" height="8" fill={p} />
    <rect x="50" y="48" width="8" height="6" fill={p} />
    <rect x="56" y="50" width="6" height="6" fill={p} />
    {/* water splashes */}
    <rect x="0" y="56" width="4" height="4" fill={a} fillOpacity={0.6} />
    <rect x="58" y="58" width="4" height="4" fill={a} fillOpacity={0.6} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* small spout */}
    <rect x="22" y="6" width="4" height="4" fill={a} fillOpacity={0.7} />
    {/* body */}
    <rect x="8" y="22" width="44" height="26" fill={p} />
    <rect x="4" y="28" width="52" height="14" fill={p} />
    <rect x="12" y="24" width="32" height="8" fill={W} fillOpacity={0.2} />
    {/* belly */}
    <rect x="10" y="40" width="40" height="10" fill={s} />
    <rect x="14" y="44" width="2" height="6" fill={B} fillOpacity={0.3} />
    <rect x="22" y="44" width="2" height="6" fill={B} fillOpacity={0.3} />
    <rect x="30" y="44" width="2" height="6" fill={B} fillOpacity={0.3} />
    <rect x="38" y="44" width="2" height="6" fill={B} fillOpacity={0.3} />
    {/* eye */}
    <rect x="14" y="30" width="6" height="6" fill={B} />
    <rect x="14" y="30" width="3" height="3" fill={W} />
    {/* mouth */}
    <rect x="6" y="38" width="10" height="2" fill={B} />
    {/* fin */}
    <rect x="30" y="18" width="8" height="6" fill={p} />
    {/* tail */}
    <rect x="50" y="22" width="8" height="8" fill={p} />
    <rect x="50" y="36" width="8" height="8" fill={p} />
    <rect x="56" y="16" width="6" height="14" fill={p} />
    <rect x="56" y="36" width="6" height="14" fill={p} />
  </svg>
);

/* ─── BOAR ─── */
const boar: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* mohawk bristles */}
    <rect x="14" y="8" width="4" height="6" fill={B} />
    <rect x="20" y="6" width="4" height="8" fill={B} />
    <rect x="26" y="8" width="4" height="6" fill={B} />
    <rect x="32" y="6" width="4" height="8" fill={B} />
    <rect x="38" y="8" width="4" height="6" fill={B} />
    {/* head large */}
    <rect x="8" y="14" width="38" height="22" fill={p} />
    <rect x="4" y="18" width="44" height="16" fill={p} />
    <rect x="10" y="16" width="20" height="6" fill={W} fillOpacity={0.15} />
    {/* ears */}
    <rect x="10" y="10" width="6" height="8" fill={p} />
    <rect x="40" y="10" width="6" height="8" fill={p} />
    {/* angry eyes */}
    <rect x="14" y="20" width="8" height="8" fill={a} />
    <rect x="30" y="20" width="8" height="8" fill={a} />
    <rect x="16" y="22" width="4" height="4" fill={B} />
    <rect x="32" y="22" width="4" height="4" fill={B} />
    {/* snout */}
    <rect x="2" y="26" width="14" height="10" fill={s} />
    <rect x="0" y="30" width="6" height="6" fill={s} />
    <rect x="4" y="30" width="3" height="3" fill={B} />
    <rect x="10" y="30" width="3" height="3" fill={B} />
    {/* tusks */}
    <rect x="4" y="22" width="4" height="8" fill={W} />
    <rect x="2" y="22" width="2" height="6" fill={W} />
    <rect x="42" y="26" width="4" height="8" fill={W} />
    <rect x="44" y="22" width="2" height="6" fill={W} />
    {/* body bulky */}
    <rect x="22" y="36" width="34" height="20" fill={p} />
    <rect x="18" y="40" width="42" height="14" fill={p} />
    {/* bristles on back */}
    <rect x="24" y="34" width="3" height="4" fill={B} />
    <rect x="32" y="32" width="3" height="6" fill={B} />
    <rect x="40" y="34" width="3" height="4" fill={B} />
    <rect x="48" y="32" width="3" height="6" fill={B} />
    {/* legs running */}
    <rect x="24" y="56" width="6" height="6" fill={p} />
    <rect x="34" y="56" width="6" height="8" fill={p} />
    <rect x="44" y="56" width="6" height="8" fill={p} />
    <rect x="52" y="56" width="6" height="6" fill={p} />
    <rect x="24" y="62" width="6" height="2" fill={B} />
    <rect x="52" y="62" width="6" height="2" fill={B} />
    {/* dust */}
    <rect x="58" y="58" width="6" height="4" fill={W} fillOpacity={0.5} />
    {/* curled tail */}
    <rect x="56" y="38" width="6" height="4" fill={p} />
    <rect x="58" y="42" width="4" height="6" fill={p} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* mohawk */}
    <rect x="14" y="10" width="4" height="6" fill={B} />
    <rect x="22" y="8" width="4" height="8" fill={B} />
    <rect x="30" y="8" width="4" height="8" fill={B} />
    <rect x="38" y="10" width="4" height="6" fill={B} />
    {/* head */}
    <rect x="10" y="14" width="36" height="22" fill={p} />
    <rect x="6" y="20" width="44" height="14" fill={p} />
    <rect x="14" y="16" width="20" height="6" fill={W} fillOpacity={0.15} />
    {/* ears */}
    <rect x="10" y="12" width="6" height="6" fill={p} />
    <rect x="40" y="12" width="6" height="6" fill={p} />
    {/* eyes */}
    <rect x="16" y="22" width="6" height="6" fill={B} />
    <rect x="32" y="22" width="6" height="6" fill={B} />
    <rect x="16" y="22" width="3" height="3" fill={W} />
    <rect x="32" y="22" width="3" height="3" fill={W} />
    {/* snout */}
    <rect x="20" y="28" width="16" height="10" fill={s} />
    <rect x="22" y="32" width="4" height="3" fill={B} />
    <rect x="30" y="32" width="4" height="3" fill={B} />
    {/* tusks */}
    <rect x="18" y="32" width="3" height="6" fill={W} />
    <rect x="35" y="32" width="3" height="6" fill={W} />
    {/* body */}
    <rect x="12" y="36" width="40" height="20" fill={p} />
    <rect x="8" y="40" width="48" height="14" fill={p} />
    {/* bristles on back */}
    <rect x="16" y="34" width="3" height="4" fill={B} />
    <rect x="24" y="34" width="3" height="4" fill={B} />
    <rect x="32" y="34" width="3" height="4" fill={B} />
    <rect x="40" y="34" width="3" height="4" fill={B} />
    {/* legs */}
    <rect x="14" y="56" width="6" height="8" fill={p} />
    <rect x="24" y="56" width="6" height="8" fill={p} />
    <rect x="34" y="56" width="6" height="8" fill={p} />
    <rect x="44" y="56" width="6" height="8" fill={p} />
    {/* curled tail */}
    <rect x="52" y="40" width="6" height="4" fill={p} />
    <rect x="54" y="44" width="4" height="4" fill={p} />
  </svg>
);

/* ─── ELEPHANT ─── */
const elephant: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* large flapping ears */}
    <rect x="0" y="14" width="12" height="22" fill={s} />
    <rect x="2" y="10" width="10" height="6" fill={s} />
    <rect x="52" y="14" width="12" height="22" fill={s} />
    <rect x="52" y="10" width="10" height="6" fill={s} />
    <rect x="4" y="16" width="6" height="16" fill={a} fillOpacity={0.4} />
    <rect x="54" y="16" width="6" height="16" fill={a} fillOpacity={0.4} />
    {/* head */}
    <rect x="14" y="14" width="36" height="26" fill={p} />
    <rect x="10" y="18" width="44" height="20" fill={p} />
    <rect x="16" y="16" width="20" height="6" fill={W} fillOpacity={0.2} />
    {/* tusks */}
    <rect x="22" y="34" width="4" height="8" fill={W} />
    <rect x="38" y="34" width="4" height="8" fill={W} />
    {/* happy eyes */}
    <rect x="18" y="22" width="8" height="8" fill={B} />
    <rect x="38" y="22" width="8" height="8" fill={B} />
    <rect x="18" y="22" width="4" height="4" fill={W} />
    <rect x="38" y="22" width="4" height="4" fill={W} />
    {/* trunk lifted - spraying */}
    <rect x="28" y="30" width="10" height="6" fill={p} />
    <rect x="32" y="36" width="8" height="6" fill={p} />
    <rect x="36" y="40" width="8" height="6" fill={p} />
    <rect x="40" y="38" width="8" height="6" fill={p} />
    <rect x="44" y="32" width="8" height="8" fill={p} />
    <rect x="48" y="26" width="6" height="8" fill={p} />
    {/* water spray */}
    <rect x="46" y="20" width="4" height="6" fill={a} />
    <rect x="50" y="14" width="4" height="6" fill={a} />
    <rect x="54" y="8" width="4" height="6" fill={a} fillOpacity={0.7} />
    {/* body */}
    <rect x="16" y="40" width="32" height="16" fill={p} />
    <rect x="12" y="44" width="40" height="10" fill={p} />
    {/* legs */}
    <rect x="14" y="54" width="10" height="10" fill={p} />
    <rect x="28" y="54" width="8" height="10" fill={p} />
    <rect x="40" y="54" width="10" height="10" fill={p} />
    {/* toes */}
    <rect x="14" y="62" width="3" height="2" fill={B} />
    <rect x="19" y="62" width="3" height="2" fill={B} />
    <rect x="40" y="62" width="3" height="2" fill={B} />
    <rect x="45" y="62" width="3" height="2" fill={B} />
    {/* tail */}
    <rect x="48" y="48" width="6" height="4" fill={p} />
    <rect x="52" y="50" width="4" height="6" fill={p} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="0" y="16" width="12" height="20" fill={s} />
    <rect x="52" y="16" width="12" height="20" fill={s} />
    <rect x="4" y="18" width="6" height="14" fill={a} fillOpacity={0.4} />
    <rect x="54" y="18" width="6" height="14" fill={a} fillOpacity={0.4} />
    {/* head */}
    <rect x="14" y="14" width="36" height="26" fill={p} />
    <rect x="10" y="18" width="44" height="20" fill={p} />
    <rect x="16" y="16" width="20" height="6" fill={W} fillOpacity={0.2} />
    {/* tusks */}
    <rect x="22" y="36" width="4" height="6" fill={W} />
    <rect x="38" y="36" width="4" height="6" fill={W} />
    {/* eyes */}
    <rect x="18" y="24" width="6" height="6" fill={B} />
    <rect x="40" y="24" width="6" height="6" fill={B} />
    <rect x="18" y="24" width="3" height="3" fill={W} />
    <rect x="40" y="24" width="3" height="3" fill={W} />
    {/* trunk down */}
    <rect x="28" y="34" width="8" height="6" fill={p} />
    <rect x="28" y="40" width="8" height="6" fill={p} />
    <rect x="30" y="46" width="6" height="6" fill={p} />
    <rect x="32" y="52" width="6" height="4" fill={p} />
    {/* body */}
    <rect x="16" y="42" width="32" height="14" fill={p} />
    <rect x="12" y="46" width="40" height="10" fill={p} />
    {/* legs */}
    <rect x="14" y="56" width="10" height="8" fill={p} />
    <rect x="26" y="56" width="10" height="8" fill={p} />
    <rect x="40" y="56" width="10" height="8" fill={p} />
    {/* tail */}
    <rect x="48" y="50" width="6" height="4" fill={p} />
    <rect x="52" y="52" width="4" height="6" fill={p} />
  </svg>
);

/* ─── MONKEY ─── */
const monkey: Renderer = ({ p, s }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* round ears side */}
    <rect x="4" y="14" width="10" height="12" fill={p} />
    <rect x="50" y="14" width="10" height="12" fill={p} />
    <rect x="6" y="16" width="6" height="8" fill={s} />
    <rect x="52" y="16" width="6" height="8" fill={s} />
    {/* head */}
    <rect x="14" y="10" width="36" height="26" fill={p} />
    <rect x="10" y="14" width="44" height="20" fill={p} />
    {/* face circle */}
    <rect x="18" y="14" width="28" height="20" fill={s} />
    <rect x="16" y="18" width="32" height="12" fill={s} />
    {/* wide excited eyes */}
    <rect x="20" y="18" width="9" height="9" fill={W} />
    <rect x="35" y="18" width="9" height="9" fill={W} />
    <rect x="22" y="20" width="5" height="5" fill={B} />
    <rect x="37" y="20" width="5" height="5" fill={B} />
    <rect x="23" y="21" width="2" height="2" fill={W} />
    <rect x="38" y="21" width="2" height="2" fill={W} />
    {/* nostrils */}
    <rect x="28" y="28" width="3" height="2" fill={B} />
    <rect x="33" y="28" width="3" height="2" fill={B} />
    {/* open smile */}
    <rect x="22" y="30" width="20" height="4" fill={B} />
    <rect x="24" y="32" width="4" height="2" fill={W} />
    <rect x="30" y="32" width="4" height="2" fill={W} />
    <rect x="36" y="32" width="4" height="2" fill={W} />
    {/* body */}
    <rect x="20" y="36" width="24" height="16" fill={p} />
    <rect x="16" y="40" width="32" height="10" fill={p} />
    {/* belly */}
    <rect x="22" y="40" width="20" height="10" fill={s} />
    {/* arms raised */}
    <rect x="6" y="32" width="8" height="6" fill={p} />
    <rect x="2" y="28" width="6" height="10" fill={p} />
    <rect x="50" y="32" width="8" height="6" fill={p} />
    <rect x="56" y="28" width="6" height="10" fill={p} />
    {/* hands */}
    <rect x="0" y="24" width="6" height="6" fill={s} />
    <rect x="58" y="24" width="6" height="6" fill={s} />
    {/* legs */}
    <rect x="20" y="52" width="8" height="10" fill={p} />
    <rect x="36" y="52" width="8" height="10" fill={p} />
    <rect x="18" y="60" width="10" height="4" fill={s} />
    <rect x="36" y="60" width="10" height="4" fill={s} />
    {/* curly tail */}
    <rect x="44" y="44" width="6" height="4" fill={p} />
    <rect x="48" y="48" width="6" height="6" fill={p} />
    <rect x="44" y="52" width="6" height="4" fill={p} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* ears */}
    <rect x="4" y="16" width="10" height="12" fill={p} />
    <rect x="50" y="16" width="10" height="12" fill={p} />
    <rect x="6" y="18" width="6" height="8" fill={s} />
    <rect x="52" y="18" width="6" height="8" fill={s} />
    {/* head */}
    <rect x="14" y="12" width="36" height="24" fill={p} />
    <rect x="10" y="16" width="44" height="18" fill={p} />
    <rect x="18" y="16" width="28" height="18" fill={s} />
    {/* eyes */}
    <rect x="20" y="20" width="8" height="8" fill={B} />
    <rect x="36" y="20" width="8" height="8" fill={B} />
    <rect x="20" y="20" width="4" height="4" fill={W} />
    <rect x="36" y="20" width="4" height="4" fill={W} />
    {/* nostrils */}
    <rect x="28" y="28" width="2" height="2" fill={B} />
    <rect x="34" y="28" width="2" height="2" fill={B} />
    {/* mouth */}
    <rect x="26" y="30" width="12" height="2" fill={B} />
    {/* body */}
    <rect x="18" y="36" width="28" height="20" fill={p} />
    <rect x="14" y="40" width="36" height="14" fill={p} />
    <rect x="22" y="40" width="20" height="14" fill={s} />
    {/* arms */}
    <rect x="6" y="40" width="10" height="14" fill={p} />
    <rect x="48" y="40" width="10" height="14" fill={p} />
    <rect x="4" y="50" width="8" height="6" fill={s} />
    <rect x="52" y="50" width="8" height="6" fill={s} />
    {/* legs */}
    <rect x="18" y="56" width="10" height="8" fill={p} />
    <rect x="36" y="56" width="10" height="8" fill={p} />
    {/* tail */}
    <rect x="46" y="44" width="6" height="4" fill={p} />
    <rect x="50" y="48" width="6" height="6" fill={p} />
  </svg>
);

/* ─── BEETLE ─── */
const beetle: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* horn raised */}
    <rect x="28" y="2" width="8" height="14" fill={s} />
    <rect x="24" y="6" width="4" height="6" fill={s} />
    <rect x="36" y="6" width="4" height="6" fill={s} />
    <rect x="30" y="0" width="4" height="4" fill={a} />
    {/* head */}
    <rect x="22" y="14" width="20" height="10" fill={s} />
    <rect x="20" y="16" width="24" height="6" fill={s} />
    {/* eyes */}
    <rect x="24" y="16" width="4" height="4" fill={a} />
    <rect x="36" y="16" width="4" height="4" fill={a} />
    <rect x="24" y="16" width="2" height="2" fill={W} />
    <rect x="36" y="16" width="2" height="2" fill={W} />
    {/* shell wings open */}
    <rect x="8" y="22" width="20" height="28" fill={p} />
    <rect x="36" y="22" width="20" height="28" fill={p} />
    <rect x="4" y="26" width="14" height="20" fill={p} />
    <rect x="46" y="26" width="14" height="20" fill={p} />
    {/* shell shine */}
    <rect x="10" y="24" width="8" height="8" fill={W} fillOpacity={0.3} />
    <rect x="44" y="24" width="8" height="8" fill={W} fillOpacity={0.3} />
    {/* membrane wings under */}
    <rect x="14" y="32" width="14" height="14" fill={a} fillOpacity={0.5} />
    <rect x="36" y="32" width="14" height="14" fill={a} fillOpacity={0.5} />
    {/* center body */}
    <rect x="26" y="24" width="12" height="22" fill={s} />
    <rect x="30" y="22" width="4" height="24" fill={B} />
    {/* legs - 6 */}
    <rect x="2" y="34" width="8" height="3" fill={B} />
    <rect x="2" y="44" width="8" height="3" fill={B} />
    <rect x="4" y="54" width="8" height="3" fill={B} />
    <rect x="54" y="34" width="8" height="3" fill={B} />
    <rect x="54" y="44" width="8" height="3" fill={B} />
    <rect x="52" y="54" width="8" height="3" fill={B} />
    {/* abdomen */}
    <rect x="22" y="46" width="20" height="12" fill={s} />
    <rect x="26" y="58" width="12" height="4" fill={s} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* horn */}
    <rect x="28" y="6" width="8" height="12" fill={s} />
    <rect x="24" y="10" width="4" height="6" fill={s} />
    <rect x="36" y="10" width="4" height="6" fill={s} />
    {/* head */}
    <rect x="22" y="16" width="20" height="10" fill={s} />
    <rect x="20" y="18" width="24" height="6" fill={s} />
    {/* eyes */}
    <rect x="24" y="18" width="4" height="4" fill={B} />
    <rect x="36" y="18" width="4" height="4" fill={B} />
    {/* shell closed */}
    <rect x="10" y="24" width="44" height="28" fill={p} />
    <rect x="6" y="28" width="52" height="20" fill={p} />
    <rect x="14" y="26" width="20" height="8" fill={W} fillOpacity={0.3} />
    {/* center seam */}
    <rect x="30" y="24" width="4" height="28" fill={B} />
    {/* shell spots */}
    <rect x="16" y="36" width="4" height="4" fill={B} />
    <rect x="42" y="36" width="4" height="4" fill={B} />
    <rect x="18" y="44" width="3" height="3" fill={B} />
    <rect x="42" y="44" width="3" height="3" fill={B} />
    {/* legs */}
    <rect x="2" y="32" width="8" height="3" fill={B} />
    <rect x="2" y="40" width="8" height="3" fill={B} />
    <rect x="2" y="48" width="8" height="3" fill={B} />
    <rect x="54" y="32" width="8" height="3" fill={B} />
    <rect x="54" y="40" width="8" height="3" fill={B} />
    <rect x="54" y="48" width="8" height="3" fill={B} />
    {/* abdomen tip */}
    <rect x="26" y="52" width="12" height="8" fill={s} />
  </svg>
);

/* ─── CROCODILE ─── */
const crocodile: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* upper jaw */}
    <rect x="0" y="14" width="48" height="10" fill={p} />
    <rect x="4" y="10" width="40" height="6" fill={p} />
    {/* upper teeth */}
    <rect x="2" y="24" width="3" height="4" fill={W} />
    <rect x="8" y="24" width="3" height="5" fill={W} />
    <rect x="14" y="24" width="3" height="4" fill={W} />
    <rect x="20" y="24" width="3" height="5" fill={W} />
    <rect x="26" y="24" width="3" height="4" fill={W} />
    <rect x="32" y="24" width="3" height="5" fill={W} />
    <rect x="38" y="24" width="3" height="4" fill={W} />
    {/* mouth interior */}
    <rect x="2" y="28" width="42" height="6" fill={a} />
    {/* lower jaw */}
    <rect x="0" y="34" width="48" height="10" fill={p} />
    {/* lower teeth */}
    <rect x="4" y="32" width="3" height="4" fill={W} />
    <rect x="10" y="32" width="3" height="5" fill={W} />
    <rect x="16" y="32" width="3" height="4" fill={W} />
    <rect x="22" y="32" width="3" height="5" fill={W} />
    <rect x="28" y="32" width="3" height="4" fill={W} />
    <rect x="34" y="32" width="3" height="5" fill={W} />
    <rect x="40" y="32" width="3" height="4" fill={W} />
    {/* eyes on top */}
    <rect x="36" y="6" width="6" height="6" fill={s} />
    <rect x="44" y="6" width="6" height="6" fill={s} />
    <rect x="38" y="8" width="4" height="4" fill={a} />
    <rect x="46" y="8" width="4" height="4" fill={a} />
    <rect x="38" y="8" width="2" height="2" fill={B} />
    <rect x="46" y="8" width="2" height="2" fill={B} />
    {/* back body */}
    <rect x="44" y="36" width="20" height="14" fill={p} />
    {/* back scales */}
    <rect x="46" y="32" width="4" height="6" fill={s} />
    <rect x="52" y="30" width="4" height="8" fill={s} />
    <rect x="58" y="32" width="4" height="6" fill={s} />
    {/* legs */}
    <rect x="44" y="50" width="6" height="8" fill={p} />
    <rect x="56" y="50" width="6" height="8" fill={p} />
    <rect x="44" y="56" width="6" height="3" fill={B} />
    <rect x="56" y="56" width="6" height="3" fill={B} />
    {/* claws */}
    <rect x="42" y="56" width="2" height="3" fill={W} />
    <rect x="62" y="56" width="2" height="3" fill={W} />
    {/* tail */}
    <rect x="44" y="56" width="14" height="6" fill={p} />
    <rect x="40" y="60" width="14" height="4" fill={p} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* long snout closed */}
    <rect x="0" y="22" width="40" height="8" fill={p} />
    <rect x="4" y="18" width="32" height="6" fill={p} />
    {/* visible teeth */}
    <rect x="4" y="28" width="2" height="2" fill={W} />
    <rect x="10" y="28" width="2" height="2" fill={W} />
    <rect x="16" y="28" width="2" height="2" fill={W} />
    <rect x="22" y="28" width="2" height="2" fill={W} />
    <rect x="28" y="28" width="2" height="2" fill={W} />
    <rect x="34" y="28" width="2" height="2" fill={W} />
    {/* eyes on top */}
    <rect x="28" y="14" width="6" height="6" fill={s} />
    <rect x="36" y="14" width="6" height="6" fill={s} />
    <rect x="30" y="16" width="3" height="3" fill={B} />
    <rect x="38" y="16" width="3" height="3" fill={B} />
    {/* body */}
    <rect x="36" y="30" width="22" height="18" fill={p} />
    <rect x="32" y="34" width="30" height="12" fill={p} />
    {/* back scales */}
    <rect x="38" y="26" width="4" height="6" fill={s} />
    <rect x="46" y="24" width="4" height="8" fill={s} />
    <rect x="54" y="26" width="4" height="6" fill={s} />
    {/* legs */}
    <rect x="34" y="48" width="8" height="8" fill={p} />
    <rect x="50" y="48" width="8" height="8" fill={p} />
    <rect x="34" y="56" width="8" height="3" fill={s} />
    <rect x="50" y="56" width="8" height="3" fill={s} />
    {/* tail */}
    <rect x="40" y="52" width="18" height="6" fill={p} />
    <rect x="36" y="56" width="22" height="6" fill={p} />
    <rect x="34" y="60" width="18" height="4" fill={p} />
  </svg>
);

/* ─── DEMON ─── */
const demon: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* curved horns */}
    <rect x="8" y="2" width="6" height="10" fill={B} />
    <rect x="4" y="6" width="4" height="8" fill={B} />
    <rect x="50" y="2" width="6" height="10" fill={B} />
    <rect x="56" y="6" width="4" height="8" fill={B} />
    <rect x="2" y="10" width="6" height="6" fill={a} />
    <rect x="56" y="10" width="6" height="6" fill={a} />
    {/* head */}
    <rect x="14" y="10" width="36" height="28" fill={p} />
    <rect x="10" y="14" width="44" height="22" fill={p} />
    <rect x="16" y="12" width="20" height="6" fill={W} fillOpacity={0.15} />
    {/* glowing angry eyes */}
    <rect x="16" y="18" width="12" height="10" fill={a} />
    <rect x="36" y="18" width="12" height="10" fill={a} />
    <rect x="18" y="20" width="6" height="6" fill={W} />
    <rect x="38" y="20" width="6" height="6" fill={W} />
    <rect x="20" y="22" width="3" height="3" fill={a} />
    <rect x="40" y="22" width="3" height="3" fill={a} />
    {/* flame above eyes */}
    <rect x="14" y="14" width="4" height="4" fill={a} fillOpacity={0.7} />
    <rect x="46" y="14" width="4" height="4" fill={a} fillOpacity={0.7} />
    {/* fanged grin */}
    <rect x="18" y="30" width="28" height="6" fill={B} />
    <rect x="20" y="30" width="3" height="6" fill={W} />
    <rect x="26" y="30" width="3" height="5" fill={W} />
    <rect x="34" y="30" width="3" height="5" fill={W} />
    <rect x="41" y="30" width="3" height="6" fill={W} />
    {/* bat wings spread */}
    <rect x="0" y="32" width="14" height="20" fill={s} />
    <rect x="2" y="28" width="10" height="6" fill={s} />
    <rect x="50" y="32" width="14" height="20" fill={s} />
    <rect x="52" y="28" width="10" height="6" fill={s} />
    <rect x="0" y="50" width="4" height="6" fill={B} />
    <rect x="60" y="50" width="4" height="6" fill={B} />
    <rect x="4" y="36" width="2" height="14" fill={B} fillOpacity={0.3} />
    <rect x="58" y="36" width="2" height="14" fill={B} fillOpacity={0.3} />
    {/* body */}
    <rect x="20" y="38" width="24" height="18" fill={p} />
    <rect x="16" y="42" width="32" height="12" fill={p} />
    {/* claws */}
    <rect x="14" y="54" width="8" height="8" fill={p} />
    <rect x="42" y="54" width="8" height="8" fill={p} />
    <rect x="14" y="62" width="3" height="2" fill={B} />
    <rect x="18" y="62" width="3" height="2" fill={B} />
    <rect x="42" y="62" width="3" height="2" fill={B} />
    <rect x="46" y="62" width="3" height="2" fill={B} />
    {/* spaded tail */}
    <rect x="44" y="44" width="14" height="4" fill={p} />
    <rect x="54" y="40" width="8" height="6" fill={a} />
    <rect x="58" y="36" width="6" height="6" fill={a} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* horns */}
    <rect x="10" y="4" width="6" height="10" fill={B} />
    <rect x="6" y="8" width="4" height="6" fill={B} />
    <rect x="48" y="4" width="6" height="10" fill={B} />
    <rect x="54" y="8" width="4" height="6" fill={B} />
    {/* head */}
    <rect x="14" y="12" width="36" height="26" fill={p} />
    <rect x="10" y="16" width="44" height="20" fill={p} />
    <rect x="16" y="14" width="20" height="6" fill={W} fillOpacity={0.15} />
    {/* eyes */}
    <rect x="18" y="20" width="9" height="9" fill={a} />
    <rect x="37" y="20" width="9" height="9" fill={a} />
    <rect x="20" y="22" width="5" height="5" fill={W} />
    <rect x="39" y="22" width="5" height="5" fill={W} />
    <rect x="22" y="24" width="2" height="2" fill={B} />
    <rect x="41" y="24" width="2" height="2" fill={B} />
    {/* fanged mouth */}
    <rect x="22" y="32" width="20" height="4" fill={B} />
    <rect x="24" y="32" width="3" height="4" fill={W} />
    <rect x="37" y="32" width="3" height="4" fill={W} />
    {/* folded wings */}
    <rect x="4" y="34" width="12" height="18" fill={s} />
    <rect x="48" y="34" width="12" height="18" fill={s} />
    <rect x="2" y="40" width="4" height="10" fill={s} />
    <rect x="58" y="40" width="4" height="10" fill={s} />
    {/* body */}
    <rect x="20" y="38" width="24" height="18" fill={p} />
    <rect x="16" y="42" width="32" height="12" fill={p} />
    {/* legs */}
    <rect x="18" y="56" width="10" height="8" fill={p} />
    <rect x="36" y="56" width="10" height="8" fill={p} />
    {/* tail */}
    <rect x="44" y="46" width="12" height="4" fill={p} />
    <rect x="52" y="42" width="8" height="6" fill={a} />
  </svg>
);

/* ─── ANGEL ─── */
const angel: Renderer = ({ p, s, a }, sz, f) => f === "react" ? (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* halo radiant */}
    <rect x="22" y="2" width="20" height="4" fill={a} />
    <rect x="20" y="4" width="24" height="4" fill={a} />
    <rect x="22" y="0" width="4" height="2" fill={a} fillOpacity={0.7} />
    <rect x="38" y="0" width="4" height="2" fill={a} fillOpacity={0.7} />
    <rect x="18" y="6" width="2" height="4" fill={a} fillOpacity={0.7} />
    <rect x="44" y="6" width="2" height="4" fill={a} fillOpacity={0.7} />
    {/* spread wings */}
    <rect x="0" y="20" width="14" height="6" fill={W} />
    <rect x="0" y="26" width="16" height="6" fill={W} />
    <rect x="0" y="32" width="14" height="6" fill={W} />
    <rect x="2" y="14" width="10" height="6" fill={W} />
    <rect x="50" y="20" width="14" height="6" fill={W} />
    <rect x="48" y="26" width="16" height="6" fill={W} />
    <rect x="50" y="32" width="14" height="6" fill={W} />
    <rect x="52" y="14" width="10" height="6" fill={W} />
    {/* feather lines */}
    <rect x="2" y="22" width="10" height="2" fill={s} fillOpacity={0.4} />
    <rect x="2" y="28" width="12" height="2" fill={s} fillOpacity={0.4} />
    <rect x="2" y="34" width="10" height="2" fill={s} fillOpacity={0.4} />
    <rect x="52" y="22" width="10" height="2" fill={s} fillOpacity={0.4} />
    <rect x="50" y="28" width="12" height="2" fill={s} fillOpacity={0.4} />
    <rect x="52" y="34" width="10" height="2" fill={s} fillOpacity={0.4} />
    {/* head */}
    <rect x="20" y="12" width="24" height="22" fill={p} />
    <rect x="16" y="16" width="32" height="14" fill={p} />
    <rect x="22" y="14" width="14" height="6" fill={W} fillOpacity={0.3} />
    {/* gentle smiling eyes */}
    <rect x="22" y="20" width="6" height="3" fill={B} />
    <rect x="36" y="20" width="6" height="3" fill={B} />
    {/* blush */}
    <rect x="20" y="24" width="4" height="3" fill={a} fillOpacity={0.5} />
    <rect x="40" y="24" width="4" height="3" fill={a} fillOpacity={0.5} />
    {/* smile */}
    <rect x="28" y="26" width="8" height="2" fill={B} />
    <rect x="26" y="24" width="2" height="2" fill={B} />
    <rect x="36" y="24" width="2" height="2" fill={B} />
    {/* robe body */}
    <rect x="20" y="34" width="24" height="18" fill={s} />
    <rect x="16" y="38" width="32" height="14" fill={s} />
    <rect x="20" y="34" width="24" height="3" fill={a} />
    <rect x="18" y="48" width="28" height="3" fill={a} />
    {/* robe folds */}
    <rect x="24" y="38" width="2" height="14" fill={W} fillOpacity={0.3} />
    <rect x="32" y="38" width="2" height="14" fill={W} fillOpacity={0.3} />
    <rect x="40" y="38" width="2" height="14" fill={W} fillOpacity={0.3} />
    {/* feet */}
    <rect x="22" y="52" width="8" height="8" fill={W} />
    <rect x="34" y="52" width="8" height="8" fill={W} />
    {/* aura sparkles */}
    <rect x="14" y="44" width="3" height="3" fill={a} fillOpacity={0.8} />
    <rect x="47" y="44" width="3" height="3" fill={a} fillOpacity={0.8} />
    <rect x="10" y="54" width="3" height="3" fill={W} />
    <rect x="51" y="54" width="3" height="3" fill={W} />
  </svg>
) : (
  <svg width={sz} height={sz} viewBox="0 0 64 64" style={{ imageRendering: "pixelated" }}>
    {/* halo */}
    <rect x="22" y="4" width="20" height="4" fill={a} />
    <rect x="20" y="6" width="24" height="2" fill={a} />
    {/* folded wings */}
    <rect x="6" y="22" width="12" height="20" fill={W} />
    <rect x="46" y="22" width="12" height="20" fill={W} />
    <rect x="4" y="28" width="6" height="10" fill={W} />
    <rect x="54" y="28" width="6" height="10" fill={W} />
    <rect x="8" y="26" width="8" height="2" fill={s} fillOpacity={0.4} />
    <rect x="8" y="32" width="8" height="2" fill={s} fillOpacity={0.4} />
    <rect x="48" y="26" width="8" height="2" fill={s} fillOpacity={0.4} />
    <rect x="48" y="32" width="8" height="2" fill={s} fillOpacity={0.4} />
    {/* head */}
    <rect x="20" y="14" width="24" height="22" fill={p} />
    <rect x="16" y="18" width="32" height="14" fill={p} />
    <rect x="22" y="16" width="14" height="6" fill={W} fillOpacity={0.3} />
    {/* eyes */}
    <rect x="22" y="22" width="6" height="6" fill={B} />
    <rect x="36" y="22" width="6" height="6" fill={B} />
    <rect x="22" y="22" width="3" height="3" fill={W} />
    <rect x="36" y="22" width="3" height="3" fill={W} />
    {/* mouth */}
    <rect x="28" y="30" width="8" height="2" fill={B} />
    {/* robe */}
    <rect x="20" y="36" width="24" height="20" fill={s} />
    <rect x="16" y="40" width="32" height="16" fill={s} />
    <rect x="20" y="36" width="24" height="3" fill={a} />
    <rect x="18" y="52" width="28" height="3" fill={a} />
    <rect x="26" y="40" width="2" height="14" fill={W} fillOpacity={0.3} />
    <rect x="36" y="40" width="2" height="14" fill={W} fillOpacity={0.3} />
    {/* feet */}
    <rect x="22" y="56" width="8" height="8" fill={W} />
    <rect x="34" y="56" width="8" height="8" fill={W} />
  </svg>
);

/* ─── Effect System ────────────────────────────────────────────────────────────
 * ViewBox: 0 0 192 128  — character occupies [64,32]→[128,96] at center.
 * Wings extend left to x=0, right to x=192; above to y=0, below to y=128.
 * Each rarity has a back layer (wings/aura behind char) and front layer (halos/particles).
 */

type Eff = (c: Colors) => ReactElement;

/** Rarity effect wrapper — back eff → character → front eff, overflow:visible */
const vEff = (base: Renderer, back: Eff, front: Eff): Renderer =>
  (c, sz, f) => (
    <div style={{ position: "relative", width: sz, height: sz, display: "inline-block", overflow: "visible" }}>
      {back(c)}
      {base(c, sz, f)}
      {front(c)}
    </div>
  );

const EFF_STYLE = {
  position: "absolute" as const, left: "-100%", top: "-50%",
  width: "300%", height: "200%",
  imageRendering: "pixelated" as const, pointerEvents: "none" as const,
};

const NONE: Eff = () => <></>;

/* ─────────────────────────────────────────────────────────────────────────
   EFFECT SYSTEM
   ─ uncommon : 요정 반짝이 (날개 없음)
   ─ rare     : 수정 어깨 장식 (날개 없음)
   ─ epic     : 악마 뿔 + 화염 어깨 (날개 없음)
   ─ legendary: 얇은 황금 날개
   ─ mythic   : 신성한 천사 날개 (3단)
   ───────────────────────────────────────────────────────────────────────── */

/* ── UNCOMMON: Fairy Sparkle Ring (날개 없음) ──────────────────────────── */
const EFF_UNC_BACK: Eff = ({ a }) => (
  <svg width="300%" height="200%" viewBox="0 0 192 128" style={EFF_STYLE}>
    <style>{`@keyframes kebo-sp{0%,100%{opacity:.08;transform:scale(.8)}50%{opacity:.92;transform:scale(1.25)}}`}</style>
    <ellipse cx="96" cy="104" rx="22" ry="5" fill={a} fillOpacity="0.18"/>
    {/* 8 cross sparkles in ring (radius ~30 from char center 96,64) */}
    {([
      [93,27,0],[113,37,.25],[122,61,.5],[113,84,.75],
      [93,91,1],[73,84,1.25],[64,61,1.5],[73,37,1.75]
    ] as [number,number,number][]).map(([x,y,d])=>(
      <g key={`sp-${x}-${y}`} style={{animation:`kebo-sp 2s ease-in-out ${d}s infinite`}}>
        <rect x={x+1} y={y}   width="4" height="10" fill={a}/>
        <rect x={x-1} y={y+3} width="8" height="4"  fill={a}/>
        <rect x={x+2} y={y+1} width="2" height="3"  fill="#fff" fillOpacity="0.75"/>
      </g>
    ))}
  </svg>
);

/* ── RARE: Crystal Shoulder Guards (수정 어깨 장식, 날개 없음) ─────────── */
const EFF_RARE_BACK: Eff = ({ p, a }) => (
  <svg width="300%" height="200%" viewBox="0 0 192 128" style={EFF_STYLE}>
    {/* frost foot glow */}
    <ellipse cx="96" cy="103" rx="26" ry="6" fill={a} fillOpacity="0.2"/>
    <ellipse cx="96" cy="103" rx="14" ry="3" fill="#fff" fillOpacity="0.15"/>
    {/* ── left shoulder crystal cluster ── */}
    {/* spine */}
    <rect x="54" y="22" width="4" height="32" fill={p}/>
    <rect x="55" y="22" width="2" height="32" fill="#fff" fillOpacity="0.45"/>
    {/* main spike (5 rows, widens downward) */}
    <rect x="52" y="22" width="8"  height="5" fill="#bfdbfe"/>
    <rect x="52" y="22" width="8"  height="2" fill="#fff" fillOpacity="0.8"/>
    <rect x="50" y="27" width="12" height="5" fill="#93c5fd"/>
    <rect x="50" y="27" width="12" height="2" fill="#fff" fillOpacity="0.55"/>
    <rect x="47" y="32" width="18" height="5" fill="#60a5fa"/>
    <rect x="47" y="32" width="18" height="2" fill="#93c5fd" fillOpacity="0.6"/>
    <rect x="44" y="37" width="22" height="5" fill={a}/>
    <rect x="44" y="37" width="22" height="2" fill="#60a5fa" fillOpacity="0.5"/>
    <rect x="42" y="42" width="24" height="5" fill={a}/>
    {/* side sub-spike (angled left) */}
    <rect x="40" y="30" width="6"  height="3" fill="#bfdbfe"/>
    <rect x="38" y="33" width="10" height="4" fill="#93c5fd"/>
    <rect x="36" y="37" width="10" height="4" fill={a}/>
    <rect x="36" y="41" width="10" height="4" fill={a} fillOpacity="0.7"/>
    {/* separator line */}
    <rect x="42" y="46" width="24" height="2" fill={p} fillOpacity="0.8"/>
    {/* ── right shoulder crystal cluster (mirror x=192-56=136 center) ── */}
    <rect x="134" y="22" width="4" height="32" fill={p}/>
    <rect x="135" y="22" width="2" height="32" fill="#fff" fillOpacity="0.45"/>
    <rect x="132" y="22" width="8"  height="5" fill="#bfdbfe"/>
    <rect x="132" y="22" width="8"  height="2" fill="#fff" fillOpacity="0.8"/>
    <rect x="130" y="27" width="12" height="5" fill="#93c5fd"/>
    <rect x="130" y="27" width="12" height="2" fill="#fff" fillOpacity="0.55"/>
    <rect x="127" y="32" width="18" height="5" fill="#60a5fa"/>
    <rect x="127" y="32" width="18" height="2" fill="#93c5fd" fillOpacity="0.6"/>
    <rect x="126" y="37" width="22" height="5" fill={a}/>
    <rect x="126" y="37" width="22" height="2" fill="#60a5fa" fillOpacity="0.5"/>
    <rect x="126" y="42" width="24" height="5" fill={a}/>
    <rect x="146" y="30" width="6"  height="3" fill="#bfdbfe"/>
    <rect x="144" y="33" width="10" height="4" fill="#93c5fd"/>
    <rect x="146" y="37" width="10" height="4" fill={a}/>
    <rect x="146" y="41" width="10" height="4" fill={a} fillOpacity="0.7"/>
    <rect x="126" y="46" width="24" height="2" fill={p} fillOpacity="0.8"/>
  </svg>
);
const EFF_RARE_FRONT: Eff = ({ a }) => (
  <svg width="300%" height="200%" viewBox="0 0 192 128" style={EFF_STYLE}>
    <style>{`@keyframes kebo-rise{0%{opacity:.9;transform:translateY(0)}100%{opacity:0;transform:translateY(-22px)}}`}</style>
    {/* diamond gem above head */}
    <rect x="89" y="8"  width="14" height="14" fill={a} fillOpacity="0.92"/>
    <rect x="89" y="8"  width="14" height="5"  fill="#fff" fillOpacity="0.65"/>
    <rect x="91" y="4"  width="10" height="6"  fill={a} fillOpacity="0.85"/>
    <rect x="93" y="2"  width="6"  height="4"  fill="#bfdbfe"/>
    <rect x="94" y="3"  width="4"  height="2"  fill="#fff" fillOpacity="0.9"/>
    {/* 5 rising ice shards */}
    {([
      [74,34,1.9,0],[84,26,1.7,.3],[96,22,2,.6],[108,26,1.8,.9],[118,34,1.9,1.2]
    ] as [number,number,number,number][]).map(([x,y,dur,d])=>(
      <g key={`rs-${x}`} style={{animation:`kebo-rise ${dur}s linear ${d}s infinite`}}>
        <rect x={x}   y={y}   width="6" height="12" fill={a}/>
        <rect x={x+1} y={y}   width="4" height="4"  fill="#fff" fillOpacity="0.6"/>
      </g>
    ))}
  </svg>
);

/* ── EPIC: Demon Horns + Flame Shoulders (악마 뿔, 날개 없음) ──────────── */
const EFF_EPIC_BACK: Eff = ({ p, a }) => (
  <svg width="300%" height="200%" viewBox="0 0 192 128" style={EFF_STYLE}>
    <style>{`@keyframes kebo-aura{0%,100%{opacity:.25}50%{opacity:.65}}`}</style>
    {/* ground dark aura */}
    <ellipse cx="96" cy="103" rx="44" ry="10" fill={p} style={{animation:"kebo-aura 2.4s ease-in-out infinite"}}/>
    <ellipse cx="96" cy="103" rx="28" ry="6"  fill={a} fillOpacity="0.2" style={{animation:"kebo-aura 2.4s ease-in-out .7s infinite"}}/>
    {/* ── left flame shoulder ── */}
    {/* outer dark flame */}
    <rect x="50" y="26" width="6"  height="4" fill={p} fillOpacity="0.7"/>
    <rect x="48" y="30" width="10" height="4" fill={p} fillOpacity="0.78"/>
    <rect x="46" y="34" width="14" height="4" fill={p} fillOpacity="0.85"/>
    <rect x="44" y="38" width="18" height="4" fill={p} fillOpacity="0.9"/>
    <rect x="42" y="42" width="22" height="4" fill={p} fillOpacity="0.95"/>
    <rect x="40" y="46" width="24" height="4" fill={p} fillOpacity="0.97"/>
    <rect x="40" y="50" width="24" height="5" fill={p}/>
    {/* inner bright flame */}
    <rect x="52" y="28" width="4"  height="4" fill={a} fillOpacity="0.8"/>
    <rect x="50" y="32" width="8"  height="4" fill={a} fillOpacity="0.85"/>
    <rect x="48" y="36" width="12" height="4" fill={a} fillOpacity="0.9"/>
    <rect x="46" y="40" width="14" height="4" fill={a} fillOpacity="0.92"/>
    <rect x="44" y="44" width="16" height="4" fill={a} fillOpacity="0.88"/>
    {/* flame tip glow */}
    <rect x="53" y="26" width="2" height="3" fill="#fff" fillOpacity="0.7"/>
    {/* ── right flame shoulder (mirror) ── */}
    <rect x="136" y="26" width="6"  height="4" fill={p} fillOpacity="0.7"/>
    <rect x="134" y="30" width="10" height="4" fill={p} fillOpacity="0.78"/>
    <rect x="132" y="34" width="14" height="4" fill={p} fillOpacity="0.85"/>
    <rect x="128" y="38" width="20" height="4" fill={p} fillOpacity="0.9"/>
    <rect x="128" y="42" width="22" height="4" fill={p} fillOpacity="0.95"/>
    <rect x="128" y="46" width="24" height="4" fill={p} fillOpacity="0.97"/>
    <rect x="128" y="50" width="24" height="5" fill={p}/>
    <rect x="136" y="28" width="4"  height="4" fill={a} fillOpacity="0.8"/>
    <rect x="134" y="32" width="8"  height="4" fill={a} fillOpacity="0.85"/>
    <rect x="132" y="36" width="12" height="4" fill={a} fillOpacity="0.9"/>
    <rect x="130" y="40" width="14" height="4" fill={a} fillOpacity="0.92"/>
    <rect x="130" y="44" width="14" height="4" fill={a} fillOpacity="0.88"/>
    <rect x="137" y="26" width="2" height="3" fill="#fff" fillOpacity="0.7"/>
  </svg>
);
const EFF_EPIC_FRONT: Eff = ({ p, a }) => (
  <svg width="300%" height="200%" viewBox="0 0 192 128" style={EFF_STYLE}>
    <style>{`@keyframes kebo-orb{0%,100%{opacity:.18;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    {/* ── left horn ── */}
    <rect x="81" y="12" width="4"  height="4" fill="#e9d5ff"/>
    <rect x="81" y="12" width="4"  height="2" fill="#fff" fillOpacity="0.8"/>
    <rect x="80" y="16" width="6"  height="4" fill={a}/>
    <rect x="80" y="16" width="6"  height="2" fill="#fff" fillOpacity="0.5"/>
    <rect x="79" y="20" width="8"  height="4" fill={a}/>
    <rect x="78" y="24" width="10" height="4" fill={p}/>
    <rect x="78" y="28" width="10" height="4" fill={p}/>
    <rect x="78" y="32" width="10" height="4" fill={p}/>
    {/* horn inner glow */}
    <rect x="82" y="13" width="2" height="3" fill="#fff" fillOpacity="0.9"/>
    {/* ── right horn ── */}
    <rect x="107" y="12" width="4"  height="4" fill="#e9d5ff"/>
    <rect x="107" y="12" width="4"  height="2" fill="#fff" fillOpacity="0.8"/>
    <rect x="106" y="16" width="6"  height="4" fill={a}/>
    <rect x="106" y="16" width="6"  height="2" fill="#fff" fillOpacity="0.5"/>
    <rect x="105" y="20" width="8"  height="4" fill={a}/>
    <rect x="104" y="24" width="10" height="4" fill={p}/>
    <rect x="104" y="28" width="10" height="4" fill={p}/>
    <rect x="104" y="32" width="10" height="4" fill={p}/>
    <rect x="109" y="13" width="2" height="3" fill="#fff" fillOpacity="0.9"/>
    {/* 4 orbiting dark orbs */}
    {([
      [68,28,0],[116,28,.4],[68,88,.8],[116,88,1.2]
    ] as [number,number,number][]).map(([x,y,d])=>(
      <g key={`orb-${x}-${y}`} style={{animation:`kebo-orb 1.8s ease-in-out ${d}s infinite`}}>
        <rect x={x}   y={y}   width="10" height="10" fill={p}/>
        <rect x={x+1} y={y+1} width="5"  height="4"  fill={a} fillOpacity="0.6"/>
        <rect x={x+2} y={y+2} width="3"  height="2"  fill="#fff" fillOpacity="0.3"/>
      </g>
    ))}
  </svg>
);

/* ── LEGENDARY: Darkness Aura Wings (다크니스 아우라) ───────────────────── */
const EFF_LEG_BACK: Eff = ({ a }) => {
  const D1="#0d0520", D2="#2d1b69", D3="#4c1d95", HL="#a78bfa";
  return (
  <svg width="300%" height="200%" viewBox="0 0 192 128" style={EFF_STYLE}>
    <style>{`@keyframes kebo-daura{0%,100%{opacity:.3}50%{opacity:.72}}`}</style>
    {/* dark ground aura */}
    <ellipse cx="96" cy="103" rx="54" ry="12" fill={D3} style={{animation:"kebo-daura 2.8s ease-in-out infinite"}}/>
    <ellipse cx="96" cy="103" rx="38" ry="8"  fill={D2} style={{animation:"kebo-daura 2.8s ease-in-out .7s infinite"}}/>
    <ellipse cx="96" cy="103" rx="20" ry="4"  fill={a} fillOpacity="0.35"/>
    {/* ── left wing — 11 rows × 4px, dark feather ── */}
    <rect x="46" y="16" width="18" height="4" fill={D3} fillOpacity="0.9"/>
    <rect x="46" y="16" width="18" height="2" fill={HL} fillOpacity="0.65"/>
    <rect x="34" y="20" width="30" height="4" fill={D3}/>
    <rect x="34" y="20" width="30" height="2" fill={HL} fillOpacity="0.6"/>
    <rect x="20" y="24" width="44" height="4" fill={D2}/>
    <rect x="20" y="24" width="44" height="2" fill={HL} fillOpacity="0.55"/>
    <rect x="10" y="28" width="54" height="4" fill={D2}/>
    <rect x="10" y="28" width="54" height="2" fill={a} fillOpacity="0.5"/>
    <rect x="4"  y="32" width="60" height="4" fill={D2}/>
    <rect x="4"  y="32" width="60" height="2" fill={a} fillOpacity="0.55"/>
    <rect x="2"  y="36" width="62" height="4" fill={D1}/>
    <rect x="2"  y="36" width="62" height="2" fill={a} fillOpacity="0.65"/>
    <rect x="2"  y="40" width="62" height="4" fill={D1}/>
    <rect x="2"  y="40" width="62" height="2" fill={a} fillOpacity="0.6"/>
    <rect x="6"  y="44" width="58" height="4" fill={D2}/>
    <rect x="6"  y="44" width="58" height="2" fill={a} fillOpacity="0.5"/>
    <rect x="14" y="48" width="50" height="4" fill={D2}/>
    <rect x="14" y="48" width="50" height="2" fill={HL} fillOpacity="0.45"/>
    <rect x="26" y="52" width="38" height="4" fill={D3}/>
    <rect x="26" y="52" width="38" height="2" fill={HL} fillOpacity="0.38"/>
    <rect x="40" y="56" width="24" height="4" fill={D3} fillOpacity="0.85"/>
    <rect x="40" y="56" width="24" height="2" fill={HL} fillOpacity="0.32"/>
    {/* feather tip knobs on leading edge */}
    <rect x="2" y="32" width="5" height="5" fill={a} fillOpacity="0.65"/>
    <rect x="2" y="38" width="5" height="5" fill={a} fillOpacity="0.75"/>
    <rect x="2" y="44" width="5" height="5" fill={a} fillOpacity="0.65"/>
    {/* spine */}
    <rect x="58" y="14" width="8" height="48" fill={D1}/>
    <rect x="60" y="14" width="3" height="48" fill={a} fillOpacity="0.45"/>
    <rect x="61" y="14" width="1" height="48" fill={HL} fillOpacity="0.25"/>
    {/* ── right wing (mirror) ── */}
    <rect x="128" y="16" width="18" height="4" fill={D3} fillOpacity="0.9"/>
    <rect x="128" y="16" width="18" height="2" fill={HL} fillOpacity="0.65"/>
    <rect x="128" y="20" width="30" height="4" fill={D3}/>
    <rect x="128" y="20" width="30" height="2" fill={HL} fillOpacity="0.6"/>
    <rect x="128" y="24" width="44" height="4" fill={D2}/>
    <rect x="128" y="24" width="44" height="2" fill={HL} fillOpacity="0.55"/>
    <rect x="128" y="28" width="54" height="4" fill={D2}/>
    <rect x="128" y="28" width="54" height="2" fill={a} fillOpacity="0.5"/>
    <rect x="128" y="32" width="60" height="4" fill={D2}/>
    <rect x="128" y="32" width="60" height="2" fill={a} fillOpacity="0.55"/>
    <rect x="128" y="36" width="62" height="4" fill={D1}/>
    <rect x="128" y="36" width="62" height="2" fill={a} fillOpacity="0.65"/>
    <rect x="128" y="40" width="62" height="4" fill={D1}/>
    <rect x="128" y="40" width="62" height="2" fill={a} fillOpacity="0.6"/>
    <rect x="128" y="44" width="58" height="4" fill={D2}/>
    <rect x="128" y="44" width="58" height="2" fill={a} fillOpacity="0.5"/>
    <rect x="128" y="48" width="50" height="4" fill={D2}/>
    <rect x="128" y="48" width="50" height="2" fill={HL} fillOpacity="0.45"/>
    <rect x="128" y="52" width="38" height="4" fill={D3}/>
    <rect x="128" y="52" width="38" height="2" fill={HL} fillOpacity="0.38"/>
    <rect x="128" y="56" width="24" height="4" fill={D3} fillOpacity="0.85"/>
    <rect x="128" y="56" width="24" height="2" fill={HL} fillOpacity="0.32"/>
    <rect x="185" y="32" width="5" height="5" fill={a} fillOpacity="0.65"/>
    <rect x="185" y="38" width="5" height="5" fill={a} fillOpacity="0.75"/>
    <rect x="185" y="44" width="5" height="5" fill={a} fillOpacity="0.65"/>
    <rect x="126" y="14" width="8" height="48" fill={D1}/>
    <rect x="129" y="14" width="3" height="48" fill={a} fillOpacity="0.45"/>
    <rect x="130" y="14" width="1" height="48" fill={HL} fillOpacity="0.25"/>
  </svg>
  );
};
const EFF_LEG_FRONT: Eff = ({ a }) => (
  <svg width="300%" height="200%" viewBox="0 0 192 128" style={EFF_STYLE}>
    <style>{`@keyframes kebo-gold{0%{opacity:.95;transform:translateY(0)}100%{opacity:0;transform:translateY(26px)}}`}</style>
    {/* halo ring */}
    <rect x="72" y="8"  width="48" height="7"  fill={a} fillOpacity="0.8"/>
    <rect x="68" y="11" width="6"  height="8"  fill={a} fillOpacity="0.75"/>
    <rect x="118" y="11" width="6" height="8"  fill={a} fillOpacity="0.75"/>
    <rect x="72" y="17" width="48" height="5"  fill={a} fillOpacity="0.6"/>
    <rect x="76" y="9"  width="40" height="4"  fill="#fff" fillOpacity="0.65"/>
    <rect x="76" y="9"  width="40" height="2"  fill="#fff" fillOpacity="0.4"/>
    {/* 10 falling gold sparkles */}
    {([
      [64,14,1.4,0],[74,8,1.6,.15],[84,4,1.5,.3],[94,2,1.8,.08],
      [104,4,1.5,.22],[112,8,1.6,.38],[122,14,1.4,.52],
      [76,10,1.3,.65],[96,6,1.7,.45],[118,10,1.5,.28]
    ] as [number,number,number,number][]).map(([x,y,dur,d], i)=>(
      <g key={`gld-${i}`} style={{animation:`kebo-gold ${dur}s linear ${d}s infinite`}}>
        <rect x={x}   y={y}   width="6" height="8" fill={a}/>
        <rect x={x+1} y={y}   width="4" height="3" fill="#fff" fillOpacity="0.6"/>
      </g>
    ))}
  </svg>
);

/* ── MYTHIC: 사슴날개 (강한 중앙 광원 + 상단 곡선 날개) ─────────────────── */
const EFF_MYT_BACK: Eff = ({ p, a }) => (
  <svg width="300%" height="200%" viewBox="0 0 192 128" style={EFF_STYLE}>
    <style>{`@keyframes kebo-burst{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.55;transform:scale(1.12)}}@keyframes kebo-glow{0%,100%{opacity:.35}50%{opacity:.9}}`}</style>
    {/* ── 강한 중앙 방사형 광원 ── */}
    <ellipse cx="96" cy="64" rx="70" ry="38" fill={a} style={{animation:"kebo-burst 3s ease-in-out infinite"}} fillOpacity="0.18"/>
    <ellipse cx="96" cy="64" rx="46" ry="24" fill={a} style={{animation:"kebo-burst 3s ease-in-out .5s infinite"}} fillOpacity="0.22"/>
    <ellipse cx="96" cy="64" rx="24" ry="14" fill="#fff" style={{animation:"kebo-glow 2.5s ease-in-out infinite"}} fillOpacity="0.35"/>
    <ellipse cx="96" cy="64" rx="10" ry="6"  fill="#fff" fillOpacity="0.7"/>
    {/* ground bloom */}
    <ellipse cx="96" cy="104" rx="50" ry="10" fill={a}   fillOpacity="0.28"/>
    <ellipse cx="96" cy="104" rx="28" ry="6"  fill="#fff" fillOpacity="0.2"/>
    <ellipse cx="96" cy="104" rx="12" ry="3"  fill="#fff" fillOpacity="0.45"/>
    {/* ── 왼쪽 날개: 상단 아치형 (9행 × 4px) ── */}
    {/* 날개 본체 — 상단부터 아래로 fan-out */}
    <rect x="50" y="8"  width="14" height="4" fill={p} fillOpacity="0.92"/>
    <rect x="50" y="8"  width="14" height="2" fill={a} fillOpacity="0.8"/>
    <rect x="38" y="12" width="26" height="4" fill={p} fillOpacity="0.94"/>
    <rect x="38" y="12" width="26" height="2" fill={a} fillOpacity="0.75"/>
    <rect x="24" y="16" width="40" height="4" fill={p} fillOpacity="0.96"/>
    <rect x="24" y="16" width="40" height="2" fill={a} fillOpacity="0.7"/>
    <rect x="12" y="20" width="52" height="4" fill={p} fillOpacity="0.97"/>
    <rect x="12" y="20" width="52" height="2" fill={a} fillOpacity="0.65"/>
    <rect x="4"  y="24" width="60" height="4" fill={p} fillOpacity="0.98"/>
    <rect x="4"  y="24" width="60" height="2" fill={a} fillOpacity="0.6"/>
    <rect x="2"  y="28" width="62" height="4" fill={p} fillOpacity="0.97"/>
    <rect x="2"  y="28" width="62" height="2" fill={a} fillOpacity="0.55"/>
    <rect x="2"  y="32" width="62" height="4" fill={p} fillOpacity="0.95"/>
    <rect x="6"  y="36" width="58" height="4" fill={p} fillOpacity="0.88"/>
    <rect x="6"  y="36" width="58" height="2" fill={a} fillOpacity="0.42"/>
    <rect x="14" y="40" width="50" height="4" fill={p} fillOpacity="0.78"/>
    <rect x="14" y="40" width="50" height="2" fill={a} fillOpacity="0.35"/>
    {/* 날개 하단 소형 */}
    <rect x="24" y="50" width="40" height="3" fill={p} fillOpacity="0.65"/>
    <rect x="24" y="50" width="40" height="1" fill={a} fillOpacity="0.5"/>
    <rect x="36" y="54" width="28" height="3" fill={p} fillOpacity="0.45"/>
    {/* 테두리 광선 (leading edge) */}
    <rect x="2"  y="24" width="6" height="6" fill={a} fillOpacity="0.8"/>
    <rect x="2"  y="30" width="6" height="6" fill={a} fillOpacity="0.88"/>
    <rect x="2"  y="36" width="6" height="6" fill={a} fillOpacity="0.75"/>
    {/* 상단 팁 포인트 장식 */}
    <rect x="52" y="4"  width="6" height="6" fill={a} fillOpacity="0.9"/>
    <rect x="53" y="2"  width="4" height="4" fill="#fff" fillOpacity="0.7"/>
    <rect x="40" y="6"  width="4" height="4" fill={a} fillOpacity="0.75"/>
    <rect x="30" y="9"  width="4" height="4" fill={a} fillOpacity="0.6"/>
    {/* spine */}
    <rect x="58" y="6"  width="8" height="48" fill={p}/>
    <rect x="60" y="6"  width="3" height="48" fill={a} fillOpacity="0.5"/>
    <rect x="61" y="6"  width="1" height="48" fill="#fff" fillOpacity="0.4"/>
    {/* ── 오른쪽 날개 (mirror) ── */}
    <rect x="128" y="8"  width="14" height="4" fill={p} fillOpacity="0.92"/>
    <rect x="128" y="8"  width="14" height="2" fill={a} fillOpacity="0.8"/>
    <rect x="128" y="12" width="26" height="4" fill={p} fillOpacity="0.94"/>
    <rect x="128" y="12" width="26" height="2" fill={a} fillOpacity="0.75"/>
    <rect x="128" y="16" width="40" height="4" fill={p} fillOpacity="0.96"/>
    <rect x="128" y="16" width="40" height="2" fill={a} fillOpacity="0.7"/>
    <rect x="128" y="20" width="52" height="4" fill={p} fillOpacity="0.97"/>
    <rect x="128" y="20" width="52" height="2" fill={a} fillOpacity="0.65"/>
    <rect x="128" y="24" width="60" height="4" fill={p} fillOpacity="0.98"/>
    <rect x="128" y="24" width="60" height="2" fill={a} fillOpacity="0.6"/>
    <rect x="128" y="28" width="62" height="4" fill={p} fillOpacity="0.97"/>
    <rect x="128" y="28" width="62" height="2" fill={a} fillOpacity="0.55"/>
    <rect x="128" y="32" width="62" height="4" fill={p} fillOpacity="0.95"/>
    <rect x="128" y="36" width="58" height="4" fill={p} fillOpacity="0.88"/>
    <rect x="128" y="36" width="58" height="2" fill={a} fillOpacity="0.42"/>
    <rect x="128" y="40" width="50" height="4" fill={p} fillOpacity="0.78"/>
    <rect x="128" y="40" width="50" height="2" fill={a} fillOpacity="0.35"/>
    <rect x="128" y="50" width="40" height="3" fill={p} fillOpacity="0.65"/>
    <rect x="128" y="50" width="40" height="1" fill={a} fillOpacity="0.5"/>
    <rect x="128" y="54" width="28" height="3" fill={p} fillOpacity="0.45"/>
    <rect x="184" y="24" width="6" height="6" fill={a} fillOpacity="0.8"/>
    <rect x="184" y="30" width="6" height="6" fill={a} fillOpacity="0.88"/>
    <rect x="184" y="36" width="6" height="6" fill={a} fillOpacity="0.75"/>
    <rect x="134" y="4"  width="6" height="6" fill={a} fillOpacity="0.9"/>
    <rect x="135" y="2"  width="4" height="4" fill="#fff" fillOpacity="0.7"/>
    <rect x="148" y="6"  width="4" height="4" fill={a} fillOpacity="0.75"/>
    <rect x="158" y="9"  width="4" height="4" fill={a} fillOpacity="0.6"/>
    <rect x="126" y="6"  width="8" height="48" fill={p}/>
    <rect x="129" y="6"  width="3" height="48" fill={a} fillOpacity="0.5"/>
    <rect x="130" y="6"  width="1" height="48" fill="#fff" fillOpacity="0.4"/>
  </svg>
);
const EFF_MYT_FRONT: Eff = ({ a }) => (
  <svg width="300%" height="200%" viewBox="0 0 192 128" style={EFF_STYLE}>
    <style>{`@keyframes kebo-holy{0%{opacity:0;transform:scale(0.6)}50%{opacity:1;transform:scale(1.1)}100%{opacity:0;transform:scale(0.8)}}@keyframes kebo-spark{0%{opacity:0;transform:translateY(0) scale(1)}50%{opacity:1}100%{opacity:0;transform:translateY(-18px) scale(0.5)}}`}</style>
    {/* 중앙 십자 빛 광선 */}
    <rect x="93" y="20" width="6" height="88" fill="#fff" fillOpacity="0.12"/>
    <rect x="20" y="61" width="152" height="6" fill="#fff" fillOpacity="0.12"/>
    <rect x="94" y="30" width="4" height="68" fill={a} fillOpacity="0.18"/>
    {/* 중앙 코어 밝은 크로스 */}
    <rect x="88" y="58" width="16" height="16" fill="#fff" fillOpacity="0.6"/>
    <rect x="90" y="56" width="12" height="20" fill="#fff" fillOpacity="0.5"/>
    <rect x="86" y="60" width="20" height="8"  fill="#fff" fillOpacity="0.5"/>
    <rect x="92" y="59" width="8"  height="10" fill="#fff" fillOpacity="0.9"/>
    <rect x="93" y="60" width="6"  height="8"  fill="#fff"/>
    {/* 12개 방사형 파티클 */}
    {([
      [70,28,0],[82,20,1.1],[96,16,.9],[110,20,1.3],[122,28,.7],
      [130,44,.4],[130,62,1.5],[122,78,.6],[110,86,1.2],
      [82,86,.8],[70,78,1.4],[62,62,.5]
    ] as [number,number,number][]).map(([x,y,d], i)=>(
      <g key={`mk-${i}`} style={{animation:`kebo-holy 1.4s ease-in-out ${d}s infinite`}}>
        <rect x={x}   y={y}   width="6" height="6" fill={a}/>
        <rect x={x+1} y={y+1} width="4" height="4" fill="#fff" fillOpacity="0.7"/>
      </g>
    ))}
    {/* 상승 반짝이 파티클 */}
    {([
      [76,48,1.5,0],[88,40,1.3,.3],[96,36,1.6,.6],[104,40,1.4,.9],[116,48,1.5,1.2]
    ] as [number,number,number,number][]).map(([x,y,dur,d],i)=>(
      <g key={`sk-${i}`} style={{animation:`kebo-spark ${dur}s linear ${d}s infinite`}}>
        <rect x={x}   y={y}   width="4" height="6" fill={a}/>
        <rect x={x+1} y={y}   width="2" height="3" fill="#fff" fillOpacity="0.8"/>
      </g>
    ))}
  </svg>
);

/* ─── Rarity-based sprite map ─── */
type RaritySprites = Record<CharacterRarity, Renderer>;

const makeRaritySprites = (base: Renderer): RaritySprites => ({
  common:    base,
  uncommon:  vEff(base, EFF_UNC_BACK,  NONE),
  rare:      vEff(base, EFF_RARE_BACK,  EFF_RARE_FRONT),
  epic:      vEff(base, EFF_EPIC_BACK,  EFF_EPIC_FRONT),
  legendary: vEff(base, EFF_LEG_BACK,   EFF_LEG_FRONT),
  mythic:    vEff(base, EFF_MYT_BACK,   EFF_MYT_FRONT),
});


const SPRITES: Record<CharacterType, RaritySprites> = {
  slime: makeRaritySprites(slime), cat: makeRaritySprites(cat), rabbit: makeRaritySprites(rabbit),
  ghost: makeRaritySprites(ghost), plant: makeRaritySprites(plant), fish: makeRaritySprites(fish),
  owl: makeRaritySprites(owl), bear: makeRaritySprites(bear), turtle: makeRaritySprites(turtle),
  fox: makeRaritySprites(fox), wolf: makeRaritySprites(wolf), robot: makeRaritySprites(robot),
  dragon: makeRaritySprites(dragon), phoenix: makeRaritySprites(phoenix), unicorn: makeRaritySprites(unicorn),
  horse: makeRaritySprites(horse), tiger: makeRaritySprites(tiger), lion: makeRaritySprites(lion),
  snake: makeRaritySprites(snake), deer: makeRaritySprites(deer), raven: makeRaritySprites(raven),
  eagle: makeRaritySprites(eagle), whale: makeRaritySprites(whale), boar: makeRaritySprites(boar),
  elephant: makeRaritySprites(elephant), monkey: makeRaritySprites(monkey), beetle: makeRaritySprites(beetle),
  crocodile: makeRaritySprites(crocodile), demon: makeRaritySprites(demon), angel: makeRaritySprites(angel),
};

const getRenderer = (type: CharacterType, rarity: CharacterRarity): Renderer =>
  SPRITES[type]?.[rarity] ?? SPRITES[type]?.common ?? slime;

const RARITY_GLOW_FILTER: Record<CharacterRarity, string | undefined> = {
  common:    undefined,
  uncommon:  undefined,
  rare:      "drop-shadow(0 0 4px #60a5fa) drop-shadow(0 0 8px #60a5fa80)",
  epic:      "drop-shadow(0 0 5px #a855f7) drop-shadow(0 0 12px #a855f780)",
  legendary: "drop-shadow(0 0 6px #f59e0b) drop-shadow(0 0 16px #f59e0b80)",
  mythic:    "drop-shadow(0 0 8px #ec4899) drop-shadow(0 0 20px #ec489980) drop-shadow(0 0 36px #ec489940)",
};

/* ─── Public component ─── */
interface PixelCharacterProps {
  characterId?: number;
  size?: number;
  float?: boolean;
}

export default function PixelCharacter({ characterId, size = 128, float: doFloat = false }: PixelCharacterProps) {
  const [hovered, setHovered] = useState(false);
  const frame: Frame = hovered ? "react" : "idle";
  const def = (characterId !== undefined ? CHARACTERS.find((c) => c.id === characterId) : undefined) ?? CHARACTERS[0];
  const animStyle = doFloat && !hovered ? { animation: "pixel-float 2s ease-in-out infinite" } : undefined;
  const glowFilter = RARITY_GLOW_FILTER[def.rarity];
  const colors = TYPE_COLORS[def.type] ?? def.colors;
  return (
    <div
      className="inline-block cursor-pointer select-none"
      style={{ ...animStyle, filter: glowFilter }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {getRenderer(def.type, def.rarity)(colors, size, frame)}
    </div>
  );
}

/** Render a sprite by character ID (used in Pokédex grid / party scene) */
export function PixelSprite({
  type, characterId: _characterId, size = 48, float: doFloat = false, rarity = "common",
}: { type: CharacterType; colors?: { p: string; s: string; a: string }; characterId?: number; size?: number; float?: boolean; rarity?: CharacterRarity }) {
  const [hovered, setHovered] = useState(false);
  const animStyle = doFloat && !hovered ? { animation: "pixel-float 2s ease-in-out infinite" } : undefined;
  const glowFilter = RARITY_GLOW_FILTER[rarity];
  const colors = TYPE_COLORS[type];
  const renderer = getRenderer(type, rarity);
  return (
    <div
      className="inline-block cursor-pointer select-none"
      style={{ ...animStyle, filter: glowFilter }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {renderer(colors, size, hovered ? "react" : "idle")}
    </div>
  );
}
