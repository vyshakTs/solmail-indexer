module.exports = {
  apps: [
    {
      name: "solmail-graphql-api",
      script: "./server.js",
      interpreter: "node", // uses the current Node version (e.g., via nvm)
      instances: 1, // or "max" for all CPU cores
      exec_mode: "fork", // or "cluster" for multi-core
      env: {
        NODE_ENV: "development",
        PORT: 3030
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3030
      },
      watch: false, // set to true for auto-restart on code changes
      autorestart: true,
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm Z"
    }
  ]
};
