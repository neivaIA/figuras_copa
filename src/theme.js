export function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1,3),16),
    g: parseInt(hex.slice(3,5),16),
    b: parseInt(hex.slice(5,7),16),
  };
}

export function luminance({r,g,b}) {
  return 0.299*r + 0.587*g + 0.114*b;
}

export function buildTheme(c1, c2, c3) {
  const lum1 = luminance(hexToRgb(c1));
  const lum2 = luminance(hexToRgb(c2));
  const lum3 = luminance(hexToRgb(c3));
  const dark = lum1 < 100 && lum2 < 100 && lum3 < 100;
  const {r,g,b} = hexToRgb(c1);
  return {
    c1, c2, c3,
    dark,
    bg:          dark ? "#0d0d14" : "#f7f4ff",
    card:        dark ? "#17172a" : "#ffffff",
    cardShadow:  dark ? "0 4px 24px rgba(0,0,0,0.5)" : `0 4px 24px rgba(${r},${g},${b},0.13)`,
    textMain:    dark ? "#f0f0f5" : "#1a1030",
    textSub:     dark ? "#888" : "#777",
    grad:        `linear-gradient(135deg, ${c1}, ${c2})`,
    grad3:       `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`,
    gradBtn:     `linear-gradient(135deg, ${c2}, ${c3})`,
    barBg:       dark ? "#252535" : `${c1}18`,
    numEmpty:    dark ? "#1e1e30" : `${c1}10`,
    numBorder:   dark ? "#333355" : `${c1}30`,
    filterBg:    dark ? "#17172a" : "#fff",
    inputBg:     dark ? "#1a1a2e" : "#fff",
  };
}
