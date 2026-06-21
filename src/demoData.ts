export const demoOffers = [
  `Poste : Technicien diagnostic immobilier junior
Entreprise : Bureau Veritas
Lieu : Paris / Île-de-France
Contrat : CDI
Salaire : 32-36 k brut/an

Nous recrutons un profil junior ou en reconversion pour intervenir sur des diagnostics immobiliers : DPE, amiante, plomb, gaz et électricité. Un parcours d'intégration est prévu avec accompagnement terrain. Les outils et un véhicule de service sont fournis.

Une montée en compétence vers l'audit énergétique pourra être étudiée selon profil. Certifications prises en charge après validation du parcours. Une POEI peut être étudiée pour un candidat en reconversion avant embauche définitive.`,

  `Poste : Diagnostiqueur immobilier indépendant
Entreprise : Réseau national en fort développement
Lieu : Île-de-France
Contrat : Agent commercial / indépendant
Salaire : rémunération attractive non plafonnée

Vous souhaitez être libre et développer votre activité ? Rejoignez notre réseau. Formation possible, pack de démarrage et accompagnement prévu. Fort potentiel de revenu selon performance commerciale.

Secteur large, forte autonomie, objectifs ambitieux.`,

  `Poste : Auditeur énergétique junior
Entreprise : Cabinet Renov Habitat
Lieu : Nanterre
Contrat : CDI
Salaire : 34-40 k brut/an

Cabinet spécialisé en rénovation énergétique, nous recherchons un technicien DPE ou diagnostiqueur immobilier souhaitant évoluer vers l'audit énergétique. Missions : visites terrain, scénarios de travaux, préconisations, relation client, copropriétés et petit tertiaire.

Formation audit possible. Une première expérience bâtiment est appréciée. Véhicule fourni.`,
];

export const extractionTestOffers = [
  {
    source: "Apec",
    sourceUrl: "https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178652649W",
    rawText: `Poste : Chef de Projet AMO - Investisseurs F/H
Entreprise : Kardham
Lieu : Paris 17 - 75
Contrat : CDI
Salaire : 45-60 k brut/an
Source : Apec
URL : https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178652649W

Vous accompagnez des investisseurs sur des missions AMO, programmation, coordination et conseil. La description mentionne des diagnostiqueurs dans les interlocuteurs du projet, mais le poste ouvert n'est pas un poste de diagnostiqueur immobilier.`,
    expectedExtraction: {
      title: "Chef de Projet AMO - Investisseurs F/H",
      company: "Kardham",
      location: "Paris 17 - 75",
      contract: "CDI",
      salary: "45-60 k brut/an",
      workTime: "",
    },
  },
  {
    source: "France Travail",
    sourceUrl: "https://candidat.francetravail.fr/offres/recherche/detail/207SVJM",
    rawText: `Poste : DIAGNOSTIQUEUR IMMOBILIER (F/H) (H/F)
Entreprise : DIMO DIAGNOSTIC
Lieu : 69 - Lyon 4e Arrondissement
Contrat : CDI
Temps de travail : Temps partiel - 7H/semaine Travail en journee
Salaire : Mensuel de 2100 Euros a 2500 Euros sur 12 mois
Brut / net : brut
Source : France Travail

Au sein d'une equipe composee d'une assistante commerciale, vous intervenez principalement pour des agences immobilieres et notaires du departement du Rhone.`,
    expectedExtraction: {
      title: "DIAGNOSTIQUEUR IMMOBILIER (F/H) (H/F)",
      company: "DIMO DIAGNOSTIC",
      location: "69 - Lyon 4e Arrondissement",
      contract: "CDI",
      salary: "Mensuel de 2100 Euros a 2500 Euros sur 12 mois",
      workTime: "Temps partiel - 7H/semaine Travail en journee",
    },
  },
  {
    source: "Jobijoba",
    sourceUrl: "https://www.jobijoba.com/fr/emploi/Technicien+diagnostiqueur+immobilier+junior",
    rawText: `Poste : Technicien diagnostiqueur immobilier junior h/f
Entreprise : Sodiatec
Lieu : Fresnes
Contrat : CDI
Source : Jobijoba

Un accompagnement complet vers le metier de diagnostiqueur immobilier. La possibilite d'evoluer dans une entreprise structuree, reconnue pour son expertise et la qualite de sa formation continue.`,
    expectedExtraction: {
      title: "Technicien diagnostiqueur immobilier junior h/f",
      company: "Sodiatec",
      location: "Fresnes",
      contract: "CDI",
      salary: "",
      workTime: "",
    },
  },
  {
    source: "Test hors cible",
    sourceUrl: "",
    rawText: `Poste : Chef de projet AMO batiment
Entreprise : Cabinet Urbain Conseil
Lieu : Nantes
Contrat : CDI
Salaire : 38-44 k brut/an

Le poste coordonne des audits documentaires et des prestataires, dont des diagnostiqueurs immobiliers. La mission principale reste l'assistance a maitrise d'ouvrage et le pilotage de projet.`,
    expectedExtraction: {
      title: "Chef de projet AMO batiment",
      company: "Cabinet Urbain Conseil",
      location: "Nantes",
      contract: "CDI",
      salary: "38-44 k brut/an",
      workTime: "",
    },
  },
];
