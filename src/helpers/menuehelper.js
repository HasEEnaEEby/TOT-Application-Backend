import logger from '../utils/logger.js';

export const parseAllergens = (allergens) => {
  try {
    if (!allergens) return [];
    
    if (typeof allergens === 'string') {
      try {
        const parsedAllergens = JSON.parse(allergens);
        return Array.isArray(parsedAllergens) ? parsedAllergens : [parsedAllergens];
      } catch (jsonError) {
        const cleanedStr = allergens
          .replace(/^\[|\]$/g, '') 
          .replace(/"/g, '')        
          .split(',')         
          .map(item => item.trim()) 
          .filter(item => item);  
        
        return cleanedStr;
      }
    }
    
    return Array.isArray(allergens) ? allergens : [allergens];
  } catch (error) {
    logger.error('Error parsing allergens', {
      originalAllergens: allergens,
      error
    });
    return [];
  }
};

export const parseNutritionalInfo = (nutritionalInfo) => {
  if (!nutritionalInfo) return {};
  
  if (typeof nutritionalInfo === 'object') {
    return nutritionalInfo;
  }
  
  try {
    return JSON.parse(nutritionalInfo);
  } catch (error) {
    logger.error('Error parsing nutritional info', {
      originalNutritionalInfo: nutritionalInfo,
      error
    });
    return {};
  }
};