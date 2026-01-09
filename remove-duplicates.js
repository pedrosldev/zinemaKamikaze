import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer el archivo JSON
const filePath = path.join(__dirname, 'src', 'data', 'all_titles_with_id.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// Extraer todas las películas
const allFilms = [];
data.forEach(entry => {
  if (entry.films && Array.isArray(entry.films)) {
    allFilms.push(...entry.films);
  }
});

console.log(`Total de películas antes: ${allFilms.length}`);

// Eliminar duplicados basándose en título + año
const uniqueMap = new Map();
allFilms.forEach(film => {
  const key = `${film.title}|${film.year}`;
  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, film);
  }
});

const uniqueFilms = Array.from(uniqueMap.values());
console.log(`Películas únicas: ${uniqueFilms.length}`);
console.log(`Duplicados eliminados: ${allFilms.length - uniqueFilms.length}`);

// Reasignar IDs consecutivos
uniqueFilms.forEach((film, index) => {
  film.id = index + 1;
});

// Crear nueva estructura: agrupar por primera letra del título
const grouped = {};
uniqueFilms.forEach(film => {
  const firstLetter = film.title.charAt(0).toUpperCase();
  if (!grouped[firstLetter]) {
    grouped[firstLetter] = [];
  }
  grouped[firstLetter].push(film);
});

// Convertir a formato original
const newData = Object.keys(grouped).sort().map(letter => ({
  title: `Películas que empiezan por ${letter}`,
  films: grouped[letter]
}));

// Guardar backup del original
const backupPath = path.join(__dirname, 'src', 'data', 'all_titles_with_id.backup.json');
fs.copyFileSync(filePath, backupPath);
console.log(`Backup creado en: ${backupPath}`);

// Guardar archivo limpio
fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf-8');
console.log(`Archivo limpio guardado en: ${filePath}`);
console.log('✅ Proceso completado');
