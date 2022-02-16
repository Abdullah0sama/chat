const express                           = require('express');
const bcyrpt                            = require('bcrypt');
const router                            = express.Router();
const path                              = require('path');
const saltRounds                        = 10;
const User                              = require('../models/User.js');
const validationSchema                  = require('../validation.js');
const { pageAuthenticationProtection }  = require('../middleware.js');
const Joi                               = require('joi');


router.use(express.urlencoded({ extended: true }));
router.use(express.static('public'));

const htmlPath = path.resolve('./public/html');

router.get('/', pageAuthenticationProtection, (req, res) => {
    res.sendFile(htmlPath + '/main.html');
});

router.get('/login', (req, res) => {
    res.sendFile(htmlPath + '/login.html');
});

router.get('/signup', (req, res) => {
    res.sendFile(htmlPath + '/signup.html');
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

router.post('/signup', async (req, res) => {
    const user = req.body.user || {};

    try {

            await validationSchema.userValidationSchema.validateAsync(user);

            const isUsernameAvailable = await User.findOne({ username: user.username });
            if (isUsernameAvailable) 
                throw new UserError( 'Username already used' );
            user.password = await bcyrpt.hash(user.password, saltRounds);
            // Create new user
            await User.create(user);
            res.status(200).send({ msg: 'User Created Successfully' }); 

    } catch (err) {
        if (err instanceof UserError || err instanceof Joi.ValidationError) 
            return res.status(422).send({ msg: err.message });

        else return res.status(500).send();
    }

});


router.post('/login', async (req, res) => {
    try {
        const user = req.body.user;
        let foundUser = await User.findOne({ username: user.username });
        let isPasswordCorrect;
        // Wasting time
        if(foundUser == null) 
            isPasswordCorrect = await bcyrpt.compare('icantremeber', '$2b$10$DHgmPDyXukbf3gKPhA6WhOiFst5PUtjhzgTsIv0TyyCHuaJJ4TrAW');
        else isPasswordCorrect = await bcyrpt.compare(user.password, foundUser.password);
    
        if (isPasswordCorrect) {
                req.session.user = {};
                req.session.user.id = foundUser.id;
                req.session.user.username = foundUser.username;
                return res.status(200).send({ msg: 'Logged in successfully' });
            }else throw new UserError('Wrong username or password');

    } catch (err) {
        if (err instanceof UserError ) return res.status(401).send({ msg: err.message });
        else return res.status(500).send();
    }
});





class UserError extends Error {
    constructor (message) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this);
    }
}

module.exports = router;