import crypto from 'crypto';
import Restaurant from '../models/Restaurant.js';

export async function generateUniqueAdminCode() {
  let isUnique = false;
  let adminCode;

  while (!isUnique) {
    // Generate a 6-character alphanumeric code
    adminCode = crypto.randomBytes(3)
      .toString('hex')
      .toUpperCase();
    
    // Check if code already exists
    const existingRestaurant = await Restaurant.findOne({ adminCode });
    if (!existingRestaurant) {
      isUnique = true;
    }
  }

  return adminCode;
}
