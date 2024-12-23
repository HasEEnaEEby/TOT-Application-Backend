import { getMenuForRestaurant } from '../services/restaurantService.js';
import { createGuestOrder } from '../services/orderService.js';
import { object, array, string, number } from 'joi';
import Guest from '../models/Guest.js';
import { v4 as uuidv4 } from 'uuid';
import guestModeTimeValidation from '../middleware/timeValidation.js';

// Validation Schema for Order
const orderSchema = object({
  items: array()
    .items(object({
      itemId: string().required(),
      quantity: number().integer().min(1).required(),
    }))
    .required(),
  guestSessionId: string().required(),
});

 // Generate a unique session ID
 export async function  createGuestSession(req, res) {
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
}

// View menu for a specific restaurant
export async function viewMenu(req, res) {
  const { restaurantId } = req.params;
  try {
    const menu = await getMenuForRestaurant(restaurantId);
    res.status(200).json({
      message: 'Fetched menu successfully',
      menu,
    });
  } catch (err) {
    console.error('Error fetching menu:', err.message);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server Error' });
  }
}

export const placeOrder = [guestModeTimeValidation, async (req, res) => {
  const { restaurantId } = req.params;

  const { error } = orderSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { items, guestSessionId } = req.body;

  try {
    const order = await createGuestOrder(restaurantId, items, guestSessionId);
    res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (err) {
    console.error('Error placing order:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
}];
