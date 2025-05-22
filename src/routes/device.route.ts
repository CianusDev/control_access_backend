import { DeviceController } from "../controllers/device.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
const router = express.Router();

router.get('/', auth, async(req, res) => {
    DeviceController.getDevices(req, res)
});

router.get('/:id', auth, async(req, res) => {
    DeviceController.getDevice(req, res)
});

router.post('/', auth, async(req, res) => {
    DeviceController.createDevice(req, res)
});

router.put('/:id', auth, async(req, res) => {
    DeviceController.updateDevice(req, res)
});

router.patch('/:id', auth, async(req, res) => {
    DeviceController.updateDeletedDevice(req, res)
});

router.delete('/:id', auth, async(req, res) => {
    DeviceController.deleteDevice(req, res)
});

router.get('/:id/check-access/:badge_uid', auth, async(req, res) => {
    DeviceController.checkAccess(req, res)
});

export default router;