-- Base de données initiale pour le module Bloc Opératoire
-- Inspirée des interfaces TypeScript définies dans types/bloc.ts

-- Type d'urgence standardisé pour les patients en bloc
CREATE TYPE niveau_urgence AS ENUM ('STAT', 'URGENT', 'NORMAL');

-- Patients planifiés en salle d'opération
CREATE TABLE bloc_patient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  intervention TEXT NOT NULL,
  heure TEXT,
  duree_prevue TEXT,
  depart_bloc TEXT,
  priorite niveau_urgence NOT NULL
);

-- Patients gérés en salle de réveil
CREATE TABLE salle_reveil_patient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  intervention TEXT NOT NULL,
  salle_lit TEXT,
  duree_prevue TEXT,
  statut TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Score SCCRE associé à un patient en salle de réveil
CREATE TABLE score_sccre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_reveil_id UUID NOT NULL REFERENCES salle_reveil_patient(id) ON DELETE CASCADE,
  motricite SMALLINT NOT NULL CHECK (motricite BETWEEN 0 AND 2),
  respiration SMALLINT NOT NULL CHECK (respiration BETWEEN 0 AND 2),
  pression SMALLINT NOT NULL CHECK (pression BETWEEN 0 AND 2),
  conscience SMALLINT NOT NULL CHECK (conscience BETWEEN 0 AND 2),
  coloration SMALLINT NOT NULL CHECK (coloration BETWEEN 0 AND 2),
  total SMALLINT GENERATED ALWAYS AS (motricite + respiration + pression + conscience + coloration) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Patients après sortie de la salle de réveil
CREATE TABLE sortie_patient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  id_dossier TEXT NOT NULL,
  chambre TEXT,
  intervention TEXT NOT NULL,
  statut TEXT CHECK (statut IN ('stable', 'instable', 'critique')) NOT NULL,
  score_sccre SMALLINT NOT NULL,
  heure_validation TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Services de destination autorisés pour l'orientation patient
CREATE TABLE service_destination (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE
);

-- Services choisis pour un patient en sortie de réveil
CREATE TABLE patient_destination_service (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sortie_patient_id UUID NOT NULL REFERENCES sortie_patient(id) ON DELETE CASCADE,
  service_destination_id UUID NOT NULL REFERENCES service_destination(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Exemple de stockage de données de checklist en JSON si nécessaire
CREATE TABLE sortie_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sortie_patient_id UUID NOT NULL REFERENCES sortie_patient(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
