import { Router } from 'express';
import AuthController from '../controllers/authController';
import { validateLogin, validateRegistration } from '../middlewares/validations/authValidation';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validateRegistration, async (req, res, next) => {
    try {
        const user = await authController.register(req.body);
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', validateLogin, async (req, res, next) => {
    try {
        const token = await authController.login(req.body);
        res.status(200).json({ token });
    } catch (error) {
        next(error);
    }
});

export default router;