module.exports = {
    extends: [
      'next',
      'next/core-web-vitals',
      'plugin:@typescript-eslint/recommended',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // Disable no-unused-vars rule
      '@typescript-eslint/no-empty-interface': 'off', // Disable no-empty-interface rule
      'react-hooks/exhaustive-deps': 'warn', // Change to warning instead of error
      'next/no-img-element': 'warn', // Change to warning instead of error
    },
  };
  