const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

if (!apiUrl || !socketUrl) {
  throw new Error('Faltan NEXT_PUBLIC_API_URL o NEXT_PUBLIC_SOCKET_URL');
}

export const API_URL = apiUrl.replace(/\/$/, '');
export const SOCKET_URL = socketUrl;