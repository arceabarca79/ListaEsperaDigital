'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import { API_URL } from '@/lib/config';

const hostHeaders = {
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_HOST_API_KEY || ''}`
};

export default function HostView() {
  const { slug } = useParams();
  const [queue, setQueue] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const response = await fetch(`${API_URL}/api/host/queue/${slug}`, { headers: hostHeaders });
      const data = await response.json();

      if (!response.ok) {
        setQueue([]);
        setError(data?.error?.message || 'No se pudo cargar la cola');
        return;
      }

      if (!Array.isArray(data)) {
        setQueue([]);
        setError('La respuesta del servidor no tiene un formato válido');
        return;
      }

      setError(null);
      setQueue(data);
    } catch {
      setQueue([]);
      setError('No se pudo conectar con el servidor');
    }
  };

  useEffect(() => {
    fetchQueue();

    socket.emit('join_restaurant', slug);
    socket.on('queue_updated', fetchQueue);

    return () => {
      socket.off('queue_updated', fetchQueue);
    };
  }, [slug]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API_URL}/api/host/entry/${id}/status`, {
      method: 'POST',
      headers: { ...hostHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, restaurantSlug: slug })
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-6 max-w-4xl mx-auto font-sans">
      <header className="flex justify-between items-center border-b border-gray-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold capitalize">{slug?.toString().replace('-', ' ')}</h1>
        </div>
        <div className="text-sm text-gray-400">
          <span className="font-semibold text-white">{queue.length} en cola</span> · espera media 31 min[cite: 1]
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {queue.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3.5 bg-[#121922] border border-gray-800/80 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <span className="text-gray-500 cursor-grab">:::</span>
              <span className="font-bold text-base w-4 text-center">{index + 1}</span>
              <span className="font-medium">{item.name}</span>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-400">{item.party_size} pers.</span>
              <span className="text-sm text-gray-400">{item.waiting_minutes || 0} min</span>

              {item.is_frequent === 1 && (
                <span className="bg-amber-950/80 text-amber-400 border border-amber-800/50 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  Frecuente
                </span>
              )}

              {item.status === 'called' ? (
                <button
                  onClick={() => updateStatus(item.id, 'on_the_way')}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs px-4 py-2 rounded-lg transition"
                >
                  En camino
                </button>
              ) : item.status === 'on_the_way' ? (
                <button
                  onClick={() => updateStatus(item.id, 'seated')}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition"
                >
                  Sentar
                </button>
              ) : (
                <button
                  onClick={() => updateStatus(item.id, 'called')}
                  className="bg-white hover:bg-gray-200 text-black font-semibold text-xs px-4 py-2 rounded-lg transition"
                >
                  Llamar
                </button>
              )}
            </div>
          </div>
        ))}

        {queue.length === 0 && (
          <p className="text-center text-gray-500 py-16">No hay comensales en lista de espera.</p>
        )}
      </div>
    </div>
  );
}