module.exports = {
  extends: [
    'next',
    'next/core-web-vitals',
    'next/typescript',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'off', // Turn off unused vars
    '@typescript-eslint/no-empty-interface': 'off', // Turn off empty interface
    'react-hooks/exhaustive-deps': 'warn', // Keep as warning
    'next/no-img-element': 'off', // Disable warning for <img> tags
    '@typescript-eslint/no-empty-object-type': 'off', // Disable empty object type warning
    '@typescript-eslint/no-explicit-any': 'off', // Turn off error for using any
  },
};
