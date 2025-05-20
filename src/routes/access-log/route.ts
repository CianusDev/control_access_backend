import { AccessLogController } from "../../controllers/access-log.controller";
import express from 'express';
const router = express.Router();

// récupérer tous les logs d'accès
router.get('/', async(req, res) => {
    AccessLogController.getAccessLogs(req, res)
});

// récupérer un log d'accès
router.get('/:id', async(req, res) => {
    AccessLogController.getAccessLog(req, res)
});

// créer un log d'accès
router.post('/', async(req, res) => {
    AccessLogController.createAccessLog(req, res)
});

// modifier un log d'accès
router.put('/:id', async(req, res) => {
    AccessLogController.updateAccessLog(req, res)
});

// supprimer un log d'accès
router.delete('/:id', async(req, res) => {
    AccessLogController.deleteAccessLog(req, res)
});

export default router;