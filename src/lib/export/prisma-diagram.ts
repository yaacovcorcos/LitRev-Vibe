import type { PrismaFlowMetrics } from "@/lib/metrics/prisma-flow";

type DiagramOptions = {
  width?: number;
  height?: number;
};

const DEFAULT_WIDTH = 760;
const DEFAULT_HEIGHT = 460;
const BOX_WIDTH = 220;
const BOX_HEIGHT = 70;
const BOX_RADIUS = 8;

type Node = {
  id: string;
  x: number;
  y: number;
  title: string;
  value: number;
  subtitle?: string;
};

export function buildPrismaDiagramSvg(metrics: PrismaFlowMetrics, options: DiagramOptions = {}) {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

  const excluded = Math.max(metrics.screened - metrics.included, 0);

  const nodes: Node[] = [
    {
      id: "identified",
      x: width / 2 - BOX_WIDTH / 2,
      y: 30,
      title: "Records identified",
      value: metrics.totalIdentified,
      subtitle: "database search",
    },
    {
      id: "stored",
      x: width / 2 - BOX_WIDTH / 2,
      y: 140,
      title: "Records stored",
      value: metrics.totalStored,
    },
    {
      id: "screened",
      x: width / 2 - BOX_WIDTH / 2,
      y: 250,
      title: "Records screened",
      value: metrics.screened,
    },
    {
      id: "excluded",
      x: width / 2 + BOX_WIDTH + 40,
      y: 250,
      title: "Records excluded",
      value: excluded,
    },
    {
      id: "included",
      x: width / 2 - BOX_WIDTH / 2,
      y: 360,
      title: "Studies included",
      value: metrics.included,
    },
  ];

  const arrows = [
    arrowBetween(nodes[0], nodes[1]),
    arrowBetween(nodes[1], nodes[2]),
    arrowBetween(nodes[2], nodes[4]),
    sideArrow(nodes[2], nodes[3]),
  ];

  const svgNodes = nodes
    .map((node) => renderNode(node))
    .join("\n");

  const svgArrows = arrows.join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">PRISMA flow diagram</title>
  <desc id="desc">Visual summary of records identified, screened, excluded, and included.</desc>
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  ${svgNodes}
  ${svgArrows}
</svg>`;
}

function renderNode(node: Node) {
  const label = `${node.value.toLocaleString()}`;
  const subtitle = node.subtitle ? `<tspan x="${node.x + BOX_WIDTH / 2}" dy="18" class="subtitle">${escapeXml(node.subtitle)}</tspan>` : "";

  return `<g>
    <rect x="${node.x}" y="${node.y}" rx="${BOX_RADIUS}" ry="${BOX_RADIUS}" width="${BOX_WIDTH}" height="${BOX_HEIGHT}" fill="#F4F4F5" stroke="#D4D4D8" stroke-width="2" />
    <text x="${node.x + BOX_WIDTH / 2}" y="${node.y + 28}" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" font-weight="600" fill="#27272A">${escapeXml(node.title)}</text>
    <text x="${node.x + BOX_WIDTH / 2}" y="${node.y + 50}" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" fill="#3F3F46">${label}${subtitle}</text>
  </g>`;
}

function arrowBetween(source: Node, target: Node) {
  const startX = source.x + BOX_WIDTH / 2;
  const startY = source.y + BOX_HEIGHT;
  const endX = target.x + BOX_WIDTH / 2;
  const endY = target.y;

  return renderArrow(startX, startY, endX, endY);
}

function sideArrow(source: Node, target: Node) {
  const startX = source.x + BOX_WIDTH;
  const startY = source.y + BOX_HEIGHT / 2;
  const endX = target.x;
  const endY = target.y + BOX_HEIGHT / 2;

  return renderArrow(startX, startY, endX, endY);
}

function renderArrow(startX: number, startY: number, endX: number, endY: number) {
  const arrowHead = 8;
  const path = `M ${startX} ${startY} L ${endX} ${endY}`;

  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowX = endX - arrowHead * Math.cos(angle - Math.PI / 6);
  const arrowY = endY - arrowHead * Math.sin(angle - Math.PI / 6);
  const arrowX2 = endX - arrowHead * Math.cos(angle + Math.PI / 6);
  const arrowY2 = endY - arrowHead * Math.sin(angle + Math.PI / 6);

  return `<g>
    <path d="${path}" stroke="#A1A1AA" stroke-width="2" fill="none" />
    <path d="M ${endX} ${endY} L ${arrowX} ${arrowY} L ${arrowX2} ${arrowY2} Z" fill="#A1A1AA" />
  </g>`;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return char;
    }
  });
}
