export function openSummaryWindow(title: string, content: string) {
  const w = window.open('', '_blank', 'width=650,height=550');
  if (!w) return;
  w.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'DM Sans', sans-serif; padding: 32px; margin:0; color: #1a1d2e; background: #fff; }
          h1 { font-size: 22px; color: #003178; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
          .card { background: #f8fafc; border-radius: 14px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
          .patient { font-size: 14px; color: #5c6575; margin-bottom: 16px; }
          .medicament { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; padding: 12px; background: #fff; border-radius: 10px; border-left: 4px solid #003178; }
          .medicament .nom { font-weight: 700; font-size: 16px; color: #003178; }
          .medicament .detail { font-size: 14px; color: #1a1d2e; }
          .notice { font-size: 14px; color: #5c6575; margin-top: 10px; }
          .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
          .badge-success { background: #dcfce7; color: #166534; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>📋 ${title}</h1>
        ${content}
        <p style="margin-top: 24px; text-align: right; font-size: 11px; color: #6b7280;">Généré automatiquement par le SIH — CHU Andrainjato</p>
        <script>setTimeout(() => window.print(), 300);</script>
      </body>
    </html>
  `);
  w.document.close();
}
