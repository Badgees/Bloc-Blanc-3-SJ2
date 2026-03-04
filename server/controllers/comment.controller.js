const { pool } = require('../config/db');

const MAX_CONTENT_LENGTH = 5000;

// GET /api/comments/:articleId — public
exports.getCommentsByArticle = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT comments.id, comments.content, comments.created_at, comments.user_id, users.username, users.avatar
             FROM comments
             JOIN users ON comments.user_id = users.id
             WHERE comments.article_id = ?
             ORDER BY comments.created_at ASC`,
            [req.params.articleId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/comments/:articleId — requires auth
exports.createComment = async (req, res) => {
    try {
        const { content } = req.body;
        const articleId = req.params.articleId;

        // Validation de champs server-side
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Le commentaire ne peut pas être vide.' });
        }
        if (content.length > MAX_CONTENT_LENGTH) {
            return res.status(400).json({ message: `Le commentaire ne peut pas dépasser ${MAX_CONTENT_LENGTH} caractères.` });
        }

        // Check si l'article existe
        const [articles] = await pool.query('SELECT id FROM articles WHERE id = ?', [articleId]);
        if (articles.length === 0) {
            return res.status(404).json({ message: 'Article introuvable.' });
        }

        // Requête préparée
        const [result] = await pool.query(
            'INSERT INTO comments (content, article_id, user_id) VALUES (?, ?, ?)',
            [content.trim(), articleId, req.userId]
        );

        const [rows] = await pool.query(
            `SELECT comments.id, comments.content, comments.created_at, comments.user_id, users.username, users.avatar
             FROM comments
             JOIN users ON comments.user_id = users.id
             WHERE comments.id = ?`,
            [result.insertId]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/comments/:id — requires auth + ownership
exports.updateComment = async (req, res) => {
    try {
        const { content } = req.body;

        // Validation de champs server-side
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Le commentaire ne peut pas être vide.' });
        }
        if (content.length > MAX_CONTENT_LENGTH) {
            return res.status(400).json({ message: `Le commentaire ne peut pas dépasser ${MAX_CONTENT_LENGTH} caractères.` });
        }

        // Requête préparée
        const [comments] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.id]);
        if (comments.length === 0) {
            return res.status(404).json({ message: 'Commentaire introuvable.' });
        }

        // Seulement l'auteur du commentaire peut le modifier
        if (comments[0].user_id !== req.userId) {
            return res.status(403).json({ message: 'Non autorisé.' });
        }

        await pool.query(
            'UPDATE comments SET content = ? WHERE id = ?',
            [content.trim(), req.params.id]
        );

        res.json({ message: 'Commentaire modifié avec succès.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/comments/:id — requires auth + ownership
exports.deleteComment = async (req, res) => {
    try {
        // Requête préparée
        const [comments] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.id]);
        if (comments.length === 0) {
            return res.status(404).json({ message: 'Commentaire introuvable.' });
        }

        // Seulement l'auteur du commentaire peut le supprimer
        if (comments[0].user_id !== req.userId) {
            return res.status(403).json({ message: 'Non autorisé.' });
        }

        await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Commentaire supprimé avec succès.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
