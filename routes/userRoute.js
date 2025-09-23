import { Router } from 'express';
import { userController } from '../controllers';
import { validateUser, validateUserId } from '../middlewares/validations/userValidation';
import authenticate from '../middlewares/auth';

const router = Router();

/**
 * @route GET /users
 * @desc Get all users
 * @access Private
 */
router.get('/', authenticate, async (req, res, next) => {
    try {
        const users = await userController.getUsers();
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /users/:id
 * @desc Get a user by ID
 * @access Private
 */
router.get('/:id', authenticate, validateUserId, async (req, res, next) => {
    try {
        const user = await userController.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /users
 * @desc Create a new user
 * @access Private
 */
router.post('/', authenticate, validateUser, async (req, res, next) => {
    try {
        const user = await userController.createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
});

/**
 * @route PUT /users/:id
 * @desc Update a user by ID
 * @access Private
 */
router.put('/:id', authenticate, validateUserId, validateUser, async (req, res, next) => {
    try {
        const updatedUser = await userController.updateUser(req.params.id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
});

/**
 * @route DELETE /users/:id
 * @desc Delete a user by ID
 * @access Private
 */
router.delete('/:id', authenticate, validateUserId, async (req, res, next) => {
    try {
        const deletedUser = await userController.deleteUser(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;