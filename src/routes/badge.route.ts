import { BadgeController } from "../controllers/badge.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
const router = express.Router();

// récupérer tous les badges
router.get('/', auth, async(req, res) => {
    BadgeController.getBadges(req, res)
});

// récupérer un badge
router.get('/:id', auth, async(req, res) => {
    BadgeController.getBadge(req, res)
});

// créer un badge
router.post('/', auth, async(req, res) => {
    BadgeController.createBadge(req, res)
});

// modifier un badge
router.put('/:id', auth, async(req, res) => {
    BadgeController.updateBadge(req, res)
});

// modifier un badge (supprimer)
router.patch('/:id', auth, async(req, res) => {
    BadgeController.updateDeletedBadge(req, res)
});

// supprimer un badge
router.delete('/:id', auth, async(req, res) => {
    BadgeController.deleteBadge(req, res)
});

export default router;