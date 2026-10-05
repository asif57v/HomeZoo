import express from 'express';
import { getHomeData } from '../controllers/homeController.js';
import { optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/home?city=Indore
router.get('/', optionalProtect, getHomeData);

export default router;
