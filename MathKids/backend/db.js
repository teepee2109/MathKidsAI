import sql from "mssql";
import "dotenv/config";

const config = {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT),

    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate:
            process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },

    connectionTimeout: 8000,
    requestTimeout: 10000,

    pool: {
        // The SQL Server endpoint is exposed through a local TCP port that
        // resets simultaneous login sockets. Serialize requests on one pooled
        // connection instead of opening several sockets for page-load bursts.
        max: 1,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

let poolPromise;
let connectedPool;

function discardPool(pool, error) {
    // Ignore a late error from an older pool after a replacement has connected.
    if (connectedPool && connectedPool !== pool) return;

    if (poolPromise?.pool === pool) poolPromise = undefined;
    if (connectedPool === pool) connectedPool = undefined;

    console.error("SQL Server connection lost; the next request will reconnect:", error.message);
    // Do not close the pool here: other requests may still be using it, and
    // `close()` aborts all outstanding SQL requests. Let them finish/fail on
    // their own; new requests will use a fresh pool after the references above
    // are cleared. The old pool is left for process shutdown to clean up.
}

export function getPool() {
    if (!poolPromise) {
        const pool = new sql.ConnectionPool(config);
        pool.on("error", (error) => discardPool(pool, error));

        const connecting = pool.connect();
        const cachedPromise = connecting.then(() => {
            connectedPool = pool;
            return pool;
        }).catch(async (error) => {
            if (poolPromise === cachedPromise) poolPromise = undefined;
            await pool.close().catch(() => {});
            throw error;
        });

        // Keep the pool alongside the promise so an error can invalidate only
        // the connection that actually failed, not a newer replacement.
        cachedPromise.pool = pool;
        poolPromise = cachedPromise;
    }

    return poolPromise;
}

export { sql };
