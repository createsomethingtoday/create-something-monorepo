import { getCloudflareEnv } from './cloudflareRuntime';

function nowIso() {
  return new Date().toISOString();
}

function serializeJson(value) {
  return value === undefined ? null : JSON.stringify(value);
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeSubmission(row) {
  if (!row) {
    return row;
  }

  return {
    ...row,
    form_data: parseJson(row.form_data, {}),
    blob_urls: parseJson(row.blob_urls, []),
    webhook_response: parseJson(row.webhook_response, null),
    retry_count: row.retry_count ?? 0,
  };
}

async function getRuntime(runtime = {}) {
  const env = await getCloudflareEnv(runtime);
  if (env?.SUBMISSIONS_DB) {
    return {
      type: 'd1',
      db: env.SUBMISSIONS_DB
    };
  }

  const { sql } = await import('@vercel/postgres');
  return {
    type: 'postgres',
    sql
  };
}

async function getSubmissionById(id, runtime = {}) {
  const driver = await getRuntime(runtime);

  if (driver.type === 'd1') {
    const row = await driver.db
      .prepare('SELECT * FROM submissions WHERE id = ? LIMIT 1')
      .bind(id)
      .first();

    return normalizeSubmission(row);
  }

  const { rows } = await driver.sql.query(
    'SELECT * FROM submissions WHERE id = $1 LIMIT 1',
    [id]
  );
  return normalizeSubmission(rows[0]);
}

export const db = {
  async createSubmission({
    submissionType,
    appName,
    clientId,
    creatorEmail,
    formData,
    blobUrls = [],
    status = 'processing'
  }, runtime = {}) {
    const driver = await getRuntime(runtime);
    const id = crypto.randomUUID();
    const createdAt = nowIso();

    if (driver.type === 'd1') {
      await driver.db.prepare(`
        INSERT INTO submissions (
          id,
          submission_type,
          app_name,
          client_id,
          creator_email,
          form_data,
          blob_urls,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        submissionType,
        appName,
        clientId,
        creatorEmail,
        serializeJson(formData),
        serializeJson(blobUrls),
        status,
        createdAt,
        createdAt
      ).run();

      return getSubmissionById(id, runtime);
    }

    const { rows } = await driver.sql.query(`
      INSERT INTO submissions (
        id,
        submission_type,
        app_name,
        client_id,
        creator_email,
        form_data,
        blob_urls,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $9)
      RETURNING *
    `, [
      id,
      submissionType,
      appName,
      clientId,
      creatorEmail,
      serializeJson(formData),
      serializeJson(blobUrls),
      status,
      createdAt
    ]);

    return normalizeSubmission(rows[0]);
  },

  async updateSubmission(id, updates, runtime = {}) {
    const driver = await getRuntime(runtime);
    const updatedAt = nowIso();

    const fields = [
      ['status', updates.status],
      ['blob_urls', updates.blobUrls !== undefined ? serializeJson(updates.blobUrls) : undefined],
      ['airtable_submission_id', updates.airtableSubmissionId],
      ['webhook_response', updates.webhookResponse !== undefined ? serializeJson(updates.webhookResponse) : undefined],
      ['error_message', updates.errorMessage],
      ['retry_count', updates.retryCount],
      ['webhook_sent_at', updates.webhookSentAt],
      ['blobs_cleaned_at', updates.blobsCleanedAt],
    ].filter(([_, value]) => value !== undefined);

    fields.push(['updated_at', updatedAt]);

    if (driver.type === 'd1') {
      const assignments = fields.map(([column]) => `${column} = ?`).join(', ');
      const values = fields.map(([_, value]) => value);
      await driver.db.prepare(`
        UPDATE submissions
        SET ${assignments}
        WHERE id = ?
      `).bind(...values, id).run();

      return getSubmissionById(id, runtime);
    }

    const values = fields.map(([_, value]) => value);
    const assignments = fields.map(([column], index) => {
      if (column === 'blob_urls' || column === 'webhook_response') {
        return `${column} = $${index + 1}::jsonb`;
      }
      return `${column} = $${index + 1}`;
    }).join(', ');

    const { rows } = await driver.sql.query(`
      UPDATE submissions
      SET ${assignments}
      WHERE id = $${values.length + 1}
      RETURNING *
    `, [...values, id]);

    return normalizeSubmission(rows[0]);
  },

  async getSubmission(id, runtime = {}) {
    return getSubmissionById(id, runtime);
  },

  async searchSubmissions({
    appName,
    clientId,
    creatorEmail,
    status,
    startDate,
    endDate,
    limit = 50,
    offset = 0
  }, runtime = {}) {
    const driver = await getRuntime(runtime);

    if (driver.type === 'd1') {
      let query = 'SELECT * FROM submissions WHERE 1=1';
      const params = [];

      if (appName) {
        query += ' AND LOWER(app_name) LIKE LOWER(?)';
        params.push(`%${appName}%`);
      }

      if (clientId) {
        query += ' AND client_id = ?';
        params.push(clientId);
      }

      if (creatorEmail) {
        query += ' AND LOWER(creator_email) LIKE LOWER(?)';
        params.push(`%${creatorEmail}%`);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (startDate) {
        query += ' AND datetime(created_at) >= datetime(?)';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND datetime(created_at) <= datetime(?)';
        params.push(endDate);
      }

      query += ' ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await driver.db.prepare(query).bind(...params).all();
      return (result.results || []).map(normalizeSubmission);
    }

    let query = 'SELECT * FROM submissions WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (appName) {
      query += ` AND app_name ILIKE $${paramIndex}`;
      params.push(`%${appName}%`);
      paramIndex++;
    }

    if (clientId) {
      query += ` AND client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    if (creatorEmail) {
      query += ` AND creator_email ILIKE $${paramIndex}`;
      params.push(`%${creatorEmail}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await driver.sql.query(query, params);
    return rows.map(normalizeSubmission);
  },

  async getFailedSubmissions(maxRetries = 3, runtime = {}) {
    const driver = await getRuntime(runtime);

    if (driver.type === 'd1') {
      const result = await driver.db.prepare(`
        SELECT * FROM submissions
        WHERE status = 'webhook_failed'
          AND retry_count < ?
          AND (
            webhook_sent_at IS NULL
            OR datetime(webhook_sent_at) < datetime('now', '-15 minutes')
          )
        ORDER BY datetime(created_at) ASC
        LIMIT 10
      `).bind(maxRetries).all();

      return (result.results || []).map(normalizeSubmission);
    }

    const { rows } = await driver.sql.query(`
      SELECT * FROM submissions
      WHERE status = 'webhook_failed'
        AND retry_count < $1
        AND (
          webhook_sent_at IS NULL
          OR webhook_sent_at < NOW() - INTERVAL '15 minutes'
        )
      ORDER BY created_at ASC
      LIMIT 10
    `, [maxRetries]);

    return rows.map(normalizeSubmission);
  },

  async getSubmissionsForBlobCleanup(runtime = {}) {
    const driver = await getRuntime(runtime);

    if (driver.type === 'd1') {
      const result = await driver.db.prepare(`
        SELECT id, blob_urls, blobs_cleaned_at, created_at
        FROM submissions
        WHERE status = 'webhook_success'
          AND blob_urls IS NOT NULL
          AND blobs_cleaned_at IS NULL
          AND datetime(created_at) < datetime('now', '-24 hours')
        LIMIT 100
      `).all();

      return (result.results || []).map(normalizeSubmission);
    }

    const { rows } = await driver.sql.query(`
      SELECT id, blob_urls, blobs_cleaned_at, created_at
      FROM submissions
      WHERE status = 'webhook_success'
        AND blob_urls IS NOT NULL
        AND blobs_cleaned_at IS NULL
        AND created_at < NOW() - INTERVAL '24 hours'
      LIMIT 100
    `);

    return rows.map(normalizeSubmission);
  },

  async getStats(days = 7, runtime = {}) {
    const driver = await getRuntime(runtime);

    if (driver.type === 'd1') {
      const result = await driver.db.prepare(`
        SELECT
          status,
          COUNT(*) as count,
          substr(created_at, 1, 10) as date
        FROM submissions
        WHERE datetime(created_at) >= datetime('now', ?)
        GROUP BY status, substr(created_at, 1, 10)
        ORDER BY date DESC, status
      `).bind(`-${days} days`).all();

      return result.results || [];
    }

    const { rows } = await driver.sql.query(`
      SELECT
        status,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM submissions
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY status, DATE(created_at)
      ORDER BY date DESC, status
    `);

    return rows;
  },

  async findRecentDuplicate(clientId, submissionType, windowSeconds = 60, runtime = {}) {
    if (!clientId) {
      return null;
    }

    const cutoffTime = new Date(Date.now() - windowSeconds * 1000).toISOString();
    const driver = await getRuntime(runtime);

    if (driver.type === 'd1') {
      const row = await driver.db.prepare(`
        SELECT * FROM submissions
        WHERE client_id = ?
          AND submission_type = ?
          AND datetime(created_at) > datetime(?)
          AND status != 'webhook_failed'
        ORDER BY datetime(created_at) DESC
        LIMIT 1
      `).bind(clientId, submissionType, cutoffTime).first();

      return normalizeSubmission(row);
    }

    const { rows } = await driver.sql.query(`
      SELECT * FROM submissions
      WHERE client_id = $1
        AND submission_type = $2
        AND created_at > $3
        AND status NOT IN ('webhook_failed')
      ORDER BY created_at DESC
      LIMIT 1
    `, [clientId, submissionType, cutoffTime]);

    return normalizeSubmission(rows[0]) || null;
  }
};
