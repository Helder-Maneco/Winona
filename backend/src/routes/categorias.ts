import { Request, Response, Router } from 'express';
import pool from '../config/dataconnection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

//=====================
// GET /api/v1/categorias
//=====================

router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
        const resultado = await pool.query(
            'SELECT * FROM categorias WHERE ativo = true ORDER BY nome ASC'
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// POST /api/v1/categorias
//=====================

router.post('/', authorize('admin', 'gestor'), async (req: AuthRequest, res: Response): Promise<void> => {
    const { nome, descricao } = req.body;

    if (!nome) {
        res.status(400).json({ error: 'Nome é obrigatório' });
        return;
    }

    try {
        const existente = await pool.query(
            'SELECT id FROM categorias WHERE nome ILIKE $1',
            [nome]
        );

        if (existente.rows.length > 0) {
            res.status(409).json({ error: 'Categoria já existe' });
            return;
        }

        const resultado = await pool.query(
            'INSERT INTO categorias (nome, descricao) VALUES ($1, $2) RETURNING *',
            [nome, descricao ?? null]
        );

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// DELETE /api/v1/categorias/:id
//=====================

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        await pool.query(
            'UPDATE categorias SET ativo = false WHERE id = $1',
            [id]
        );
        res.json({ message: 'Categoria desactivada' });
    } catch (error) {
        console.error('Erro ao desactivar categoria:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
