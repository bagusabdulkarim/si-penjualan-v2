/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,

  // Header keamanan dasar untuk semua respons.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Jangan izinkan aplikasi di-embed dalam iframe (anti clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Jangan izinkan browser menebak tipe konten (anti MIME sniffing).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Batasi informasi referrer yang dikirim ke situs lain.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Matikan API browser yang tidak dipakai aplikasi.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Paksa HTTPS (aplikasi hanya diakses via HTTPS di production).
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
