export const getCustomerDetails = (req, res, next) => {
    try {
        // You can add logic here to fetch customer details
        res.status(200).json({ message: 'Customer details' });
    } catch (err) {
        next(err);
    }
};

export const createCustomer = (req, res, next) => {
    try {
        // Add logic to create a customer
        res.status(201).json({ message: 'Customer created successfully' });
    } catch (err) {
        next(err);
    }
};
