import type { FondsConfig, FondsRecommande, CumulResult, TerritoireFlags, TypeStructure, NiveauFonds } from './types';

export const FONDS_CONFIG: Record<string, FondsConfig> = {

  // ── FONDS EUROPÉENS ──────────────────────────────────────────────

  fse_plus: {
    nom: 'FSE+ — Fonds Social Européen Plus',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/1057 du 24 juin 2021',
    programmeOperationnel: 'PON Emploi et Inclusion 2021-2027',
    periodeEligibilite: { debut: '2021-01-01', fin: '2029-12-31' },
    gestionnaire: 'DGEFP / Autorités de Gestion régionales',
    tauxMax: 85,
    tauxStandard: 40,
    bonusQPV: 20,
    bonusDOMTOM: 45,
    montantMin: 10000,
    montantMax: 2000000,
    porteurEligibles: [
      'commune', 'epci', 'departement', 'region', 'metropole',
      'epa', 'epic', 'gip', 'association_loi_1901',
      'organisme_formation', 'scop', 'scic', 'gie',
    ],
    secteurs: [
      'insertion_emploi', 'formation', 'inclusion_sociale',
      'apprentissage', 'jeunesse', 'egalite_chances',
      'integration_migrants',
    ],
    depensesEligibles: [
      'Salaires et charges sociales du personnel affecté',
      'Frais de déplacement du personnel',
      'Équipements (quote-part usage professionnel)',
      'Formations externalisées (prestataires Qualiopi)',
      'Salaires/indemnités des stagiaires/participants',
      'Transport participants (Pass Navigo...)',
      'Médecine du travail des participants',
      'Vêture / EPI des participants',
      'Frais de garde d\'enfants des participants',
      'Contributions en nature (locaux mis à disposition)',
      'Dépenses indirectes (forfait 20% ou 15% ou 7%)',
    ],
    depensesIneligibles: [
      'TVA récupérable',
      'Amendes et pénalités',
      'Intérêts débiteurs (sauf BEI)',
      'Achat de terrain > 10% du coût total éligible',
      'Frais bancaires (hors compte dédié)',
      'Dépenses engagées avant la date de début d\'éligibilité',
    ],
    tauxForfaitIndirect: [7, 15, 20],
    tauxForfaitIndirectDefaut: 20,
    seuil500k: true,
    principesHorizontauxObligatoires: true,
    suiviParticipantsObligatoire: true,
    publiciteFSEObligatoire: true,
    questionnaireDGEFPObligatoire: true,
    logosObligatoires: ['ue', 'leurope_sengage', 'rf'],
    mentionObligatoire: 'Ce projet est cofinancé par le Fonds social européen dans le cadre du programme opérationnel national « Emploi et Inclusion » 2021-2027',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'attestation_regularite_fiscale',
      'deliberation_instance_dirigeante',
      'fiches_poste_personnel', 'lettres_mission',
      'contrats_participants', 'feuilles_emargement',
      'questionnaires_participants', 'factures',
      'trois_devis_si_achat_sup_1000',
    ],
    indicateursCommuns: [
      'RCO01 — Demandeurs d\'emploi accompagnés',
      'RCO02 — Demandeurs d\'emploi longue durée',
      'RCO03 — Personnes inactives accompagnées',
      'RCO05 — Jeunes accompagnés (15-29 ans)',
      'RCR01 — Participants ayant trouvé un emploi',
      'RCR02 — Participants en formation/éducation',
      'RCR03 — Qualification professionnelle obtenue',
    ],
    formatDossier: 'Ma Démarche FSE (DGEFP)',
    alertes: [
      { condition: 'taux > 85', message: 'Taux maximum FSE+ = 85% (DOM-TOM uniquement). Réduire le taux demandé.', niveau: 'error' },
      { condition: 'taux > 60 && !QPV && !DOMTOM', message: 'Hors QPV/DOM-TOM, le taux FSE+ standard est 40%. Un taux > 60% requiert une justification forte.', niveau: 'warning' },
      { condition: 'principes_horizontaux_absents', message: 'Les principes horizontaux (égalité H/F, non-discrimination, développement durable) sont OBLIGATOIRES pour FSE+.', niveau: 'error' },
      { condition: 'pas_suivi_participants', message: 'Le suivi des participants (questionnaires DGEFP entrée/sortie) est obligatoire pour FSE+.', niveau: 'error' },
      { condition: 'pas_logos_ue', message: 'La publicité UE (logo + mention cofinancement) est obligatoire sur tous les supports.', niveau: 'error' },
    ],
  },

  feder: {
    nom: 'FEDER — Fonds Européen de Développement Régional',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/1058 du 24 juin 2021',
    programmeOperationnel: 'Programmes Régionaux (PR) 2021-2027',
    periodeEligibilite: { debut: '2021-01-01', fin: '2029-12-31' },
    gestionnaire: 'Autorités de Gestion régionales (Régions)',
    tauxMax: 85,
    tauxStandard: 40,
    bonusQPV: 20,
    bonusDOMTOM: 45,
    montantMin: 50000,
    objectifsPolitique: ['OP1 — Europe intelligente', 'OP2 — Europe verte', 'OP3 — Europe connectée', 'OP4 — Europe sociale', 'OP5 — Europe proche des citoyens'],
    porteurEligibles: [
      'commune', 'epci', 'departement', 'region', 'metropole',
      'syndicat_mixte', 'epa', 'epic', 'gip', 'spl', 'sem',
      'universite', 'hopital_chu', 'office_hlm',
      'association_loi_1901', 'sas', 'sarl', 'sa', 'pme', 'eti', 'scop', 'scic',
    ],
    secteurs: [
      'renovation_urbaine', 'transition_ecologique', 'energie',
      'numerique', 'innovation', 'mobilite', 'logement',
      'education', 'culture', 'sport', 'sante',
    ],
    depensesEligibles: [
      'Travaux de construction / rénovation / réhabilitation',
      'Équipements et matériels',
      'Études, maîtrise d\'œuvre, ingénierie',
      'Acquisition foncière (< 10% du coût total éligible)',
      'Frais de personnel de gestion de projet',
      'Communication et publicité',
      'Audit et évaluation',
      'Dépenses indirectes (forfait ou réel)',
    ],
    depensesIneligibles: [
      'TVA récupérable',
      'Intérêts débiteurs',
      'Démantèlement de centrales nucléaires',
      'Tabac, boissons alcoolisées, armement',
    ],
    tauxForfaitIndirect: [7, 15, 20, 25],
    principesHorizontauxObligatoires: true,
    logosObligatoires: ['ue', 'rf', 'region'],
    mentionObligatoire: 'Ce projet est cofinancé par le Fonds européen de développement régional dans le cadre du Programme Régional 2021-2027',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'attestation_regularite_fiscale', 'deliberation_instance_dirigeante',
      'devis_estimatif', 'plan_situation', 'factures',
    ],
    formatDossier: 'Programme régional (FEDER)',
    alertes: [
      { condition: 'taux > 85', message: 'Taux maximum FEDER = 85% (régions moins développées / DOM-TOM).', niveau: 'error' },
      { condition: 'taux > 55 && region_standard', message: 'Pour les régions plus développées (PIB > 90% moy. UE), le taux standard FEDER est 40-50%.', niveau: 'warning' },
    ],
  },

  feader: {
    nom: 'FEADER — Fonds Européen Agricole pour le Développement Rural',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/2115 du 2 décembre 2021',
    programmeOperationnel: 'Plan Stratégique National PAC (PSN) 2023-2027',
    gestionnaire: 'Autorités de Gestion régionales + ASP',
    tauxMax: 80,
    tauxStandard: 43,
    bonusMontagne: 22,
    bonusDOMTOM: 42,
    montantMin: 1500,
    conditionTerritoire: 'Zone rurale',
    porteurEligibles: [
      'agriculteur', 'cooperative', 'commune',
      'association_loi_1901', 'organisme_formation',
    ],
    secteurs: [
      'agriculture', 'alimentation', 'biodiversite',
      'rural', 'foret', 'eau', 'formation_agricole',
    ],
    dispositifLeader: {
      tauxMax: 80,
      montantMin: 1500,
      montantMax: 200000,
      porteurLeader: 'Tous porteurs sauf État (via GAL)',
    },
    logosObligatoires: ['ue', 'feader', 'rf'],
    mentionObligatoire: 'Ce projet est soutenu par le Fonds européen agricole pour le développement rural (FEADER) dans le cadre du PSN PAC 2023-2027',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'attestation_regularite_fiscale', 'devis_estimatif',
    ],
    formatDossier: 'OSIRIS / Démarche en ligne (ASP)',
    alertes: [
      { condition: 'pas_zone_rurale', message: 'Le FEADER est réservé aux zones rurales. Vérifier l\'éligibilité territoriale.', niveau: 'error' },
      { condition: 'porteur_non_eligible', message: 'Vérifier l\'éligibilité du porteur selon la mesure FEADER ciblée.', niveau: 'warning' },
    ],
  },

  feampa: {
    nom: 'FEAMPA — Fonds Européen pour les Affaires Maritimes, la Pêche et l\'Aquaculture',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/1139 du 7 juillet 2021',
    gestionnaire: 'DPMA / Régions côtières',
    tauxMax: 85,
    tauxStandard: 75,
    porteurEligibles: ['pme', 'cooperative', 'commune', 'association_loi_1901'],
    secteurs: ['eau', 'agriculture'],
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib', 'devis_estimatif',
    ],
    mentionObligatoire: 'Ce projet est cofinancé par le Fonds européen pour les affaires maritimes, la pêche et l\'aquaculture (FEAMPA)',
    alertes: [
      { condition: 'pas_secteur_maritime', message: 'FEAMPA réservé aux acteurs de la pêche maritime et de l\'aquaculture.', niveau: 'error' },
    ],
  },

  life: {
    nom: 'Programme LIFE — Environnement, Nature & Climat',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/783 du 29 avril 2021',
    programmeOperationnel: 'LIFE 2021-2027 (5,43 Md€)',
    gestionnaire: 'Commission européenne (CINEA / EASME)',
    tauxMax: 75,
    tauxStandard: 60,
    montantMin: 500000,
    montantMax: 5000000,
    porteurEligibles: [
      'commune', 'epci', 'departement', 'region',
      'association_loi_1901', 'fondation_rup',
      'universite', 'sas', 'sarl', 'sa',
    ],
    secteurs: [
      'biodiversite', 'economie_circulaire',
      'climat_attenuation', 'energie_propre',
    ],
    consortiumRecommande: true,
    multiPaysRecommande: true,
    mentionObligatoire: 'Ce projet bénéficie du programme LIFE de l\'Union européenne',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'etude_faisabilite', 'plan_suivi_evaluation',
    ],
    alertes: [
      { condition: 'montant < 500000', message: 'Budget recommandé pour LIFE ≥ 500 000 €. Un budget inférieur diminue significativement les chances de sélection.', niveau: 'warning' },
      { condition: 'pas_consortium', message: 'Un consortium multi-entités et multi-pays est fortement recommandé pour LIFE.', niveau: 'info' },
      { condition: 'taux > 75', message: 'Taux maximum LIFE = 75% (projets prioritaires nature). Standard = 60%.', niveau: 'error' },
    ],
  },

  horizon_europe: {
    nom: 'Horizon Europe — Recherche & Innovation',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/695 du 28 avril 2021',
    programmeOperationnel: 'Horizon Europe 2021-2027 (95,5 Md€)',
    gestionnaire: 'Commission européenne (REA, ERCEA, EISMEA)',
    tauxMax: 100,
    tauxEntiteLucrative: 70,
    tauxEntiteNonLucrative: 100,
    tauxIndirects: 25,
    montantMin: 500000,
    porteurEligibles: [
      'universite', 'epa', 'epic', 'gip',
      'association_loi_1901', 'fondation_rup',
      'sas', 'sarl', 'sa', 'pme', 'startup', 'eti',
    ],
    secteurs: [
      'recherche_developpement', 'innovation',
      'numerique', 'sante', 'energie', 'transport',
      'alimentation', 'securite',
    ],
    consortiumObligatoire: true,
    nbPaysMinimum: 3,
    mentionObligatoire: 'Ce projet a reçu un financement du programme-cadre de recherche et d\'innovation de l\'Union européenne Horizon Europe',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'etude_faisabilite', 'plan_suivi_evaluation',
    ],
    alertes: [
      { condition: 'pas_consortium_3pays', message: 'Horizon Europe requiert un consortium d\'au moins 3 entités dans 3 États membres UE différents.', niveau: 'error' },
      { condition: 'entite_lucrative && taux > 70', message: 'Les entités lucratives (entreprises) sont financées à 70% maximum sur Horizon Europe.', niveau: 'error' },
    ],
  },

  erasmus_plus: {
    nom: 'Erasmus+ — Éducation, Formation, Jeunesse, Sport',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/817 du 20 mai 2021',
    programmeOperationnel: 'Erasmus+ 2021-2027 (26,2 Md€)',
    gestionnaire: 'Agence Erasmus+ France / ANEF + INJEP',
    tauxMax: 80,
    tauxStandard: 80,
    montantMin: 10000,
    montantMax: 400000,
    porteurEligibles: [
      'commune', 'epci', 'universite', 'association_loi_1901',
      'organisme_formation', 'groupement_employeurs',
    ],
    secteurs: [
      'education', 'formation', 'jeunesse', 'sport',
      'mobilite_internationale', 'integration_europeenne',
    ],
    accreditationESRS: 'Requise pour KA1 (mobilité)',
    multiPaysRequisKA2: true,
    mentionObligatoire: 'Ce projet est cofinancé par le programme Erasmus+ de l\'Union européenne',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'deliberation_instance_dirigeante',
    ],
    alertes: [
      { condition: 'KA2_sans_2pays', message: 'KA2 Erasmus+ requiert un partenariat avec au moins 2 pays UE partenaires.', niveau: 'error' },
      { condition: 'KA1_sans_accreditation', message: 'L\'accréditation ESRS (European School Accreditation) est requise pour les mobilités KA1.', niveau: 'error' },
    ],
  },

  interreg: {
    nom: 'Interreg — Coopération Territoriale Européenne',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/1059 du 24 juin 2021',
    gestionnaire: 'Autorités de Gestion des programmes Interreg',
    tauxMax: 75,
    tauxStandard: 70,
    porteurEligibles: [
      'commune', 'epci', 'departement', 'region',
      'association_loi_1901', 'epa', 'epic', 'gip',
    ],
    secteurs: [
      'transition_ecologique', 'numerique', 'mobilite',
      'inclusion_sociale', 'innovation',
    ],
    consortiumObligatoire: true,
    nbPaysMinimum: 2,
    mentionObligatoire: 'Ce projet est cofinancé par le Fonds européen de développement régional dans le cadre du programme Interreg',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib', 'deliberation_instance_dirigeante',
    ],
    alertes: [
      { condition: 'pas_partenaire_etranger', message: 'Interreg requiert obligatoirement un partenaire dans au moins un autre État membre UE.', niveau: 'error' },
    ],
  },

  europe_creative: {
    nom: 'Europe Créative — Culture, Audiovisuel, Médias',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/818 du 20 mai 2021',
    programmeOperationnel: 'Europe Créative 2021-2027 (2,44 Md€)',
    gestionnaire: 'Commission européenne / EACEA',
    tauxMax: 80,
    tauxStandard: 60,
    montantMin: 50000,
    porteurEligibles: [
      'association_loi_1901', 'fondation_rup',
      'commune', 'epci', 'sas', 'sarl',
    ],
    secteurs: ['culture', 'numerique'],
    consortiumRecommande: true,
    mentionObligatoire: 'Ce projet est cofinancé par le programme Europe Créative de l\'Union européenne',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
    ],
    alertes: [
      { condition: 'pas_secteur_culturel', message: 'Europe Créative est réservé aux opérateurs des secteurs culturels et créatifs.', niveau: 'error' },
      { condition: 'pas_partenaire_etranger', message: 'Un partenariat multi-pays est requis pour Europe Créative.', niveau: 'warning' },
    ],
  },

  eu4health: {
    nom: 'EU4Health — Programme Santé',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/522 du 24 mars 2021',
    programmeOperationnel: 'EU4Health 2021-2027 (5,1 Md€)',
    gestionnaire: 'Commission européenne (HaDEA)',
    tauxMax: 80,
    tauxStandard: 60,
    porteurEligibles: [
      'epa', 'epic', 'hopital_chu', 'universite',
      'association_loi_1901', 'region', 'departement',
    ],
    secteurs: ['sante'],
    mentionObligatoire: 'Ce projet est cofinancé par l\'Union européenne dans le cadre du Programme EU4Health 2021-2027',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
    ],
    alertes: [
      { condition: 'pas_secteur_sante', message: 'EU4Health est réservé aux opérateurs du secteur santé.', niveau: 'error' },
    ],
  },

  ftj: {
    nom: 'FTJ — Fonds pour une Transition Juste',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/1056 du 24 juin 2021',
    programmeOperationnel: 'FTJ 2021-2027 (19,2 Md€)',
    gestionnaire: 'Autorités de Gestion régionales',
    tauxMax: 85,
    tauxStandard: 65,
    porteurEligibles: [
      'commune', 'epci', 'region', 'departement',
      'pme', 'eti', 'organisme_formation', 'association_loi_1901',
    ],
    secteurs: ['transition_ecologique', 'formation', 'insertion_emploi', 'energie'],
    conditionTerritoire: 'Zones de transition énergétique (bassins miniers, zones charbon)',
    mentionObligatoire: 'Ce projet est cofinancé par le Fonds pour une transition juste dans le cadre du Programme Régional 2021-2027',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib', 'deliberation_instance_dirigeante',
    ],
    alertes: [
      { condition: 'pas_zone_transition', message: 'Le FTJ est réservé aux zones de transition énergétique identifiées dans le Plan Territorial de Transition Juste.', niveau: 'error' },
    ],
  },

  amif: {
    nom: 'AMIF — Asile, Migrations et Intégration',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/1147 du 7 juillet 2021',
    programmeOperationnel: 'AMIF 2021-2027 (9,9 Md€)',
    gestionnaire: 'DGEF / Préfectures',
    tauxMax: 90,
    tauxStandard: 75,
    porteurEligibles: [
      'association_loi_1901', 'epa', 'epic', 'gip',
      'commune', 'epci',
    ],
    secteurs: ['integration_migrants', 'inclusion_sociale', 'acces_droits'],
    mentionObligatoire: 'Ce projet est cofinancé par le Fonds Asile, Migrations et Intégration de l\'Union européenne',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'attestation_regularite_fiscale',
    ],
    alertes: [
      { condition: 'pas_public_migrant', message: 'L\'AMIF cible les ressortissants de pays tiers, les demandeurs d\'asile et les personnes en situation de migration.', niveau: 'warning' },
    ],
  },

  digital_europe: {
    nom: 'Digital Europe Programme (DEP)',
    niveau: 'europeen',
    reglementBase: 'Règlement (UE) 2021/694 du 29 avril 2021',
    programmeOperationnel: 'Digital Europe 2021-2027 (7,6 Md€)',
    gestionnaire: 'Commission européenne (EISMEA)',
    tauxMax: 100,
    tauxStandard: 50,
    montantMin: 500000,
    porteurEligibles: [
      'pme', 'startup', 'eti', 'universite', 'epa', 'epic',
      'commune', 'epci', 'region',
    ],
    secteurs: ['numerique', 'innovation', 'securite'],
    mentionObligatoire: 'Ce projet bénéficie du Programme pour une Europe numérique (Digital Europe Programme)',
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
    ],
    alertes: [
      { condition: 'pas_secteur_numerique', message: 'Digital Europe Programme cible spécifiquement les capacités numériques avancées (IA, cybersécurité, calcul HPC).', niveau: 'warning' },
    ],
  },

  // ── FONDS NATIONAUX ──────────────────────────────────────────────

  dsil: {
    nom: 'DSIL — Dotation de Soutien à l\'Investissement Local',
    niveau: 'national',
    reglementBase: 'Article L2334-42 du CGCT',
    gestionnaire: 'Préfets de département / région',
    tauxMax: 80,
    montantMin: 20000,
    porteurEligibles: [
      'commune', 'epci', 'syndicat_mixte', 'metropole',
    ],
    secteurs: [
      'renovation_thermique', 'transition_ecologique',
      'equipements_publics', 'securisation',
      'numerique', 'mobilite', 'logement',
    ],
    piecesjustificatives: [
      'deliberation_conseil', 'descriptif_plan_financement',
      'devis_estimatif', 'plan_situation', 'rib',
      'certificat_non_financement_anterieur',
    ],
    calendrier: {
      ouverture: 'Janvier – Mars (circulaire préfectorale)',
      depot: 'Mars – Avril selon préfecture',
      decision: 'Avant fin juin (arrêté attributif)',
      versement: 'Sur présentation justificatifs de dépenses',
    },
    alertes: [
      { condition: 'porteur_non_collectivite', message: 'La DSIL est réservée aux collectivités territoriales et syndicats mixtes.', niveau: 'error' },
      { condition: 'taux > 80', message: 'Taux maximum DSIL = 80% du montant HT des travaux.', niveau: 'error' },
    ],
  },

  detr: {
    nom: 'DETR — Dotation d\'Équipement des Territoires Ruraux',
    niveau: 'national',
    reglementBase: 'Articles L2334-36 et suivants du CGCT',
    gestionnaire: 'Commission DETR (Préfecture de département)',
    tauxMin: 20,
    tauxMax: 80,
    montantMax: 500000,
    conditionPopulation: 'Communes < 20 000 hab. ou EPCI < 150 000 hab.',
    porteurEligibles: ['commune', 'epci', 'syndicat_mixte'],
    secteurs: [
      'eau_assainissement', 'energie', 'batiments_communaux',
      'voirie', 'equipements_sportifs', 'developpement_eco',
      'services_population',
    ],
    piecesjustificatives: [
      'deliberation_conseil', 'descriptif_plan_financement',
      'devis_estimatif', 'plan_situation', 'rib',
    ],
    alertes: [
      { condition: 'commune_sup_20000', message: 'DETR réservée aux communes < 20 000 hab. et EPCI < 150 000 hab.', niveau: 'error' },
      { condition: 'montant > 100000', message: 'Avis de la Commission DETR obligatoire pour les subventions > 100 000 €.', niveau: 'warning' },
      { condition: 'taux > 80', message: 'Taux maximum DETR = 80%.', niveau: 'error' },
      { condition: 'taux < 20', message: 'Taux minimum DETR = 20%.', niveau: 'warning' },
    ],
  },

  fonds_vert: {
    nom: 'Fonds Vert — Accélération de la Transition Écologique',
    niveau: 'national',
    reglementBase: 'Circulaire PM 6296/SG du 22/12/2022 + circulaires annuelles DGEB',
    gestionnaire: 'Préfectures de région et de département',
    tauxMin: 25,
    tauxMax: 80,
    bonusQPV: 10,
    bonusRural: 10,
    montantTravailMin: 300000,
    porteurEligibles: [
      'commune', 'epci', 'departement', 'region',
      'syndicat_mixte', 'metropole', 'epa', 'epic',
    ],
    secteurs: [
      'renovation_thermique', 'renaturation_villes',
      'recyclage_foncier', 'prevention_risques_naturels',
      'mobilite_douce', 'biodiversite',
    ],
    volets: [
      'A — Rénovation énergétique des bâtiments publics (taux 25-60%)',
      'B — Renaturation des villes (taux 50-80%)',
      'C — Recyclage foncier / réhabilitation friches (taux 40-80%)',
      'D — Prévention des risques naturels GEMAPI (taux 40-60%)',
      'E — Mobilité douce (vélos, piétons, intermodalité) (taux 50-80%)',
      'F — Biodiversité, trame verte et bleue (taux 50-80%)',
    ],
    piecesjustificatives: [
      'deliberation', 'bilan_thermique_audit',
      'plan_financement_pluriannuel',
      'trois_devis_sup_40k', 'photos_plans',
      'attestation_propriete_bail',
    ],
    alertes: [
      { condition: 'pas_collectivite', message: 'Le Fonds Vert est réservé aux collectivités territoriales et leurs établissements.', niveau: 'error' },
      { condition: 'volet_A && travaux < 300000', message: 'Volet A Fonds Vert : plancher de 300 000 € HT de travaux.', niveau: 'warning' },
      { condition: 'taux > 80', message: 'Taux maximum Fonds Vert = 80%.', niveau: 'error' },
    ],
  },

  anru_npnru: {
    nom: 'ANRU / NPNRU — Nouveau Programme National de Renouvellement Urbain',
    niveau: 'national',
    reglementBase: 'Loi n°2003-710 du 01/08/2003 + Règlement Financier ANRU 2022',
    gestionnaire: 'ANRU (délégués territoriaux)',
    tauxMax: 80,
    conditionTerritoire: 'QPV ou NPNRU avec convention ANRU active',
    porteurEligibles: [
      'commune', 'epci', 'metropole',
      'office_hlm', 'sem', 'spl',
      'association_loi_1901',
    ],
    secteurs: ['renovation_urbaine', 'logement', 'equipements_publics'],
    operations: [
      'Démolition de logements sociaux',
      'Reconstruction de logements (hors site)',
      'Réhabilitation et résidentialisation',
      'Aménagement d\'espaces publics',
      'Équipements publics (groupe scolaire, crèche...)',
      'Requalification d\'activités économiques',
      'Ingénierie (AMO, concertation, évaluation)',
      'Résorption copropriétés dégradées',
    ],
    piecesjustificatives: [
      'convention_renouvellement_urbain_anru',
      'plan_guide_valide',
      'bilan_social_relogement',
      'charte_insertion_professionnelle',
      'charte_nationale_insertion_10pct_heures',
      'rib', 'deliberation_instance_dirigeante',
    ],
    alertes: [
      { condition: 'pas_QPV_NPNRU', message: 'ANRU/NPNRU : opération réservée aux QPV et NPNRU avec convention ANRU signée.', niveau: 'error' },
      { condition: 'pas_convention_anru', message: 'Une convention de renouvellement urbain ANRU est obligatoire.', niveau: 'error' },
    ],
  },

  bop_147: {
    nom: 'BOP 147 — Politique de la Ville',
    niveau: 'national',
    reglementBase: 'Loi n°2014-173 du 21/02/2014 (loi Lamy)',
    gestionnaire: 'Préfets délégués à la politique de la ville / ANCT',
    tauxMax: 80,
    montantMin: 3000,
    montantMax: 50000,
    porteurEligibles: [
      'association_loi_1901', 'commune', 'epci', 'metropole',
    ],
    conditionTerritoire: 'Action localisée en QPV ou rayonnant sur QPV',
    secteurs: [
      'cohesion_sociale', 'reussite_educative', 'sante',
      'culture', 'sport', 'solidarites',
      'emploi_insertion', 'entrepreneuriat', 'acces_droits',
    ],
    piecesjustificatives: [
      'rapport_activite_N1', 'bilan_financier_N1',
      'projet_association', 'lettre_agrement', 'rib',
      'statuts_association', 'justificatif_QPV',
      'deliberation_instance_dirigeante',
    ],
    outilSaisie: 'DAUPHIN (ANCT) — saisie obligatoire en ligne',
    alertes: [
      { condition: 'pas_QPV', message: 'BOP 147 : l\'action doit être localisée en QPV ou rayonner directement sur un QPV.', niveau: 'error' },
      { condition: 'montant > 23000', message: 'Une évaluation de l\'action est obligatoire si la subvention dépasse 23 000 €.', niveau: 'warning' },
      { condition: 'association_sans_rapport_N1', message: 'Le rapport d\'activité N-1 est obligatoire pour les reconductions de subvention.', niveau: 'warning' },
    ],
  },

  ademe_fonds_chaleur: {
    nom: 'ADEME — Fonds Chaleur (Énergies Renouvelables Thermiques)',
    niveau: 'national',
    reglementBase: 'Conventions-cadre ADEME par programme annuel',
    gestionnaire: 'ADEME (directions régionales)',
    tauxMax: 60,
    tauxMin: 20,
    montantMin: 50000,
    porteurEligibles: [
      'commune', 'epci', 'region', 'office_hlm',
      'pme', 'eti', 'sa', 'sarl', 'sas',
    ],
    secteurs: ['energie', 'transition_ecologique', 'renovation_thermique'],
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'etude_faisabilite', 'plan_financement_pluriannuel',
      'justificatifs_capacite_financiere',
    ],
    alertes: [
      { condition: 'puissance_inf_1000_MWh', message: 'Fonds Chaleur : plancher de 200 TEP/an ou 1 000 MWh/an de production.', niveau: 'warning' },
    ],
  },

  ademe_eco_circulaire: {
    nom: 'ADEME — AAP Économie Circulaire',
    niveau: 'national',
    reglementBase: 'Appel à projets ADEME économie circulaire (annuel)',
    gestionnaire: 'ADEME nationale et régionale',
    tauxMax: 80,
    tauxStandard: 50,
    porteurEligibles: [
      'commune', 'epci', 'region', 'association_loi_1901',
      'pme', 'eti', 'scop', 'scic',
    ],
    secteurs: ['economie_circulaire', 'transition_ecologique'],
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'etude_faisabilite', 'plan_suivi_evaluation',
    ],
    alertes: [],
  },

  bpifrance_inov: {
    nom: 'Bpifrance — Aide à l\'Innovation (i-Nov / France 2030)',
    niveau: 'national',
    reglementBase: 'Loi n°2012-1559 créant Bpifrance + France 2030',
    gestionnaire: 'Bpifrance',
    tauxMax: 65,
    tauxStandard: 45,
    montantMin: 300000,
    montantMax: 5000000,
    porteurEligibles: ['pme', 'startup', 'eti', 'scop', 'scic'],
    secteurs: ['innovation', 'recherche_developpement', 'numerique', 'sante', 'energie'],
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'etude_faisabilite', 'justificatifs_capacite_financiere',
    ],
    alertes: [
      { condition: 'porteur_non_pme', message: 'Les aides Bpifrance i-Nov sont principalement destinées aux PME et startups innovantes.', niveau: 'warning' },
    ],
  },

  fonjep: {
    nom: 'FONJEP — Fonds de Coopération de la Jeunesse et de l\'Éducation Populaire',
    niveau: 'national',
    reglementBase: 'Décret n°2017-1104 du 27 juin 2017',
    gestionnaire: 'DJEPVA / DRAJES',
    tauxMax: 100,
    montantMax: 10000,
    porteurEligibles: ['association_loi_1901'],
    secteurs: ['jeunesse', 'education', 'sport', 'culture'],
    piecesjustificatives: [
      'statuts_association', 'rapport_activite_N1',
      'bilan_financier_N1', 'rib', 'deliberation_instance_dirigeante',
    ],
    alertes: [
      { condition: 'pas_association', message: 'Les postes FONJEP sont réservés aux associations loi 1901.', niveau: 'error' },
      { condition: 'association_moins_1an', message: 'L\'association doit avoir au moins 1 an d\'ancienneté pour candidater au FONJEP.', niveau: 'error' },
    ],
  },

  fej: {
    nom: 'FEJ — Fonds d\'Expérimentation pour la Jeunesse',
    niveau: 'national',
    reglementBase: 'Article 25 de la loi n°2008-1249 du 1er décembre 2008',
    gestionnaire: 'INJEP / DJEPVA',
    tauxMax: 80,
    tauxStandard: 50,
    montantMin: 50000,
    montantMax: 500000,
    porteurEligibles: ['association_loi_1901', 'commune', 'epci', 'universite'],
    secteurs: ['jeunesse', 'insertion_emploi', 'education'],
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'plan_suivi_evaluation',
    ],
    alertes: [
      { condition: 'public_cible_pas_jeunes', message: 'FEJ : public cible obligatoirement les jeunes de 16 à 25 ans.', niveau: 'error' },
    ],
  },

  fnadt: {
    nom: 'FNADT / ANCT — Fonds National d\'Aménagement et de Développement du Territoire',
    niveau: 'national',
    reglementBase: 'Loi n°95-115 du 4 février 1995 + CPER 2021-2027',
    gestionnaire: 'ANCT / Préfectures de région',
    tauxMax: 80,
    tauxStandard: 50,
    porteurEligibles: [
      'commune', 'epci', 'departement', 'region',
      'association_loi_1901', 'gip',
    ],
    secteurs: ['developpement_eco', 'services_population', 'numerique'],
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib', 'deliberation_conseil',
    ],
    alertes: [],
  },

  // ── FONDS RÉGIONAUX (générique) ───────────────────────────────────

  programme_regional: {
    nom: 'Programme régional — Aide de la Région',
    niveau: 'regional',
    reglementBase: 'CGCT Art. L4211-1 et suivants + Règlement d\'intervention régional',
    gestionnaire: 'Conseil régional',
    tauxMax: 70,
    tauxStandard: 30,
    porteurEligibles: [
      'commune', 'epci', 'departement',
      'association_loi_1901', 'organisme_formation',
      'pme', 'eti', 'scop', 'scic', 'universite',
    ],
    secteurs: [
      'formation', 'developpement_eco', 'innovation',
      'culture', 'sport', 'transition_ecologique',
      'mobilite', 'numerique', 'agriculture',
    ],
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'deliberation_instance_dirigeante', 'devis_estimatif',
    ],
    alertes: [
      { condition: 'hors_territoire_regional', message: 'Vérifier que le projet est bien localisé dans la région gestionnaire du fonds.', niveau: 'warning' },
    ],
  },

  // ── FONDS DÉPARTEMENTAUX (générique) ──────────────────────────────

  programme_departemental: {
    nom: 'Programme départemental — Aide du Département',
    niveau: 'departemental',
    reglementBase: 'CGCT Art. L3211-1 et suivants + délibérations du Conseil Départemental',
    gestionnaire: 'Conseil départemental',
    tauxMax: 80,
    tauxStandard: 30,
    porteurEligibles: [
      'commune', 'epci', 'association_loi_1901',
    ],
    secteurs: [
      'action_sociale', 'culture', 'sport',
      'tourisme', 'agriculture', 'voirie',
    ],
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'deliberation_instance_dirigeante', 'devis_estimatif',
    ],
    alertes: [],
  },

  // ── FONDATIONS PRIVÉES ────────────────────────────────────────────

  fondation_de_france: {
    nom: 'Fondation de France — Appels à Projets Thématiques',
    niveau: 'prive',
    reglementBase: 'Statuts Fondation de France + règlements AAP annuels',
    gestionnaire: 'Fondation de France',
    tauxMax: 80,
    tauxStandard: 60,
    montantMin: 5000,
    montantMax: 200000,
    porteurEligibles: ['association_loi_1901', 'fondation_rup'],
    secteurs: [
      'solidarites', 'sante', 'transition_ecologique', 'culture',
      'inclusion_sociale', 'jeunesse',
    ],
    piecesjustificatives: [
      'statuts_association', 'rapport_activite_N1',
      'bilan_financier_N1', 'rib', 'projet_association',
    ],
    alertes: [
      { condition: 'pas_association', message: 'Les subventions Fondation de France sont réservées aux associations et fondations.', niveau: 'error' },
    ],
  },

  mecenat_entreprise: {
    nom: 'Mécénat d\'Entreprise',
    niveau: 'prive',
    reglementBase: 'Loi n°2003-709 + art. 238 bis CGI (réduction IS 60%, plafond 0,5% CA)',
    gestionnaire: 'Entreprise mécène',
    tauxMax: 100,
    porteurEligibles: [
      'association_loi_1901', 'fondation_rup',
      'commune', 'hopital_chu', 'universite',
    ],
    secteurs: [
      'culture', 'sport', 'solidarites', 'sante',
      'education', 'transition_ecologique',
    ],
    piecesjustificatives: [
      'statuts_organisme', 'bilan_certifie', 'rib',
      'rapport_activite_N1',
    ],
    alertes: [
      { condition: 'structure_commerciale', message: 'Seules les structures d\'intérêt général peuvent recevoir des dons ouvrant droit à réduction d\'IS pour le mécène.', niveau: 'warning' },
    ],
  },
};

