const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Middleware to optimize images using sharp
 * It will overwrite the original uploaded file with an optimized version
 */
const optimizeImage = async (req, res, next) => {
  // If no file or not an image, skip
  if (!req.file || !req.file.mimetype.startsWith('image/')) {
    return next();
  }

  try {
    const { path: filePath } = req.file;
    
    // Create a temporary path for processing
    const optimizedPath = filePath + '-optimized.jpg';

    // Process image: 
    // 1. Resize to max 1000px width (maintaining aspect ratio)
    // 2. Convert to JPEG
    // 3. Set quality to 80% (good balance between size and quality)
    await sharp(filePath)
      .resize(1000, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(optimizedPath);

    // Replace original file with optimized one
    fs.unlinkSync(filePath);
    fs.renameSync(optimizedPath, filePath);

    // Update metadata
    const stats = fs.statSync(filePath);
    req.file.size = stats.size;
    
    console.log(`✅ Image optimized: ${req.file.filename} (${Math.round(stats.size / 1024)} KB)`);
    
    next();
  } catch (error) {
    console.error('❌ Image optimization error:', error);
    // Continue anyway to avoid blocking the user flow
    next();
  }
};

module.exports = optimizeImage;
