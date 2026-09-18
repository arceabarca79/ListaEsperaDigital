require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN }
});

const ACTIVE_STATUSES = ['waiting', 'called', 'on_the_way'];
const STATUS_TRANSITIONS = {
  waiting: ['called', 'cancelled'],
  called: ['on_the_way', 'cancelled'],
  on_the_way: ['seated', 'cancelled']
};
const HOST_API_KEY = process.env.HOST_API_KEY;

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return res.status(status).json({ error });
}

function requireHostAuth(req, res, next) {
  if (!HOST_API_KEY) {
    return sendError(res, 503, 'CONFIGURATION_ERROR', 'La autenticación del anfitrión no está configurada');
  }

  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token || token !== HOST_API_KEY) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Se requiere autenticación de anfitrión');
  }

  next();
}

function requireString(value, field, { min = 1, max = 120, pattern } = {}) {
  if (typeof value !== 'string') return `${field} debe ser texto`;
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    return `${field} debe tener entre ${min} y ${max} caracteres`;
  }
  if (pattern && !pattern.test(normalized)) return `${field} no tiene un formato válido`;
  return null;
}

function validateSlug(slug, field = 'slug') {
  return requireString(slug, field, { max: 80, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ });
}

function validateJoinBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['El cuerpo debe ser un objeto JSON'];

  const errors = [];
  const restaurantSlugError = validateSlug(body.restaurantSlug, 'restaurantSlug');
  const nameError = requireString(body.name, 'name', { max: 80 });
  const phoneError = requireString(body.phone, 'phone', { min: 5, max: 30, pattern: /^[+0-9 ()-]+$/ });
  const partySizeValid = Number.isInteger(body.partySize) && body.partySize >= 1 && body.partySize <= 20;

  if (restaurantSlugError) errors.push(restaurantSlugError);
  if (nameError) errors.push(nameError);
  if (phoneError) errors.push(phoneError);
  if (!partySizeValid) errors.push('partySize debe ser un entero entre 1 y 20');
  return errors;
}

function findRestaurant(slug) {
  return db.prepare('SELECT * FROM restaurants WHERE slug = ?').get(slug);
}

function getActiveEntryIds(restaurantId) {
  return db.prepare(`
    SELECT id
    FROM waitlist_entries
    WHERE restaurant_id = ? AND status IN (${ACTIVE_STATUSES.map(() => '?').join(', ')})
    ORDER BY position ASC, created_at ASC, id ASC
  `).all(restaurantId, ...ACTIVE_STATUSES).map((entry) => entry.id);
}

// Función para notificar a la tablet y teléfonos del local
function emitQueueUpdate(restaurantSlug) {
  io.to(restaurantSlug).emit('queue_updated');
}

// 1. Obtener datos del restaurante por slug
app.get('/api/restaurants/:slug', (req, res) => {
  const slugError = validateSlug(req.params.slug);
  if (slugError) return sendError(res, 400, 'VALIDATION_ERROR', slugError);
  const rest = findRestaurant(req.params.slug);
  if (!rest) return sendError(res, 404, 'NOT_FOUND', 'Restaurante no encontrado');
  res.json(rest);
});

