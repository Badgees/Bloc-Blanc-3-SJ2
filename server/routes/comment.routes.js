const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const verifyToken = require('../middleware/auth');

// Public
router.get('/:articleId', commentController.getCommentsByArticle);

// Protected — doit être connecté
router.post('/:articleId', verifyToken, commentController.createComment);
router.put('/:id', verifyToken, commentController.updateComment);
router.delete('/:id', verifyToken, commentController.deleteComment);

module.exports = router;
