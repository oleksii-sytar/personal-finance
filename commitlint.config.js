module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      'auth', 'dashboard', 'ui', 'db', 'api', 'config', 'deps'
    ]],
  },
}