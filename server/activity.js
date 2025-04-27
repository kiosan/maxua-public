// functions/activity.js
const { pool, wrap } = require('./utils');

exports.handler = wrap(async (event, context, headers) => {
  const limit = parseInt(event.queryStringParameters?.limit) || 50;

  const result = await pool.query(`
    SELECT * FROM activity_log
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.rows)
  };
});

