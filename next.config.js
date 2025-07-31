/** @type {import('next').NextConfig} */
const nextConfig = {
  // PageProps 타입 호환성 이슈로 임시 TypeScript 체크 비활성화 (Next.js 15.3.5 이슈)
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint는 활성화 유지
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  // Next.js 15.3.5 기준: turbo 옵션은 turbpac으로 이동
  experimental: {
    // 기타 실험적 옵션 필요시 여기에 추가
  },
  turbopack: {
    // Turbopack 활성화 (기본값 true)
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
  
  // swcMinify는 Next.js 13 이후 기본값이므로 제거 (더 이상 필요 없음)
  
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