// ─── MOTEUR DE RECOMMANDATION FONDS ─────────────────────────────────────────
export function recommanderFonds(
  typeStructure: TypeStructure,
  niveaux: NiveauFonds[],
  secteurs: string[],
  territoire: TerritoireFlags,
  coutTotal: number,
): FondsRecommande[] {
  return Object.entries(FONDS_CONFIG)
    .filter(([, config]) => {
      if (!niveaux.includes(config.niveau)) return false;
      if (!config.porteurEligibles.includes(typeStructure)) return false;
      return secteurs.some(s => config.secteurs?.includes(s));
    })
    .map(([id, config]) => {
      let tauxApplicable = config.tauxStandard ?? config.tauxMax;
      if (territoire.isQPV && config.bonusQPV)
        tauxApplicable = Math.min(tauxApplicable + config.bonusQPV, config.tauxMax);
      if (territoire.isDOMTOM && config.bonusDOMTOM)
        tauxApplicable = Math.min(config.bonusDOMTOM, config.tauxMax);
      if (territoire.isZoneMontagne && config.bonusMontagne)
        tauxApplicable = Math.min(tauxApplicable + config.bonusMontagne, config.tauxMax);
      if (territoire.isZoneRurale && config.bonusRural)
        tauxApplicable = Math.min(tauxApplicable + config.bonusRural, config.tauxMax);

      return {
        id,
        nom: config.nom,
        niveau: config.niveau,
        tauxApplicable,
        subventionEstimee: Math.round(coutTotal * tauxApplicable / 100),
        alertes: config.alertes,
        piecesjustificatives: config.piecesjustificatives,
        mentionObligatoire: config.mentionObligatoire,
      };
    })
    .sort((a, b) => b.subventionEstimee - a.subventionEstimee);
}

