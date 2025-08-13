// api/og.js
export const config = { runtime: 'edge' };

export default async function () {
  try {
    const target = 'https://tusitio.vercel.app';
    const imgUrl = `https://i.microlink.io/?url=${encodeURIComponent(
      target
    )}&screenshot=true&embed=screenshot.url`;

    // Timeout 8 segundos
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(imgUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Microlink ${res.status}`);

    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: { 'Content-Type': 'image/png' },
    });
  } catch (err) {
    // Imagen de respaldo
    const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#fafafa"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-size="48" font-family="Arial" fill="#333">
        Captura no disponible
      </text>
    </svg>`;
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }
}