import app from '../server/app.js';

/**
 * Vercel's file routes do not map all nested Express paths to one function.
 * vercel.json rewrites /api/* here and passes the original route in this query
 * parameter; restore it before handing the request to Express.
 */
export default function handler(req, res) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const originalPath = requestUrl.searchParams.get('__taskflow_path');
  if (!originalPath) return res.status(404).json({ error: 'API route not found.' });
  requestUrl.searchParams.delete('__taskflow_path');
  const query = requestUrl.searchParams.toString();
  req.url = `/api/${originalPath.replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
  return app(req, res);
}
