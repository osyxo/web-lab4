# Лабораторна робота 4. HTTP-сервер на Node.js

Варіант 1, файл `bank_managers.json` (JSON-масив).

## Запуск
npm install
npm start -- -i bank_managers.json -h localhost -p 3000 -o result.json

## Режим розробки
npm run dev -- -i bank_managers.json -h localhost -p 3000

## Приклади запитів
curl -si "http://localhost:3000/"
curl -si "http://localhost:3000/?mfo=true"
curl -si "http://localhost:3000/?normal=true"
curl -si "http://localhost:3000/?mfo=true&normal=true"
