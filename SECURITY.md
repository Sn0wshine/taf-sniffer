# Sécurité

Merci de ne pas publier une vulnérabilité dans une issue publique. Pour le moment, envoyez les détails au mainteneur du dépôt GitHub en précisant le risque, les étapes de reproduction et une éventuelle correction proposée.

Ne communiquez jamais de clé API, d'identifiant France Travail, de donnée personnelle ou de contenu privé d'annonce dans un rapport.

Les clés API sont lues depuis l'environnement **du serveur** ou saisies localement par l’utilisateur. Elles ne doivent être ni commitées, ni intégrées au JavaScript ou à un APK, même pour le debug. Le build client ne publie que la configuration publique du proxy Android (`VITE_ANDROID_PROXY_BASE`) : cette URL ne doit contenir aucun identifiant, mot de passe ou jeton. Ne pas utiliser de variable `VITE_*` pour un secret.

Les diagnostics, sauvegardes utilisateur et anciens artefacts locaux peuvent contenir des données privées même s’ils sont ignorés par Git : ne pas les publier. Si une clé a été distribuée, la révoquer chez le fournisseur puis reconstruire les artefacts ; supprimer un fichier ou modifier Git ne suffit pas.

Avant publication, vérifier aussi les métadonnées auteur/committer de Git. Utiliser le pseudonyme et l’adresse noreply fournie dans les paramètres GitHub pour les futurs commits si la confidentialité est souhaitée. Cela ne modifie pas l’historique déjà publié.
