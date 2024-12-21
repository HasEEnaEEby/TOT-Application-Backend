function isGuestModeValid() {
    const currentTime = new Date();
    const startHour = 13;  
    const endHour = 16;    
  
    const currentHour = currentTime.getHours();
  
    return currentHour >= startHour && currentHour < endHour;
  }
  
  module.exports = isGuestModeValid;
  