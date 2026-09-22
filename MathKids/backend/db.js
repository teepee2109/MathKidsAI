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
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

let poolPromise;

export function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect(config).catch((error) => {
            poolPromise = undefined;
            throw error;
        });
    }

    return poolPromise;
}

export { sql };