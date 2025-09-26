// /home/project/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // ⚠️ WebContainers/StackBlitz plantent sur le hashing SHA-1 massif
  // On le coupe pour éviter l'erreur "memory access out of bounds".
  config.haste = { ...(config.haste || {}), computeSha1: false, useWatchman: false };

  // Réduit la conso mémoire CPU dans l’environnement web
  config.maxWorkers = 1;

  return config;
})();
