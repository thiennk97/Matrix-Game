// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'max-len': ['warn', { code: 100, ignoreComments: true, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }]
    }
  }
)
