const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

exports.createGuestOrder = async (restaurantId, items, guestSessionId) => {
  try {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const newOrder = new Order({
      restaurantId,
      items,
      guestSessionId,
      status: 'Pending',
      createdAt: new Date(),
    });

    await newOrder.save();
    return newOrder;
  } catch (err) {
    throw new Error('Error creating guest order: ' + err.message);
  }
};

exports.getOrdersByRestaurant = async (restaurantId) => {
  try {
    const orders = await Order.find({ restaurantId }).sort({ createdAt: -1 });
    return orders;
  } catch (err) {
    throw new Error('Error fetching orders: ' + err.message);
  }
};

exports.updateOrderStatus = async (orderId, status) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    order.status = status;
    await order.save();
    return order;
  } catch (err) {
    throw new Error('Error updating order status: ' + err.message);
  }
};
