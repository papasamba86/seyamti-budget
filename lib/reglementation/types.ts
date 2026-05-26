export type NiveauFonds = 'europeen' | 'national' | 'regional' | 'departemental' | 'prive';

export type TypeStructure =
  | 'commune' | 'epci' | 'departement' | 'region' | 'metropole'
  | 'syndicat_mixte' | 'epa' | 'epic' | 'gip' | 'spl' | 'sem'
  | 'association_loi_1901' | 'fondation_rup'
  | 'organisme_formation' | 'groupement_employeurs'
  | 'office_hlm' | 'universite' | 'hopital_chu'
  | 'agriculteur' | 'cooperative'
  | 'sas' | 'sarl' | 'sa' | 'pme' | 'startup' | 'eti' | 'scop' | 'scic' | 'gie'
  | 'autre';

export type StatutFiche = 'brouillon' | 'en_cours' | 'soumis' | 'valide' | 'refuse' | 'archive';

export interface Alerte {
  condition: string;
  message: string;
  niveau: 'error' | 'warning' | 'info';
}

export interface CalendrierFonds {
  ouverture?: string;
  depot?: string;
  decision?: string;
  versement?: string;
}

export interface DisposiifLeader {
  tauxMax: number;
  montantMin: number;
  montantMax: number;
  porteurLeader: string;
}

export interface FondsConfig {
  nom: string;
  niveau: NiveauFonds;
  reglementBase: string;
  programmeOperationnel?: string;
  periodeEligibilite?: { debut: string; fin: string };
  gestionnaire?: string;
  tauxMax: number;
  tauxMin?: number;
  tauxStandard?: number;
  tauxEntiteLucrative?: number;
  tauxEntiteNonLucrative?: number;
  tauxIndirects?: number;
  bonusQPV?: number;
  bonusDOMTOM?: number;
  bonusMontagne?: number;
  bonusRural?: number;
  montantMin?: number;
  montantMax?: number;
  montantTravailMin?: number;
  conditionPopulation?: string;
  conditionTerritoire?: string;
  porteurEligibles: TypeStructure[];
  secteurs: string[];
  objectifsPolitique?: string[];
  operations?: string[];
  volets?: string[];
  depensesEligibles?: string[];
  depensesIneligibles?: string[];
  tauxForfaitIndirect?: number[];
  tauxForfaitIndirectDefaut?: number;
  seuil500k?: boolean;
  principesHorizontauxObligatoires?: boolean;
  suiviParticipantsObligatoire?: boolean;
  publiciteFSEObligatoire?: boolean;
  questionnaireDGEFPObligatoire?: boolean;
  logosObligatoires?: string[];
  mentionObligatoire?: string;
  piecesjustificatives?: string[];
  indicateursCommuns?: string[];
  formatDossier?: string;
  outilSaisie?: string;
  calendrier?: CalendrierFonds;
  alertes: Alerte[];
  consortiumObligatoire?: boolean;
  consortiumRecommande?: boolean;
  multiPaysRequisKA2?: boolean;
  multiPaysRecommande?: boolean;
  nbPaysMinimum?: number;
  accreditationESRS?: string;
  dispositifLeader?: DisposiifLeader;
  seuil500k_an?: boolean;
}

export interface FondsRecommande {
  id: string;
  nom: string;
  niveau: NiveauFonds;
  tauxApplicable: number;
  subventionEstimee: number;
  alertes: Alerte[];
  piecesjustificatives?: string[];
  mentionObligatoire?: string;
}

export interface CumulResult {
  compatible: 'oui' | 'conditionnel' | 'non' | 'a_verifier';
  condition?: string;
  reference?: string;
}

export interface TerritoireFlags {
  isQPV?: boolean;
  isNPNRU?: boolean;
  isDOMTOM?: boolean;
  isZoneRurale?: boolean;
  isZoneMontagne?: boolean;
}

export const LABELS_TYPE_STRUCTURE: Record<TypeStructure, string> = {
  commune: 'Commune',
  epci: 'EPCI / Communauté de communes',
  departement: 'Conseil départemental',
  region: 'Conseil régional',
  metropole: 'Métropole',
  syndicat_mixte: 'Syndicat mixte',
  epa: 'Établissement public administratif (EPA)',
  epic: 'Établissement public industriel et commercial (EPIC)',
  gip: 'Groupement d\'intérêt public (GIP)',
  spl: 'Société publique locale (SPL)',
  sem: 'Société d\'économie mixte (SEM)',
  association_loi_1901: 'Association loi 1901',
  fondation_rup: 'Fondation reconnue d\'utilité publique',
  organisme_formation: 'Organisme de formation (certifié Qualiopi)',
  groupement_employeurs: 'Groupement d\'employeurs',
  office_hlm: 'Office HLM / OPH / ESH / SA HLM',
  universite: 'Université / Établissement d\'enseignement supérieur',
  hopital_chu: 'Hôpital / CHU / Établissement de santé',
  agriculteur: 'Exploitant agricole / GAEC',
  cooperative: 'Coopérative agricole',
  sas: 'SAS',
  sarl: 'SARL',
  sa: 'SA',
  pme: 'PME (< 250 salariés)',
  startup: 'Startup / Jeune entreprise innovante',
  eti: 'ETI (250-4999 salariés)',
  scop: 'SCOP',
  scic: 'SCIC',
  gie: 'Groupement d\'intérêt économique (GIE)',
  autre: 'Autre structure',
};