// 2. Unirse a la cola (Pantalla 1)
app.post('/api/queue/join', (req, res) => {
  const body = req.body || {};
  const { restaurantSlug, name, phone, partySize } = body;

  const validationErrors = validateJoinBody(body);
  if (validationErrors.length) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Datos de entrada inválidos', validationErrors);
  }

  const rest = findRestaurant(restaurantSlug);
  if (!rest) return sendError(res, 404, 'NOT_FOUND', 'Restaurante no encontrado');

  const lastPos = db.prepare(`
    SELECT COALESCE(MAX(position), 0) as max_pos 
    FROM waitlist_entries 
    WHERE restaurant_id = ? AND status IN ('waiting', 'called', 'on_the_way')
  `).get(rest.id);

  const newId = uuidv4();
  db.prepare(`
    INSERT INTO waitlist_entries (id, restaurant_id, name, phone, party_size, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(newId, rest.id, name, phone, partySize, lastPos.max_pos + 1);

  emitQueueUpdate(restaurantSlug);
  res.json({ id: newId });
});

// 3. Ver estado de mi turno (Pantalla 2)
app.get('/api/queue/status/:id', (req, res) => {
  const idError = requireString(req.params.id, 'id', { max: 80 });
  if (idError) return sendError(res, 400, 'VALIDATION_ERROR', idError);

  const entry = db.prepare(`
    SELECT e.*, r.slug, r.name as restaurant_name, r.avg_wait_per_party
    FROM waitlist_entries e
    JOIN restaurants r ON e.restaurant_id = r.id
    WHERE e.id = ?
  `).get(req.params.id);

  if (!entry) return sendError(res, 404, 'NOT_FOUND', 'Turno no encontrado');

  // Calcular cantidad de personas adelante
  const ahead = db.prepare(`
    SELECT COUNT(*) as count_ahead
    FROM waitlist_entries
    WHERE restaurant_id = ? 
      AND status IN ('waiting', 'called', 'on_the_way')
      AND position < ?
  `).get(entry.restaurant_id, entry.position);

  res.json({
    ...entry,
    current_rank: ahead.count_ahead + 1,
    estimated_wait: ahead.count_ahead * entry.avg_wait_per_party
  });
});

// 4. Cancelar mi turno (Botón "Ya no voy")
app.post('/api/queue/cancel/:id', (req, res) => {
  const idError = requireString(req.params.id, 'id', { max: 80 });
  if (idError) return sendError(res, 400, 'VALIDATION_ERROR', idError);

  const entry = db.prepare('SELECT e.*, r.slug FROM waitlist_entries e JOIN restaurants r ON e.restaurant_id = r.id WHERE e.id = ?').get(req.params.id);
  if (!entry) return sendError(res, 404, 'NOT_FOUND', 'Turno no encontrado');
  if (!ACTIVE_STATUSES.includes(entry.status)) {
    return sendError(res, 409, 'CONFLICT', 'El turno ya no está activo');
  }

  db.prepare(`UPDATE waitlist_entries SET status = 'cancelled', resolved_at = datetime('now', 'localtime') WHERE id = ?`).run(req.params.id);
  
  emitQueueUpdate(entry.slug);
  res.json({ success: true });
});

// 5. Obtener lista para el anfitrión (Pantalla 4)
app.get('/api/host/queue/:slug', requireHostAuth, (req, res) => {
  const slugError = validateSlug(req.params.slug);
  if (slugError) return sendError(res, 400, 'VALIDATION_ERROR', slugError);
  if (!findRestaurant(req.params.slug)) return sendError(res, 404, 'NOT_FOUND', 'Restaurante no encontrado');

  const rows = db.prepare(`
    SELECT e.*, 
      ROUND((julianday('now', 'localtime') - julianday(e.created_at)) * 24 * 60) as waiting_minutes
    FROM waitlist_entries e
    JOIN restaurants r ON e.restaurant_id = r.id
    WHERE r.slug = ? AND e.status IN (${ACTIVE_STATUSES.map(() => '?').join(', ')})
    ORDER BY e.position ASC
  `).all(req.params.slug, ...ACTIVE_STATUSES);

  res.json(rows);
});

// 6. Cambiar estado desde la tablet (Llamar / Sentar)
app.post('/api/host/entry/:id/status', requireHostAuth, (req, res) => {
  const { status, restaurantSlug } = req.body || {};

  const idError = requireString(req.params.id, 'id', { max: 80 });
  const slugError = validateSlug(restaurantSlug, 'restaurantSlug');
  if (idError || slugError || typeof status !== 'string') {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Datos de entrada inválidos', [
      ...[idError, slugError].filter(Boolean),
      ...(typeof status !== 'string' ? ['status debe ser texto'] : [])
    ]);
  }

  const entry = db.prepare(`
    SELECT e.*, r.slug
    FROM waitlist_entries e
    JOIN restaurants r ON e.restaurant_id = r.id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!entry) return sendError(res, 404, 'NOT_FOUND', 'Turno no encontrado');
  if (entry.slug !== restaurantSlug) return sendError(res, 404, 'NOT_FOUND', 'Turno no pertenece a ese restaurante');
  if (!ACTIVE_STATUSES.includes(entry.status)) {
    return sendError(res, 409, 'CONFLICT', 'El turno ya no está activo');
  }
  if (!STATUS_TRANSITIONS[entry.status].includes(status)) {
    return sendError(res, 409, 'CONFLICT', `No se puede pasar de "${entry.status}" a "${status}"`);
  }

  const update = status === 'called'
    ? db.prepare(`UPDATE waitlist_entries SET status = 'called', called_at = datetime('now', 'localtime') WHERE id = ?`)
    : status === 'seated'
      ? db.prepare(`UPDATE waitlist_entries SET status = 'seated', resolved_at = datetime('now', 'localtime') WHERE id = ?`)
      : db.prepare(`UPDATE waitlist_entries SET status = 'on_the_way' WHERE id = ?`);
  update.run(req.params.id);

  emitQueueUpdate(restaurantSlug);
  res.json({ success: true });
});

