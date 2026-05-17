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
