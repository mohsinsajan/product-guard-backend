const express = require('express');
     const jwt = require('jsonwebtoken');
     const multer = require('multer');
     const router = express.Router();

     const products = {};
     const dealers = {};
     const reports = [];
     const uploads = {};

     const upload = multer({
       storage: multer.memoryStorage(),
       limits: { fileSize: 5 * 1024 * 1024 },
     });

     const authenticateToken = (req, res, next) => {
       const authHeader = req.headers['authorization'];
       const token = authHeader && authHeader.split(' ')[1];
       if (!token) {
         return res.status(401).json({ error: 'Unauthorized: No token provided' });
       }
       jwt.verify(token, process.env.JWT_SECRET || 'your-secure-secret', (err, user) => {
         if (err) {
           return res.status(403).json({ error: 'Invalid token' });
         }
         req.user = user;
         next();
       });
     };

     router.get('/verify', (req, res) => {
       const productId = req.query.productId;
       if (!productId) {
         return res.status(400).json({ error: 'Product ID required' });
       }
       res.json({
         productId,
         name: `Product ${productId}`,
         batch: 'A123',
         fairPrice: 10.0,
         expiry: '2026-04-30',
       });
     });

     router.post('/verify', authenticateToken, async (req, res) => {
       const { productId } = req.body;
       if (!productId || typeof productId !== 'string') {
         return res.status(400).json({ error: 'Valid product ID is required' });
       }
       try {
         const response = await fetch(`http://localhost:${process.env.PORT || 3000}/verify?productId=${productId}`);
         const productData = await response.json();
         if (!productData || !productData.name || !productData.batch) {
           return res.status(404).json({ error: 'Product not found' });
         }
         products[productId] = { ...productData, stock: products[productId]?.stock || [] };
         res.status(200).json(productData);
       } catch (error) {
         console.error('Verification error:', error);
         res.status(500).json({ error: `Verification failed: ${error.message}` });
       }
     });

     router.post('/stock', authenticateToken, async (req, res) => {
       const { dealerId, productId, quantity, price } = req.body;
       if (!dealerId || !productId || !quantity || !price) {
         return res.status(400).json({ error: 'Missing required fields' });
       }
       if (typeof quantity !== 'number' || quantity <= 0 || typeof price !== 'number' || price <= 0) {
         return res.status(400).json({ error: 'Quantity and price must be positive numbers' });
       }
       try {
         if (!products[productId]) {
           products[productId] = { productId, stock: [] };
         }
         products[productId].stock.push({ dealerId, quantity, price, timestamp: new Date() });
         if (!dealers[dealerId]) {
           dealers[dealerId] = { dealerId, purchaseHistory: [] };
         }
         dealers[dealerId].purchaseHistory.push({ productId, quantity, price, timestamp: new Date() });
         res.status(200).json({ message: 'Stock updated successfully' });
       } catch (error) {
         console.error('Stock update error:', error);
         res.status(500).json({ error: `Failed to update stock: ${error.message}` });
       }
     });

     router.post('/upload-purchase', authenticateToken, upload.single('file'), async (req, res) => {
       const { dealerId, productId } = req.body;
       if (!dealerId || !productId || !req.file) {
         return res.status(400).json({ error: 'Missing dealerId, productId, or file' });
       }
       try {
         const fileName = `purchases/${dealerId}/${productId}_${Date.now()}.pdf`;
         uploads[fileName] = req.file.buffer;
         if (!dealers[dealerId]) {
           dealers[dealerId] = { dealerId, purchaseHistory: [] };
         }
         dealers[dealerId].purchaseHistory.push({
           productId,
           fileUrl: `mock://uploads/${fileName}`,
           timestamp: new Date(),
         });
         res.status(200).json({ message: 'Purchase record uploaded', fileUrl: `mock://uploads/${fileName}` });
       } catch (error) {
         console.error('Upload error:', error);
         res.status(500).json({ error: `Upload failed: ${error.message}` });
       }
     });

     router.post('/report', authenticateToken, async (req, res) => {
       const { productId, issue, evidence } = req.body;
       if (!productId || !issue) {
         return res.status(400).json({ error: 'Missing productId or issue' });
       }
       try {
         reports.push({
           productId,
           issue,
           evidence: evidence || 'N/A',
           userId: req.user.userId,
           timestamp: new Date(),
         });
         res.status(200).json({ message: 'Report submitted successfully' });
       } catch (error) {
         console.error('Report error:', error);
         res.status(500).json({ error: `Report failed: ${error.message}` });
       }
     });

     module.exports = router;
