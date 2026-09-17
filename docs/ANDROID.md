# Android

Android est une cible secondaire basée sur Capacitor. Le parcours web local reste la référence.

```bash
npm run android:check
npm run android:init
npm run android:sync
npm run android:build:debug
```

Un proxy distant est nécessaire pour la recherche automatique depuis un téléphone. L’import manuel, l’analyse locale et les données locales restent utilisables sans ce proxy.

## Confidentialité des builds

Les clés API restent côté serveur ou sont saisies par l’utilisateur après installation. Ne jamais embarquer une clé personnelle, même de debug, dans un APK. `VITE_ANDROID_PROXY_BASE` est une URL publique, sans identifiants ni jetons.

Avant de redistribuer une version issue d’un ancien build, supprimer les anciens assets copiés et sorties de compilation Android, puis exécuter `npm run android:sync` et reconstruire l’APK. Une synchronisation des assets ne met pas à jour un APK déjà généré ou installé. Toute clé réellement exposée doit être révoquée chez son fournisseur ; une reconstruction ne la révoque pas.

La génération d’un APK signé et sa publication sur un store ne font pas partie du MVP public.
