import QRCode from 'qrcode';
import logger from './logger.js';

/**
 * QR Code utilities for table management
 */
export const qrCodeUtils = {
  /**
   * Generate a QR code data URL for a table token
   * @param {string} restaurantId - The restaurant ID
   * @param {string} tableId - The table ID
   * @param {string} token - The QR token for validation
   * @returns {Promise<string>} - Data URL of the QR code
   */
  generateQRCodeDataURL: async (restaurantId, tableId, token) => {
    try {
      // Create content for QR code that includes all required identifiers
      const content = JSON.stringify({
        r: restaurantId,
        t: tableId,
        v: token,
        ts: Date.now()
      });
      
      // Generate QR code with good error correction
      const dataURL = await QRCode.toDataURL(content, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      return dataURL;
    } catch (error) {
      logger.error('Error generating QR code', { error, restaurantId, tableId });
      throw error;
    }
  },
  
  /**
   * Generate a Buffer containing the QR code image
   * @param {string} restaurantId - The restaurant ID
   * @param {string} tableId - The table ID
   * @param {string} token - The QR token for validation
   * @returns {Promise<Buffer>} - Buffer containing the QR code PNG image
   */
  generateQRCodeBuffer: async (restaurantId, tableId, token) => {
    try {
      // Create content for QR code that includes all required identifiers
      const content = JSON.stringify({
        r: restaurantId,
        t: tableId,
        v: token,
        ts: Date.now()
      });
      
      // Generate QR code as buffer
      const buffer = await QRCode.toBuffer(content, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      return buffer;
    } catch (error) {
      logger.error('Error generating QR code buffer', { error, restaurantId, tableId });
      throw error;
    }
  },
  
  /**
   * Generate a base64 string of the QR code image for embedding
   * @param {string} restaurantId - The restaurant ID
   * @param {string} tableId - The table ID
   * @param {string} token - The QR token for validation
   * @returns {Promise<string>} - Base64 encoded QR code image
   */
  generateQRCodeBase64: async (restaurantId, tableId, token) => {
    try {
      const dataURL = await qrCodeUtils.generateQRCodeDataURL(restaurantId, tableId, token);
      // Extract the base64 part from the data URL
      return dataURL.split(',')[1];
    } catch (error) {
      logger.error('Error generating QR code base64', { error, restaurantId, tableId });
      throw error;
    }
  },


  /**
 * Validate QR code data
 * @param {Object} qrData - Parsed QR code data
 * @param {Object} table - Table document from database
 * @returns {boolean} - Whether the QR code is valid
 */
validateQRCodeData: (qrData, table) => {
    // Check if required fields exist
    if (!qrData || !qrData.r || !qrData.t || !qrData.v) {
      return false;
    }
    
    // Verify restaurant ID matches
    if (qrData.r !== table.restaurant.toString()) {
      return false;
    }
    
    // Verify table ID matches
    if (qrData.t !== table._id.toString()) {
      return false;
    }
    
    // Verify token with table's validateQRCode method
    return table.validateQRCode(qrData.v);
  }
};

export default qrCodeUtils;