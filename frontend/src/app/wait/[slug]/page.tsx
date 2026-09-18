'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function JoinWaitlist() {
  const { slug } = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);

  useEffect(() => {
    fetch(`http://localhost:3001/api/restaurants/${slug}`)
      .then(res => res.json())
      .then(data => setRestaurant(data));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:3001/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantSlug: slug,
        name,
        phone: `${restaurant?.country_code || '+51'} ${phone}`,
        partySize
      })
    });
    const data = await res.json();
    if (data.id) {
      router.push(`/wait/${slug}/live?id=${data.id}`);
    }
  };

  if (!restaurant) return <div className="p-8 text-white">Cargando local...</div>;

  return (
    <div className="min-h-screen bg-[#0d131a] text-white flex flex-col justify-center px-6 py-12 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">{restaurant.name}</h1>
      <p className="text-gray-400 text-sm mb-6">Lista de espera · hoy</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Nombre</label>
          <input
            type="text"
            required
            placeholder="Carla"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#18222d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Teléfono</label>
          <div className="flex gap-2">
            <span className="bg-[#18222d] border border-gray-700 rounded-lg p-3 text-gray-400 text-sm flex items-center">
              {restaurant.country_code}
            </span>
            <input
              type="tel"
              required
              placeholder="987 654 321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#18222d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">¿Cuántos son?</label>
          <div className="flex items-center justify-between bg-[#18222d] border border-gray-700 rounded-lg p-2">
            <button
              type="button"
              onClick={() => setPartySize(Math.max(1, partySize - 1))}
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-400 hover:text-white"
            >
              -
            </button>
            <span className="text-lg font-medium">{partySize}</span>
            <button
              type="button"
              onClick={() => setPartySize(partySize + 1)}
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-400 hover:text-white"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-6 bg-white text-black font-semibold p-3.5 rounded-xl hover:bg-gray-200 transition"
        >
          Unirme a la cola
        </button>
      </form>
    </div>
  );
}