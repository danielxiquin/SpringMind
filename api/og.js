export default function () {
  const target = 'https://tusitio.vercel.app';
  const img = `https://i.microlink.io/?url=${encodeURIComponent(
    target
  )}&screenshot=true&embed=screenshot.url`;

  return Response.redirect(img, 302);
}