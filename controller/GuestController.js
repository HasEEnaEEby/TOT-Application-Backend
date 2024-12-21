const restaurantService = require('../services/restaurantService');
const orderService = require('../services/orderService');
const Joi = require('joi');
const Guest = require('../models/Guest');
const { v4: uuidv4 } = require('uuid');
const guestModeTimeValidation = require('../middleware/timeValidation');

// Validation Schema for Order
const orderSchema = Joi.object({
  items: Joi.array()
    .items(Joi.object({
      itemId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
    }))
    .required(),
  guestSessionId: Joi.string().required(),
});

 // Generate a unique session ID
 exports.createGuestSession = async (req, res) => {
  try {
    const sessionId = uuidv4(); 
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); 

    const guest = new Guest({
      sessionId,
      expiresAt,
    });

    await guest.save();

    res.status(201).json({
      message: 'Guest session created successfully',
      guest: {
        sessionId,
        expiresAt,
      },
    });
  } catch (err) {
    console.error('Error creating guest session:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// View menu for a specific restaurant
exports.viewMenu = async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const menu = await restaurantService.getMenuForRestaurant(restaurantId);
    res.status(200).json({
      message: 'Fetched menu successfully',
      menu,
    });
  } catch (err) {
    console.error('Error fetching menu:', err.message);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server Error' });
  }
};

// Place an order for a specific restaurant
exports.placeOrder = [guestModeTimeValidation, async (req, res) => {
  const { restaurantId } = req.params;

  const { error } = orderSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { items, guestSessionId } = req.body;

  try {
    const order = await orderService.createGuestOrder(restaurantId, items, guestSessionId);
    res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (err) {
    console.error('Error placing order:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
}];
