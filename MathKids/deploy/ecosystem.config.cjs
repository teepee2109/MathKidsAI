// PM2 config. Usage: pm2 start MathKids/deploy/ecosystem.config.cjs && pm2 save
const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "mathkids-api",
      cwd: path.join(__dirname, "../backend"),
      script: "server.js",
      // One instance: the backend keeps rate limits and schema checks in memory.
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
      time: true,
    },
  ],
};
