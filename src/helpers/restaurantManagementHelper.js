export const restaurantHelper = {
    isWithinOperatingHours: (operatingHours, date = new Date()) => {
      const day = date.toLocaleLowerCase();
      const time = date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
  
      const dayHours = operatingHours[day];
      if (!dayHours || dayHours.isClosed) return false;
      
      return time >= dayHours.open && time <= dayHours.close;
    },
  
    calculateOrderCapacity: (settings, currentOrders) => {
      const maxOrders = settings.maxOrdersPerHour;
      const availableCapacity = maxOrders - currentOrders;
      
      return {
        available: availableCapacity > 0,
        remaining: Math.max(0, availableCapacity),
        utilisationPercentage: (currentOrders / maxOrders) * 100
      };
    }
  };