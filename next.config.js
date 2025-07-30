/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js 15의 새로운 기능들 활성화
    turbo: {
      rules: {
        // CSS 처리 규칙
        '*.css': ['css-loader', 'postcss-loader'],
      },
    },
  },
  // 컴파일러 최적화
  compiler: {
    // React 컴파일러 최적화 (필요시)
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 이미지 최적화 설정
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 개발 시 빠른 새로고침
  reactStrictMode: true,
  
  // 페이지 확장자 명시
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // 빌드 최적화
  swcMinify: true,
  
  // 환경 변수 설정
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 웹팩 설정 (필요시)
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 커스텀 웹팩 설정
    return config;
  },
}

module.exports = nextConfig;
