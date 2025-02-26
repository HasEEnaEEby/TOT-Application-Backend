import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Menu item name is required'],
        trim: true,
        maxLength: [100, 'Name cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxLength: [500, 'Description cannot be more than 500 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['appetizer', 'main course', 'dessert', 'beverage', 'special'],
        lowercase: true
    },
    image: {
        type: String,
        validate: {
            validator: function(v) {
                // Basic URL validation
                if (!v) return true; // Allow empty
                return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
            },
            message: 'Invalid image URL format'
        }
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant reference is required']
    },
    preparationTime: {
        type: Number,
        min: [0, 'Preparation time cannot be negative'],
        default: 15 // Default 15 minutes
    },
    spicyLevel: {
        type: String,
        enum: ['mild', 'medium', 'hot', 'extra hot'],
        default: 'medium'
    },
    isVegetarian: {
        type: Boolean,
        default: false
    },
    allergens: [{
        type: String,
        enum: ['nuts', 'dairy', 'gluten', 'soy', 'shellfish', 'eggs']
    }],
    nutritionalInfo: {
        calories: Number,
        protein: Number,
        carbohydrates: Number,
        fats: Number
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
menuItemSchema.index({ restaurant: 1, category: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

// Virtual for formatted price
menuItemSchema.virtual('formattedPrice').get(function() {
    return `Rs. ${this.price.toFixed(2)}`;
});

// Pre-save middleware to ensure name uniqueness within a restaurant
menuItemSchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('name')) {
        const existingItem = await this.constructor.findOne({
            restaurant: this.restaurant,
            name: this.name,
            _id: { $ne: this._id }
        });
        
        if (existingItem) {
            next(new Error('Menu item with this name already exists in your restaurant'));
        }
    }
    next();
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

export default MenuItem;