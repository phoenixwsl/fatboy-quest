import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom 不暴露 URL.createObjectURL / revokeObjectURL —— 画廊用 Blob 渲染需要它
// R5.7.0: 给个简易 stub，不需要返回真 URL，组件挂载/卸载不报错即可
if (typeof URL.createObjectURL !== 'function') {
  let counter = 0;
  URL.createObjectURL = (_: Blob | MediaSource) => `blob:fake/${++counter}`;
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = (_: string) => {};
}
