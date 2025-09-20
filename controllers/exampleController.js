class ExampleController {
    /**
     * Get all examples
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAllExamples(req, res) {
        try {
            // Logic to retrieve all examples
            res.status(200).json({ message: "Retrieved all examples" });
        } catch (error) {
            // Handle error
            res.status(500).json({ message: "Error retrieving examples", error });
        }
    }

    /**
     * Get example by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getExampleById(req, res) {
        try {
            const { id } = req.params;
            // Logic to retrieve example by ID
            res.status(200).json({ message: `Retrieved example with ID: ${id}` });
        } catch (error) {
            // Handle error
            res.status(500).json({ message: "Error retrieving example", error });
        }
    }

    /**
     * Create a new example
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createExample(req, res) {
        try {
            const exampleData = req.body;
            // Logic to create a new example
            res.status(201).json({ message: "Example created", data: exampleData });
        } catch (error) {
            // Handle error
            res.status(500).json({ message: "Error creating example", error });
        }
    }

    /**
     * Update an example by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updateExample(req, res) {
        try {
            const { id } = req.params;
            const exampleData = req.body;
            // Logic to update example by ID
            res.status(200).json({ message: `Example with ID: ${id} updated`, data: exampleData });
        } catch (error) {
            // Handle error
            res.status(500).json({ message: "Error updating example", error });
        }
    }

    /**
     * Delete an example by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async deleteExample(req, res) {
        try {
            const { id } = req.params;
            // Logic to delete example by ID
            res.status(200).json({ message: `Example with ID: ${id} deleted` });
        } catch (error) {
            // Handle error
            res.status(500).json({ message: "Error deleting example", error });
        }
    }
}

export default new ExampleController();