# Publier une release

1. Vérifier que le dépôt de travail est propre et que `npm test` et `npm run build` passent.
2. Mettre à jour `CHANGELOG.md` avec une section datée.
3. Synchroniser l'affichage de version avec `npm run sync:version`.
4. Créer un commit de release et un tag annoté, par exemple `v0.1.0`.
5. Créer la release GitHub avec les notes d'installation et les limites connues.

La première release publique de Taf Sniffer est ciblée sur `v0.1.0`. Les clés API, fichiers `.env`, diagnostics et données d'annonces ne doivent jamais être inclus dans l'archive.
