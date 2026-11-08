/* rivaOS · original wallpapers, generated as SVG (light + dark variants). Nothing here is
   Microsoft artwork: "Bloom" is the riva petal motif from the previous site, the rest are new. */

const PETAL = "M0 0C64-118 196-292 158-498C92-470 18-398-22-300C-58-206-42-84 0 0Z";
const svg = (body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;

function bloom(dark) {
  const c = dark
    ? { b1: "#0d1628", b2: "#0a1934", b3: "#060f22", p1: "#0a3a8f", p2: "#1d6bd4", p3: "#52b0ff", p4: "#bfe5ff", gl: "#2878ff", ga: .38 }
    : { b1: "#f6f9fd", b2: "#dde8f6", b3: "#c6d9f1", p1: "#0a55bd", p2: "#2d83e8", p3: "#8fcaff", p4: "#e4f3ff", gl: "#4696f5", ga: .42 };
  const ring = (fill, list) => list.map(([r, s]) => `<use href="#p" fill="url(#${fill})" transform="rotate(${r}) scale(${s})"/>`).join("");
  return svg(
    `<rect width="1600" height="1000" fill="url(#bg)"/>
     <ellipse cx="800" cy="560" rx="560" ry="420" fill="url(#gl)" filter="url(#gb)"/>
     <g transform="translate(800 650) scale(.9)">
       <g filter="url(#sf)" opacity=".9">${ring("pb", [[-128, 1.12], [-82, 1.2], [-36, 1.18], [10, 1.14], [56, 1.06], [102, .96], [148, .9]])}</g>
       <g opacity=".92">${ring("pm", [[-105, 1], [-59, 1.06], [-13, 1.04], [33, .98], [79, .9], [125, .84]])}</g>
       <g opacity=".78" style="mix-blend-mode:screen">${ring("pf", [[-84, .78], [-38, .82], [8, .8], [54, .72], [100, .64]])}</g>
       <circle r="120" fill="url(#pc)"/>
     </g>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.b1}"/><stop offset=".55" stop-color="${c.b2}"/><stop offset="1" stop-color="${c.b3}"/></linearGradient>
     <radialGradient id="gl"><stop offset="0" stop-color="${c.gl}" stop-opacity="${c.ga}"/><stop offset="1" stop-color="${c.gl}" stop-opacity="0"/></radialGradient>
     <linearGradient id="pb" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0" stop-color="${c.p1}"/><stop offset="1" stop-color="${c.p2}"/></linearGradient>
     <linearGradient id="pm" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0" stop-color="${c.p1}"/><stop offset=".6" stop-color="${c.p2}"/><stop offset="1" stop-color="${c.p3}"/></linearGradient>
     <linearGradient id="pf" x1=".2" y1="1" x2=".6" y2="0"><stop offset="0" stop-color="${c.p2}"/><stop offset=".55" stop-color="${c.p3}"/><stop offset="1" stop-color="${c.p4}"/></linearGradient>
     <radialGradient id="pc"><stop offset="0" stop-color="${c.p4}" stop-opacity=".95"/><stop offset="1" stop-color="${c.p3}" stop-opacity="0"/></radialGradient>
     <filter id="sf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
     <filter id="gb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
     <path id="p" d="${PETAL}"/>`
  );
}

function aurora(dark) {
  const base = dark ? ["#050a1c", "#0b1533"] : ["#f2f6fd", "#dfe8f8"];
  const blobs = dark
    ? [[380, 330, 520, 200, "#19d3c5", .55, -18], [900, 420, 600, 210, "#7b5cff", .55, -12], [1250, 300, 420, 180, "#2d83e8", .6, 10], [700, 760, 640, 160, "#0f8fd8", .4, 6], [1380, 760, 300, 140, "#d65cff", .35, -20]]
    : [[380, 330, 520, 200, "#7fe6dc", .7, -18], [900, 420, 600, 210, "#b6a4ff", .7, -12], [1250, 300, 420, 180, "#8fc4ff", .8, 10], [700, 760, 640, 160, "#9fd8ff", .6, 6], [1380, 760, 300, 140, "#f0b0ff", .5, -20]];
  return svg(
    `<rect width="1600" height="1000" fill="url(#bg)"/><g filter="url(#bl)">${blobs.map(([x, y, rx, ry, c, o, r]) =>
      `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${o}" transform="rotate(${r} ${x} ${y})"/>`).join("")}</g>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></linearGradient>
     <filter id="bl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="80"/></filter>`
  );
}

function dunes(dark) {
  const sky = dark ? ["#0b1030", "#2a1f5c", "#6b3b7a"] : ["#ffe2b8", "#ffb48a", "#f07f7a"];
  const sun = dark ? "#f6e7c8" : "#fff6e0";
  const layers = dark ? ["#3b2a66", "#2a1f52", "#1b153d", "#0f0c27"] : ["#f2946b", "#d9715c", "#b25352", "#7d3a49"];
  const d = [
    "M0 640C220 580 420 600 640 650S1080 720 1300 660 1600 600 1600 600V1000H0Z",
    "M0 720C260 670 480 700 720 760S1160 820 1380 760 1600 720 1600 720V1000H0Z",
    "M0 820C200 780 460 790 700 840S1180 900 1400 860 1600 830 1600 830V1000H0Z",
    "M0 910C300 880 560 900 820 940S1300 980 1600 940V1000H0Z"
  ];
  return svg(
    `<rect width="1600" height="1000" fill="url(#sky)"/><circle cx="1080" cy="520" r="120" fill="${sun}" opacity=".9" filter="url(#sg)"/><circle cx="1080" cy="520" r="96" fill="${sun}"/>
     ${d.map((p, i) => `<path d="${p}" fill="${layers[i]}"/>`).join("")}`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".6" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
     <filter id="sg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>`
  );
}

function edge(dark) {
  const bg = dark ? ["#040a16", "#0a1830"] : ["#eef4fc", "#d8e6f8"];
  const dot = dark ? "#1e3a66" : "#a9c4e8", node = dark ? "#4cc2ff" : "#0067c0", link = dark ? "#2b6fb8" : "#6aa6e6";
  // a fixed constellation so the wallpaper never changes between visits
  const pts = [[210, 260], [420, 180], [560, 360], [760, 230], [930, 330], [1120, 200], [1300, 300], [1440, 180], [330, 520], [640, 560], [880, 600], [1080, 520], [1290, 600], [480, 760], [800, 800], [1180, 780], [1420, 720]];
  const near = []; pts.forEach((a, i) => pts.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 270) near.push([a, b]); }));
  return svg(
    `<rect width="1600" height="1000" fill="url(#bg)"/><rect width="1600" height="1000" fill="url(#dots)"/>
     <ellipse cx="800" cy="480" rx="620" ry="380" fill="${node}" opacity="${dark ? .13 : .08}" filter="url(#gb)"/>
     <g stroke="${link}" stroke-width="1.4" opacity=".55" fill="none">${near.map(([a, b]) => `<path d="M${a[0]} ${a[1]}Q${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 - 30} ${b[0]} ${b[1]}"/>`).join("")}</g>
     <g fill="${node}">${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 4 ? 4 : 6}"/><circle cx="${x}" cy="${y}" r="${i % 4 ? 12 : 18}" opacity=".18"/>`).join("")}</g>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
     <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="1.4" fill="${dot}"/></pattern>
     <filter id="gb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="90"/></filter>`
  );
}

function slate(dark) {
  const c = dark ? ["#0d1625", "#16243b"] : ["#2b3f5c", "#0d1625"];
  return svg(`<rect width="1600" height="1000" fill="url(#bg)"/>`,
    `<radialGradient id="bg" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient>`);
}

export const WALLPAPERS = [
  { id: "bloom", name: "Bloom", make: bloom },
  { id: "aurora", name: "Aurora", make: aurora },
  { id: "dunes", name: "Dunes", make: dunes },
  { id: "edge", name: "Edge network", make: edge },
  { id: "slate", name: "Slate", make: slate }
];

const cache = {};
export function wallpaperSVG(id, theme) {
  const w = WALLPAPERS.find(x => x.id === id) || WALLPAPERS[0];
  return w.make(theme === "dark");
}
export function wallpaperURL(id, theme) {
  const k = id + theme;
  return cache[k] ||= "data:image/svg+xml;charset=utf-8," + encodeURIComponent(wallpaperSVG(id, theme));
}
