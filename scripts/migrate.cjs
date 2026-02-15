#!/usr/bin/env node
/**
 * Sistema de Migraciones SQL para ZinemaKamikaze
 * Ejecuta migraciones pendientes en orden numérico
 * 
 * Uso:
 *   npm run migrate       (desarrollo - usa .env)
 *   npm run migrate:prod  (producción - usa .env.production)
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { config } = require('dotenv');

// Detectar entorno y cargar env correspondiente
const isProduction = process.env.NODE_ENV === 'production';
const envFile = isProduction ? '.env.production' : '.env';

console.log(`\n🌍 Entorno: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
console.log(`📁 Cargando: ${envFile}\n`);

config({ path: envFile });

// Configuración de conexión
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  multipleStatements: true // Permitir múltiples statements por archivo
};

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

/**
 * Obtiene lista de archivos de migración ordenados
 */
async function getMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  
  return files
    .filter(file => file.endsWith('.sql') && file.match(/^\d+_/))
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[0]);
      const numB = parseInt(b.split('_')[0]);
      return numA - numB;
    });
}

/**
 * Extrae el número de versión del nombre del archivo
 */
function getVersion(filename) {
  return parseInt(filename.split('_')[0]);
}

/**
 * Extrae la descripción del nombre del archivo
 */
function getDescription(filename) {
  return filename
    .replace(/^\d+_/, '')
    .replace('.sql', '')
    .replace(/_/g, ' ');
}

/**
 * Obtiene migraciones ya aplicadas
 */
async function getAppliedMigrations(connection) {
  try {
    const [rows] = await connection.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    return rows.map(row => row.version);
  } catch (error) {
    // Si la tabla no existe, no hay migraciones aplicadas
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return [];
    }
    throw error;
  }
}

/**
 * Ejecuta una migración
 */
async function runMigration(connection, filename) {
  const version = getVersion(filename);
  const description = getDescription(filename);
  const filePath = path.join(MIGRATIONS_DIR, filename);
  
  console.log(`⏳ Ejecutando migración ${version}: ${description}...`);
  
  // Leer archivo SQL
  const sql = await fs.readFile(filePath, 'utf-8');
  
  try {
    // Ejecutar SQL
    await connection.query(sql);
    
    console.log(`✅ Migración ${version} aplicada exitosamente\n`);
    return true;
  } catch (error) {
    console.error(`❌ Error en migración ${version}:`, error.message);
    throw error;
  }
}

/**
 * Ejecuta todas las migraciones pendientes
 */
async function migrate() {
  let connection;
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   BD: ${dbConfig.database}\n`);
    
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Conectado\n');
    console.log('📋 Verificando migraciones...\n');
    
    // Obtener archivos de migración
    const migrationFiles = await getMigrationFiles();
    
    if (migrationFiles.length === 0) {
      console.log('⚠️  No se encontraron archivos de migración en /migrations\n');
      return;
    }
    
    // Obtener migraciones ya aplicadas
    const appliedVersions = await getAppliedMigrations(connection);
    
    // Filtrar migraciones pendientes
    const pendingMigrations = migrationFiles.filter(file => {
      const version = getVersion(file);
      return !appliedVersions.includes(version);
    });
    
    if (pendingMigrations.length === 0) {
      console.log('✨ Base de datos actualizada, no hay migraciones pendientes\n');
      console.log(`📊 Migraciones aplicadas: ${appliedVersions.length}`);
      return;
    }
    
    console.log(`📦 Migraciones pendientes: ${pendingMigrations.length}`);
    console.log(`📊 Migraciones ya aplicadas: ${appliedVersions.length}\n`);
    
    // Ejecutar migraciones pendientes
    let successCount = 0;
    
    for (const file of pendingMigrations) {
      await runMigration(connection, file);
      successCount++;
    }
    
    console.log('━'.repeat(50));
    console.log(`\n🎉 Migraciones completadas: ${successCount}/${pendingMigrations.length}`);
    console.log(`📊 Total de migraciones aplicadas: ${appliedVersions.length + successCount}\n`);
    
  } catch (error) {
    console.error('\n❌ ERROR FATAL:\n');
    
    if (error.code === 'ENOTFOUND') {
      console.error('⚠️  No se pudo resolver el host de la base de datos');
      console.error(`   Host: ${dbConfig.host}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  Conexión rechazada');
      console.error('   Verifica que MySQL esté corriendo y acepte conexiones');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('⚠️  Acceso denegado');
      console.error('   Verifica usuario y contraseña en tu archivo .env');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('⚠️  Base de datos no existe');
      console.error(`   BD: ${dbConfig.database}`);
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Desconectado\n');
    }
  }
}

// Ejecutar migraciones
migrate();
