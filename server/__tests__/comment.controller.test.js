jest.mock('../config/db', () => ({
    pool: { query: jest.fn() }
}));

const { pool } = require('../config/db');
const {
    getCommentsByArticle,
    createComment,
    updateComment,
    deleteComment,
} = require('../controllers/comment.controller');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => jest.clearAllMocks());

// ------------------------------
// GET — getCommentsByArticle
// ------------------------------
describe('getCommentsByArticle', () => {
    it('retourne la liste des commentaires d\'un article', async () => {
        const fakeComments = [
            { id: 1, content: 'Super article !', username: 'alice', user_id: 1 },
            { id: 2, content: 'Merci pour le partage', username: 'bob', user_id: 2 },
        ];
        pool.query.mockResolvedValueOnce([fakeComments]);

        const req = { params: { articleId: '10' } };
        const res = mockRes();

        await getCommentsByArticle(req, res);

        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['10']);
        expect(res.json).toHaveBeenCalledWith(fakeComments);
    });

    it('retourne 500 si la base de données est indisponible', async () => {
        pool.query.mockRejectedValueOnce(new Error('DB error'));

        const req = { params: { articleId: '10' } };
        const res = mockRes();

        await getCommentsByArticle(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
    });
});

// ------------------------------
// POST — createComment
// ------------------------------
describe('createComment', () => {
    const baseReq = {
        params: { articleId: '10' },
        userId: 42,
        body: { content: 'Un **super** commentaire en Markdown !' },
    };

    it('crée un commentaire et retourne 201 avec les données complètes', async () => {
        const newComment = { id: 99, content: baseReq.body.content, username: 'alice', user_id: 42 };
        pool.query.mockResolvedValueOnce([[{ id: 10 }]]);
        pool.query.mockResolvedValueOnce([{ insertId: 99 }]);
        pool.query.mockResolvedValueOnce([[newComment]]);

        const req = { ...baseReq };
        const res = mockRes();

        await createComment(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(newComment);
    });

    it('retourne 400 si le contenu est vide', async () => {
        const req = { ...baseReq, body: { content: '   ' } };
        const res = mockRes();

        await createComment(req, res);

        expect(pool.query).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Le commentaire ne peut pas être vide.' });
    });

    it('retourne 400 si le contenu dépasse 5000 caractères', async () => {
        const req = { ...baseReq, body: { content: 'a'.repeat(5001) } };
        const res = mockRes();

        await createComment(req, res);

        expect(pool.query).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('5000') })
        );
    });

    it('retourne 404 si l\'article n\'existe pas', async () => {
        pool.query.mockResolvedValueOnce([[]])

        const req = { ...baseReq };
        const res = mockRes();

        await createComment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Article introuvable.' });
    });
});

// ------------------------------
// PUT — updateComment
// ------------------------------
describe('updateComment', () => {
    it('modifie le commentaire si l\'utilisateur en est l\'auteur', async () => {
        pool.query.mockResolvedValueOnce([[{ id: 5, user_id: 42, content: 'ancien' }]]);
        pool.query.mockResolvedValueOnce([{}]);

        const req = { params: { id: '5' }, userId: 42, body: { content: 'nouveau contenu' } };
        const res = mockRes();

        await updateComment(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: 'Commentaire modifié avec succès.' });
    });

    it('retourne 403 si l\'utilisateur n\'est pas l\'auteur (contrôle d\'accès)', async () => {
        pool.query.mockResolvedValueOnce([[{ id: 5, user_id: 99, content: 'texte' }]]);

        const req = { params: { id: '5' }, userId: 42, body: { content: 'tentative de modif' } };
        const res = mockRes();

        await updateComment(req, res);

        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Non autorisé.' });
    });

    it('retourne 404 si le commentaire n\'existe pas', async () => {
        pool.query.mockResolvedValueOnce([[]]);

        const req = { params: { id: '999' }, userId: 42, body: { content: 'contenu' } };
        const res = mockRes();

        await updateComment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});

// ------------------------------
// DELETE — deleteComment
// ------------------------------
describe('deleteComment', () => {
    it('supprime le commentaire si l\'utilisateur en est l\'auteur', async () => {
        pool.query.mockResolvedValueOnce([[{ id: 7, user_id: 42 }]]);
        pool.query.mockResolvedValueOnce([{}]);

        const req = { params: { id: '7' }, userId: 42 };
        const res = mockRes();

        await deleteComment(req, res);

        expect(pool.query).toHaveBeenCalledTimes(2);
        expect(res.json).toHaveBeenCalledWith({ message: 'Commentaire supprimé avec succès.' });
    });

    it('retourne 403 si l\'utilisateur tente de supprimer le commentaire d\'autrui', async () => {
        pool.query.mockResolvedValueOnce([[{ id: 7, user_id: 99 }]]);

        const req = { params: { id: '7' }, userId: 42 };
        const res = mockRes();

        await deleteComment(req, res);

        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Non autorisé.' });
    });

    it('retourne 404 si le commentaire est introuvable', async () => {
        pool.query.mockResolvedValueOnce([[]]);

        const req = { params: { id: '404' }, userId: 42 };
        const res = mockRes();

        await deleteComment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});
