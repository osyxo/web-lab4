import http from 'node:http';
import fs from 'node:fs';
import { Command } from 'commander';

// ---------- Параметри командного рядка ----------
const program = new Command();
program
  .helpOption('--help', 'Показати довідку')
  .requiredOption('-i, --input <path>', 'шлях до файлу даних')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .option('-o, --output <path>', 'файл для запису останньої відповіді');

program.parse();
const options = program.opts();

const port = Number(options.port);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('Помилка: порт має бути цілим числом від 0 до 65535');
  process.exit(1);
}

// ---------- Допоміжні функції ----------

// Перетворює значення (число або рядок) на число.
// Порожнє, null або нечислове значення -> null
function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Формує відповідь за параметрами запиту
function buildResult(records, query) {
  const showMfo = query.get('mfo') === 'true';
  const onlyNormal = query.get('normal') === 'true';
  const result = [];

  for (const rec of records) {
    if (rec === null || typeof rec !== 'object') continue;

    const stateCode = toNumber(rec.COD_STATE);
    if (onlyNormal && stateCode !== 1) continue;

    const item = {};
    if (showMfo) item.mfo_code = toNumber(rec.MFO);
    item.name = rec.SHORTNAME ?? null;
    item.state_code = stateCode;
    result.push(item);
  }
  return result;
}

// Надсилає відповідь. Якщо задано --output, спочатку записує її у файл.
function sendJson(res, status, data) {
  const body = JSON.stringify(data);

  const reply = (code, text) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(text);
  };

  if (!options.output) {
    reply(status, body);
    return;
  }

  fs.writeFile(options.output, body, (err) => {
    if (err) {
      console.error('Помилка запису:', err.message);
      reply(500, JSON.stringify({ error: 'Не вдалося записати відповідь у файл' }));
      return;
    }
    reply(status, body);
  });
}

// ---------- Обробник запитів ----------
function handleRequest(req, res) {
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch (e) {
    sendJson(res, 400, { error: 'Некоректна адреса запиту' });
    return;
  }

  if (url.pathname !== '/') {
    sendJson(res, 404, { error: 'Маршрут не знайдено' });
    return;
  }

  fs.readFile(options.input, 'utf8', (err, text) => {
    if (err) {
      console.error('Помилка читання:', err.message);
      sendJson(res, 500, { error: 'Файл даних відсутній або недоступний' });
      return;
    }

    let records;
    try {
      records = JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch (e) {
      sendJson(res, 500, { error: 'Файл даних пошкоджено' });
      return;
    }

    if (!Array.isArray(records)) {
      sendJson(res, 500, { error: 'Файл даних має неправильну структуру' });
      return;
    }

    sendJson(res, 200, buildResult(records, url.searchParams));
  });
}

// ---------- Запуск ----------
fs.access(options.input, fs.constants.F_OK, (err) => {
  if (err) {
    console.error('Cannot find input file');
    process.exit(1);
  }

  const server = http.createServer(handleRequest);
  server.listen(port, options.host, () => {
    console.log(`Сервер запущено: http://${options.host}:${port}/`);
  });
});