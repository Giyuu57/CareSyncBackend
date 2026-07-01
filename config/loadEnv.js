try {
  process.loadEnvFile();
} catch (err) {
  // Ignore error if .env file is missing (e.g. in environments where variables are set directly)
}
