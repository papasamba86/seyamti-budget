import { z } from 'zod';

export const registerSchema = z.object({
  email:   z.string().email('Email invalide').max(255),
  password: z.string().min(8, 'Minimum 8 caractères').max(100),
  nom:     z.string().min(1).max(100).trim(),
  prenom:  z.string().min(1).max(100).trim(),
  role:    z.enum(['admin', 'editeur', 'lecteur']).default('lecteur'),
});

export const actionSchema = z.object({
  nom:         z.string().min(1, 'Nom requis').max(255).trim(),
  description: z.string().max(2000).optional().default(''),
  annee:       z.number().int().min(2000).max(2100),
  statut:      z.enum(['en_cours', 'termine', 'suspendu']).default('en_cours'),
});

export const budgetLigneSchema = z.object({
  action_id:     z.number().int().positive().optional(),
  type_flux:     z.enum(['charge', 'produit', 'contribution_emploi', 'contribution_ressource']),
  code_compte:   z.string().max(10).optional().default(''),
  categorie:     z.string().min(1).max(255).trim(),
  sous_categorie: z.string().max(255).optional().default(''),
  montant:       z.number().min(0).default(0),
  ordre:         z.number().int().min(0).default(0),
});

export const budgetStructureLigneSchema = budgetLigneSchema.omit({ action_id: true });

export const depensePersonnelSchema = z.object({
  action_id:              z.number().int().positive(),
  emploi_id:              z.number().int().positive(),
  agent_nom:              z.string().max(255).optional().default(''),
  pourcentage_affectation: z.number().min(0.01).max(1),
  heures:                 z.number().min(0).default(0),
  montant:                z.number().min(0).default(0),
});

export const depenseFonctionnementSchema = z.object({
  action_id:   z.number().int().positive(),
  libelle:     z.string().min(1, 'Libellé requis').max(255).trim(),
  code_compte: z.string().max(10).optional().default(''),
  montant:     z.number().min(0).default(0),
});

export const prestationSchema = z.object({
  action_id:   z.number().int().positive(),
  libelle:     z.string().min(1).max(255).trim(),
  cout_horaire: z.number().min(0).default(0),
  nb_heures:   z.number().min(0).default(0),
});

export const ressourceSchema = z.object({
  action_id:         z.number().int().positive(),
  financeur:         z.string().min(1).max(255).trim(),
  montant:           z.number().min(0).default(0),
  type_financement:  z.string().max(100).optional().default(''),
  date_debut:        z.string().nullable().optional(),
  date_fin:          z.string().nullable().optional(),
});

export const createUserSchema = z.object({
  email:    z.string().email('Email invalide').max(255),
  password: z.string().min(8, 'Minimum 8 caractères').max(100),
  nom:      z.string().min(1).max(100).trim(),
  prenom:   z.string().min(1).max(100).trim(),
  role:     z.enum(['editeur', 'lecteur']).default('lecteur'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword:     z.string().min(8, 'Minimum 8 caractères').max(100),
});

export const emploiSchema = z.object({
  cotation:             z.number().int().min(1),
  indice_professionnel: z.number().int().min(1),
  libelle:              z.string().min(1).max(255).trim(),
  salaire_annuel:       z.number().min(0).default(0),
});

export const controleSchema = z.object({
  budget_ligne_id: z.number().int().positive(),
  annee: z.number().int().min(2000).max(2100),
  mois: z.number().int().min(1).max(12),
  montant_prevu: z.number().min(0).default(0),
  montant_realise: z.number().min(0).default(0),
  commentaire: z.string().max(2000).optional().default(''),
});

// ── FicheProjet Pro ───────────────────────────────────────────────────────────

const financementSchema = z.object({
  financeur:        z.string().min(1, 'Financeur requis').max(500).trim(),
  fonds_id_ref:     z.string().max(100).optional().default(''),
  montant:          z.number().min(0).default(0),
  taux:             z.number().min(0).max(100).default(0),
  type_financement: z.string().max(100).optional().default(''),
  confirme:         z.boolean().optional().default(false),
});

const budgetLigneFicheSchema = z.object({
  type_depense:  z.string().min(1).max(100).trim(),
  categorie:     z.string().min(1).max(255).trim(),
  libelle:       z.string().min(1).max(500).trim(),
  montant:       z.number().min(0).default(0),
  eligible:      z.boolean().optional().default(true),
  taux_eligible: z.number().min(0).max(100).optional().default(100),
});

const pieceSchema = z.object({
  code_piece: z.string().min(1).max(100).trim(),
  libelle:    z.string().min(1).max(500).trim(),
  statut:     z.enum(['requise', 'fournie', 'non_applicable']).default('requise'),
});

export const ficheProjetSchema = z.object({
  titre:       z.string().min(1, 'Titre requis').max(500).trim(),
  fonds_id:    z.string().min(1, 'Fonds requis').max(100),
  statut:      z.enum(['brouillon', 'en_cours', 'soumis', 'valide', 'refuse', 'archive']).default('brouillon'),
  type_structure: z.string().min(1, 'Type de structure requis').max(100),

  porteur_nom:       z.string().max(500).optional().default(''),
  porteur_siret:     z.string().max(20).optional().default(''),
  porteur_adresse:   z.string().max(1000).optional().default(''),
  porteur_cp:        z.string().max(10).optional().default(''),
  porteur_ville:     z.string().max(200).optional().default(''),
  porteur_contact:   z.string().max(255).optional().default(''),
  porteur_email:     z.string().email().max(255).optional().or(z.literal('')).default(''),
  porteur_telephone: z.string().max(50).optional().default(''),

  projet_titre:        z.string().max(500).optional().default(''),
  projet_description:  z.string().max(5000).optional().default(''),
  projet_objectifs:    z.string().max(5000).optional().default(''),
  projet_territoire:   z.string().max(500).optional().default(''),
  projet_localisation: z.string().max(500).optional().default(''),
  projet_date_debut:   z.string().nullable().optional(),
  projet_date_fin:     z.string().nullable().optional(),

  cout_total:                   z.number().min(0).default(0),
  montant_subvention_demande:   z.number().min(0).default(0),
  taux_subvention:              z.number().min(0).max(100).default(0),

  is_qpv:          z.boolean().optional().default(false),
  is_npnru:        z.boolean().optional().default(false),
  is_domtom:       z.boolean().optional().default(false),
  is_zone_rurale:  z.boolean().optional().default(false),
  is_zone_montagne: z.boolean().optional().default(false),

  ph_egalite_hf:             z.boolean().optional().default(false),
  ph_non_discrimination:     z.boolean().optional().default(false),
  ph_developpement_durable:  z.boolean().optional().default(false),
  ph_details:                z.string().max(2000).optional().default(''),

  taux_indirect: z.number().min(0).max(40).default(20),

  fonds_data:   z.record(z.unknown()).optional().default({}),
  financements: z.array(financementSchema).optional().default([]),
  budget:       z.array(budgetLigneFicheSchema).optional().default([]),
  pieces:       z.array(pieceSchema).optional().default([]),
});
