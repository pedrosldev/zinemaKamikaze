import fs from 'fs';

// Leer el archivo JSON
const data = JSON.parse(fs.readFileSync('src/data/all_titles_with_id.json', 'utf-8'));

// Crear backup solo si no existe
if (!fs.existsSync('src/data/all_titles_with_id.backup.json')) {
  fs.writeFileSync(
    'src/data/all_titles_with_id.backup.json',
    JSON.stringify(data, null, 2)
  );
  console.log('✅ Backup creado en all_titles_with_id.backup.json\n');
}

let totalMovies = 0;
let duplicatesRemoved = 0;
const removedMovies = [];

// Crear un mapa de películas únicas usando una clave compuesta
const uniqueMovies = new Map();

// Procesar todos los títulos
for (const [titleKey, titleData] of Object.entries(data)) {
  const uniqueFilms = [];
  
  for (const film of titleData.films) {
    totalMovies++;
    
    // Crear clave única basada en múltiples campos
    // Normalizar valores para comparación
    const normalizedTitle = (film.title || '').toLowerCase().trim();
    const normalizedYear = String(film.year || '').trim();
    const normalizedOverview = (film.overview || '').toLowerCase().trim();
    const normalizedPoster = (film.poster_path || '').trim();
    
    // Clave compuesta: título + año + overview + poster_path
    const uniqueKey = `${normalizedTitle}|||${normalizedYear}|||${normalizedOverview}|||${normalizedPoster}`;
    
    if (uniqueMovies.has(uniqueKey)) {
      // Es un duplicado EXACTO - mismo título, año, sinopsis y póster
      const existingFilm = uniqueMovies.get(uniqueKey);
      duplicatesRemoved++;
      
      removedMovies.push({
        removedId: film.id,
        keptId: existingFilm.id,
        title: film.title,
        year: film.year,
        reason: 'Duplicado exacto (mismo título, año, sinopsis y póster)'
      });
      
      // Mantener el ID más bajo por si tiene reviews
      if (film.id < existingFilm.id) {
        // Reemplazar con el ID más bajo
        const index = uniqueFilms.findIndex(f => f.id === existingFilm.id);
        if (index !== -1) {
          uniqueFilms[index] = film;
          uniqueMovies.set(uniqueKey, film);
          
          removedMovies[removedMovies.length - 1] = {
            removedId: existingFilm.id,
            keptId: film.id,
            title: film.title,
            year: film.year,
            reason: 'Duplicado exacto (reemplazado por ID más bajo)'
          };
        }
      }
    } else {
      // Es único (o al menos diferente en overview o poster)
      uniqueMovies.set(uniqueKey, film);
      uniqueFilms.push(film);
    }
  }
  
  // Actualizar la lista de películas
  data[titleKey].films = uniqueFilms;
}

// Guardar el resultado
fs.writeFileSync(
  'src/data/all_titles_with_id.json',
  JSON.stringify(data, null, 2)
);

// Guardar reporte de películas eliminadas
fs.writeFileSync(
  'duplicates-removed-report.json',
  JSON.stringify(removedMovies, null, 2)
);

// Estadísticas
const finalMovies = totalMovies - duplicatesRemoved;

console.log('📊 REPORTE DE ELIMINACIÓN DE DUPLICADOS (INTELIGENTE)\n');
console.log(`Total de películas originales: ${totalMovies.toLocaleString()}`);
console.log(`Duplicados exactos encontrados: ${duplicatesRemoved.toLocaleString()}`);
console.log(`Películas después de limpieza: ${finalMovies.toLocaleString()}`);
console.log(`\n✅ Criterios de duplicación:`);
console.log(`   - Mismo título (normalizado)`);
console.log(`   - Mismo año`);
console.log(`   - Misma sinopsis (overview)`);
console.log(`   - Mismo póster (poster_path)`);
console.log(`\n📄 Reporte detallado guardado en: duplicates-removed-report.json`);

if (duplicatesRemoved > 0) {
  console.log(`\n🔍 Primeros 10 duplicados eliminados:`);
  removedMovies.slice(0, 10).forEach((movie, i) => {
    console.log(`   ${i + 1}. "${movie.title}" (${movie.year})`);
    console.log(`      ID eliminado: ${movie.removedId} | ID conservado: ${movie.keptId}`);
  });
}

console.log(`\n💾 Archivo actualizado: src/data/all_titles_with_id.json`);
console.log(`📦 Backup disponible: src/data/all_titles_with_id.backup.json`);
