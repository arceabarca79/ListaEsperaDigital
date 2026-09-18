'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '@/lib/socket';
import { API_URL } from '@/lib/config';

export default function LiveTicket() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const entryId = searchParams.get('id');

  const [data, setData] = useState<any>(null);

  const fetchStatus = () => {
    if (!entryId) return;
    fetch(`${API_URL}/api/queue/status/${entryId}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'cancelled' || resData.status === 'seated') {
          setData(null);
        } else {
          setData(resData);
        }
      });
  };

  useEffect(() => {
    fetchStatus();

    socket.emit('join_restaurant', slug);
    socket.on('queue_updated', fetchStatus);

    return () => {
      socket.off('queue_updated', fetchStatus);
    };
  }, [entryId, slug]);

  const handleCancel = async () => {
    await fetch(`${API_URL}/api/queue/cancel/${entryId}`, { method: 'POST' });
    router.push(`/wait/${slug}`);
  };

  if (!data) return <div className="p-8 text-center text-gray-400">Cargando turno...</div>;

  return (
    <div className="min-h-screen bg-[#0d131a] text-white flex flex-col justify-between px-6 py-12 max-w-md mx-auto text-center">
      <div className="mt-8">
        <p className="text-gray-400 text-sm">Estás en el puesto</p>
        <AnimatePresence mode="popLayout">
          <motion.h1
            key={data.current_rank}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.35 }}
            className="text-7xl font-extrabold my-4"
          >
            {data.current_rank}
          </motion.h1>
        </AnimatePresence>

        <p className="text-sm text-gray-400">Tiempo estimado</p>
        <p className="text-lg font-semibold text-blue-400 mt-1">≈ {data.estimated_wait} min</p>
        
        {/* Barra de progreso */}
        <div className="w-48 h-1.5 bg-gray-800 rounded-full mx-auto mt-4 overflow-hidden">
          <div className="w-1/2 h-full bg-blue-500 rounded-full"></div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-gray-500">Te avisaremos por WhatsApp cuando tu mesa esté lista</p>
        <button
          onClick={handleCancel}
          className="w-full py-3 bg-[#18222d] text-gray-300 rounded-xl hover:bg-gray-800 transition text-sm font-medium"
        >
          Ya no voy
        </button>
      </div>
    </div>
  );
}