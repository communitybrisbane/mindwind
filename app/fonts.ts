import {
  Kiwi_Maru,
  Klee_One,
  Yomogi,
  Zen_Kurenaido,
  Zen_Maru_Gothic,
} from "next/font/google";

// 新 UI（v5）の書体。next/font が CSS 変数を <html> に付ける（契約 §2「書体」）。
// 役割名（--font-mincho / hand / hand2 / pen / ui）への束ねは app/globals.css の @theme で行う。
// 日本語の字形は unicode-range で分割配信されるため、preload は切って必要な分だけ読む。

const kiwi = Kiwi_Maru({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-kiwi",
});

const yomogi = Yomogi({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-yomogi",
});

const klee = Klee_One({
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-klee",
});

const kurenaido = Zen_Kurenaido({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-kurenaido",
});

const zenmaru = Zen_Maru_Gothic({
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-zenmaru",
});

/** <html className> に付けるクラス（5書体の CSS 変数を定義する） */
export const fontVariables = [
  kiwi.variable,
  yomogi.variable,
  klee.variable,
  kurenaido.variable,
  zenmaru.variable,
].join(" ");
