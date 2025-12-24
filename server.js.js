const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройка Socket.io с поддержкой CORS (для работы на хостингах)
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));

let users = {};

io.on('connection', (socket) => {
    // При подключении отправляем новому игроку список всех, кто уже на карте
    socket.emit('currentUsers', users);

    socket.on('sendLocation', (data) => {
        const userName = data.name || "Анонимный агент";
        
        // Если игрока еще нет в базе, пишем в консоль
        if (!users[socket.id]) {
            console.log(`[+] ПОДКЛЮЧЕН: ${userName} (${socket.id})`);
        }

        // Обновляем данные игрока
        users[socket.id] = {
            id: socket.id,
            lat: data.lat,
            lng: data.lng,
            name: userName,
            speed: data.speed || 0
        };
        
        // Рассылаем координаты всем остальным
        socket.broadcast.emit('receiveLocation', users[socket.id]);
    });

    // Обработка сообщений чата
    socket.on('sendMessage', (message) => {
        if (users[socket.id]) {
            console.log(`[ЧАТ] ${users[socket.id].name}: ${message}`);
            io.emit('newMessage', {
                id: socket.id,
                text: message,
                name: users[socket.id].name
            });
        }
    });

    socket.on('disconnect', () => {
        if (users[socket.id]) {
            console.log(`[-] ОТКЛЮЧЕН: ${users[socket.id].name}`);
            delete users[socket.id];
        }
        io.emit('userDisconnected', socket.id);
    });
});

// ГЛАВНОЕ ИЗМЕНЕНИЕ: 
// Используем PORT от хостинга ИЛИ 3000 для локальной работы
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.clear();
    console.log(`====================================`);
    console.log(`   SATELLITE SERVER ONLINE v14     `);
    console.log(`   ПОРТ: ${PORT}                   `);
    console.log(`====================================`);
});