export const LABELS_SECTEUR: Record<string, string> = {
  insertion_emploi: 'Insertion et emploi',
  formation: 'Formation professionnelle',
  inclusion_sociale: 'Inclusion sociale',
  apprentissage: 'Apprentissage',
  jeunesse: 'Jeunesse',
  egalite_chances: 'Égalité des chances',
  integration_migrants: 'Intégration des migrants',
  renovation_urbaine: 'Rénovation urbaine',
  transition_ecologique: 'Transition écologique',
  energie: 'Énergie et ENR',
  numerique: 'Numérique / Digital',
  innovation: 'Innovation et recherche',
  mobilite: 'Mobilité durable',
  logement: 'Logement social',
  education: 'Éducation / Enseignement',
  culture: 'Culture et patrimoine',
  sport: 'Sport',
  sante: 'Santé',
  agriculture: 'Agriculture et alimentation',
  biodiversite: 'Biodiversité et nature',
  economie_circulaire: 'Économie circulaire',
  climat_attenuation: 'Atténuation climatique',
  energie_propre: 'Énergie propre',
  rural: 'Développement rural',
  foret: 'Forêt et sylviculture',
  eau: 'Eau et milieux aquatiques',
  formation_agricole: 'Formation agricole',
  renovation_thermique: 'Rénovation thermique',
  equipements_publics: 'Équipements publics',
  securisation: 'Sécurisation des équipements',
  voirie: 'Voirie et réseaux',
  eau_assainissement: 'Eau et assainissement',
  batiments_communaux: 'Bâtiments communaux',
  equipements_sportifs: 'Équipements sportifs',
  developpement_eco: 'Développement économique',
  services_population: 'Services à la population',
  recherche_developpement: 'Recherche et développement',
  transport: 'Transport et infrastructures',
  alimentation: 'Alimentation / Agri-food',
  securite: 'Sécurité',
  espace: 'Spatial',
  mobilite_internationale: 'Mobilité internationale',
  integration_europeenne: 'Intégration européenne',
  cohesion_sociale: 'Cohésion sociale',
  reussite_educative: 'Réussite éducative',
  solidarites: 'Solidarités',
  emploi_insertion: 'Emploi et insertion',
  entrepreneuriat: 'Entrepreneuriat',
  acces_droits: 'Accès aux droits',
  renaturation_villes: 'Renaturation des villes',
  recyclage_foncier: 'Recyclage foncier',
  prevention_risques_naturels: 'Prévention des risques naturels',
  mobilite_douce: 'Mobilité douce',
};

export const LABELS_PIECES: Record<string, string> = {
  statuts_organisme: 'Statuts de l\'organisme et liste des dirigeants',
  bilan_certifie: 'Dernier bilan comptable certifié',
  bilan_financier_N1: 'Bilan financier N-1',
  rib: 'RIB (Relevé d\'Identité Bancaire)',
  attestation_regularite_fiscale: 'Attestation de régularité fiscale et sociale',
  deliberation_instance_dirigeante: 'Délibération de l\'instance dirigeante',
  deliberation: 'Délibération de l\'organe délibérant',
  deliberation_conseil: 'Délibération du conseil municipal ou intercommunal',
  fiches_poste_personnel: 'Fiches de poste du personnel affecté',
  lettres_mission: 'Lettres de mission avec % d\'affectation',
  contrats_participants: 'Contrats des participants',
  feuilles_emargement: 'Feuilles d\'émargement',
  questionnaires_participants: 'Questionnaires participants (entrée + sortie DGEFP)',
  factures: 'Factures et justificatifs de paiement',
  trois_devis_si_achat_sup_1000: '3 devis pour tout achat > 1 000 €',
  trois_devis_sup_40k: '3 devis estimatifs pour achats > 40 000 € HT',
  convention_plie_si_applicable: 'Convention de partenariat PLIE (si applicable)',
  descriptif_plan_financement: 'Descriptif et plan de financement',
  devis_estimatif: 'Devis estimatif ou avant-projet sommaire',
  plan_situation: 'Plan de situation et photos',
  certificat_non_financement_anterieur: 'Certificat de non-financement antérieur',
  bilan_thermique_audit: 'Bilan thermique ou audit énergétique préalable',
  plan_financement_pluriannuel: 'Plan de financement pluriannuel',
  photos_plans: 'Photos et plans du bâtiment',
  attestation_propriete_bail: 'Attestation propriété ou bail (durée > projet)',
  convention_renouvellement_urbain_anru: 'Convention de renouvellement urbain ANRU',
  plan_guide_valide: 'Plan Guide validé',
  bilan_social_relogement: 'Bilan social et plan de relogement',
  charte_insertion_professionnelle: 'Charte d\'insertion professionnelle',
  charte_nationale_insertion_10pct_heures: 'Charte nationale insertion (10% heures travaux)',
  rapport_activite_N1: 'Rapport d\'activité N-1',
  projet_association: 'Projet de l\'association (projet social/éducatif)',
  lettre_agrement: 'Lettre d\'agrément (si applicable)',
  statuts_association: 'Statuts de l\'association',
  justificatif_QPV: 'Justificatif de localisation en QPV',
  etude_faisabilite: 'Étude de faisabilité technique et financière',
  plan_suivi_evaluation: 'Plan de suivi et évaluation',
  justificatifs_capacite_financiere: 'Justificatifs de capacité financière',
  attestation_normes_env: 'Attestation de respect des normes environnementales',
};
