export default function ScoreResume({ score }: { score: number }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-white/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-on-secondary-container text-2xl">clinical_notes</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Score SCCRE validé</p>
            <p className="text-sm font-bold text-on-surface mt-1">Le patient peut être orienté</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Score obtenu</p>
          <div className="text-3xl font-black text-secondary">
            {score}
            <span className="text-sm text-outline">/10</span>
          </div>
        </div>
      </div>
    </div>
  );
}
