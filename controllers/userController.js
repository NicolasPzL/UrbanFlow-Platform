class UserController {
    constructor(userService) {
        this.userService = userService;
    }

    async createUser(req, res, next) {
        try {
            const userData = req.body;
            const newUser = await this.userService.createUser(userData);
            res.status(201).json({ success: true, data: newUser });
        } catch (error) {
            next(error);
        }
    }

    async getUser(req, res, next) {
        try {
            const userId = req.params.id;
            const user = await this.userService.getUserById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            res.status(200).json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }

    async updateUser(req, res, next) {
        try {
            const userId = req.params.id;
            const userData = req.body;
            const updatedUser = await this.userService.updateUser(userId, userData);
            if (!updatedUser) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            res.status(200).json({ success: true, data: updatedUser });
        } catch (error) {
            next(error);
        }
    }

    async deleteUser(req, res, next) {
        try {
            const userId = req.params.id;
            const deletedUser = await this.userService.deleteUser(userId);
            if (!deletedUser) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            res.status(204).json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getAllUsers(req, res, next) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const users = await this.userService.getAllUsers(page, limit);
            res.status(200).json({ success: true, data: users });
        } catch (error) {
            next(error);
        }
    }
}

export default UserController;