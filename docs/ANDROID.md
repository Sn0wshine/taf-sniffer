# Android

Android est une cible secondaire basée sur Capacitor. Le parcours web local reste la référence.

```bash
npm run android:check
npm run android:init
npm run android:sync
npm run android:build:debug
```

Un proxy distant est nécessaire pour la recherche automatique depuis un téléphone. L’import manuel, l’analyse locale et les données locales restent utilisables sans ce proxy.

La génération d’un APK signé et sa publication sur un store ne font pas partie du MVP public.
