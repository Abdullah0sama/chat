const Joi = require('joi');

const validationSchema = {};

validationSchema.userValidationSchema = Joi.object({
    username: Joi.string()
                    .min(5)
                    .max(20)
                    .alphanum()
                    .required(),

    password: Joi.string()
                    .min(8)
                    .required()
});

validationSchema.RoomValidationSchema = Joi.object({
    name: Joi.string()
                .min(5)
                .max(30)
                .alphanum()
                .required(),
    
    status: Joi.string().valid('private', 'public'),

    password: Joi.when('status', {
            is: 'private',
            then: Joi.string()
                    .min(8)
                    .required()
    })
    
});


module.exports = validationSchema;
