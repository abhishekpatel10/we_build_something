import { Router } from 'express';
import { urlController } from '../controllers/url.controller.js';

const router = Router();

// Functional Requirement 1: Create short URL
router.post('/urls', (req, res) => urlController.createShortUrl(req, res));

// List recent shortened URLs
router.get('/urls/recent', (req, res) => urlController.getRecentUrls(req, res));

// Analytics: Stats and Clicks breakdown
router.get('/urls/:shortCode/stats', (req, res) => urlController.getUrlStats(req, res));

// Distributed Counter & Batch introspection (Deep Dive 3)
router.get('/counter/status', (req, res) => urlController.getCounterStatus(req, res));

// Health check
router.get('/health', (req, res) => urlController.getHealth(req, res));

export default router;
