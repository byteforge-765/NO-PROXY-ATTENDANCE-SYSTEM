/**
 * TigerGraph Client
 * Used ONLY for:
 *   1. Attendance Pattern Analysis (consecutive absences, subject-wise trends)
 *   2. Proxy Detection (GPS cluster analysis, attendance anomalies)
 *
 * All other data stays in PostgreSQL / MongoDB (Hybrid Approach)
 */

const axios = require('axios');

const TG_HOST     = process.env.TIGERGRAPH_HOST     || 'http://localhost';
const TG_PORT     = process.env.TIGERGRAPH_PORT     || '14240';
const TG_GRAPH    = process.env.TIGERGRAPH_GRAPH    || 'ICMS';
const TG_USER     = process.env.TIGERGRAPH_USER     || 'tigergraph';
const TG_PASS     = process.env.TIGERGRAPH_PASSWORD || 'tigergraph123';
const TG_SECRET   = process.env.TIGERGRAPH_SECRET   || '';

let _token = null;
let _tokenExpiry = 0;

// ── Token Management ──────────────────────────────────────────────────────────
const getToken = async () => {
  if (_token && Date.now() < _tokenExpiry) return _token;
  try {
    const res = await axios.post(
      `${TG_HOST}:${TG_PORT}/requesttoken`,
      { graph: TG_GRAPH, secret: TG_SECRET, lifetime: 86400 },
      { auth: { username: TG_USER, password: TG_PASS }, timeout: 5000 }
    );
    _token = res.data?.results?.token || res.data?.token;
    _tokenExpiry = Date.now() + 82800000; // 23h
    return _token;
  } catch (err) {
    console.warn('[TigerGraph] Token fetch failed — running in mock mode');
    return null;
  }
};

// ── Generic REST++ Call ───────────────────────────────────────────────────────
const tgRequest = async (method, path, data = null) => {
  const token = await getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = `${TG_HOST}:${TG_PORT}${path}`;
  try {
    const res = await axios({ method, url, data, headers, timeout: 10000 });
    return { ok: true, data: res.data };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.warn(`[TigerGraph] ${method.toUpperCase()} ${path} failed: ${msg}`);
    return { ok: false, error: msg };
  }
};

// ── Upsert Vertex ─────────────────────────────────────────────────────────────
const upsertVertex = async (vertexType, vertexId, attrs = {}) => {
  const body = { vertices: { [vertexType]: { [vertexId]: attrs } } };
  return tgRequest('post', `/graph/${TG_GRAPH}`, body);
};

// ── Upsert Edge ───────────────────────────────────────────────────────────────
const upsertEdge = async (srcType, srcId, edgeType, tgtType, tgtId, attrs = {}) => {
  const body = {
    edges: {
      [srcType]: {
        [srcId]: { [edgeType]: { [tgtType]: { [tgtId]: attrs } } }
      }
    }
  };
  return tgRequest('post', `/graph/${TG_GRAPH}`, body);
};

// ── Run GSQL Query ────────────────────────────────────────────────────────────
const runQuery = async (queryName, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return tgRequest('get', `/query/${TG_GRAPH}/${queryName}?${qs}`);
};

// ── Connection Check ──────────────────────────────────────────────────────────
const ping = async () => {
  const res = await tgRequest('get', `/echo/${TG_GRAPH}`);
  return res.ok;
};

module.exports = { getToken, tgRequest, upsertVertex, upsertEdge, runQuery, ping, TG_GRAPH, TG_HOST, TG_PORT };
