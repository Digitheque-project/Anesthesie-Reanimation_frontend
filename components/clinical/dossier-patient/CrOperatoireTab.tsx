'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Icone } from '@/components/ui/Icone';

// Compte-rendu opératoire du patient = ses protocoles opératoires, rédigés au bloc par le
// chirurgien et l'anesthésiste (backend du bloc, GET /protocoles-operatoires?patientId=), comme
// dans la Clinique. Il était cherché dans le service Dossier Patient
// (/patients/:id/cr-operatoire), qui n'a pas cette route : l'onglet restait toujours vide.
// Lecture seule : la saisie se fait dans le parcours du bloc (protocole anesthésique).

interface Intervenant { nom?: string; prenom?: string }
interface Valeur { coche?: boolean; valeur?: string }
interface Perfusion { valeur?: string; enY?: string }
interface Protocole {
  id: string;
  dateOperation?: string | null;
  createdAt?: string;
  compteRenduIntervention?: string | null;
  compteRenduAnesthesique?: string | null;
  personnelIntervention?: string | null;
  surveillance?: Record<string, Valeur> | null;
  drainages?: { id: string; type?: string; mode?: string; cote?: string }[];
  prescriptions?: {
    perfusionBrasGauche?: Perfusion; perfusionBrasDroit?: Perfusion; voieCentrale?: Perfusion;
    antibiotiques?: string; antalgiques?: string; autres?: string;
  } | null;
  chirurgien?: Intervenant | null;
  anesthesiste?: Intervenant | null;
}

const nomDe = (i?: Intervenant | null) => (i ? [i.prenom, i.nom].filter(Boolean).join(' ') : '');
const dateDe = (p: Protocole) => {
  const d = p.dateOperation || p.createdAt;
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Date non renseignée';
};
const SURVEILLANCE: Record<string, string> = { ta: 'Tension artérielle', pouls: 'Pouls', fr: 'Fréquence respiratoire', temperature: 'Température', diurese: 'Diurèse', autres: 'Autres' };

function Bloc({ titre, icone, children }: { titre: string; icone: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5">
      <h4 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#005b82]">
        <Icone nom={icone} className="text-[14px]" /> {titre}
      </h4>
      {children}
    </section>
  );
}

const Texte = ({ v }: { v?: string | null }) =>
  v?.trim() ? <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{v}</p> : <p className="text-[13px] italic text-slate-400">Non renseigné</p>;

export function CrOperatoireTab({ patientId }: { patientId: string }) {
  const [liste, setListe] = useState<Protocole[]>([]);
  const [choisi, setChoisi] = useState<Protocole | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    apiClient.get('/protocoles-operatoires', { params: { patientId, page: 1, limite: 50 } })
      .then(({ data }) => {
        if (annule) return;
        const l: Protocole[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setListe(l);
        setChoisi(l[0] ?? null);
        setErreur(null);
      })
      .catch((e) => { if (!annule) setErreur(e?.response?.data?.message || e?.message || 'Comptes-rendus indisponibles'); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [patientId]);

  if (chargement) {
    return <div className="space-y-3 p-6">{[1, 2, 3].map((k) => <div key={k} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>;
  }
  if (erreur) {
    return <div className="m-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">{erreur}</div>;
  }
  if (liste.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F7FF] text-[#005b82]"><Icone nom="content_cut" className="text-[24px]" /></span>
        <p className="text-[14px] font-bold text-slate-700">Aucun compte-rendu opératoire</p>
        <p className="mt-1 text-[12px] text-slate-400">Le compte-rendu est rédigé au bloc (protocole opératoire), après l&apos;intervention.</p>
      </div>
    );
  }

  const p = choisi ?? liste[0];
  const surv = Object.entries(p.surveillance ?? {}).filter(([, v]) => v?.coche || v?.valeur?.trim());
  const presc = p.prescriptions ?? {};
  const perfusions = [
    ['Perfusion bras gauche', presc.perfusionBrasGauche], ['Perfusion bras droit', presc.perfusionBrasDroit], ['Voie centrale', presc.voieCentrale],
  ].filter(([, v]) => (v as Perfusion | undefined)?.valeur?.trim()) as [string, Perfusion][];

  return (
    <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-2">
        <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{liste.length} intervention{liste.length > 1 ? 's' : ''}</p>
        {liste.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setChoisi(x)}
            className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${x.id === p.id ? 'bg-[#CFE9EF] text-[#005b82]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
          >
            <p className="text-[13px] font-bold">{dateDe(x)}</p>
            <p className="mt-0.5 truncate text-[11px] opacity-80">{nomDe(x.chirurgien) || 'Chirurgien non renseigné'}</p>
          </button>
        ))}
      </aside>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[16px] font-extrabold text-slate-800">Intervention du {dateDe(p)}</h3>
          {nomDe(p.chirurgien) && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Chirurgien : {nomDe(p.chirurgien)}</span>}
          {nomDe(p.anesthesiste) && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Anesthésiste : {nomDe(p.anesthesiste)}</span>}
        </div>
        <Bloc titre="Compte-rendu de l'intervention" icone="description"><Texte v={p.compteRenduIntervention} /></Bloc>
        <Bloc titre="Compte-rendu anesthésique" icone="vaccines"><Texte v={p.compteRenduAnesthesique} /></Bloc>
        <Bloc titre="Personnel de l'intervention" icone="groups"><Texte v={p.personnelIntervention} /></Bloc>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Bloc titre="Surveillance post-opératoire" icone="monitor_heart">
            {surv.length ? (
              <ul className="space-y-1.5 text-[13px] text-slate-700">
                {surv.map(([k, v]) => <li key={k}><span className="font-semibold">{SURVEILLANCE[k] ?? k}</span>{v?.valeur?.trim() ? ` : ${v.valeur}` : ''}</li>)}
              </ul>
            ) : <Texte />}
          </Bloc>
          <Bloc titre="Drainages" icone="water_drop">
            {p.drainages?.length ? (
              <ul className="space-y-1.5 text-[13px] text-slate-700">
                {p.drainages.map((d) => <li key={d.id}>{[d.type, d.mode, d.cote].filter(Boolean).join(' · ')}</li>)}
              </ul>
            ) : <Texte />}
          </Bloc>
        </div>
        <Bloc titre="Prescriptions post-opératoires" icone="medication">
          {perfusions.length || presc.antibiotiques?.trim() || presc.antalgiques?.trim() || presc.autres?.trim() ? (
            <ul className="space-y-1.5 text-[13px] text-slate-700">
              {perfusions.map(([l, v]) => <li key={l}><span className="font-semibold">{l}</span> : {v.valeur}{v.enY?.trim() ? ` (en Y : ${v.enY})` : ''}</li>)}
              {presc.antibiotiques?.trim() && <li><span className="font-semibold">Antibiotiques</span> : {presc.antibiotiques}</li>}
              {presc.antalgiques?.trim() && <li><span className="font-semibold">Antalgiques</span> : {presc.antalgiques}</li>}
              {presc.autres?.trim() && <li><span className="font-semibold">Autres</span> : {presc.autres}</li>}
            </ul>
          ) : <Texte />}
        </Bloc>
      </div>
    </div>
  );
}

export default CrOperatoireTab;
