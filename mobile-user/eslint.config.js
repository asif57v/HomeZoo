const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  { ignores: ['dist/*', 'node_modules/*', '.expo/*'] },
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'import/namespace': 'off',
      // React-Compiler advisory rules (not correctness errors)
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { caughtErrors: 'none', argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
