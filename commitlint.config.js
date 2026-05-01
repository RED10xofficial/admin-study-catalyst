/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // new feature
        'fix', // bug fix
        'docs', // documentation only
        'style', // formatting, no logic change
        'refactor', // code change that is not a fix or feature
        'perf', // performance improvement
        'test', // adding or updating tests
        'build', // build system or external dependencies
        'ci', // CI/CD changes
        'chore', // maintenance tasks
        'revert', // reverts a previous commit
      ],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'auth',
        'users',
        'book-codes',
        'exam-types',
        'units',
        'questions',
        'exam-questions',
        'progress',
        'exams',
        'analytics',
        'admin',
        'frontend',
        'backend',
        'shared',
        'config',
        'deps',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