// 7. Reordenar arrastrando en la tablet
app.post('/api/host/reorder', requireHostAuth, (req, res) => {
  const { restaurantSlug, orderedIds } = req.body || {};
  const slugError = validateSlug(restaurantSlug, 'restaurantSlug');
  const idsValid = Array.isArray(orderedIds)
    && orderedIds.length > 0
    && orderedIds.length <= 500
    && orderedIds.every((id) => typeof id === 'string' && id.trim().length > 0)
    && new Set(orderedIds).size === orderedIds.length;
  if (slugError || !idsValid) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Datos de entrada inválidos', [
      ...[slugError].filter(Boolean),
      ...(!idsValid ? ['orderedIds debe ser una lista no vacía de IDs únicos'] : [])
    ]);
  }
  const restaurant = findRestaurant(restaurantSlug);
  if (!restaurant) return sendError(res, 404, 'NOT_FOUND', 'Restaurante no encontrado');

  const activeIds = getActiveEntryIds(restaurant.id);
  const sameIds = activeIds.length === orderedIds.length
    && activeIds.every((id) => orderedIds.includes(id));
  if (!sameIds) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'orderedIds debe contener exactamente todos los turnos activos');
  }

  const updateStmt = db.prepare('UPDATE waitlist_entries SET position = ? WHERE id = ?');
  
  const tx = db.transaction((ids) => {
    ids.forEach((id, index) => updateStmt.run(-(index + 1), id));
    ids.forEach((id, index) => updateStmt.run(index + 1, id));
  });
  tx(orderedIds);

  emitQueueUpdate(restaurantSlug);
  res.json({ success: true });
});

// 8. Reporte del día (Pantalla 5)
app.get('/api/reports/:slug/today', (req, res) => {
  const slugError = validateSlug(req.params.slug);
  if (slugError) return sendError(res, 400, 'VALIDATION_ERROR', slugError);
  if (!findRestaurant(req.params.slug)) return sendError(res, 404, 'NOT_FOUND', 'Restaurante no encontrado');

  const stats = db.prepare(`
    SELECT 
      COUNT(*) AS se_unieron,
      SUM(CASE WHEN status = 'seated' THEN 1 ELSE 0 END) AS se_sentaron,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS se_fueron_sin_sentarse,
      SUM(CASE WHEN status = 'called' AND resolved_at IS NULL THEN 1 ELSE 0 END) AS no_vinieron_al_ser_llamados,
      ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 24 * 60)) AS espera_media
    FROM waitlist_entries e
    JOIN restaurants r ON e.restaurant_id = r.id
    WHERE r.slug = ? AND date(e.created_at) = date('now', 'localtime')
  `).get(req.params.slug);

  res.json(stats);
});

// Manejo de Salas de WebSocket
io.on('connection', (socket) => {
  socket.on('join_restaurant', (slug) => {
    if (!validateSlug(slug)) socket.join(slug);
  });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return sendError(res, 400, 'INVALID_JSON', 'El cuerpo de la petición no contiene JSON válido');
  }
  next(error);
});

app.use((error, req, res, next) => {
  console.error(error);
  sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor');
});

const PORT = Number(process.env.PORT || 3001);
server.listen(PORT, () => console.log(`Backend SQLite corriendo en el puerto ${PORT}`));