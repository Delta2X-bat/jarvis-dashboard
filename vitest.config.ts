import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // .claude/worktrees/ holds full scratch copies of the repo used by background
    // agents — exclude them so their duplicate streak.test.ts doesn't also run.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
})
