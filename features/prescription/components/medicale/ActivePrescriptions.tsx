'use client';

import { PrescriptionEnCours } from './types';
import { Icone } from '@/components/ui/Icone';

interface Props {
  prescriptions: PrescriptionEnCours[];
  onTerminer: (id: string) => void;
}

export default function ActivePrescriptions({ prescriptions, onTerminer }: Props) {
  return (
    <div className="active-rx">
      <div className="active-rx-header"><Icone nom="pending_actions" /><span>Prescriptions en cours</span></div>
      {prescriptions.length > 0 ? prescriptions.map(p => (
        <div key={p.id} style={{ position: 'relative' }}>
          {p.medicaments?.map((med, idx) => (
            <div key={`${p.id}-${idx}`} className="active-rx-item">
              <strong>{med.nom} {med.dose}</strong>
              <span> — qté: {med.quantite} · {med.frequence}{med.voie ? ` · ${med.voie}` : ''}{p.prescripteur ? ` · Dr ${p.prescripteur.nom}` : ''}</span>
              {p.notifierInfirmier && <span style={{ display: 'block', fontSize: 10, color: 'var(--navy)', marginTop: 2 }}>Infirmier notifié</span>}
            </div>
          ))}
          <button
            onClick={() => onTerminer(p.id)}
            title="Terminer cette prescription"
            style={{
              position: 'absolute',
              right: 4,
              top: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--txt3)',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            <Icone nom="check_circle" />
          </button>
        </div>
      )) : (
        <div className="active-rx-item"><span style={{ color: 'var(--txt3)' }}>Aucune prescription en cours</span></div>
      )}
    </div>
  );
}
