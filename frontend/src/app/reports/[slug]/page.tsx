'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function DailyReport() {
  const { slug } = useParams();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch(`http://localhost:3001/api/reports/${slug}/today`)
      .then(res => res.json())
      .then(data => setStats(data));
  }, [slug]);

  if (!stats) return <div className="p-8 text-white">Cargando reporte...</div>;

  return (
    <div className="min-h-screen bg-[#0d131a] text-white flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <h2 className="text-xl font-bold">Reporte de Cierre</h2>
      <p className="text-xs text-gray-400 mb-8 capitalize">{slug?.toString().replace('-', ' ')} · hoy</p>

      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-800">
          <span className="text-sm text-gray-400">Se unieron</span>
          <span className="text-xl font-bold">{stats.se_unieron || 0}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-800">
          <span className="text-sm text-gray-400">Se sentaron</span>
          <span className="text-xl font-bold">{stats.se_sentaron || 0}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-800">
          <span className="text-sm text-amber-500 font-medium">Se fueron sin sentarse</span>
          <span className="text-xl font-bold text-amber-500">{stats.se_fueron_sin_sentarse || 0}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-800">
          <span className="text-sm text-gray-400">No vinieron al ser llamados</span>
          <span className="text-xl font-bold">{stats.no_vinieron_al_ser_llamados || 0}</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-400">Espera media</span>
          <span className="text-xl font-bold">{stats.espera_media || 0} min</span>
        </div>
      </div>
    </div>
  );
}