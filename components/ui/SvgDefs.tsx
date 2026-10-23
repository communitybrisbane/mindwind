// 新 UI（v5）の SVG フィルター。app/layout.tsx の <body> 直下に1回だけ置く（契約 §2「SVG フィルター」）。
// 値はプロトタイプ docs/prototype/ui-v5.html の <defs> をそのまま写す（inkf は契約名 ink）。
// 使い方：CSS で filter: url(#pencil) など。サーバーコンポーネント（状態なし）。

export default function SvgDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {/* 鉛筆の線のゆらぎ（アイコン・罫・輪） */}
        <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={2} seed={2} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.3} result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.9" numOctaves={1} seed={7} result="g" />
          <feColorMatrix
            in="g"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.75"
            result="m"
          />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
        {/* 水彩のにじみ（玉の塗り） */}
        <filter id="wc" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves={3} seed={11} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={7} />
        </filter>
        {/* インクの消印（回転盤の決定の輪。プロトタイプの inkf） */}
        <filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={2} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.2} result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves={1} seed={9} result="s" />
          <feColorMatrix
            in="s"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.75"
            result="m"
          />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
        {/* 紙のふちのゆらぎ（.sheet::before） */}
        <filter id="deckle" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency=".05 .05" numOctaves={3} seed={6} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} />
        </filter>
        {/* ロゴのにじみ（起動画面） */}
        <filter id="logoink" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves={2} seed={5} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} result="d" />
          <feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves={1} seed={9} result="s" />
          <feColorMatrix
            in="s"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.72"
            result="m"
          />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
