export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-300">Partida no encontrada</h2>
        <p className="text-slate-500">El código puede haber expirado o ser inválido.</p>
        <a href="/" className="inline-block px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-lg">
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
