import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 太空主题配色
        space: {
          void: '#050818',      // 深空背景
          deep: '#0b1026',      // 主背景
          card: '#141b3d',      // 卡片底色
          border: '#2a3470',    // 边框
          nebula: '#7c5cff',    // 紫色星云
          plasma: '#22d3ee',    // 青色等离子
          star: '#fbbf24',      // 金色星星
          danger: '#f43f5e',    // 警告红
          success: '#10b981',   // 成功绿
        },
      },
      fontFamily: {
        kid: ['"PingFang SC"', '"Hiragino Sans GB"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 92, 255, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 92, 255, 0.8)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
