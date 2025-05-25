import { DeviceController } from "../controllers/device.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
import { isRoot } from "../middlewares/root.middleware";
import { isManager } from "../middlewares/manager.middleware";
import { isAdmin } from "../middlewares/admin.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";
const router = express.Router();

// récupérer tous les appareils ( au moins manager )
router.get('/', auth, isManager, sessionMiddleware, async(req, res) => {
    DeviceController.getDevices(req, res)
});

// récupérer un appareil ( au moins manager )
router.get('/:id', auth, isManager, sessionMiddleware, async(req, res) => {
    DeviceController.getDevice(req, res)
});

// créer un appareil ( au moins admin )
router.post('/', auth, isAdmin, sessionMiddleware, async(req, res) => {
    DeviceController.createDevice(req, res)
});

// modifier un appareil ( au moins admin)
router.put('/:id', auth, isAdmin, sessionMiddleware, async(req, res) => {
    DeviceController.updateDevice(req, res)
});

// supprimer un appareil ( au moins root )
router.delete('/:id', auth, isRoot, async(req, res) => {
    DeviceController.deleteDevice(req, res)
});


export default router;