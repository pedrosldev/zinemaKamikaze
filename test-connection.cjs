// Test de conexión a MySQL remoto
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('🔍 Probando conexión a MySQL remoto...\n');
  
  try {
    const connection = await mysql.createConnection({
      host: '200.234.227.110',
      user: 'netlify_user',
      password: process.argv[2] || 'your_password', // Pasa la password como argumento
      database: 'zinemakamikaze', // Cambia por tu nombre de BD si es diferente
      port: 3306,
      connectTimeout: 10000 // 10 segundos
    });

    console.log('✅ ¡CONEXIÓN EXITOSA!');
    console.log('📊 MySQL acepta conexiones remotas\n');
    
    // Prueba una query simple
    const [rows] = await connection.query('SELECT VERSION() as version');
    console.log('✅ Versión MySQL:', rows[0].version);
    
    await connection.end();
    
    console.log('\n🎉 TODO LISTO: Puedes ejecutar migraciones desde local\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ ERROR DE CONEXIÓN:\n');
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('⚠️  MySQL NO acepta conexiones remotas o firewall bloqueando');
      console.error('💡 Solución: Necesitarás SSH tunnel o ejecutar desde VPS\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('⚠️  Conexión llega pero usuario/password incorrectos');
      console.error('💡 Solución: Verificar credenciales\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('⚠️  Base de datos no existe');
      console.error('💡 Solución: Cambiar nombre de BD en el script\n');
    } else {
      console.error('⚠️  Error:', error.code || error.message);
    }
    
    console.error('\n📋 Detalles técnicos:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage
    });
    
    process.exit(1);
  }
}

testConnection();
