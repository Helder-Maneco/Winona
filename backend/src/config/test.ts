import pool from './dataconnection';

async function testarConexao() {
  try {
    console.log('\n🔄 Testando conexão com PostgreSQL...\n');
    
    // Teste 1: Query simples
    const result = await pool.query('SELECT NOW() as agora, version() as versao');
    console.log('✓ Conexão bem-sucedida!');
    console.log('📅 Data/Hora:', result.rows[0].agora);
    console.log('🗄️  Versão:', result.rows[0].versao);
    
    // Teste 2: Listar tabelas
    const tabelas = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tabelas encontradas:');
    if (tabelas.rows.length === 0) {
      console.log('  ⚠️  Nenhuma tabela encontrada');
    } else {
      tabelas.rows.forEach(row => {
        console.log(`  ├─ ${row.table_name}`);
      });
    }
    
    await pool.end();
    console.log('\n✓ Teste concluído!\n');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n✗ Erro na conexão:', error.message);
    process.exit(1);
  }
}

testarConexao().catch(err => {
	console.error("Erro fatal na ignicao", err);
	process.exit(1);
});
