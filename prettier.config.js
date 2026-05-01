/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  trailingComma: 'all',
  printWidth: 100,
  endOfLine: 'lf',
  arrowParens: 'always',

  overrides: [
    {
      files: ['*.json', '*.jsonc'],
      options: { trailingComma: 'none' },
    },
    {
      files: ['*.md'],
      options: { proseWrap: 'always', printWidth: 80 },
    },
    {
      files: ['*.vue'],
      options: { parser: 'vue' },
    },
  ],
};
