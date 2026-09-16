module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nouvelle fonctionnalité
        'fix',      // Correction de bug
        'docs',     // Documentation uniquement
        'style',    // Formatage (pas de changement de code)
        'refactor', // Refactoring (ni fix ni feat)
        'perf',     // Amélioration de performance
        'test',     // Ajout ou correction de tests
        'build',    // Système de build / dépendances
        'ci',       // CI/CD
        'chore',    // Tâches diverses
        'revert',   // Revert d'un commit précédent
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'header-max-length': [2, 'always', 100],
  },
};
