import type {NextConfig} from 'next';

/** Dev (`npm run dev`) writes to `.next-dev` so production builds never corrupt the live dev cache on Windows. */
const distDir = process.env.NEXT_DEV === '1' ? '.next-dev' : '.next';

const nextConfig: NextConfig = {
  distDir,
};

export default nextConfig;
