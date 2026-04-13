function log(scope, message, meta) {
  const line = `[${new Date().toISOString()}] [${scope}] ${message}`;
  if (meta) {
    console.log(line, meta);
    return;
  }
  console.log(line);
}

module.exports = { log };