// ─── VÉRIFICATEUR DE CUMUL INTER-FONDS ──────────────────────────────────────
export function verifierCumul(fonds1: string, fonds2: string): CumulResult {
  const regles: Record<string, CumulResult> = {
    'feder+fse_plus': {
      compatible: 'conditionnel',
      condition: 'Dépenses distinctes obligatoires pour chaque fonds',
      reference: 'Art. 63 Règlement (UE) 2021/1060',
    },
    'dsil+fse_plus': {
      compatible: 'oui',
      condition: 'DSIL peut constituer contrepartie nationale FSE+',
    },
    'detr+dsil': {
      compatible: 'oui',
      condition: 'Cumulable — taux total financement public ≤ 80%',
    },
    'fonds_vert+fse_plus': {
      compatible: 'oui',
      condition: 'Périmètres distincts (investissement vs fonctionnement)',
    },
    'fonds_vert+feder': {
      compatible: 'conditionnel',
      condition: 'Dépenses distinctes obligatoires',
      reference: 'Art. 63 Règlement (UE) 2021/1060',
    },
    'bop_147+fse_plus': {
      compatible: 'oui',
      condition: 'Périmètres d\'action distincts recommandés',
    },
    'bop_147+feder': {
      compatible: 'oui',
      condition: 'Cumulable si dépenses différentes',
    },
    'bop_147+dsil': {
      compatible: 'oui',
      condition: 'Cumulable sans restriction spécifique',
    },
    'anru_npnru+feder': {
      compatible: 'conditionnel',
      condition: 'Dépenses strictement distinctes — pas de double financement',
      reference: 'Art. 63 Règlement (UE) 2021/1060',
    },
    'feader+feder': {
      compatible: 'non',
      condition: 'Impossible — une même dépense ne peut être financée par 2 fonds UE',
      reference: 'Art. 63 Règlement (UE) 2021/1060',
    },
    'feader+fse_plus': {
      compatible: 'non',
      condition: 'Impossible — une même dépense ne peut être financée par 2 fonds UE',
      reference: 'Art. 63 Règlement (UE) 2021/1060',
    },
    'horizon_europe+feder': {
      compatible: 'non',
      condition: 'Non cumulable sur mêmes dépenses',
      reference: 'Art. 63 Règlement (UE) 2021/1060',
    },
    'programme_regional+fse_plus': {
      compatible: 'oui',
      condition: 'Financement régional peut constituer contrepartie nationale FSE+',
    },
    'programme_regional+feder': {
      compatible: 'oui',
      condition: 'Financement régional peut constituer contrepartie nationale FEDER',
    },
    'programme_departemental+fse_plus': {
      compatible: 'oui',
      condition: 'Financement départemental peut constituer contrepartie nationale FSE+',
    },
  };

  const key = [fonds1, fonds2].sort().join('+');
  return regles[key] ?? {
    compatible: 'a_verifier',
    condition: 'Règle de cumul non définie — consulter l\'autorité de gestion compétente',
  };
}

