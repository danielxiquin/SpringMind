// api/og.js
export const config = { runtime: 'edge' };

export default async function () {
  const target = 'https://springmind.vercel.app/';
  const imgUrl = `https://i.microlink.io/?url=${encodeURIComponent(
    target
  )}&screenshot=true&embed=screenshot.url`;

  const res = await fetch(imgUrl);
  const buffer = await res.arrayBuffer();

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}