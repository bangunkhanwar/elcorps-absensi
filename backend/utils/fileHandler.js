const fs = require('fs').promises;

/**
 * Safely deletes a file asynchronously
 * @param {string} filePath - Path to the file
 */
const deleteFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`[FileHandler] Failed to delete file: ${filePath}`, err.message);
    }
  }
};

module.exports = { deleteFile };
