# Contribuer à Taf Sniffer

Merci de contribuer. Les changements ciblés et accompagnés de tests sont préférés aux refontes larges. Les agents de code trouveront le contexte nécessaire dans [AGENTS.md](AGENTS.md).

## Développement local

```bash
npm install
npm test
npm run build
```

Pour une modification fonctionnelle, ajouter ou mettre à jour un test. Pour une modification d'interface, vérifier le mode responsive et le mode sombre lorsque cela s'applique.

## Commits

Préférez les commits conventionnels : `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. Rédigez les messages en français, une intention par commit.

## Premiers pas

Les issues étiquetées `good first issue` conviennent à une première contribution. Pour toute autre idée, ouvrez d'abord une issue avec le gabarit « Proposition d'amélioration » afin d'aligner l'approche avant de coder.

## Pull requests

Utilisez le [gabarit de pull request](.github/PULL_REQUEST_TEMPLATE.md) : décrire le problème, le comportement attendu, les changements réalisés et les vérifications exécutées. Ne jamais inclure de clé API, de données personnelles ou de texte d'annonce provenant d'un utilisateur.

## Sources externes

Les connecteurs doivent rester best-effort, respecter les conditions d'utilisation des sources et conserver une solution d'import manuel lorsque la collecte automatique échoue.