// ─── CALCULATEUR DE TAUX ─────────────────────────────────────────────────────
export function calculerTauxApplicable(
  fondsId: string,
  territoire: TerritoireFlags,
): number {
  const config = FONDS_CONFIG[fondsId];
  if (!config) return 0;

  let taux = config.tauxStandard ?? config.tauxMax;
  if (territoire.isQPV && config.bonusQPV)
    taux = Math.min(taux + config.bonusQPV, config.tauxMax);
  if (territoire.isDOMTOM && config.bonusDOMTOM)
    taux = Math.min(config.bonusDOMTOM, config.tauxMax);
  if (territoire.isZoneMontagne && config.bonusMontagne)
    taux = Math.min(taux + config.bonusMontagne, config.tauxMax);
  if (territoire.isZoneRurale && config.bonusRural)
    taux = Math.min(taux + config.bonusRural, config.tauxMax);

  return taux;
}

// ─── VÉRIFICATEUR MINIMIS ────────────────────────────────────────────────────
export function verifierMinimis(
  montantTotal3ans: number,
  typeStructure: TypeStructure,
): { conforme: boolean; message: string } {
  const isEntrepriseCommerciale = [
    'sas', 'sarl', 'sa', 'pme', 'startup', 'eti',
  ].includes(typeStructure);

  if (!isEntrepriseCommerciale) {
    return {
      conforme: true,
      message: 'Règle de minimis non applicable (structure non commerciale).',
    };
  }

  const seuil = 300000; // Seuil relevé au 01/01/2024 (Règl. 2023/2831)
  if (montantTotal3ans > seuil) {
    return {
      conforme: false,
      message: `Règle de minimis dépassée : ${montantTotal3ans.toLocaleString('fr-FR')} € sur 3 exercices > plafond de 300 000 € (Règl. 2023/2831). Une notification d'aide d'État est requise.`,
    };
  }

  return {
    conforme: true,
    message: `Règle de minimis respectée (${montantTotal3ans.toLocaleString('fr-FR')} € < 300 000 €).`,
  };
}

