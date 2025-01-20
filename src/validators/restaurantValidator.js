import Joi from 'joi';

export const restaurantCreationValidator = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(3).required(),
        location: Joi.string().required(),
    });

    return schema.validate(data);
};

export const menuItemValidator = (data) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        price: Joi.number().min(0).required(),
        description: Joi.string().allow('').optional(),
        category: Joi.string().required(),
    });

    return schema.validate(data);
};
