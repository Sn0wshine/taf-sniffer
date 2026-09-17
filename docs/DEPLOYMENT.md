# Déploiement

## Serveur local

```bash
npm run start:local
```

La configuration se fait avec `.env` à partir de `.env.example`. Les fichiers `.env` ne doivent jamais être commités.

## Service distant

`render.yaml` fournit une base de déploiement du serveur Node. Renseigner uniquement les secrets dans les variables d’environnement du fournisseur d’hébergement.

Pour Android, utiliser l’URL HTTPS du proxy dans `VITE_ANDROID_PROXY_BASE` avant de reconstruire l’application.
