import Link from 'next/link';
import { ArrowUpRight, BarChart3, ClipboardList, QrCode, Utensils } from 'lucide-react';

const restaurants = [
  { name: 'La Terraza Azul', slug: 'terraza-azul', wait: '4 min por grupo' },
  { name: 'Cuatro Vientos', slug: 'cuatro-vientos', wait: '5 min por grupo' },
  { name: 'Casa Mediterránea', slug: 'casa-mediterranea', wait: '4 min por grupo' }
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#111a18] text-[#f5f1e8]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link href="/" className="flex items-center gap-3" aria-label="MesaLista inicio">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6b45d] text-[#17201d]"><Utensils size={20} strokeWidth={2.5} /></span>
            <span><span className="block text-sm font-semibold uppercase tracking-[0.18em] text-[#e6b45d]">MesaLista</span><span className="block text-xs text-white/50">Control de espera</span></span>
          </Link>
          <span className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 sm:block">Panel de acceso</span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#e6b45d]">Bienvenido</p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl">La espera también puede sentirse bien.</h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-white/60 sm:text-lg">Accede rápidamente a la cola de tus restaurantes, gestiona la atención desde el local o revisa el cierre del día.</p>
            <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
              <div className="border-l-2 border-[#e6b45d] pl-4"><p className="text-sm font-medium">Cliente</p><p className="mt-1 text-xs leading-5 text-white/45">Únete a una lista y sigue tu turno en vivo.</p></div>
              <div className="border-l-2 border-white/20 pl-4"><p className="text-sm font-medium">Equipo del local</p><p className="mt-1 text-xs leading-5 text-white/45">Llama, avanza y sienta a cada grupo.</p></div>
            </div>
          </div>

          <section aria-labelledby="restaurants-title" className="relative">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#e6b45d]/10" />
            <div className="relative border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-7">
              <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-white/40">Restaurantes disponibles</p><h2 id="restaurants-title" className="mt-2 text-2xl font-semibold">Elige un espacio</h2></div><QrCode className="text-[#e6b45d]" size={28} strokeWidth={1.5} /></div>
              <div className="space-y-3">
                {restaurants.map((restaurant) => (
                  <article key={restaurant.slug} className="group border border-white/10 bg-[#17221f] p-4 transition-colors hover:border-[#e6b45d]/60">
                    <div className="flex items-center justify-between gap-4"><div><h3 className="font-medium">{restaurant.name}</h3><p className="mt-1 text-xs text-white/45">Espera estimada: {restaurant.wait}</p></div><ArrowUpRight className="text-white/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#e6b45d]" size={18} /></div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <Link href={`/wait/${restaurant.slug}`} className="flex items-center justify-center gap-1.5 bg-[#e6b45d] px-2 py-2.5 font-semibold text-[#17201d] transition-colors hover:bg-[#f2c776]"><ClipboardList size={14} /> Unirse</Link>
                      <Link href={`/host/${restaurant.slug}`} className="flex items-center justify-center gap-1.5 border border-white/10 px-2 py-2.5 text-white/75 transition-colors hover:border-white/30 hover:text-white"><Utensils size={14} /> Anfitrión</Link>
                      <Link href={`/reports/${restaurant.slug}`} className="flex items-center justify-center gap-1.5 border border-white/10 px-2 py-2.5 text-white/75 transition-colors hover:border-white/30 hover:text-white"><BarChart3 size={14} /> Reporte</Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </section>

        <footer className="border-t border-white/10 pt-5 text-xs text-white/35">Lista de espera digital para una atención más clara y humana.</footer>
      </div>
    </main>
  );
}
