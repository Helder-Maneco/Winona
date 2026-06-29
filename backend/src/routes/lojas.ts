import { Request, Response, Router } from 'express';
import pool from '../config/dataconnection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

//=====================
// GET /api/v1/armazens
//=====================

router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
        const resultado = await pool.query(`
            SELECT a.*, COUNT(p.id) AS total_produtos
            FROM armazens a
            LEFT JOIN produtos p ON p.armazem_id = a.id AND p.ativo = true
            WHERE a.ativo = true
            GROUP BY a.id
            ORDER BY a.nome ASC
        `);
        res.json(resultado.rows);
    } catch (error) {
        console.error('Erro ao listar armazéns:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// GET /api/v1/armazens/:id
//=====================

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const armazem = await pool.query(
            'SELECT * FROM armazens WHERE id = $1',
            [id]
        );

        if (armazem.rows.length === 0) {
            res.status(404).json({ error: 'Armazém não encontrado' });
            return;
        }

        const produtos = await pool.query(`
            SELECT p.id, p.ume, p.nome, p.quantidade_atual,
                   p.estoque_minimo, p.preco_venda, p.ativo,
                   c.nome AS categoria_nome,
                   CASE
                       WHEN p.quantidade_atual = 0              THEN 'ruptura'
                       WHEN p.quantidade_atual < p.estoque_minimo THEN 'estoque_baixo'
                       ELSE 'ok'
                   END AS status_stock
            FROM produtos p
            LEFT JOIN categorias c ON c.id = p.categoria_id
            WHERE p.armazem_id = $1 AND p.ativo = true
            ORDER BY p.nome ASC
        `, [id]);

        res.json({
            armazem: armazem.rows[0],
            produtos: produtos.rows,
            total_produtos: produtos.rows.length,
            rupturas: produtos.rows.filter(p => p.status_stock === 'ruptura').length,
            estoque_baixo: produtos.rows.filter(p => p.status_stock === 'estoque_baixo').length,
            valor_total: produtos.rows.reduce((acc, p) => {
                return acc + (Number(p.preco_venda) * p.quantidade_atual);
            }, 0)
        });

    } catch (error) {
        console.error('Erro ao buscar armazém:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// POST /api/v1/armazens
//=====================

router.post('/', authorize('admin', 'gestor'), async (req: AuthRequest, res: Response): Promise<void> => {
    const { nome, localizacao } = req.body;

    if (!nome) {
        res.status(400).json({ error: 'Nome é obrigatório' });
        return;
    }

    try {
        const existente = await pool.query(
            'SELECT id FROM armazens WHERE nome ILIKE $1',
            [nome]
        );

        if (existente.rows.length > 0) {
            res.status(409).json({ error: 'Armazém já existe' });
            return;
        }

        const resultado = await pool.query(
            'INSERT INTO armazens (nome, localizacao) VALUES ($1, $2) RETURNING *',
            [nome, localizacao ?? null]
        );

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('Erro ao criar armazém:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// PUT /api/v1/armazens/:id
//=====================

router.put('/:id', authorize('admin', 'gestor'), async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { nome, localizacao } = req.body;

    try {
        const resultado = await pool.query(`
            UPDATE armazens SET
                nome        = COALESCE($1, nome),
                localizacao = COALESCE($2, localizacao)
            WHERE id = $3
            RETURNING *`,
            [nome, localizacao, id]
        );

        if (resultado.rows.length === 0) {
            res.status(404).json({ error: 'Armazém não encontrado' });
            return;
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Erro ao actualizar armazém:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// DELETE /api/v1/armazens/:id
//=====================

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        await pool.query(
            'UPDATE armazens SET ativo = false WHERE id = $1',
            [id]
        );
        res.json({ message: 'Armazém desactivado' });
    } catch (error) {
        console.error('Erro ao desactivar armazém:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
