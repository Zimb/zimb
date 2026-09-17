import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['src/chat/issueBuilder.ts', 'src/chat/participant.ts', 'src/chat/bountyRenderer.ts', 'src/services/issueCreator.ts', 'src/extension.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
