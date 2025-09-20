import { Router } from 'express';
import ExampleController from '../controllers/exampleController';

const router = Router();
const exampleController = new ExampleController();

/**
 * @route GET /examples
 * @desc Get all examples
 * @access Public
 */
router.get('/', async (req, res, next) => {
    try {
        const examples = await exampleController.getAllExamples();
        res.status(200).json(examples);
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /examples/:id
 * @desc Get example by ID
 * @access Public
 */
router.get('/:id', async (req, res, next) => {
    try {
        const example = await exampleController.getExampleById(req.params.id);
        if (!example) {
            return res.status(404).json({ message: 'Example not found' });
        }
        res.status(200).json(example);
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /examples
 * @desc Create a new example
 * @access Public
 */
router.post('/', async (req, res, next) => {
    try {
        const newExample = await exampleController.createExample(req.body);
        res.status(201).json(newExample);
    } catch (error) {
        next(error);
    }
});

/**
 * @route PUT /examples/:id
 * @desc Update an example by ID
 * @access Public
 */
router.put('/:id', async (req, res, next) => {
    try {
        const updatedExample = await exampleController.updateExample(req.params.id, req.body);
        if (!updatedExample) {
            return res.status(404).json({ message: 'Example not found' });
        }
        res.status(200).json(updatedExample);
    } catch (error) {
        next(error);
    }
});

/**
 * @route DELETE /examples/:id
 * @desc Delete an example by ID
 * @access Public
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const deletedExample = await exampleController.deleteExample(req.params.id);
        if (!deletedExample) {
            return res.status(404).json({ message: 'Example not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;