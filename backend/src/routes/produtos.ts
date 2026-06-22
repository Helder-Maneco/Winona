import { Response, Router } from 'express';
import pool from '../config/dataconnection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Todas as rotas de produtos requerem autenticação
router.use(authenticate);

//=====================
// GET /api/v1/produtos
// Lista todos os produtos (com filtros opcionais)
//=====================

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    const { categoria, fornecedor, ativo, search } = req.query;

    try {
        let query = `
            SELECT id, ume, nome, categoria, fornecedor,
                   preco_compra, preco_venda, estoque_minimo,
                   estoque_maximo, lead_time_dias, quantidade_atual,
                   possui_validade, dias_validade, ativo
            FROM produtos
            WHERE 1=1
        `;
        const params: unknown[] = [];
        let i = 1;

        if (categoria) {
            query += ` AND categoria = $${i++}`;
            params.push(categoria);
        }
        if (fornecedor) {
            query += ` AND fornecedor = $${i++}`;
            params.push(fornecedor);
        }
        if (ativo !== undefined) {
            query += ` AND ativo = $${i++}`;
            params.push(ativo === 'true');
        }
        if (search) {
            query += ` AND (nome ILIKE $${i} OR ume ILIKE $${i++})`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY nome ASC';

        const resultado = await pool.query(query, params);
        res.json(resultado.rows);

    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// GET /api/v1/produtos/alertas
// Produtos com stock abaixo do mínimo ou acima do máximo
//=====================

router.get('/alertas', async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const resultado = await pool.query(`
            SELECT id, ume, nome, quantidade_atual,
                   estoque_minimo, estoque_maximo,
                   CASE
                       WHEN quantidade_atual = 0             THEN 'ruptura'
                       WHEN quantidade_atual < estoque_minimo THEN 'estoque_baixo'
                       WHEN quantidade_atual > estoque_maximo THEN 'excesso'
                   END AS tipo_alerta
            FROM produtos
            WHERE ativo = true
              AND (
                  quantidade_atual < estoque_minimo OR
                  quantidade_atual > estoque_maximo
              )
            ORDER BY quantidade_atual ASC
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error('Erro ao buscar alertas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// GET /api/v1/produtos/:id
// Detalhe de um produto
//=====================

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const resultado = await pool.query(
            'SELECT * FROM produtos WHERE id = $1',
            [id]
        );

        if (resultado.rows.length === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// POST /api/v1/produtos
// Cria novo produto (admin e gestor)
//=====================

router.post('/', authorize('admin', 'gestor'), async (req: AuthRequest, res: Response): Promise<void> => {
    const {
        ume, nome, categoria, fornecedor,
        preco_compra, preco_venda,
        estoque_minimo, estoque_maximo,
        lead_time_dias, possui_validade, dias_validade
    } = req.body;

    if (!ume || !nome) {
        res.status(400).json({ error: 'UME e nome são obrigatórios' });
        return;
    }

    try {
        // Verifica UME duplicada
        const existente = await pool.query(
            'SELECT id FROM produtos WHERE ume = $1',
            [ume]
        );

        if (existente.rows.length > 0) {
            res.status(409).json({ error: 'UME já existe' });
            return;
        }

        const resultado = await pool.query(`
            INSERT INTO produtos (
                ume, nome, categoria, fornecedor,
                preco_compra, preco_venda,
                estoque_minimo, estoque_maximo,
                lead_time_dias, possui_validade, dias_validade
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *`,
            [
                ume, nome, categoria, fornecedor,
                preco_compra, preco_venda,
                estoque_minimo ?? 0, estoque_maximo ?? 0,
                lead_time_dias ?? 0, possui_validade ?? false,
                possui_validade ? dias_validade : null
            ]
        );

        res.status(201).json(resultado.rows[0]);

    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// PUT /api/v1/produtos/:id
// Actualiza produto (admin e gestor)
//=====================

router.put('/:id', authorize('admin', 'gestor'), async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const {
        nome, categoria, fornecedor,
        preco_compra, preco_venda,
        estoque_minimo, estoque_maximo,
        lead_time_dias, possui_validade, dias_validade, ativo
    } = req.body;

    try {
        const resultado = await pool.query(`
            UPDATE produtos SET
                nome            = COALESCE($1, nome),
                categoria       = COALESCE($2, categoria),
                fornecedor      = COALESCE($3, fornecedor),
                preco_compra    = COALESCE($4, preco_compra),
                preco_venda     = COALESCE($5, preco_venda),
                estoque_minimo  = COALESCE($6, estoque_minimo),
                estoque_maximo  = COALESCE($7, estoque_maximo),
                lead_time_dias  = COALESCE($8, lead_time_dias),
                possui_validade = COALESCE($9, possui_validade),
                dias_validade   = COALESCE($10, dias_validade),
                ativo           = COALESCE($11, ativo)
            WHERE id = $12
            RETURNING *`,
            [
                nome, categoria, fornecedor,
                preco_compra, preco_venda,
                estoque_minimo, estoque_maximo,
                lead_time_dias, possui_validade, dias_validade,
                ativo, id
            ]
        );

        if (resultado.rows.length === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Erro ao actualizar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// DELETE /api/v1/produtos/:id
// Desactiva produto — nunca apaga (só admin)
//=====================

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const resultado = await pool.query(
            'UPDATE produtos SET ativo = false WHERE id = $1 RETURNING id, nome',
            [id]
        );

        if (resultado.rows.length === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }

        res.json({ message: 'Produto desactivado', produto: resultado.rows[0] });

    } catch (error) {
        console.error('Erro ao desactivar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
