const { v2: cloudinary } = require('cloudinary');
const logger = require('../config/logger');
const env = require('../config/env');

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

class ImageService {
  /**
   * Generate optimized image URL with transformations
   */
  static getOptimizedUrl(publicId, options = {}) {
    const {
      width = 1200,
      height = 800,
      quality = 'auto',
      format = 'auto',
      fetchFormat = 'auto',
      crop = 'limit'
    } = options;

    return cloudinary.url(publicId, {
      transformation: [
        { width, height, crop, quality, fetch_format: fetchFormat },
        { format }
      ]
    });
  }

  /**
   * Generate thumbnail URL
   */
  static getThumbnailUrl(publicId, options = {}) {
    const {
      width = 300,
      height = 200,
      quality = 'auto:good',
      crop = 'fill',
      gravity = 'auto'
    } = options;

    return cloudinary.url(publicId, {
      transformation: [
        { width, height, crop, gravity, quality, fetch_format: 'auto' }
      ]
    });
  }

  /**
   * Generate responsive image URLs for different breakpoints
   */
  static getResponsiveUrls(publicId, options = {}) {
    const baseOptions = {
      quality: 'auto',
      fetch_format: 'auto',
      crop: 'limit'
    };

    return {
      sm: this.getOptimizedUrl(publicId, { ...baseOptions, ...options, width: 640, height: 480 }),
      md: this.getOptimizedUrl(publicId, { ...baseOptions, ...options, width: 768, height: 576 }),
      lg: this.getOptimizedUrl(publicId, { ...baseOptions, ...options, width: 1024, height: 768 }),
      xl: this.getOptimizedUrl(publicId, { ...baseOptions, ...options, width: 1280, height: 960 }),
      '2xl': this.getOptimizedUrl(publicId, { ...baseOptions, ...options, width: 1536, height: 1152 })
    };
  }

  /**
   * Upload image with automatic optimization
   */
  static async uploadImage(file, options = {}) {
    try {
      const {
        folder = 'uploads',
        allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        maxSize = 10 * 1024 * 1024 // 10MB
      } = options;

      const uploadOptions = {
        folder,
        allowed_formats: allowedFormats,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ],
        resource_type: 'image'
      };

      const result = await cloudinary.uploader.upload(file, uploadOptions);

      // Generate thumbnail URL
      const thumbnailUrl = this.getThumbnailUrl(result.public_id);

      return {
        publicId: result.public_id,
        url: result.secure_url,
        thumbnailUrl,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error) {
      logger.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Delete image from Cloudinary
   */
  static async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      logger.error('Image deletion error:', error);
      return false;
    }
  }

  /**
   * Batch delete images
   */
  static async deleteImages(publicIds) {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return {
        deleted: result.deleted,
        failed: result.failed || []
      };
    } catch (error) {
      logger.error('Batch image deletion error:', error);
      return { deleted: {}, failed: publicIds };
    }
  }

  /**
   * Get image info
   */
  static async getImageInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      logger.error('Image info error:', error);
      return null;
    }
  }

  /**
   * Extract dominant colors from image
   */
  static async getDominantColors(publicId, maxColors = 6) {
    try {
      const result = await cloudinary.api.resource(publicId, {
        colors: true,
        image_metadata: true
      });

      return result.colors?.slice(0, maxColors) || [];
    } catch (error) {
      logger.error('Dominant colors error:', error);
      return [];
    }
  }

  /**
   * Generate blur placeholder URL
   */
  static getBlurPlaceholderUrl(publicId, options = {}) {
    const {
      width = 50,
      height = 50,
      quality = 10,
      blur = 1000
    } = options;

    return cloudinary.url(publicId, {
      transformation: [
        { width, height, crop: 'fill', quality, blur, fetch_format: 'auto' }
      ]
    });
  }

  /**
   * Optimize gallery items with thumbnails
   */
  static optimizeGalleryItems(items) {
    return items.map((item) => {
      if (item.mediaType === 'image' && item.mediaUrl) {
        // Extract public ID from Cloudinary URL if it's a Cloudinary URL
        const publicId = this.extractPublicId(item.mediaUrl);
        
        if (publicId) {
          return {
            ...item,
            thumbnailUrl: item.thumbnailUrl || this.getThumbnailUrl(publicId),
            responsiveUrls: this.getResponsiveUrls(publicId),
            blurPlaceholder: this.getBlurPlaceholderUrl(publicId)
          };
        }
      }
      return item;
    });
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  static extractPublicId(url) {
    if (!url || !url.includes('cloudinary')) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const uploadIndex = pathParts.indexOf('upload');
      
      if (uploadIndex !== -1 && uploadIndex < pathParts.length - 1) {
        // Remove version if present
        const publicIdWithVersion = pathParts.slice(uploadIndex + 2).join('/');
        const publicId = publicIdWithVersion.replace(/^v\d+\//, '');
        return publicId;
      }
    } catch (error) {
      logger.error('Failed to extract public ID:', error);
    }

    return null;
  }

  /**
   * Validate image file
   */
  static validateImage(file, options = {}) {
    const {
      allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      maxSize = 10 * 1024 * 1024 // 10MB
    } = options;

    const extension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedFormats.includes(extension)) {
      throw new Error(`Invalid file format. Allowed: ${allowedFormats.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    return true;
  }
}

module.exports = ImageService;
